# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server on port 3000, host 0.0.0.0
- `npm run build` — production build
- `npm run preview` — serve the built output
- `npm run lint` — type-check only (`tsc --noEmit`); there is no ESLint and no test runner
- `npm run clean` — `rm -rf dist server.js`

There are no tests in this repo. `npm run lint` (type-check) is the only automated verification available.

## Project Origin & Conventions

This started as a Google AI Studio app (see README). Two consequences worth knowing:

- `vite.config.ts` reads `DISABLE_HMR` — AI Studio sets it to disable HMR/file-watching during agent edits. Leave that block alone.
- `.env.example` documents `GEMINI_API_KEY` and `APP_URL` as injected by AI Studio at runtime. `metadata.json` declares `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` and `@google/genai` is a dependency — **but no code currently calls Gemini** (see "AI" gotcha below).

All domain language and UI text is **Brazilian Portuguese**. Match that when adding strings, identifiers, and comments — the codebase mixes pt-BR domain terms with English code keywords throughout.

## Architecture

A single-page React 19 + Vite + TypeScript + Tailwind v4 app. **There is no backend.** All state lives in the browser and persists to `localStorage` under the key `gesto_solicitacoes`.

The domain is **SGO / "Gesto"** — a workflow system for DORE/MG (Diretoria de Obras da Rede Estadual de Ensino, Minas Gerais) to manage school construction/renovation requests from intake through execution.

### Central data model — `src/types.ts`

`Solicitacao` is the one aggregate entity; everything hangs off it (documents, measurements `Medicao`, amendments `Aditivo`, spreadsheet adjustments `AjustePlanilha`, history). Its `etapaAtual: EtapaProcesso` drives the entire UI. The stage order is:

```
cadastro → analise → correcao → paf → ordem_inicio → execucao
```

(`correcao` is a kickback from `analise` for SRE fixes, not a strictly linear step.)

### Role simulation — `PerfilUsuario`

No authentication. The header dropdown in `App.tsx` switches between 5 hardcoded personas (`tecnico_infra`, `gestor_dore`, `analista_dore`, `gestor_paf`, `fiscal_obra`). Throughout the components, UI affordances and actions are gated by `perfilUsuario === '...'` checks (often combined with `etapaAtual`). Assignment logic is also hardcoded to persona names (e.g. analyst actions check `solicitacao.analistaAtribuido === 'Eng. André Silva'`). When adding role-gated behavior, follow this inline-conditional pattern rather than building any permission abstraction.

### State flow

`App.tsx` owns the `solicitacoes` array and is the single writer to `localStorage`. All mutations flow through `handleUpdateSolicitacao` / `handleNovaSolicitacao` / `handleDeleteSolicitacao`, which call `atualizarEGuardarSolicitacoes` (set state + persist). Child components receive `onUpdate(updated)` and rebuild the full `Solicitacao` object — they never write storage directly.

On load, `App.tsx` runs an inline **migration** that rebuilds each request's `documentos` checklist to the current 5-document structure while preserving uploaded filenames/sizes/statuses. If you change the canonical checklist, update that migration block too.

### Components (`src/components/`)

- `Dashboard.tsx` — the "lista" view: KPI counts by stage, filtering (including the analyst's "minhas atribuições" filter), and the request list.
- `KanbanViews.tsx` — both kanban modes (`status` and `usuario`) via the `mode` prop; cards have quick stage advance/retreat actions.
- `SolicitacaoDetalhes.tsx` — the detail screen and by far the largest file (~4500 lines). It contains every per-stage workflow action (assign analyst, approve/reject docs, generate PAF, ordem de início, medições, aditivos, distrato, paralisação, conclusão). This is where most stage-transition logic lives.
- `NovaSolicitacaoModal.tsx` — new-request creation form.
- `GeradorParecerIA.tsx` — see gotcha below.

`App.tsx` chooses between `Dashboard` and `KanbanViews` via `viewMode` (`lista` | `kanban_status` | `kanban_usuario`), and renders `SolicitacaoDetalhes` when a request is selected.

### `src/initialData.ts`

`SOLICITACOES_INICIAIS` — the rich mock dataset seeded into `localStorage` on first run. Edit here to change demo data.

## Important Gotcha: the "AI" parecer is a mock

`gerarParecerIA` in `GeradorParecerIA.tsx` does **not** call Gemini or any model. It is a hardcoded `switch` on document `id` returning canned `statusRecomendado` + `justificativa` strings. Despite the `@google/genai` dependency, `metadata.json` capability flag, and `GEMINI_API_KEY` env wiring, no live AI integration exists yet. Treat any "AI" feature as a stub until real API calls are added.

## Path alias

`@` → repository root (configured in both `tsconfig.json` and `vite.config.ts`).
