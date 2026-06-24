import { Solicitacao } from '../types';

// Índice de Esforço Estimado (IEE) — classificação de complexidade da obra, independente
// das etiquetas de prioridade/estrelas de src/utils/prioridade.ts. Define a quantidade de
// pontos de capacidade que o processo consome da carga de um Analista de Engenharia (DORE).
export type ClasseIEE = 'I' | 'II' | 'III' | 'IV';

export interface ResultadoIEE {
  nota_valor: number;
  nota_tipo: number;
  nota_prazo: number;
  iee: number;
  classe: ClasseIEE;
  pontos: number;
  complexidade: string;
}

function notaValor(valorPlanilha: number): number {
  if (valorPlanilha <= 100_000) return 1;
  if (valorPlanilha <= 500_000) return 2;
  if (valorPlanilha <= 1_000_000) return 3;
  if (valorPlanilha <= 2_000_000) return 4;
  return 5;
}

// "Projeto" da tabela do IEE corresponde ao tipo de obra "Engenheiro para Elaboração de Projeto" do sistema.
const NOTA_TIPO_OBRA: Record<string, number> = {
  'ENGENHEIRO PARA ELABORAÇÃO DE PROJETO': 1,
  'ACESSIBILIDADE': 2,
  'REFORMA': 3,
  'AMPLIAÇÃO': 4,
  'QUADRA': 4,
  'CONSTRUÇÃO': 5
};

// Fallback para REFORMA (nota intermediária) caso o tipo de obra não esteja mapeado — não deve ocorrer
// com os valores hoje cadastrados no sistema, mas evita que a função quebre com dados legados/futuros.
function notaTipo(tipoObra: string): number {
  return NOTA_TIPO_OBRA[tipoObra.toUpperCase()] ?? 3;
}

function notaPrazo(prazoMeses: number): number {
  if (prazoMeses <= 3) return 1;
  if (prazoMeses <= 6) return 2;
  if (prazoMeses <= 9) return 3;
  if (prazoMeses <= 12) return 4;
  return 5;
}

function classificarIEE(iee: number): { classe: ClasseIEE; pontos: number; complexidade: string } {
  if (iee >= 3.8) return { classe: 'IV', pontos: 4, complexidade: 'Muito Alta' };
  if (iee >= 3.2) return { classe: 'III', pontos: 3, complexidade: 'Alta' };
  if (iee >= 2.0) return { classe: 'II', pontos: 2, complexidade: 'Média' };
  return { classe: 'I', pontos: 1, complexidade: 'Baixa' };
}

// Retorna null quando algum dos 3 critérios ainda não foi preenchido (ex: processo legado
// criado antes do campo prazoEstimadoMeses existir) — chamadores devem tratar a ausência de IEE.
export function calcularIEE(sol: Solicitacao): ResultadoIEE | null {
  // tipoObra é o campo preenchido no Atendimento Inicial; tipo é o campo legado que a tela de
  // análise DORE (ProcessAnalysisPanel) ainda usa para editar o tipo de obra — caem fora de sincronia
  // quando o engenheiro altera o tipo durante a análise, então tipoObra tem prioridade com tipo como fallback.
  const tipoObra = sol.tipoObra || sol.tipo;
  if (sol.valorPlanilha == null || !tipoObra || sol.prazoEstimadoMeses == null) {
    return null;
  }

  const nota_valor = notaValor(sol.valorPlanilha);
  const nota_tipo = notaTipo(tipoObra);
  const nota_prazo = notaPrazo(sol.prazoEstimadoMeses);
  const iee = Math.round((nota_valor * 0.75 + nota_tipo * 0.15 + nota_prazo * 0.10) * 100) / 100;
  const { classe, pontos, complexidade } = classificarIEE(iee);

  return { nota_valor, nota_tipo, nota_prazo, iee, classe, pontos, complexidade };
}

export const CLASSE_IEE_INFO: Record<ClasseIEE, { label: string; corClassName: string }> = {
  I:   { label: 'Classe I',   corClassName: 'border border-sky-300 text-sky-700 bg-sky-50' },
  II:  { label: 'Classe II',  corClassName: 'border border-yellow-400 text-yellow-800 bg-yellow-50' },
  III: { label: 'Classe III', corClassName: 'border border-orange-400 text-orange-800 bg-orange-50' },
  IV:  { label: 'Classe IV',  corClassName: 'border border-red-800 text-white bg-red-800' }
};

// Aplica calcularIEE() e grava o resultado no modelo do processo — chamado no chokepoint único
// de persistência (App.tsx), igual a recalcularPrioridade, para cobrir criação e qualquer edição
// dos campos que afetam o índice (valorPlanilha, tipoObra, prazoEstimadoMeses).
export function recalcularIEE(sol: Solicitacao): Solicitacao {
  const resultado = calcularIEE(sol);
  if (!resultado) {
    return { ...sol, iee: undefined, ieeClasse: undefined, ieePontos: undefined, ieeComplexidade: undefined };
  }
  return {
    ...sol,
    iee: resultado.iee,
    ieeClasse: resultado.classe,
    ieePontos: resultado.pontos,
    ieeComplexidade: resultado.complexidade
  };
}

// Soma os pontos IEE dos processos atualmente atribuídos a um analista e ainda em análise —
// é a "carga" usada para validar a capacidade máxima de 35 pontos (Parte 4).
export function getPontosIEEEmUso(nomeAnalista: string, solicitacoes: Solicitacao[]): number {
  return solicitacoes
    .filter(s => s.etapaAtual === 'analise' && s.analistaAtribuido === nomeAnalista)
    .reduce((soma, s) => soma + (s.ieePontos || 0), 0);
}

export const CAPACIDADE_MAXIMA_ANALISTA = 35;

export function getPontosIEEDisponiveis(nomeAnalista: string, solicitacoes: Solicitacao[]): number {
  return CAPACIDADE_MAXIMA_ANALISTA - getPontosIEEEmUso(nomeAnalista, solicitacoes);
}
