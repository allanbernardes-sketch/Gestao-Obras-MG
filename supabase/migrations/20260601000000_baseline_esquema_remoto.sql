-- Baseline do schema do projeto remoto (oabqskuomgiuglailaia), gerada por
-- introspecção do catálogo em 2026-07-30 (o histórico de migrations remoto
-- diverge dos arquivos antigos — ver supabase/migracoes-aplicadas-remoto/).
-- Timestamp artificial 20260601000000 para ordenar antes de qualquer migração futura.

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------
create type classe_iee as enum ('I', 'II', 'III', 'IV');
create type documento_categoria as enum ('checklist_obrigatorio', 'checklist_outros', 'aditivo', 'ajuste', 'ordem_inicio', 'distrato', 'conclusao', 'patrimonio', 'medicao_foto', 'vistoria_foto');
create type documento_status as enum ('pendente', 'aprovado', 'recusado', 'nao_se_aplica');
create type etapa_processo as enum ('cadastro', 'analise', 'correcao', 'paf_autorizacao', 'paf', 'ordem_inicio', 'execucao', 'cancelado');
create type perfil_usuario as enum ('tecnico_infra', 'gestor_dore', 'analista_dore', 'gestor_paf', 'fiscal_obra', 'administrativo_dore', 'admin', 'coordenador_regional', 'diretor_dore');
create type status_obra_computado as enum ('nao_iniciada', 'em_andamento', 'paralisada', 'concluida', 'distratada');
create type status_validacao as enum ('pendente', 'validado', 'nao_validado', 'editado');

-- ---------------------------------------------------------------------------
-- 2. Funções
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

-- ---------------------------------------------------------------------------
-- 3. Tabelas
-- ---------------------------------------------------------------------------
create table public.aditivos (id uuid not null default gen_random_uuid(), solicitacao_id uuid not null, numero_aditivo integer not null, tipo text, valor_adicional numeric, prazo_adicional_dias integer, motivo text, status text not null default 'pendente'::text, analista_id uuid, usuario_id uuid, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), supressao numeric, reprogramacao text, saldo_complementar text, valor_aditivo numeric, percentual_contrato numeric, parecer_consolidado text, data_aditivo date, analista_nome text);

create table public.ajustes_planilha (id uuid not null default gen_random_uuid(), solicitacao_id uuid not null, numero_ajuste integer not null, descricao text, valor_ajuste numeric, status text not null default 'pendente'::text, analista_id uuid, usuario_id uuid, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), tipo_ajuste text, responsavel_planilha text, registro_profissional text, ajuste_referente text, valor_contrato numeric, diferenca_planilhas numeric, desconto numeric, avanco_fisico numeric, supressao numeric, reprogramacao text, saldo_complementar text, percentual_contrato numeric, parecer_dore text, data_ajuste date, analista_nome text, observacoes text);

create table public.diarios_obra (id uuid not null default gen_random_uuid(), solicitacao_id uuid not null, data_registro date not null, conteudo text not null, clima text, percentual_execucao numeric, usuario_id uuid, created_at timestamp with time zone not null default now(), categoria text, anexo_foto text, autor text);

create table public.documentos (id uuid not null default gen_random_uuid(), solicitacao_id uuid, aditivo_id uuid, ajuste_id uuid, imovel_id uuid, categoria documento_categoria not null, nome_logico text not null, obrigatorio boolean not null default false, status documento_status not null default 'pendente'::documento_status, justificativa text, storage_provider text, storage_path text, file_name text, file_type text, file_size_bytes bigint, checksum_sha256 text, uploaded_by uuid, uploaded_at timestamp with time zone, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now());

create table public.enderecos_escola (id uuid not null default gen_random_uuid(), codigo_endereco text not null, escola_id uuid, codesc text not null, descricao text not null, ativo boolean not null default true, created_at timestamp with time zone not null default now());

create table public.escolas (id uuid not null default gen_random_uuid(), codesc text not null, nome text not null, municipio text not null, sre text not null, ativo boolean not null default true, created_at timestamp with time zone not null default now());

create table public.historico_correcao_docs_recusados (id uuid not null default gen_random_uuid(), correcao_id uuid not null, nome_doc text not null);

create table public.historico_correcao_motivos (id uuid not null default gen_random_uuid(), correcao_id uuid not null, motivo text not null);

create table public.medicoes (id uuid not null default gen_random_uuid(), solicitacao_id uuid not null, numero_medicao integer not null, valor numeric not null, data_medicao date, status text not null default 'pendente'::text, observacao text, usuario_id uuid, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), descricao text, empresa_nome text, empresa_cnpj text, periodo_medicao text, responsavel_medicao text, porcentagem numeric, porcentagem_fisica numeric, numero_medicao_display text);

create table public.municipios (id uuid not null default gen_random_uuid(), nome text not null, codigo_ibge text);

create table public.notificacoes (id uuid not null default gen_random_uuid(), solicitacao_id uuid, usuario_id uuid, titulo text not null, mensagem text not null, lida boolean not null default false, created_at timestamp with time zone not null default now());

create table public.parcelas_paf (id uuid not null default gen_random_uuid(), solicitacao_id uuid not null, valor numeric(15,2) not null, data_pagamento date, created_at timestamp with time zone not null default now());

create table public.perfil_permissoes (perfil_id uuid not null, permissao_id uuid not null);

create table public.perfis (id uuid not null default gen_random_uuid(), codigo text not null, nome_exibicao text not null, descricao text);

create table public.permissoes (id uuid not null default gen_random_uuid(), codigo text not null, descricao text not null);

create table public.reequilibrios_financeiros (id uuid not null default gen_random_uuid(), solicitacao_id uuid not null, valor_reequilibrio numeric not null, motivo text, status text not null default 'pendente'::text, analista_id uuid, usuario_id uuid, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), data_referencia_see date, desconto_contratual numeric, valor_original numeric, analista_nome text);

create table public.regionais_sre (id uuid not null default gen_random_uuid(), codigo text not null, nome text not null);

create table public.restricoes_obra (id uuid not null default gen_random_uuid(), solicitacao_id uuid not null, descricao text not null, tipo text, status text not null default 'ativa'::text, data_abertura date, data_resolucao date, usuario_id uuid, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), impacto text, previsao_resolucao date, parecer_resolucao text);

create table public.saldos_complementares (id uuid not null default gen_random_uuid(), solicitacao_id uuid not null, valor_saldo numeric not null, descricao text, status text not null default 'pendente'::text, usuario_id uuid, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), valor_tc numeric, valor_liberado numeric, valor_pago numeric, saldo_em_conta numeric, necessidade_aditivo numeric, analista_nome text, documentos_checklist jsonb default '[]'::jsonb);

create table public.sistema_logs (id uuid not null default gen_random_uuid(), solicitacao_id uuid, usuario_id uuid, acao text not null, detalhes jsonb, created_at timestamp with time zone not null default now());

create table public.solicitacao_historico_correcoes (id uuid not null default gen_random_uuid(), solicitacao_id uuid not null, usuario_id uuid, created_at timestamp with time zone not null default now());

create table public.solicitacao_historico_etapas (id uuid not null default gen_random_uuid(), solicitacao_id uuid not null, etapa_anterior etapa_processo, etapa_nova etapa_processo not null, usuario_id uuid, responsavel text, observacao text, created_at timestamp with time zone not null default now());

create table public.solicitacao_retornos_administrativos (id uuid not null default gen_random_uuid(), solicitacao_id uuid not null, usuario_id uuid, descricao text not null, created_at timestamp with time zone not null default now());

create table public.solicitacoes (id uuid not null default gen_random_uuid(), codigo_sgo text, nome_escola text not null, codesc text not null, sre_id uuid, municipio_id uuid, tipo_obra_id uuid, imovel_id uuid, sre text, municipio text, tipo text, etapa_atual etapa_processo not null default 'cadastro'::etapa_processo, tipo_atendimento text, atendimento_orgao text, forma_atendimento text, origem_demanda text, num_paf text, ano_emenda text, emenda_impositiva text, descricao_folha_rosto text, valor_planilha numeric(15,2), valor_homologado numeric(15,2), numero_paf text, data_homologacao date, data_vigencia_paf date, data_fin_homologacao date, status_paf text, cnpj_caixa_escolar text, valor_contrato numeric(15,2), prazo_estimado_obra integer, prazo_estimado_meses integer, iss text, codigo_endereco text, forma_ocupacao text, predio text, tombado text, orgao_tombador text, coabitado text, tipo_coabitado text, ficha_verificada boolean not null default false, observacoes_ficha text, status_identificacao_escolar status_validacao not null default 'pendente'::status_validacao, motivo_identificacao_escolar text, status_classificacao_patrimonial status_validacao not null default 'pendente'::status_validacao, motivo_classificacao_patrimonial text, status_detalhamento_tecnico status_validacao not null default 'pendente'::status_validacao, motivo_detalhamento_tecnico text, status_referencia_dotacao status_validacao not null default 'pendente'::status_validacao, motivo_referencia_dotacao text, prioridade_score integer, estrelas integer, etiquetas_prioridade jsonb not null default '[]'::jsonb, iee numeric(6,2), iee_classe classe_iee, iee_pontos integer, iee_complexidade text, status_obra status_obra_computado not null default 'nao_iniciada'::status_obra_computado, empresa_contratada text, cnpj_empresa text, responsavel text, data_ordem_inicio date, previsao_termino_obra date, data_encerramento_contrato date, data_ordem_servico_fiscal date, garantia_inicio date, garantia_fim date, garantia_tipo text, cadastro_obra_confirmado boolean not null default false, analista_atribuido_id uuid, fiscal_obra_atribuido_id uuid, atribuicao_forcada boolean not null default false, contador_analises integer not null default 0, valores_originais_tecnico jsonb, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), escola_id uuid, endereco_id uuid, contrato_data_assinatura date, contrato_inicio_vigencia date, contrato_fim_vigencia date, garantia_validade date, garantia_valor numeric, garantia_exigida text, status_contrato_empresa text, duracao_obra_meses integer, status_aprovacao_regional text, coordenador_aprovador text, data_aprovacao_regional date, justificativa_reprovacao_regional text);

create table public.tipos_obra (id uuid not null default gen_random_uuid(), nome text not null, nota_iee numeric(3,1) not null);

create table public.usuario_regionais (usuario_id uuid not null, sre_id uuid not null);

create table public.usuarios (id uuid not null, nome text not null, email text not null, perfil_id uuid not null, capacidade_maxima_iee integer not null default 35, ativo boolean not null default true, created_at timestamp with time zone not null default now());

create table public.vistorias_obra (id uuid not null default gen_random_uuid(), solicitacao_id uuid not null, data_vistoria date not null, resultado text not null default 'emitido'::text, observacoes text, usuario_id uuid, created_at timestamp with time zone not null default now(), vistoriador text, nome_relatorio text, tamanho_relatorio text);

-- ---------------------------------------------------------------------------
-- 4. Constraints (PK / UNIQUE / CHECK)
-- ---------------------------------------------------------------------------
alter table public.aditivos add constraint aditivos_pkey PRIMARY KEY (id);
alter table public.aditivos add constraint aditivos_reprogramacao_check CHECK (((reprogramacao IS NULL) OR (reprogramacao = ANY (ARRAY['Sim'::text, 'Não'::text]))));
alter table public.aditivos add constraint aditivos_saldo_complementar_check CHECK (((saldo_complementar IS NULL) OR (saldo_complementar = ANY (ARRAY['Sim'::text, 'Não'::text]))));
alter table public.aditivos add constraint aditivos_status_check CHECK ((status = ANY (ARRAY['pendente'::text, 'aprovado'::text, 'recusado'::text])));
alter table public.aditivos add constraint aditivos_tipo_check CHECK ((tipo = ANY (ARRAY['valor'::text, 'prazo'::text, 'valor_prazo'::text])));
alter table public.ajustes_planilha add constraint ajustes_planilha_pkey PRIMARY KEY (id);
alter table public.ajustes_planilha add constraint ajustes_planilha_reprogramacao_check CHECK (((reprogramacao IS NULL) OR (reprogramacao = ANY (ARRAY['Sim'::text, 'Não'::text]))));
alter table public.ajustes_planilha add constraint ajustes_planilha_saldo_complementar_check CHECK (((saldo_complementar IS NULL) OR (saldo_complementar = ANY (ARRAY['Sim'::text, 'Não'::text]))));
alter table public.ajustes_planilha add constraint ajustes_planilha_status_check CHECK ((status = ANY (ARRAY['pendente'::text, 'aprovado'::text, 'recusado'::text])));
alter table public.diarios_obra add constraint diarios_obra_categoria_check CHECK (((categoria IS NULL) OR (categoria = ANY (ARRAY['Ocorrência'::text, 'Clima'::text, 'Trabalho'::text, 'Materiais'::text, 'Equipe'::text, 'Segurança'::text]))));
alter table public.diarios_obra add constraint diarios_obra_percentual_execucao_check CHECK (((percentual_execucao >= (0)::numeric) AND (percentual_execucao <= (100)::numeric)));
alter table public.diarios_obra add constraint diarios_obra_pkey PRIMARY KEY (id);
alter table public.documentos add constraint doc_exatamente_um_pai CHECK (((((((solicitacao_id IS NOT NULL))::integer + ((aditivo_id IS NOT NULL))::integer) + ((ajuste_id IS NOT NULL))::integer) + ((imovel_id IS NOT NULL))::integer) = 1));
alter table public.documentos add constraint documentos_pkey PRIMARY KEY (id);
alter table public.enderecos_escola add constraint enderecos_escola_codigo_endereco_codesc_key UNIQUE (codigo_endereco, codesc);
alter table public.enderecos_escola add constraint enderecos_escola_pkey PRIMARY KEY (id);
alter table public.escolas add constraint escolas_codesc_key UNIQUE (codesc);
alter table public.escolas add constraint escolas_pkey PRIMARY KEY (id);
alter table public.historico_correcao_docs_recusados add constraint historico_correcao_docs_recusados_pkey PRIMARY KEY (id);
alter table public.historico_correcao_motivos add constraint historico_correcao_motivos_pkey PRIMARY KEY (id);
alter table public.medicoes add constraint medicoes_pkey PRIMARY KEY (id);
alter table public.medicoes add constraint medicoes_porcentagem_check CHECK (((porcentagem IS NULL) OR ((porcentagem >= (0)::numeric) AND (porcentagem <= (100)::numeric))));
alter table public.medicoes add constraint medicoes_porcentagem_fisica_check CHECK (((porcentagem_fisica IS NULL) OR ((porcentagem_fisica >= (0)::numeric) AND (porcentagem_fisica <= (100)::numeric))));
alter table public.medicoes add constraint medicoes_status_check CHECK ((status = ANY (ARRAY['pendente'::text, 'aprovada'::text, 'recusada'::text])));
alter table public.medicoes add constraint medicoes_valor_check CHECK ((valor > (0)::numeric));
alter table public.municipios add constraint municipios_pkey PRIMARY KEY (id);
alter table public.notificacoes add constraint notificacoes_pkey PRIMARY KEY (id);
alter table public.parcelas_paf add constraint parcelas_paf_pkey PRIMARY KEY (id);
alter table public.parcelas_paf add constraint parcelas_paf_valor_check CHECK ((valor > (0)::numeric));
alter table public.perfil_permissoes add constraint perfil_permissoes_pkey PRIMARY KEY (perfil_id, permissao_id);
alter table public.perfis add constraint perfis_codigo_key UNIQUE (codigo);
alter table public.perfis add constraint perfis_pkey PRIMARY KEY (id);
alter table public.permissoes add constraint permissoes_codigo_key UNIQUE (codigo);
alter table public.permissoes add constraint permissoes_pkey PRIMARY KEY (id);
alter table public.reequilibrios_financeiros add constraint reequilibrios_financeiros_pkey PRIMARY KEY (id);
alter table public.reequilibrios_financeiros add constraint reequilibrios_financeiros_status_check CHECK ((status = ANY (ARRAY['pendente'::text, 'aprovado'::text, 'recusado'::text])));
alter table public.regionais_sre add constraint regionais_sre_nome_key UNIQUE (nome);
alter table public.regionais_sre add constraint regionais_sre_pkey PRIMARY KEY (id);
alter table public.restricoes_obra add constraint restricoes_obra_impacto_check CHECK (((impacto IS NULL) OR (impacto = ANY (ARRAY['Alto'::text, 'Médio'::text, 'Baixo'::text]))));
alter table public.restricoes_obra add constraint restricoes_obra_pkey PRIMARY KEY (id);
alter table public.restricoes_obra add constraint restricoes_obra_status_check CHECK ((status = ANY (ARRAY['ativa'::text, 'resolvida'::text])));
alter table public.saldos_complementares add constraint saldos_complementares_pkey PRIMARY KEY (id);
alter table public.saldos_complementares add constraint saldos_complementares_status_check CHECK ((status = ANY (ARRAY['pendente'::text, 'aprovado'::text, 'recusado'::text])));
alter table public.sistema_logs add constraint sistema_logs_pkey PRIMARY KEY (id);
alter table public.solicitacao_historico_correcoes add constraint solicitacao_historico_correcoes_pkey PRIMARY KEY (id);
alter table public.solicitacao_historico_etapas add constraint solicitacao_historico_etapas_pkey PRIMARY KEY (id);
alter table public.solicitacao_retornos_administrativos add constraint solicitacao_retornos_administrativos_pkey PRIMARY KEY (id);
alter table public.solicitacoes add constraint solicitacoes_codigo_sgo_key UNIQUE (codigo_sgo);
alter table public.solicitacoes add constraint solicitacoes_emenda_impositiva_check CHECK ((emenda_impositiva = ANY (ARRAY['Sim'::text, 'Não'::text])));
alter table public.solicitacoes add constraint solicitacoes_origem_demanda_check CHECK (((origem_demanda IS NULL) OR (origem_demanda = ANY (ARRAY['Solicitação da Escola'::text, 'Solicitação da SRE'::text, 'Programa Governamental'::text, 'Fiscalização'::text, 'Notificação'::text, 'Determinação Judicial'::text, 'Atendimento Político'::text]))));
alter table public.solicitacoes add constraint solicitacoes_pkey PRIMARY KEY (id);
alter table public.solicitacoes add constraint solicitacoes_status_aprovacao_regional_check CHECK (((status_aprovacao_regional IS NULL) OR (status_aprovacao_regional = ANY (ARRAY['pendente'::text, 'aprovado'::text, 'reprovado'::text]))));
alter table public.solicitacoes add constraint solicitacoes_status_contrato_empresa_check CHECK (((status_contrato_empresa IS NULL) OR (status_contrato_empresa = ANY (ARRAY['Ativa'::text, 'Distratada'::text]))));
alter table public.solicitacoes add constraint solicitacoes_status_paf_check CHECK ((status_paf = ANY (ARRAY['Aguardando Geração'::text, 'Aguardando Pagamento'::text, 'Pago Parcialmente'::text, 'Pago e Liberado'::text])));
alter table public.tipos_obra add constraint tipos_obra_nome_key UNIQUE (nome);
alter table public.tipos_obra add constraint tipos_obra_nota_iee_check CHECK (((nota_iee >= (1)::numeric) AND (nota_iee <= (5)::numeric)));
alter table public.tipos_obra add constraint tipos_obra_pkey PRIMARY KEY (id);
alter table public.usuario_regionais add constraint usuario_regionais_pkey PRIMARY KEY (usuario_id, sre_id);
alter table public.usuarios add constraint usuarios_email_key UNIQUE (email);
alter table public.usuarios add constraint usuarios_pkey PRIMARY KEY (id);
alter table public.vistorias_obra add constraint vistorias_obra_pkey PRIMARY KEY (id);

-- ---------------------------------------------------------------------------
-- 5. Foreign keys
-- ---------------------------------------------------------------------------
alter table public.aditivos add constraint aditivos_analista_id_fkey FOREIGN KEY (analista_id) REFERENCES usuarios(id);
alter table public.aditivos add constraint aditivos_solicitacao_id_fkey FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id);
alter table public.aditivos add constraint aditivos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
alter table public.ajustes_planilha add constraint ajustes_planilha_analista_id_fkey FOREIGN KEY (analista_id) REFERENCES usuarios(id);
alter table public.ajustes_planilha add constraint ajustes_planilha_solicitacao_id_fkey FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id);
alter table public.ajustes_planilha add constraint ajustes_planilha_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
alter table public.diarios_obra add constraint diarios_obra_solicitacao_id_fkey FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id);
alter table public.diarios_obra add constraint diarios_obra_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
alter table public.documentos add constraint documentos_solicitacao_id_fkey FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE CASCADE;
alter table public.documentos add constraint documentos_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES usuarios(id);
alter table public.enderecos_escola add constraint enderecos_escola_escola_id_fkey FOREIGN KEY (escola_id) REFERENCES escolas(id);
alter table public.historico_correcao_docs_recusados add constraint historico_correcao_docs_recusados_correcao_id_fkey FOREIGN KEY (correcao_id) REFERENCES solicitacao_historico_correcoes(id) ON DELETE CASCADE;
alter table public.historico_correcao_motivos add constraint historico_correcao_motivos_correcao_id_fkey FOREIGN KEY (correcao_id) REFERENCES solicitacao_historico_correcoes(id) ON DELETE CASCADE;
alter table public.medicoes add constraint medicoes_solicitacao_id_fkey FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id);
alter table public.medicoes add constraint medicoes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
alter table public.notificacoes add constraint notificacoes_solicitacao_id_fkey FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE CASCADE;
alter table public.notificacoes add constraint notificacoes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
alter table public.parcelas_paf add constraint parcelas_paf_solicitacao_id_fkey FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE CASCADE;
alter table public.perfil_permissoes add constraint perfil_permissoes_perfil_id_fkey FOREIGN KEY (perfil_id) REFERENCES perfis(id) ON DELETE CASCADE;
alter table public.perfil_permissoes add constraint perfil_permissoes_permissao_id_fkey FOREIGN KEY (permissao_id) REFERENCES permissoes(id) ON DELETE CASCADE;
alter table public.reequilibrios_financeiros add constraint reequilibrios_financeiros_analista_id_fkey FOREIGN KEY (analista_id) REFERENCES usuarios(id);
alter table public.reequilibrios_financeiros add constraint reequilibrios_financeiros_solicitacao_id_fkey FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id);
alter table public.reequilibrios_financeiros add constraint reequilibrios_financeiros_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
alter table public.restricoes_obra add constraint restricoes_obra_solicitacao_id_fkey FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id);
alter table public.restricoes_obra add constraint restricoes_obra_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
alter table public.saldos_complementares add constraint saldos_complementares_solicitacao_id_fkey FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id);
alter table public.saldos_complementares add constraint saldos_complementares_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
alter table public.sistema_logs add constraint sistema_logs_solicitacao_id_fkey FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE SET NULL;
alter table public.sistema_logs add constraint sistema_logs_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;
alter table public.solicitacao_historico_correcoes add constraint solicitacao_historico_correcoes_solicitacao_id_fkey FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE CASCADE;
alter table public.solicitacao_historico_correcoes add constraint solicitacao_historico_correcoes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
alter table public.solicitacao_historico_etapas add constraint solicitacao_historico_etapas_solicitacao_id_fkey FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE CASCADE;
alter table public.solicitacao_historico_etapas add constraint solicitacao_historico_etapas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
alter table public.solicitacao_retornos_administrativos add constraint solicitacao_retornos_administrativos_solicitacao_id_fkey FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE CASCADE;
alter table public.solicitacao_retornos_administrativos add constraint solicitacao_retornos_administrativos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
alter table public.solicitacoes add constraint solicitacoes_analista_atribuido_id_fkey FOREIGN KEY (analista_atribuido_id) REFERENCES usuarios(id);
alter table public.solicitacoes add constraint solicitacoes_endereco_id_fkey FOREIGN KEY (endereco_id) REFERENCES enderecos_escola(id);
alter table public.solicitacoes add constraint solicitacoes_escola_id_fkey FOREIGN KEY (escola_id) REFERENCES escolas(id);
alter table public.solicitacoes add constraint solicitacoes_fiscal_obra_atribuido_id_fkey FOREIGN KEY (fiscal_obra_atribuido_id) REFERENCES usuarios(id);
alter table public.solicitacoes add constraint solicitacoes_municipio_id_fkey FOREIGN KEY (municipio_id) REFERENCES municipios(id);
alter table public.solicitacoes add constraint solicitacoes_sre_id_fkey FOREIGN KEY (sre_id) REFERENCES regionais_sre(id);
alter table public.solicitacoes add constraint solicitacoes_tipo_obra_id_fkey FOREIGN KEY (tipo_obra_id) REFERENCES tipos_obra(id);
alter table public.usuario_regionais add constraint usuario_regionais_sre_id_fkey FOREIGN KEY (sre_id) REFERENCES regionais_sre(id) ON DELETE CASCADE;
alter table public.usuario_regionais add constraint usuario_regionais_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
alter table public.usuarios add constraint usuarios_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.usuarios add constraint usuarios_perfil_id_fkey FOREIGN KEY (perfil_id) REFERENCES perfis(id);
alter table public.vistorias_obra add constraint vistorias_obra_solicitacao_id_fkey FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id);
alter table public.vistorias_obra add constraint vistorias_obra_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id);

-- ---------------------------------------------------------------------------
-- 6. Índices (não vinculados a constraints)
-- ---------------------------------------------------------------------------
CREATE INDEX idx_documentos_sol ON public.documentos USING btree (solicitacao_id);
CREATE INDEX idx_documentos_status ON public.documentos USING btree (status) WHERE (status = 'pendente'::documento_status);
CREATE INDEX idx_hist_etapas_sol ON public.solicitacao_historico_etapas USING btree (solicitacao_id, created_at DESC);
CREATE INDEX idx_logs_sol ON public.sistema_logs USING btree (solicitacao_id, created_at DESC);
CREATE INDEX idx_logs_usuario ON public.sistema_logs USING btree (usuario_id, created_at DESC);
CREATE INDEX idx_notif_usuario ON public.notificacoes USING btree (usuario_id, lida, created_at DESC);
CREATE INDEX idx_parcelas_sol ON public.parcelas_paf USING btree (solicitacao_id);
CREATE INDEX idx_solicitacoes_analista ON public.solicitacoes USING btree (analista_atribuido_id);
CREATE INDEX idx_solicitacoes_etapa ON public.solicitacoes USING btree (etapa_atual);
CREATE INDEX idx_solicitacoes_prioridade ON public.solicitacoes USING btree (estrelas DESC NULLS LAST, prioridade_score DESC NULLS LAST);
CREATE INDEX idx_solicitacoes_sre ON public.solicitacoes USING btree (sre_id);

-- ---------------------------------------------------------------------------
-- 7. Triggers
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_documentos_updated_at BEFORE UPDATE ON public.documentos FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_solicitacoes_updated_at BEFORE UPDATE ON public.solicitacoes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 8. Row Level Security
-- ---------------------------------------------------------------------------
alter table public.aditivos enable row level security;
alter table public.ajustes_planilha enable row level security;
alter table public.diarios_obra enable row level security;
alter table public.documentos enable row level security;
alter table public.enderecos_escola enable row level security;
alter table public.escolas enable row level security;
alter table public.historico_correcao_docs_recusados enable row level security;
alter table public.historico_correcao_motivos enable row level security;
alter table public.medicoes enable row level security;
alter table public.municipios enable row level security;
alter table public.notificacoes enable row level security;
alter table public.parcelas_paf enable row level security;
alter table public.perfil_permissoes enable row level security;
alter table public.perfis enable row level security;
alter table public.permissoes enable row level security;
alter table public.reequilibrios_financeiros enable row level security;
alter table public.regionais_sre enable row level security;
alter table public.restricoes_obra enable row level security;
alter table public.saldos_complementares enable row level security;
alter table public.sistema_logs enable row level security;
alter table public.solicitacao_historico_correcoes enable row level security;
alter table public.solicitacao_historico_etapas enable row level security;
alter table public.solicitacao_retornos_administrativos enable row level security;
alter table public.solicitacoes enable row level security;
alter table public.tipos_obra enable row level security;
alter table public.usuario_regionais enable row level security;
alter table public.usuarios enable row level security;
alter table public.vistorias_obra enable row level security;

-- ---------------------------------------------------------------------------
-- 9. Policies (cópia fiel do remoto, incluindo duplicatas históricas)
-- ---------------------------------------------------------------------------
create policy "autenticados podem atualizar" on public.aditivos for update to authenticated using (true) with check (true);
create policy "autenticados podem deletar" on public.aditivos for delete to authenticated using (true);
create policy "autenticados podem inserir" on public.aditivos for insert to authenticated with check (true);
create policy "autenticados podem ler" on public.aditivos for select to authenticated using (true);
create policy "autenticados podem atualizar" on public.ajustes_planilha for update to authenticated using (true) with check (true);
create policy "autenticados podem deletar" on public.ajustes_planilha for delete to authenticated using (true);
create policy "autenticados podem inserir" on public.ajustes_planilha for insert to authenticated with check (true);
create policy "autenticados podem ler" on public.ajustes_planilha for select to authenticated using (true);
create policy "autenticados podem atualizar" on public.diarios_obra for update to authenticated using (true) with check (true);
create policy "autenticados podem deletar diarios" on public.diarios_obra for delete to authenticated using (true);
create policy "autenticados podem inserir" on public.diarios_obra for insert to authenticated with check (true);
create policy "autenticados podem ler" on public.diarios_obra for select to authenticated using (true);
create policy "autenticados podem atualizar" on public.documentos for update to authenticated using (true) with check (true);
create policy "autenticados podem inserir" on public.documentos for insert to authenticated with check (true);
create policy "autenticados podem ler" on public.documentos for select to authenticated using (true);
create policy "autenticados podem ler" on public.enderecos_escola for select to authenticated using (true);
create policy "autenticados podem ler enderecos" on public.enderecos_escola for select to authenticated using (true);
create policy "autenticados podem ler" on public.escolas for select to authenticated using (true);
create policy "autenticados podem ler escolas" on public.escolas for select to authenticated using (true);
create policy "autenticados podem inserir" on public.historico_correcao_docs_recusados for insert to authenticated with check (true);
create policy "autenticados podem ler" on public.historico_correcao_docs_recusados for select to authenticated using (true);
create policy "autenticados podem inserir" on public.historico_correcao_motivos for insert to authenticated with check (true);
create policy "autenticados podem ler" on public.historico_correcao_motivos for select to authenticated using (true);
create policy "autenticados podem atualizar" on public.medicoes for update to authenticated using (true) with check (true);
create policy "autenticados podem deletar" on public.medicoes for delete to authenticated using (true);
create policy "autenticados podem inserir" on public.medicoes for insert to authenticated with check (true);
create policy "autenticados podem ler" on public.medicoes for select to authenticated using (true);
create policy "autenticados podem ler" on public.municipios for select to authenticated using (true);
create policy "autenticados podem inserir" on public.notificacoes for insert to authenticated with check (true);
create policy "usuario atualiza as proprias notificacoes" on public.notificacoes for update to authenticated using ((( SELECT auth.uid() AS uid) = usuario_id)) with check ((( SELECT auth.uid() AS uid) = usuario_id));
create policy "usuario le as proprias notificacoes" on public.notificacoes for select to authenticated using ((( SELECT auth.uid() AS uid) = usuario_id));
create policy "autenticados podem atualizar" on public.parcelas_paf for update to authenticated using (true) with check (true);
create policy "autenticados podem inserir" on public.parcelas_paf for insert to authenticated with check (true);
create policy "autenticados podem ler" on public.parcelas_paf for select to authenticated using (true);
create policy "autenticados podem ler" on public.perfil_permissoes for select to authenticated using (true);
create policy "autenticados podem ler" on public.perfis for select to authenticated using (true);
create policy "autenticados podem ler" on public.permissoes for select to authenticated using (true);
create policy "autenticados podem atualizar" on public.reequilibrios_financeiros for update to authenticated using (true) with check (true);
create policy "autenticados podem deletar reequilibrios" on public.reequilibrios_financeiros for delete to authenticated using (true);
create policy "autenticados podem inserir" on public.reequilibrios_financeiros for insert to authenticated with check (true);
create policy "autenticados podem ler" on public.reequilibrios_financeiros for select to authenticated using (true);
create policy "autenticados podem ler" on public.regionais_sre for select to authenticated using (true);
create policy "autenticados podem atualizar" on public.restricoes_obra for update to authenticated using (true) with check (true);
create policy "autenticados podem deletar restricoes" on public.restricoes_obra for delete to authenticated using (true);
create policy "autenticados podem inserir" on public.restricoes_obra for insert to authenticated with check (true);
create policy "autenticados podem ler" on public.restricoes_obra for select to authenticated using (true);
create policy "autenticados podem atualizar" on public.saldos_complementares for update to authenticated using (true) with check (true);
create policy "autenticados podem deletar saldos" on public.saldos_complementares for delete to authenticated using (true);
create policy "autenticados podem inserir" on public.saldos_complementares for insert to authenticated with check (true);
create policy "autenticados podem ler" on public.saldos_complementares for select to authenticated using (true);
create policy "autenticados podem inserir" on public.sistema_logs for insert to authenticated with check (true);
create policy "autenticados podem ler" on public.sistema_logs for select to authenticated using (true);
create policy "autenticados podem inserir" on public.solicitacao_historico_correcoes for insert to authenticated with check (true);
create policy "autenticados podem ler" on public.solicitacao_historico_correcoes for select to authenticated using (true);
create policy "autenticados podem inserir" on public.solicitacao_historico_etapas for insert to authenticated with check (true);
create policy "autenticados podem ler" on public.solicitacao_historico_etapas for select to authenticated using (true);
create policy "autenticados podem inserir" on public.solicitacao_retornos_administrativos for insert to authenticated with check (true);
create policy "autenticados podem ler" on public.solicitacao_retornos_administrativos for select to authenticated using (true);
create policy "autenticados podem atualizar" on public.solicitacoes for update to authenticated using (true) with check (true);
create policy "autenticados podem inserir" on public.solicitacoes for insert to authenticated with check (true);
create policy "autenticados podem ler" on public.solicitacoes for select to authenticated using (true);
create policy "autenticados podem ler" on public.tipos_obra for select to authenticated using (true);
create policy "admin le todos vinculos" on public.usuario_regionais for select to authenticated using ((EXISTS ( SELECT 1
   FROM (usuarios u
     JOIN perfis p ON ((p.id = u.perfil_id)))
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (p.codigo = 'admin'::text)))));
create policy "usuario le os proprios vinculos" on public.usuario_regionais for select to authenticated using ((( SELECT auth.uid() AS uid) = usuario_id));
create policy "autenticados podem ler" on public.usuarios for select to authenticated using (true);
create policy "autenticados podem atualizar" on public.vistorias_obra for update to authenticated using (true) with check (true);
create policy "autenticados podem deletar vistorias" on public.vistorias_obra for delete to authenticated using (true);
create policy "autenticados podem inserir" on public.vistorias_obra for insert to authenticated with check (true);
create policy "autenticados podem ler" on public.vistorias_obra for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 10. Policies de DELETE que faltavam no remoto (aplicadas lá em 2026-07-30):
--     sem elas, o replace-set de documentos/histórico e a exclusão de
--     solicitações deletavam 0 linhas silenciosamente.
-- ---------------------------------------------------------------------------
create policy "autenticados podem deletar documentos" on public.documentos for delete to authenticated using (true);
create policy "autenticados podem deletar historico etapas" on public.solicitacao_historico_etapas for delete to authenticated using (true);
create policy "autenticados podem deletar solicitacoes" on public.solicitacoes for delete to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 11. Grants (Data API) — no remoto existem via privilégios padrão da
--     plataforma; localmente precisam ser explícitos. O acesso por linha
--     continua governado pelo RLS acima.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to anon, authenticated, service_role;
