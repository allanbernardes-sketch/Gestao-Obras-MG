export type EtapaProcesso = 'cadastro' | 'analise' | 'correcao' | 'paf_autorizacao' | 'paf' | 'ordem_inicio' | 'execucao' | 'cancelado';

// Equipe de especialidade do Analista de Engenharia (DORE). Planejamento = Atendimento Inicial
// (Análise Técnica); Ajuste = Ajuste de Planilha/Reequilíbrio/Saldo Complementar; as demais
// (Elétrica, Arquitetura, PSCIP) só entram como auxiliares de validação em processos das outras
// duas equipes. Ver [[equipes-analista-auxiliares]].
export type EquipeAnalista = 'Planejamento' | 'Ajuste' | 'Eletrica' | 'Arquitetura' | 'PSCIP';

// Auxiliar de validação: analista de uma equipe de especialidade (Elétrica/Arquitetura/PSCIP)
// anexado a um processo de outra equipe pra dar parecer técnico da própria área. O processo só
// pode ser homologado pelo analista titular depois que todo auxiliar tiver `aprovado === true`.
export interface AuxiliarProcesso {
  id: string;
  nome: string;
  usuarioId?: string;
  equipe: 'Eletrica' | 'Arquitetura' | 'PSCIP';
  parecer?: string;
  aprovado?: boolean;
  dataParecer?: string;
  atribuidoPor?: string;
}

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
  arquivoDevolucaoFileName?: string;
  arquivoDevolucaoFileSize?: string;
  arquivoDevolucaoFileContent?: string;
  arquivoDevolucaoFileType?: string;
  arquivoDevolucaoUploadedAt?: string;
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
  // Anexados após a homologação da medição (public.documentos, categoria medicao_*)
  comprovantePagamentoDocId?: string;
  comprovantePagamentoFileName?: string;
  notaFiscalDocId?: string;
  notaFiscalFileName?: string;
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
  checklistDocs?: { item: string; checked: boolean; fileName?: string }[];
}

// Campos de SLA (checkpoints de tempo) reaproveitados por todo item que passa pela fila de
// Atribuição (AjustePlanilha, ReequilibrioItem, SaldoComplementarItem e Solicitacao.analiseSla).
// Ver [[sla-atendimentos]] e src/utils/sla.ts — os nomes dos campos aqui casam com
// ChecklistSlaItem daquele arquivo de propósito.
export interface ChecklistSla {
  dataEntradaFila?: string;   // timestamp ISO — quando entrou na fila (liberado pelo coordenador)
  dataAtribuicao?: string;    // timestamp ISO — quando um analista foi designado
  dataInicioAnalise?: string; // timestamp ISO — quando o analista clicou em "Iniciar Análise"
  dataConclusao?: string;     // timestamp ISO — quando o parecer/decisão foi registrado
}

export interface AjustePlanilha extends ChecklistSla {
  id: string;
  numero: number;
  tipoAjuste: 'sem_alteracao_meta' | 'com_alteracao_meta' | 'com_alteracao_meta_projeto' | 'sem_alteracao_meta_com_projeto' | 'ajuste_sem_meta_com_projeto';
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
  // 'aguardando_coordenador' = enviado pelo fiscal, aguardando aprovação do coordenador regional antes
  // de entrar na fila de Atribuição da DORE (banco: 'pendente'). Ver [[gate-coordenador-execucao]].
  status: 'aguardando_coordenador' | 'em_elaboracao' | 'analise_dore' | 'validado';
  analistaAtribuido?: string;
  planilhaAjusteFileName?: string;
  planilhaAjusteFileSize?: string;
  planilhaAjusteUploadedAt?: string;
  parecerDore?: string;
  // Auxiliares de validação (Elétrica/Arquitetura/PSCIP). Ver [[equipes-analista-auxiliares]].
  auxiliares?: AuxiliarProcesso[];
  // Aprovação do Coordenador Regional — gate leve antes da fila de Atribuição da DORE (mesmo padrão de
  // Solicitacao.statusAprovacaoRegional).
  coordenadorAprovador?: string;
  dataAprovacaoCoordenador?: string;
  justificativaReprovacaoCoordenador?: string;

  // Detalhamento estendido do pedido de ajuste
  supressao?: number;
  reprogramacao?: 'Sim' | 'Não';
  saldoComplementar?: 'Sim' | 'Não';
  valorAditivo?: number; // Valor líquido do ajuste
  percentualContrato?: number;
  checklistDocs?: { item: string; checked: boolean; fileName?: string }[];
}

export interface ParcelaPAF {
  id: string;
  valor: number;
  dataPagamento: string;
  ordemPagamento?: string;
}

export interface Solicitacao {
  id: string;
  _dbId?: string; // uuid real da linha em solicitacoes (Supabase) — uso interno, não exibir na UI
  nomeEscola: string;
  codesc: string;
  tipo: string;
  municipio: string;
  sre: string;
  dataCriacao: string;
  etapaAtual: EtapaProcesso;
  historicoEtapas: { etapa: EtapaProcesso; data: string; responsavel: string }[];

  // Aprovação do Coordenador Regional — gate leve sobre o estágio 'cadastro', não altera EtapaProcesso.
  // undefined = rascunho (ainda não enviado); 'pendente' = enviado, aguardando o coordenador da SRE;
  // 'reprovado' = coordenador devolveu para o técnico corrigir (ver justificativaReprovacaoRegional);
  // 'aprovado' = liberado para análise (marca histórica; a partir daí etapaAtual já é 'analise').
  statusAprovacaoRegional?: 'pendente' | 'aprovado' | 'reprovado';
  coordenadorAprovador?: string;
  dataAprovacaoRegional?: string;
  justificativaReprovacaoRegional?: string;

  // Checklist de documentos
  documentos: DocumentoChecklist[];

  // Informações do PAF
  valorHomologado?: number;
  numeroPAF?: string;
  dataHomologacao?: string;
  dataVigenciaPAF?: string;
  dataFinHomologacao?: string;
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
  // Obrigatório quando tipoAtendimento = EMENDA. Só 'Impositiva' alimenta a etiqueta
  // EMENDA_IMPOSITIVA e a pontuação de ranking (ver src/utils/prioridade.ts).
  tipoEmenda?: 'Impositiva' | 'Parceria Por Escolas Melhores' | 'Federal';
  numeroIndicacaoEmenda?: string; // obrigatório quando tipoAtendimento = EMENDA
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
  descricaoFolhaRosto?: string;
  valorPlanilha?: number;
  prazoEstimadoObra?: number; // meses — seção 4 da análise DORE (Referência e Dotação Orçamentária SGO), opcional
  prazoEstimadoMeses?: number; // meses — preenchido pelo técnico no Atendimento Inicial, obrigatório, critério do IEE
  iss?: string;
  responsavel?: string;
  tombado?: string;
  orgaoTombador?: string;
  coabitado?: string;
  tipoCoabitado?: string;
  fichaVerificada?: boolean;
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
    // Anexos adicionais da Ordem de Início cuja exigência varia pela Classe (I–IV) da obra —
    // ver ANEXOS_ORDEM_INICIO_POR_CLASSE em SolicitacaoDetalhes.tsx.
    anexosOrdemInicio?: Record<string, { fileName: string; fileSize?: string; uploadedAt?: string }>;
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
  analistaAtribuido?: string;
  // SLA da Análise Técnica (Etapa 2) — checkpoints de tempo entrada na fila → atribuição → início
  // (botão "Iniciar Análise") → conclusão. Ver [[sla-atendimentos]] e src/utils/sla.ts.
  analiseSla?: ChecklistSla;
  // Auxiliares de validação (Elétrica/Arquitetura/PSCIP) anexados ao Atendimento Inicial. Ver [[equipes-analista-auxiliares]].
  auxiliares?: AuxiliarProcesso[];
  atribuicaoForcada?: boolean; // true quando Admin/Gestor atribuiu acima da capacidade disponível do analista (Parte 4 do IEE)
  contadorAnalises?: number;
  parecerConsolidado?: string;
  historicoCorrecoes?: {
    contador: number;
    data: string;
    motivos: { label: string; campo: string; motivo: string }[];
    docsRecusados: { nome: string; id: string; justificativa: string }[];
    justificativaAdicional?: string;
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
  // Anexos adicionais da Ordem de Início cuja exigência varia pela Classe (I–IV) da obra —
  // ver ANEXOS_ORDEM_INICIO_POR_CLASSE em SolicitacaoDetalhes.tsx. Cronograma Físico-Financeiro
  // continua nos campos legados acima (item 'a', exigido em toda classe).
  anexosOrdemInicio?: Record<string, { fileName: string; fileSize?: string; uploadedAt?: string }>;
  ataOrdemInicioFileName?: string;
  ataOrdemInicioFileSize?: string;
  ataOrdemInicioUploadedAt?: string;
  outrosAnexosOrdemInicio?: { id: string; nome: string; fileName?: string; fileSize?: string; uploadedAt?: string }[];
  duracaoObraMeses?: number;
  classeObra?: string;
  pontuacaoComplexidade?: number;
  fiscalObraAtribuido?: string;
  fiscalObraAtribuidoId?: string;
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
  // Termo de Aceite Provisório — data informada é a que conta para a regra dos 90 dias
  // (não a data de upload do arquivo, que pode ser posterior à emissão do termo)
  termoAceiteProvisorioData?: string;
  termoAceiteProvisorioFileName?: string;
  termoAceiteProvisorioFileSize?: string;
  termoAceiteProvisorioUploadedAt?: string;
  // Termo de Aceite Definitivo — só pode ser anexado após 90 dias corridos da data do termo provisório
  termoAceiteDefinitivoData?: string;
  termoAceiteDefinitivoFileName?: string;
  termoAceiteDefinitivoFileSize?: string;
  termoAceiteDefinitivoUploadedAt?: string;

  // Modelo novo (Nível 1, por seção) — ver src/utils/validacaoTecnica.ts
  statusSecoes?: Record<SecaoDadosGerais, StatusSecao>;
  // Snapshot dos valores enviados pelo técnico ao entrar em "Em Análise DORE" — usado para detectar EDITADO por diff real
  valoresOriginaisTecnico?: Record<string, any>;

  observacoesAnalistaChecklist?: string;
  outrosDocumentos?: DocumentoChecklist[];

  // Checklist de documentos obrigatórios da GED (Execução → Documentações), anexados pelo
  // fiscal da obra — ver montarChecklistGED. Itens obrigatórios bloqueiam a Conclusão de Obra.
  documentosGED?: DocumentoChecklist[];

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
    resultado?: string;
    nomeRelatorio?: string;
    tamanhoRelatorio?: string;
  }[];
  // Lições aprendidas — preenchidas pelo engenheiro; pelo menos 1 é exigida para liberar o
  // encerramento da obra (checklist de conclusão em SolicitacaoDetalhes). Ver [[licoes-aprendidas-estruturadas]].
  licoesAprendidas?: {
    id: string;
    descricao: string;
    // Área administrativa do relato — eixo legado, ortogonal ao checklist de etapas/serviços abaixo.
    categoria?: 'Técnica' | 'Gestão' | 'Cronograma' | 'Fornecedor' | 'Financeira' | 'Outros';
    // Checklist (multisseleção) das etapas/serviços de obra a que a lição se refere — ver ETAPAS_SERVICO_OBRA.
    etapasServico?: string[];
    // Natureza: não qualifica a obra/responsável, só indica como o aprendizado deve ser usado em obras futuras.
    natureza?: 'oportunidade_melhoria' | 'risco_materializado';
    // Orientação/ação recomendada para obras futuras, decorrente da lição.
    recomendacao?: string;
    // Evidências (fotos, vídeos ou outros registros) — mesmo padrão simulado de upload usado no restante do app.
    evidencias?: { nome: string; tamanho: string; tipo?: 'foto' | 'video' | 'documento' }[];
    dataRegistro: string;
    autor?: string;
  }[];

  // Saldo Complementar de Obra Distratada
  saldosComplementares?: SaldoComplementarItem[];
  // Reequilíbrio Financeiro
  reequilibrios?: ReequilibrioItem[];
}

// 'aguardando_coordenador' = enviado pelo fiscal, aguardando aprovação do coordenador regional antes
// de entrar na fila de Atribuição da DORE. 'aguardando_liberacao_financeira' = aprovado tecnicamente
// pelo analista DORE, aguardando o Subsecretário de Administração (gestor_paf) liberar o recurso
// financeiro. Ver [[gate-coordenador-execucao]] e [[gate-liberacao-financeira]].
export type StatusItemFinanceiroExecucao = 'aguardando_coordenador' | 'aguardando_analista' | 'em_analise' | 'aguardando_liberacao_financeira' | 'aprovado' | 'reprovado';

export interface ReequilibrioItem extends ChecklistSla {
  id: string;
  dataCriacao: string;
  status: StatusItemFinanceiroExecucao;
  analistaAtribuido?: string;
  coordenadorAprovador?: string;
  dataAprovacaoCoordenador?: string;
  justificativaReprovacaoCoordenador?: string;
  // Parecer técnico do analista DORE (homologação/recusa) — ver [[gate-liberacao-financeira]].
  parecerDore?: string;
  // Liberação financeira final pelo Subsecretário de Administração (gestor_paf / Silas Fagundes)
  liberadoPor?: string;
  dataLiberacaoFinanceira?: string;
  justificativaReprovacaoFinanceira?: string;
  // Auxiliares de validação (Elétrica/Arquitetura/PSCIP). Ver [[equipes-analista-auxiliares]].
  auxiliares?: AuxiliarProcesso[];
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

export interface SaldoComplementarItem extends ChecklistSla {
  id: string;
  dataCriacao: string;
  status: StatusItemFinanceiroExecucao;
  analistaAtribuido?: string;
  coordenadorAprovador?: string;
  dataAprovacaoCoordenador?: string;
  justificativaReprovacaoCoordenador?: string;
  // Liberação financeira final pelo Subsecretário de Administração (gestor_paf / Silas Fagundes)
  liberadoPor?: string;
  dataLiberacaoFinanceira?: string;
  justificativaReprovacaoFinanceira?: string;
  // Auxiliares de validação (Elétrica/Arquitetura/PSCIP). Ver [[equipes-analista-auxiliares]].
  auxiliares?: AuxiliarProcesso[];
  // Dados financeiros
  valorTC: number;
  valorLiberado: number;
  valorPago: number;
  saldoEmConta: number;
  // Legado — não é mais preenchida na criação (era uma estimativa manual; os demais campos
  // acima já vêm do PAF/execução da empresa distratada). Mantida opcional só por compatibilidade
  // com registros já gravados antes dessa mudança.
  necessidadeAditivo?: number;
  // Documentos
  documentos: { item: string; obrigatorio: boolean; checked: boolean; fileName?: string }[];
}

// 'gestor_dore' (Gestor de Atendimento) foi descontinuado e removido do sistema — não é mais um
// perfil válido. Ver [[remocao-perfil-gestor-dore]].
export type PerfilUsuario = 'tecnico_infra' | 'coordenador_regional' | 'analista_dore' | 'gestor_paf' | 'fiscal_obra' | 'administrativo_dore' | 'diretor_dore' | 'admin';

export interface UsuarioSistema {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario | string;
  departamento: string;
  // Equipe de especialidade — só se aplica a perfil === 'analista_dore'. Ver [[equipes-analista-auxiliares]].
  equipeAnalise?: EquipeAnalista;
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

// Reconstrói o checklist na estrutura canônica de 8 documentos, preservando os dados
// de upload/validação dos existentes (com aliases de ids legados: doc_3→doc_3_pdf) e
// aplicando syncChecklistDocs para os documentos condicionais. Fonte única usada tanto
// pela migração do localStorage quanto pela releitura do Supabase.
export function montarChecklistCanonico(
  existentes: DocumentoChecklist[] = [],
  /** origemDemanda: nova forma; notificacao: retrocompatibilidade */
  origemOuNotificacao?: string,
  formaAtendimento?: string
): DocumentoChecklist[] {
  const achar = (...ids: string[]) => existentes.find(d => ids.includes(d.id));

  const herdar = (
    base: Pick<DocumentoChecklist, 'id' | 'nome' | 'obrigatorio' | 'desc'>,
    doc?: DocumentoChecklist
  ): DocumentoChecklist => ({
    ...base,
    fileName: doc?.fileName,
    fileSize: doc?.fileSize,
    uploadedAt: doc?.uploadedAt,
    fileContent: doc?.fileContent,
    fileType: doc?.fileType,
    status: doc?.status || 'pendente',
    justificativa: doc?.justificativa,
  });

  const canonicos: DocumentoChecklist[] = [
    herdar({ id: 'doc_1', nome: 'Planilha Orçamentária', obrigatorio: true, desc: 'Anexar nos formatos .pdf e .xlsx.' }, achar('doc_1')),
    herdar({ id: 'doc_2', nome: 'Registro do imóvel', obrigatorio: true, desc: 'Título de propriedade ou certidão de registro correspondente.' }, achar('doc_2')),
    herdar({ id: 'doc_3_pdf', nome: 'Projeto de Engenharia (PDF)', obrigatorio: true, desc: 'Projeto técnico estrutural e arquitetônico no formato .pdf.' }, achar('doc_3_pdf', 'doc_3')),
    herdar({ id: 'doc_3_dwg', nome: 'Projeto de Engenharia (DWG)', obrigatorio: true, desc: 'Projeto técnico estrutural e arquitetônico no formato .dwg (AutoCAD).' }, achar('doc_3_dwg')),
    herdar({ id: 'doc_4', nome: 'Parecer técnico', obrigatorio: true, desc: 'Parecer descritivo emitido pela equipe de engenharia habilitada.' }, achar('doc_4')),
    herdar({ id: 'doc_ata', nome: 'Ata do Colegiado', obrigatorio: true, desc: 'Ata de reunião do colegiado escolar aprovando a demanda de intervenção.' }, achar('doc_ata')),
    herdar({ id: 'doc_foto', nome: 'Relatório fotográfico', obrigatorio: true, desc: 'Relatório com fotos nítidas dos locais que necessitam de reforma/intervenção, com legendas explicativas.' }, achar('doc_foto')),
    herdar({ id: 'doc_5', nome: 'Imposto ISS', obrigatorio: true, desc: 'Guia ou comprovante de recolhimento tributário aplicável.' }, achar('doc_5')),
  ];

  // Documentos condicionais já existentes entram preservados; syncChecklistDocs
  // decide se ficam, saem ou precisam ser criados conforme os campos atuais.
  const condicionais = existentes.filter(d => d.id === 'doc_notificacao' || d.id === 'doc_recurso_sem_onus');
  return syncChecklistDocs([...canonicos, ...condicionais], origemOuNotificacao, formaAtendimento);
}

// Reconstrói o checklist obrigatório da GED (Execução → Documentações), preservando os dados
// de upload dos já existentes. Anexado pelo fiscal da obra; itens obrigatórios bloqueiam a
// liberação da Conclusão de Obra (ver checklist em SolicitacaoDetalhes.tsx).
export function montarChecklistGED(existentes: DocumentoChecklist[] = []): DocumentoChecklist[] {
  const achar = (id: string) => existentes.find(d => d.id === id);

  const herdar = (
    base: Pick<DocumentoChecklist, 'id' | 'nome' | 'obrigatorio' | 'desc'>,
    doc?: DocumentoChecklist
  ): DocumentoChecklist => ({
    ...base,
    fileName: doc?.fileName,
    fileSize: doc?.fileSize,
    uploadedAt: doc?.uploadedAt,
    fileContent: doc?.fileContent,
    fileType: doc?.fileType,
    status: doc?.status || 'pendente',
    justificativa: doc?.justificativa,
  });

  return [
    herdar({ id: 'ged_art', nome: 'ART — Anotação de Responsabilidade Técnica', obrigatorio: true, desc: 'Anotação de Responsabilidade Técnica (CREA/CAU) do(s) profissional(is) responsável(is) pela execução da obra.' }, achar('ged_art')),
    herdar({ id: 'ged_projetos', nome: 'Projetos de Execução do Objeto', obrigatorio: true, desc: 'Projetos técnicos necessários para a execução do objeto (arquitetônico, estrutural e complementares, conforme aplicável).' }, achar('ged_projetos')),
  ];
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
  // Chave de deduplicação de alertas gerados automaticamente (ex: SLA estourado) — evita recriar a
  // mesma notificação a cada verificação periódica. Ver [[sla-atendimentos]].
  slaChave?: string;
}


