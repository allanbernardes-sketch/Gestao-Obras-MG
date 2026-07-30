import { test, expect } from '../apoio/fixtures';
import { entrarComo } from '../apoio/sessao';
import { irParaSubmoduloExecucao } from '../apoio/fluxos';
import { consultar, criarSolicitacaoEmExecucao } from '../apoio/banco';

// Aditivos: com uma obra em execução, o proponente cria um aditivo pela UI e a
// linha aparece em `aditivos` com status 'pendente'.

test('criar aditivo grava linha em `aditivos` com status pendente', async ({ page, dialogos }) => {
  const codigo = 'SOL-E2E-901';
  await criarSolicitacaoEmExecucao(codigo);

  await entrarComo(page, 'fiscal_obra');
  await irParaSubmoduloExecucao(page, 'execucao_aditivos', codigo);

  await page.getByTestId('aditivo-criar').click();

  // Passo 1: justificativa + valor (tipo padrão inclui acréscimo de valor)
  await page.getByPlaceholder('Ex. 50000').fill('75000');
  await page.locator('textarea').first().fill('Acréscimo de serviços de drenagem não previstos na planilha original.');
  await page.getByRole('button', { name: 'Avançar para Checklist' }).click();

  // Passo 2: o checklist não é validado — envia direto
  await page.getByTestId('aditivo-salvar').click();

  await expect
    .poll(async () => {
      const linhas = await consultar(
        `select a.* from aditivos a join solicitacoes s on s.id = a.solicitacao_id
         where s.codigo_sgo = $1`,
        [codigo]
      );
      return linhas.length;
    }, { timeout: 15_000 })
    .toBe(1);

  const [aditivo] = await consultar(
    `select a.* from aditivos a join solicitacoes s on s.id = a.solicitacao_id
     where s.codigo_sgo = $1`,
    [codigo]
  );
  expect(aditivo.status).toBe('pendente');
  expect(aditivo.numero_aditivo).toBe(1);
  expect(Number(aditivo.valor_adicional)).toBe(75000);
  expect(aditivo.motivo).toContain('drenagem');

  expect(dialogos.some((m) => m.includes('aditivo cadastrada com sucesso'))).toBe(true);
});

// DIVERGÊNCIA/BUG registrado no relatório: os botões aditivo-aprovar/aditivo-recusar
// ficam dentro de `{role === 'dore' && ...}` em ExecucaoSubmodulos, mas `setRole`
// nunca é chamado (o estado nasce 'proponente' e nunca muda) — o console de
// análise DORE é INALCANÇÁVEL pela UI. O caminho alternativo (ProcessAnalysisPanel)
// só existe para etapa 'analise' e não grava no banco. Sem rota de UI, o caso fica skip.
test.skip('aprovar aditivo pela UI (console DORE inalcançável — dead state `role`)', async () => {
  // Inalcançável: ver comentário acima.
});
