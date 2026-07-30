import { test as base } from '@playwright/test';
import { limparTabelasTransacionais } from './banco';

// test estendido para toda a suíte:
// - `dialogos`: alert()/confirm() nativos são aceitos automaticamente e as
//   mensagens ficam registradas para asserção (por padrão o Playwright cancela
//   confirms, o que travaria os fluxos do app).
// - banco transacional truncado antes de cada teste. O localStorage NÃO é limpo
//   a cada navegação: cada teste já nasce num contexto novo (storage vazio) e o
//   app depende da sessão persistida do Supabase Auth para carregar os dados do
//   banco no mount (as consultas iniciais rodam antes do login e o RLS devolve
//   vazio para anon) — limpar a cada documento mataria a sessão em todo reload.

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
    await use(page);
  },
});

export { expect } from '@playwright/test';
