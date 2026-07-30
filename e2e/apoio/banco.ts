import { Pool } from 'pg';
import { ambienteLocal } from './ambiente';

// Acesso direto ao Postgres local (role postgres ignora RLS) para reset entre
// testes e asserções — a UI pode parecer "verde" via fallback de localStorage,
// então a prova final é sempre o banco.

let pool: Pool | null = null;

function obterPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: ambienteLocal().dbUrl, max: 2 });
  }
  return pool;
}

export async function consultar<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const { rows } = await obterPool().query(sql, params);
  return rows as T[];
}

// Tabelas transacionais: zeradas entre testes. Referência (perfis, escolas,
// regionais_sre, tipos_obra) e usuários ficam intactos.
const TABELAS_TRANSACIONAIS = [
  'solicitacoes',
  'documentos',
  'solicitacao_historico_etapas',
  'solicitacao_historico_correcoes',
  'historico_correcao_motivos',
  'historico_correcao_docs_recusados',
  'solicitacao_retornos_administrativos',
  'parcelas_paf',
  'medicoes',
  'aditivos',
  'ajustes_planilha',
  'diarios_obra',
  'restricoes_obra',
  'vistorias_obra',
  'reequilibrios_financeiros',
  'saldos_complementares',
  'notificacoes',
  'sistema_logs',
];

export async function limparTabelasTransacionais(): Promise<void> {
  await obterPool().query(`TRUNCATE ${TABELAS_TRANSACIONAIS.join(', ')} CASCADE`);
}

export async function solicitacaoPorCodigo(codigoSgo: string): Promise<any | null> {
  const linhas = await consultar('select * from solicitacoes where codigo_sgo = $1', [codigoSgo]);
  return linhas[0] ?? null;
}

export async function documentosDe(codigoSgo: string): Promise<any[]> {
  return consultar(
    `select d.* from documentos d
     join solicitacoes s on s.id = d.solicitacao_id
     where s.codigo_sgo = $1
     order by d.categoria, d.nome_logico`,
    [codigoSgo]
  );
}

export async function historicoEtapasDe(codigoSgo: string): Promise<any[]> {
  return consultar(
    `select h.* from solicitacao_historico_etapas h
     join solicitacoes s on s.id = h.solicitacao_id
     where s.codigo_sgo = $1
     order by h.created_at asc`,
    [codigoSgo]
  );
}

export async function usuarioPorEmail(email: string): Promise<any | null> {
  const linhas = await consultar('select * from usuarios where email = $1', [email]);
  return linhas[0] ?? null;
}

// Cria direto no banco uma solicitação já em execução — atalho para os specs
// de medição/aditivo/ajuste não repetirem o fluxo completo de aprovação.
// Requisitos descobertos no código (ExecucaoSubmodulos):
// - contrato_data_assinatura + valor_contrato liberam o "contract lock gate";
// - fiscal_obra_atribuido_id é obrigatório para medições e ajustes;
// - data_ordem_inicio + etapa 'execucao' => status "Em execução".
export async function criarSolicitacaoEmExecucao(codigoSgo: string): Promise<string> {
  const linhas = await consultar<{ id: string }>(
    `insert into solicitacoes (
       codigo_sgo, nome_escola, codesc, sre, municipio, tipo, etapa_atual,
       empresa_contratada, cnpj_empresa, valor_planilha, valor_homologado,
       cadastro_obra_confirmado, data_ordem_inicio, numero_paf, valor_contrato,
       contrato_data_assinatura, fiscal_obra_atribuido_id
     ) values (
       $1, 'EE AARÃO REIS', '31000027', 'SRE Metropolitana B', 'BELO HORIZONTE',
       'REFORMA', 'execucao', 'Construtora Teste Ltda', '00.000.000/0001-00',
       500000, 500000, true, current_date, 'PAF-2026-0001', 500000,
       current_date,
       (select id from usuarios where email = 'fiscal@educacao.mg.gov.br')
     )
     returning id`,
    [codigoSgo]
  );
  return linhas[0].id;
}

// Solicitação recém-registrada (etapa 'cadastro'), aguardando aprovação regional.
export async function criarSolicitacaoEmCadastro(
  codigoSgo: string,
  opcoes: { codesc?: string; nomeEscola?: string; sre?: string } = {}
): Promise<string> {
  const linhas = await consultar<{ id: string }>(
    `insert into solicitacoes (
       codigo_sgo, nome_escola, codesc, sre, municipio, tipo, etapa_atual,
       status_aprovacao_regional, descricao_folha_rosto, valor_planilha
     ) values (
       $1, $2, $3, $4, 'BELO HORIZONTE', 'REFORMA', 'cadastro',
       'pendente', 'Reforma geral do telhado e instalações elétricas.', 250000
     )
     returning id`,
    [
      codigoSgo,
      opcoes.nomeEscola ?? 'EE AARÃO REIS',
      opcoes.codesc ?? '31000027',
      opcoes.sre ?? 'SRE Metropolitana B',
    ]
  );
  return linhas[0].id;
}

// Ordem canônica do checklist (types.ts / CHECKLIST_PADRAO).
export const CHECKLIST_CANONICO = [
  'doc_1',
  'doc_2',
  'doc_3_pdf',
  'doc_3_dwg',
  'doc_4',
  'doc_ata',
  'doc_foto',
  'doc_5',
] as const;

// Insere as 8 linhas canônicas do checklist já com arquivo anexado — necessário
// para os botões de validação documental do ProcessAnalysisPanel habilitarem.
export async function seedarChecklistComArquivos(solicitacaoId: string): Promise<void> {
  for (const nomeLogico of CHECKLIST_CANONICO) {
    await consultar(
      `insert into documentos (
         solicitacao_id, categoria, nome_logico, obrigatorio, status,
         file_name, file_type, file_size_bytes, uploaded_at
       ) values (
         $1, 'checklist_obrigatorio', $2, $3, 'pendente',
         $4, 'application/pdf', 2048, now()
       )`,
      [solicitacaoId, nomeLogico, nomeLogico !== 'doc_5', `${nomeLogico}.pdf`]
    );
  }
}

// Solicitação já na fila da DORE (etapa 'analise'), opcionalmente com analista
// atribuído e checklist completo (pré-requisitos da aprovação técnica).
export async function criarSolicitacaoEmAnalise(
  codigoSgo: string,
  opcoes: { comAnalista?: boolean; comDocumentos?: boolean } = {}
): Promise<string> {
  const linhas = await consultar<{ id: string }>(
    `insert into solicitacoes (
       codigo_sgo, nome_escola, codesc, sre, municipio, tipo, etapa_atual,
       status_aprovacao_regional, descricao_folha_rosto, valor_planilha,
       analista_atribuido_id
     ) values (
       $1, 'EE AARÃO REIS', '31000027', 'SRE Metropolitana B', 'BELO HORIZONTE',
       'REFORMA', 'analise', 'aprovado', 'Reforma geral do telhado.', 250000,
       case when $2 then (select id from usuarios where email = 'analistadore@educacao.mg.gov.br') end
     )
     returning id`,
    [codigoSgo, opcoes.comAnalista ?? false]
  );
  const id = linhas[0].id;
  if (opcoes.comDocumentos) {
    await seedarChecklistComArquivos(id);
  }
  return id;
}

// BUG conhecido (registrado na frente e2e): o wizard de Atendimento Inicial grava
// os documentos com ids aleatórios ('doc_1_734'…) em vez dos ids canônicos, e a
// releitura do banco (montarChecklistCanonico) só reconhece os canônicos — os
// anexos "somem" da UI no próximo reload. Este helper renomeia nome_logico por
// posição para permitir que o fluxo completo prossiga pela UI.
export async function normalizarChecklistDoWizard(codigoSgo: string): Promise<void> {
  for (let i = 0; i < CHECKLIST_CANONICO.length; i++) {
    await consultar(
      `update documentos d set nome_logico = $1
       from solicitacoes s
       where s.id = d.solicitacao_id and s.codigo_sgo = $2
         and d.categoria = 'checklist_obrigatorio'
         and d.nome_logico ~ ('^doc_' || $3 || '_[0-9]+$')`,
      [CHECKLIST_CANONICO[i], codigoSgo, String(i + 1)]
    );
  }
}

export async function encerrarPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
