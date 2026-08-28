-- BUGFIX: a constraint doc_exatamente_um_pai não incluía chamado_id (adicionado na migration
-- modulo_chamados), o que quebraria todo insert de anexo de chamado em runtime (soma ficava 0,
-- não 1). Corrige incluindo chamado_id no OR-exclusivo dos "pais" de documentos.
-- Ver [[modulo-chamados]].
alter table public.documentos drop constraint doc_exatamente_um_pai;
alter table public.documentos add constraint doc_exatamente_um_pai CHECK (
  ((solicitacao_id IS NOT NULL)::integer +
   (aditivo_id IS NOT NULL)::integer +
   (ajuste_id IS NOT NULL)::integer +
   (imovel_id IS NOT NULL)::integer +
   (chamado_id IS NOT NULL)::integer) = 1
);
