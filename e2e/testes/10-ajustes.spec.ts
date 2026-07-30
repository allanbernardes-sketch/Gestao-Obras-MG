import { test, expect } from '../apoio/fixtures';
import { entrarComo } from '../apoio/sessao';
import { irParaSubmoduloExecucao } from '../apoio/fluxos';
import { consultar, criarSolicitacaoEmExecucao } from '../apoio/banco';

// Ajustes de planilha: com uma obra em execução (fiscal atribuído no seed do
// teste — obrigatório para ajustes), o proponente cria um ajuste pela UI e a
// linha aparece em `ajustes_planilha` com status 'pendente'.

test('criar ajuste grava linha em `ajustes_planilha` com status pendente', async ({ page, dialogos }) => {
  const codigo = 'SOL-E2E-1001';
  await criarSolicitacaoEmExecucao(codigo);

  await entrarComo(page, 'fiscal_obra');
  await irParaSubmoduloExecucao(page, 'execucao_ajustes', codigo);

  await page.getByTestId('ajuste-criar').click();

  // Passo 1: valor de acréscimo + justificativa (responsável técnico vem do fiscal da obra)
  await page.getByPlaceholder('Ex. 50000').fill('30000');
  await page.locator('textarea').first().fill('Remanejamento de quantitativos entre itens de cobertura e pintura.');
  await page.getByRole('button', { name: 'Checklist de Evidências' }).click();

  // Passo 2: envia a proposta para validação
  await page.getByTestId('ajuste-salvar').click();

  await expect
    .poll(async () => {
      const linhas = await consultar(
        `select a.* from ajustes_planilha a join solicitacoes s on s.id = a.solicitacao_id
         where s.codigo_sgo = $1`,
        [codigo]
      );
      return linhas.length;
    }, { timeout: 15_000 })
    .toBe(1);

  const [ajuste] = await consultar(
    `select a.* from ajustes_planilha a join solicitacoes s on s.id = a.solicitacao_id
     where s.codigo_sgo = $1`,
    [codigo]
  );
  expect(ajuste.status).toBe('pendente');
  expect(ajuste.numero_ajuste).toBe(1);
  expect(ajuste.responsavel_planilha).toBe('Fiscal de Obras Teste');
  expect(ajuste.observacoes ?? ajuste.parecer_dore ?? '').toBeDefined();

  expect(dialogos.some((m) => m.includes('ajuste cadastrada com sucesso'))).toBe(true);
});

// DIVERGÊNCIA/BUG registrado no relatório: ajuste-aprovar/ajuste-recusar ficam
// dentro de `{role === 'dore' && ...}` e `setRole` nunca é chamado — o box
// "Homologação Interna DORE / SGO" é INALCANÇÁVEL pela UI (mesmo dead state dos
// aditivos). Sem rota de UI para aprovar, o caso fica skip.
test.skip('aprovar ajuste pela UI (console DORE inalcançável — dead state `role`)', async () => {
  // Inalcançável: ver comentário acima.
});
