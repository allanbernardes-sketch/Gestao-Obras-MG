# Plano — Estancar perdas de dados (SGO / Gestao-Obras-MG)

## Contexto

O SGO está no meio de uma migração localStorage → Supabase. Auth, escolas, solicitações (campos escalares) e as entidades da fase de execução (medições, aditivos, ajustes, diários, restrições, vistorias) já têm CRUD real no banco. Mas a sincronização parcial criou **4 bugs críticos que corroem dados a cada dia de uso real**. O usuário decidiu (brainstorm 2026-07-28): objetivo é **evoluir para produto real**, e a primeira entrega é estancar essas perdas — com persistência real (não stopgap), usando as tabelas `documentos` e `solicitacao_historico_etapas` que já existem no banco sem uso.

### Os 4 bugs

1. **Checklist e histórico zerados** — [src/App.tsx:558-561](src/App.tsx#L558-L561): ao carregar do Supabase, `documentos: []` e `historicoEtapas: []`; o upsert não os grava; o primeiro save sobrescreve o localStorage com arrays vazios. Perda irreversível do checklist documental (central no domínio).
2. **FKs de pessoas zerados** — [src/App.tsx:1243-1244](src/App.tsx#L1243-L1244): todo upsert grava `analista_atribuido_id: null` e `fiscal_obra_atribuido_id: null` fixos.
3. **Filtro regional quebrado (segurança)** — [src/App.tsx:518-536](src/App.tsx#L518-L536): identifica o "usuário logado" como o primeiro usuário com o perfil (ignora o auth uid) e `carregarUsuarios` não traz `regionais` do banco → técnico de SRE vê o estado inteiro.
4. **Upsert O(N)** — [src/App.tsx:1168](src/App.tsx#L1168): editar 1 solicitação regrava todas, sem await/erro visível; UI confirma sucesso antes do banco.

### Fora de escopo (próximas frentes)

Supabase Storage (uploads seguem simulados — só metadados), `parcelasPAF`, `reequilibrios`, `saldosComplementares`, `empresasAnteriores`, notificações/logs no banco, módulo Segurança, RLS por perfil/SRE, infra e2e (Playwright + supabase local + seed), limpeza de mocks/deps mortas.

## Fatos verificados no banco remoto (read-only, via MCP)

- `documentos` (0 linhas): colunas `solicitacao_id FK CASCADE`, `categoria` (enum inclui `checklist_obrigatorio`/`checklist_outros`), `nome_logico`, `obrigatorio`, `status` (enum `pendente|aprovado|recusado|nao_se_aplica` — idêntico ao union local), `justificativa`, `file_name/file_type/file_size_bytes`, `uploaded_by/uploaded_at`, `storage_*` (ficam null nesta etapa).
- `solicitacao_historico_etapas` (0 linhas): `solicitacao_id FK CASCADE`, `etapa_anterior/etapa_nova` (enum `etapa_processo` = 1:1 com `EtapaProcesso` local), `usuario_id`, `responsavel`, `observacao`, `created_at`.
- `usuario_regionais` está **vazia** (parte do bug 3); `regionais_sre.nome` tem grafia acentuada (`SRE Araçuaí`) vs. `solicitacoes.sre` em caixa alta sem acento (`SRE ARACUAI`) → comparação precisa normalizar acento+caixa.
- FKs nomeadas `solicitacoes_analista_atribuido_id_fkey` / `solicitacoes_fiscal_obra_atribuido_id_fkey` (necessárias para embed PostgREST).
- ON DELETE: `documentos`/`historico_etapas`/etc. = CASCADE; filhas de execução (`medicoes`, `aditivos`, …) = NO ACTION → delete de solicitação exige deletar filhas de execução antes.
- Há 43 linhas em `solicitacoes` — o ramo Supabase é o caminho ativo; o bug 1 está vivo.

## Implementação (ordem: A→D, `npm run lint` após cada etapa)

### Etapa A — Bug 4: fim do upsert O(N) + delete real
1. Nova `persistirSolicitacao(sol): Promise<dbId>` em App.tsx: **um** upsert (`onConflict: 'codigo_sgo'`) com `.select('id').single()` (captura `_dbId` no insert — elimina lookups de fallback), depois chama os syncs da Etapa C; `throw` em erro.
2. `atualizarEGuardarSolicitacoes(novas, alteradas)` — nova assinatura; persiste só as `alteradas` (versões recalculadas), com await; no catch: `alert()` pt-BR de falha visível + console.error. Grava `_dbId` retornado no estado via update funcional (sem re-persist).
3. Pontos de chamada mapeados (todos): `handleInjetarDemandaTeste` (~1381), `handleUpdateSolicitacao` (~1391), `handleDeleteSolicitacao` (~1555), `handleNovaSolicitacao` (~1604).
4. `handleDeleteSolicitacao` → delete real: filhas NO ACTION primeiro, depois `solicitacoes` (CASCADE cobre docs/histórico); erro → alert e não remove do estado.

### Etapa B — Bug 2: FKs de pessoas
- Modelo local continua nome-string; resolução nos dois sentidos:
  - Escrita: `resolverUsuarioIdPorNome(usuariosSeguranca, nome)` (novo módulo `src/lib/persistencia.ts`) — só aceita uuid real (rejeita ids locais `USR-01`), match por nome exato, senão `null` + warn. Substitui os `null` fixos de App.tsx:1243-1244.
  - Leitura: embed no select — `analista:usuarios!solicitacoes_analista_atribuido_id_fkey(nome)` (idem fiscal) → mapeia de volta para os campos string (hoje nem são lidos).

### Etapa C — Bug 1: persistir checklist + outros docs + histórico
1. **Novo módulo `src/lib/persistencia.ts`**: syncs, resolução nome→uuid, helpers `tamanhoEmBytes`/`formatarTamanhoArquivo` (round-trip do display '1.2 MB' ↔ int8).
2. **Estratégia replace-set idempotente (insert-first)**: a cada persist, insere as linhas novas de `documentos` (categorias checklist) e deleta as antigas que não estão entre as inseridas. Insert→delete: falha nunca deixa o banco vazio; rodar 2x converge; sem precisar de unique constraint nem migração de schema. Idem `historico_etapas`, com `created_at` determinístico (`data + 12:00 + index segundos`) para preservar ordem.
3. **Refactor `montarChecklistCanonico()` em types.ts**: extrai a migração inline do ramo localStorage (App.tsx:975-1078, aliases legados `doc_3→doc_3_pdf` etc.) para função única usada pelos dois ramos + `syncChecklistDocs` para docs condicionais. Remove ~100 linhas duplicadas.
4. **Leitura**: fetch de `documentos` e `historico_etapas` no padrão dos já existentes; sobrepõe status/arquivo por `nome_logico`; **hidrata do localStorage quando o banco não tem linhas** (recuperação dos dados que o bug descartava) — persistência lazy no próximo save (sem gravar durante o load, evita corrida). `fileContent` base64 continua só local (download real só no navegador dono, até a frente Storage). Remove `documentos: []`/`historicoEtapas: []` do mapeamento.

### Etapa D — Bug 3: filtro regional por usuário autenticado
1. Migração nova `supabase/migrations/20260728000000_seed_usuario_regionais.sql`: vincula usuários de teste (`tecnicoregional@…`, `coordenador@…`) à `SRE Metropolitana B` (insere 0 linhas se e-mails não existem — inofensiva).
2. `LoginScreen.tsx`: `onLogin(perfil, nome, id)` passa `data.user.id`; App guarda `idUsuarioLogado` (setado também no `restaurarUsuario`, limpo no logout).
3. `carregarUsuarios`: select com `usuario_regionais(regionais_sre(nome))` → popula `regionais` reais.
4. Filtro: busca por `u.id === idUsuarioLogado` (não mais primeiro-do-perfil); **fail-closed** — perfil restrito sem regionais vê `[]` (hoje vê tudo); `nomeTecnicoLogado`/`nomeCoordenadorLogado` usam `nomeUsuario` direto; helper `normalizarSre()` (lower + strip acentos) nos dois lados da comparação.

## Verificação

Após cada etapa: `npm run lint`. Ao final, roteiro manual com 2 navegadores (A: admin; B: anônimo com `tecnicoregional@…`):

- **Bug 1**: anexar docs + avançar etapa no A → conferir linhas em `documentos`/`historico_etapas` → F5 no A e abrir no B (localStorage limpo): checklist e histórico íntegros vindos do banco. Trocar `origemDemanda` → doc condicional aparece/some sem duplicar; salvar 3x → contagem de linhas estável (idempotência). Recusa com justificativa persiste.
- **Bug 2**: atribuir analista/fiscal → SQL mostra uuids (não null); F5 mantém nomes.
- **Bug 3**: B vê só as ~6 solicitações da SRE Metropolitana B; A vê tudo; removendo o vínculo, B vê **zero** (fail-closed).
- **Bug 4**: Network panel → editar 1 solicitação = 1 upsert (não 43); offline → alerta de falha visível; excluir → não ressuscita após F5; criar nova e registrar diário sem F5 (usa `_dbId` capturado).

## Riscos assumidos

- Replace-set: ids das linhas mudam a cada save — nada as referencia por FK hoje (verificado); feature futura que guarde `documentos.id` precisará de unique index + upsert.
- Solicitações antigas em navegador novo: checklist zerado até um save no navegador que tem o localStorage bom (dado nunca esteve no banco).
- Last-write-wins entre dois editores simultâneos (igual ao comportamento atual dos escalares).
- Usuários locais do módulo Segurança (`USR-01`) não resolvem para FK — atribuição a eles fica só local (conhecido).
- `historicoCorrecoes` já tem escrita própria (SolicitacaoDetalhes.tsx:671) — não duplicar no sync.

## Arquivos críticos

- [src/App.tsx](src/App.tsx) — load (~544-1116), persist (1154-1257), filtro (515-541), handlers (1380-1605)
- [src/types.ts](src/types.ts) — `montarChecklistCanonico` novo, ao lado de `syncChecklistDocs`
- `src/lib/persistencia.ts` — **novo**
- [src/components/LoginScreen.tsx](src/components/LoginScreen.tsx) — `onLogin` ganha auth uid
- `supabase/migrations/20260728000000_seed_usuario_regionais.sql` — **novo**
