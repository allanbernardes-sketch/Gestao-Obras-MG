import { Page, expect } from '@playwright/test';
import { irParaSubtarefa } from './navegacao';
import { consultar } from './banco';

// Fluxos de UI reutilizados por vários specs.

export const ARQUIVO_PDF = {
  name: 'documento-teste.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4\n% arquivo de teste e2e\n%%EOF\n'),
};

// Na Lista de Atendimentos, os perfis admin/analista/diretor abrem com o filtro
// "Minhas Análises" ativo — mostra tudo para os asserts de visibilidade.
export async function mostrarTodasAsDemandas(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Todas', exact: true }).first().click();
}

// Entra num submódulo de execução garantindo que a obra já foi carregada do
// banco antes do mount: ExecucaoSubmodulos escolhe a "obra focada" apenas na
// montagem — se o menu for clicado antes da carga assíncrona terminar, o
// submódulo fica sem obra selecionada.
export async function irParaSubmoduloExecucao(
  page: Page,
  submodulo: string,
  codigoSgo: string
): Promise<void> {
  await irParaSubtarefa(page, 'cadastro');
  await expect(page.getByTestId(`card-solicitacao-${codigoSgo}`)).toBeVisible({ timeout: 15_000 });
  await irParaSubtarefa(page, submodulo);
}

// Cria um atendimento completo pelo wizard (perfil técnico já logado) e devolve
// o código gerado (formato SOL-2026-NNN), lido do banco — o id é aleatório.
export async function criarAtendimentoPeloWizard(
  page: Page,
  nomeEscola = 'EE AARÃO REIS'
): Promise<string> {
  await irParaSubtarefa(page, 'novo_atendimento');

  // As escolas carregam do Supabase de forma assíncrona
  const selectEscola = page.getByTestId('atendimento-busca-escola');
  await expect(selectEscola).toBeVisible();
  await expect
    .poll(async () => selectEscola.locator('option').count(), { timeout: 15_000 })
    .toBeGreaterThan(1);

  // O value da opção é o NOME da escola; município/codesc são autopreenchidos
  await selectEscola.selectOption(nomeEscola);

  await page
    .getByPlaceholder(/Descreva a folha de rosto/)
    .fill('Reforma emergencial do telhado e das instalações elétricas do bloco principal.');
  await page.getByPlaceholder('R$ 0,00').fill('250000');
  await page.getByPlaceholder('Ex: 6').fill('6');
  await page.getByPlaceholder('Ex: 5%').fill('5%');

  await page.getByTestId('atendimento-passo-seguinte').click();

  // Passo 2: anexa um arquivo em todos os documentos do checklist (7 obrigatórios + 1 opcional)
  const inputsArquivo = page.locator('input[type="file"]');
  await expect.poll(async () => inputsArquivo.count()).toBeGreaterThanOrEqual(8);
  const total = await inputsArquivo.count();
  for (let i = 0; i < total; i++) {
    await inputsArquivo.nth(i).setInputFiles(ARQUIVO_PDF);
  }

  await page.getByTestId('atendimento-salvar').click();

  // Ao salvar, o App troca a subtarefa para a Lista de Atendimentos — o código é
  // aleatório, então é recuperado do banco (a persistência é assíncrona).
  let codigo = '';
  await expect
    .poll(async () => {
      const linhas = await consultar<{ codigo_sgo: string }>(
        `select codigo_sgo from solicitacoes order by created_at desc limit 1`
      );
      codigo = linhas[0]?.codigo_sgo ?? '';
      return codigo;
    }, { timeout: 15_000 })
    .toMatch(/^SOL-2026-\d{3}$/);

  await expect(page.getByTestId(`card-solicitacao-${codigo}`)).toBeVisible({ timeout: 15_000 });
  return codigo;
}
