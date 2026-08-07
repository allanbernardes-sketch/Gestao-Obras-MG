import { Solicitacao } from '../types';

export type CodigoEtiqueta = 'EMERGENCIAL' | 'PRIORIDADE' | 'ESPECIAL' | 'EMENDA_IMPOSITIVA' | 'SEM_LIB_FINANCEIRA' | 'NORMAL';

interface RegraEtiqueta {
  codigo: CodigoEtiqueta;
  pontos: number;
  condicao: (sol: Solicitacao) => boolean;
  label: (sol: Solicitacao) => string;
  corClassName: string;
}

// Cada regra é avaliada de forma independente — um processo pode acumular várias etiquetas ao mesmo tempo.
export const REGRAS_ETIQUETA: RegraEtiqueta[] = [
  {
    codigo: 'EMERGENCIAL',
    pontos: 40,
    condicao: (sol) => (sol.tipoAtendimento || '').toUpperCase() === 'EMERGENCIAL',
    label: () => 'EMERGENCIAL',
    corClassName: 'border border-red-400 text-red-700 bg-red-50/40'
  },
  {
    codigo: 'PRIORIDADE',
    pontos: 20,
    condicao: (sol) => !!sol.prioridadeManual,
    label: () => '⭐ PRIORIDADE (ADM)',
    corClassName: 'border border-purple-400 text-purple-700 bg-purple-50/40'
  },
  {
    codigo: 'ESPECIAL',
    pontos: 20,
    condicao: (sol) => !!sol.orgaoEmissorNotificacao,
    label: (sol) => `ESPECIAL — ${sol.orgaoEmissorNotificacao}`,
    corClassName: 'border border-yellow-400 text-yellow-800 bg-yellow-50/40'
  },
  {
    codigo: 'EMENDA_IMPOSITIVA',
    pontos: 20,
    condicao: (sol) => (sol.tipoAtendimento || '').toUpperCase() === 'EMENDA' && sol.tipoEmenda === 'Impositiva',
    label: () => 'EMENDA IMPOSITIVA',
    corClassName: 'border border-blue-400 text-blue-700 bg-blue-50/40'
  },
  {
    codigo: 'SEM_LIB_FINANCEIRA',
    pontos: 10,
    condicao: (sol) => {
      const pafCalculado = !!sol.numeroPAF || !!sol.valorHomologado;
      const semAditivoPendente = !(sol.aditivos || []).some(a => a.status === 'Pendente');
      const semNecessidadeAditivo = !sol.necessidadeAditivoEstimada;
      return pafCalculado && semAditivoPendente && semNecessidadeAditivo;
    },
    label: () => 'SEM LIBERAÇÃO FINANCEIRA',
    corClassName: 'border border-emerald-400 text-emerald-700 bg-emerald-50/40'
  }
];

export const ETIQUETA_NORMAL = {
  codigo: 'NORMAL' as CodigoEtiqueta,
  pontos: 1,
  label: '⚪ NORMAL',
  corClassName: 'border border-slate-300 text-slate-500 bg-slate-50/40'
};

export interface ResultadoPrioridade {
  score: number;
  etiquetas: CodigoEtiqueta[];
}

// NORMAL só é atribuída se nenhuma outra etiqueta estiver ativa (e vale 1 ponto — score 0 não ocorre mais).
export function calcularPrioridade(sol: Solicitacao): ResultadoPrioridade {
  const ativas = REGRAS_ETIQUETA.filter(r => r.condicao(sol));
  if (ativas.length === 0) {
    return { score: ETIQUETA_NORMAL.pontos, etiquetas: ['NORMAL'] };
  }
  return {
    score: ativas.reduce((soma, r) => soma + r.pontos, 0),
    etiquetas: ativas.map(r => r.codigo)
  };
}

// 5 estrelas é regra absoluta e exclusiva de EMERGENCIAL (bypass do score).
export function calcularEstrelas(sol: Solicitacao): number {
  const { score, etiquetas } = calcularPrioridade(sol);
  if (etiquetas.includes('EMERGENCIAL')) return 5;
  if (score >= 41) return 4;
  if (score >= 20) return 3;
  if (score >= 10) return 2;
  if (score >= 1) return 1;
  return 0;
}

export function getInfoEtiqueta(codigo: CodigoEtiqueta, sol: Solicitacao): { label: string; corClassName: string } {
  if (codigo === 'NORMAL') return { label: ETIQUETA_NORMAL.label, corClassName: ETIQUETA_NORMAL.corClassName };
  const regra = REGRAS_ETIQUETA.find(r => r.codigo === codigo);
  if (!regra) return { label: codigo, corClassName: ETIQUETA_NORMAL.corClassName };
  return { label: regra.label(sol), corClassName: regra.corClassName };
}

// Ordenação da fila: estrelas primeiro (5 → 1 — EMERGENCIAL é bypass exclusivo de 5 estrelas e deve
// sempre vir antes de qualquer combinação não-emergencial, mesmo que esta tenha score numérico maior);
// score numérico desempata dentro da mesma faixa de estrelas; data de criação mais antiga desempata por último.
export function compararPorPrioridade(a: Solicitacao, b: Solicitacao): number {
  const estrelasA = a.estrelas ?? calcularEstrelas(a);
  const estrelasB = b.estrelas ?? calcularEstrelas(b);
  if (estrelasB !== estrelasA) return estrelasB - estrelasA;

  const scoreA = a.prioridadeScore ?? calcularPrioridade(a).score;
  const scoreB = b.prioridadeScore ?? calcularPrioridade(b).score;
  if (scoreB !== scoreA) return scoreB - scoreA;

  return (a.dataCriacao || '').localeCompare(b.dataCriacao || '');
}

export interface CriterioPontuacaoAutorizacao {
  criterio: string;
  pontos: number;
}

export interface PontuacaoAutorizacaoPAF {
  pontos: number;
  criterios: CriterioPontuacaoAutorizacao[];
}

// Ranking técnico específico da fila de Autorização do PAF (Etapa 3, subsecretário) — ajuda a
// priorizar entre processos já homologados na análise técnica, todos aguardando dotação orçamentária.
// Não reaproveita calcularPrioridade/compararPorPrioridade acima de propósito: aquele mecanismo
// serve a fila de Aprovação Regional (Etapa 1) e usa a data só como desempate — aqui a antiguidade
// é, por pedido explícito, um critério que soma pontos.
//
// Critérios iniciais (a discutir/ajustar):
//   1. Antiguidade — processos parados há mais tempo somam mais pontos (+1 a cada 5 dias, até 40).
//   2. Tipo de atendimento — Emergencial > Emenda Impositiva / Notificação de órgão externo > Normal.
//   3. Prioridade manual — sinalização explícita de um gestor (mesma flag usada em calcularPrioridade).
//
// Candidatos para incorporar depois (não implementados ainda): valor da obra, aditivo/ajuste
// pendente vinculado, concentração de processos por SRE, classe/complexidade IEE da obra.
export function calcularPontuacaoAutorizacaoPAF(sol: Solicitacao): PontuacaoAutorizacaoPAF {
  const criterios: CriterioPontuacaoAutorizacao[] = [];

  const dias = sol.dataCriacao
    ? Math.max(0, Math.floor((Date.now() - new Date(`${sol.dataCriacao}T00:00:00`).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const pontosIdade = Math.min(40, Math.floor(dias / 5));
  criterios.push({ criterio: `Antiguidade (${dias} dia${dias === 1 ? '' : 's'} desde o cadastro)`, pontos: pontosIdade });

  const tipo = (sol.tipoAtendimento || '').toUpperCase();
  let pontosTipo = 0;
  let labelTipo = 'Tipo de atendimento normal';
  if (tipo === 'EMERGENCIAL') {
    pontosTipo = 50;
    labelTipo = 'Atendimento Emergencial';
  } else if (tipo === 'EMENDA' && sol.tipoEmenda === 'Impositiva') {
    pontosTipo = 25;
    labelTipo = 'Emenda Impositiva';
  } else if (sol.orgaoEmissorNotificacao) {
    pontosTipo = 20;
    labelTipo = `Notificação — ${sol.orgaoEmissorNotificacao}`;
  }
  criterios.push({ criterio: labelTipo, pontos: pontosTipo });

  if (sol.prioridadeManual) {
    criterios.push({ criterio: 'Prioridade manual (gestor)', pontos: 15 });
  }

  return {
    pontos: criterios.reduce((soma, c) => soma + c.pontos, 0),
    criterios
  };
}

// Aplica calcularPrioridade/calcularEstrelas e grava o resultado nos campos do processo.
// Chamado no chokepoint único de persistência (App.tsx) para cobrir criação, atualização e ajuste de prioridade manual.
export function recalcularPrioridade(sol: Solicitacao): Solicitacao {
  const { score, etiquetas } = calcularPrioridade(sol);
  return {
    ...sol,
    prioridadeScore: score,
    etiquetasPrioridade: etiquetas,
    estrelas: calcularEstrelas(sol)
  };
}
