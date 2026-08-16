-- Gate de aprovação do coordenador regional para Ajustes de Planilha, Reequilíbrios Financeiros
-- e Saldos Complementares abertos pelo fiscal da obra durante a Execução. Antes desta migration,
-- esses três tipos de solicitação iam direto para o status "pendente" (fila de Atribuição da DORE).
-- Agora eles nascem em 'aguardando_coordenador' e só viram 'pendente' depois que o coordenador
-- regional aprova (ou 'recusado' se ele reprovar).
--
-- Ver [[gate-coordenador-execucao]] na memória do projeto.

alter table public.ajustes_planilha
  add column coordenador_aprovador text,
  add column data_aprovacao_coordenador date,
  add column justificativa_reprovacao_coordenador text;

alter table public.reequilibrios_financeiros
  add column coordenador_aprovador text,
  add column data_aprovacao_coordenador date,
  add column justificativa_reprovacao_coordenador text;

alter table public.saldos_complementares
  add column coordenador_aprovador text,
  add column data_aprovacao_coordenador date,
  add column justificativa_reprovacao_coordenador text;

alter table public.ajustes_planilha drop constraint ajustes_planilha_status_check;
alter table public.ajustes_planilha add constraint ajustes_planilha_status_check
  CHECK ((status = ANY (ARRAY['aguardando_coordenador'::text, 'pendente'::text, 'aprovado'::text, 'recusado'::text])));

alter table public.reequilibrios_financeiros drop constraint reequilibrios_financeiros_status_check;
alter table public.reequilibrios_financeiros add constraint reequilibrios_financeiros_status_check
  CHECK ((status = ANY (ARRAY['aguardando_coordenador'::text, 'pendente'::text, 'aprovado'::text, 'recusado'::text])));

alter table public.saldos_complementares drop constraint saldos_complementares_status_check;
alter table public.saldos_complementares add constraint saldos_complementares_status_check
  CHECK ((status = ANY (ARRAY['aguardando_coordenador'::text, 'pendente'::text, 'aprovado'::text, 'recusado'::text])));
