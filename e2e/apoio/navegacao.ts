import { Page, expect } from '@playwright/test';

// O app não tem router: toda navegação é clique na sidebar (data-testid).

export async function irParaModulo(
  page: Page,
  modulo: 'gestao-obras' | 'seguranca' | 'orcamento' | 'imoveis' | 'abertura-chamados' | 'central-logs'
): Promise<void> {
  await page.getByTestId(`modulo-${modulo}`).click();
}

export async function irParaSubtarefa(page: Page, subtarefaId: string): Promise<void> {
  await page.getByTestId(`menu-${subtarefaId}`).click();
}

export async function abrirSolicitacao(page: Page, codigoSgo: string): Promise<void> {
  const card = page.getByTestId(`card-solicitacao-${codigoSgo}`);
  await expect(card).toBeVisible({ timeout: 15_000 });
  await card.click();
}
