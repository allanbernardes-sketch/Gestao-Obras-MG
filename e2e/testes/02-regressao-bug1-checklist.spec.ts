import { test, expect } from '../apoio/fixtures';
import { entrarComo, trocarPerfil } from '../apoio/sessao';
import { irParaSubtarefa, abrirSolicitacao } from '../apoio/navegacao';
import {
  consultar,
  documentosDe,
  historicoEtapasDe,
  usuarioPorEmail,
} from '../apoio/banco';
import { criarAtendimentoPeloWizard, ARQUIVO_PDF } from '../apoio/fluxos';

// Regressão do BUG 1 (checklist documental): anexos e recusas precisam persistir
// no banco (tabela `documentos`) e sobreviver ao reload; salvar repetidamente não
// pode duplicar linhas (replace-set idempotente).

test('anexos e recusas do checklist persistem no banco e o replace-set é idempotente', async ({ page }) => {
  // ── Criação pelo wizard (anexa os 8 documentos) ───────────────────────────
  await entrarComo(page, 'tecnico_infra');
  const codigo = await criarAtendimentoPeloWizard(page);

  let docs: any[] = [];
  await expect
    .poll(async () => {
      docs = await documentosDe(codigo);
      return docs.filter((d) => d.file_name).length;
    })
    .toBeGreaterThanOrEqual(8);
  expect(docs.length).toBe(8);

  const historico = await historicoEtapasDe(codigo);
  expect(historico.length).toBeGreaterThanOrEqual(1);
  expect(historico[0].etapa_nova).toBe('cadastro');

  // ── Reanexo pelo wizard de edição (ids canônicos) + reload ────────────────
  // Obs.: os anexos da CRIAÇÃO são gravados com nome_logico aleatório (bug
  // registrado no relatório) e não reidratam na UI; ao reabrir o rascunho, o
  // wizard usa os documentos canônicos rehidratados (doc_1, doc_2, …) — este é
  // o caminho válido de round-trip.
  const abrirRascunhoNoPasso2 = async () => {
    await irParaSubtarefa(page, 'cadastro');
    await abrirSolicitacao(page, codigo);
    await expect(page.getByTestId('atendimento-passo-seguinte')).toBeVisible();
    await page.getByTestId('atendimento-passo-seguinte').click();
    await expect(page.getByTestId('atendimento-salvar')).toBeVisible();
  };
  const salvarRascunho = async () => {
    await page.getByRole('button', { name: 'Salvar como Rascunho' }).click();
    await expect(page.getByText('Rascunho atualizado com sucesso.')).toBeVisible();
    await page.getByRole('button', { name: 'OK' }).click();
  };

  await trocarPerfil(page, 'tecnico_infra');
  await abrirRascunhoNoPasso2();

  // Ordem canônica: doc_1(0), doc_2(1), doc_3_pdf(2), doc_3_dwg(3), doc_4(4),
  // doc_ata(5)… — doc_1 exige .xlsx e doc_3_dwg exige .dwg, então o PDF de teste
  // vai para doc_2 e doc_ata.
  const inputs = page.locator('input[type="file"]');
  await inputs.nth(1).setInputFiles(ARQUIVO_PDF); // doc_2 — Registro do imóvel
  await inputs.nth(5).setInputFiles(ARQUIVO_PDF); // doc_ata — Ata do Colegiado
  await expect(page.getByText(ARQUIVO_PDF.name).nth(1)).toBeVisible();
  await salvarRascunho();

  await expect
    .poll(async () => {
      const linhas = await documentosDe(codigo);
      return linhas.find((d) => d.nome_logico === 'doc_2')?.file_name ?? '';
    })
    .toBe(ARQUIVO_PDF.name);

  // Reload completo: o anexo reaparece na UI a partir do banco
  await trocarPerfil(page, 'tecnico_infra');
  await abrirRascunhoNoPasso2();
  await expect(page.getByText(ARQUIVO_PDF.name).nth(1)).toBeVisible();

  // ── Idempotência: salvar 3x não muda a contagem de linhas ─────────────────
  const contarLinhas = async () => {
    const [linha] = await consultar<{ docs: number; hist: number }>(
      `select
         (select count(*)::int from documentos d join solicitacoes s on s.id = d.solicitacao_id where s.codigo_sgo = $1) as docs,
         (select count(*)::int from solicitacao_historico_etapas h join solicitacoes s on s.id = h.solicitacao_id where s.codigo_sgo = $1) as hist`,
      [codigo]
    );
    return linha;
  };

  const antes = await contarLinhas();
  expect(antes.docs).toBe(8);

  await salvarRascunho();
  for (let i = 0; i < 2; i++) {
    await abrirRascunhoNoPasso2();
    await salvarRascunho();
  }
  await expect.poll(async () => (await contarLinhas()).docs).toBe(antes.docs);
  expect((await contarLinhas()).hist).toBe(antes.hist);

  // ── Recusa com justificativa pelo analista + reload ───────────────────────
  const analista = await usuarioPorEmail('analistadore@educacao.mg.gov.br');
  await consultar(
    `update solicitacoes set etapa_atual = 'analise', analista_atribuido_id = $1 where codigo_sgo = $2`,
    [analista.id, codigo]
  );

  const justificativa = 'Certidão de registro ilegível — reenviar digitalização.';
  await trocarPerfil(page, 'analista_dore');
  await irParaSubtarefa(page, 'analise');
  await page.getByRole('button', { name: /Checklist & Anexos/ }).click();
  // doc_2 é o segundo card dos obrigatórios (o botão de doc_1 fica desabilitado
  // por não ter arquivo — os botões de análise exigem anexo)
  await page.getByRole('button', { name: 'Não Validado' }).nth(1).click();
  await page
    .getByPlaceholder('Digite aqui o motivo do erro para correção...')
    .first()
    .fill(justificativa);

  await expect
    .poll(async () => {
      const linhas = await documentosDe(codigo);
      const doc2 = linhas.find((d) => d.nome_logico === 'doc_2');
      return `${doc2?.status}|${doc2?.justificativa ?? ''}`;
    })
    .toBe(`recusado|${justificativa}`);

  // Reload: status e justificativa reidratam do banco
  await trocarPerfil(page, 'analista_dore');
  await irParaSubtarefa(page, 'analise');
  await page.getByRole('button', { name: /Checklist & Anexos/ }).click();
  await expect(
    page.getByPlaceholder('Digite aqui o motivo do erro para correção...').first()
  ).toHaveValue(justificativa);
});
