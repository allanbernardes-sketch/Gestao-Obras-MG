import { test, expect } from '../apoio/fixtures';
import { entrarComo } from '../apoio/sessao';
import { irParaSubmoduloExecucao } from '../apoio/fluxos';
import { consultar, criarSolicitacaoEmExecucao } from '../apoio/banco';

// Medições: com uma obra já em execução (criada direto no banco), o fiscal
// registra uma medição pela UI e a linha aparece na tabela `medicoes`.

test('fiscal registra medição e a linha é gravada em `medicoes`', async ({ page }) => {
  const codigo = 'SOL-E2E-801';
  await criarSolicitacaoEmExecucao(codigo);

  await entrarComo(page, 'fiscal_obra');
  await irParaSubmoduloExecucao(page, 'execucao_medicoes', codigo);

  await page.getByRole('button', { name: 'Registrar Nova Medição' }).click();

  const formulario = page.locator('form').filter({ has: page.locator('#med-valor-input') });
  await expect(formulario).toBeVisible();

  await formulario.locator('#med-desc-input').fill('Fase 1: fundações e alvenaria estrutural concluídas.');
  // Datas do período de referência (a data da medição já vem preenchida)
  const hoje = new Date().toISOString().split('T')[0];
  const datas = formulario.locator('input[type="date"]');
  await datas.nth(1).fill(hoje);
  await datas.nth(2).fill(hoje);

  await page.getByTestId('medicao-valor').fill('50000');

  // Anexos obrigatórios simulados (Relatório de Fiscalização + Boletim)
  const mocks = page.getByRole('button', { name: /Auto-Preencher Mock/ });
  await expect(mocks).toHaveCount(2);
  await mocks.nth(0).click();
  await mocks.nth(1).click();

  await page.getByTestId('medicao-registrar').click();

  await expect
    .poll(async () => {
      const linhas = await consultar(
        `select m.* from medicoes m join solicitacoes s on s.id = m.solicitacao_id
         where s.codigo_sgo = $1`,
        [codigo]
      );
      return linhas.length;
    }, { timeout: 15_000 })
    .toBe(1);

  const [medicao] = await consultar(
    `select m.* from medicoes m join solicitacoes s on s.id = m.solicitacao_id
     where s.codigo_sgo = $1`,
    [codigo]
  );
  expect(Number(medicao.valor)).toBe(50000);
  expect(medicao.numero_medicao).toBe(1);
  expect(medicao.responsavel_medicao).toBe('Fiscal de Obras Teste');

  // A UI reflete o histórico após o registro
  await expect(page.getByRole('button', { name: /Histórico de Medições \(1\)/ })).toBeVisible();
});
