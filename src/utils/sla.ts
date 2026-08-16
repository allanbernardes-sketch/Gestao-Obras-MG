import { Solicitacao } from '../types';

// Motor de SLA compartilhado entre as filas de Atribuição (Análise Técnica, Ajuste, Reequilíbrio,
// Saldo Complementar). Ver [[sla-atendimentos]] na memória do projeto.
//
// Três checkpoints, cada um com prazo próprio, contados em cadeia (o relógio do checkpoint N só
// começa quando o checkpoint N-1 é cumprido):
//   1. Entrada na fila → Atribuição do analista       (PRAZO_ATRIBUICAO_HORAS)
//   2. Atribuição → Analista clica em "Iniciar Análise" (PRAZO_INICIO_HORAS)
//   3. Início da análise → Conclusão (parecer/decisão)  (PRAZO_CONCLUSAO_HORAS)
//
// Valores de referência (ajustáveis aqui, num único lugar, até existirem prazos oficiais definidos).
export const SLA_PRAZOS_HORAS = {
  atribuicao: 48,   // 48h para um analista ser designado após entrar na fila
  inicio: 24,       // 24h após atribuído para o analista dar início formal à análise
  conclusao: 120,   // 5 dias úteis (120h) após o início para concluir (emitir parecer/decisão)
};

export type StatusSla = 'sem_dados' | 'no_prazo' | 'em_risco' | 'estourado' | 'concluido';

export interface ResultadoSla {
  status: StatusSla;
  horasDecorridas: number;
  horasRestantes: number; // negativo quando já estourou
}

// Abaixo de 20% do prazo restante já entra em "em risco" (amarelo) antes de estourar (vermelho).
const LIMIAR_RISCO = 0.2;

// `inicio` = quando o relógio deste checkpoint começou a contar; `fim` = quando foi cumprido
// (undefined = ainda em aberto, calcula em relação a agora). `prazoHoras` = meta deste checkpoint.
export function calcularStatusSla(inicio: string | undefined, prazoHoras: number, fim?: string): ResultadoSla {
  if (!inicio) return { status: 'sem_dados', horasDecorridas: 0, horasRestantes: prazoHoras };

  const inicioMs = new Date(inicio).getTime();
  const referenciaMs = fim ? new Date(fim).getTime() : Date.now();
  const horasDecorridas = Math.max(0, (referenciaMs - inicioMs) / (1000 * 60 * 60));
  const horasRestantes = prazoHoras - horasDecorridas;

  if (fim) return { status: 'concluido', horasDecorridas, horasRestantes };
  if (horasRestantes < 0) return { status: 'estourado', horasDecorridas, horasRestantes };
  if (horasRestantes <= prazoHoras * LIMIAR_RISCO) return { status: 'em_risco', horasDecorridas, horasRestantes };
  return { status: 'no_prazo', horasDecorridas, horasRestantes };
}

export const STATUS_SLA_INFO: Record<StatusSla, { label: string; corBadge: string; corPonto: string }> = {
  sem_dados: { label: '—', corBadge: 'bg-slate-100 text-slate-400 border border-slate-200', corPonto: 'bg-slate-300' },
  no_prazo: { label: 'No Prazo', corBadge: 'bg-emerald-100 text-emerald-700 border border-emerald-200', corPonto: 'bg-emerald-500' },
  em_risco: { label: 'Em Risco', corBadge: 'bg-amber-100 text-amber-700 border border-amber-200', corPonto: 'bg-amber-500' },
  estourado: { label: 'Atrasado', corBadge: 'bg-rose-100 text-rose-700 border border-rose-200 animate-pulse', corPonto: 'bg-rose-500' },
  concluido: { label: 'Cumprido', corBadge: 'bg-slate-100 text-slate-500 border border-slate-200', corPonto: 'bg-slate-400' },
};

// Formata horas (podendo ser fracionárias ou negativas) em texto curto tipo "2d 5h" / "-3h".
export function formatarDuracaoHoras(horas: number): string {
  const sinal = horas < 0 ? '-' : '';
  const abs = Math.abs(horas);
  const dias = Math.floor(abs / 24);
  const restoHoras = Math.round(abs % 24);
  if (dias > 0) return `${sinal}${dias}d ${restoHoras}h`;
  if (abs < 1) return `${sinal}${Math.round(abs * 60)}min`;
  return `${sinal}${Math.round(abs)}h`;
}

// Checkpoint genérico de um item que passa pela fila de Atribuição — usado para computar o SLA
// "corrente" (o checkpoint em aberto no momento) e decidir qual badge mostrar numa lista.
export interface ChecklistSlaItem {
  dataEntradaFila?: string;
  dataAtribuicao?: string;
  dataInicioAnalise?: string;
  dataConclusao?: string;
}

// Retorna o resultado do checkpoint que está "correndo" agora (o primeiro ainda não cumprido),
// já considerando itens concluídos como 'concluido' — usado para o badge resumo de uma lista.
export function calcularSlaCorrente(item: ChecklistSlaItem): ResultadoSla & { checkpoint: 'atribuicao' | 'inicio' | 'conclusao' } {
  if (!item.dataAtribuicao) {
    return { ...calcularStatusSla(item.dataEntradaFila, SLA_PRAZOS_HORAS.atribuicao), checkpoint: 'atribuicao' };
  }
  if (!item.dataInicioAnalise) {
    return { ...calcularStatusSla(item.dataAtribuicao, SLA_PRAZOS_HORAS.inicio), checkpoint: 'inicio' };
  }
  return { ...calcularStatusSla(item.dataInicioAnalise, SLA_PRAZOS_HORAS.conclusao, item.dataConclusao), checkpoint: 'conclusao' };
}

export interface AlertaSla {
  chave: string; // dedup key estável — não recria a mesma notificação numa verificação futura
  titulo: string;
  mensagem: string;
  solicitacaoId: string;
  escola: string;
}

const CHECKPOINT_LABEL: Record<'atribuicao' | 'inicio' | 'conclusao', string> = {
  atribuicao: 'atribuição de analista',
  inicio: 'início formal da análise',
  conclusao: 'conclusão da análise',
};

// Varre todas as solicitações e monta um alerta para cada checkpoint atualmente estourado — usado
// pela verificação periódica de SLA em App.tsx para gerar notificações. Ver [[sla-atendimentos]].
export function coletarAlertasSla(solicitacoes: Solicitacao[]): AlertaSla[] {
  const alertas: AlertaSla[] = [];

  const registrar = (chave: string, label: string, sol: Solicitacao, resultado: ResultadoSla & { checkpoint: 'atribuicao' | 'inicio' | 'conclusao' }) => {
    if (resultado.status !== 'estourado') return;
    alertas.push({
      chave,
      titulo: `SLA Estourado: ${label}`,
      mensagem: `${sol.nomeEscola} (${sol.id}) está ${formatarDuracaoHoras(resultado.horasRestantes)} atrasada no checkpoint de ${CHECKPOINT_LABEL[resultado.checkpoint]}.`,
      solicitacaoId: sol.id,
      escola: sol.nomeEscola,
    });
  };

  solicitacoes.forEach(sol => {
    if (sol.etapaAtual === 'analise' || sol.etapaAtual === 'correcao') {
      const resultado = calcularSlaCorrente(sol.analiseSla || {});
      registrar(`sla_analise_${sol.id}_${resultado.checkpoint}`, 'Análise Técnica', sol, resultado);
    }
    if (sol.etapaAtual === 'execucao') {
      (sol.ajustes || []).filter(a => a.status === 'analise_dore').forEach(a => {
        registrar(`sla_ajuste_${a.id}_${calcularSlaCorrente(a).checkpoint}`, `Ajuste Nº ${a.numero}`, sol, calcularSlaCorrente(a));
      });
      (sol.reequilibrios || []).filter(r => r.status === 'aguardando_analista' || r.status === 'em_analise').forEach(r => {
        registrar(`sla_reequilibrio_${r.id}_${calcularSlaCorrente(r).checkpoint}`, `Reequilíbrio ${r.id}`, sol, calcularSlaCorrente(r));
      });
      (sol.saldosComplementares || []).filter(s => s.status === 'aguardando_analista' || s.status === 'em_analise').forEach(s => {
        registrar(`sla_saldo_${s.id}_${calcularSlaCorrente(s).checkpoint}`, `Saldo Complementar ${s.id}`, sol, calcularSlaCorrente(s));
      });
    }
  });

  return alertas;
}
