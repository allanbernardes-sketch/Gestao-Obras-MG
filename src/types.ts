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
  formaOcupacao?: string;
  predio?: string;
  tipoObra?: string;
  tipoAtendimento?: string;
  numPaf?: string;
  anoEmenda?: string;
  atendimentoOrgao?: string;
  formaAtendimento?: string;
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

export function syncChecklistDocs(
  documentos: DocumentoChecklist[] = [],
  notificacao?: string,
  formaAtendimento?: string
): DocumentoChecklist[] {
  let updated = [...documentos];

  // 1. Handle notification proof
  const needsNotif = notificacao && notificacao !== 'Não há notificação';
  const hasNotif = updated.some(d => d.id === 'doc_notificacao');

  if (needsNotif && !hasNotif) {
    updated.push({
      id: 'doc_notificacao',
      nome: 'Comprovante da Notificação',
      obrigatorio: true,
      desc: 'Documento de comprovação da notificação emitida pelo Órgão Regulador.',
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
      nome: 'Comprovação de Recurso (Sem Ônus)',
      obrigatorio: true,
      desc: 'Documento de comprovação de recurso para atendimento sem ônus para o Estado.',
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


