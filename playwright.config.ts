import { defineConfig } from '@playwright/test';
import { ambienteLocal } from './e2e/apoio/ambiente';

// Suíte e2e contra o Supabase LOCAL. As credenciais locais são injetadas no
// webServer (process env tem precedência sobre .env.local no Vite), garantindo
// que os testes nunca batem no projeto remoto — mesmo que o .env.local do dev
// aponte para ele.
const ambiente = ambienteLocal();

export default defineConfig({
  testDir: 'e2e/testes',
  // Banco compartilhado + truncate entre testes ⇒ execução serial obrigatória.
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    actionTimeout: 15_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      DISABLE_HMR: 'true',
      VITE_SUPABASE_URL: ambiente.apiUrl,
      VITE_SUPABASE_ANON_KEY: ambiente.anonKey,
    },
  },
});
