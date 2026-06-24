import { EtapaProcesso, Solicitacao } from '../types';

// Etapas elegíveis para Retorno Administrativo, em ordem — não inclui 'correcao' (estado lateral
// do Atendimento Inicial, não um avanço de fluxo) nem 'ordem_inicio'/'execucao'/'cancelado'
// (a partir da Ordem de Início a obra já está aberta; ver processoAindaModificavel).
export const ETAPAS_RETORNAVEIS: EtapaProcesso[] = ['cadastro', 'analise', 'paf_autorizacao', 'paf'];

export const ETAPA_LABEL: Record<EtapaProcesso, string> = {
  cadastro: 'Atendimento Inicial',
  analise: 'Análise Técnica',
  correcao: 'Correção de Dossiê (SRE)',
  paf_autorizacao: 'Autorização do PAF',
  paf: 'Geração de PAF',
  ordem_inicio: 'Ordem de Início',
  execucao: 'Execução de Obra',
  cancelado: 'Cancelado'
};

// Limite de ambas as funcionalidades administrativas: uma vez emitida a Ordem de Início,
// a obra já está aberta/em execução e nem Retorno de Etapa nem Cancelamento são mais permitidos.
export function processoAindaModificavel(sol: Solicitacao): boolean {
  return !['ordem_inicio', 'execucao', 'cancelado'].includes(sol.etapaAtual);
}

// Etapas anteriores à etapa atual dentro de ETAPAS_RETORNAVEIS — usado para popular o select
// "Retornar para qual etapa?" (só etapas estritamente anteriores). 'correcao' é tratado como
// equivalente a 'cadastro' (primeira posição), então não há "anteriores" a partir dele.
export function getEtapasAnteriores(etapaAtual: EtapaProcesso): EtapaProcesso[] {
  const posicaoAtual = etapaAtual === 'correcao' ? 'cadastro' : etapaAtual;
  const idx = ETAPAS_RETORNAVEIS.indexOf(posicaoAtual);
  if (idx <= 0) return [];
  return ETAPAS_RETORNAVEIS.slice(0, idx);
}
