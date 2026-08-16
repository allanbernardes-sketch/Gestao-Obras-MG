import { test, expect } from '../apoio/fixtures';
import { entrarComo, trocarPerfil } from '../apoio/sessao';
import { irParaSubtarefa } from '../apoio/navegacao';
import { criarSolicitacaoEmAnalise, solicitacaoPorCodigo, usuarioPorEmail } from '../apoio/banco';

// Regressão do BUG 2 (FKs de usuário): atribuir um analista precisa gravar o
// UUID real da tabela `usuarios` em `analista_atribuido_id` (não um id local
// 'USR-xx'), e o nome deve reidratar após reload via join.

test('atribuir analista grava o uuid do seed e o nome sobrevive ao reload', async ({ page }) => {
  const codigo = 'SOL-E2E-301';
  await criarSolicitacaoEmAnalise(codigo);
  const analista = await usuarioPorEmail('analistadore@educacao.mg.gov.br');

  // 'gestor_dore' foi removido do sistema — ver [[remocao-perfil-gestor-dore]].
  await entrarComo(page, 'admin');
  await irParaSubtarefa(page, 'analise_atribuicao');

  const seletor = page.getByTestId('atribuicao-selecionar-analista');
  await expect(seletor).toBeVisible();
  // As opções usam o uuid como value e "Nome (DORE)" como label
  await expect(seletor.locator(`option[value="${analista.id}"]`)).toHaveText(
    `${analista.nome} (DORE)`
  );
  await seletor.selectOption(analista.id);

  await expect
    .poll(async () => (await solicitacaoPorCodigo(codigo)).analista_atribuido_id)
    .toBe(analista.id);

  // Reload completo: o nome volta do banco (join por FK) e o select mantém o valor
  await trocarPerfil(page, 'admin');
  await irParaSubtarefa(page, 'analise_atribuicao');
  await expect(page.getByTestId('atribuicao-selecionar-analista')).toHaveValue(analista.id);
});
