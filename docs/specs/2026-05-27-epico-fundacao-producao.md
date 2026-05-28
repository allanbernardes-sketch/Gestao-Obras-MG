# Épico — SGO: Fundação e Produção

- **Data:** 2026-05-27
- **Sistema:** SGO ("Gesto") — Sistema de Gestão / Acompanhamento de Obras Escolares (DORE/MG)
- **Módulo conectado:** [OrçaGov Minas](../../../OrcaGov.2/README.md) — elaboração de orçamento (módulo de orçamentação do mesmo ecossistema de acompanhamento de obras)
- **Status:** rascunho para validação

---

## 1. Objetivo

Levar o protótipo **SGO** de persistência em `localStorage` a uma **fundação de produção**:

- Dados em **Supabase (Postgres)** — banco, autenticação e storage de arquivos.
- **Autenticação real** com papéis e **isolamento por SRE** via Row-Level Security (RLS).
- Deploy em **Azure Static Web Apps**.
- Estabelecer o **seam de conexão com o OrçaGov**, que na **fase 1** é o engenheiro **anexar o arquivo Excel do orçamento** à solicitação (a "Planilha Orçamentária", `doc_1` do checklist).

Os 6 estágios já prototipados (`cadastro → analise → correcao → paf → ordem_inicio → execucao`) e os 5 papéis permanecem como **referência de domínio** — este épico não muda regras de negócio, troca a fundação técnica embaixo delas. A **IA de parecer continua mock** (épico futuro).

Este épico entrega a base sobre a qual evoluções (IA real, integração estruturada com OrcaGov) serão construídas sem refactor de fundação.

## 2. Personas (papéis do sistema)

Mantidos do protótipo, agora como usuários autenticados reais:

| Papel (`PerfilUsuario`) | Descrição | Visibilidade |
|---|---|---|
| `tecnico_infra` | Técnico de Infraestrutura (SRE) | Só solicitações da própria SRE |
| `gestor_dore` | Gestor de Atendimento (DORE) | Central — todas as SREs |
| `analista_dore` | Analista de Engenharia (DORE) | Central — todas as SREs |
| `gestor_paf` | Gestor Geral (PAF) | Central — todas as SREs |
| `fiscal_obra` | Fiscalização de Campo | Conforme atribuição/SRE |

O seletor de "usuário simulado" do header é **aposentado**.

## 3. Dores que justificam o épico

1. `localStorage` não é multiusuário — cada navegador tem seu próprio estado; impossível operação real entre SRE e DORE.
2. Sem autenticação nem isolamento, qualquer um veria/alteraria tudo.
3. Arquivos (Excel, PDF, DWG, fotos) hoje são só nome/tamanho fake — não há upload nem armazenamento real.
4. Sem fundação compartilhada, conectar SGO e OrcaGov exigiria pontes frágeis (export/import manual).

## 4. Arquitetura alvo

- **Dois SPAs separados** (SGO e OrcaGov) sobre **um único projeto Supabase compartilhado**: mesmo Postgres, mesmo Auth, mesmo Storage.
- **Azure Static Web Apps** hospeda cada SPA; ambos falam direto com o Supabase via SDK JS. Sem servidor próprio para manter.
  - Azure Functions só entra **se** um segredo server-side surgir (ex.: IA real) — **fora desta fase**.
- Vínculo entre os dois mundos por **identificadores comuns**: `CODESC` (código da escola), município e SRE. A solicitação no SGO e o orçamento no OrcaGov referenciam a mesma escola.

```
┌─────────────────┐     ┌─────────────────┐
│  SGO (SPA)      │     │ OrcaGov (SPA)   │
│ Azure Static    │     │ Azure Static    │
│ Web App         │     │ Web App         │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └──────────┬────────────┘
                    ▼
        ┌───────────────────────┐
        │  Supabase (único)     │
        │  Postgres + RLS       │
        │  Auth                 │
        │  Storage (arquivos)   │
        └───────────────────────┘
   vínculo por IDs comuns: CODESC, município, SRE
```

## 5. Modelo de dados (híbrido normalizado)

Tabelas reais para entidades com valor de consulta/relatório e ciclo de vida próprio; metadados livres em colunas/JSONB. Todas as tabelas carregam `sre` (e dono onde aplicável) para suportar RLS.

### 5.1 Tabelas

**`perfis`** — espelha usuários do Supabase Auth
- `user_id` (FK → auth.users), `nome`, `papel` (`tecnico_infra | gestor_dore | analista_dore | gestor_paf | fiscal_obra`), `sre`, `registro_profissional` (CREA/CAU/CFT, quando aplicável)

**`solicitacoes`** — colunas reais para o que filtra/relata
- Identificação: `id`, `codesc`, `nome_escola`, `municipio`, `sre`, `tipo`
- Fluxo: `etapa_atual` (`cadastro | analise | correcao | paf | ordem_inicio | execucao`), `status_obra`, `status_paf`
- Atribuição: `analista_atribuido`, `fiscal_obra_atribuido`, `contador_analises`
- PAF: `valor_homologado`, `numero_paf`, `data_homologacao`, `data_vigencia_paf`
- Formulário/ficha: `valor_planilha`, `iss`, `responsavel`, `ficha_verificada` (+ por/quando), demais campos do formulário em JSONB (`metadados`)
- Parecer: `parecer_consolidado` (texto; gerado por mock hoje)
- Timestamps: `created_at`, `updated_at`

**`documentos`** — checklist por solicitação
- `id`, `solicitacao_id` (FK), `tipo` (`doc_1..doc_5`), `nome`, `obrigatorio`, `desc`
- `status` (`pendente | aprovado | recusado | nao_se_aplica`), `justificativa`
- `storage_path` (arquivo no Supabase Storage), `file_name`, `file_size`, `uploaded_at`
- **`doc_1` (Planilha Orçamentária) é o ponto de anexo do Excel do OrcaGov.**

**`medicoes`** — `id`, `solicitacao_id` (FK), `data`, `valor`, `porcentagem`, `descricao`, `empresa_nome`, `empresa_cnpj`, `storage_path`, fotos (JSONB de paths)

**`aditivos`** — `id`, `solicitacao_id` (FK), `data`, `tipo` (`Valor | Prazo | Valor e Prazo`), `valor_extra`, `prazo_extra_dias`, `justificativa`, `status` (`Pendente | Aprovado | Recusado`), `numero_aditivo`, `analista_atribuido`, `parecer_consolidado`; documentos do aditivo como sub-registros em `documentos` (com referência ao aditivo) ou JSONB

**`ajustes_planilha`** — `id`, `solicitacao_id` (FK), `numero`, `tipo_ajuste`, `valor_ajuste`, `responsavel_planilha`, `registro_profissional`, `valor_contrato`, `diferenca_planilhas`, `desconto`, `avanco_fisico`, `status` (`em_elaboracao | analise_dore | validado`), `analista_atribuido`, `parecer_dore`, `storage_path`

**`empresas_contratadas`** — empresa atual e histórico (distrato)
- `id`, `solicitacao_id` (FK), `nome`, `cnpj`, `status` (`Ativa | Distratada`), `avanco_fisico_original`, `data_ordem_inicio`, `previsao_termino_obra`, `valor_homologado_contratacao`, `duracao_obra_meses`, `classe_obra`, `pontuacao_complexidade`, `fiscal_obra_atribuido`, dados de distrato (`justificativa_distrato`, `data_distrato`, storage do documento de distrato), `cronograma_storage_path`

**`historico_etapas`** — `id`, `solicitacao_id` (FK), `etapa`, `data`, `responsavel`

### 5.2 Storage

- Bucket(s) no **Supabase Storage** para Excel, PDF, DWG e fotos.
- Políticas de acesso espelham o RLS das tabelas (um arquivo só é acessível por quem pode ver a solicitação dona).
- As tabelas guardam `storage_path`; o componente faz upload/download via SDK.

### 5.3 Cálculos derivados

Quantidades/totais derivados (ex.: `quantity = Σ memórias`, totais por categoria) permanecem **calculados na aplicação** a partir dos dados normalizados — não são colunas persistidas de verdade, evitando divergência. (Onde já são persistidos no shape atual, viram derivação na camada de dados.)

## 6. Autenticação e acesso (RLS)

- **Supabase Auth** com login real. Cada usuário tem registro em `perfis` com `papel` e `sre`.
- **RLS no Postgres**:
  - `tecnico_infra`: `SELECT/UPDATE` apenas em solicitações onde `sre = perfil.sre`.
  - Níveis centrais (`gestor_dore`, `analista_dore`, `gestor_paf`): acesso a todas as SREs.
  - `fiscal_obra`: acesso conforme atribuição/SRE.
- **Papel controla ações** além de visibilidade: aprovar/recusar documento, atribuir analista, gerar PAF, registrar medição/aditivo, mudar etapa — espelhando os gates `perfilUsuario === '...'` que hoje vivem inline nos componentes.
- O gating de ação na UI continua existindo, mas a **verdade de autorização passa a ser o RLS + policies** (UI não é a fronteira de segurança).

## 7. Migração e camada de dados

- Introduzir uma **camada de acesso a dados** (`src/lib/supabase` + repositórios por entidade) consumida pelos componentes através dos **mesmos handlers atuais** (`onUpdate` / `handleUpdateSolicitacao` / etc.), minimizando mudança na UI.
- A lógica de **migração de checklist** hoje inline em `src/App.tsx` vira migração SQL/seed no Supabase. `SOLICITACOES_INICIAIS` (`src/initialData.ts`) vira **seed de demonstração opcional**.
- `src/components/SolicitacaoDetalhes.tsx` (~4500 linhas) é refatorado **incrementalmente** conforme a fonte de dados troca — sem reescrita big-bang. Onde o arquivo dificultar a troca, extrair seções por estágio é melhoria justificada.
- O estado global em `App.tsx` deixa de ser "array + localStorage" e passa a refletir o Supabase (carregamento por query, escrita por repositório, realtime opcional fora de escopo).

## 8. Seam OrcaGov (fase 1 → futuro)

- **Fase 1 (este épico):** o orçamento elaborado no OrcaGov entra no SGO como **anexo Excel** no `doc_1` (Planilha Orçamentária). Sem parsing, sem integração viva. O Supabase compartilhado e os IDs comuns (CODESC/SRE) já ficam **prontos** para o futuro.
- **Futuro (fora deste épico):** OrcaGov grava o orçamento estruturado vinculado à solicitação (por CODESC); o SGO passa a ler valores direto do banco em vez do Excel anexado.

## 9. Decomposição em histórias

Ordem reflete dependências.

| # | História | Depende de | Valor entregue |
|---|---|---|---|
| H1 | Provisionar Supabase (projeto único) + schema do §5 + migrations | — | Fundação de dados existe |
| H2 | Supabase Auth + tabela `perfis` + login real (aposenta seletor simulado) | H1 | Usuários reais entram |
| H3 | Políticas RLS por SRE + papéis (§6) | H1, H2 | Isolamento e autorização reais |
| H4 | Camada de acesso a dados + repositórios; trocar `localStorage` por Supabase em leitura/escrita | H1 | App opera sobre o banco |
| H5 | Supabase Storage: upload/download real de documentos (Excel, PDF, DWG, fotos) | H1, H3 | Arquivos reais, incl. anexo do Excel do orçamento (doc_1) |
| H6 | Migração/seed: checklist canônico + dados de demonstração no banco | H1, H4 | Ambiente populado e consistente |
| H7 | Refactor incremental de `SolicitacaoDetalhes` conforme a fonte de dados troca | H4 | Componentes operam sobre o banco sem big-bang |
| H8 | Deploy Azure Static Web Apps (SGO) + CI/CD + variáveis de ambiente Supabase | H4 | App no ar em produção |

## 10. Decisões fixadas

- **Escopo = fundação + produção** do SGO; regras de negócio dos 6 estágios mantidas como estão.
- **Um único projeto Supabase** compartilhado entre SGO e OrcaGov (apps separados).
- **RLS por SRE + papéis**; UI não é a fronteira de segurança.
- **Modelo híbrido normalizado** (tabelas reais para entidades de valor; JSONB para metadados livres).
- **IA de parecer continua mock** — IA real é épico futuro.
- **Azure Static Web Apps**; sem servidor próprio nesta fase.
- **Conexão OrcaGov fase 1 = anexo Excel** no doc_1; integração estruturada é futuro.
- Vínculo por **CODESC/SRE** como chaves comuns entre os dois sistemas.

## 11. Questões em aberto

1. **Org/SRE como dados:** existe uma lista canônica das ~47 SREs (e escolas por CODESC) para popular `perfis.sre` e validar `solicitacoes.sre`? De onde vem?
2. **Provisionamento de usuários:** cadastro self-service com aprovação, ou usuários criados por um admin DORE? Há SSO institucional (ex.: conta gov.br / AD da SEE-MG) a considerar?
3. **Tenant do Supabase:** projeto Supabase hospedado (nuvem Supabase) ou self-hosted na Azure? (Impacta "infra na Azure".)
4. **Migração de dados existentes:** há dados reais já em uso (em planilhas/outro sistema) a importar, ou começamos limpo + seed de demonstração?
5. **Realtime:** atualizações ao vivo entre usuários (ex.: dois analistas na mesma demanda) são desejáveis já, ou refresh manual basta nesta fase?

## 12. Fora de escopo

- IA real (Gemini) para geração de parecer.
- Integração estruturada profunda com OrcaGov (leitura de orçamento do banco) e parsing do Excel.
- Versionamento de orçamento/solicitação.
- App mobile.
- Azure Functions / backend próprio (só se um segredo server-side surgir).
