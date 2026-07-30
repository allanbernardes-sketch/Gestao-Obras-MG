import { test, expect } from '../apoio/fixtures';
import { entrarComo, trocarPerfil } from '../apoio/sessao';
import { irParaSubtarefa, abrirSolicitacao } from '../apoio/navegacao';
import { criarSolicitacaoEmCadastro, solicitacaoPorCodigo } from '../apoio/banco';
import { mostrarTodasAsDemandas } from '../apoio/fluxos';

// Regressão do BUG 4 (delete + upsert): excluir remove a linha do banco (antes a
// linha "ressuscitava" no reload) e editar uma solicitação atualiza somente o
// updated_at DELA (o upsert não pode regravar a lista inteira).

test('excluir remove do banco e editar só toca o updated_at da solicitação editada', async ({ page }) => {
  const codigoA = 'SOL-E2E-501';
  const codigoB = 'SOL-E2E-502';
  await criarSolicitacaoEmCadastro(codigoA);
  await criarSolicitacaoEmCadastro(codigoB, { nomeEscola: 'EE GUIA LOPES', codesc: '31000051' });

  const updatedAntesA = (await solicitacaoPorCodigo(codigoA)).updated_at;
  const updatedAntesB = (await solicitacaoPorCodigo(codigoB)).updated_at;

  await entrarComo(page, 'admin');
  await irParaSubtarefa(page, 'cadastro');
  await mostrarTodasAsDemandas(page);

  // ── Edição de um campo da solicitação B (modal de edição rápida) ──────────
  await abrirSolicitacao(page, codigoB);
  const campoPredio = page.getByPlaceholder('Ex: BLOCO PRINCIPAL, COZINHA');
  await expect(campoPredio).toBeVisible();
  await campoPredio.fill('BLOCO ANEXO E2E');
  await page.getByRole('button', { name: 'Salvar Alterações do Atendimento' }).click();

  await expect
    .poll(async () => (await solicitacaoPorCodigo(codigoB)).predio)
    .toBe('BLOCO ANEXO E2E');

  const depoisA = await solicitacaoPorCodigo(codigoA);
  const depoisB = await solicitacaoPorCodigo(codigoB);
  expect(new Date(depoisB.updated_at).getTime()).toBeGreaterThan(new Date(updatedAntesB).getTime());
  // A solicitação NÃO editada não pode ter sido regravada
  expect(depoisA.updated_at).toEqual(updatedAntesA);

  // ── Exclusão da solicitação A ─────────────────────────────────────────────
  await page.getByTestId(`excluir-solicitacao-${codigoA}`).click();
  await page.getByTestId('excluir-solicitacao-confirmar').click();

  await expect.poll(async () => solicitacaoPorCodigo(codigoA)).toBeNull();
  await expect(page.getByTestId(`card-solicitacao-${codigoA}`)).toHaveCount(0);

  // Reload: a exclusão não "ressuscita" e a editada continua lá
  await trocarPerfil(page, 'admin');
  await irParaSubtarefa(page, 'cadastro');
  await mostrarTodasAsDemandas(page);
  await expect(page.getByTestId(`card-solicitacao-${codigoB}`)).toBeVisible();
  await expect(page.getByTestId(`card-solicitacao-${codigoA}`)).toHaveCount(0);
  expect(await solicitacaoPorCodigo(codigoA)).toBeNull();
});
