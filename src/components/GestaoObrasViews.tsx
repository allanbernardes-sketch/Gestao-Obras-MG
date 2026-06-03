import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  ClipboardList, 
  Users, 
  FileText, 
  Coins, 
  CheckCircle, 
  Layers, 
  ShieldCheck, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Building, 
  Download, 
  Search, 
  AlertCircle, 
  Percent, 
  MapPin,
  X,
  Database,
  ArrowRight,
  Sparkles,
  RefreshCw,
  ArrowLeft,
  Trash2,
  UploadCloud
} from 'lucide-react';
import { Solicitacao, EtapaProcesso, DocumentoChecklist, syncChecklistDocs } from '../types';
import { CHECKLIST_PADRAO } from '../initialData';

// DEFAULT AUTOPREFILL BASE DATA
const baseDados = [
  // SRE Patos de Minas — regional do técnico de infraestrutura (simulação)
  { codesc: '145236', sre: 'SRE Patos de Minas', municipio: 'Patos de Minas', escola: 'EE Padre Almir Neves' },
  { codesc: '145298', sre: 'SRE Patos de Minas', municipio: 'Patos de Minas', escola: 'EE Santos Dumont' },
  { codesc: '145312', sre: 'SRE Patos de Minas', municipio: 'Patos de Minas', escola: 'EE Coronel Linhares' },
  { codesc: '145401', sre: 'SRE Patos de Minas', municipio: 'Carmo do Paranaíba', escola: 'EE Governador Milton Campos' },
  { codesc: '145489', sre: 'SRE Patos de Minas', municipio: 'Carmo do Paranaíba', escola: 'EE Professor Arlindo Luz' },
  { codesc: '145524', sre: 'SRE Patos de Minas', municipio: 'Lagoa Formosa', escola: 'EE Padre Eustáquio' },
  { codesc: '145603', sre: 'SRE Patos de Minas', municipio: 'Varjão de Minas', escola: 'EE Deputado Geraldo Pereira' },
  { codesc: '145678', sre: 'SRE Patos de Minas', municipio: 'Rio Paranaíba', escola: 'EE Tiradentes' },
  // SRE Metropolitana A
  { codesc: '1821', sre: 'SRE Metropolitana A', municipio: 'Belo Horizonte', escola: 'EE Professora Maria Amélia Guimarães' },
  { codesc: '102547', sre: 'SRE Metropolitana A', municipio: 'Belo Horizonte', escola: 'EE Milton Campos' },
  { codesc: '103210', sre: 'SRE Metropolitana A', municipio: 'Belo Horizonte', escola: 'EE Henrique Diniz' },
  { codesc: '103456', sre: 'SRE Metropolitana A', municipio: 'Contagem', escola: 'EE João Monlevade' },
  // SRE Metropolitana B
  { codesc: '1902', sre: 'SRE Metropolitana B', municipio: 'Belo Horizonte', escola: 'EE Professora Maria Belmira Trindade' },
  { codesc: '1104', sre: 'SRE Metropolitana B', municipio: 'Belo Horizonte', escola: 'EE Professor Francisco Brant' },
  { codesc: '104112', sre: 'SRE Metropolitana B', municipio: 'Belo Horizonte', escola: 'EE Dom Pedro II' },
  // SRE Metropolitana C
  { codesc: '205', sre: 'SRE Metropolitana C', municipio: 'Belo Horizonte', escola: 'EE Professora Francisca Malheiros' },
  { codesc: '201334', sre: 'SRE Metropolitana C', municipio: 'Belo Horizonte', escola: 'EE Estadual Centro' },
  // SRE Ouro Preto
  { codesc: '106470', sre: 'SRE Ouro Preto', municipio: 'Ouro Preto', escola: 'EE Dom Velloso' },
  { codesc: '106537', sre: 'SRE Ouro Preto', municipio: 'Ouro Preto', escola: 'EE Tiradentes' },
  // SRE Diamantina
  { codesc: '304958', sre: 'SRE Diamantina', municipio: 'Diamantina', escola: 'EE Juscelino Kubitschek' },
  { codesc: '305012', sre: 'SRE Diamantina', municipio: 'Serro', escola: 'EE Cônego Guimarães' },
  // SRE Itajubá
  { codesc: '205847', sre: 'SRE Itajubá', municipio: 'Itajubá', escola: 'EE Wenceslau Braz' },
  { codesc: '205901', sre: 'SRE Itajubá', municipio: 'Itajubá', escola: 'EE Professor Oswaldo Cruz' },
  // SRE Pouso Alegre
  { codesc: '405912', sre: 'SRE Pouso Alegre', municipio: 'Pouso Alegre', escola: 'EE Delfim Moreira' },
  { codesc: '405988', sre: 'SRE Pouso Alegre', municipio: 'Pouso Alegre', escola: 'EE Coronel José Caetano' },
  // SRE Juiz de Fora
  { codesc: '501234', sre: 'SRE Juiz de Fora', municipio: 'Juiz de Fora', escola: 'EE Carlos Drummond de Andrade' },
  { codesc: '501301', sre: 'SRE Juiz de Fora', municipio: 'Juiz de Fora', escola: 'EE Duque de Caxias' },
];

// ==========================================
// 1. FORMULÁRIO DE NOVO ATENDIMENTO E TELA INTERMEDIÁRIA
// ==========================================
interface NovoAtendimentoPanelProps {
  solicitacoes: Solicitacao[];
  onSolicitacaoCriada: (nova: Solicitacao) => void;
  onUpdateSolicitacao: (updated: Solicitacao) => void;
  usuariosSeguranca: { id: string; nome: string; perfil: string; depto?: string }[];
  onEdit?: (sol: Solicitacao) => void;
  perfilUsuario?: string;
  sreDoTecnico?: string;
  atendimentoEmEdicaoDirect?: Solicitacao | null;
  onLimparEdicaoDirect?: () => void;
}

export function NovoAtendimentoPanel({
  solicitacoes,
  onSolicitacaoCriada,
  onUpdateSolicitacao,
  usuariosSeguranca,
  onEdit,
  perfilUsuario,
  sreDoTecnico,
  atendimentoEmEdicaoDirect,
  onLimparEdicaoDirect
}: NovoAtendimentoPanelProps) {
  // Filtra o banco de escolas pela SRE do técnico (se aplicável)
  const baseDadosFiltrados = sreDoTecnico
    ? baseDados.filter(item => item.sre.toLowerCase() === sreDoTecnico.toLowerCase())
    : baseDados;

  // Pré-preenche a SRE ao montar o componente para tecnico_infra
  useEffect(() => {
    if (sreDoTecnico) setSre(sreDoTecnico);
  }, [sreDoTecnico]);

  // Navigation: 'form' | 'checklist' | 'intermediaria'
  const [currentView, setCurrentView] = useState<'form' | 'checklist' | 'intermediaria'>('form');
  
  // Create / Register Form States
  const [codesc, setCodesc] = useState('');
  const [nomeEscola, setNomeEscola] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [sre, setSre] = useState('');
  const [formaOcupacao, setFormaOcupacao] = useState('PRÓPRIO');
  const [outraFormaOcupacao, setOutraFormaOcupacao] = useState('');
  const [predio, setPredio] = useState('PRINCIPAL');
  const [tombado, setTombado] = useState('NÃO É TOMBADO');
  const [orgaoTombador, setOrgaoTombador] = useState('');
  const [coabitado, setCoabitado] = useState('NÃO');
  const [tipoCoabitado, setTipoCoabitado] = useState('');
  const [tipoObra, setTipoObra] = useState('REFORMA');
  const [tipoAtendimento, setTipoAtendimento] = useState('NORMAL');
  const [numPaf, setNumPaf] = useState('');
  const [anoEmenda, setAnoEmenda] = useState('');
  const [formaAtendimento, setFormaAtendimento] = useState('VIA CAIXA ESCOLAR');
  const [notificacao, setNotificacao] = useState('Não há notificação');
  const [descricaoFolhaRosto, setDescricaoFolhaRosto] = useState('');
  const [valorPlanilha, setValorPlanilha] = useState('');
  const [iss, setIss] = useState('');
  
  const activeUser = usuariosSeguranca?.find(u => u.perfil === perfilUsuario);
  const responsavel = activeUser ? activeUser.nome : 'João Paulo Penfield';
  
  const [observacoesFicha, setObservacoesFicha] = useState('');
  const [erro, setErro] = useState('');

  // Checklist state for new registration in Step 2
  const [documentosChecklist, setDocumentosChecklist] = useState<DocumentoChecklist[]>(() => 
    CHECKLIST_PADRAO.map((doc, idx) => ({
      ...doc,
      id: `doc_${idx + 1}_${Math.floor(100+Math.random()*900)}`,
      status: 'pendente',
      fileName: undefined,
      fileSize: undefined,
      uploadedAt: undefined,
      justificativa: undefined
    }))
  );
  const [outrosDocumentosChecklist, setOutrosDocumentosChecklist] = useState<DocumentoChecklist[]>([]);
  const [novoCustomDocNome, setNovoCustomDocNome] = useState('');
  
  // Search & Filter state inside Intermediate screen
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAtendimentoForEdit, setSelectedAtendimentoForEdit] = useState<Solicitacao | null>(null);
  const [recentCreatedId, setRecentCreatedId] = useState<string | null>(null);

  // Synchronize with direct editing requested from the parent dashboard
  React.useEffect(() => {
    if (atendimentoEmEdicaoDirect) {
      setSelectedAtendimentoForEdit(atendimentoEmEdicaoDirect);
    } else {
      setSelectedAtendimentoForEdit(null);
    }
  }, [atendimentoEmEdicaoDirect]);

  // Synchronize documentosChecklist with notificacao and formaAtendimento during creation
  React.useEffect(() => {
    setDocumentosChecklist(prev => {
      return syncChecklistDocs(prev, notificacao, formaAtendimento);
    });
  }, [notificacao, formaAtendimento]);

  // Synchronize inline loaded/edited solicitation documents with fields
  React.useEffect(() => {
    if (selectedAtendimentoForEdit) {
      const syncedDocs = syncChecklistDocs(
        selectedAtendimentoForEdit.documentos || [],
        selectedAtendimentoForEdit.notificacao,
        selectedAtendimentoForEdit.formaAtendimento
      );
      const lengthChanged = syncedDocs.length !== (selectedAtendimentoForEdit.documentos || []).length;
      const idsChanged = syncedDocs.some((d, idx) => d.id !== selectedAtendimentoForEdit.documentos?.[idx]?.id);
      if (lengthChanged || idsChanged) {
        setSelectedAtendimentoForEdit({
          ...selectedAtendimentoForEdit,
          documentos: syncedDocs
        });
      }
    }
  }, [selectedAtendimentoForEdit?.notificacao, selectedAtendimentoForEdit?.formaAtendimento]);
  
  // Format BRL string helpers
  const formatBRL = (value: string): string => {
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue) return '';
    const cents = parseInt(cleanValue, 10);
    const reais = cents / 100;
    return reais.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    });
  };

  const parseBRLToFloat = (value: string): number | undefined => {
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue) return undefined;
    return parseInt(cleanValue, 10) / 100;
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatBRL(e.target.value);
    setValorPlanilha(formatted);
  };

  const handleCodescChange = (val: string) => {
    setCodesc(val);
    const match = baseDadosFiltrados.find(item => item.codesc === val.trim());
    if (match) {
      setNomeEscola(match.escola);
      setMunicipio(match.municipio);
      setSre(match.sre);
    }
  };

  const preencherDados = (item: typeof baseDados[0]) => {
    setCodesc(item.codesc);
    setNomeEscola(item.escola);
    setMunicipio(item.municipio);
    setSre(item.sre);
    setErro('');
  };

  // Step 1: Navigates to Step 2 Checklist
  const handleProsseguirParaChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !nomeEscola.trim() ||
      !codesc.trim() ||
      !municipio.trim() ||
      !sre.trim() ||
      (formaOcupacao === 'OUTRO' && !outraFormaOcupacao.trim()) ||
      (tipoAtendimento === 'EMENDA' && (!numPaf.trim() || !anoEmenda.trim()))
    ) {
      setErro('Por favor, preencha todos os campos obrigatórios do formulário.');
      return;
    }
    setErro('');
    setCurrentView('checklist');
  };

  // Handle native file upload in creation step 2
  const handleRealUploadChecklist = (docId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocumentosChecklist(prev => prev.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          status: 'aprovado' as const,
          fileName: file.name,
          fileSize: file.size > 1024 * 1024 
            ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
            : `${(file.size / 1024).toFixed(0)} KB`,
          uploadedAt: new Date().toISOString().split('T')[0]
        };
      }
      return doc;
    }));
  };

  // Simulates uploading document in step 2 (from quick simulation)
  const handleSimularUploadDocChecklist = (docId: string, customName: string) => {
    setDocumentosChecklist(prev => prev.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          status: 'aprovado' as const,
          fileName: customName,
          fileSize: '1.2 MB',
          uploadedAt: new Date().toISOString().split('T')[0]
        };
      }
      return doc;
    }));
  };

  // Remove uploaded document in step 2
  const handleRemoverDocChecklist = (docId: string) => {
    setDocumentosChecklist(prev => prev.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          status: 'pendente' as const,
          fileName: undefined,
          fileSize: undefined,
          uploadedAt: undefined
        };
      }
      return doc;
    }));
  };

  // Custom step 2 document creators and upload flow helpers
  const handleAddCustomDocStep2 = () => {
    if (!novoCustomDocNome.trim()) return;
    const nuevo: DocumentoChecklist = {
      id: `doc_custom_${Date.now()}`,
      nome: novoCustomDocNome.trim(),
      obrigatorio: false,
      desc: 'Documento complementar indicado pelo Técnico de Infraestrutura.',
      status: 'pendente'
    };
    setOutrosDocumentosChecklist(prev => [...prev, nuevo]);
    setNovoCustomDocNome('');
  };

  const handleSimularUploadCustomDocStep2 = (docId: string) => {
    setOutrosDocumentosChecklist(prev => prev.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          status: 'aprovado' as const,
          fileName: `outro_doc_${doc.nome.toLowerCase().replace(/\s+/g, '_')}_v1.pdf`,
          fileSize: '750 KB',
          uploadedAt: new Date().toISOString().split('T')[0]
        };
      }
      return doc;
    }));
  };

  const handleRealUploadCustomDocStep2 = (docId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOutrosDocumentosChecklist(prev => prev.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          status: 'aprovado' as const,
          fileName: file.name,
          fileSize: file.size > 1024 * 1024 
            ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
            : `${(file.size / 1024).toFixed(0)} KB`,
          uploadedAt: new Date().toISOString().split('T')[0]
        };
      }
      return doc;
    }));
  };

  const handleRemoverCustomDocStep2 = (docId: string) => {
    setOutrosDocumentosChecklist(prev => prev.filter(doc => doc.id !== docId));
  };

  // Simulate attaching all documents for instant completion
  const handleAnexarTodosControle = () => {
    const mockFiles = [
      'planilha_orcamento_v1.xlsx',
      'registro_imovel_certidao.pdf',
      'projeto_cobertura_arquitetonico.dwg',
      'parecer_viabilidade_infra.pdf',
      'guia_iss_recolhido.pdf'
    ];
    setDocumentosChecklist(prev => prev.map((doc, idx) => ({
      ...doc,
      status: 'aprovado' as const,
      fileName: mockFiles[idx] || 'laudo_tecnico.pdf',
      fileSize: '1.4 MB',
      uploadedAt: new Date().toISOString().split('T')[0]
    })));
  };

  // Save either as 'cadastro' (draft) or 'analise' (finalize)
  const handleFinalizarEGravar = (isDraft: boolean) => {
    const etapaAtual = isDraft ? 'cadastro' : 'analise';
    const novaId = `SOL-2026-${Math.floor(100 + Math.random() * 900)}`;
    const nova: Solicitacao = {
      id: novaId,
      nomeEscola,
      codesc,
      tipo: tipoObra,
      municipio,
      sre,
      dataCriacao: new Date().toISOString().split('T')[0],
      etapaAtual: etapaAtual,
      historicoEtapas: [
        { etapa: 'cadastro' as EtapaProcesso, data: new Date().toISOString().split('T')[0], responsavel: responsavel || 'Téc. de Infraestrutura' },
        ...(!isDraft ? [{ etapa: 'analise' as EtapaProcesso, data: new Date().toISOString().split('T')[0], responsavel: responsavel || 'Téc. de Infraestrutura' }] : [])
      ],
      documentos: documentosChecklist,
      outrosDocumentos: outrosDocumentosChecklist,
      medicoes: [],
      aditivos: [],
      ajustes: [],

      // Extended fields
      formaOcupacao: formaOcupacao === 'OUTRO' ? `OUTRO (${outraFormaOcupacao.trim().toUpperCase()})` : formaOcupacao,
      predio: predio.toUpperCase(),
      tipoObra,
      tipoAtendimento,
      numPaf: tipoAtendimento === 'EMENDA' ? numPaf.trim().toUpperCase() : undefined,
      anoEmenda: tipoAtendimento === 'EMENDA' ? anoEmenda.trim() : undefined,
      formaAtendimento,
      notificacao,
      descricaoFolhaRosto,
      valorPlanilha: valorPlanilha ? parseBRLToFloat(valorPlanilha) : 0,
      iss: iss ? (iss.includes('%') ? iss : `${iss}%`) : '5%',
      responsavel,
      tombado: tombado.toUpperCase(),
      orgaoTombador: tombado !== 'NÃO É TOMBADO' ? (orgaoTombador.toUpperCase() || 'MUNICIPAL') : undefined,
      coabitado: coabitado.toUpperCase(),
      tipoCoabitado: coabitado === 'SIM' ? (tipoCoabitado || 'Coabitado com outra escola Estadual') : undefined,
      observacoesFicha: observacoesFicha
    };

    onSolicitacaoCriada(nova);
    setRecentCreatedId(novaId);
    setSearchQuery('');
    setErro('');
    setCurrentView('intermediaria');
  };

  // Switch back to form to create another
  const resetToForm = () => {
    setCodesc('');
    setNomeEscola('');
    setMunicipio('');
    setSre('');
    setFormaOcupacao('PRÓPRIO');
    setOutraFormaOcupacao('');
    setPredio('PRINCIPAL');
    setTombado('NÃO É TOMBADO');
    setTipoObra('REFORMA');
    setTipoAtendimento('NORMAL');
    setNumPaf('');
    setAnoEmenda('');
    setFormaAtendimento('VIA CAIXA ESCOLAR');
    setNotificacao('');
    setDescricaoFolhaRosto('');
    setValorPlanilha('');
    setIss('');
    setObservacoesFicha('');
    setErro('');
    setSelectedAtendimentoForEdit(null);
    setOutrosDocumentosChecklist([]);
    setNovoCustomDocNome('');
    setDocumentosChecklist(
      CHECKLIST_PADRAO.map((doc, idx) => ({
        ...doc,
        id: `doc_${idx + 1}_${Math.floor(100+Math.random()*900)}`,
        status: 'pendente',
        fileName: undefined,
        fileSize: undefined,
        uploadedAt: undefined,
        justificativa: undefined
      }))
    );
    setCurrentView('form');
  };

  // Filter Atendimentos
  const atendimentosFiltrados = solicitacoes.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      item.id.toLowerCase().includes(q) ||
      item.nomeEscola.toLowerCase().includes(q) ||
      item.municipio.toLowerCase().includes(q) ||
      item.sre.toLowerCase().includes(q) ||
      (item.tipoObra || '').toLowerCase().includes(q) ||
      (item.responsavel || '').toLowerCase().includes(q)
    );
  });

  // Load a solicitation for editing/editing in place
  const selectForEdit = (sol: Solicitacao) => {
    setSelectedAtendimentoForEdit(sol);
  };

  // Handler for in-place edit update
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAtendimentoForEdit) return;

    onUpdateSolicitacao(selectedAtendimentoForEdit);
    setSelectedAtendimentoForEdit(null);
  };

  // Helper inside checklist upload to simulate filling / uploading checklist docs
  const handleSimularUploadDoc = (docId: string, nomeArquivo: string) => {
    if (!selectedAtendimentoForEdit) return;
    const novosDocumentos = selectedAtendimentoForEdit.documentos.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          status: 'aprovado' as const,
          fileName: nomeArquivo,
          uploadedAt: new Date().toISOString().split('T')[0],
          fileSize: '1.2 MB'
        };
      }
      return doc;
    });

    setSelectedAtendimentoForEdit({
      ...selectedAtendimentoForEdit,
      documentos: novosDocumentos
    });
  };

  // Helper inside checklist to change required / optional or status directly
  const handleChangeDocStatus = (docId: string, status: 'pendente' | 'aprovado' | 'recusado' | 'nao_se_aplica') => {
    if (!selectedAtendimentoForEdit) return;
    const novosDocumentos = selectedAtendimentoForEdit.documentos.map(doc => {
      if (doc.id === docId) {
        return { ...doc, status };
      }
      return doc;
    });

    setSelectedAtendimentoForEdit({
      ...selectedAtendimentoForEdit,
      documentos: novosDocumentos
    });
  };

  return (
    <div className="w-full text-left space-y-6">
      {/* 1. SEGUNDO CASO: FORMULÁRIO DE CADASTRO ATIVO (PASSO 1) */}
      {currentView === 'form' && !selectedAtendimentoForEdit && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-3xs max-w-4xl mx-auto w-full text-left animate-in fade-in duration-200">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2 font-sans">
              <Plus className="w-5 h-5 text-blue-600" />
              Abertura de Demanda / Novo Atendimento de Infraestrutura (GESTO)
            </h2>
            <p className="text-xs text-slate-500 mt-1.5 font-sans leading-relaxed">
              Inicie o fluxo de instrução preenchendo todos os dados contratuais e técnicos. O registro iniciará com o status de <strong className="text-blue-600">Instrução Documental de Checklist</strong>.
            </p>
          </div>

          {/* Wizard step breadcrumbs */}
          <div className="flex items-center justify-center gap-4 py-3 mb-6 bg-slate-50 border border-slate-200/60 rounded-xl max-w-md mx-auto">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs">1</span>
              <span className="text-xs font-bold text-blue-700">Dados Gerais</span>
            </div>
            <div className="w-12 h-0.5 bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 font-extrabold flex items-center justify-center text-xs">2</span>
              <span className="text-xs font-bold text-slate-400">Checklist & Anexos</span>
            </div>
          </div>

          <form onSubmit={handleProsseguirParaChecklist} className="space-y-6">
            {erro && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            {/* SEÇÃO 1: Identificação Escolar */}
            <div className="bg-slate-50/55 p-4 rounded-xl border border-slate-200/60 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                  <Database className="w-4 h-4 text-blue-500" />
                  1. Identificação Escolar
                </h4>
                <div className="text-[10px] text-slate-400 font-sans">Selecione o CODESC ou a escola para preencher automaticamente</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Código CODESC *
                  </label>
                  <select
                    required
                    value={codesc}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCodesc(val);
                      const match = baseDadosFiltrados.find(item => item.codesc === val);
                      if (match) {
                        setNomeEscola(match.escola);
                        setMunicipio(match.municipio);
                        setSre(match.sre);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-sans font-medium bg-white cursor-pointer text-slate-800"
                  >
                    <option value="">Selecione o CODESC...</option>
                    {baseDadosFiltrados.map(item => (
                      <option key={item.codesc} value={item.codesc}>{item.codesc}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Nome da Escola Estadual *
                  </label>
                  <select
                    required
                    value={nomeEscola}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNomeEscola(val);
                      const match = baseDadosFiltrados.find(item => item.escola === val);
                      if (match) {
                        setCodesc(match.codesc);
                        setMunicipio(match.municipio);
                        setSre(match.sre);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-sans bg-white cursor-pointer text-slate-800"
                  >
                    <option value="">Selecione a escola...</option>
                    {baseDadosFiltrados.map(item => (
                      <option key={item.codesc} value={item.escola}>{item.escola}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Município *
                  </label>
                  <select
                    required
                    value={municipio}
                    onChange={(e) => setMunicipio(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-sans bg-white cursor-pointer text-slate-800"
                  >
                    <option value="">Selecione o município...</option>
                    {[...new Set(baseDadosFiltrados.map(item => item.municipio))].sort().map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Superintendência Regional (SRE) *
                  </label>
                  {perfilUsuario === 'tecnico_infra' ? (
                    <div className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-100 text-slate-700 font-semibold flex items-center gap-2 cursor-default">
                      <span className="text-[10px] text-slate-400 uppercase font-sans shrink-0">Sua regional:</span>
                      {sre}
                    </div>
                  ) : (
                    <select
                      required
                      value={sre}
                      onChange={(e) => setSre(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-sans bg-white cursor-pointer text-slate-800"
                    >
                      <option value="">Selecione a SRE...</option>
                      {[...new Set(baseDadosFiltrados.map(item => item.sre))].sort().map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: Classificação Patrimonial do Imóvel */}
            <div className="bg-slate-50/55 p-4 rounded-xl border border-slate-200/60 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3 border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                  2. Classificação Patrimonial do Imóvel
                </h4>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Forma de Ocupação *
                </label>
                <select
                  value={formaOcupacao}
                  onChange={(e) => setFormaOcupacao(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 bg-white cursor-pointer font-bold text-slate-800"
                >
                  <option value="PRÓPRIO">PRÓPRIO</option>
                  <option value="ALUGADO">ALUGADO</option>
                  <option value="CEDIDO">CEDIDO</option>
                  <option value="OUTRO">OUTRO</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Prédio Escola *
                </label>
                <select
                  value={predio}
                  onChange={(e) => setPredio(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 bg-white cursor-pointer font-bold text-slate-800"
                >
                  <option value="PRINCIPAL">PRINCIPAL</option>
                  <option value="ANEXO">ANEXO</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Tombamento *
                </label>
                <select
                  value={tombado}
                  onChange={(e) => {
                    setTombado(e.target.value);
                    if (e.target.value === 'NÃO É TOMBADO') {
                      setOrgaoTombador('');
                    } else if (!orgaoTombador) {
                      setOrgaoTombador('MUNICIPAL');
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 bg-white cursor-pointer font-bold text-slate-800"
                >
                  <option value="NÃO É TOMBADO">NÃO É TOMBADO</option>
                  <option value="TOMBADO PARCIALMENTE">TOMBADO PARCIALMENTE</option>
                  <option value="TOMBADO TOTALMENTE">TOMBADO TOTALMENTE</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Órgão Tombador *
                </label>
                <select
                  value={orgaoTombador}
                  onChange={(e) => setOrgaoTombador(e.target.value)}
                  disabled={tombado === 'NÃO É TOMBADO'}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 bg-white cursor-pointer font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-150"
                >
                  {tombado === 'NÃO É TOMBADO' && <option value="">NÃO APLICÁVEL</option>}
                  <option value="MUNICIPAL">MUNICIPAL</option>
                  <option value="ESTADUAL">ESTADUAL</option>
                  <option value="FEDERAL">FEDERAL</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Imóvel Coabitado? *
                </label>
                <select
                  value={coabitado}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCoabitado(val);
                    if (val === 'NÃO') {
                      setTipoCoabitado('');
                    } else if (!tipoCoabitado) {
                      setTipoCoabitado('Coabitado com outra escola Estadual');
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 bg-white cursor-pointer font-bold text-slate-800"
                >
                  <option value="NÃO">NÃO</option>
                  <option value="SIM">SIM</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Tipo de Coabitação *
                </label>
                <select
                  value={tipoCoabitado}
                  onChange={(e) => setTipoCoabitado(e.target.value)}
                  disabled={coabitado === 'NÃO'}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 bg-white cursor-pointer font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-150"
                >
                  {coabitado === 'NÃO' && <option value="">NÃO APLICÁVEL</option>}
                  <option value="Coabitado com outra escola Estadual">Coabitado com outra escola Estadual</option>
                  <option value="Coabitado com outra escola municipal">Coabitado com outra escola municipal</option>
                  <option value="Coabitado com outro órgão estadual">Coabitado com outro órgão estadual</option>
                  <option value="Coabitado com outro órgão municipal">Coabitado com outro órgão municipal</option>
                  <option value="Coabitado com instituto federal">Coabitado com instituto federal</option>
                </select>
              </div>

              {formaOcupacao === 'OUTRO' && (
                <div className="sm:col-span-3 animate-in slide-in-from-top-2 duration-150">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Especifique a Outra Forma de Ocupação *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Especifique..."
                    value={outraFormaOcupacao}
                    onChange={(e) => setOutraFormaOcupacao(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600"
                  />
                </div>
              )}

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">
                  Há alguma notificação? *
                </label>
                <select
                  value={notificacao || 'Não há notificação'}
                  onChange={(e) => setNotificacao(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 bg-white cursor-pointer font-bold text-slate-800"
                >
                  <option value="Não há notificação">Não há notificação</option>
                  <option value="Ministério Publico">Ministério Publico</option>
                  <option value="Prefeitura">Prefeitura</option>
                  <option value="Defesa Civil">Defesa Civil</option>
                  <option value="TCE">TCE</option>
                </select>
              </div>
            </div>

            {/* SEÇÃO 3: Detalhamento Técnico e Demanda */}
            <div className="bg-slate-50/55 p-4 rounded-xl border border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                  3. Detalhamento Técnico e Demanda
                </h4>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Tipo de Obra *
                </label>
                <select
                  value={tipoObra}
                  onChange={(e) => setTipoObra(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 bg-white text-slate-800 font-bold"
                >
                  <option value="AMPLIAÇÃO">AMPLIAÇÃO</option>
                  <option value="REFORMA">REFORMA</option>
                  <option value="QUADRA">QUADRA</option>
                  <option value="ACESSIBILIDADE">ACESSIBILIDADE</option>
                  <option value="CONSTRUÇÃO">CONSTRUÇÃO</option>
                  <option value="ENGENHEIRO PARA ELABORAÇÃO DE PROJETO">ENGENHEIRO PARA ELABORAÇÃO DE PROJETO</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Tipo de Atendimento *
                </label>
                <select
                  value={tipoAtendimento}
                  onChange={(e) => setTipoAtendimento(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 bg-white text-slate-800 font-bold"
                >
                  <option value="NORMAL">NORMAL</option>
                  <option value="EMERGENCIAL">EMERGENCIAL</option>
                  <option value="EMENDA">EMENDA</option>
                  <option value="SOE">SOE</option>
                  <option value="PDDE">PDDE</option>
                </select>
              </div>

              {tipoAtendimento === 'EMENDA' && (
                <div className="sm:col-span-2 grid grid-cols-2 gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100 animate-in slide-in-from-top-2">
                  <div>
                    <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">
                      Número PAF *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: PAF-1234/2026"
                      value={numPaf}
                      onChange={(e) => setNumPaf(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-blue-200 bg-white rounded-md focus:outline-hidden text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">
                      Ano da Emenda *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 2026"
                      value={anoEmenda}
                      onChange={(e) => setAnoEmenda(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-blue-200 bg-white rounded-md focus:outline-hidden text-slate-800"
                    />
                  </div>
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Forma de Atendimento *
                </label>
                <select
                  value={formaAtendimento}
                  onChange={(e) => setFormaAtendimento(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 bg-white text-slate-800 font-bold"
                >
                  <option value="VIA CAIXA ESCOLAR">VIA CAIXA ESCOLAR</option>
                  <option value="SEM ÔNUS">SEM ÔNUS</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Descrição Folha do Rosto (Sinopse e Diagnóstico Emergencial)
                </label>
                <textarea
                  rows={2}
                  placeholder="Descreva a folha de rosto do atendimento escolhendo focos de sinistro, intempéries ou risco"
                  value={descricaoFolhaRosto}
                  onChange={(e) => setDescricaoFolhaRosto(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
            </div>

            {/* SEÇÃO 4: Valores Planejados e Faturamento */}
            <div className="bg-slate-50/55 p-4 rounded-xl border border-slate-200/60 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3 border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                  4. Informações de Referência e Dotação Orçamentária SGO
                </h4>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Valor Estimado da Planilha *
                </label>
                <input
                  type="text"
                  required
                  placeholder="R$ 0,00"
                  value={valorPlanilha}
                  onChange={handleValorChange}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 text-slate-800 font-mono font-extrabold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Alíquota ISS Estimado *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 5%"
                  value={iss}
                  onChange={(e) => setIss(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 text-slate-800"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Observações Gerais do Processo
                </label>
                <textarea
                  rows={2}
                  placeholder="Quaisquer dados extras que facilitem a triagem pelo analista técnico..."
                  value={observacoesFicha}
                  onChange={(e) => setObservacoesFicha(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
            </div>

            {/* Ações */}
            <div className="flex justify-end items-center pt-4 border-t border-slate-100">
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Prosseguir para Anexos</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 2: CHECKLIST E ANEXO DE LAUDOS E DOCUMENTOS */}
      {currentView === 'checklist' && !selectedAtendimentoForEdit && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-3xs max-w-4xl mx-auto w-full text-left animate-in fade-in duration-200">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2 font-sans">
              <UploadCloud className="w-5 h-5 text-blue-600" />
              Checklist Documental - Atendimento {nomeEscola || 'Nova Unidade'}
            </h2>
            <p className="text-xs text-slate-500 mt-1.5 font-sans leading-relaxed">
              Para formalizar o preenchimento, anexe os laudos, planilhas e projetos pertinentes. A aprovação final de liberação do atendimento exige que todos os documentos marcados como <strong className="text-red-500 uppercase text-[10px]">Obrigatório</strong> estejam anexados.
            </p>
          </div>

          {/* Stepper indicators */}
          <div className="flex items-center justify-center gap-4 py-3 mb-6 bg-slate-50 border border-slate-200/60 rounded-xl max-w-md mx-auto">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-extrabold flex items-center justify-center text-xs">✓</span>
              <span className="text-xs font-bold text-slate-500">Dados Gerais</span>
            </div>
            <div className="w-12 h-0.5 bg-emerald-200"></div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs">2</span>
              <span className="text-xs font-bold text-blue-700">Checklist & Anexos</span>
            </div>
          </div>

          {/* Checklist header control shortcut */}
          <div className="flex items-center justify-between p-3.5 mb-6 bg-blue-50/50 border border-blue-100 rounded-xl">
            <div className="text-left">
              <h4 className="text-xs font-extrabold text-blue-900 font-sans">Facilitador de Cadastro</h4>
              <p className="text-[10.5px] text-blue-750 font-medium">Anexe arquivos de seu dispositivo ou utilize a simulação de carga rápida de documentos para agilizar o teste.</p>
            </div>
            <button
              type="button"
              onClick={handleAnexarTodosControle}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer shadow-3xs"
            >
              Simular Carga de Todos
            </button>
          </div>

          {/* List of checklist documents inside step 2 (Categorized) */}
          <div className="space-y-6">
            
            {/* 1. DOCUMENTOS OBRIGATÓRIOS */}
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest font-mono flex items-center gap-1.5 border-b border-slate-150 pb-2 text-left">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                📌 Documentos Obrigatórios ({documentosChecklist.filter(d => d.obrigatorio).length})
              </h3>

              <div className="space-y-3">
                {documentosChecklist.filter(d => d.obrigatorio).map((doc) => {
                  const isUploaded = doc.fileName !== undefined;
                  return (
                    <div 
                      key={doc.id} 
                      className={`p-4 rounded-xl border transition-all ${
                        isUploaded 
                          ? 'border-emerald-200 bg-emerald-50/5'
                          : 'border-slate-200 hover:border-slate-300 bg-white shadow-3xs'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="max-w-xl text-left">
                          <div className="flex items-center gap-2">
                            <h4 className="font-sans font-extrabold text-slate-800 text-sm">
                              {doc.nome}
                            </h4>
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-wide">Obrigatório</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 font-sans">
                            {doc.desc}
                          </p>

                          {/* File item if uploaded */}
                          {isUploaded && (
                            <div className="mt-2.5 flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-mono">
                              <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-slate-800 block truncate">{doc.fileName}</span>
                                <span className="text-[10px] text-slate-400">Tamanho: {doc.fileSize} | Anexado em: {doc.uploadedAt}</span>
                              </div>
                              
                              <button
                                type="button"
                                onClick={() => handleRemoverDocChecklist(doc.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition cursor-pointer"
                                title="Remover arquivo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Right side controls */}
                        <div className="flex justify-end items-center gap-2 shrink-0">
                          <input 
                            type="file" 
                            id={`file-input-checklist-${doc.id}`}
                            className="hidden"
                            onChange={(e) => handleRealUploadChecklist(doc.id, e)}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const fileInput = document.getElementById(`file-input-checklist-${doc.id}`);
                              if (fileInput) fileInput.click();
                            }}
                            className="px-3.5 py-1.5 border border-slate-220 text-slate-700 font-extrabold text-xs rounded-lg hover:bg-slate-50 shrink-0 transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
                          >
                            <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                            <span>{isUploaded ? 'Substituir' : 'Anexar'}</span>
                          </button>

                          {!isUploaded && (
                            <button
                              type="button"
                              onClick={() => handleSimularUploadDocChecklist(doc.id, `doc_analise_${doc.nome.toLowerCase().replace(/\s+/g, '_')}_v1.pdf`)}
                              className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-150 rounded-lg text-[10.5px] font-bold transition whitespace-nowrap cursor-pointer"
                            >
                              Simular
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. DOCUMENTOS OPCIONAIS */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest font-mono flex items-center gap-1.5 border-b border-slate-150 pb-2 text-left">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                📂 Documentos Não-Obrigatórios ({documentosChecklist.filter(d => !d.obrigatorio).length})
              </h3>

              <div className="space-y-3">
                {documentosChecklist.filter(d => !d.obrigatorio).map((doc) => {
                  const isUploaded = doc.fileName !== undefined;
                  return (
                    <div 
                      key={doc.id} 
                      className={`p-4 rounded-xl border transition-all ${
                        isUploaded 
                          ? 'border-emerald-200 bg-emerald-50/5'
                          : 'border-slate-200 hover:border-slate-300 bg-white shadow-3xs'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="max-w-xl text-left">
                          <div className="flex items-center gap-2">
                            <h4 className="font-sans font-extrabold text-slate-800 text-sm">
                              {doc.nome}
                            </h4>
                            <span className="text-[10px] font-medium text-slate-400 capitalize">Opcional</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 font-sans">
                            {doc.desc}
                          </p>

                          {/* File item if uploaded */}
                          {isUploaded && (
                            <div className="mt-2.5 flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-mono">
                              <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-slate-800 block truncate">{doc.fileName}</span>
                                <span className="text-[10px] text-slate-500">Tamanho: {doc.fileSize} | Anexado em: {doc.uploadedAt}</span>
                              </div>
                              
                              <button
                                type="button"
                                onClick={() => handleRemoverDocChecklist(doc.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition cursor-pointer"
                                title="Remover arquivo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Right side controls */}
                        <div className="flex justify-end items-center gap-2 shrink-0">
                          <input 
                            type="file" 
                            id={`file-input-checklist-${doc.id}`}
                            className="hidden"
                            onChange={(e) => handleRealUploadChecklist(doc.id, e)}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const fileInput = document.getElementById(`file-input-checklist-${doc.id}`);
                              if (fileInput) fileInput.click();
                            }}
                            className="px-3.5 py-1.5 border border-slate-220 text-slate-700 font-extrabold text-xs rounded-lg hover:bg-slate-50 shrink-0 transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
                          >
                            <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                            <span>{isUploaded ? 'Substituir' : 'Anexar'}</span>
                          </button>

                          {!isUploaded && (
                            <button
                              type="button"
                              onClick={() => handleSimularUploadDocChecklist(doc.id, `doc_analise_${doc.nome.toLowerCase().replace(/\s+/g, '_')}_v1.pdf`)}
                              className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-150 rounded-lg text-[10.5px] font-bold transition whitespace-nowrap cursor-pointer"
                            >
                              Simular
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. OUTROS DOCUMENTOS */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 pb-2 text-left">
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  🔧 Outros Documentos ({outrosDocumentosChecklist.length})
                </h3>

                {/* Form to add other custom documents */}
                <div className="flex items-center gap-2 max-w-sm w-full">
                  <input 
                    type="text"
                    placeholder="Adicione um laudo técnico extra se desejar..."
                    value={novoCustomDocNome}
                    onChange={(e) => setNovoCustomDocNome(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-250 rounded-lg text-xs flex-1 focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomDocStep2}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold rounded-lg inline-flex items-center gap-1 transition cursor-pointer shrink-0"
                  >
                    <Plus className="w-3 h-3 text-white" />
                    + Adicionar Campo
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {outrosDocumentosChecklist.length === 0 ? (
                  <div className="p-6 border border-dashed border-slate-250 rounded-xl bg-slate-50/50 text-center text-xs text-slate-400 font-sans">
                    Nenhum documento customizado complementar adicionado ao atendimento. Use o adicionador no topo da seção para criar campos sob demanda.
                  </div>
                ) : (
                  outrosDocumentosChecklist.map((doc) => {
                    const isUploaded = doc.fileName !== undefined;
                    return (
                      <div 
                        key={doc.id} 
                        className={`p-4 rounded-xl border transition-all ${
                          isUploaded 
                            ? 'border-emerald-200 bg-emerald-50/5'
                            : 'border-slate-200 hover:border-slate-300 bg-white shadow-3xs'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="max-w-xl text-left">
                            <div className="flex items-center gap-2">
                              <h4 className="font-sans font-extrabold text-slate-800 text-sm">
                                {doc.nome}
                              </h4>
                              <span className="text-[10px] bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5 uppercase text-indigo-750 font-bold tracking-wider font-mono">Personalizado</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 font-sans">
                              {doc.desc}
                            </p>

                            {/* File item if uploaded */}
                            {isUploaded && (
                              <div className="mt-2.5 flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-mono">
                                <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="font-bold text-slate-800 block truncate">{doc.fileName}</span>
                                  <span className="text-[10px] text-slate-500 font-medium">Tamanho: {doc.fileSize} | Anexado em: {doc.uploadedAt}</span>
                                </div>
                                
                                <button
                                  type="button"
                                  onClick={() => handleRemoverCustomDocStep2(doc.id)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition cursor-pointer"
                                  title="Remover campo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Right side controls */}
                          <div className="flex justify-end items-center gap-2 shrink-0">
                            <input 
                              type="file" 
                              id={`file-input-checklist-${doc.id}`}
                              className="hidden"
                              onChange={(e) => handleRealUploadCustomDocStep2(doc.id, e)}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const fileInput = document.getElementById(`file-input-checklist-${doc.id}`);
                                if (fileInput) fileInput.click();
                              }}
                              className="px-3.5 py-1.5 border border-slate-220 text-slate-700 font-extrabold text-xs rounded-lg hover:bg-slate-50 shrink-0 transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
                            >
                              <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                              <span>{isUploaded ? 'Substituir' : 'Anexar'}</span>
                            </button>

                            {!isUploaded && (
                              <button
                                type="button"
                                onClick={() => handleSimularUploadCustomDocStep2(doc.id)}
                                className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-150 rounded-lg text-[10.5px] font-bold transition whitespace-nowrap cursor-pointer"
                              >
                                Simular
                              </button>
                            )}

                            {!isUploaded && (
                              <button
                                type="button"
                                onClick={() => handleRemoverCustomDocStep2(doc.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition cursor-pointer"
                              >
                                Excluir
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Stepper Actions block at the bottom */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-150 mt-6 animate-none">
            <button
              type="button"
              onClick={() => setCurrentView('form')}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar aos Dados Gerais</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleFinalizarEGravar(true)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Salvar como Rascunho
              </button>

              <button
                type="button"
                onClick={() => {
                  const missingMandatory = documentosChecklist.filter(d => d.obrigatorio && !d.fileName);
                  if (missingMandatory.length > 0) {
                    alert(
                      `Não é possível cadastrar e encaminhar para a DORE. Para registrar o Atendimento no fluxo técnico, todos os documentos obrigatórios devem estar devidamente anexados ao checklist.\n\n` +
                      `Documentos obrigatórios ausentes:\n` +
                      missingMandatory.map(m => `- ${m.nome}`).join('\n')
                    );
                    return;
                  }
                  handleFinalizarEGravar(false);
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-lg shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Finalizar e Registrar Atendimento</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. TERCEIRO CASO (QUANDO SELEÇÃO DE EDIÇÃO ESTÁ ATIVA) */}
      {selectedAtendimentoForEdit && (
        <div className="bg-white rounded-xl border-2 border-dashed border-amber-300 p-6 shadow-3xs max-w-4xl mx-auto w-full text-left animate-in fade-in duration-200">
          <div className="border-b border-amber-200 pb-4 mb-6 flex items-center justify-between">
            <div>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md tracking-wider uppercase font-mono">
                Modo de Edição / Continuação de Preenchimento
              </span>
              <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5 font-sans mt-1">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Configurar Processo Ativo: {selectedAtendimentoForEdit.id}
              </h2>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Altere ou complemente as informações de checklist, valores, patrimônio e relatórios.
              </p>
            </div>
            
            <button
              onClick={() => setSelectedAtendimentoForEdit(null)}
              className="p-1 px-3 border border-slate-250 hover:bg-slate-50 text-slate-500 hover:text-slate-800 text-xs rounded-md shadow-3xs flex items-center gap-1 font-semibold cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Cancelar
            </button>
          </div>

          <form onSubmit={handleSaveEdit} className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3 font-bold text-xs text-slate-700 uppercase tracking-wider font-mono border-b border-slate-100 pb-1 flex items-center justify-between">
                <span>Informações Gerais da Solicitação</span>
                <span className="text-[10px] text-slate-400 font-mono lower">Criado em: {selectedAtendimentoForEdit.dataCriacao}</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Código CODESC
                </label>
                <select
                  value={selectedAtendimentoForEdit.codesc || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const match = baseDadosFiltrados.find(item => item.codesc === val);
                    setSelectedAtendimentoForEdit({
                      ...selectedAtendimentoForEdit,
                      codesc: val,
                      ...(match ? { nomeEscola: match.escola, municipio: match.municipio, sre: match.sre } : {})
                    });
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 cursor-pointer"
                >
                  <option value="">Selecione o CODESC...</option>
                  {baseDadosFiltrados.map(item => (
                    <option key={item.codesc} value={item.codesc}>{item.codesc}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Escola Estadual
                </label>
                <select
                  value={selectedAtendimentoForEdit.nomeEscola || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const match = baseDadosFiltrados.find(item => item.escola === val);
                    setSelectedAtendimentoForEdit({
                      ...selectedAtendimentoForEdit,
                      nomeEscola: val,
                      ...(match ? { codesc: match.codesc, municipio: match.municipio, sre: match.sre } : {})
                    });
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 cursor-pointer"
                >
                  <option value="">Selecione a escola...</option>
                  {baseDadosFiltrados.map(item => (
                    <option key={item.codesc} value={item.escola}>{item.escola}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Município
                </label>
                <select
                  value={selectedAtendimentoForEdit.municipio || ''}
                  onChange={(e) => setSelectedAtendimentoForEdit({ ...selectedAtendimentoForEdit, municipio: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 cursor-pointer"
                >
                  <option value="">Selecione o município...</option>
                  {[...new Set(baseDadosFiltrados.map(item => item.municipio))].sort().map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Superintendência SRE
                </label>
                <select
                  value={selectedAtendimentoForEdit.sre || ''}
                  onChange={(e) => setSelectedAtendimentoForEdit({ ...selectedAtendimentoForEdit, sre: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 cursor-pointer"
                >
                  <option value="">Selecione a SRE...</option>
                  {[...new Set(baseDadosFiltrados.map(item => item.sre))].sort().map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Prédio Escola
                </label>
                <select
                  value={selectedAtendimentoForEdit.predio || 'PRINCIPAL'}
                  onChange={(e) => setSelectedAtendimentoForEdit({ ...selectedAtendimentoForEdit, predio: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 font-medium"
                >
                  <option value="PRINCIPAL">PRINCIPAL</option>
                  <option value="ANEXO">ANEXO</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Tipo de Obra
                </label>
                <select
                  value={selectedAtendimentoForEdit.tipoObra || 'REFORMA'}
                  onChange={(e) => setSelectedAtendimentoForEdit({ ...selectedAtendimentoForEdit, tipoObra: e.target.value, tipo: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 font-medium"
                >
                  <option value="AMPLIAÇÃO">AMPLIAÇÃO</option>
                  <option value="REFORMA">REFORMA</option>
                  <option value="QUADRA">QUADRA</option>
                  <option value="ACESSIBILIDADE">ACESSIBILIDADE</option>
                  <option value="CONSTRUÇÃO">CONSTRUÇÃO</option>
                  <option value="ENGENHEIRO PARA ELABORAÇÃO DE PROJETO">ENGENHEIRO PARA ELABORAÇÃO DE PROJETO</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Tipo Atendimento
                </label>
                <select
                  value={selectedAtendimentoForEdit.tipoAtendimento || 'NORMAL'}
                  onChange={(e) => setSelectedAtendimentoForEdit({ ...selectedAtendimentoForEdit, tipoAtendimento: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 font-medium"
                >
                  <option value="NORMAL">NORMAL</option>
                  <option value="EMERGENCIAL">EMERGENCIAL</option>
                  <option value="EMENDA">EMENDA</option>
                  <option value="SOE">SOE</option>
                  <option value="PDDE">PDDE</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Valor Estimado (R$)
                </label>
                <input
                  type="number"
                  value={selectedAtendimentoForEdit.valorPlanilha || 0}
                  onChange={(e) => setSelectedAtendimentoForEdit({ ...selectedAtendimentoForEdit, valorPlanilha: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Alíquota ISS
                </label>
                <input
                  type="text"
                  value={selectedAtendimentoForEdit.iss || '5%'}
                  onChange={(e) => setSelectedAtendimentoForEdit({ ...selectedAtendimentoForEdit, iss: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800"
                />
              </div>

               <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Tombamento
                </label>
                <select
                  value={selectedAtendimentoForEdit.tombado || 'NÃO É TOMBADO'}
                  onChange={(e) => {
                    const nextTombado = e.target.value;
                    const nextOrgao = nextTombado === 'NÃO É TOMBADO' ? '' : (selectedAtendimentoForEdit.orgaoTombador || 'MUNICIPAL');
                    setSelectedAtendimentoForEdit({ 
                      ...selectedAtendimentoForEdit, 
                      tombado: nextTombado,
                      orgaoTombador: nextOrgao
                    });
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 font-medium"
                >
                  <option value="NÃO É TOMBADO">NÃO É TOMBADO</option>
                  <option value="TOMBADO PARCIALMENTE">TOMBADO PARCIALMENTE</option>
                  <option value="TOMBADO TOTALMENTE">TOMBADO TOTALMENTE</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Órgão Tombador
                </label>
                <select
                  value={selectedAtendimentoForEdit.orgaoTombador || ''}
                  onChange={(e) => setSelectedAtendimentoForEdit({ ...selectedAtendimentoForEdit, orgaoTombador: e.target.value })}
                  disabled={(selectedAtendimentoForEdit.tombado || 'NÃO É TOMBADO') === 'NÃO É TOMBADO'}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 font-medium disabled:bg-slate-50 disabled:text-slate-400"
                >
                  {(selectedAtendimentoForEdit.tombado || 'NÃO É TOMBADO') === 'NÃO É TOMBADO' && <option value="">NÃO APLICÁVEL</option>}
                  <option value="MUNICIPAL">MUNICIPAL</option>
                  <option value="ESTADUAL">ESTADUAL</option>
                  <option value="FEDERAL">FEDERAL</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Imóvel Coabitado?
                </label>
                <select
                  value={selectedAtendimentoForEdit.coabitado || 'NÃO'}
                  onChange={(e) => {
                    const nextCoabitado = e.target.value;
                    const nextTipo = nextCoabitado === 'NÃO' ? '' : (selectedAtendimentoForEdit.tipoCoabitado || 'Coabitado com outra escola Estadual');
                    setSelectedAtendimentoForEdit({
                      ...selectedAtendimentoForEdit,
                      coabitado: nextCoabitado,
                      tipoCoabitado: nextTipo
                    });
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 font-medium"
                >
                  <option value="NÃO">NÃO</option>
                  <option value="SIM">SIM</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Tipo de Coabitação
                </label>
                <select
                  value={selectedAtendimentoForEdit.tipoCoabitado || ''}
                  onChange={(e) => setSelectedAtendimentoForEdit({ ...selectedAtendimentoForEdit, tipoCoabitado: e.target.value })}
                  disabled={(selectedAtendimentoForEdit.coabitado || 'NÃO') === 'NÃO'}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 font-medium disabled:bg-slate-50 disabled:text-slate-400"
                >
                  {(selectedAtendimentoForEdit.coabitado || 'NÃO') === 'NÃO' && <option value="">NÃO APLICÁVEL</option>}
                  <option value="Coabitado com outra escola Estadual">Coabitado com outra escola Estadual</option>
                  <option value="Coabitado com outra escola municipal">Coabitado com outra escola municipal</option>
                  <option value="Coabitado com outro órgão estadual">Coabitado com outro órgão estadual</option>
                  <option value="Coabitado com outro órgão municipal">Coabitado com outro órgão municipal</option>
                  <option value="Coabitado com instituto federal">Coabitado com instituto federal</option>
                </select>
              </div>

               <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Há alguma notificação?
                </label>
                <select
                  value={selectedAtendimentoForEdit.notificacao || 'Não há notificação'}
                  onChange={(e) => setSelectedAtendimentoForEdit({ ...selectedAtendimentoForEdit, notificacao: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 font-medium cursor-pointer"
                >
                  <option value="Não há notificação">Não há notificação</option>
                  <option value="Ministério Publico">Ministério Publico</option>
                  <option value="Prefeitura">Prefeitura</option>
                  <option value="Defesa Civil">Defesa Civil</option>
                  <option value="TCE">TCE</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Fase / Etapa de Fluxo
                </label>
                <select
                  value={selectedAtendimentoForEdit.etapaAtual}
                  onChange={(e) => setSelectedAtendimentoForEdit({ ...selectedAtendimentoForEdit, etapaAtual: e.target.value as EtapaProcesso })}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 font-bold text-blue-750"
                >
                  <option value="cadastro">INSTRUCÃO DOCUMENTAL</option>
                  <option value="analise">ANÁLISE ENGENHARIA DORE</option>
                  <option value="correcao">CORRECÃO EXIGIDA</option>
                  <option value="paf_autorizacao">AUTORIZACÃO FINANCEIRA</option>
                  <option value="paf">HOMOLOGACÃO & GERAÇÃO PAF</option>
                  <option value="ordem_inicio">OBRAS (ORDEM DE INÍCIO)</option>
                  <option value="execucao">OBRAS EM EXECUCÃO</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Descrição Folha do Rosto
                </label>
                <textarea
                  rows={2}
                  value={selectedAtendimentoForEdit.descricaoFolhaRosto || ''}
                  onChange={(e) => setSelectedAtendimentoForEdit({ ...selectedAtendimentoForEdit, descricaoFolhaRosto: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Observações Gerais da Ficha
                </label>
                <textarea
                  rows={2}
                  value={selectedAtendimentoForEdit.observacoesFicha || ''}
                  onChange={(e) => setSelectedAtendimentoForEdit({ ...selectedAtendimentoForEdit, observacoesFicha: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800"
                />
              </div>
            </div>

            {/* SEÇÃO EXTRA: CONTINUAR PREENCHENDO (Checklist Documental Ativo) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono border-b border-slate-100 pb-2 mb-3">
                Continuação da Instrução: Checklist de Documentos Exigidos
              </h4>
              <p className="text-[11px] text-slate-500 mb-3">
                Determine se os pareceres, projetos e planilhas exigidas estão pendentes ou simule uploads automáticos para agilizar a validação técnica.
              </p>

              <div className="space-y-2.5">
                {selectedAtendimentoForEdit.documentos.map((doc) => (
                  <div key={doc.id} className="bg-white p-3 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{doc.nome}</span>
                        {doc.obrigatorio ? (
                          <span className="text-[9px] font-bold uppercase py-0.5 px-1 bg-red-50 border border-red-100 text-red-700 rounded">Obrigatório</span>
                        ) : (
                          <span className="text-[9px] font-bold uppercase py-0.5 px-1 bg-slate-100 text-slate-500 rounded">Opcional</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal">{doc.desc}</p>
                      {doc.fileName && (
                        <p className="text-[10px] font-mono text-emerald-600 flex items-center gap-1 mt-1 font-bold">
                          <span>📎 {doc.fileName}</span>
                          <span className="text-slate-400 font-medium">({doc.fileSize} - Enviado em {doc.uploadedAt})</span>
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {/* Interactive upload trigger */}
                      {!doc.fileName && (
                        <button
                          type="button"
                          onClick={() => handleSimularUploadDoc(doc.id, `ANEXO_${doc.nome.toUpperCase().replace(/\s+/g, '_')}_Aprovados.xlsx`)}
                          className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-150 rounded text-[11px] font-extrabold hover:bg-blue-100 cursor-pointer transition-colors"
                        >
                          Simular Upload
                        </button>
                      )}

                      <select
                        value={doc.status}
                        onChange={(e) => handleChangeDocStatus(doc.id, e.target.value as any)}
                        className="text-[10px] px-2 py-1 border border-slate-200 rounded font-bold cursor-pointer bg-white"
                      >
                        <option value="pendente">🔴 PENDENTE</option>
                        <option value="aprovado">🟢 APROVADO</option>
                        <option value="recusado">🟡 CORREÇÃO</option>
                        <option value="nao_se_aplica">⚪ NÃO SE APLICA</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ações */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-200/60 mt-6 md:flex-row flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedAtendimentoForEdit(null);
                  if (onLimparEdicaoDirect) onLimparEdicaoDirect();
                }}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar à Lista Visual</span>
              </button>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedAtendimentoForEdit) return;
                    // Update as draft
                    const updated = {
                      ...selectedAtendimentoForEdit,
                      etapaAtual: 'cadastro' as const
                    };
                    onUpdateSolicitacao(updated);
                    setSelectedAtendimentoForEdit(null);
                    if (onLimparEdicaoDirect) onLimparEdicaoDirect();
                    alert('Alterações salvas como rascunho com sucesso!');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-755 hover:text-slate-900 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Salvar como Rascunho
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!selectedAtendimentoForEdit) return;
                    // Validate mandatory checklist documents
                    const missingMandatory = selectedAtendimentoForEdit.documentos.filter(d => d.obrigatorio && !d.fileName);
                    if (missingMandatory.length > 0) {
                      alert(
                        `Não é possível encaminhar para a DORE. Para encaminhar o Atendimento, todos os documentos obrigatórios devem estar devidamente anexados ao checklist.\n\n` +
                        `Documentos obrigatórios ausentes:\n` +
                        missingMandatory.map(m => `- ${m.nome}`).join('\n')
                      );
                      return;
                    }

                    const updated = {
                      ...selectedAtendimentoForEdit,
                      etapaAtual: 'analise' as const,
                      analistaAtribuido: undefined,
                      historicoEtapas: [
                        ...selectedAtendimentoForEdit.historicoEtapas,
                        { 
                          etapa: 'analise' as const, 
                          data: new Date().toISOString().split('T')[0], 
                          responsavel: selectedAtendimentoForEdit.responsavel || 'Téc. de Infraestrutura' 
                        }
                      ]
                    };
                    onUpdateSolicitacao(updated);
                    setSelectedAtendimentoForEdit(null);
                    if (onLimparEdicaoDirect) onLimparEdicaoDirect();
                    alert('Atendimento encaminhado para a DORE com sucesso!');
                  }}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-lg shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Finalizar e Encaminhar para DORE</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 3. TELA INTERMEDIÁRIA COMPLETA: LISTA VISUAL INTERCALÁVEL */}
      {currentView === 'intermediaria' && !selectedAtendimentoForEdit && (
        <div className="space-y-6 max-w-5xl mx-auto w-full animate-in fade-in duration-250">
          
          {/* Sucess hero widget */}
          {recentCreatedId && (
            <div className="bg-emerald-50 border border-emerald-250 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-3">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-emerald-500/10 rounded-full mt-0.5 shrink-0">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 font-sans">
                    Atendimento de Infraestrutura Criado com Sucesso!
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    O processo de código <strong className="font-mono text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded text-[11px]">{recentCreatedId}</strong> foi estabelecido de forma auto-persistida no banco de dados local.
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Você pode filtrá-lo na lista abaixo por escola ou código para complementar a sua ficha técnica, anexar os laudos exigidos e as fotos de sinistros.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const found = solicitacoes.find(s => s.id === recentCreatedId);
                    if (found) selectForEdit(found);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 text-white font-extrabold text-xs rounded-lg hover:bg-emerald-700 shadow-3xs cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Continuar Preenchendo Agora
                </button>

                <button
                  type="button"
                  onClick={resetToForm}
                  className="p-2 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 text-xs rounded-lg shadow-3xs flex items-center gap-1 font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Criar Outro
                </button>
              </div>
            </div>
          )}

          {/* Search, Filter & Quick actions dashboard header */}
          <div className="bg-white border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2 font-sans">
                <Layers className="w-5 h-5 text-blue-600" />
                Painel Visual de Atendimentos Criados
              </h2>
              <p className="text-xs text-slate-550 mt-1 leading-relaxed">
                Abaixo estão listados todos os atendimentos cadastrados. Filtre em tempo real, visualize seus fluxos contratuais e clique para editar ou continuar preenchendo a documentação e anexos técnicos.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={resetToForm}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Criar Atendimento
              </button>
            </div>
          </div>

          {/* Search bar widget */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-3 flex items-center pl-0.5 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar por escola, município, dotação, ID do processo ou analista..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-205 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/15 focus:outline-hidden text-slate-800 font-medium"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2.5 rounded-lg font-bold"
              >
                Limpar
              </button>
            )}
          </div>

          {/* THE HIGHLY POLISHED TABLE VIEW */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-3xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-slate-250 text-slate-500 font-extrabold uppercase tracking-wider text-[10px] h-[52px]">
                    <th className="py-3 px-4 font-sans text-left">OBRA ID</th>
                    <th className="py-2.5 px-4 font-sans text-left">ESCOLA / LOCALIZAÇÃO</th>
                    <th className="py-2.5 px-4 font-sans text-left">TIPO / DEMANDA</th>
                    <th className="py-2.5 px-4 font-sans text-left text-center">TIPO ATENDIMENTO</th>
                    <th className="py-2.5 px-4 font-sans text-left">DESCRIÇÃO</th>
                    <th className="py-2.5 px-4 font-sans text-left">VALOR PLANILHA</th>
                    <th className="py-2.5 px-4 font-sans text-left">DATA CRIAÇÃO</th>
                    <th className="py-2.5 px-4 font-sans text-left">RESPONSÁVEL (ENCAMINHOU)</th>
                    <th className="py-2.5 px-4 font-sans text-left">ANALISTA DESIGNADO</th>
                    <th className="py-2.5 px-4 font-sans text-center">CHECKLIST DOCS</th>
                    <th className="py-2.5 px-4 font-sans text-center">ETAPA ATUAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {atendimentosFiltrados.map((item) => {
                    const totalDocs = item.documentos ? item.documentos.length : 8;
                    const docsAprovados = item.documentos ? item.documentos.filter(d => d.status === 'aprovado').length : 0;
                    
                    const isRecent = item.id === recentCreatedId;

                    // Helpers for specific Image 1 visual matchers
                    const getTipoBadgeText = (sol: Solicitacao) => {
                      return (sol.tipoObra || sol.tipo || 'REFORMA').toUpperCase();
                    };

                    const getEtapaVisuals = (etapa: string) => {
                      switch (etapa) {
                        case 'cadastro':
                          return {
                            label: 'Atendimento Inicial',
                            className: 'border border-amber-300 text-amber-700 bg-amber-50/20 text-[10px] font-bold uppercase tracking-wide rounded px-2.5 py-1 whitespace-nowrap'
                          };
                        case 'ordem_inicio':
                          return {
                            label: 'Ordem de Início',
                            className: 'border border-blue-300 text-blue-700 bg-blue-50/20 text-[10px] font-bold uppercase tracking-wide rounded px-2.5 py-1 whitespace-nowrap'
                          };
                        case 'analise':
                          return {
                            label: 'Análise de Engenharia',
                            className: 'border border-indigo-300 text-indigo-700 bg-indigo-50/20 text-[10px] font-bold uppercase tracking-wide rounded px-2.5 py-1 whitespace-nowrap'
                          };
                        default:
                          return {
                            label: etapa === 'paf_autorizacao' ? 'Autorização PAF' : etapa.toUpperCase().replace('_', ' '),
                            className: 'border border-slate-300 text-slate-700 bg-slate-50/20 text-[10px] font-bold uppercase tracking-wide rounded px-2.5 py-1 whitespace-nowrap'
                          };
                      };
                    };

                    const idParts = (item.id || '').split('-');
                    const etapaVisual = getEtapaVisuals(item.etapaAtual);

                    return (
                      <tr
                        key={item.id}
                        onClick={() => selectForEdit(item)}
                        className={`hover:bg-slate-50/80 transition-all group cursor-pointer ${
                          isRecent ? 'bg-emerald-50/10' : ''
                        }`}
                        title="Clique na linha para Editar / Preencher"
                      >
                        {/* 1. OBRA ID (Stacked format of Image 1) */}
                        <td className="py-4 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {idParts.length === 3 ? (
                            <div className="leading-tight font-extrabold text-[#334155] text-[11px] font-sans">
                              {idParts[0]}-<br />
                              {idParts[1]}-<br />
                              <span className="text-slate-900 font-black">{idParts[2]}</span>
                            </div>
                          ) : (
                            <span className="font-extrabold text-slate-900 text-[11px] font-sans">{item.id}</span>
                          )}
                        </td>

                        {/* 2. ESCOLA / LOCALIZAÇÃO */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-0.5 max-w-[280px]">
                            <span className="font-extrabold text-slate-900 text-[11px] uppercase block leading-snug">
                              {item.nomeEscola}
                            </span>
                            <div className="text-[9.5px] text-slate-400 font-semibold uppercase flex items-center gap-0.5">
                              <MapPin className="w-3 h-3 text-slate-350 shrink-0" />
                              <span>{(item.municipio || '').toUpperCase()} — {(item.sre || '').toUpperCase()}</span>
                            </div>
                            <div className="text-[9.5px] text-slate-400 font-semibold uppercase mt-0.5">
                              CODESC: <span className="font-extrabold text-slate-600 font-mono">{item.codesc || '1982'}</span> — Prédio: <span className="font-extrabold text-slate-600">{item.predio || 'PRINCIPAL'}</span>
                            </div>
                          </div>
                        </td>

                        {/* 3. TIPO / DEMANDA */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="border border-indigo-200 text-indigo-700 bg-indigo-50/25 px-3 py-1 rounded text-[9.5px] font-bold uppercase tracking-[0.05em]">
                            {getTipoBadgeText(item)}
                          </span>
                        </td>

                        {/* 4. TIPO ATENDIMENTO */}
                        <td className="py-4 px-3 whitespace-nowrap text-center">
                          <span className="border border-emerald-400 text-emerald-800 bg-emerald-50/20 px-3 py-1 rounded text-[9.5px] font-bold uppercase tracking-[0.05em]">
                            {(item.tipoAtendimento || 'NORMAL').toUpperCase()}
                          </span>
                        </td>

                        {/* 5. DESCRIÇÃO */}
                        <td className="py-4 px-4 max-w-[220px]">
                          <p className="text-slate-500 text-[10.5px] leading-snug font-medium line-clamp-2" title={item.descricaoFolhaRosto || item.tipo}>
                            {item.descricaoFolhaRosto || item.tipo || 'teste'}
                          </p>
                        </td>

                        {/* 6. VALOR PLANILHA */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="text-[11.5px] font-black text-slate-800 font-mono">
                            R$ {(item.valorPlanilha || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* 7. DATA CRIAÇÃO */}
                        <td className="py-4 px-4 whitespace-nowrap text-slate-400 font-mono text-[10.5px]">
                          {item.dataCriacao || '2026-05-27'}
                        </td>

                        {/* 8. RESPONSÁVEL (ENCAMINHOU) */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-slate-500 text-[10.5px] font-medium font-sans">
                            <span className="text-slate-350 font-bold tracking-tight">||</span>
                            <span>{item.responsavel || 'Téc. João Paulo (SRE)'}</span>
                          </div>
                        </td>

                        {/* 9. ANALISTA DESIGNADO */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {item.analistaAtribuido ? (
                            <span className="px-2.5 py-1 text-[9.5px] font-bold text-blue-700 bg-blue-50/20 border border-blue-200 rounded-md inline-flex items-center gap-1">
                              {item.analistaAtribuido}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1.5 text-[9.5px] font-bold text-amber-600 bg-amber-50/20 border border-amber-200 rounded-md inline-flex items-center gap-1.5 leading-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              Não Atribuído
                            </span>
                          )}
                        </td>

                        {/* 10. CHECKLIST DOCS */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-extrabold text-[11px] text-[#334155] leading-none mb-0.5">{docsAprovados} / {totalDocs}</span>
                            <span className="text-[9px] text-slate-400 font-semibold tracking-wide uppercase">Alocado</span>
                          </div>
                        </td>

                        {/* 11. ETAPA ATUAL */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span className={etapaVisual.className}>
                            {etapaVisual.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {atendimentosFiltrados.length === 0 && (
                <div className="bg-slate-50 border-t border-slate-200 py-12 text-center text-slate-400">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <h5 className="font-bold text-slate-700 text-xs">Nenhum atendimento encontrado</h5>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                    Tente alterar seus parâmetros de filtro ou clique em "Criar Atendimento" para criar um novo registro.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ==========================================
// 2. PAINEL DE ATRIBUIÇÃO TÉCNICA
// ==========================================
interface AtribuicaoPanelProps {
  solicitacoes: Solicitacao[];
  onUpdateSolicitacao: (updated: Solicitacao) => void;
  usuariosSeguranca: { id: string; nome: string; perfil: string; depto?: string }[];
  atribuicoes: { [solicitacaoId: string]: string };
  onAssign: (solId: string, usrId: string) => void;
  viewMode?: 'lista' | 'kanban_status' | 'kanban_analista';
  onMudarViewMode?: (mode: 'lista' | 'kanban_status' | 'kanban_analista') => void;
  perfilUsuario?: string;
}

export function AtribuicaoPanel({ 
  solicitacoes, 
  onUpdateSolicitacao, 
  usuariosSeguranca, 
  atribuicoes, 
  onAssign,
  viewMode,
  onMudarViewMode,
  perfilUsuario = 'gestor_dore'
}: AtribuicaoPanelProps) {
  const [feedbackMsg, setFeedbackMsg] = useState<{ [solId: string]: string }>({});

  // Estados dos Filtros
  const [filtroId, setFiltroId] = useState('');
  const [filtroCodesc, setFiltroCodesc] = useState('');
  const [filtroMunicipio, setFiltroMunicipio] = useState('todos');
  const [filtroSre, setFiltroSre] = useState('todos');
  const [filtroEscola, setFiltroEscola] = useState('');
  const [filtroResponsavel, setFiltroResponsavel] = useState('todos');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroAtribuicao, setFiltroAtribuicao] = useState<'todos' | 'minhas'>('todos');

  const analistasSgo = usuariosSeguranca.filter(
    u => u.perfil === 'analista_dore' || u.perfil === 'tecnico_infra' || u.perfil === 'tecnico_infra'
  );

  // Valores Únicos para os selects
  const idsUnicos = Array.from(new Set(solicitacoes.map(s => s.id).filter(Boolean))).sort();
  const codescsUnicos = Array.from(new Set(solicitacoes.map(s => s.codesc).filter(Boolean))).sort();
  const municipiosUnicos = Array.from(new Set(solicitacoes.map(s => s.municipio).filter(Boolean))).sort();
  const sresUnicas = Array.from(new Set(solicitacoes.map(s => s.sre).filter(Boolean))).sort();
  const escolasUnicas = Array.from(new Set(solicitacoes.map(s => s.nomeEscola).filter(Boolean))).sort();
  const responsaveisUnicos = Array.from(new Set(solicitacoes.map(s => s.responsavel).filter(Boolean))).sort();

  const filtrosAtivosCount = 
    (filtroId ? 1 : 0) + 
    (filtroEscola ? 1 : 0) + 
    (filtroMunicipio !== 'todos' ? 1 : 0) + 
    (filtroResponsavel !== 'todos' ? 1 : 0) + 
    (filtroDataInicio ? 1 : 0) + 
    (filtroDataFim ? 1 : 0) +
    (filtroCodesc ? 1 : 0) +
    (filtroSre !== 'todos' ? 1 : 0);

  const limparTodosFiltros = () => {
    setFiltroId('');
    setFiltroEscola('');
    setFiltroMunicipio('todos');
    setFiltroResponsavel('todos');
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setFiltroCodesc('');
    setFiltroSre('todos');
  };

  const solicitacoesFiltradas = solicitacoes.filter(sol => {
    // Only show processes in 'analise' (technical analysis/attribution) stage
    if (sol.etapaAtual !== 'analise') return false;

    // 1. ID de Obra
    if (filtroId && sol.id !== filtroId) return false;

    // 2. CODESC
    if (filtroCodesc && sol.codesc !== filtroCodesc) return false;

    // 3. Municipio
    if (filtroMunicipio !== 'todos' && sol.municipio !== filtroMunicipio) return false;

    // 4. SRE
    if (filtroSre !== 'todos' && sol.sre !== filtroSre) return false;

    // 5. Escola
    if (filtroEscola && sol.nomeEscola !== filtroEscola) return false;

    // 6. Responsável
    if (filtroResponsavel !== 'todos' && sol.responsavel !== filtroResponsavel) return false;

    // 7. Data de criacao
    if (filtroDataInicio && sol.dataCriacao && sol.dataCriacao < filtroDataInicio) return false;
    if (filtroDataFim && sol.dataCriacao && sol.dataCriacao > filtroDataFim) return false;

    // 8. Atribuição focada
    if (perfilUsuario === 'analista_dore' && filtroAtribuicao === 'minhas') {
      const myNome = usuariosSeguranca?.find((u: any) => u.perfil === perfilUsuario)?.nome || '';
      const isMyAssign = !!sol.analistaAtribuido && (myNome ? sol.analistaAtribuido === myNome : !!sol.analistaAtribuido);
      if (!isMyAssign) return false;
    } else if (perfilUsuario === 'gestor_dore' && filtroAtribuicao === 'minhas') {
      const noAssign = !sol.analistaAtribuido;
      if (!noAssign) return false;
    }

    return true;
  });

  const handleAssignAnalyst = (sol: Solicitacao, usrId: string) => {
    // Save locally
    onAssign(sol.id, usrId);

    if (!usrId) {
      const updated: Solicitacao = {
        ...sol,
        analistaAtribuido: undefined,
        historicoEtapas: [
          ...sol.historicoEtapas,
          { 
            etapa: sol.etapaAtual, 
            data: new Date().toISOString().split('T')[0], 
            responsavel: `Gestor DORE (Atribuição Removida)` 
          }
        ]
      };
      
      onUpdateSolicitacao(updated);

      // Flash feedback
      setFeedbackMsg(prev => ({ ...prev, [sol.id]: 'Atribuição removida!' }));
      setTimeout(() => {
        setFeedbackMsg(prev => ({ ...prev, [sol.id]: '' }));
      }, 2000);
      return;
    }

    // Also update main global object
    const selectedUser = analistasSgo.find(u => u.id === usrId);
    if (selectedUser) {
      const updated: Solicitacao = {
        ...sol,
        analistaAtribuido: selectedUser.nome,
        aditivos: (sol.aditivos || []).map(a => 
          a.status === 'Pendente' && !a.analistaAtribuido 
            ? { ...a, analistaAtribuido: selectedUser.nome } 
            : a
        ),
        ajustes: (sol.ajustes || []).map(a => 
          a.status === 'analise_dore' && !a.analistaAtribuido 
            ? { ...a, analistaAtribuido: selectedUser.nome } 
            : a
        ),
        historicoEtapas: [
          ...sol.historicoEtapas,
          { 
            etapa: sol.etapaAtual, 
            data: new Date().toISOString().split('T')[0], 
            responsavel: `Gestor DORE (Analista ${selectedUser.nome} Atribuído)` 
          }
        ]
      };
      
      onUpdateSolicitacao(updated);

      // Flash feedback
      setFeedbackMsg(prev => ({ ...prev, [sol.id]: 'Atribuído com sucesso!' }));
      setTimeout(() => {
        setFeedbackMsg(prev => ({ ...prev, [sol.id]: '' }));
      }, 2000);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-3xs text-left animate-in fade-in duration-200">
      <div className="border-b border-slate-100 pb-4 mb-5">
        <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2 font-sans">
          <Users className="w-5 h-5 text-blue-600" />
          Validação Técnica
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-sans">
          Distribua as demandas por analistas técnicos, fiscais de campo ou engenheiros DORE credenciados para vistorias físicas e pareceres normativos de engenharia.
        </p>
      </div>

      {/* SEÇÃO DOS FILTROS DE PESQUISA */}
      <div className="bg-[#f8fafc] rounded-xl border border-slate-200 overflow-hidden mb-6">
        {/* Barra de Filtros / Título */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-sans font-bold text-sm">Filtros de Pesquisa</span>
            {filtrosAtivosCount > 0 && (
              <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {filtrosAtivosCount}
              </span>
            )}
          </div>

          {viewMode && onMudarViewMode && (
            <div className="shrink-0 flex items-center gap-2.5">
              <div className="text-right hidden sm:flex flex-col items-end">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">Tipo de Exibição</span>
                <span className="text-[9.5px] text-slate-500 font-bold leading-none mt-0.5">Mudar o modo de visualizar os processos</span>
              </div>
              <select
                value={viewMode}
                onChange={(e) => onMudarViewMode(e.target.value as any)}
                className="px-3.5 py-2 text-xs border border-slate-200 bg-white rounded-lg text-slate-700 font-bold focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer shadow-3xs"
              >
                <option value="lista">📋 Lista de Atribuição</option>
                <option value="kanban_status">📊 Kanban por Status</option>
                <option value="kanban_analista">👥 Kanban por Analista</option>
              </select>
            </div>
          )}
        </div>

        {/* Grade de Filtros */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3.5 bg-slate-50/50">
          {/* 1. ID de Obra */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ID de Obra</label>
            <select
              value={filtroId}
              onChange={(e) => setFiltroId(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg py-2 px-2.5 bg-white text-slate-700 font-bold cursor-pointer"
            >
              <option value="">Todos os IDs</option>
              {idsUnicos.map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </div>

          {/* 2. CODESC */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">CODESC</label>
            <select
              value={filtroCodesc}
              onChange={(e) => setFiltroCodesc(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg py-2 px-2.5 bg-white text-slate-700 font-bold cursor-pointer"
            >
              <option value="">Todos os CODESC</option>
              {codescsUnicos.map(cod => (
                <option key={cod} value={cod}>{cod}</option>
              ))}
            </select>
          </div>

          {/* 3. Município */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Município</label>
            <select
              value={filtroMunicipio}
              onChange={(e) => setFiltroMunicipio(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg py-2 px-2.5 bg-white text-slate-700 font-bold cursor-pointer"
            >
              <option value="todos">Todos os Municípios</option>
              {municipiosUnicos.map(mun => (
                <option key={mun} value={mun}>{mun}</option>
              ))}
            </select>
          </div>

          {/* 4. Regional (SRE) */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Regional (SRE)</label>
            <select
              value={filtroSre}
              onChange={(e) => setFiltroSre(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg py-2 px-2.5 bg-white text-slate-700 font-bold cursor-pointer"
            >
              <option value="todos">Todas as Regionais</option>
              {sresUnicas.map(sreOp => (
                <option key={sreOp} value={sreOp}>{sreOp}</option>
              ))}
            </select>
          </div>

          {/* 5. Escola */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Escola</label>
            <select
              value={filtroEscola}
              onChange={(e) => setFiltroEscola(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg py-2 px-2.5 bg-white text-slate-700 font-bold cursor-pointer"
            >
              <option value="">Todas as Escolas</option>
              {escolasUnicas.map(esc => (
                <option key={esc} value={esc}>{esc}</option>
              ))}
            </select>
          </div>

          {/* 6. Responsável */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Responsável</label>
            <select
              value={filtroResponsavel}
              onChange={(e) => setFiltroResponsavel(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg py-2 px-2.5 bg-white text-slate-700 font-bold cursor-pointer"
            >
              <option value="todos">Todos os Responsáveis</option>
              {responsaveisUnicos.map(resp => (
                <option key={resp} value={resp}>{resp}</option>
              ))}
            </select>
          </div>

          {/* 7. Data de Criação */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Data de Criação</label>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
                className="w-full text-[10px] border border-slate-200 rounded-lg py-1 px-1.5 bg-white text-slate-700 font-semibold cursor-pointer text-center"
                title="Data Inicial"
              />
              <span className="text-[10px] text-slate-400 font-bold px-0.5 shrink-0">à</span>
              <input
                type="date"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
                className="w-full text-[10px] border border-slate-200 rounded-lg py-1 px-1.5 bg-white text-slate-700 font-semibold cursor-pointer text-center"
                title="Data Final"
              />
            </div>
          </div>
        </div>

        {/* Rodapé dos Filtros se tiver algum ativo */}
        {filtrosAtivosCount > 0 && (
          <div className="col-span-1 flex flex-col sm:flex-row justify-between items-center gap-2 p-3 border-t border-slate-200 bg-[#f8fafc]">
            <span className="text-[11px] text-blue-700 font-sans font-semibold bg-blue-50 px-2 py-0.5 rounded-md">
              Mostrando {solicitacoesFiltradas.length} de {solicitacoes.length} atendimentos filtrados
            </span>
            <button
              type="button"
              onClick={limparTodosFiltros}
              className="px-3 py-1 text-xs font-bold text-red-600 bg-red-50 border border-red-250 rounded-md hover:bg-red-100 hover:text-red-700 transition flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 text-red-500" />
              <span>Limpar Filtros</span>
            </button>
          </div>
        )}
      </div>

      {/* VISÃO FOCADA POR ATRIBUIÇÃO DE ANALISTAS - MOVED AS REQUESTED */}
      <div className="bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-medium mb-6">
        <span className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-extrabold text-slate-700 font-sans text-xs uppercase tracking-wide">Visão focada por atribuição de analistas:</span>
        </span>
        {perfilUsuario === 'analista_dore' && (
          <div className="flex bg-slate-200/50 p-0.5 rounded-lg border border-slate-250 select-none shrink-0">
            <button
              type="button"
              onClick={() => setFiltroAtribuicao('minhas')}
              className={`px-3 py-1.5 text-[11px] font-extrabold rounded-md transition-all cursor-pointer ${
                filtroAtribuicao === 'minhas'
                  ? 'bg-blue-600 text-white shadow-3xs'
                  : 'text-slate-605 hover:text-slate-900 bg-transparent font-bold'
              }`}
            >
              Minhas Demandas Designadas (Eng. André / Flávia)
            </button>
            <button
              type="button"
              onClick={() => setFiltroAtribuicao('todos')}
              className={`px-3 py-1.5 text-[11px] font-extrabold rounded-md transition-all cursor-pointer ${
                filtroAtribuicao === 'todos'
                  ? 'bg-blue-600 text-white shadow-3xs'
                  : 'text-slate-605 hover:text-slate-900 bg-transparent font-bold'
              }`}
            >
              Todas as Demandas
            </button>
          </div>
        )}

        {perfilUsuario === 'gestor_dore' && (
          <div className="flex bg-slate-200/50 p-0.5 rounded-lg border border-slate-250 select-none shrink-0">
            <button
              type="button"
              onClick={() => setFiltroAtribuicao('minhas')}
              className={`px-3 py-1.5 text-[11px] font-extrabold rounded-md transition-all cursor-pointer ${
                filtroAtribuicao === 'minhas'
                  ? 'bg-indigo-600 text-white shadow-3xs'
                  : 'text-slate-605 hover:text-slate-900 bg-transparent font-bold'
              }`}
            >
              Exibir Apenas Não Atribuídos (Aguardando Designação)
            </button>
            <button
              type="button"
              onClick={() => setFiltroAtribuicao('todos')}
              className={`px-3 py-1.5 text-[11px] font-extrabold rounded-md transition-all cursor-pointer ${
                filtroAtribuicao === 'todos'
                  ? 'bg-indigo-600 text-white shadow-3xs'
                  : 'text-slate-605 hover:text-slate-900 bg-transparent font-bold'
              }`}
            >
              Exibir Todas as Demandas
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse font-sans text-xs">
          <thead>
            <tr className="bg-[#f8fafc] border-b border-slate-250 text-slate-500 font-extrabold uppercase tracking-wider text-[10px] h-[52px]">
              <th className="py-3 px-4 font-sans text-left">OBRA ID</th>
              <th className="py-2.5 px-4 font-sans text-left">ESCOLA / LOCALIZAÇÃO</th>
              <th className="py-2.5 px-4 font-sans text-left">TIPO / DEMANDA</th>
              <th className="py-2.5 px-4 font-sans text-left text-center">TIPO ATENDIMENTO</th>
              <th className="py-2.5 px-4 font-sans text-left text-center">CLASSIFICAÇÃO</th>
              <th className="py-2.5 px-4 font-sans text-left">DESCRIÇÃO</th>
              <th className="py-2.5 px-4 font-sans text-left">VALOR PLANILHA</th>
              <th className="py-2.5 px-4 font-sans text-left">DATA CRIAÇÃO</th>
              <th className="py-2.5 px-4 font-sans text-left">RESPONSÁVEL (ENCAMINHOU)</th>
              <th className="py-2.5 px-4 font-sans text-left">ANALISTA DESIGNADO</th>
              <th className="py-2.5 px-4 font-sans text-center">CHECKLIST DOCS</th>
              <th className="py-2.5 px-4 font-sans text-center">ETAPA ATUAL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {solicitacoesFiltradas.map(sol => {
              const currentAssignId = Object.keys(atribuicoes).find(k => k === sol.id) 
                ? atribuicoes[sol.id] 
                : analistasSgo.find(u => u.nome === sol.analistaAtribuido)?.id || '';

              const totalDocs = sol.documentos ? sol.documentos.length : 8;
              const docsAprovados = sol.documentos ? sol.documentos.filter(d => d.status === 'aprovado').length : 0;
              
              const isRecent = false;

              const getTipoBadgeText = (s: Solicitacao) => {
                return (s.tipoObra || s.tipo || 'REFORMA').toUpperCase();
              };

              const getEtapaVisuals = (etapa: string) => {
                switch (etapa) {
                  case 'cadastro':
                    return {
                      label: 'Atendimento Inicial',
                      className: 'border border-amber-300 text-amber-700 bg-amber-50/20 text-[10px] font-bold uppercase tracking-wide rounded px-2.5 py-1 whitespace-nowrap'
                    };
                  case 'ordem_inicio':
                    return {
                      label: 'Ordem de Início',
                      className: 'border border-blue-300 text-blue-700 bg-blue-50/20 text-[10px] font-bold uppercase tracking-wide rounded px-2.5 py-1 whitespace-nowrap'
                    };
                  case 'analise':
                    return {
                      label: 'Análise de Engenharia',
                      className: 'border border-indigo-300 text-indigo-700 bg-indigo-50/20 text-[10px] font-bold uppercase tracking-wide rounded px-2.5 py-1 whitespace-nowrap'
                    };
                  default:
                    return {
                      label: etapa === 'paf_autorizacao' ? 'Autorização PAF' : etapa.toUpperCase().replace('_', ' '),
                      className: 'border border-slate-300 text-slate-700 bg-slate-50/20 text-[10px] font-bold uppercase tracking-wide rounded px-2.5 py-1 whitespace-nowrap'
                    };
                }
              };

              const idParts = (sol.id || '').split('-');
              const etapaVisual = getEtapaVisuals(sol.etapaAtual);

              return (
                <tr
                  key={sol.id}
                  className={`hover:bg-slate-50/80 transition-all group cursor-pointer ${
                    isRecent ? 'bg-emerald-50/10' : ''
                  }`}
                  title="Painel de atribuição técnica"
                >
                  {/* 1. OBRA ID */}
                  <td className="py-4 px-4 font-mono text-slate-500 whitespace-nowrap">
                    {idParts.length === 3 ? (
                      <div className="leading-tight font-extrabold text-[#334155] text-[11px] font-sans">
                        {idParts[0]}-<br />
                        {idParts[1]}-<br />
                        <span className="text-slate-900 font-black">{idParts[2]}</span>
                      </div>
                    ) : (
                      <span className="font-extrabold text-slate-900 text-[11px] font-sans">{sol.id}</span>
                    )}
                  </td>

                  {/* 2. ESCOLA / LOCALIZAÇÃO */}
                  <td className="py-4 px-4">
                    <div className="flex flex-col gap-0.5 max-w-[280px]">
                      <span className="font-extrabold text-slate-900 text-[11px] uppercase block leading-snug">
                        {sol.nomeEscola}
                      </span>
                      <div className="text-[9.5px] text-slate-400 font-semibold uppercase flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 text-slate-350 shrink-0" />
                        <span>{(sol.municipio || '').toUpperCase()} — {(sol.sre || '').toUpperCase()}</span>
                      </div>
                      <div className="text-[9.5px] text-slate-400 font-semibold uppercase mt-0.5">
                        CODESC: <span className="font-extrabold text-slate-600 font-mono">{sol.codesc || '1982'}</span> — Prédio: <span className="font-extrabold text-slate-600">{sol.predio || 'PRINCIPAL'}</span>
                      </div>
                    </div>
                  </td>

                  {/* 3. TIPO / DEMANDA */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className="border border-indigo-200 text-indigo-700 bg-indigo-50/25 px-3 py-1 rounded text-[9.5px] font-bold uppercase tracking-[0.05em]">
                      {getTipoBadgeText(sol)}
                    </span>
                  </td>

                  {/* 4. TIPO ATENDIMENTO */}
                  <td className="py-4 px-3 whitespace-nowrap text-center">
                    <span className="border border-emerald-400 text-emerald-800 bg-emerald-50/20 px-3 py-1 rounded text-[9.5px] font-bold uppercase tracking-[0.05em]">
                      {(sol.tipoAtendimento || 'NORMAL').toUpperCase()}
                    </span>
                  </td>

                  {/* CLASSIFICAÇÃO */}
                  <td className="py-4 px-3 whitespace-nowrap text-center">
                    {(() => {
                      const hasAditivo = sol.aditivos && sol.aditivos.some(a => a.status === 'Pendente');
                      const hasAjuste = sol.ajustes && sol.ajustes.some(a => a.status === 'analise_dore');
                      if (hasAditivo) {
                        return (
                          <span className="border border-rose-300 text-rose-700 bg-rose-50/30 px-3 py-1.5 rounded text-[9.5px] font-bold uppercase tracking-[0.05em]">
                            Termo Aditivo
                          </span>
                        );
                      }
                      if (hasAjuste) {
                        return (
                          <span className="border border-violet-300 text-violet-700 bg-violet-50/30 px-3 py-1.5 rounded text-[9.5px] font-bold uppercase tracking-[0.05em]">
                            Ajuste
                          </span>
                        );
                      }
                      return (
                        <span className="border border-blue-300 text-blue-700 bg-blue-50/30 px-3 py-1.5 rounded text-[9.5px] font-bold uppercase tracking-[0.05em]">
                          Atendimento Inicial
                        </span>
                      );
                    })()}
                  </td>

                  {/* 5. DESCRIÇÃO */}
                  <td className="py-4 px-4 max-w-[220px]">
                    <p className="text-slate-500 text-[10.5px] leading-snug font-medium line-clamp-2" title={sol.descricaoFolhaRosto || sol.tipo}>
                      {sol.descricaoFolhaRosto || sol.tipo || 'teste'}
                    </p>
                  </td>

                  {/* 6. VALOR PLANILHA */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className="text-[11.5px] font-black text-slate-800 font-mono">
                      R$ {(sol.valorPlanilha || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </td>

                  {/* 7. DATA CRIAÇÃO */}
                  <td className="py-4 px-4 whitespace-nowrap text-slate-400 font-mono text-[10.5px]">
                    {sol.dataCriacao || '2026-05-27'}
                  </td>

                  {/* 8. RESPONSÁVEL (ENCAMINHOU) */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-slate-500 text-[10.5px] font-medium font-sans">
                      <span className="text-slate-350 font-bold tracking-tight">||</span>
                      <span>{sol.responsavel || 'Téc. João Paulo (SRE)'}</span>
                    </div>
                  </td>

                  {/* 9. ANALISTA DESIGNADO */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1 max-w-[220px]">
                      <select
                        value={currentAssignId}
                        onChange={(e) => handleAssignAnalyst(sol, e.target.value)}
                        className={`text-xs px-3 py-2 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border font-extrabold cursor-pointer transition-all duration-150 w-full min-w-[210px] ${
                          sol.analistaAtribuido 
                            ? 'border-blue-500 text-blue-700 shadow-3xs' 
                            : 'border-slate-300 text-slate-500 font-medium'
                        }`}
                      >
                        <option value="" className="text-slate-500 font-bold bg-white text-center py-2">
                          -- Não Atribuído --
                        </option>
                        {analistasSgo.map(usr => {
                          const formattedLabel = usr.perfil === 'tecnico_infra' 
                            ? `${usr.nome} (Fiscal)` 
                            : `${usr.nome} (DORE)`;
                          return (
                            <option key={usr.id} value={usr.id} className="text-slate-800 bg-white font-bold py-2">
                              {formattedLabel}
                            </option>
                          );
                        })}
                      </select>

                      {feedbackMsg[sol.id] && (
                        <span className="text-[9px] font-bold text-blue-600 block animate-pulse text-center">
                          {feedbackMsg[sol.id]}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 10. CHECKLIST DOCS */}
                  <td className="py-4 px-4 text-center whitespace-nowrap">
                    <div className="inline-flex flex-col items-center">
                      <span className="font-extrabold text-[11px] text-[#334155] leading-none mb-0.5">{docsAprovados} / {totalDocs}</span>
                      <span className="text-[9px] text-slate-400 font-semibold tracking-wide uppercase">Alocado</span>
                    </div>
                  </td>

                  {/* 11. ETAPA ATUAL */}
                  <td className="py-4 px-4 text-center whitespace-nowrap">
                    <span className={etapaVisual.className}>
                      {etapaVisual.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {solicitacoesFiltradas.length === 0 && (
          <div className="bg-slate-50 border-t border-slate-150 py-12 text-center text-slate-400">
            <AlertCircle className="w-8 h-8 text-slate-350 mx-auto mb-2" />
            <h5 className="font-bold text-slate-700 text-xs">Nenhum atendimento correspondente encontrado</h5>
            <p className="text-[11px] text-slate-505 mt-1 max-w-xs mx-auto">
              Experimente alterar os filtros (ID de Obra, CODESC, SRE, etc.) ou clique em "Limpar Filtros" acima.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 3. PAINEL DE RELATÓRIOS MULTI-CONTEXTOS
// ==========================================
interface RelatoriosPanelProps {
  activeReportType: string;
  solicitacoes: Solicitacao[];
}

export function RelatoriosPanel({ activeReportType, solicitacoes }: RelatoriosPanelProps) {
  // Aggregate data for reports
  const totalValores = solicitacoes.reduce((sum, s) => sum + (s.valorPlanilha || 0), 0);
  const totalObras = solicitacoes.length;
  const listMedicoes = solicitacoes.flatMap(s => s.medicoes || []);
  const totalMedido = listMedicoes.reduce((sum, m) => sum + m.valor, 0);
  const percentMedidoTotal = totalValores > 0 ? (totalMedido / totalValores) * 100 : 0;

  // Regional breakdown
  const regionalData = solicitacoes.reduce((acc: { [key: string]: { count: number; val: number; medido: number } }, s) => {
    const r = s.sre || 'SRE Geral';
    if (!acc[r]) acc[r] = { count: 0, val: 0, medido: 0 };
    acc[r].count += 1;
    acc[r].val += s.valorPlanilha || 0;
    acc[r].medido += (s.medicoes || []).reduce((sm, m) => sm + m.valor, 0);
    return acc;
  }, {});

  // PDF Export visual triggers
  const [downloading, setDownloading] = useState(false);
  const handleSimulateExport = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      alert('Seu arquivo foi gerado e o download em formato PDF/Excel foi iniciado!');
    }, 1000);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-3xs text-left animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 mb-6 gap-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2 font-sans">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            {activeReportType === 'relat_gerencial' && 'Relatório Geral & KPIs Gerenciais de Obras'}
            {activeReportType === 'relat_financeiro' && 'Relatório de Consolidação e Indicadores Financeiros'}
            {activeReportType === 'relat_regional' && 'Detalhamento Técnico por Jurisdição (Regional SRE)'}
            {activeReportType === 'relat_escola' && 'Dossiê Cronológico e Painel por Unidade de Ensino'}
            {activeReportType === 'relat_medicoes' && 'Histórico e Auditoria de Medições Físico-Financeiras'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            SGO Inteligente • Dados agregados atualizados em tempo real de acordo com as transições de etapas da rede de ensino estadual de Minas Gerais.
          </p>
        </div>

        <button
          onClick={handleSimulateExport}
          disabled={downloading}
          className="flex items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-150 text-xs font-bold leading-none cursor-pointer transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          {downloading ? 'Gerando Planilha...' : 'Exportar Relatório'}
        </button>
      </div>

      {/* KPI METRICS BLOCK */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <span className="text-[10px] font-bold uppercase text-slate-400 font-sans">Demandas Ativas</span>
          <p className="text-xl font-black text-slate-800 mt-1 font-mono">{totalObras}</p>
          <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">Processos em trâmite</span>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <span className="text-[10px] font-bold uppercase text-slate-400 font-sans">Investimento Estimado</span>
          <p className="text-xl font-black text-blue-600 mt-1 font-mono">
            R$ {totalValores.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">Dotação planejada SGO</span>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <span className="text-[10px] font-bold uppercase text-slate-400 font-sans">Montante Medido</span>
          <p className="text-xl font-black text-emerald-600 mt-1 font-mono">
            R$ {totalMedido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">Executado fisicamente</span>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <span className="text-[10px] font-bold uppercase text-slate-400 font-sans">Aproveitamento Total</span>
          <p className="text-xl font-black text-slate-800 mt-1 font-mono">{percentMedidoTotal.toFixed(1)}%</p>
          <div className="w-full bg-slate-200 h-1 rounded-full mt-2 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(percentMedidoTotal, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* REPORT TYPE SPECIFIC CONTENT */}
      {activeReportType === 'relat_gerencial' && (
        <div className="space-y-6">
          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
            <h3 className="text-xs font-bold text-slate-800 mb-2 font-sans flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              Resumo e Distribuição por Estágios do Processo
            </h3>
            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              Atualmente, as obras distribuem-se estrategicamente pelas fases legais do GESTO. A maior concentração financeira encontra-se nas fases iniciais de captação de dotação do PAF regional.
            </p>
          </div>

          {/* VISUAL CHART GENERATOR (PURE CSS & SVG BAR CHART) */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase text-slate-500 font-sans block mb-4">Volume e Dimensionamento Financeiro das Etapas</span>
            
            <div className="space-y-4">
              {[
                { label: 'Checklist e Atendimentos Iniciais', count: solicitacoes.filter(s=>s.etapaAtual==='cadastro'||s.etapaAtual==='correcao').length, total: solicitacoes.filter(s=>s.etapaAtual==='cadastro'||s.etapaAtual==='correcao').reduce((sm,x)=>sm+(x.valorPlanilha||0),0), color: 'bg-blue-500' },
                { label: 'Análise de Engenharia & laudos', count: solicitacoes.filter(s=>s.etapaAtual==='analise').length, total: solicitacoes.filter(s=>s.etapaAtual==='analise').reduce((sm,x)=>sm+(x.valorPlanilha||0),0), color: 'bg-amber-500' },
                { label: 'Autorização Financiamento', count: solicitacoes.filter(s=>s.etapaAtual==='paf_autorizacao').length, total: solicitacoes.filter(s=>s.etapaAtual==='paf_autorizacao').reduce((sm,x)=>sm+(x.valorPlanilha||0),0), color: 'bg-pink-500' },
                { label: 'Aprovados & Geração de PAF', count: solicitacoes.filter(s=>s.etapaAtual==='paf').length, total: solicitacoes.filter(s=>s.etapaAtual==='paf').reduce((sm,x)=>sm+(x.valorPlanilha||0),0), color: 'bg-purple-500' },
                { label: 'Em Execução / Medições', count: solicitacoes.filter(s=>s.etapaAtual==='execucao'||s.etapaAtual==='ordem_inicio').length, total: solicitacoes.filter(s=>s.etapaAtual==='execucao'||s.etapaAtual==='ordem_inicio').reduce((sm,x)=>sm+(x.valorPlanilha||0),0), color: 'bg-emerald-500' },
              ].map((group, idx) => {
                const percentBar = totalValores > 0 ? (group.total / totalValores) * 100 : 0;
                return (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="font-semibold font-sans">{group.label} ({group.count})</span>
                      <span className="font-mono font-bold">R$ {group.total.toLocaleString('pt-BR')} ({percentBar.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div className={`${group.color} h-full rounded-full transition-all duration-500`} style={{ width: `${percentBar}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeReportType === 'relat_financeiro' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-left">
              <span className="text-[10px] font-black uppercase text-slate-400 block font-sans">Saldo Restante de Planilha</span>
              <p className="text-xl font-bold text-slate-800 mt-1 font-mono">
                R$ {(totalValores - totalMedido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-400 mt-1 block">A liquidar contra medições subsequentes</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-left">
              <span className="text-[10px] font-black uppercase text-slate-400 block font-sans">Aditivações Totais Registradas</span>
              <p className="text-xl font-bold text-amber-600 mt-1 font-mono">
                R$ {solicitacoes.flatMap(s => s.aditivos || []).filter(a => a.status === 'Aprovado').reduce((sum, a) => sum + (a.valorExtra || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-400 mt-1 block">Acréscimos aditivados aprovados em contrato</span>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 p-3.5 border-b border-slate-200 font-sans font-bold text-slate-700">
              Checklist de Faturamento Financeiro SGO
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {solicitacoes.map(sol => {
                const totalM = (sol.medicoes || []).reduce((sm, m) => sm + m.valor, 0);
                return (
                  <div key={sol.id} className="p-3.5 flex justify-between items-center hover:bg-slate-50/50">
                    <div>
                      <span className="font-bold text-slate-800 block font-sans">{sol.nomeEscola}</span>
                      <span className="text-[10px] text-slate-500 font-mono">Vigência PAF: {sol.dataVigenciaPAF || 'Aguardando publicação'}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold font-mono text-slate-800 block">R$ {totalM.toLocaleString('pt-BR')} medidos</span>
                      <span className="text-[10px] text-slate-400 block">De R$ {(sol.valorPlanilha || 0).toLocaleString('pt-BR')} dotação</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeReportType === 'relat_regional' && (
        <div className="space-y-4">
          <span className="text-xs text-slate-500 font-sans block mb-1">
            Consolidação de volume de obras, orçamentos planeados de planilha e andamentos físicos médios agrupados por Superintendência Regional de Ensino (SRE):
          </span>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs text-slate-600">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                  <th className="py-3 px-4 font-sans">Jurisdição SRE</th>
                  <th className="py-3 px-4 font-sans">Escolas Atendidas</th>
                  <th className="py-3 px-4 font-sans">Orçamentos SGO</th>
                  <th className="py-3 px-4 font-sans">Liquidado Financeiramente</th>
                  <th className="py-3 px-4 font-sans">Progresso Médio (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.keys(regionalData).map(region => {
                  const data = regionalData[region];
                  const averageProgress = data.val > 0 ? (data.medido / data.val) * 100 : 0;
                  return (
                    <tr key={region} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800 font-sans">{region}</td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-500">{data.count}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">R$ {data.val.toLocaleString('pt-BR')}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">R$ {data.medido.toLocaleString('pt-BR')}</td>
                      <td className="py-3 px-4 font-bold font-mono">
                        <div className="flex items-center gap-1.5 text-blue-800">
                          <Percent className="w-3.5 h-3.5 text-slate-400" />
                          {averageProgress.toFixed(1)}%
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeReportType === 'relat_escola' && (
        <div className="space-y-4">
          <span className="text-xs text-slate-500 font-sans block mb-1">
            Dossiê completo, de busca rápida, de todas as escolas cadastradas e seus respectivos escopos e andamentos contratuais:
          </span>

          <div className="divide-y divide-slate-150 border border-slate-200 rounded-xl bg-white overflow-hidden text-xs">
            {solicitacoes.map(sol => (
              <div key={sol.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col md:flex-row justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-slate-800 font-sans">{sol.nomeEscola}</span>
                    <span className="font-mono text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{sol.id}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 space-y-0.5 font-sans">
                    <p>SRE: {sol.sre} | Município: {sol.municipio}</p>
                    <p>Tipo de Obra: {sol.tipoObra || 'N/A'}</p>
                    {sol.analistaAtribuido && <p className="text-slate-600 text-blue-600 font-medium">Responsável Técnico: {sol.analistaAtribuido}</p>}
                  </div>
                </div>

                <div className="flex flex-row md:flex-col items-end justify-between md:justify-center gap-1.5 text-right font-mono text-slate-700 shrink-0">
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">Previsão Contratual</span>
                    <span className="font-bold text-slate-800">R$ {(sol.valorPlanilha || 0).toLocaleString('pt-BR')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">Situação Geral</span>
                    <span className="font-bold text-blue-600 font-sans text-[11px] uppercase">{sol.etapaAtual === 'cadastro' ? 'Instrucão' : sol.etapaAtual}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeReportType === 'relat_medicoes' && (
        <div className="space-y-4">
          <span className="text-xs text-slate-500 font-sans block mb-1">
            Histórico auditado e detalhado de todas as medições físico-financeiras de engenharia enviadas e homologadas na dotação das obras ativas:
          </span>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs text-slate-600">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                  <th className="py-3 px-4 font-sans">Referência da Escola</th>
                  <th className="py-3 px-4 font-sans">Data da Medição</th>
                  <th className="py-3 px-4 font-sans">Percentual Individual</th>
                  <th className="py-3 px-4 font-sans">Rendimento Financeiro</th>
                  <th className="py-3 px-4 font-sans">Justificativa / Descrição Técnica</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {solicitacoes.filter(s => s.medicoes && s.medicoes.length > 0).flatMap((s) => 
                  s.medicoes.map((med, idx) => (
                    <tr key={`${s.id}-med-${idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-sans">
                        <span className="font-bold text-slate-800 block">{s.nomeEscola}</span>
                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{s.id}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{med.data}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        <div className="flex items-center gap-1 font-mono text-blue-600 text-blue-700">
                          <Percent className="w-3.5 h-3.5 text-slate-400" />
                          {med.porcentagem}%
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">R$ {med.valor.toLocaleString('pt-BR')}</td>
                      <td className="py-3.5 px-4 text-xs font-sans text-slate-500 max-w-sm shrink truncate" title={med.descricao}>
                        {med.descricao}
                      </td>
                    </tr>
                  ))
                )}

                {solicitacoes.every(s => !s.medicoes || s.medicoes.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 italic font-sans bg-slate-50/50">
                      Nenhuma medição físico-financeira enviada para as obras ativas no momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
