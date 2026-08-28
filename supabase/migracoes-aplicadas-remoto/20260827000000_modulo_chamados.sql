-- Módulo de Chamados: perfil Diretor de Escola + fila do Coordenador Regional
-- (reaproveitado como "coordenador de rede física", por decisão do usuário — sem perfil novo).
-- Independente do fluxo de Solicitacao/PAF por enquanto. Ver [[modulo-chamados]].

-- 1. Perfil novo
insert into public.perfis (codigo, nome_exibicao, descricao) values
  ('diretor_escola', 'Diretor(a) de Escola', 'Direção de unidade escolar — abre chamados de manutenção/infraestrutura da própria escola.');

-- 2. Vínculo diretor ↔ escola (mesmo padrão de usuario_regionais)
create table public.usuario_escolas (
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  escola_id uuid not null references public.escolas(id) on delete cascade,
  primary key (usuario_id, escola_id)
);
alter table public.usuario_escolas enable row level security;
create policy "autenticados podem ler" on public.usuario_escolas for select to authenticated using (true);
create policy "autenticados podem inserir" on public.usuario_escolas for insert to authenticated with check (true);
create policy "autenticados podem deletar" on public.usuario_escolas for delete to authenticated using (true);

-- 3. Enum de status do chamado
create type chamado_status as enum ('aberto', 'em_analise', 'em_atendimento', 'concluido', 'recusado');

-- 4. Tabela chamados — campos 1:1 com o formulário do diretor
create table public.chamados (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity,
  data_solicitacao date not null default current_date,
  sre text not null,
  municipio text not null,
  escola_id uuid references public.escolas(id),
  escola_nome text not null,
  codesc text not null,
  codigo_endereco text,          -- prédio principal/anexo (enderecos_escola.codigo_endereco)
  predio_descricao text,
  responsavel_caixa_escolar_nome text,
  responsavel_caixa_escolar_telefone text,
  solicitante_matricula_masp text,

  descricao_problema text not null,
  local_ocorrencia text[] not null default '{}',
  local_ocorrencia_outro text,

  motivo_tipo text not null,                 -- necessidade_escola|autorizacao_soe|doacao|orgao_controle|emenda
  motivo_orgao_controle text,                -- MPMG|CBMMG|Defesa Civil|TCE|ANVISA|Tribunal de Contas
  motivo_orgao_numero_oficio text,
  motivo_orgao_data date,
  motivo_orgao_prazo_atendimento text,
  motivo_emenda_tipo text,                   -- Parlamentar|Impositiva

  consequencias text[] not null default '{}',
  consequencia_outro text,

  qtd_alunos_afetados integer,
  numero_salas_afetadas integer,
  turnos_afetados text[] not null default '{}',
  funcionamento text,                        -- Normal|Parcial|Suspenso

  risco_imediato boolean,

  emenda_nome_parlamentar text,
  emenda_numero text,
  emenda_valor numeric(15,2),
  emenda_exercicio text,
  emenda_objeto text,

  status chamado_status not null default 'aberto',
  prioridade text,                           -- Crítico|Alto|Médio|Baixo (definida pelo coordenador)
  coordenador_atribuido_id uuid references public.usuarios(id),
  parecer_coordenador text,
  justificativa_recusa text,
  data_triagem timestamptz,
  data_conclusao timestamptz,

  criado_por uuid not null references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.chamados
  for each row execute function public.set_updated_at();

-- 5. Trilha de status (mesmo padrão de solicitacao_historico_etapas)
create table public.chamado_historico (
  id uuid primary key default gen_random_uuid(),
  chamado_id uuid not null references public.chamados(id) on delete cascade,
  status chamado_status not null,
  data timestamptz not null default now(),
  responsavel text not null,
  observacao text
);

-- 6. Anexos da seção "Documentação Anexada" reaproveitam a tabela documentos genérica
alter type documento_categoria add value 'chamado';
alter table public.documentos add column chamado_id uuid references public.chamados(id) on delete cascade;

-- 7. RLS — mesmo padrão "autenticado pode tudo" (using true) do resto do schema; controle de
-- acesso real é client-side por perfil, igual solicitacoes/documentos.
alter table public.chamados enable row level security;
alter table public.chamado_historico enable row level security;
create policy "autenticados podem ler" on public.chamados for select to authenticated using (true);
create policy "autenticados podem inserir" on public.chamados for insert to authenticated with check (true);
create policy "autenticados podem atualizar" on public.chamados for update to authenticated using (true) with check (true);
create policy "autenticados podem ler" on public.chamado_historico for select to authenticated using (true);
create policy "autenticados podem inserir" on public.chamado_historico for insert to authenticated with check (true);
