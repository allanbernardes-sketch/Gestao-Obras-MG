import { AuxiliarProcesso, EquipeAnalista } from '../types';

// Equipes de especialidade do Analista de Engenharia (DORE). Ver [[equipes-analista-auxiliares]].
export const EQUIPES_ANALISTA: EquipeAnalista[] = ['Planejamento', 'Ajuste', 'Eletrica', 'Arquitetura', 'PSCIP'];

export const EQUIPE_LABEL: Record<EquipeAnalista, string> = {
  Planejamento: 'Planejamento',
  Ajuste: 'Ajuste',
  Eletrica: 'Elétrica',
  Arquitetura: 'Arquitetura',
  PSCIP: 'PSCIP',
};

// Equipes que só entram como auxiliares de validação (nunca como titulares de Atendimento Inicial
// ou de Ajuste/Reequilíbrio/Saldo).
export const EQUIPES_AUXILIARES: Array<'Eletrica' | 'Arquitetura' | 'PSCIP'> = ['Eletrica', 'Arquitetura', 'PSCIP'];

// Um processo com auxiliares anexados só pode ser homologado pelo titular depois que todo
// auxiliar tiver dado parecer de aprovação (aprovado === true). Sem auxiliares, não há bloqueio.
export function podeHomologarComAuxiliares(auxiliares: AuxiliarProcesso[] | undefined): boolean {
  if (!auxiliares || auxiliares.length === 0) return true;
  return auxiliares.every(a => a.aprovado === true);
}

export function auxiliaresPendentes(auxiliares: AuxiliarProcesso[] | undefined): AuxiliarProcesso[] {
  return (auxiliares || []).filter(a => a.aprovado !== true);
}
