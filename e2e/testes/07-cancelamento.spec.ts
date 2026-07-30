import { test, expect } from '../apoio/fixtures';
import { entrarComo, trocarPerfil } from '../apoio/sessao';
import { irParaSubtarefa } from '../apoio/navegacao';
import { criarSolicitacaoEmAnalise, solicitacaoPorCodigo, historicoEtapasDe } from '../apoio/banco';

// Cancelamento definitivo do processo. Divergência do roteiro: o botão
// 'Cancelar Processo' só existe para admin/diretor_dore (e apenas enquanto o
// processo ainda é modificável — etapa fora de ordem_inicio/execucao); a
// confirmação é um modal próprio (não um confirm() nativo).

test('admin cancela o processo com justificativa e a etapa vira "cancelado" no banco', async ({ page }) => {
  const codigo = 'SOL-E2E-701';
  await criarSolicitacaoEmAnalise(codigo);

  await entrarComo(page, 'admin');
  await irParaSubtarefa(page, 'analise');

  await page.getByTestId('botao-cancelar-processo').click();
  const justificativa = page.getByPlaceholder('Justifique o cancelamento definitivo do processo...');
  await expect(justificativa).toBeVisible();

  const confirmar = page.getByTestId('botao-confirmar-cancelamento');
  await expect(confirmar).toBeDisabled();
  await justificativa.fill('Demanda duplicada — processo aberto em duplicidade pela SRE.');
  await expect(confirmar).toBeEnabled();
  await confirmar.click();

  await expect
    .poll(async () => (await solicitacaoPorCodigo(codigo)).etapa_atual)
    .toBe('cancelado');

  const historico = await historicoEtapasDe(codigo);
  expect(historico.map((h: any) => h.etapa_nova)).toContain('cancelado');

  // Reload: a fila de análise reidrata vazia (o processo saiu da etapa)
  await trocarPerfil(page, 'admin');
  await irParaSubtarefa(page, 'analise');
  await expect(page.getByText('Fila de Trabalho Concluída!')).toBeVisible();
  expect((await solicitacaoPorCodigo(codigo)).etapa_atual).toBe('cancelado');
});
