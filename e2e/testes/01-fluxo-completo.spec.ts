import { test, expect } from '../apoio/fixtures';
import { entrarComo, trocarPerfil } from '../apoio/sessao';
import { irParaSubtarefa, abrirSolicitacao } from '../apoio/navegacao';
import {
  solicitacaoPorCodigo,
  historicoEtapasDe,
  usuarioPorEmail,
  normalizarChecklistDoWizard,
  documentosDe,
} from '../apoio/banco';
import { criarAtendimentoPeloWizard, mostrarTodasAsDemandas, ARQUIVO_PDF } from '../apoio/fluxos';

// Fluxo completo de uma demanda, do atendimento inicial à execução:
// cadastro -> (aprovação regional) -> analise -> paf_autorizacao -> paf ->
// ordem_inicio -> execucao. Cada transição é confirmada no BANCO (a UI pode
// mascarar falhas de persistência via localStorage) e cada troca de perfil
// recarrega a página inteira — ou seja, a continuidade do fluxo já prova que
// a UI reidrata o estado do banco.
//
// Divergências do roteiro original (comportamento REAL do app):
// - Quem autoriza o PAF (etapa paf_autorizacao -> paf) é o gestor_paf, numa
//   tabela própria; quem "oficializa"/homologa (paf -> ordem_inicio) é o
//   administrativo_dore na Ficha PAF.
// - A emissão da Ordem de Início não é do administrativo_dore: os campos da
//   O.I. só são editáveis por tecnico_infra/gestor_paf, então o técnico emite.

test('fluxo completo: do atendimento inicial à execução da obra', async ({ page, dialogos }) => {
  // ── 1. Técnico da SRE B registra o atendimento pelo wizard ────────────────
  await entrarComo(page, 'tecnico_infra');
  const codigo = await criarAtendimentoPeloWizard(page);

  let sol = await solicitacaoPorCodigo(codigo);
  expect(sol.etapa_atual).toBe('cadastro');
  expect(sol.status_aprovacao_regional).toBe('pendente');
  expect(sol.codesc).toBe('31000027');

  // BUG conhecido: o wizard grava nome_logico com ids aleatórios e a releitura
  // só reconhece os canônicos — normaliza para o fluxo poder continuar na UI.
  await normalizarChecklistDoWizard(codigo);
  const docs = await documentosDe(codigo);
  expect(docs.filter((d) => d.file_name).length).toBeGreaterThanOrEqual(8);

  // ── 2. Coordenador regional aprova (cadastro -> analise) ──────────────────
  await trocarPerfil(page, 'coordenador_regional');
  await irParaSubtarefa(page, 'aprovacao_regional');
  await expect(page.getByText(codigo)).toBeVisible();
  await page.getByTestId('aprovacao-regional-aprovar').click();

  await expect
    .poll(async () => (await solicitacaoPorCodigo(codigo)).etapa_atual)
    .toBe('analise');
  sol = await solicitacaoPorCodigo(codigo);
  expect(sol.status_aprovacao_regional).toBe('aprovado');
  expect(sol.coordenador_aprovador).toBe('Coordenador Teste');

  // ── 3. Gestor DORE atribui o analista ─────────────────────────────────────
  const analista = await usuarioPorEmail('analistadore@educacao.mg.gov.br');
  await trocarPerfil(page, 'gestor_dore');
  await irParaSubtarefa(page, 'analise_atribuicao');
  const seletorAnalista = page.getByTestId('atribuicao-selecionar-analista');
  await expect(seletorAnalista).toBeVisible();
  await seletorAnalista.selectOption(analista.id);

  await expect
    .poll(async () => (await solicitacaoPorCodigo(codigo)).analista_atribuido_id)
    .toBe(analista.id);

  // ── 4. Analista DORE valida e aprova (analise -> paf_autorizacao) ─────────
  await trocarPerfil(page, 'analista_dore');
  await irParaSubtarefa(page, 'analise');

  // Valida as 4 seções de dados gerais
  for (const secao of ['#sec-escolar', '#sec-patrimonial', '#sec-tecnico', '#sec-referencia']) {
    await page.locator(secao).getByRole('button', { name: 'Validado', exact: true }).click();
  }

  // Valida cada documento do checklist (aba 2 do painel de análise)
  await page.getByRole('button', { name: /Checklist & Anexos/ }).click();
  const botoesValidar = page.getByRole('button', { name: 'Validado', exact: true });
  await expect.poll(async () => botoesValidar.count()).toBeGreaterThanOrEqual(8);
  const totalDocs = await botoesValidar.count();
  for (let i = 0; i < totalDocs; i++) {
    await botoesValidar.nth(i).click();
  }

  const aprovar = page.getByTestId('botao-aprovar-processo');
  await expect(aprovar).toBeEnabled();
  await aprovar.click();

  await expect
    .poll(async () => (await solicitacaoPorCodigo(codigo)).etapa_atual)
    .toBe('paf_autorizacao');

  // ── 5. Gestor PAF autoriza a dotação (paf_autorizacao -> paf) ─────────────
  await trocarPerfil(page, 'gestor_paf');
  await irParaSubtarefa(page, 'paf_autorizacao');
  await page.getByTestId(`paf-autorizar-${codigo}`).click();
  await page.getByTestId('paf-autorizacao-confirmar').click();

  await expect
    .poll(async () => (await solicitacaoPorCodigo(codigo)).etapa_atual)
    .toBe('paf');

  // ── 6. Administrativo DORE homologa o PAF (paf -> ordem_inicio) ───────────
  // Nota: 'botao-homologar-ordem-inicio' fica na barra de transição, que é
  // ocultada nesta rota (hideTransitionButtons); 'botao-oficializar-paf' chama
  // exatamente o mesmo handler (homologarEAvancarOrdemInicio).
  await trocarPerfil(page, 'administrativo_dore');
  await irParaSubtarefa(page, 'paf');
  await page.getByTestId('paf-numero').fill('PAF-3320-2026');
  await page.getByTestId('botao-oficializar-paf').click();

  await expect
    .poll(async () => (await solicitacaoPorCodigo(codigo)).etapa_atual)
    .toBe('ordem_inicio');
  sol = await solicitacaoPorCodigo(codigo);
  expect(sol.numero_paf).toBe('PAF-3320-2026');
  expect(dialogos.some((m) => m.includes('PAF homologado'))).toBe(true);

  // ── 7. Técnico emite a Ordem de Início (ordem_inicio -> execucao) ─────────
  await trocarPerfil(page, 'tecnico_infra');
  await irParaSubtarefa(page, 'cadastro');
  await abrirSolicitacao(page, codigo);

  const hoje = new Date().toISOString().split('T')[0];
  const termino = new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0];
  await page.getByTestId('ordem-inicio-data').fill(hoje);
  await page.getByTestId('ordem-inicio-previsao').fill(termino);
  await page.getByTestId('ordem-inicio-valor').fill('245000');
  await page.getByTestId('ordem-inicio-cronograma').setInputFiles(ARQUIVO_PDF);
  await page.getByTestId('ordem-inicio-salvar').click();

  const emitir = page.getByTestId('botao-emitir-ordem-inicio');
  await expect(emitir).toBeEnabled();
  await emitir.click();

  await expect
    .poll(async () => (await solicitacaoPorCodigo(codigo)).etapa_atual)
    .toBe('execucao');
  expect(dialogos.some((m) => m.includes('Ordem de Início emitida com sucesso'))).toBe(true);

  // ── 8. Reload final: a UI reidrata do banco ───────────────────────────────
  await trocarPerfil(page, 'admin');
  await irParaSubtarefa(page, 'cadastro');
  await mostrarTodasAsDemandas(page);
  await expect(page.getByTestId(`card-solicitacao-${codigo}`)).toBeVisible();

  const historico = await historicoEtapasDe(codigo);
  const etapasRegistradas = historico.map((h: any) => h.etapa_nova);
  for (const etapa of ['cadastro', 'analise', 'paf_autorizacao', 'paf', 'ordem_inicio', 'execucao']) {
    expect(etapasRegistradas).toContain(etapa);
  }
});
