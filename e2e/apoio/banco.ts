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
export async function criarSolicitacaoEmExecucao(codigoSgo: string): Promise<string> {
  const linhas = await consultar<{ id: string }>(
    `insert into solicitacoes (
       codigo_sgo, nome_escola, codesc, sre, municipio, tipo, etapa_atual,
       empresa_contratada, cnpj_empresa, valor_planilha, valor_homologado,
       cadastro_obra_confirmado, data_ordem_inicio
     ) values (
       $1, 'EE AARÃO REIS', '31000027', 'SRE METROPOLITANA B', 'BELO HORIZONTE',
       'REFORMA', 'execucao', 'Construtora Teste Ltda', '00.000.000/0001-00',
       500000, 500000, true, current_date
     )
     returning id`,
    [codigoSgo]
  );
  return linhas[0].id;
}

export async function encerrarPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
