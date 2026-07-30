# Plano — Frente 2: Fundação + testes e2e (SGO / Gestao-Obras-MG)

## Contexto

A Frente 1 (estancar perdas de dados) está implementada na branch `fix/estancar-perdas-de-dados` aguardando validação/merge. A Frente 2 cria a fundação de engenharia que falta para o SGO evoluir como produto: hoje **não existe nenhum teste** (`npm run lint` = só tsc), o Supabase local **não sobe** (schema base nunca foi versionado — só as migrations do "recorte 2"), não há `seed.sql`, e o `.env.example` documenta variáveis inúteis do template AI Studio enquanto omite as duas que o app realmente usa (sem elas: tela branca).

### Decisões fechadas com o usuário (brainstorm 2026-07-28)

1. **e2e contra Supabase local** (Docker já disponível na máquina; CLI via `npx supabase`) — banco descartável, reset entre testes.
2. **Cobertura ampla**: happy path completo (trocando perfis) + regressão dos 4 bugs da Frente 1 + fluxos alternativos (correção/devolução, cancelamento, aditivos, ajustes, medições).
3. **Sem CI próprio** — CI/CD do projeto é na Vercel (build/deploy); a suíte e2e roda localmente via scripts npm.

### Fora de escopo

GitHub Actions, Supabase Storage (uploads seguem simulados), RLS por perfil/SRE, testes unitários, limpeza de mocks/deps mortas (Frente 5).

## Fatos verificados (exploração via MCP no banco remoto)

- **Histórico de migrations remoto ≠ arquivos locais**: `supabase_migrations.schema_migrations` registra 12 versões com timestamps diferentes dos nomes locais, inclui uma sem arquivo local e não inclui a `seed_usuario_regionais` da Frente 1 (efeito aplicado por fora). `db pull` pediria `migration repair` no remoto → **usar `db dump` (read-only)**.
- `public.usuarios.id == auth.users.id` (verificado nos 13 usuários); sem trigger `handle_new_user` → seed insere nas duas tabelas com o mesmo uuid.
- Postgres remoto 17.6; `config.toml` já com `major_version=17` e `[db.seed]` apontando para `./seed.sql`.
- Dados de referência (perfis 9, regionais_sre 47, tipos_obra 6, escolas 3444) não vêm no dump de schema → vão para o seed. `escolas.sre` é CAIXA ALTA vs `regionais_sre.nome` capitalizado — preservar (o app depende de `normalizarSre`).
- Não existe usuário `fiscal_obra` nem técnico de outra SRE no remoto → entram como usuários só-locais no seed (necessários para specs de execução e do filtro regional).

## Implementação (etapas commitáveis, branch a partir de `fix/estancar-perdas-de-dados`)

### A — Baseline do schema local
1. `npx supabase login` + `link --project-ref oabqskuomgiuglailaia`.
2. Arquivar as 12 migrations atuais em `supabase/migracoes-aplicadas-remoto/` (já aplicadas no remoto com outros timestamps; efeitos virão no dump) + README de 3 linhas.
3. `npx supabase db dump --linked -f supabase/migrations/20260601000000_baseline_esquema_remoto.sql` (timestamp artificial anterior a tudo). Revisar o arquivo gerado.
4. Verificar: `npx supabase start` + `db reset` limpos, tabelas presentes no Studio local (54323).
5. Convenção documentada: `supabase/migrations/` = fonte de verdade local; reconciliar histórico remoto fica fora de escopo.

### B — `supabase/seed.sql`
Blocos em ordem: perfis (9, ids do remoto) → regionais_sre (47) → tipos_obra (6) → ~15 escolas da SRE METROPOLITANA B + ~5 da SRE METROPOLITANA A com endereços (`ativo=true`, caixa alta preservada) → usuários de teste em `auth.users` + `auth.identities` + `public.usuarios` com uuids fixos (`…0001`–`…0010`) e senha única `senha-teste-sgo` (armadilhas: tokens `''` não-NULL, `identities.provider_id` obrigatório, `crypt`/`gen_salt` no schema `extensions`, `instance_id` zero-uuid) → `usuario_regionais` (João Técnico e Coordenador → SRE B; Técnico SRE A → SRE A; absorve a migration da Frente 1) → zero solicitações (testes criam as suas). Dados reais consultados via MCP na implementação.
Verificar: `db reset` + autenticação via curl no token endpoint local.

### C — DX / env
- `.env.example` reescrito: só `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` com instruções do stack local (remove GEMINI_API_KEY/APP_URL).
- [src/lib/supabase.ts](src/lib/supabase.ts): validação com `throw new Error` de mensagem clara em pt-BR se as vars faltarem (overlay do Vite exibe; hoje é tela branca). Única mudança de comportamento além dos testids.
- README: seção "Como rodar com Supabase local"; detalhes em `docs/testes-e2e.md`.

### D — Infra Playwright
- Deps: `@playwright/test` + `pg` (dev), `npx playwright install chromium` (só Chromium).
- Estrutura `e2e/apoio/`: `ambiente.ts` (resolve URL/anon key via `npx supabase status -o env`, falha claro se stack parado), `banco.ts` (pool pg na 54322, `limparTabelasTransacionais()` via TRUNCATE CASCADE, asserções SQL, `criarSolicitacaoEmExecucao()` para specs de execução), `fixtures.ts` (handler global de dialog que aceita e registra alert/confirm, truncate no beforeEach, `addInitScript` limpando localStorage), `sessao.ts` (`entrarComo(page, perfil)` — login via UI, decisão: sem storageState, pois capturaria o localStorage que os testes precisam limpar e não há URLs para restaurar estado), `navegacao.ts`.
- `playwright.config.ts`: `workers: 1` (banco compartilhado + truncate ⇒ serial), `timeout: 90s`, `webServer` com `DISABLE_HMR=true` e **env do Supabase local injetada** (process env > `.env.local` no Vite — garante que e2e nunca bate no remoto).

### E — data-testid (kebab-case pt-BR, sem mudar comportamento)
- Login (`login-email/senha/entrar/erro`), `botao-sair`, sidebar (`modulo-*`, `menu-${item.id}` usando ids existentes), wizard Novo Atendimento (`atendimento-*`), cards (`card-solicitacao-${id}`), transições em SolicitacaoDetalhes (`botao-encaminhar-analista`, `botao-aprovar-processo`, `botao-reprovar-processo`, `botao-oficializar-paf`, `botao-homologar-ordem-inicio`, `botao-emitir-ordem-inicio`, `botao-cancelar-processo`), checklist (`doc-${doc.id}-*`), execução (medição/aditivo/ajuste), aprovação regional e atribuição.

### F — Specs (seriais, ordem 00→10)
00 smoke (login por perfil, escolas do seed) · 01 happy path completo com troca de perfis + assert `etapa_atual` no banco + reload reidratando · 02 regressão bug1 checklist persiste · 03 bug2 FKs uuid · 04 bug3 filtro regional (técnico SRE A não vê SRE B; fail-closed) · 05 bug4 delete real + upsert pontual (só `updated_at` da editada muda) · 06 correção/devolução (motivos + docs recusados + `contador_analises`) · 07 cancelamento (confirm nativo) · 08 medições · 09 aditivos · 10 ajustes (08-10 partem de `criarSolicitacaoEmExecucao()` via SQL).

### G — Scripts npm
`db:start/stop/status/reset`, `test:e2e`, `test:e2e:ui`, `test:e2e:headed`, `test:e2e:relatorio`.

## Ordem de commits
1. baseline schema → 2. seed → 3. env/README/docs → 4. infra Playwright + smoke → 5. data-testid → 6. happy path → 7. regressões 02-05 → 8. alternativos 06-10. Cada um com sua verificação (lint, `db reset`, suíte verde).

## Verificação final
Do zero absoluto: `npx supabase stop && start && npm run db:reset && npm run lint && npm run test:e2e`; suíte 2x seguidas (flakiness); confirmar que `npm run dev` contra o remoto (`.env.local` original) segue funcionando.

## Fora de escopo
CI GitHub (deploy é Vercel), Supabase Storage, RLS por perfil, testes unitários, reconciliação do histórico de migrations remoto, paralelização da suíte, storageState.
