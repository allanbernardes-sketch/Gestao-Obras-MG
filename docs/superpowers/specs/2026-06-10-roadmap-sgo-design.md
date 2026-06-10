# Roadmap de Entregas — Sistema de Gestão de Obras (SGO)

> Este documento é o **roadmap / decomposição de entregas**, não um plano de implementação de código.
> Cada recorte abaixo terá depois seu próprio ciclo `spec → plano → implementação`.

## Contexto

O SGO ("Gesto") hoje é um **protótipo client-side** gerado no Google AI Studio: todo o estado vive em
`App.tsx`, persiste em `localStorage`, os perfis de usuário são simulados (sem auth) e a "IA" de pareceres
(`src/components/GeradorParecerIA.tsx`) devolve respostas fixas mockadas.
`express`/`@google/genai` estão no `package.json` mas **não são usados** — não há backend.

A reunião com o cliente (Allan, Sofia, Renato) definiu que o trabalho de assumir o projeto deve ser **fatiado
em entregas isoladas**, cada uma "fazendo sentido sozinha" (princípio do Renato), começando pelo fluxo de
Gestão de Obras. Este roadmap converte aquela conversa + o estado atual do código em uma sequência de recortes
com escopo explícito, para guiar os specs seguintes.

**Decisões já tomadas (que moldam o roadmap):**
- O **Recorte #1 já nasce com backend real** (API + banco) e **auth real** de usuários — base de produção, não joga código fora.
- A **geração de PAF é interna por enquanto**; a integração com o sistema externo de PAF (do Cristiano) fica como ponto **a definir** até conhecermos a API deles.

## Princípios de fatiamento

- **Cada recorte é isolado** — entrega valor sozinho, sem depender dos seguintes (Renato).
- **Campos são fixos** — Allan confirmou; **não** haverá motor de formulário dinâmico (a ideia do Heitor foi descartada). Ver Non-Goals.
- **Ordem vem da reunião**, não é invenção nossa.
- **Linha de corte de segunda**: trabalhar sobre a versão consolidada que o cliente sobe no Git; depois disso, edições do cliente no código congelam (passa a ser nosso) — combinar visibilidade via link de homologação.

## Estado atual do código (a base sobre a qual fatiamos)

- **Entidade central** `Solicitacao` (`src/types.ts`) avança por `etapaAtual: EtapaProcesso`:
  `cadastro → analise → (correcao) → paf_autorizacao → paf → ordem_inicio → execucao` (+ `cancelado`).
- **Mutação central** `handleUpdateSolicitacao` em `src/App.tsx` já faz o diff old/new e emite
  notificações + logs de auditoria (transições, aditivos, ajustes). É o ponto por onde toda edição passa.
- **Navegação dual**: `activeModule` × `activeSubTask`. Módulo real = `gestao_obras`; placeholders =
  `orcamento`, `imoveis`, `abertura_chamados`; mais `seguranca` e `central_logs`.
- **Persistência**: `localStorage` (`gesto_solicitacoes`, `sgo_notifications`, `sgo_logs`).
- **Perfis**: 6 (`tecnico_infra`, `gestor_dore`, `analista_dore`, `gestor_paf`, `fiscal_obra`, `administrativo_dore`),
  hardcoded para nomes. O **bug Roberto→João** (renomear perfil quebra permissões) expõe a fragilidade do auth simulado.

---

## Recortes (entregas isoladas, em ordem)

### ⭐ Recorte 1 — Fundação + Fluxo Atendimento→PAF + Segurança/Usuários  *(primeiro corte)*

O coração do primeiro corte. Bundle de **fundação técnica** + **o fluxo até a geração do PAF** (antes da execução).

**Fundação (nova, por baixo):**
- Backend real (API + banco) — stack a decidir no spec do #1.
- **Auth real** + modelo de perfis/permissões que substitui o switcher simulado e **resolve o bug Roberto→João**.
- Migração do formato atual (`localStorage` / `types.ts`) para o contrato da API, preservando os tipos como base.

**Fluxo do processo (já existe no protótipo, vira de verdade):**
- **Atendimento inicial** (Regional/SRE cadastra a demanda + checklist documental).
- **Análise técnica (DORE)**: validações, anexo de pareceres; se reprova, **devolve à Regional com os pareceres** para correção (`correcao`); se aprova, segue.
- **Autorização do PAF** (gestor) → **Geração do PAF interno** (número, vigência, valor, pago/não pago).
- **Segurança — só cadastro de usuários** neste momento (empresas fica para o Recorte 2).
- Auditoria/notificações das transições (reaproveitar a lógica de `handleUpdateSolicitacao`).

**Pronto quando:** uma demanda percorre Atendimento → Análise → Autorização → PAF gerado, com dados persistidos em backend, usuários reais autenticados e permissões por perfil funcionando.

### Recorte 2 — Execução da Obra

O momento em que "o atendimento vira obra". Depende do #1 (precisa de PAF gerado).
- **Cadastro da obra**: calculadora de complexidade, atribuição do **fiscal** (nova atribuição de perfil).
- **Contrato**: dados da empresa contratada, garantias, vigências → aqui entra o **cadastro de empresas** no Segurança.
- **Acompanhamento**: diário de obra, vistorias, restrições.
- **Medições** físico-financeiras (fiscal atesta avanço, ex.: "20% executado").
- **Aditivos** (valor/prazo — fiscal solicita, DORE aprova) e **Ajustes de planilha**.
- **Encerramento**: termo de conclusão, laudos finais.
- Artefatos atuais: `src/components/ExecucaoSubmodulos.tsx` (~5.6k linhas).

### Recorte 3 — Orçamento (SSC) + Prestação de Contas

Entra junto/depois de Obras (Allan). Integra o financeiro ao físico.
- Vincular **contrato orçamentário** à obra.
- **Prestação de contas**: hoje vive no sistema do caixa escolar (só financeiro). Modelo do duplo aval —
  Regional avalia documentação da empresa + engenharia avalia avanço físico → libera pagamento.
- Definir fronteira/integração com o caixa escolar (sistema externo).

### Recorte 4 — Patrimônio & Imóveis

Importante, mas depois (Allan ainda vai alinhar com a diretoria).
- Cadastro de próprios estaduais, vistorias/inspeções, regularização documental.
- Meta de futuro: puxar dado do imóvel direto (próprio/alugado, ISS do município) e **validar documentação uma única vez**, evitando revalidação a cada obra.

### Recorte 5 — Abertura de Chamados

Menos prioritário (por último).
- Suporte/tickets: abrir incidente, "Meus Chamados", métricas de SLA.

### Transversal — Integração com o sistema PAF externo (Cristiano)  *(a definir)*

- Ponto de integração marcado como **TBD**. Provável: expor/consumir uma **API**, possivelmente compartilhando repo/stack com a equipe do Cristiano.
- Até lá, a geração de PAF do Recorte #1 é **interna**. Reavaliar quando a API do PAF for conhecida.

---

## Mapa recorte → artefatos atuais do código

| Recorte | Onde mexe hoje |
|---|---|
| #1 Fundação+Atendimento→PAF | `src/App.tsx`, `src/types.ts`, `src/components/ProcessAnalysisPanel.tsx`, `src/components/GestaoObrasViews.tsx` (NovoAtendimento/Atribuição), `src/components/AcompanhamentoPaf.tsx`, Segurança (cadastro usuários em App.tsx), `src/components/GeradorParecerIA.tsx` (pareceres) |
| #2 Execução | `src/components/ExecucaoSubmodulos.tsx`, `src/components/SolicitacaoDetalhes.tsx`, cadastro de empresas (Segurança) |
| #3 Orçamento/Prestação | módulo `orcamento` (hoje placeholder) |
| #4 Imóveis | módulo `imoveis` (hoje placeholder) |
| #5 Chamados | módulo `abertura_chamados` (hoje placeholder) |

## Non-Goals (explícito)

- **Motor de formulário dinâmico / campos customizáveis** — campos são fixos (Renato perguntou, Allan confirmou).
- **Integração real com o PAF externo no Recorte #1** — adiada (geração interna por ora).
- IA real (Gemini) para pareceres — fora de escopo até decisão posterior; segue mock.

## Riscos / dependências

- **API do PAF externo** desconhecida → integração real bloqueada até alinhamento com a equipe do Cristiano.
- **Linha de corte de segunda** + edições paralelas do cliente → trabalhar sobre a versão consolidada e congelar depois.
- **Stack de backend** ainda não escolhida → decisão do spec do Recorte #1.
- **Prestação de contas** depende do sistema do caixa escolar (externo) → fronteira a definir no Recorte #3.
- Recorte #1 ficou "gordo" (fundação + fluxo). No spec do #1 pode-se faseá-lo internamente (1a fundação / 1b fluxo) sem mudar a entrega.

## Verificação / próximos passos

Como este artefato é um roadmap (não código), a "verificação" é de alinhamento:
1. **Validar com Allan/Sofia/Renato** a ordem dos recortes e, principalmente, o escopo do **Recorte #1** (fundação + fluxo até PAF + usuários).
2. Confirmada a versão consolidada do cliente no Git (linha de corte de segunda), abrir o **spec detalhado do Recorte #1** (ciclo brainstorming → writing-plans), incluindo a decisão da stack de backend.
3. Os próximos recortes seguem o mesmo ciclo, um spec por recorte.
