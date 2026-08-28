-- Rol de Manutenção Predial Anual Obrigatória — módulo Imóveis, preenchido pelo diretor_escola.
-- Vinculado à escola (escola_id), não ao ImovelPatrimonio local-only do resto do módulo Imóveis
-- (que segue só localStorage). Ver [[modulo-chamados]] pro padrão de vínculo diretor↔escola.

create type rol_manutencao_status as enum ('executado', 'nao_executado');

create table public.rol_manutencao_predial (
  id uuid primary key default gen_random_uuid(),
  escola_id uuid not null references public.escolas(id),
  ano integer not null,
  criado_por uuid references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (escola_id, ano)
);
create trigger set_updated_at before update on public.rol_manutencao_predial
  for each row execute function public.set_updated_at();

create table public.rol_manutencao_itens (
  id uuid primary key default gen_random_uuid(),
  rol_id uuid not null references public.rol_manutencao_predial(id) on delete cascade,
  item_codigo text not null,
  status rol_manutencao_status,
  data_execucao date,
  empresa_profissional text,
  cnpj_cpf text,
  comprovacao_despesa boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rol_id, item_codigo)
);
create trigger set_updated_at before update on public.rol_manutencao_itens
  for each row execute function public.set_updated_at();

-- Anexo comprovante por item (mesma tabela genérica documentos do resto do app)
alter type documento_categoria add value 'rol_manutencao';
alter table public.documentos add column rol_item_id uuid references public.rol_manutencao_itens(id) on delete cascade;

-- Corrige a constraint de "exatamente um pai" incluindo o novo FK (aprendido do bug do chamado_id)
alter table public.documentos drop constraint doc_exatamente_um_pai;
alter table public.documentos add constraint doc_exatamente_um_pai CHECK (
  ((solicitacao_id IS NOT NULL)::integer +
   (aditivo_id IS NOT NULL)::integer +
   (ajuste_id IS NOT NULL)::integer +
   (imovel_id IS NOT NULL)::integer +
   (chamado_id IS NOT NULL)::integer +
   (rol_item_id IS NOT NULL)::integer) = 1
);

alter table public.rol_manutencao_predial enable row level security;
alter table public.rol_manutencao_itens enable row level security;
create policy "autenticados podem ler" on public.rol_manutencao_predial for select to authenticated using (true);
create policy "autenticados podem inserir" on public.rol_manutencao_predial for insert to authenticated with check (true);
create policy "autenticados podem atualizar" on public.rol_manutencao_predial for update to authenticated using (true) with check (true);
create policy "autenticados podem ler" on public.rol_manutencao_itens for select to authenticated using (true);
create policy "autenticados podem inserir" on public.rol_manutencao_itens for insert to authenticated with check (true);
create policy "autenticados podem atualizar" on public.rol_manutencao_itens for update to authenticated using (true) with check (true);
