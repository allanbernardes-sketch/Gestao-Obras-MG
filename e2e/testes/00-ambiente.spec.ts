import { test, expect } from '../apoio/fixtures';
import { entrarComo, sairDoSistema, CREDENCIAIS, PerfilTeste } from '../apoio/sessao';
import { irParaSubtarefa } from '../apoio/navegacao';
import { consultar } from '../apoio/banco';

// Smoke: o ambiente inteiro está de pé — app + Supabase local + seed.

test('app sobe e exibe a tela de login', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('login-email')).toBeVisible();
  await expect(page.getByTestId('login-entrar')).toBeVisible();
});

test('todos os perfis do seed autenticam e deslogam', async ({ page }) => {
  for (const perfil of Object.keys(CREDENCIAIS) as PerfilTeste[]) {
    await entrarComo(page, perfil);
    await sairDoSistema(page);
  }
});

test('credencial inválida mostra erro', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('login-email').fill('naoexiste@educacao.mg.gov.br');
  await page.getByTestId('login-senha').fill('senha-errada');
  await page.getByTestId('login-entrar').click();
  await expect(page.getByTestId('login-erro')).toBeVisible();
});

test('wizard de atendimento lista as escolas do seed', async ({ page }) => {
  await entrarComo(page, 'tecnico_infra');
  await irParaSubtarefa(page, 'novo_atendimento');
  const selectEscola = page.getByTestId('atendimento-busca-escola');
  await expect(selectEscola).toBeVisible();
  // Técnico da SRE Metropolitana B vê as 15 escolas da sua regional
  await expect(page.getByTestId('atendimento-opcao-escola-31000027')).toBeAttached();
});

test('banco local está semeado e sem solicitações', async () => {
  const [linha] = await consultar<{ escolas: number; usuarios: number; solicitacoes: number }>(
    `select
       (select count(*)::int from escolas) as escolas,
       (select count(*)::int from usuarios) as usuarios,
       (select count(*)::int from solicitacoes) as solicitacoes`
  );
  expect(linha.escolas).toBe(20);
  expect(linha.usuarios).toBe(10);
  expect(linha.solicitacoes).toBe(0);
});
