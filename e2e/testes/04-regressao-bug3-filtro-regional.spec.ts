import { test, expect } from '../apoio/fixtures';
import { entrarComo, trocarPerfil } from '../apoio/sessao';
import { irParaSubtarefa } from '../apoio/navegacao';
import { criarSolicitacaoEmCadastro } from '../apoio/banco';

// Regressão do BUG 3 (visão regional): técnico só enxerga as demandas e as
// escolas da própria SRE. João Técnico = SRE Metropolitana B (15 escolas, ex.
// 31000027); tecnico.sre-a = SRE Metropolitana A (5 escolas, ex. 31000035).

test('técnico de outra SRE não vê a solicitação nem as escolas fora da sua regional', async ({ page }) => {
  const codigo = 'SOL-E2E-401';
  await criarSolicitacaoEmCadastro(codigo, { sre: 'SRE Metropolitana B' });

  // Controle positivo: o técnico da SRE B vê a demanda
  await entrarComo(page, 'tecnico_infra');
  await irParaSubtarefa(page, 'cadastro');
  await expect(page.getByTestId(`card-solicitacao-${codigo}`)).toBeVisible();

  // Técnico da SRE A NÃO vê a demanda da SRE B
  await trocarPerfil(page, 'tecnico_infra_sre_a');
  await irParaSubtarefa(page, 'cadastro');
  await expect(page.getByText('Nenhuma solicitação encontrada')).toBeVisible();
  await expect(page.getByTestId(`card-solicitacao-${codigo}`)).toHaveCount(0);

  // E no wizard só aparecem as escolas da SRE A
  await irParaSubtarefa(page, 'novo_atendimento');
  const selectEscola = page.getByTestId('atendimento-busca-escola');
  await expect(selectEscola).toBeVisible();
  await expect(page.getByTestId('atendimento-opcao-escola-31000035')).toBeAttached();
  await expect(page.getByTestId('atendimento-opcao-escola-31000027')).toHaveCount(0);
  // 5 escolas da SRE A + opção placeholder
  await expect(selectEscola.locator('option')).toHaveCount(6);
});
