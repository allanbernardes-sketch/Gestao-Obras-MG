-- Equipes de especialidade do Analista de Engenharia (DORE) + auxiliares de validação.
-- Ver [[equipes-analista-auxiliares]] na memória do projeto.
--
-- Regras de negócio:
--   - Atendimento Inicial (Análise Técnica, Etapa 2) só pode ser atribuído a analistas da equipe
--     "Planejamento".
--   - Ajuste de Planilha / Reequilíbrio Financeiro / Saldo Complementar só podem ser atribuídos a
--     analistas da equipe "Ajuste".
--   - As demais equipes (Elétrica, Arquitetura, PSCIP) podem ser adicionadas como AUXILIARES de um
--     processo (qualquer um dos quatro acima) para dar parecer técnico da própria especialidade —
--     o processo só pode ser homologado/aprovado pelo analista titular depois que todo auxiliar
--     anexado tiver registrado parecer de aprovação.

alter table public.usuarios add column equipe_analise text;
alter table public.usuarios add constraint usuarios_equipe_analise_check
  CHECK ((equipe_analise IS NULL) OR (equipe_analise = ANY (ARRAY['Planejamento'::text, 'Ajuste'::text, 'Eletrica'::text, 'Arquitetura'::text, 'PSCIP'::text])));

create table public.processo_auxiliares (
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null references public.solicitacoes(id),
  -- 'analise' = o próprio atendimento inicial (item_id nulo); os demais apontam para a linha do
  -- item correspondente (não têm FK formal porque item_id pode vir de 3 tabelas diferentes).
  tipo_item text not null check (tipo_item in ('analise', 'ajuste', 'reequilibrio', 'saldo')),
  item_id uuid,
  usuario_id uuid references public.usuarios(id),
  nome text not null,
  equipe text not null check (equipe in ('Eletrica', 'Arquitetura', 'PSCIP')),
  parecer text,
  aprovado boolean,
  data_parecer timestamptz,
  usuario_atribuidor_id uuid references public.usuarios(id),
  created_at timestamptz not null default now()
);

alter table public.processo_auxiliares enable row level security;

create policy "autenticados podem ler" on public.processo_auxiliares
  for select to authenticated using (true);
create policy "autenticados podem inserir" on public.processo_auxiliares
  for insert to authenticated with check (true);
create policy "autenticados podem atualizar" on public.processo_auxiliares
  for update to authenticated using (true) with check (true);
create policy "autenticados podem deletar" on public.processo_auxiliares
  for delete to authenticated using (true);

create index processo_auxiliares_solicitacao_id_idx on public.processo_auxiliares (solicitacao_id);
