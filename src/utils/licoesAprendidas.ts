// Compartilhado entre o formulário de registro (ExecucaoSubmodulos.tsx) e o painel consolidado do
// Dashboard inicial (VisaoGeralDashboard.tsx). Ver [[licoes-aprendidas-estruturadas]].

// Checklist de etapas/serviços de obra para classificação das Lições Aprendidas — multisseleção,
// pensado principalmente para obras de reforma.
export const ETAPAS_SERVICO_OBRA = [
  'Terraplenagem / Movimento de Terra',
  'Fundação',
  'Estrutura / Concretagem',
  'Reforço Estrutural',
  'Alvenaria / Vedação',
  'Cobertura / Telhado',
  'Impermeabilização',
  'Instalações Elétricas',
  'Instalações Hidrossanitárias',
  'Instalações Especiais (Climatização, Incêndio, etc.)',
  'Esquadrias',
  'Revestimento / Acabamento',
  'Pintura',
  'Segurança do Trabalho',
  'Outros',
];

export type NaturezaLicao = 'oportunidade_melhoria' | 'risco_materializado';

export const NATUREZA_LICAO_INFO: Record<NaturezaLicao, { label: string; corClassName: string; corBadge: string }> = {
  oportunidade_melhoria: {
    label: 'Oportunidade / Melhoria',
    corClassName: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    corBadge: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  },
  risco_materializado: {
    label: 'Risco Materializado',
    corClassName: 'border-rose-300 bg-rose-50 text-rose-700',
    corBadge: 'bg-rose-100 text-rose-700 border border-rose-200',
  },
};
