import { Page, expect } from '@playwright/test';

// Login via UI (sem storageState: o app não tem URLs para restaurar estado e o
// storageState carregaria o localStorage que os testes precisam limpar).

export const SENHA_TESTE = 'senha-teste-sgo';

export const CREDENCIAIS = {
  tecnico_infra: 'tecnicoregional@educacao.mg.gov.br',
  tecnico_infra_sre_a: 'tecnico.sre-a@educacao.mg.gov.br',
  coordenador_regional: 'coordenador@educacao.mg.gov.br',
  // 'gestor_dore' foi removido do sistema (ver [[remocao-perfil-gestor-dore]]) — quem hoje atribui
  // analista na fila de Atribuição é admin/diretor_dore, ou o próprio analista_dore se auto-atribuindo.
  // Aline (login abaixo) foi reaproveitada como segunda analista de teste, equipe "Ajuste"
  // (analista_dore é a equipe "Planejamento") — ver [[equipes-analista-auxiliares]].
  analista_dore: 'analistadore@educacao.mg.gov.br',
  analista_dore_ajuste: 'gestordore@educacao.mg.gov.br',
  gestor_paf: 'gestorpaf@educacao.mg.gov.br',
  administrativo_dore: 'administrativo@educacao.mg.gov.br',
  diretor_dore: 'diretor@educacao.mg.gov.br',
  fiscal_obra: 'fiscal@educacao.mg.gov.br',
  admin: 'sofia.viana@educacao.mg.gov.br',
} as const;

export type PerfilTeste = keyof typeof CREDENCIAIS;

export async function entrarComo(page: Page, perfil: PerfilTeste): Promise<void> {
  await page.goto('/');

  // Uma sessão anterior persistida reautentica sozinha no goto — desloga antes.
  const formulario = page.getByTestId('login-email');
  const botaoSair = page.getByTestId('botao-sair');
  await expect(formulario.or(botaoSair)).toBeVisible({ timeout: 20_000 });
  if (await botaoSair.isVisible()) {
    await sairDoSistema(page);
  }

  await formulario.fill(CREDENCIAIS[perfil]);
  await page.getByTestId('login-senha').fill(SENHA_TESTE);
  await page.getByTestId('login-entrar').click();
  await expect(botaoSair).toBeVisible({ timeout: 20_000 });

  // As consultas iniciais do App rodam no mount, ANTES do login (anon + RLS =
  // vazio) e não são refeitas ao autenticar. Um reload com a sessão persistida
  // remonta o App já autenticado e hidrata usuários/solicitações do banco.
  await page.reload();
  await expect(botaoSair).toBeVisible({ timeout: 20_000 });
}

export async function sairDoSistema(page: Page): Promise<void> {
  await page.getByTestId('botao-sair').click();
  await expect(page.getByTestId('login-entrar')).toBeVisible({ timeout: 10_000 });
  // signOut é assíncrono: garante que o token saiu do storage antes de seguir,
  // senão o próximo goto reautentica com a sessão antiga.
  await page.waitForFunction(
    () => !Object.keys(window.localStorage).some((k) => k.startsWith('sb-')),
    undefined,
    { timeout: 10_000 }
  );
}

export async function trocarPerfil(page: Page, perfil: PerfilTeste): Promise<void> {
  await sairDoSistema(page);
  await entrarComo(page, perfil);
}
