export type EtapaProcesso = 'cadastro' | 'analise' | 'correcao' | 'paf_autorizacao' | 'paf' | 'ordem_inicio' | 'execucao' | 'cancelado';

// Modelo de validação técnica (Nível 1 — status por item, aba Dados Gerais)
export type StatusValidacao = 'pendente' | 'validado' | 'editado' | 'nao_validado';

export type SecaoDadosGerais = 'identificacao_escolar' | 'classificacao_patrimonial' | 'detalhamento_tecnico' | 'referencia_dotacao';

export interface StatusSecao {
  status: StatusValidacao;
  motivo?: string;
}

export interface DocumentoChecklist {
  id: string;
  nome: string;
  obrigatorio: boolean;
  desc: string;
  fileName?: string;
  uploadedAt?: string;
  fileSize?: string;
  fileContent?: string;
  fileType?: string;
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

export interface ParcelaPAF {
  id: string;
  valor: number;
  dataPagamento: string;
  ordemPagamento?: string;
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
  parcelasPAF?: ParcelaPAF[];
  cnpjCaixaEscolar?: string;

  // Novos campos do formulário
  codigoEndereco?: string;
  formaOcupacao?: string;
  predio?: string;
  tipoObra?: string;
  tipoAtendimento?: string;
  numPaf?: string;
  anoEmenda?: string;
  emendaImpositiva?: 'Sim' | 'Não'; // obrigatório quando tipoAtendimento = EMENDA — alimenta a etiqueta EMENDA_IMPOSITIVA
  atendimentoOrgao?: string;
  formaAtendimento?: string;
  seiMinutaOcupacao?: string;
  // Saldo de PAF anterior cancelado
  usaSaldoPafAnterior?: 'Sim' | 'Não';
  numeroPafAnteriorCancelado?: string;
  valorSaldoPafAnterior?: number;
  necessidadeAditivoEstimada?: number;
  // Classificação da Demanda (substitui notificacao)
  origemDemanda?: string;
  orgaoEmissorNotificacao?: string;
  numeroNotificacao?: string;
  dataNotificacao?: string;
  prazoAtendimentoNotificacao?: string;
  grauPrioridade?: 'Crítico' | 'Alto' | 'Médio' | 'Baixo';
  // Prioridade automática (calculada por calcularPrioridade/calcularEstrelas em src/utils/prioridade.ts)
  prioridadeManual?: boolean; // override setado pelo perfil ADM — alimenta a etiqueta PRIORIDADE
  prioridadeScore?: number; // soma dos pontos das etiquetas ativas
  estrelas?: number; // 0 a 5, derivado do score (EMERGENCIAL sempre = 5, bypass)
  etiquetasPrioridade?: string[]; // ex: ['EMERGENCIAL', 'ESPECIAL']
  // Classificação de complexidade (calculada por calcularIEE/recalcularIEE em src/utils/iee.ts) —
  // lógica independente das etiquetas/estrelas de prioridade acima; define o custo de capacidade do analista.
  iee?: number;
  ieeClasse?: 'I' | 'II' | 'III' | 'IV';
  ieePontos?: number; // 1 a 4 — quanto da capacidade (35 pts) do analista este processo consome
  ieeComplexidade?: string; // 'Baixa' | 'Média' | 'Alta' | 'Muito Alta'
  /** @deprecated use origemDemanda */
  notificacao?: string;
  descricaoFolhaRosto?: string;
  valorPlanilha?: number;
  prazoEstimadoObra?: number; // dias — seção 4 da análise DORE (Referência e Dotação Orçamentária SGO), opcional
  prazoEstimadoMeses?: number; // meses — preenchido pelo técnico no Atendimento Inicial, obrigatório, critério do IEE
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
    contratoValorInicial?: number;
    valorExecutado?: number;
    dataOrdemInicio?: string;
    ataOrdemInicioFileName?: string;
    ataOrdemInicioFileSize?: string;
    outrosAnexosOrdemInicio?: { id: string; nome: string; fileName?: string; fileSize?: string; uploadedAt?: string }[];
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
  atribuicaoForcada?: boolean; // true quando Admin/Gestor atribuiu acima da capacidade disponível do analista (Parte 4 do IEE)
  contadorAnalises?: number;
  parecerConsolidado?: string;
  historicoCorrecoes?: {
    contador: number;
    data: string;
    motivos: { label: string; campo: string; motivo: string }[];
    docsRecusados: { nome: string; id: string; justificativa: string }[];
  }[];
  statusPAF?: 'Aguardando Geração' | 'Aguardando Pagamento' | 'Pago Parcialmente' | 'Pago e Liberado';

  // Retorno de Etapa administrativo (somente Administrador, src/utils/etapas.ts) — histórico
  // estruturado exibido com badge próprio, separado de historicoEtapas.
  retornosAdministrativos?: {
    etapaOrigem: EtapaProcesso;
    etapaDestino: EtapaProcesso;
    motivo: string;
    usuario: string;
    timestamp: string;
  }[];

  // Cancelamento de Processo
  solicitacaoCancelamento?: boolean; // true enquanto a solicitação do Técnico aguarda decisão do Admin
  motivoSolicitacaoCancelamento?: string;
  solicitacaoCancelamentoPor?: string;
  solicitacaoCancelamentoData?: string;
  motivoCancelamento?: string; // justificativa final registrada pelo Admin ao executar o cancelamento
  canceladoPor?: string;
  canceladoEm?: string;

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
  cadastroObraConfirmado?: boolean;

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
  /** @deprecated substituído por statusSecoes['identificacao_escolar'] — mantido só para migração de dados antigos */
  validacaoEscolar?: 'validado' | 'nao_validado' | 'editado';
  /** @deprecated substituído por statusSecoes['identificacao_escolar'].motivo */
  motivoNaoValidacaoEscolar?: string;
  /** @deprecated campo nunca foi usado — a seção Patrimonial sempre teve status por sub-campo */
  validacaoPatrimonial?: 'validado' | 'nao_validado' | 'editado';
  /** @deprecated substituído por statusSecoes['classificacao_patrimonial'].motivo */
  motivoNaoValidacaoPatrimonial?: string;
  /** @deprecated substituído por statusSecoes['classificacao_patrimonial'] */
  validacaoFormaOcupacao?: 'validado' | 'nao_validado' | 'editado';
  /** @deprecated substituído por statusSecoes['classificacao_patrimonial'] */
  validacaoPredioEscola?: 'validado' | 'nao_validado' | 'editado';
  /** @deprecated substituído por statusSecoes['classificacao_patrimonial'] */
  validacaoTombamento?: 'validado' | 'nao_validado' | 'editado';
  /** @deprecated substituído por statusSecoes['classificacao_patrimonial'] */
  validacaoCoabitado?: 'validado' | 'nao_validado' | 'editado';
  /** @deprecated substituído por statusSecoes['detalhamento_tecnico'] */
  validacaoTecnica?: 'validado' | 'nao_validado' | 'editado';
  /** @deprecated substituído por statusSecoes['detalhamento_tecnico'].motivo */
  motivoNaoValidacaoTecnica?: string;
  /** @deprecated substituído por statusSecoes['referencia_dotacao'] */
  validacaoReferenciaDotacao?: 'validado' | 'nao_validado' | 'editado';
  /** @deprecated substituído por statusSecoes['referencia_dotacao'].motivo */
  motivoNaoValidacaoReferenciaDotacao?: string;

  // Modelo novo (Nível 1, por seção) — ver src/utils/validacaoTecnica.ts
  statusSecoes?: Record<SecaoDadosGerais, StatusSecao>;
  // Snapshot dos valores enviados pelo técnico ao entrar em "Em Análise DORE" — usado para detectar EDITADO por diff real
  valoresOriginaisTecnico?: Record<string, any>;

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

  // Saldo Complementar de Obra Distratada
  saldosComplementares?: SaldoComplementarItem[];
  // Reequilíbrio Financeiro
  reequilibrios?: ReequilibrioItem[];
}

export interface ReequilibrioItem {
  id: string;
  dataCriacao: string;
  status: 'aguardando_analista' | 'em_analise' | 'aprovado' | 'reprovado';
  analistaAtribuido?: string;
  // Etapa 1
  justificativaFileName?: string;
  justificativaFileSize?: string;
  autorizacaoDIPCFileName?: string;
  autorizacaoDIPCFileSize?: string;
  // Etapa 2
  planilhaFileName?: string;
  planilhaFileSize?: string;
  dataReferenceSEE?: string;
  descontoContratual?: number;
  valorOriginal?: number;
  valorReequilibrado?: number;
}

export interface SaldoComplementarItem {
  id: string;
  dataCriacao: string;
  status: 'aguardando_analista' | 'em_analise' | 'aprovado' | 'reprovado';
  analistaAtribuido?: string;
  // Dados financeiros
  valorTC: number;
  valorLiberado: number;
  valorPago: number;
  saldoEmConta: number;
  necessidadeAditivo: number;
  // Documentos
  documentos: { item: string; obrigatorio: boolean; checked: boolean; fileName?: string }[];
}

export type PerfilUsuario = 'tecnico_infra' | 'gestor_dore' | 'analista_dore' | 'gestor_paf' | 'fiscal_obra' | 'administrativo_dore' | 'admin';

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
  regionais?: string[];
  // Capacidade de carga de análise (preparação para futura regra de atribuição por pontos)
  capacidadeMaxima?: number; // padrão: 100 pts
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

  // 3. Em execução — etapa execucao confirmada com Ordem de Início emitida
  if (sol.etapaAtual === 'execucao' && sol.dataOrdemInicio) {
    return {
      label: 'Em execução',
      color: 'blue',
      badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
      descricao: `Ordem de Início emitida em ${new Date(sol.dataOrdemInicio).toLocaleDateString('pt-BR')}. Acompanhe o avanço pelas medições.`,
    };
  }

  // 4. Não iniciada — contrato assinado mas Ordem de Início ainda não emitida
  if (sol.empresaContratada && sol.contratoDataAssinatura) {
    return {
      label: 'Não iniciada',
      color: 'slate',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      descricao: 'Contrato registrado. Aguardando emissão da Ordem de Início na aba Acompanhamento.',
    };
  }

  // 5. Em processo de contratação — fiscal definido e obra cadastrada, sem contrato ainda
  if (sol.fiscalObraAtribuido) {
    return {
      label: 'Em processo de contratação',
      color: 'yellow',
      badgeClass: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      descricao: 'Cadastro da obra concluído e fiscal atribuído. Aguardando registro do contrato na aba Contratos.',
    };
  }

  // 6. Em cadastramento — PAF gerado, aguardando cadastro da obra e definição do fiscal
  return {
    label: 'Em cadastramento da obra',
    color: 'purple',
    badgeClass: 'bg-purple-100 text-purple-700 border-purple-200',
    descricao: 'PAF autorizado. Preencha os dados da obra e defina o fiscal para avançar para processo de contratação.',
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


