import { test as base } from '@playwright/test';
import { limparTabelasTransacionais } from './banco';

// test estendido para toda a suíte:
// - `dialogos`: alert()/confirm() nativos são aceitos automaticamente e as
//   mensagens ficam registradas para asserção (por padrão o Playwright cancela
//   confirms, o que travaria os fluxos do app).
// - banco transacional truncado e localStorage limpo antes de cada teste — o
//   fallback local ('gesto_solicitacoes') mascararia falhas de persistência.

interface FixturesSgo {
  dialogos: string[];
}

export const test = base.extend<FixturesSgo>({
  dialogos: async ({ page }, use) => {
    const mensagens: string[] = [];
    page.on('dialog', async (dialog) => {
      mensagens.push(dialog.message());
      await dialog.accept();
    });
    await use(mensagens);
  },

  page: async ({ page }, use) => {
    await limparTabelasTransacionais();
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
      } catch {
        // storage indisponível (primeira navegação) — ignorar
      }
    });
    await use(page);
  },
});

export { expect } from '@playwright/test';
