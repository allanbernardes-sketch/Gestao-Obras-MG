import { execSync } from 'node:child_process';

// Resolve as credenciais do stack Supabase LOCAL via `npx supabase status`.
// Falha com mensagem clara se o stack não estiver de pé — nenhum teste deve
// rodar contra o projeto remoto.

export interface AmbienteLocal {
  apiUrl: string;
  anonKey: string;
  dbUrl: string;
}

let cache: AmbienteLocal | null = null;

export function ambienteLocal(): AmbienteLocal {
  if (cache) return cache;

  let saida: string;
  try {
    saida = execSync('npx supabase status -o env', {
      cwd: new URL('../..', import.meta.url).pathname,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    throw new Error(
      'Stack Supabase local não está rodando. Execute `npx supabase start` ' +
      '(e `npm run db:reset` para semear) antes de rodar os testes e2e.'
    );
  }

  const vars = new Map<string, string>();
  for (const linha of saida.split('\n')) {
    const m = linha.match(/^([A-Z_]+)="?([^"]*)"?$/);
    if (m) vars.set(m[1], m[2]);
  }

  const apiUrl = vars.get('API_URL');
  const anonKey = vars.get('ANON_KEY');
  if (!apiUrl || !anonKey) {
    throw new Error(
      `Não foi possível ler API_URL/ANON_KEY de \`npx supabase status -o env\`. Saída:\n${saida}`
    );
  }

  cache = {
    apiUrl,
    anonKey,
    dbUrl: vars.get('DB_URL') ?? 'postgresql://postgres:postgres@127.0.0.1:55322/postgres',
  };
  return cache;
}
