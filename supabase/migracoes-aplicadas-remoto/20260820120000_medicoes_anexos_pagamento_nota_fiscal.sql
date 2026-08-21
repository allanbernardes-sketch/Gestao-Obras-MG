-- Permite anexar Comprovante de Pagamento e Nota Fiscal a uma medição específica,
-- reaproveitando a tabela genérica de documentos (mesmo padrão de checklist/GED).

alter table public.documentos
  add column if not exists medicao_id uuid references public.medicoes(id) on delete cascade;

create index if not exists idx_documentos_medicao_id
  on public.documentos (medicao_id)
  where medicao_id is not null;

-- Um documento por (medição, categoria) — permite upsert por id vindo do front-end.
create unique index if not exists uq_documentos_medicao_categoria
  on public.documentos (medicao_id, categoria)
  where medicao_id is not null;

alter type public.documento_categoria add value if not exists 'medicao_comprovante_pagamento';
alter type public.documento_categoria add value if not exists 'medicao_nota_fiscal';
