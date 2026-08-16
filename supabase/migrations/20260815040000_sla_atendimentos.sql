-- SLA (checkpoints de tempo) nas filas de Atribuição: Análise Técnica (Etapa 2), Ajuste de
-- Planilha, Reequilíbrio Financeiro e Saldo Complementar. Três checkpoints em cadeia, cada um com
-- prazo próprio (ver src/utils/sla.ts):
--   1. Entrada na fila (liberado pelo coordenador)  → Atribuição do analista
--   2. Atribuição                                    → Analista clica em "Iniciar Análise"
--   3. Início da análise                             → Conclusão (parecer/decisão)
--
-- Timestamps completos (timestamptz), diferente do resto do sistema que só grava data — SLA em
-- horas exige precisão de hora/minuto. Ver [[sla-atendimentos]] na memória do projeto.

alter table public.solicitacoes
  add column analise_data_entrada_fila timestamptz,
  add column analise_data_atribuicao timestamptz,
  add column analise_data_inicio timestamptz,
  add column analise_data_conclusao timestamptz;

alter table public.ajustes_planilha
  add column data_entrada_fila timestamptz,
  add column data_atribuicao timestamptz,
  add column data_inicio_analise timestamptz,
  add column data_conclusao timestamptz;

alter table public.reequilibrios_financeiros
  add column data_entrada_fila timestamptz,
  add column data_atribuicao timestamptz,
  add column data_inicio_analise timestamptz,
  add column data_conclusao timestamptz;

alter table public.saldos_complementares
  add column data_entrada_fila timestamptz,
  add column data_atribuicao timestamptz,
  add column data_inicio_analise timestamptz,
  add column data_conclusao timestamptz;
