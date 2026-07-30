import { test, expect } from '../apoio/fixtures';
import { entrarComo, trocarPerfil } from '../apoio/sessao';
import { irParaSubtarefa, abrirSolicitacao } from '../apoio/navegacao';
import { consultar, criarSolicitacaoEmAnalise, solicitacaoPorCodigo } from '../apoio/banco';

// Ciclo de devolução: o analista reprova (seção não validada + documento
// recusado com justificativa) -> etapa 'correcao' + histórico de correções no
// banco; o técnico corrige e reenvia -> volta para 'analise'.

test('analista devolve para correção e o técnico reenvia para revalidação', async ({ page }) => {
  const codigo = 'SOL-E2E-601';
  await criarSolicitacaoEmAnalise(codigo, { comAnalista: true, comDocumentos: true });

  // ── Analista: marca pendências e envia a reprovação ───────────────────────
  await entrarComo(page, 'analista_dore');
  await irParaSubtarefa(page, 'analise');

  // Seção de dados gerais não validada, com motivo
  const motivoSecao = 'Endereço divergente do cadastro CODESC.';
  await page.locator('#sec-escolar').getByRole('button', { name: 'Não Validado' }).click();
  await page
    .getByPlaceholder('Indique os motivos de infraestrutura ou inconsistências para regularização...')
    .fill(motivoSecao);

  // Documento recusado com justificativa
  const justificativaDoc = 'Planilha sem assinatura do responsável técnico.';
  await page.getByRole('button', { name: /Checklist & Anexos/ }).click();
  await page.getByRole('button', { name: 'Não Validado' }).first().click();
  await page
    .getByPlaceholder('Digite aqui o motivo do erro para correção...')
    .first()
    .fill(justificativaDoc);

  const reprovar = page.getByTestId('botao-reprovar-processo');
  await expect(reprovar).toBeEnabled();
  await reprovar.click();

  await expect
    .poll(async () => (await solicitacaoPorCodigo(codigo)).etapa_atual)
    .toBe('correcao');

  // Histórico de correções gravado nas três tabelas
  await expect
    .poll(async () => {
      const [linha] = await consultar<{ correcoes: number; motivos: number; docs: number }>(
        `select
           (select count(*)::int from solicitacao_historico_correcoes c
              join solicitacoes s on s.id = c.solicitacao_id where s.codigo_sgo = $1) as correcoes,
           (select count(*)::int from historico_correcao_motivos m
              join solicitacao_historico_correcoes c on c.id = m.correcao_id
              join solicitacoes s on s.id = c.solicitacao_id where s.codigo_sgo = $1) as motivos,
           (select count(*)::int from historico_correcao_docs_recusados d
              join solicitacao_historico_correcoes c on c.id = d.correcao_id
              join solicitacoes s on s.id = c.solicitacao_id where s.codigo_sgo = $1) as docs`,
        [codigo]
      );
      return `${linha.correcoes}|${linha.motivos}|${linha.docs}`;
    })
    .toBe('1|1|1');

  const [motivo] = await consultar<{ motivo: string }>(
    `select m.motivo from historico_correcao_motivos m
     join solicitacao_historico_correcoes c on c.id = m.correcao_id
     join solicitacoes s on s.id = c.solicitacao_id where s.codigo_sgo = $1`,
    [codigo]
  );
  expect(motivo.motivo).toContain(motivoSecao);
  const [docRecusado] = await consultar<{ nome_doc: string }>(
    `select d.nome_doc from historico_correcao_docs_recusados d
     join solicitacao_historico_correcoes c on c.id = d.correcao_id
     join solicitacoes s on s.id = c.solicitacao_id where s.codigo_sgo = $1`,
    [codigo]
  );
  expect(docRecusado.nome_doc).toContain(justificativaDoc);

  // ── Técnico: corrige e reenvia para revalidação ───────────────────────────
  await trocarPerfil(page, 'tecnico_infra');
  await irParaSubtarefa(page, 'cadastro');
  await abrirSolicitacao(page, codigo);
  await expect(page.getByText('Correção Exigida pela DORE')).toBeVisible();

  await page.getByTestId('atendimento-editar-enviar').click();
  await expect(page.getByText('As correções foram enviadas para revalidação pela DORE com sucesso.')).toBeVisible();

  await expect
    .poll(async () => (await solicitacaoPorCodigo(codigo)).etapa_atual)
    .toBe('analise');
});
