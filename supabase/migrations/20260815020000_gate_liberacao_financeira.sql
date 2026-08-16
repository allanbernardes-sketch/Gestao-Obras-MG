-- Segundo gate financeiro: depois que o analista DORE homologa tecnicamente um Reequilíbrio
-- Financeiro ou um Saldo Complementar, a solicitação passa a 'aguardando_liberacao_financeira' e só
-- fica 'aprovado' (recurso efetivamente liberado) depois que o Subsecretário de Administração
-- (perfil gestor_paf — Silas Fagundes) autoriza na tela de Liberação Financeira.
--
-- Reequilíbrio Financeiro também ganha aqui o campo de parecer técnico do analista DORE
-- (parecer_dore), que faltava — até então não existia nenhuma tela de decisão final para ele.
--
-- Ver [[gate-liberacao-financeira]] na memória do projeto.

alter table public.reequilibrios_financeiros
  add column parecer_dore text,
  add column liberado_por text,
  add column data_liberacao_financeira date,
  add column justificativa_reprovacao_financeira text;

alter table public.saldos_complementares
  add column liberado_por text,
  add column data_liberacao_financeira date,
  add column justificativa_reprovacao_financeira text;

alter table public.reequilibrios_financeiros drop constraint reequilibrios_financeiros_status_check;
alter table public.reequilibrios_financeiros add constraint reequilibrios_financeiros_status_check
  CHECK ((status = ANY (ARRAY['aguardando_coordenador'::text, 'pendente'::text, 'aguardando_liberacao_financeira'::text, 'aprovado'::text, 'recusado'::text])));

alter table public.saldos_complementares drop constraint saldos_complementares_status_check;
alter table public.saldos_complementares add constraint saldos_complementares_status_check
  CHECK ((status = ANY (ARRAY['aguardando_coordenador'::text, 'pendente'::text, 'aguardando_liberacao_financeira'::text, 'aprovado'::text, 'recusado'::text])));
