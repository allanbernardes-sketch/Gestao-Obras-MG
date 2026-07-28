import { Page, expect } from '@playwright/test';

// Login via UI (sem storageState: o app não tem URLs para restaurar estado e o
// storageState carregaria o localStorage que os testes precisam limpar).

export const SENHA_TESTE = 'senha-teste-sgo';

export const CREDENCIAIS = {
  tecnico_infra: 'tecnicoregional@educacao.mg.gov.br',
  tecnico_infra_sre_a: 'tecnico.sre-a@educacao.mg.gov.br',
  coordenador_regional: 'coordenador@educacao.mg.gov.br',
  gestor_dore: 'gestordore@educacao.mg.gov.br',
  analista_dore: 'analistadore@educacao.mg.gov.br',
  gestor_paf: 'gestorpaf@educacao.mg.gov.br',
  administrativo_dore: 'administrativo@educacao.mg.gov.br',
  diretor_dore: 'diretor@educacao.mg.gov.br',
  fiscal_obra: 'fiscal@educacao.mg.gov.br',
  admin: 'sofia.viana@educacao.mg.gov.br',
} as const;

export type PerfilTeste = keyof typeof CREDENCIAIS;

export async function entrarComo(page: Page, perfil: PerfilTeste): Promise<void> {
  await page.goto('/');
  await page.getByTestId('login-email').fill(CREDENCIAIS[perfil]);
  await page.getByTestId('login-senha').fill(SENHA_TESTE);
  await page.getByTestId('login-entrar').click();
  await expect(page.getByTestId('botao-sair')).toBeVisible({ timeout: 20_000 });
}

export async function sairDoSistema(page: Page): Promise<void> {
  await page.getByTestId('botao-sair').click();
  await expect(page.getByTestId('login-entrar')).toBeVisible({ timeout: 10_000 });
}

export async function trocarPerfil(page: Page, perfil: PerfilTeste): Promise<void> {
  await sairDoSistema(page);
  await entrarComo(page, perfil);
}
