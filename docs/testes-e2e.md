# Testes e2e — guia

A suíte usa **Playwright** (Chromium) contra o **Supabase local** (Docker).
Nenhum teste toca o projeto remoto: o `playwright.config.ts` injeta a URL e a
anon key locais no servidor Vite, com precedência sobre o `.env.local`.

## Rodando

```bash
npx supabase start        # stack local (uma vez por sessão de trabalho)
npm run db:reset          # recria schema + seed (usuários e escolas de teste)
npm run test:e2e          # suíte completa (serial, workers=1)
npm run test:e2e:ui       # modo interativo para depurar
npm run test:e2e:headed   # com navegador visível
```

## Arquitetura da suíte

```
e2e/
  apoio/
    ambiente.ts    # resolve URL/anon key do stack local (npx supabase status)
    banco.ts       # pool pg (porta 54322): truncate entre testes + asserções SQL
    fixtures.ts    # test estendido: dialogs aceitos e registrados, banco e
                   # localStorage limpos a cada teste
    sessao.ts      # entrarComo(page, 'tecnico_infra') — login via UI
    navegacao.ts   # helpers de sidebar (sem URLs: navegação é por estado)
  testes/
    00-ambiente.spec.ts … 10-ajustes.spec.ts
```

Decisões importantes:

- **`workers: 1` (serial)** — o banco é compartilhado e cada teste trunca as
  tabelas transacionais; paralelizar exigiria dados namespaced (fora de escopo).
- **Login via UI, sem storageState** — o app não tem URLs (estado não é
  restaurável por deep-link) e o storageState capturaria o `localStorage`
  (`gesto_solicitacoes`) que os testes precisam limpar para não mascarar
  falhas de persistência com o fallback local.
- **Dialogs nativos** — o app usa `alert()`/`confirm()` extensivamente; a
  fixture instala um handler global que aceita e registra as mensagens
  (Playwright, por padrão, cancela confirms — o que travaria os fluxos).
- **Asserções no banco** — além da UI, os specs conferem o Postgres local
  direto (`e2e/apoio/banco.ts`), porque o fallback de localStorage pode
  deixar a UI "verde" com o banco vazio.

## Usuários de teste (senha: `senha-teste-sgo`)

| E-mail | Perfil | SRE |
|---|---|---|
| tecnicoregional@educacao.mg.gov.br | tecnico_infra | Metropolitana B |
| tecnico.sre-a@educacao.mg.gov.br | tecnico_infra | Metropolitana A |
| coordenador@educacao.mg.gov.br | coordenador_regional | Metropolitana B |
| gestordore@educacao.mg.gov.br | gestor_dore | — |
| analistadore@educacao.mg.gov.br | analista_dore | — |
| gestorpaf@educacao.mg.gov.br | gestor_paf | — |
| administrativo@educacao.mg.gov.br | administrativo_dore | — |
| diretor@educacao.mg.gov.br | diretor_dore | — |
| fiscal@educacao.mg.gov.br | fiscal_obra | — |
| sofia.viana@educacao.mg.gov.br | admin | — |

## Migrations e seed

- `supabase/migrations/20260601000000_baseline_esquema_remoto.sql` — baseline
  gerada por `npx supabase db dump` do projeto remoto (o histórico de
  migrations remoto diverge dos arquivos antigos; ver
  `supabase/migracoes-aplicadas-remoto/`).
- `supabase/seed.sql` — dados de referência (perfis, SREs, tipos de obra,
  amostra de escolas) + usuários de teste em `auth.users`/`public.usuarios`.
  Zero solicitações: cada spec cria as suas.

## Fora de escopo (decisões registradas)

CI no GitHub (o CI/CD do projeto é a Vercel), Supabase Storage (uploads
seguem simulados — só metadados persistem), RLS por perfil/SRE (policies
permissivas mantidas), testes unitários, paralelização da suíte.
