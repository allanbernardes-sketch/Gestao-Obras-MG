export interface DocumentoPatrimonio {
  id: string;
  nome: string;
  obrigatorio: boolean;
  fileName?: string;
  fileSize?: string;
  uploadedAt?: string;
  status: 'pendente' | 'anexado';
}

export interface ImovelPatrimonio {
  id: string;

  // 1. Identificação
  nomeEscola: string;
  codesc: string;
  codigoEndereco: string;
  municipio: string;
  sre: string;
  enderecoCompleto: string;
  cep: string;
  coordLat?: string;
  coordLng?: string;

  // 2. Dados do Imóvel — patrimoniais (espelhados do Atendimento Inicial)
  formaOcupacao: string;
  predio: string;
  tombado: string;
  orgaoTombador?: string;
  coabitado: string;
  tipoCoabitado?: string;

  // Dados físicos
  areaTerrenoM2?: number;
  areaConstruidaM2?: number;
  numeroBlocos?: number;
  numeroPavimentos?: number;
  anoConstrucao?: number;
  capacidadeAlunos?: number;

  // 3. Regularização Documental
  situacaoImovel: string;
  documentos: DocumentoPatrimonio[];

  // Metadata
  dataCadastro: string;
  responsavelCadastro?: string;
  status: 'rascunho' | 'cadastrado' | 'regularizado';
  observacoes?: string;
}

export const DOCUMENTOS_PATRIMONIO_PADRAO: DocumentoPatrimonio[] = [
  { id: 'pat_escritura',    nome: 'Escritura',                obrigatorio: true,  status: 'pendente' },
  { id: 'pat_registro',     nome: 'Registro em Cartório',     obrigatorio: true,  status: 'pendente' },
  { id: 'pat_matricula',    nome: 'Matrícula',                obrigatorio: true,  status: 'pendente' },
  { id: 'pat_certidao',     nome: 'Certidão de Inteiro Teor', obrigatorio: false, status: 'pendente' },
  { id: 'pat_cessao',       nome: 'Termo de Cessão',          obrigatorio: false, status: 'pendente' },
  { id: 'pat_locacao',      nome: 'Contrato de Locação',      obrigatorio: false, status: 'pendente' },
  { id: 'pat_croqui',       nome: 'Croqui do Terreno',        obrigatorio: false, status: 'pendente' },
  { id: 'pat_planta',       nome: 'Planta Arquitetônica',     obrigatorio: false, status: 'pendente' },
];

export const SITUACOES_IMOVEL = [
  'Próprio do Estado',
  'Municipal Cedido',
  'Alugado',
  'Comodato',
  'Cessão de Uso',
  'Em Regularização',
] as const;
