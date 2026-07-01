import { Solicitacao, SecaoDadosGerais, StatusSecao, StatusValidacao } from '../types';

// Ordem fixa de exibição das 4 seções da aba "Dados Gerais".
export const SECOES_DADOS_GERAIS: SecaoDadosGerais[] = [
  'identificacao_escolar',
  'classificacao_patrimonial',
  'detalhamento_tecnico',
  'referencia_dotacao'
];

export const SECAO_LABEL: Record<SecaoDadosGerais, string> = {
  identificacao_escolar: 'Identificação Escolar',
  classificacao_patrimonial: 'Classificação Patrimonial do Imóvel',
  detalhamento_tecnico: 'Detalhamento Técnico e Demanda',
  referencia_dotacao: 'Informações de Referência e Dotação Orçamentária SGO'
};

// Campos de Solicitacao pertencentes a cada seção — usados para o diff de EDITADO contra valoresOriginaisTecnico.
export const SECAO_CAMPOS: Record<SecaoDadosGerais, (keyof Solicitacao)[]> = {
  identificacao_escolar: ['codesc', 'nomeEscola', 'sre', 'municipio', 'codigoEndereco'],
  classificacao_patrimonial: ['formaOcupacao', 'predio', 'tombado', 'orgaoTombador', 'coabitado', 'tipoCoabitado'],
  detalhamento_tecnico: ['tipo', 'tipoAtendimento', 'numPaf', 'anoEmenda', 'formaAtendimento', 'descricaoFolhaRosto'],
  referencia_dotacao: ['valorPlanilha', 'iss', 'observacoesFicha']
};

export function getStatusSecoes(sol: Solicitacao): Record<SecaoDadosGerais, StatusSecao> {
  if (sol.statusSecoes) return sol.statusSecoes;
  const resultado = {} as Record<SecaoDadosGerais, StatusSecao>;
  SECOES_DADOS_GERAIS.forEach(secao => { resultado[secao] = { status: 'pendente' }; });
  return resultado;
}

export function getStatusSecao(sol: Solicitacao, secao: SecaoDadosGerais): StatusSecao {
  return getStatusSecoes(sol)[secao] ?? { status: 'pendente' };
}

export function validarSecao(sol: Solicitacao, secao: SecaoDadosGerais): Partial<Solicitacao> {
  const atual = getStatusSecoes(sol);
  return { statusSecoes: { ...atual, [secao]: { status: 'validado', motivo: undefined } } };
}

export function naoValidarSecao(sol: Solicitacao, secao: SecaoDadosGerais, motivo: string): Partial<Solicitacao> {
  const atual = getStatusSecoes(sol);
  return { statusSecoes: { ...atual, [secao]: { status: 'nao_validado', motivo } } };
}

// Compara os campos atuais da seção contra o snapshot enviado pelo técnico (valoresOriginaisTecnico).
function secaoFoiEditada(sol: Solicitacao, secao: SecaoDadosGerais): boolean {
  const original = sol.valoresOriginaisTecnico;
  if (!original) return false;
  return SECAO_CAMPOS[secao].some(campo => {
    const atual = (sol as unknown as Record<string, unknown>)[campo as string];
    const antigo = (original as Record<string, unknown>)[campo as string];
    return (atual ?? null) !== (antigo ?? null);
  });
}

// Recalcula o status de uma seção após uma edição de campo — chamado pelos handleUpdate* com o
// objeto já mesclado com o novo valor. EDITADO é sempre auto-detectado (nunca clicado manualmente):
// se o valor diverge do que o técnico enviou, marca EDITADO; se voltou a coincidir, volta a PENDENTE.
export function aplicarEdicaoSecao(solAtualizado: Solicitacao, secao: SecaoDadosGerais): Partial<Solicitacao> {
  const atual = getStatusSecoes(solAtualizado);
  const statusAtual = atual[secao]?.status ?? 'pendente';
  const editada = secaoFoiEditada(solAtualizado, secao);
  const novoStatus: StatusValidacao = editada ? 'editado' : (statusAtual === 'editado' ? 'pendente' : statusAtual);
  return {
    statusSecoes: {
      ...atual,
      [secao]: { status: novoStatus, motivo: novoStatus === 'nao_validado' ? atual[secao]?.motivo : undefined }
    }
  };
}

// Chamado quando o técnico corrige uma seção NÃO_VALIDADA durante a etapa "correcao":
// a seção volta para PENDENTE (aguardando nova análise). Seções VALIDADO/EDITADO ficam bloqueadas
// para o técnico (ver vLocked em GestaoObrasViews.tsx) e não passam por aqui.
export function tecnicoCorrigiuSecao(sol: Solicitacao, secao: SecaoDadosGerais): Partial<Solicitacao> {
  const atual = getStatusSecoes(sol);
  if (atual[secao]?.status !== 'nao_validado') return {};
  return { statusSecoes: { ...atual, [secao]: { status: 'pendente', motivo: undefined } } };
}

// Snapshot dos valores enviados pelo técnico — capturado ao entrar em "Em Análise DORE" (enviarParaDore),
// usado como referência para o diff de EDITADO em aplicarEdicaoSecao/secaoFoiEditada.
export function capturarSnapshotTecnico(sol: Solicitacao): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};
  SECOES_DADOS_GERAIS.forEach(secao => {
    SECAO_CAMPOS[secao].forEach(campo => {
      snapshot[campo as string] = (sol as unknown as Record<string, unknown>)[campo as string];
    });
  });
  return snapshot;
}

export function contarStatusSecoes(sol: Solicitacao): { total: number; pendentes: number; naoValidados: number; analisadas: number } {
  const secoes = getStatusSecoes(sol);
  const valores = SECOES_DADOS_GERAIS.map(s => secoes[s]?.status ?? 'pendente');
  return {
    total: valores.length,
    pendentes: valores.filter(v => v === 'pendente').length,
    naoValidados: valores.filter(v => v === 'nao_validado').length,
    analisadas: valores.filter(v => v === 'validado' || v === 'editado').length
  };
}

export function secaoTemPendencia(sol: Solicitacao): boolean {
  return contarStatusSecoes(sol).pendentes > 0;
}

export function secaoTemRejeicao(sol: Solicitacao): boolean {
  return contarStatusSecoes(sol).naoValidados > 0;
}
