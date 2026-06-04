export type EtapaProcesso = 'cadastro' | 'analise' | 'correcao' | 'paf_autorizacao' | 'paf' | 'ordem_inicio' | 'execucao' | 'cancelado';

export interface DocumentoChecklist {
  id: string;
  nome: string;
  obrigatorio: boolean;
  desc: string;
  fileName?: string;
  uploadedAt?: string;
  fileSize?: string;
  status: 'pendente' | 'aprovado' | 'recusado' | 'nao_se_aplica';
  justificativa?: string;
}

export interface Medicao {
  id: string;
  data: string;
  valor: number;
  porcentagem: number;
  descricao: string;
  empresaNome?: string;
  empresaCnpj?: string;
  fileName?: string;
  fotos?: string[];
  numeroMedicao?: string | number;
  periodoMedicao?: string;
  responsavelMedicao?: string;
  observacoes?: string;
  porcentagemFisica?: number;
  relatorioFiscalizacaoFileName?: string;
  boletimMedicaoFileName?: string;
}

export interface Aditivo {
  id: string;
  data: string;
  tipo: 'Valor' | 'Prazo' | 'Valor e Prazo';
  valorExtra?: number;
  prazoExtraDias?: number;
  justificativa: string;
  status: 'Pendente' | 'Aprovado' | 'Recusado';
  // Novo fluxo espelhado de cadastro do aditivo
  documentos?: DocumentoChecklist[];
  analistaAtribuido?: string;
  numeroAditivo?: string;
  parecerConsolidado?: string;
  
  // Detalhamento estendido do pedido de aditivo/ajuste
  supressao?: number;
  reprogramacao?: 'Sim' | 'Não';
  saldoComplementar?: 'Sim' | 'Não';
  valorAditivo?: number;  // Valor do aditivo líquido
  percentualContrato?: number;
  checklistDocs?: { item: string; checked: boolean }[];
}

export interface AjustePlanilha {
  id: string;
  numero: number;
  tipoAjuste: 'sem_alteracao_meta' | 'com_alteracao_meta' | 'com_alteracao_meta_projeto' | 'sem_alteracao_meta_com_projeto';
  valorAjuste: number;
  responsavelPlanilha: string;
  registroProfissional: string; // CREA/CAU/CFT
  ajusteReferente: 'atendimento_inicial' | 'saldo_nova_cotacao';
  valorContrato: number;
  diferencaPlanilhas: number;
  desconto: number;
  avancoFisico: number;
  observacoes: string;
  dataCriacao: string;
  status: 'em_elaboracao' | 'analise_dore' | 'validado';
  analistaAtribuido?: string;
  planilhaAjusteFileName?: string;
  planilhaAjusteFileSize?: string;
  planilhaAjusteUploadedAt?: string;
  parecerDore?: string;

  // Detalhamento estendido do pedido de ajuste
  supressao?: number;
  reprogramacao?: 'Sim' | 'Não';
  saldoComplementar?: 'Sim' | 'Não';
  valorAditivo?: number; // Valor líquido do ajuste
  percentualContrato?: number;
  checklistDocs?: { item: string; checked: boolean }[];
}

export interface Solicitacao {
  id: string;
  nomeEscola: string;
  codesc: string;
  tipo: string;
  municipio: string;
  sre: string;
  dataCriacao: string;
  etapaAtual: EtapaProcesso;
  historicoEtapas: { etapa: EtapaProcesso; data: string; responsavel: string }[];
  
  // Checklist de documentos
  documentos: DocumentoChecklist[];

  // Informações do PAF
  valorHomologado?: number;
  numeroPAF?: string;
  dataHomologacao?: string;
  dataVigenciaPAF?: string;
  dataFinHomologacao?: string;
  pago?: boolean;

  // Novos campos do formulário
  codigoEndereco?: string;
  formaOcupacao?: string;
  predio?: string;
  tipoObra?: string;
  tipoAtendimento?: string;
  numPaf?: string;
  anoEmenda?: string;
  atendimentoOrgao?: string;
  formaAtendimento?: string;
  seiMinutaOcupacao?: string;
  // Classificação da Demanda (substitui notificacao)
  origemDemanda?: string;
  orgaoEmissorNotificacao?: string;
  numeroNotificacao?: string;
  dataNotificacao?: string;
  prazoAtendimentoNotificacao?: string;
  grauPrioridade?: 'Crítico' | 'Alto' | 'Médio' | 'Baixo';
  /** @deprecated use origemDemanda */
  notificacao?: string;
  descricaoFolhaRosto?: string;
  valorPlanilha?: number;
  iss?: string;
  responsavel?: string;
  tombado?: string;
  orgaoTombador?: string;
  coabitado?: string;
  tipoCoabitado?: string;
  fichaVerificada?: boolean;
  fichaVerificadaPor?: string;
  fichaVerificadaData?: string;
  observacoesFicha?: string;

  // Informações da obra
  empresaContratada?: string;
  cnpjEmpresa?: string;
  statusContratoEmpresa?: 'Ativa' | 'Distratada';
  contratoValorInicial?: number;
  contratoDataAssinatura?: string;
  contratoInicioVigencia?: string;
  contratoFimVigencia?: string;
  garantiaExigida?: 'Fiança Bancária' | 'Seguro Garantia' | 'Caução em Dinheiro' | 'Títulos da Dívida Pública' | 'Sem Garantia' | string;
  garantiaValor?: number;
  garantiaTipo?: string;
  garantiaValidade?: string;
  empresasAnteriores?: { 
    id: string; 
    nome: string; 
    cnpj: string; 
    avancoFisicoOriginal: number;
    dataOrdemInicio?: string;
    previsaoTerminoObra?: string;
    valorHomologadoContratacao?: number;
    cronogramaFisicoFinanceiroFileName?: string;
    cronogramaFisicoFinanceiroFileSize?: string;
    cronogramaFisicoFinanceiroUploadedAt?: string;
    fiscalObraAtribuido?: string;
    duracaoObraMeses?: number;
    classeObra?: string;
    pontuacaoComplexidade?: number;
    justificativaDistrato?: string;
    dataDistrato?: string;
    documentoDistratoFileName?: string;
    documentoDistratoFileSize?: string;
    documentoDistratoUploadedAt?: string;
  }[];
  statusObra?: 'Não Iniciada' | 'Em Andamento' | 'Paralisada' | 'Concluída';
  medicoes: Medicao[];
  aditivos: Aditivo[];
  ajustes?: AjustePlanilha[];
  analistasSugeridos?: string[];
  analistaAtribuido?: string;
  contadorAnalises?: number;
  parecerConsolidado?: string;
  statusPAF?: 'Aguardando Geração' | 'Aguardando Pagamento' | 'Pago e Liberado';

  // Campos específicos da Ordem de Início (Atividade 4 / Novo status)
  dataOrdemInicio?: string;
  previsaoTerminoObra?: string;
  valorHomologadoContratacao?: number;
  cronogramaFisicoFinanceiroFileName?: string;
  cronogramaFisicoFinanceiroFileSize?: string;
  cronogramaFisicoFinanceiroUploadedAt?: string;
  ataOrdemInicioFileName?: string;
  ataOrdemInicioFileSize?: string;
  ataOrdemInicioUploadedAt?: string;
  outrosAnexosOrdemInicio?: { id: string; nome: string; fileName?: string; fileSize?: string; uploadedAt?: string }[];
  duracaoObraMeses?: number;
  classeObra?: string;
  pontuacaoComplexidade?: number;
  fiscalObraAtribuido?: string;

  // Campos específicos do Distrato
  justificativaDistrato?: string;
  dataDistrato?: string;
  documentoDistratoFileName?: string;
  documentoDistratoFileSize?: string;
  documentoDistratoUploadedAt?: string;

  // Campos específicos de Paralisação
  dataParalizacao?: string;
  justificativaParalizacao?: string;

  // Campos específicos de Conclusão de Obra
  dataConclusao?: string;
  laudoConclusivoFileName?: string;
  laudoConclusivoFileSize?: string;
  laudoConclusivoUploadedAt?: string;
  relatorioFotograficoFileName?: string;
  relatorioFotograficoFileSize?: string;
  relatorioFotograficoUploadedAt?: string;
  planilhaMedicaoFinalFileName?: string;
  planilhaMedicaoFinalFileSize?: string;
  planilhaMedicaoFinalUploadedAt?: string;

  // Validações da aba Análise de Processo
  validacaoEscolar?: 'validado' | 'nao_validado' | 'editado';
  motivoNaoValidacaoEscolar?: string;
  validacaoPatrimonial?: 'validado' | 'nao_validado' | 'editado';
  motivoNaoValidacaoPatrimonial?: string;
  validacaoFormaOcupacao?: 'validado' | 'nao_validado' | 'editado';
  validacaoPredioEscola?: 'validado' | 'nao_validado' | 'editado';
  validacaoTombamento?: 'validado' | 'nao_validado' | 'editado';
  validacaoCoabitado?: 'validado' | 'nao_validado' | 'editado';
  validacaoTecnica?: 'validado' | 'nao_validado' | 'editado';
  motivoNaoValidacaoTecnica?: string;
  validacaoReferenciaDotacao?: 'validado' | 'nao_validado' | 'editado';
  motivoNaoValidacaoReferenciaDotacao?: string;
  observacoesAnalistaDadosGerais?: string;
  observacoesAnalistaChecklist?: string;
  outrosDocumentos?: DocumentoChecklist[];

  // Submenu de Acompanhamento da Obra
  diariosObra?: {
    id: string;
    data: string;
    texto: string;
    autor: string;
    categoria?: 'Ocorrência' | 'Clima' | 'Trabalho' | 'Materiais' | 'Equipe' | 'Segurança';
    anexoFoto?: string;
  }[];
  restricoesObra?: {
    id: string;
    descricao: string;
    dataIdentificacao: string;
    impacto: 'Alto' | 'Médio' | 'Baixo';
    status: 'Ativa' | 'Resolvida';
    previsaoResolucao?: string;
    resolvidaEm?: string;
    parecerResolucao?: string;
    categoria?: 'Financeira' | 'Ambiental' | 'Técnica' | 'Climática' | 'Fornecedor' | 'Outros';
  }[];
  vistoriasObra?: {
    id: string;
    dataVistoria: string;
    vistoriador: string;
    laudoResumido: string;
    resultado: 'Aprovada' | 'Aprovada com Ressalvas' | 'Reprovada';
    fotosLaudos?: string[];
  }[];
}

export type PerfilUsuario = 'tecnico_infra' | 'gestor_dore' | 'analista_dore' | 'gestor_paf' | 'fiscal_obra' | 'administrativo_dore';

export interface UsuarioSistema {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario | string;
  departamento: string;
  // Dados profissionais estendidos
  cargo?: string;
  formacao?: string;
  creaNum?: string;
  creaSituacao?: 'Ativo' | 'Inativo';
  dataIngresso?: string;
  situacaoFuncional?: 'Ativo' | 'Férias' | 'Licença' | 'Afastado' | 'Desligado';
  dataUltimaAtualizacao?: string;
  tipoVinculo?: 'regional' | 'orgao_central';
  equipeCentral?: string;
}

export type StatusObraComputado =
  | 'Em cadastramento da obra'
  | 'Em processo de contratação'
  | 'Não iniciada'
  | 'Em execução'
  | 'Paralisada'
  | 'Concluída';

export interface StatusObraInfo {
  label: StatusObraComputado;
  color: 'purple' | 'yellow' | 'slate' | 'blue' | 'orange' | 'green';
  badgeClass: string;
  descricao: string;
}

export function computeStatusObra(sol: Solicitacao): StatusObraInfo {
  // 1. Paralisada — override manual via botão
  if (sol.statusObra === 'Paralisada' && sol.justificativaParalizacao) {
    return {
      label: 'Paralisada',
      color: 'orange',
      badgeClass: 'bg-orange-100 text-orange-700 border-orange-200',
      descricao: `Obra paralisada em ${sol.dataParalizacao ? new Date(sol.dataParalizacao).toLocaleDateString('pt-BR') : '---'}. Motivo: ${sol.justificativaParalizacao}.`,
    };
  }

  // 2. Concluída — medições atingem 100% do orçamento
  const totalMed = sol.medicoes?.reduce((s, m) => s + m.valor, 0) || 0;
  const orcamento = sol.valorPlanilha || sol.valorHomologadoContratacao || 0;
  if (orcamento > 0 && totalMed >= orcamento) {
    return {
      label: 'Concluída',
      color: 'green',
      badgeClass: 'bg-green-100 text-green-700 border-green-200',
      descricao: 'Medições atingiram 100% do orçamento. Obra pronta para recebimento e Termo de Conclusão.',
    };
  }

  // 3. Em execução — Ordem de Início preenchida e medições em andamento
  if (sol.dataOrdemInicio) {
    return {
      label: 'Em execução',
      color: 'blue',
      badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
      descricao: `Ordem de Início emitida em ${new Date(sol.dataOrdemInicio).toLocaleDateString('pt-BR')}. Acompanhe o avanço pelas medições.`,
    };
  }

  // 4. Não iniciada — contrato assinado mas sem Ordem de Início
  if (sol.empresaContratada && sol.contratoDataAssinatura) {
    return {
      label: 'Não iniciada',
      color: 'slate',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      descricao: 'Contrato registrado. Aguardando emissão da Ordem de Início na aba Acompanhamento.',
    };
  }

  // 5. Em processo de contratação — cadastro feito (valorPlanilha) mas sem contrato
  if (sol.valorPlanilha) {
    return {
      label: 'Em processo de contratação',
      color: 'yellow',
      badgeClass: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      descricao: 'Cadastro da obra concluído. Aguardando registro do contrato na aba Contratos.',
    };
  }

  // 6. Em cadastramento — PAF gerado mas dados da obra ainda não preenchidos
  return {
    label: 'Em cadastramento da obra',
    color: 'purple',
    badgeClass: 'bg-purple-100 text-purple-700 border-purple-200',
    descricao: 'PAF autorizado. Aguardando preenchimento do cadastro da obra pelo engenheiro responsável.',
  };
}

export function syncChecklistDocs(
  documentos: DocumentoChecklist[] = [],
  /** origemDemanda: nova forma; notificacao: retrocompatibilidade */
  origemOuNotificacao?: string,
  formaAtendimento?: string
): DocumentoChecklist[] {
  let updated = [...documentos];

  // 1. Documento da Notificação — exigido quando origem = 'Notificação' ou 'Determinação Judicial'
  const origensDemandaComDoc = ['Notificação', 'Determinação Judicial'];
  const needsNotif =
    origensDemandaComDoc.includes(origemOuNotificacao || '') ||
    (origemOuNotificacao && origemOuNotificacao !== 'Não há notificação' && !['Solicitação da Escola', 'Solicitação da SRE', 'Programa Governamental', 'Fiscalização', 'Atendimento Político'].includes(origemOuNotificacao));
  const hasNotif = updated.some(d => d.id === 'doc_notificacao');

  if (needsNotif && !hasNotif) {
    updated.push({
      id: 'doc_notificacao',
      nome: 'Documento da Notificação',
      obrigatorio: true,
      desc: 'Documento referente à notificação emitida pelo órgão competente.',
      status: 'pendente'
    });
  } else if (!needsNotif && hasNotif) {
    updated = updated.filter(d => d.id !== 'doc_notificacao');
  }

  // 2. Handle sem ônus resource proof
  const needsSemOnus = formaAtendimento && formaAtendimento.toUpperCase() === 'SEM ÔNUS';
  const hasSemOnus = updated.some(d => d.id === 'doc_recurso_sem_onus');

  if (needsSemOnus && !hasSemOnus) {
    updated.push({
      id: 'doc_recurso_sem_onus',
      nome: 'Comprovação de recurso',
      obrigatorio: true,
      desc: 'Documento de comprovação do recurso para atendimento sem ônus para o Estado.',
      status: 'pendente'
    });
  } else if (!needsSemOnus && hasSemOnus) {
    updated = updated.filter(d => d.id !== 'doc_recurso_sem_onus');
  }

  return updated;
}

export interface EmpresaSeguranca {
  id: string;
  nome: string;
  cnpj: string;
  responsavelTecnico?: string;
  situacaoCadastral?: 'Pendente' | 'Regular' | 'Bloqueado' | string;
  telefone?: string;
  email?: string;
}

export interface SistemaLog {
  id: string;
  dataHora: string;
  usuario: string;
  perfil: string;
  acao: string;
  detalhe: string;
  tipo: 'info' | 'sucesso' | 'alerta' | 'erro';
  solicitacaoId?: string;
  escola?: string;
}

export interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  dataHora: string;
  lida: boolean;
  tipo: 'processo_avanco' | 'processo_retrocesso' | 'aditivo_pendente' | 'ajuste_pendente' | 'sistema' | 'alerta';
  solicitacaoId?: string;
  escola?: string;
}


