import { Solicitacao, DocumentoChecklist } from './types';

export const CHECKLIST_PADRAO: DocumentoChecklist[] = [
  {
    id: 'doc_1',
    nome: 'Planilha Orçamentária',
    obrigatorio: true,
    desc: 'Anexar nos formatos .pdf e .xlsx.',
    status: 'pendente'
  },
  {
    id: 'doc_2',
    nome: 'Registro do imóvel',
    obrigatorio: true,
    desc: 'Título de propriedade ou certidão de registro correspondente.',
    status: 'pendente'
  },
  {
    id: 'doc_3_pdf',
    nome: 'Projeto de Engenharia (PDF)',
    obrigatorio: true,
    desc: 'Projeto técnico estrutural e arquitetônico no formato .pdf.',
    status: 'pendente'
  },
  {
    id: 'doc_3_dwg',
    nome: 'Projeto de Engenharia (DWG)',
    obrigatorio: true,
    desc: 'Projeto técnico estrutural e arquitetônico no formato .dwg (AutoCAD).',
    status: 'pendente'
  },
  {
    id: 'doc_4',
    nome: 'Parecer técnico',
    obrigatorio: true,
    desc: 'Parecer descritivo emitido pela equipe de engenharia habilitada.',
    status: 'pendente'
  },
  {
    id: 'doc_ata',
    nome: 'Ata do Colegiado',
    obrigatorio: true,
    desc: 'Ata de reunião do colegiado escolar aprovando a demanda de intervenção.',
    status: 'pendente'
  },
  {
    id: 'doc_foto',
    nome: 'Relatório fotográfico',
    obrigatorio: true,
    desc: 'Relatório com fotos nítidas dos locais que necessitam de reforma/intervenção, com legendas explicativas.',
    status: 'pendente'
  },
  {
    id: 'doc_5',
    nome: 'Imposto ISS',
    obrigatorio: false,
    desc: 'Guia ou comprovante de recolhimento tributário aplicável.',
    status: 'pendente'
  }
];

export const SOLICITACOES_INICIAIS: Solicitacao[] = [
  {
    id: 'SOL-2026-001',
    nomeEscola: 'E.E. Padre Almir Neves',
    codesc: '145236',
    tipo: 'Reforma Geral do Telhado',
    municipio: 'Patos de Minas',
    sre: 'SRE Patos de Minas',
    dataCriacao: '2026-04-10',
    etapaAtual: 'cadastro',
    historicoEtapas: [
      { etapa: 'cadastro', data: '2026-04-10', responsavel: 'Téc. Fernando Silva' }
    ],
    documentos: [
      {
        id: 'doc_1',
        nome: 'Planilha Orçamentária',
        obrigatorio: true,
        desc: 'Planilha detalhada de custos e quantitativos, com BDI e encargos sociais.',
        fileName: 'planilha_orcamento_v1.xlsx',
        fileSize: '1.2 MB',
        uploadedAt: '2026-04-12',
        status: 'pendente'
      },
      {
        id: 'doc_2',
        nome: 'Ata de Reunião do Colegiado',
        obrigatorio: true,
        desc: 'Cópia da ata assinada aprovando a necessidade de intervenção física.',
        fileName: 'ata_colegiado_assinado.pdf',
        fileSize: '450 KB',
        uploadedAt: '2026-04-11',
        status: 'pendente'
      },
      {
        id: 'doc_3',
        nome: 'Projeto de Engenharia / Arquitetura (DWG)',
        obrigatorio: true,
        desc: 'Arquivos vetoriais em AutoCAD ou similar (CAD/BIM) contemplando as alterações.',
        fileName: 'projeto_cobertura_telhado.dwg',
        fileSize: '8.4 MB',
        uploadedAt: '2026-04-15',
        status: 'pendente'
      },
      {
        id: 'doc_4',
        nome: 'Relatório Fotográfico',
        obrigatorio: true,
        desc: 'Fotos nítidas dos locais que necessitam de reforma/intervenção com legendas explicativas.',
        fileName: 'fotos_vazamento_com_legenda.pdf',
        fileSize: '3.1 MB',
        uploadedAt: '2026-04-12',
        status: 'pendente'
      },
      {
        id: 'doc_5',
        nome: 'Cronograma Físico-Financeiro',
        obrigatorio: true,
        desc: 'Estimativa mensal da evolução física e desembolso financeiro da obra.',
        fileName: 'cronograma_fisico_financeiro_v1.xlsx',
        fileSize: '850 KB',
        uploadedAt: '2026-04-12',
        status: 'pendente'
      }
    ],
    medicoes: [],
    aditivos: []
  },
  {
    id: 'SOL-2026-002',
    nomeEscola: 'E.E. Milton Campos',
    codesc: '102547',
    tipo: 'Construção de Quadra Poliesportiva',
    municipio: 'Belo Horizonte',
    sre: 'SRE Metropolitana A',
    dataCriacao: '2026-03-05',
    etapaAtual: 'analise',
    historicoEtapas: [
      { etapa: 'cadastro', data: '2026-03-05', responsavel: 'Téc. Mariana Souza' },
      { etapa: 'analise', data: '2026-03-10', responsavel: 'Eng. Roberto Mendes (DORE)' }
    ],
    documentos: [
      {
        id: 'doc_1',
        nome: 'Planilha Orçamentária',
        obrigatorio: true,
        desc: 'Planilha detalhada de custos e quantitativos, com BDI e encargos sociais.',
        fileName: 'planilha_orcamentaria_quadra_final.xlsx',
        fileSize: '2.4 MB',
        uploadedAt: '2026-03-06',
        status: 'aprovado'
      },
      {
        id: 'doc_2',
        nome: 'Ata de Reunião do Colegiado',
        obrigatorio: true,
        desc: 'Cópia da ata assinada aprovando a necessidade de intervenção física.',
        fileName: 'ata_colegiado_consolidada.pdf',
        fileSize: '890 KB',
        uploadedAt: '2026-03-05',
        status: 'aprovado'
      },
      {
        id: 'doc_3',
        nome: 'Projeto de Engenharia / Arquitetura (DWG)',
        obrigatorio: true,
        desc: 'Arquivos vetoriais em AutoCAD ou similar (CAD/BIM) contemplando as alterações.',
        fileName: 'projeto_arquitetonico_quadra.dwg',
        fileSize: '15.6 MB',
        uploadedAt: '2026-03-09',
        status: 'recusado',
        justificativa: 'Falta o detalhamento estrutural das fundações dos pilares de cobertura da quadra metálica.'
      },
      {
        id: 'doc_4',
        nome: 'Relatório Fotográfico',
        obrigatorio: true,
        desc: 'Fotos nítidas dos locais que necessitam de reforma/intervenção com legendas explicativas.',
        fileName: 'laudo_fotos_terreno.pdf',
        fileSize: '6.4 MB',
        uploadedAt: '2026-03-07',
        status: 'aprovado'
      },
      {
        id: 'doc_5',
        nome: 'Cronograma Físico-Financeiro',
        obrigatorio: true,
        desc: 'Estimativa mensal da evolução física e desembolso financeiro da obra.',
        fileName: 'cronograma_quadra_2026.xlsx',
        fileSize: '1.1 MB',
        uploadedAt: '2026-03-09',
        status: 'aprovado'
      }
    ],
    medicoes: [],
    aditivos: []
  },
  {
    id: 'SOL-2026-003',
    nomeEscola: 'E.E. Juscelino Kubitschek',
    codesc: '304958',
    tipo: 'Ampliação de Refeitório e Cozinha',
    municipio: 'Diamantina',
    sre: 'SRE Diamantina',
    dataCriacao: '2026-02-14',
    etapaAtual: 'paf_autorizacao',
    historicoEtapas: [
      { etapa: 'cadastro', data: '2026-02-14', responsavel: 'Téc. Jonas Gurgel' },
      { etapa: 'analise', data: '2026-02-28', responsavel: 'Eng. Roberto Mendes (DORE)' },
      { etapa: 'paf_autorizacao', data: '2026-03-05', responsavel: 'Gestor Geral (DORE)' }
    ],
    documentos: [
      {
        id: 'doc_1',
        nome: 'Planilha Orçamentária',
        obrigatorio: true,
        desc: 'Planilha detalhada de custos e quantitativos, com BDI e encargos sociais.',
        fileName: 'planilha_refeito_vfinal.xlsx',
        fileSize: '3.1 MB',
        uploadedAt: '2026-02-14',
        status: 'aprovado'
      },
      {
        id: 'doc_2',
        nome: 'Ata de Reunião do Colegiado',
        obrigatorio: true,
        desc: 'Cópia da ata assinada aprovando a necessidade de intervenção física.',
        fileName: 'ata_colegiado_escola_signed.pdf',
        fileSize: '1.2 MB',
        uploadedAt: '2026-02-14',
        status: 'aprovado'
      },
      {
        id: 'doc_3',
        nome: 'Projeto de Engenharia / Arquitetura (DWG)',
        obrigatorio: true,
        desc: 'Arquivos vetoriais em AutoCAD ou similar (CAD/BIM) contemplando as alterações.',
        fileName: 'plantas_ampliacao_cozinha.dwg',
        fileSize: '11.2 MB',
        uploadedAt: '2026-02-14',
        status: 'aprovado'
      },
      {
        id: 'doc_4',
        nome: 'Relatório Fotográfico',
        obrigatorio: true,
        desc: 'Fotos nítidas dos locais que necessitam de reforma/intervenção com legendas explicativas.',
        fileName: 'fotos_refeitorio_atual.pdf',
        fileSize: '4.8 MB',
        uploadedAt: '2026-02-14',
        status: 'aprovado'
      },
      {
        id: 'doc_5',
        nome: 'Cronograma Físico-Financeiro',
        obrigatorio: true,
        desc: 'Estimativa mensal da evolução física e desembolso financeiro da obra.',
        fileName: 'cronograma_fisico_df.xlsx',
        fileSize: '510 KB',
        uploadedAt: '2026-02-14',
        status: 'aprovado'
      }
    ],
    medicoes: [],
    aditivos: []
  },
  {
    id: 'SOL-2026-004',
    nomeEscola: 'E.E. Wenceslau Braz',
    codesc: '205847',
    tipo: 'Construção Complexa Muro de Arrimo',
    municipio: 'Itajubá',
    sre: 'SRE Itajubá',
    dataCriacao: '2026-01-20',
    etapaAtual: 'execucao',
    historicoEtapas: [
      { etapa: 'cadastro', data: '2026-01-20', responsavel: 'Téc. Julia Penfield' },
      { etapa: 'analise', data: '2026-02-05', responsavel: 'Eng. Roberto Mendes (DORE)' },
      { etapa: 'paf', data: '2026-02-10', responsavel: 'Gestor Geral (DORE)' },
      { etapa: 'execucao', data: '2026-02-20', responsavel: 'Agente de Obras' }
    ],
    documentos: [
      { id: 'doc_1', nome: 'Planilha Orçamentária', obrigatorio: true, desc: 'Planilha...', fileName: 'planilha_arrimo.xlsx', fileSize: '4.1 MB', uploadedAt: '2026-01-20', status: 'aprovado' },
      { id: 'doc_2', nome: 'Ata de Reunião do Colegiado', obrigatorio: true, desc: 'Ata...', fileName: 'ata.pdf', fileSize: '650 KB', uploadedAt: '2026-01-20', status: 'aprovado' },
      { id: 'doc_3', nome: 'Projeto de Engenharia / Arquitetura (DWG)', obrigatorio: true, desc: 'Projeto...', fileName: 'arrimo_projeto_estrutural.dwg', fileSize: '18.9 MB', uploadedAt: '2026-01-20', status: 'aprovado' },
      { id: 'doc_4', nome: 'Relatório Fotográfico', obrigatorio: true, desc: 'Fotos...', fileName: 'fotos_talude_risco.pdf', fileSize: '8.2 MB', uploadedAt: '2026-01-20', status: 'aprovado' },
      { id: 'doc_5', nome: 'Cronograma Físico-Financeiro', obrigatorio: true, desc: 'Cronograma...', fileName: 'cron_fis_fin.xlsx', fileSize: '320 KB', uploadedAt: '2026-01-20', status: 'aprovado' }
    ],
    valorHomologado: 485000,
    numeroPAF: 'PAF-5510-2026',
    dataHomologacao: '2026-02-12',
    empresaContratada: 'Construtora Mantiqueira Ltda',
    statusObra: 'Em Andamento',
    medicoes: [
      {
        id: 'med-1',
        data: '2026-03-20',
        valor: 97000,
        porcentagem: 20,
        descricao: 'Fundação profunda via estacas escavadas e primeira fiada de blocos.'
      },
      {
        id: 'med-2',
        data: '2026-04-25',
        valor: 145500,
        porcentagem: 30,
        descricao: 'Concretagem dos pilares de sustentação e montagem de mureta de drenagem.'
      }
    ],
    aditivos: [
      {
        id: 'adt-1',
        data: '2026-05-10',
        tipo: 'Valor',
        valorExtra: 48500,
        prazoExtraDias: 0,
        justificativa: 'Necessidade de acréscimo de tirantes metálicos em virtude de solo de pior qualidade encontrado.',
        status: 'Aprovado'
      }
    ]
  },
  {
    id: 'SOL-2026-005',
    nomeEscola: 'E.E. Delfim Moreira',
    codesc: '405912',
    tipo: 'Construção de Novas Salas de Aula',
    municipio: 'Pouso Alegre',
    sre: 'SRE Pouso Alegre',
    dataCriacao: '2025-10-05',
    etapaAtual: 'execucao',
    historicoEtapas: [
      { etapa: 'cadastro', data: '2025-10-05', responsavel: 'Téc. Carlos Ramos' },
      { etapa: 'analise', data: '2025-10-25', responsavel: 'Eng. Roberto Mendes (DORE)' },
      { etapa: 'paf', data: '2025-11-05', responsavel: 'Gestor Geral (DORE)' },
      { etapa: 'execucao', data: '2025-11-15', responsavel: 'Agente de Obras' }
    ],
    documentos: [
      { id: 'doc_1', nome: 'Planilha Orçamentária', obrigatorio: true, desc: 'Planilha...', fileName: 'plan_prev.xlsx', fileSize: '1.2 MB', uploadedAt: '2025-10-06', status: 'aprovado' },
      { id: 'doc_2', nome: 'Ata de Reunião do Colegiado', obrigatorio: true, desc: 'Ata...', fileName: 'ata_coleg.pdf', fileSize: '340 KB', uploadedAt: '2025-10-05', status: 'aprovado' }
    ],
    valorHomologado: 320000,
    numeroPAF: 'PAF-4412-2025',
    dataHomologacao: '2025-11-10',
    empresaContratada: 'IncorpObras Engenharia Ltda',
    statusObra: 'Concluída',
    medicoes: [
      {
        id: 'med-1',
        data: '2025-12-20',
        valor: 160000,
        porcentagem: 50,
        descricao: 'Alvenaria e estrutura das novas salas.'
      },
      {
        id: 'med-2',
        data: '2026-02-15',
        valor: 160000,
        porcentagem: 100,
        descricao: 'Acabamentos finais, pintura, instalações elétricas e entrega da chave.'
      }
    ],
    aditivos: []
  }
];

export const NOTIFICACOES_INICIAIS = [
  {
    id: 'notif-1',
    titulo: 'Novo pleito de ajuste de planilha',
    mensagem: 'E.E. Padre Almir Neves cadastrou uma alteração de planilha física aguardando triagem.',
    dataHora: '2026-05-30T21:14:00Z',
    lida: false,
    tipo: 'ajuste_pendente',
    solicitacaoId: 'SOL-2026-001',
    escola: 'E.E. Padre Almir Neves'
  },
  {
    id: 'notif-2',
    titulo: 'Processo retornado com Pendências',
    mensagem: 'O processo da E.E. Milton Campos foi devolvido para a etapa de correção devido a divergências no laudo elétrico.',
    dataHora: '2026-05-30T18:30:22Z',
    lida: false,
    tipo: 'processo_retrocesso',
    solicitacaoId: 'SOL-2026-002',
    escola: 'E.E. Milton Campos'
  },
  {
    id: 'notif-3',
    titulo: 'Pedido de Termo Aditivo de Prazo',
    mensagem: 'O fiscal Insp. Mariana Souza solicitou aditivo temporal de 30 dias para a E.E. Juscelino Kubitschek.',
    dataHora: '2026-05-30T10:45:10Z',
    lida: true,
    tipo: 'aditivo_pendente',
    solicitacaoId: 'SOL-2026-003',
    escola: 'E.E. Juscelino Kubitschek'
  },
  {
    id: 'notif-4',
    titulo: 'PAF Emitido e Homologado',
    mensagem: 'Autorização orçamentária para a E.E. Milton Campos concluída com cotação final homologada.',
    dataHora: '2026-05-29T15:24:00Z',
    lida: true,
    tipo: 'processo_avanco',
    solicitacaoId: 'SOL-2026-002',
    escola: 'E.E. Milton Campos'
  },
  {
    id: 'notif-5',
    titulo: 'Nova Solicitação Cadastrada',
    mensagem: 'Uma nova demanda de reforma foi cadastrada para a E.E. Padre Almir Neves.',
    dataHora: '2026-05-28T09:15:00Z',
    lida: true,
    tipo: 'sistema'
  }
];

export const LOGS_INICIAIS = [
  {
    id: 'log-1',
    dataHora: '2026-05-30T21:14:00Z',
    usuario: 'Insp. Mariana Souza',
    perfil: 'Fiscal de Obra',
    acao: 'Solicitação de Ajuste de Planilha',
    detalhe: 'Abriu pleito de ajuste nº 1 para E.E. Padre Almir Neves no montante de R$ 3.500,00.',
    tipo: 'alerta',
    solicitacaoId: 'SOL-2026-001',
    escola: 'E.E. Padre Almir Neves'
  },
  {
    id: 'log-2',
    dataHora: '2026-05-30T18:30:22Z',
    usuario: 'Flavia Borges',
    perfil: 'Analista de Engenharia (DORE)',
    acao: 'Rejeição de Dossiê Técnico',
    detalhe: 'Documento "Projeto de Engenharia / Arquitetura" marcado como Recusado. Comentário: "A representação em corte está ilegível".',
    tipo: 'erro',
    solicitacaoId: 'SOL-2026-002',
    escola: 'E.E. Milton Campos'
  },
  {
    id: 'log-3',
    dataHora: '2026-05-30T15:10:00Z',
    usuario: 'Aline Davino',
    perfil: 'Gestor Atendimento (DORE)',
    acao: 'Atribuição Pronta',
    detalhe: 'Atribuiu o processo SOL-2026-001 à analista Flavia Borges.',
    tipo: 'sucesso',
    solicitacaoId: 'SOL-2026-001',
    escola: 'E.E. Padre Almir Neves'
  },
  {
    id: 'log-4',
    dataHora: '2026-05-30T10:45:10Z',
    usuario: 'Insp. Mariana Souza',
    perfil: 'Fiscal de Obra',
    acao: 'Solicitação de Termo Aditivo',
    detalhe: 'Cadastrou pedido de aditivo temporal de 30 dias para E.E. Juscelino Kubitschek. Justificativa: "Atraso nas fundações por chuvas contínuas no município".',
    tipo: 'info',
    solicitacaoId: 'SOL-2026-003',
    escola: 'E.E. Juscelino Kubitschek'
  },
  {
    id: 'log-5',
    dataHora: '2026-05-29T15:20:00Z',
    usuario: 'Silas Fagundes',
    perfil: 'Subsecretário de Administração',
    acao: 'Homologação do PAF',
    detalhe: 'Homologação das dotações orçamentárias concluída para a E.E. Milton Campos com dotação total R$ 145.000,00.',
    tipo: 'sucesso',
    solicitacaoId: 'SOL-2026-002',
    escola: 'E.E. Milton Campos'
  },
  {
    id: 'log-6',
    dataHora: '2026-05-29T11:00:15Z',
    usuario: 'Rui Lages',
    perfil: 'Administrativo DORE',
    acao: 'Verificação Cadastral de Empresa',
    detalhe: 'Situação cadastral da "IncorpObras Engenharia Ltda" consultada e validada como regular no Sicaf.',
    tipo: 'info'
  },
  {
    id: 'log-7',
    dataHora: '2026-05-28T14:35:40Z',
    usuario: 'João Paulo',
    perfil: 'Técnico de Infraestrutura (SRE)',
    acao: 'Novo Atendimento Escolar',
    detalhe: 'Cadastrou demanda do tipo "Reforma Geral do Telhado" para a E.E. Padre Almir Neves.',
    tipo: 'sucesso',
    solicitacaoId: 'SOL-2026-001',
    escola: 'E.E. Padre Almir Neves'
  }
];

