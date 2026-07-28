# SGO — Sistema de Gestão de Obras (SEE-MG / DORE)

Front-end React/Vite/TypeScript para gestão de demandas de obras nas escolas
estaduais de Minas Gerais: cadastro → análise técnica (DORE) → autorização
PAF → contratação → execução/fiscalização → encerramento. Backend em Supabase
(Postgres + Auth); deploy via Vercel.

## Como rodar localmente

**Pré-requisitos:** Node.js 20+, Docker (para o Supabase local).

```bash
npm install

# 1. Suba o stack Supabase local (primeira vez baixa as imagens Docker)
npx supabase start

# 2. Copie a API URL e a anon key para o .env.local
npx supabase status
cp .env.example .env.local   # e cole os valores exibidos acima

# 3. Rode o app
npm run dev                  # http://localhost:3000
```

Usuários de teste (senha única: `senha-teste-sgo`) são criados pelo seed —
ex.: `tecnicoregional@educacao.mg.gov.br` (técnico SRE), `analistadore@educacao.mg.gov.br`
(analista DORE), `sofia.viana@educacao.mg.gov.br` (admin). Lista completa em
[supabase/seed.sql](supabase/seed.sql).

Para apontar para o projeto remoto, use no `.env.local` a URL e a anon key do
dashboard do Supabase (Settings → API).

## Scripts

```bash
npm run dev          # dev server (porta 3000)
npm run build        # build de produção
npm run lint         # type-check (tsc --noEmit) — única verificação estática
npm run db:start     # sobe o Supabase local
npm run db:reset     # recria o banco local (migrations + seed)
npm run test:e2e     # suíte e2e Playwright (exige stack local de pé)
npm run test:e2e:ui  # modo interativo
```

## Testes e2e

A suíte Playwright roda contra o Supabase local (banco descartável, resetado
entre testes). Guia completo em [docs/testes-e2e.md](docs/testes-e2e.md).

## Histórico

Protótipo originado no Google AI Studio, em migração progressiva de
localStorage para Supabase. Documentação de arquitetura e modelagem em
[docs/](docs/) e [CLAUDE.md](CLAUDE.md).
