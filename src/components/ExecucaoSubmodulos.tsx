import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, HardHat, Layers, ClipboardList, Plus, Calculator, ShieldCheck, 
  UploadCloud, LayoutGrid, DollarSign, Calendar, MapPin, Search, CheckCircle, 
  Trash2, AlertCircle, Sparkles, User, FileText, ChevronRight, Scale, Clock,
  FileCheck, FileUp, Zap, HelpCircle, History, Info, Trash, RefreshCw, Eye,
  TrendingUp, Edit, ClipboardCheck, Wrench, ArrowRight
} from 'lucide-react';
import { Solicitacao, Medicao, Aditivo, AjustePlanilha, PerfilUsuario, EmpresaSeguranca } from '../types';

interface ExecucaoSubmodulosProps {
  activeSubTask: string;
  solicitacoes: Solicitacao[];
  onUpdate: (updated: Solicitacao) => void;
  perfilUsuario: PerfilUsuario;
  onSelect: (sol: Solicitacao) => void;
  empresasSeguranca?: EmpresaSeguranca[];
}

export default function ExecucaoSubmodulos({ 
  activeSubTask, 
  solicitacoes, 
  onUpdate, 
  perfilUsuario, 
  onSelect,
  empresasSeguranca = []
}: ExecucaoSubmodulosProps) {
  // Common state: active selected construction (defaults to first available in execution stage)
  const [selectedSolId, setSelectedSolId] = useState<string>(() => {
    const execSols = solicitacoes.filter(s => s.etapaAtual === 'ordem_inicio' || s.etapaAtual === 'execucao');
    return execSols.length > 0 ? execSols[0].id : '';
  });

  const selectedSol = useMemo(() => {
    return solicitacoes.find(s => s.id === selectedSolId) || null;
  }, [solicitacoes, selectedSolId]);

  const execSols = useMemo(() => {
    return solicitacoes.filter(s => s.etapaAtual === 'ordem_inicio' || s.etapaAtual === 'execucao');
  }, [solicitacoes]);

  // Form states
  const [filtroTexto, setFiltroTexto] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // SRE helper list
  const sresUnicas = useMemo(() => {
    return Array.from(new Set(execSols.map(s => s.sre || 'Sem SRE')));
  }, [execSols]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // 1. DATA CONTEXT FOR SUBMODULES DISPLAY
  const filteredExecSols = useMemo(() => {
    return execSols.filter(s => {
      const query = filtroTexto.toLowerCase();
      return (
        s.nomeEscola.toLowerCase().includes(query) ||
        s.codesc.includes(query) ||
        s.municipio.toLowerCase().includes(query) ||
        (s.empresaContratada || '').toLowerCase().includes(query)
      );
    });
  }, [execSols, filtroTexto]);

  const totalEmExecucao = execSols.length;
  const totalOrcamentoGeral = useMemo(() => {
    return execSols.reduce((acc, s) => acc + (s.valorPlanilha || s.valorHomologadoContratacao || 0), 0);
  }, [execSols]);

  // Handle updates directly on active work
  const handlePropagateUpdate = (updatedSol: Solicitacao) => {
    onUpdate(updatedSol);
    showSuccess('Alterações salvas com sucesso no banco consolidado!');
  };

  return (
    <div className="w-full flex-1 flex flex-col p-4 sm:p-6 bg-slate-50/50">
      
      {/* Toast Alert */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2 animate-bounce font-sans font-bold text-sm">
          <CheckCircle className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* General Header Panel for executing projects */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-extrabold tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                Módulo Físico-Financeiro
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Porta 3000 • SGO Ativo
              </span>
            </div>
            <h1 className="text-xl font-bold font-sans tracking-tight text-slate-900">
              {activeSubTask === 'execucao_cadastro' && '📁 Cadastro de Obras'}
              {activeSubTask === 'execucao_acompanhamento' && '⚙️ Acompanhamento de Execução'}
              {activeSubTask === 'execucao_medicoes' && '📏 Medições Físico-Financeiras'}
              {activeSubTask === 'execucao_contratos' && '📜 Gestão de Contratos de Obra'}
              {activeSubTask === 'execucao_aditivos' && '➕ Aditivos Contratuais'}
              {activeSubTask === 'execucao_ajustes' && '🧮 Ajuste de Saldo de Planilha'}
              {activeSubTask === 'execucao_fiscalizacao' && '🛡️ Fiscalização e Diário de Obras'}
              {activeSubTask === 'execucao_documentos' && '📂 GED - Gerenciador de Documentos'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Visualização exclusiva por subunidades em conformidade com o cronograma pactuado de obras escolares.
            </p>
          </div>

          {/* Quick Stats overview top bar */}
          <div className="flex gap-4 self-start md:self-auto shrink-0">
            <div className="bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/60 font-sans">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Obras Ativas</div>
              <div className="text-base font-black text-slate-900 font-mono">{totalEmExecucao} Escolas</div>
            </div>
            <div className="bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/60 font-sans">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Orçamento Alocado</div>
              <div className="text-base font-black text-blue-750 font-mono">
                R$ {totalOrcamentoGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* Workspace select selector */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row gap-3 items-center">
          <span className="text-xs font-black uppercase text-slate-500 font-sans tracking-wider shrink-0 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-500" />
            Obra sob Foco:
          </span>
          <select
            id="foco-obra-select"
            value={selectedSolId}
            onChange={(e) => setSelectedSolId(e.target.value)}
            className="flex-1 w-full text-xs font-bold p-2 border border-slate-300 rounded-xl bg-slate-50 hover:bg-white text-slate-800 focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-3xs"
          >
            <option value="">-- Selecione uma Escola em Execução --</option>
            {execSols.map(sol => (
              <option key={sol.id} value={sol.id}>
                {sol.nomeEscola} ({sol.municipio} • R$ {(sol.valorPlanilha || sol.valorHomologadoContratacao || 0).toLocaleString('pt-BR')})
              </option>
            ))}
          </select>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              id="search-obras-sub"
              type="text"
              placeholder="Filtrar escolas..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* SUBMODULE RENDERING ROUTER */}

      {/* 1. CADASTRO DE OBRAS */}
      {activeSubTask === 'execucao_cadastro' && (
        <SubCadastro 
          solicitacoes={filteredExecSols} 
          todasSolicitacoes={solicitacoes}
          currentSol={selectedSol} 
          onUpdate={handlePropagateUpdate} 
          onSelect={onSelect}
          setFocoObra={setSelectedSolId}
        />
      )}

      {/* 2. ACOMPANHAMENTO DE EXECUÇÃO */}
      {activeSubTask === 'execucao_acompanhamento' && (
        <SubAcompanhamento 
          currentSol={selectedSol} 
          onUpdate={handlePropagateUpdate} 
        />
      )}

      {/* 3. MEDIÇÕES */}
      {activeSubTask === 'execucao_medicoes' && (
        <SubMedicoes 
          currentSol={selectedSol} 
          onUpdate={handlePropagateUpdate} 
        />
      )}

      {/* 4. CONTRATOS */}
      {activeSubTask === 'execucao_contratos' && (
        <SubContratos 
          currentSol={selectedSol} 
          onUpdate={handlePropagateUpdate} 
          empresasSeguranca={empresasSeguranca}
        />
      )}

      {/* 5. ADITIVOS */}
      {activeSubTask === 'execucao_aditivos' && (
        <SubAditivos 
          currentSol={selectedSol} 
          onUpdate={handlePropagateUpdate} 
        />
      )}

      {/* 6. AJUSTE */}
      {activeSubTask === 'execucao_ajustes' && (
        <SubAjustes 
          currentSol={selectedSol} 
          onUpdate={handlePropagateUpdate} 
        />
      )}

      {/* 7. FISCALIZAÇÃO */}
      {activeSubTask === 'execucao_fiscalizacao' && (
        <SubFiscalizacao 
          currentSol={selectedSol} 
          onUpdate={handlePropagateUpdate} 
        />
      )}

      {/* 8. DOCUMENTOS */}
      {activeSubTask === 'execucao_documentos' && (
        <SubDocumentos 
          currentSol={selectedSol} 
          onUpdate={handlePropagateUpdate} 
        />
      )}

    </div>
  );
}

// ==========================================================
// SUBMODULES COMPONENT IMPLEMENTATIONS
// ==========================================================

// --- 1. SUB CADASTRO DE OBRAS ---
function SubCadastro({ solicitacoes, todasSolicitacoes, currentSol, onUpdate, onSelect, setFocoObra }: { 
  solicitacoes: Solicitacao[]; 
  todasSolicitacoes: Solicitacao[];
  currentSol: Solicitacao | null; 
  onUpdate: (sol: Solicitacao) => void;
  onSelect: (sol: Solicitacao) => void;
  setFocoObra: (id: string) => void;
}) {
  const [showNovoForm, setShowNovoForm] = useState(false);
  
  // Selection of approved technical services
  const [vincularExistente, setVincularExistente] = useState(true);
  const [selectedAtendimentoId, setSelectedAtendimentoId] = useState('');

  // Form states - Technical & Administrative info
  const [escolaInput, setEscolaInput] = useState('');
  const [codEscInput, setCodEscInput] = useState('');
  const [municipioInput, setMunicipioInput] = useState('');
  const [sreInput, setSreInput] = useState('SRE METROPOLITANA A');
  const [valorInput, setValorInput] = useState('');
  const [tipoObraInput, setTipoObraInput] = useState('REFORMA');
  
  // Complementary Obra fields
  const [classeObra, setClasseObra] = useState('Pequeno Porte');
  const [pontuacaoComplexidade, setPontuacaoComplexidade] = useState(2);
  const [fiscalObraAtribuido, setFiscalObraAtribuido] = useState('Eng. Roberto Mendes');
  const [empresaInput, setEmpresaInput] = useState('');
  const [cnpjInput, setCnpjInput] = useState('');
  const [valorHomologadoInput, setValorHomologadoInput] = useState('');

  // Schedule fields
  const [dataInicioInput, setDataInicioInput] = useState(() => new Date().toISOString().split('T')[0]);
  const [duracaoMeses, setDuracaoMeses] = useState('6');
  const [dataTerminoInput, setDataTerminoInput] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split('T')[0];
  });

  // Automatic technical complexity calculation details (from image parameters)
  const getValorScore = (valor: number): { score: number; label: string } => {
    if (valor > 2000000) return { score: 5, label: 'Acima de R$ 2.000.000 (Peso 5)' };
    if (valor >= 1000000) return { score: 4, label: 'R$ 1.000.000 a R$ 2.000.000 (Peso 4)' };
    if (valor >= 500000) return { score: 3, label: 'R$ 500.000 a R$ 1.000.000 (Peso 3)' };
    if (valor >= 100000) return { score: 2, label: 'R$ 100.000 a R$ 500.000 (Peso 2)' };
    return { score: 1, label: 'Até R$ 100.000 (Peso 1)' };
  };

  const getTipoObraScore = (tipo: string): { score: number; label: string } => {
    const normalized = (tipo || '').toLowerCase();
    if (normalized.includes('constru_') || normalized.includes('construc') || normalized.includes('construç')) {
      return { score: 5, label: 'Construção (Peso 5)' };
    }
    if (normalized.includes('amplia') || normalized.includes('quadra')) {
      return { score: 4, label: 'Ampliação / Quadra (Peso 4)' };
    }
    if (normalized.includes('reform')) {
      return { score: 3, label: 'Reforma (Peso 3)' };
    }
    if (normalized.includes('acessi') || normalized.includes('pne')) {
      return { score: 2, label: 'Acessibilidade (Peso 2)' };
    }
    if (normalized.includes('projet') || normalized.includes('estud')) {
      return { score: 1, label: 'Projeto (Peso 1)' };
    }
    return { score: 3, label: 'Reforma/Outros (Peso 3)' };
  };

  const getDuracaoScore = (meses: number): { score: number; label: string } => {
    if (meses > 12) return { score: 5, label: 'Acima de 12 meses (Peso 5)' };
    if (meses >= 9) return { score: 4, label: '9 a 12 meses (Peso 4)' };
    if (meses >= 6) return { score: 3, label: '6 a 9 meses (Peso 3)' };
    if (meses >= 3) return { score: 2, label: '3 a 6 meses (Peso 2)' };
    return { score: 1, label: 'Até 3 meses (Peso 1)' };
  };

  const parsedValor = parseFloat(valorHomologadoInput || valorInput) || 0;
  const parsedDuracao = parseInt(duracaoMeses) || 1;

  const complexidadeCalculada = useMemo(() => {
    const v = getValorScore(parsedValor);
    const t = getTipoObraScore(tipoObraInput);
    const d = getDuracaoScore(parsedDuracao);
    
    // IEE = 75% valor, 15% tipo, 10% duracao
    const pontuacao = (v.score * 0.75) + (t.score * 0.15) + (d.score * 0.10);

    let classe: 'I' | 'II' | 'III' | 'IV' = 'I';
    let classificacao = 'Baixa Complexidade';
    let colorClass = 'text-green-600 bg-green-50 border-green-250';

    if (pontuacao >= 3.8) {
      classe = 'IV';
      classificacao = 'Muito Alta Complexidade';
      colorClass = 'text-rose-600 bg-rose-50 border-rose-250';
    } else if (pontuacao >= 3.2) {
      classe = 'III';
      classificacao = 'Alta Complexidade';
      colorClass = 'text-orange-600 bg-orange-50 border-orange-250';
    } else if (pontuacao >= 2.0) {
      classe = 'II';
      classificacao = 'Média Complexidade';
      colorClass = 'text-amber-600 bg-amber-50 border-amber-250';
    }

    // Map to option fields
    let mappedPorte = 'Pequeno Porte';
    if (classe === 'IV') {
      mappedPorte = 'Alta Complexidade / Especial';
    } else if (classe === 'III') {
      mappedPorte = 'Grande Porte';
    } else if (classe === 'II') {
      mappedPorte = 'Médio Porte';
    }

    return {
      pontuacao: Number(pontuacao.toFixed(2)),
      classe,
      classificacao,
      colorClass,
      v,
      t,
      d,
      mappedPorte
    };
  }, [parsedValor, tipoObraInput, parsedDuracao]);

  // Sync automatic weights to state
  useEffect(() => {
    setClasseObra(complexidadeCalculada.mappedPorte);
    setPontuacaoComplexidade(complexidadeCalculada.pontuacao);
  }, [complexidadeCalculada]);

  // Filter possible approved services for import
  const atendimentosDisponiveis = useMemo(() => {
    return todasSolicitacoes.filter(
      s => s.etapaAtual !== 'execucao' && s.etapaAtual !== 'ordem_inicio' && s.etapaAtual !== 'cancelado'
    );
  }, [todasSolicitacoes]);

  // When selected approved service changes, autofill information
  const handleAtendimentoChange = (id: string) => {
    setSelectedAtendimentoId(id);
    if (!id) return;
    const selected = todasSolicitacoes.find(s => s.id === id);
    if (selected) {
      setEscolaInput(selected.nomeEscola);
      setCodEscInput(selected.codesc);
      setMunicipioInput(selected.municipio || '');
      setSreInput(selected.sre || 'SRE METROPOLITANA A');
      const val = selected.valorPlanilha || selected.valorHomologado || 0;
      setValorInput(val.toString());
      setValorHomologadoInput(val.toString());
      setEmpresaInput(selected.empresaContratada || '');
      setCnpjInput(selected.cnpjEmpresa || '');
      setTipoObraInput(selected.tipoObra || selected.tipo || 'REFORMA');
    }
  };

  // Keep end date synced when start date or duration changes
  const handleDateOrDurationCalc = (start: string, monthsStr: string) => {
    setDataInicioInput(start);
    setDuracaoMeses(monthsStr);
    const months = parseInt(monthsStr) || 1;
    if (start) {
      const d = new Date(start + 'T12:00:00');
      d.setMonth(d.getMonth() + months);
      setDataTerminoInput(d.toISOString().split('T')[0]);
    }
  };

  const submitNovaObra = (e: React.FormEvent) => {
    e.preventDefault();
    if (vincularExistente && !selectedAtendimentoId) {
      alert('Selecione um atendimento técnico aprovado para importar.');
      return;
    }
    if (!escolaInput || !codEscInput || !valorInput) return;

    const baseVal = parseFloat(valorInput) || 0;
    const finalVal = parseFloat(valorHomologadoInput) || baseVal;

    // Is it based on an existing ticket/request, or creating fresh?
    if (vincularExistente && selectedAtendimentoId) {
      const original = todasSolicitacoes.find(s => s.id === selectedAtendimentoId);
      if (original) {
        const obraAtualizada: Solicitacao = {
          ...original,
          etapaAtual: 'execucao',
          statusObra: 'Não Iniciada',
          classeObra,
          pontuacaoComplexidade,
          fiscalObraAtribuido,
          empresaContratada: empresaInput || 'Construtora do Estado S.A.',
          cnpjEmpresa: cnpjInput || '02.455.996/0001-34',
          statusContratoEmpresa: 'Ativa',
          valorHomologadoContratacao: finalVal,
          valorPlanilha: baseVal,
          dataOrdemInicio: dataInicioInput,
          duracaoObraMeses: parseInt(duracaoMeses) || 6,
          previsaoTerminoObra: dataTerminoInput,
          historicoEtapas: [
            ...(original.historicoEtapas || []),
            { 
              etapa: 'execucao', 
              data: new Date().toISOString().split('T')[0], 
              responsavel: 'Gestor de Obras SGO' 
            }
          ]
        };
        onUpdate(obraAtualizada);
        setFocoObra(obraAtualizada.id);
      }
    } else {
      // Manual entry fallback
      const novaObra: Solicitacao = {
        id: `sol_${Date.now()}`,
        nomeEscola: escolaInput,
        codesc: codEscInput,
        tipo: tipoObraInput,
        tipoObra: tipoObraInput,
        municipio: municipioInput || 'Município SGO',
        sre: sreInput,
        dataCriacao: new Date().toISOString().split('T')[0],
        etapaAtual: 'execucao',
        historicoEtapas: [{ etapa: 'execucao', data: new Date().toISOString().split('T')[0], responsavel: 'Gestor Operacional DORE' }],
        valorPlanilha: baseVal,
        valorHomologadoContratacao: finalVal,
        empresaContratada: empresaInput || 'Construtora do Estado S.A.',
        cnpjEmpresa: cnpjInput || '02.455.996/0001-34',
        statusContratoEmpresa: 'Ativa',
        classeObra,
        pontuacaoComplexidade,
        fiscalObraAtribuido,
        dataOrdemInicio: dataInicioInput,
        duracaoObraMeses: parseInt(duracaoMeses) || 6,
        previsaoTerminoObra: dataTerminoInput,
        statusObra: 'Não Iniciada',
        documentos: [],
        medicoes: [],
        aditivos: [],
        ajustes: [],
        numeroPAF: `PAF-${Math.floor(1000 + Math.random() * 9000)}/2026`,
      };
      onUpdate(novaObra);
      setFocoObra(novaObra.id);
    }

    setShowNovoForm(false);
    // Reset inputs
    setSelectedAtendimentoId('');
    setEscolaInput('');
    setCodEscInput('');
    setMunicipioInput('');
    setValorInput('');
    setValorHomologadoInput('');
    setEmpresaInput('');
    setCnpjInput('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
      <div className="lg:col-span-2 space-y-4">
        
        {/* Header toolbar for listing */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 gap-3 shadow-3xs">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <ClipboardCheck className="w-4.5 h-4.5 text-blue-600" />
              Obras Oficializadas (SGO Ativo)
            </h2>
            <p className="text-[10px] text-slate-500">Listagem de escolas com convênio ou execução técnica cadastrada</p>
          </div>
          <button
            id="btn-registra-obra-obras"
            onClick={() => setShowNovoForm(!showNovoForm)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-white font-bold bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Oficialmente Obra
          </button>
        </div>

        {/* Form Wizard - New register */}
        {showNovoForm && (
          <form onSubmit={submitNovaObra} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 animate-scaleIn">
            
            <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
              <h3 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" /> 
                Oficialização de Novo Cadastro de Obra
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-bold">Modo:</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 border border-amber-205 text-amber-700 font-bold">
                  SGO-IMPORT-ENGINE
                </span>
              </div>
            </div>

            {/* Toggle import VS scratch */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 grid grid-cols-2 gap-2 text-center">
              <button
                type="button"
                onClick={() => setVincularExistente(true)}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                  vincularExistente 
                    ? 'bg-blue-600 text-white shadow-3xs' 
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Importar Atendimento Técnico Aprovado
              </button>
              <button
                type="button"
                onClick={() => {
                  setVincularExistente(false);
                  setSelectedAtendimentoId('');
                  setEscolaInput('');
                  setCodEscInput('');
                  setMunicipioInput('');
                  setValorInput('');
                }}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                  !vincularExistente 
                    ? 'bg-blue-600 text-white shadow-3xs' 
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Cadastro Manual do Zero (Alternativo)
              </button>
            </div>

            {/* Selection step */}
            {vincularExistente && (
              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-2">
                <label className="text-[10px] font-black text-blue-700 uppercase block">
                  Selecione o Atendimento Técnico Aprovado para importar:*
                </label>
                <select
                  id="select-atendimento-obra"
                  required={vincularExistente}
                  value={selectedAtendimentoId}
                  onChange={(e) => handleAtendimentoChange(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Escolha um ticket técnico aprovado --</option>
                  {atendimentosDisponiveis.map(at => (
                    <option key={at.id} value={at.id}>
                      {at.nomeEscola} ({at.municipio} • CODESC {at.codesc} • Etapa: {at.etapaAtual.toUpperCase()})
                    </option>
                  ))}
                </select>
                <p className="text-[9.5px] text-slate-500">
                  💡 Os dados técnicos de localização, escola e orçamentos de planilha serão importados automaticamente após a seleção do ticket técnico.
                </p>
              </div>
            )}

            {/* Auto-imported Details / Manual details section */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-1 pb-1 border-b border-slate-100">
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                {vincularExistente ? 'Dados Importados da Análise Técnica' : 'Informações da Escola e Base Técnica'}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className={vincularExistente ? "col-span-1 md:col-span-2" : "col-span-1 md:col-span-2"}>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Nome Completo da Unidade de Ensino</label>
                  <input
                    type="text"
                    required
                    disabled={vincularExistente}
                    value={escolaInput}
                    onChange={(e) => setEscolaInput(e.target.value)}
                    placeholder="Ex. EE Professor João Guimarães"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 disabled:bg-slate-100/80 text-slate-800 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Código da Escola (CODESC)</label>
                  <input
                    type="text"
                    required
                    disabled={vincularExistente}
                    value={codEscInput}
                    onChange={(e) => setCodEscInput(e.target.value)}
                    placeholder="Ex: 19020"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 disabled:bg-slate-100/80 text-slate-800 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Município</label>
                  <input
                    type="text"
                    disabled={vincularExistente}
                    value={municipioInput}
                    onChange={(e) => setMunicipioInput(e.target.value)}
                    placeholder="Ex: Belo Horizonte"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 disabled:bg-slate-100/80 text-slate-800 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Superintendência Regional (SRE)</label>
                  <select
                    disabled={vincularExistente}
                    value={sreInput}
                    onChange={(e) => setSreInput(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 disabled:bg-slate-100/80 text-slate-800 focus:outline-hidden"
                  >
                    <option value="SRE METROPOLITANA A">SRE METROPOLITANA A</option>
                    <option value="SRE METROPOLITANA B">SRE METROPOLITANA B</option>
                    <option value="SRE METROPOLITANA C">SRE METROPOLITANA C</option>
                    <option value="SRE OURO PRETO">SRE OURO PRETO</option>
                    <option value="SRE IPATINGA">SRE IPATINGA</option>
                    <option value="SRE PATOS DE MINAS">SRE PATOS DE MINAS</option>
                    <option value="SRE DIAMANTINA">SRE DIAMANTINA</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Valor Unitário Orçamentário da Planilha (R$)</label>
                  <input
                    type="number"
                    required
                    disabled={vincularExistente}
                    value={valorInput}
                    onChange={(e) => {
                      setValorInput(e.target.value);
                      if (!valorHomologadoInput) setValorHomologadoInput(e.target.value);
                    }}
                    placeholder="Ex: 450000"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 disabled:bg-slate-100/80 text-slate-800 font-mono font-bold focus:outline-hidden text-emerald-700"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Tipo de Obra (Classificação DORE)</label>
                  <select
                    disabled={vincularExistente}
                    value={tipoObraInput}
                    onChange={(e) => setTipoObraInput(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 disabled:bg-slate-100/80 text-slate-800 focus:outline-hidden font-bold"
                  >
                    <option value="CONSTRUÇÃO">CONSTRUÇÃO</option>
                    <option value="AMPLIAÇÃO">AMPLIAÇÃO</option>
                    <option value="REFORMA">REFORMA</option>
                    <option value="ACESSIBILIDADE">ACESSIBILIDADE</option>
                    <option value="PROJETO">PROJETO</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Complementary information fields - REQUIREMENT CONSTRAINT */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
              <h4 className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-1 pb-1 border-b border-slate-100">
                <Wrench className="w-3.5 h-3.5 text-blue-500" />
                Complementar Dados de Execução e Responsabilidade
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* AUTOMATED COMPLEXITY WIDGET - AS PER REQUIREMENTS */}
                <div className="col-span-1 md:col-span-2 bg-[#f8fafc] p-4 rounded-xl border border-slate-200 space-y-3.5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <span className="text-[10px] uppercase font-black text-slate-700 tracking-wider flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                      Cálculo Automático de Complexidade e Enquadramento (DORE)
                    </span>
                    <div className={`px-2.5 py-1 rounded-lg border text-xs font-black flex items-center gap-1.5 ${complexidadeCalculada.colorClass}`}>
                      <span>CLASSE {complexidadeCalculada.classe}</span>
                      <span className="w-1 rounded-full bg-current opacity-60"></span>
                      <span className="text-[10px] tracking-wider uppercase font-extrabold">{complexidadeCalculada.classificacao}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Contrato Card */}
                    <div className="bg-white p-3 text-slate-800 rounded-lg border border-slate-200/60 flex flex-col justify-between">
                      <span className="text-[9px] font-black text-slate-400 uppercase">Orçamento (75% Peso)</span>
                      <span className="text-xs font-bold text-slate-700 truncate block mt-0.5" title={complexidadeCalculada.v.label}>
                        {complexidadeCalculada.v.label}
                      </span>
                      <div className="flex justify-between items-center mt-2 pt-1 border-t border-slate-100">
                        <span className="text-[9px] text-slate-400">Score</span>
                        <span className="text-xs font-extrabold font-mono text-amber-600">{complexidadeCalculada.v.score}</span>
                        <span className="text-[9px] text-slate-400">Pontos</span>
                        <span className="text-xs font-extrabold font-mono text-blue-600">{(complexidadeCalculada.v.score * 0.75).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Tipo Card */}
                    <div className="bg-white p-3 text-slate-800 rounded-lg border border-slate-200/60 flex flex-col justify-between">
                      <span className="text-[9px] font-black text-slate-400 uppercase">Tipo Obra (15% Peso)</span>
                      <span className="text-xs font-bold text-slate-700 truncate block mt-0.5" title={complexidadeCalculada.t.label}>
                        {complexidadeCalculada.t.label}
                      </span>
                      <div className="flex justify-between items-center mt-2 pt-1 border-t border-slate-100">
                        <span className="text-[9px] text-slate-400">Score</span>
                        <span className="text-xs font-extrabold font-mono text-amber-600">{complexidadeCalculada.t.score}</span>
                        <span className="text-[9px] text-slate-400">Pontos</span>
                        <span className="text-xs font-extrabold font-mono text-blue-600">{(complexidadeCalculada.t.score * 0.15).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Duração Card */}
                    <div className="bg-white p-3 text-slate-800 rounded-lg border border-slate-200/60 flex flex-col justify-between">
                      <span className="text-[9px] font-black text-slate-400 uppercase">Duração (10% Peso)</span>
                      <span className="text-xs font-bold text-slate-700 truncate block mt-0.5" title={complexidadeCalculada.d.label}>
                        {complexidadeCalculada.d.label}
                      </span>
                      <div className="flex justify-between items-center mt-2 pt-1 border-t border-slate-100">
                        <span className="text-[9px] text-slate-400">Score</span>
                        <span className="text-xs font-extrabold font-mono text-amber-600">{complexidadeCalculada.d.score}</span>
                        <span className="text-[9px] text-slate-400">Pontos</span>
                        <span className="text-xs font-extrabold font-mono text-blue-600">{(complexidadeCalculada.d.score * 0.10).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary math bar */}
                  <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-105 flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px]">
                    <span className="text-slate-600 font-semibold leading-tight text-center sm:text-left">
                      Fórmula IEE: <span className="font-mono text-slate-700 font-bold">({complexidadeCalculada.v.score} × 0.75) + ({complexidadeCalculada.t.score} × 0.15) + ({complexidadeCalculada.d.score} × 0.10)</span>
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-slate-500 font-black uppercase">IEE Final:</span>
                      <span className="font-extrabold text-blue-700 font-mono bg-blue-100 px-2.5 py-0.5 border border-blue-200 rounded-lg text-xs">
                        {complexidadeCalculada.pontuacao} / 5.00
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Definir Fiscal de Acompanhamento Técnico*</label>
                  <select
                    value={fiscalObraAtribuido}
                    onChange={(e) => setFiscalObraAtribuido(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 font-bold focus:outline-hidden"
                  >
                    <option value="Eng. Roberto Mendes">Eng. Roberto Mendes (CREA 142.532/D)</option>
                    <option value="Arq. Patrícia Silveira">Arq. Patrícia Silveira (CAU A44.120-3)</option>
                    <option value="Eng. Marcos Pontes">Eng. Marcos Pontes (CREA 95.841/D)</option>
                    <option value="Enga. Luciana Duarte">Enga. Luciana Duarte (CREA 168.990/D)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Empresa Construtora Responsável</label>
                  <input
                    type="text"
                    value={empresaInput}
                    onChange={(e) => setEmpresaInput(e.target.value)}
                    placeholder="Ex. Construtora Minas Gerais Ltda."
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">CNPJ da Empresa Construtora</label>
                  <input
                    type="text"
                    value={cnpjInput}
                    onChange={(e) => setCnpjInput(e.target.value)}
                    placeholder="Ex. 12.345.678/0001-90"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Valor Homologado da Contratação (R$)</label>
                  <input
                    type="number"
                    value={valorHomologadoInput}
                    onChange={(e) => setValorHomologadoInput(e.target.value)}
                    placeholder="Ex. 445000"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 font-mono text-emerald-800 font-bold focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Schedule metrics - REQUIREMENT CONSTRAINT */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-1 pb-1 border-b border-slate-100">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                Registrar Prazos da Ordem de Serviço
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Data da Ordem de Início*</label>
                  <input
                    type="date"
                    required
                    value={dataInicioInput}
                    onChange={(e) => handleDateOrDurationCalc(e.target.value, duracaoMeses)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-hidden font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Duração Planejada (Meses)*</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="120"
                    value={duracaoMeses}
                    onChange={(e) => handleDateOrDurationCalc(dataInicioInput, e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-hidden font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Previsão Término da Obra</label>
                  <input
                    type="date"
                    required
                    value={dataTerminoInput}
                    onChange={(e) => setDataTerminoInput(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-hidden font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowNovoForm(false)}
                className="px-4 py-2 text-xs text-slate-500 hover:bg-slate-200 rounded-xl cursor-pointer font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs text-white font-black uppercase bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle className="w-4 h-4" />
                Finalizar e Registrar
              </button>
            </div>
          </form>
        )}

        {/* List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {solicitacoes.map(sol => {
            const sumMedicoes = sol.medicoes?.reduce((sum, m) => sum + m.valor, 0) || 0;
            const percentage = (sol.valorPlanilha || 1) > 0 ? (sumMedicoes / (sol.valorPlanilha || 1)) * 100 : 0;
            const isFocussed = currentSol?.id === sol.id;

            return (
              <div 
                key={sol.id} 
                className={`bg-white rounded-2xl border p-4 hover:shadow-md transition-all relative ${
                  isFocussed ? 'ring-2 ring-blue-500 border-transparent shadow-xs' : 'border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <span className="text-[9px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold uppercase">
                    CODESC {sol.codesc}
                  </span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                    sol.statusObra === 'Em Andamento' ? 'bg-amber-50 text-amber-700 border border-amber-200/50' : 
                    sol.statusObra === 'Concluída' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' :
                    sol.statusObra === 'Paralisada' ? 'bg-rose-50 text-rose-700 border border-rose-200/50' :
                    'bg-slate-50 text-slate-500 border border-slate-200'
                  }`}>
                    {sol.statusObra || 'Não Iniciada'}
                  </span>
                </div>

                <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight line-clamp-2 min-h-[32px]">
                  {sol.nomeEscola}
                </h3>

                <div className="flex items-center gap-1.5 mt-2 mb-3 text-[10px] text-slate-500">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{sol.municipio} • {sol.sre}</span>
                </div>

                {/* Progress bar info */}
                <div className="space-y-1 mb-4">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">Progresso Físico</span>
                    <span className="font-mono font-bold text-slate-800">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        percentage > 75 ? 'bg-emerald-500' :
                        percentage > 35 ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>
                </div>

                {/* Card footer details and primary actions */}
                <div className="flex justify-between items-center pt-3 @border-t border-slate-50">
                  <div className="text-left">
                    <div className="text-[9px] text-slate-400 uppercase font-black">Empresa Contratada</div>
                    <div className="text-[10px] text-slate-700 font-bold truncate max-w-[120px]">{sol.empresaContratada || 'Aguardando Ordem'}</div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFocoObra(sol.id)}
                      className="px-2.5 py-1 text-[9.5px] font-extrabold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
                    >
                      Focalizar
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelect(sol)}
                      className="px-2.5 py-1 text-[9.5px] font-extrabold text-white bg-slate-800 hover:bg-slate-900 rounded-lg cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> Abrir Dossiê
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected work detailed overview in CADASTRO subtask */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-3xs">
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
          <Info className="w-4 h-4 text-blue-500" />
          Ficha do Cadastro Consolidado
        </h2>
        
        {currentSol ? (
          <div className="space-y-4 font-sans">
            <div>
              <span className="text-[9.5px] text-slate-400 uppercase font-extrabold">Unidade Escolar</span>
              <p className="text-xs font-bold text-slate-800 uppercase">{currentSol.nomeEscola}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[9px] text-slate-400 uppercase block font-bold">Início Real</span>
                <p className="font-bold text-slate-700 font-mono">{currentSol.dataOrdemInicio || 'Aguardando Ordem'}</p>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase block font-bold">Previsão Término</span>
                <p className="font-bold text-slate-700 font-mono">{currentSol.previsaoTerminoObra || '180 dias'}</p>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase block font-bold">Classificação</span>
                <p className="font-bold text-slate-700">{currentSol.classeObra || 'Pequeno Porte'}</p>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase block font-bold">Superintendência</span>
                <p className="font-bold text-slate-700 uppercase">{currentSol.sre}</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2">
              <span className="text-[9.5px] text-slate-500 font-black uppercase tracking-wider block">Prazos & Responsabilidade</span>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Duração:</span>
                <span className="font-semibold text-slate-900">{currentSol.duracaoObraMeses || 6} Meses</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Complexidade:</span>
                <span className="font-bold text-amber-600">Grau {currentSol.pontuacaoComplexidade || 2}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Fiscal Responsável:</span>
                <span className="font-semibold text-slate-800">{currentSol.fiscalObraAtribuido || 'Não Definido'}</span>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2">
              <span className="text-[9.5px] text-emerald-800 font-black uppercase tracking-wider block">Dados Financeiros Vigentes</span>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Valor Homologado:</span>
                <span className="font-bold text-emerald-800 font-mono">
                  R$ {(currentSol.valorHomologadoContratacao || currentSol.valorPlanilha || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Dotação de PAF:</span>
                <span className="font-bold text-indigo-700 font-mono">{currentSol.numeroPAF || 'Não Consta'}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelect(currentSol)}
              className="w-full text-center px-4 py-2.5 text-xs text-white font-black uppercase bg-slate-800 hover:bg-slate-900 rounded-xl cursor-pointer transition-colors"
            >
              Exibir Fluxo Completo Detalhado
            </button>
          </div>
        ) : (
          <div className="text-center py-10 text-slate-400">
            <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-semibold">Selecione uma escola ao lado para visualizar o cadastro consolidado.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- 2. SUB ACOMPANHAMENTO DE EXECUÇÃO ---
function SubAcompanhamento({ currentSol, onUpdate }: { currentSol: Solicitacao | null; onUpdate: (sol: Solicitacao) => void }) {
  const [activeTab, setActiveTab2] = useState<'dashboard' | 'diario' | 'vistorias' | 'restricoes'>('dashboard');

  // Dashboard states
  const [novoStatus, setNovoStatus] = useState<'Não Iniciada' | 'Em Andamento' | 'Paralisada' | 'Concluída'>('Não Iniciada');
  const [descricaoProgresso, setDescricaoProgresso] = useState('');

  // Diário de Obra states
  const [diarioTexto, setDiarioTexto] = useState('');
  const [diarioCategoria, setDiarioCategoria] = useState<'Ocorrência' | 'Clima' | 'Trabalho' | 'Materiais' | 'Equipe' | 'Segurança'>('Ocorrência');
  const [diarioBusca, setDiarioBusca] = useState('');

  // Vistorias states
  const [vistoriaData, setVistoriaData] = useState(new Date().toISOString().split('T')[0]);
  const [vistoVistoriador, setVistoVistoriador] = useState('');
  const [vistoResultado, setVistoResultado] = useState<'Aprovada' | 'Aprovada com Ressalvas' | 'Reprovada'>('Aprovada');
  const [vistoLaudoResumido, setVistoLaudoResumido] = useState('');

  // Restrições states
  const [restricaoDesc, setRestricaoDesc] = useState('');
  const [restricaoCategoria, setRestricaoCategoria] = useState<'Financeira' | 'Ambiental' | 'Técnica' | 'Climática' | 'Fornecedor' | 'Outros'>('Técnica');
  const [restricaoImpacto, setRestricaoImpacto] = useState<'Alto' | 'Médio' | 'Baixo'>('Médio');
  const [restricaoPrevisao, setRestricaoPrevisao] = useState('');
  const [parecerResolucaoTxt, setParecerResolucaoTxt] = useState('');
  const [resolvendoId, setResolvendoId] = useState<string | null>(null);

  if (!currentSol) return <NoObraSelected />;

  // Sync state whenever selected school changes
  useEffect(() => {
    if (currentSol) {
      setNovoStatus(currentSol.statusObra || 'Não Iniciada');
      setVistoVistoriador(currentSol.fiscalObraAtribuido || '');
    }
  }, [currentSol.id, currentSol.fiscalObraAtribuido]);

  const sumMedicoes = currentSol.medicoes?.reduce((sum, m) => sum + m.valor, 0) || 0;
  const originalBudget = currentSol.valorPlanilha || currentSol.valorHomologadoContratacao || 1;
  const currentPercent = originalBudget > 0 ? (sumMedicoes / originalBudget) * 105 : 0;
  const safePercent = Math.min(100, Math.max(0, currentPercent));

  // Default values lazily resolved for rendering if not initialized on Solicitacao
  const listDiarios = currentSol.diariosObra || [
    { id: 'd-1', data: '2026-05-20', texto: 'Vistoria de rotina realizada pelo fiscal técnico de engenharia. Avanço físico estimado em 45%, pilares e laje do bloco principal concluídos com sucesso. Recomenda-se maior velocidade na cobertura antes do período climático instável.', autor: currentSol.fiscalObraAtribuido || 'Engª. Helena Rocha', categoria: 'Ocorrência' as const },
    { id: 'd-2', data: '2026-05-10', texto: 'Verificação técnica geral em conjunto com a construtora. Instalações elétricas em bom andamento, tubulação subterrânea executada, materiais e insumos recebidos no canteiro conforme especificações e planilhas.', autor: currentSol.fiscalObraAtribuido || 'Engª. Helena Rocha', categoria: 'Trabalho' as const }
  ];

  const listVistorias = currentSol.vistoriasObra || [
    { id: 'v-1', dataVistoria: '2026-05-20', vistoriador: currentSol.fiscalObraAtribuido || 'Engª. Helena Rocha', laudoResumido: 'Instalações hidráulicas testadas em pressão interna e aprovadas sem vazamentos ou infiltrações registradas de forma crônica.', resultado: 'Aprovada' as const },
    { id: 'v-2', dataVistoria: '2026-05-10', vistoriador: currentSol.fiscalObraAtribuido || 'Engª. Helena Rocha', laudoResumido: 'Alvenaria com pequenas irregularidades pontuais de esquadro no bloco B, construtora orientada a efetuar correções físicas imediatas.', resultado: 'Aprovada com Ressalvas' as const }
  ];

  const listRestricoes = currentSol.restricoesObra || [
    { id: 'r-1', descricao: 'Atraso na entrega do cimento estrutural e telhas termoacústicas pela distribuidora homologada.', dataIdentificacao: '2026-05-15', impacto: 'Médio' as const, status: 'Ativa' as const, categoria: 'Fornecedor' as const, previsaoResolucao: '2026-06-05' },
    { id: 'r-2', descricao: 'Necessidade de remanejamento técnico de cabo de alta tensão adjacente ao bloco C pela concessionária CEMIG.', dataIdentificacao: '2026-05-02', impacto: 'Alto' as const, status: 'Ativa' as const, categoria: 'Técnica' as const, previsaoResolucao: '2026-06-20' }
  ];

  // Action handlers
  const updateObraStatus = () => {
    const updated = {
      ...currentSol,
      statusObra: novoStatus,
      observacoesFicha: descricaoProgresso ? `${descricaoProgresso}. (Alteraço de Status: ${novoStatus})` : currentSol.observacoesFicha
    };
    onUpdate(updated);
    setDescricaoProgresso('');
  };

  const adicNovoDiario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diarioTexto.trim()) return;

    const novoReg = {
      id: `d-${Date.now()}`,
      data: new Date().toISOString().split('T')[0],
      texto: diarioTexto,
      autor: currentSol.fiscalObraAtribuido || 'Fiscal de Campo DORE',
      categoria: diarioCategoria
    };

    const updated = {
      ...currentSol,
      diariosObra: [novoReg, ...listDiarios]
    };

    onUpdate(updated);
    setDiarioTexto('');
  };

  const deletarDiario = (id: string) => {
    const updated = {
      ...currentSol,
      diariosObra: listDiarios.filter(d => d.id !== id)
    };
    onUpdate(updated);
  };

  const adicNovaVistoria = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vistoLaudoResumido.trim()) return;

    const novoReg = {
      id: `v-${Date.now()}`,
      dataVistoria: vistoriaData,
      vistoriador: vistoVistoriador || 'Engenheiro Responsável',
      laudoResumido: vistoLaudoResumido,
      resultado: vistoResultado
    };

    const updated = {
      ...currentSol,
      vistoriasObra: [novoReg, ...listVistorias]
    };

    onUpdate(updated);
    setVistoLaudoResumido('');
  };

  const deletarVistoria = (id: string) => {
    const updated = {
      ...currentSol,
      vistoriasObra: listVistorias.filter(v => v.id !== id)
    };
    onUpdate(updated);
  };

  const adicNovaRestricao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restricaoDesc.trim()) return;

    const novoReg = {
      id: `r-${Date.now()}`,
      descricao: restricaoDesc,
      dataIdentificacao: new Date().toISOString().split('T')[0],
      impacto: restricaoImpacto,
      status: 'Ativa' as const,
      categoria: restricaoCategoria,
      previsaoResolucao: restricaoPrevisao || undefined
    };

    const updated = {
      ...currentSol,
      restricoesObra: [novoReg, ...listRestricoes]
    };

    onUpdate(updated);
    setRestricaoDesc('');
    setRestricaoPrevisao('');
  };

  const resolverRestricao = (id: string) => {
    if (!parecerResolucaoTxt.trim()) return;

    const updatedRestricoes = listRestricoes.map(r => {
      if (r.id === id) {
        return {
          ...r,
          status: 'Resolvida' as const,
          resolvidaEm: new Date().toISOString().split('T')[0],
          parecerResolucao: parecerResolucaoTxt
        };
      }
      return r;
    });

    const updated = {
      ...currentSol,
      restricoesObra: updatedRestricoes
    };

    onUpdate(updated);
    setParecerResolucaoTxt('');
    setResolvendoId(null);
  };

  const deletarRestricao = (id: string) => {
    const updated = {
      ...currentSol,
      restricoesObra: listRestricoes.filter(r => r.id !== id)
    };
    onUpdate(updated);
  };

  // Filter diaries based on text search
  const filteredDiarios = listDiarios.filter(d => {
    const term = diarioBusca.toLowerCase();
    return d.texto.toLowerCase().includes(term) || d.categoria?.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Submenu tab buttons */}
      <div className="flex flex-wrap gap-1 bg-slate-200/50 p-1 rounded-xl border border-slate-300/40 text-sans">
        <button
          type="button"
          onClick={() => setActiveTab2('dashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-blue-600 text-white shadow-3xs'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Dashboard
        </button>

        <button
          type="button"
          onClick={() => setActiveTab2('diario')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
            activeTab === 'diario'
              ? 'bg-blue-600 text-white shadow-3xs'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Diário de Obra
        </button>

        <button
          type="button"
          onClick={() => setActiveTab2('vistorias')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
            activeTab === 'vistorias'
              ? 'bg-blue-600 text-white shadow-3xs'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Vistorias
        </button>

        <button
          type="button"
          onClick={() => setActiveTab2('restricoes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
            activeTab === 'restricoes'
              ? 'bg-blue-600 text-white shadow-3xs'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          Restrições
          {listRestricoes.filter(r => r.status === 'Ativa').length > 0 && (
            <span className="px-1.5 py-0.2 text-[9px] bg-rose-600 text-white rounded-full font-mono font-black animate-pulse">
              {listRestricoes.filter(r => r.status === 'Ativa').length}
            </span>
          )}
        </button>
      </div>

      {/* DASHBOARD TAB CONTENT */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* Circular progress card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                <HardHat className="w-4 h-4 text-amber-500 animate-pulse" />
                Avanço Físico-Financeiro Consolidado
              </h3>

              <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/40 flex items-center gap-3">
                <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                <p className="text-[11px] text-amber-900 leading-normal font-sans font-medium">
                  <strong>Controle Gerencial DORE:</strong> A porcentagem de avanço físico mostrada no painel é calculada em conformidade com o consolidado das medições físico-financeiras enviadas e homologadas.
                </p>
              </div>

              <div className="py-6 flex flex-col items-center justify-center space-y-4 bg-slate-50/40 rounded-xl border border-slate-100">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      stroke="#2563eb" 
                      strokeWidth="8" 
                      fill="transparent" 
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (251.2 * safePercent) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-slate-800 font-mono tracking-tighter">
                      {safePercent.toFixed(1)}%
                    </span>
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Executado</span>
                  </div>
                </div>

                <div className="text-center">
                  <span className="text-[9.5px] uppercase font-bold text-slate-400 block tracking-wider">Total Medido Acumulado</span>
                  <p className="text-sm font-black text-slate-800 font-mono mt-0.5">
                    R$ {sumMedicoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            {/* Change progress status form */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-2">
                <Scale className="w-4 h-4 text-blue-500" /> Atualizar Situação Operacional da Obra
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">Status da Obra</label>
                  <select
                    value={novoStatus}
                    onChange={(e) => setNovoStatus(e.target.value as any)}
                    className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Não Iniciada">Não Iniciada</option>
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Paralisada">Paralisada</option>
                    <option value="Concluída">Concluída</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">Nota Pública do Diário / Progresso</label>
                  <input
                    type="text"
                    placeholder="Ex. Fundações finalizadas, iniciando alvenaria estrutural..."
                    value={descricaoProgresso}
                    onChange={(e) => setDescricaoProgresso(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={updateObraStatus}
                  className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer shadow-3xs"
                >
                  Registrar Alteração de Status
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar milestones */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                <Clock className="w-4 h-4 text-indigo-500" /> Cronograma de Marcos Físicos
              </h3>

              <div className="space-y-6 relative pl-3.5 border-l border-slate-200/80 ml-2 py-2">
                {/* Milestone 1 */}
                <div className="relative">
                  <div className="absolute -left-[23px] top-0.5 bg-blue-600 rounded-full w-4 h-4 border-2 border-white shadow-xs animate-pulse" />
                  <div className="font-sans text-left">
                    <div className="text-[10px] text-blue-600 font-extrabold uppercase">Março 1 • Autorizado</div>
                    <h4 className="text-xs font-bold text-slate-800">Assinatura de Ordem de Início</h4>
                    <p className="text-[10.5px] text-slate-500 mt-0.5">Empresas e fiscais credenciados para vistorias prévias.</p>
                  </div>
                </div>

                {/* Milestone 2 */}
                <div className="relative">
                  <div className={`absolute -left-[23px] top-0.5 rounded-full w-4 h-4 border-2 border-white shadow-xs ${
                    safePercent > 0 ? 'bg-amber-500' : 'bg-slate-300'
                  }`} />
                  <div className="font-sans text-left">
                    <div className="text-[10px] text-amber-600 font-extrabold uppercase">Março 2 • Em Execução</div>
                    <h4 className="text-xs font-bold text-slate-800">Avanço Físico Intermediário</h4>
                    <p className="text-[10.5px] text-slate-500 mt-0.5">Lançamento sistemático das medições estruturais de campo.</p>
                  </div>
                </div>

                {/* Milestone 3 */}
                <div className="relative">
                  <div className={`absolute -left-[23px] top-0.5 rounded-full w-4 h-4 border-2 border-white shadow-xs ${
                    safePercent >= 100 ? 'bg-emerald-500' : 'bg-slate-300'
                  }`} />
                  <div className="font-sans text-left">
                    <div className="text-[10px] text-emerald-600 font-extrabold uppercase">Março 3 • Conclusão</div>
                    <h4 className="text-xs font-bold text-slate-800">Laudo Técnico Conclusivo</h4>
                    <p className="text-[10.5px] text-slate-500 mt-0.5">Vistoria geral e emissão do termo de recebimento definitivo.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick school/work card overview */}
            <div className="bg-gradient-to-br from-indigo-50/80 to-blue-50/40 border border-slate-205 p-5 rounded-2xl text-left space-y-3">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-indigo-900 font-mono">Dossiê de Campo</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between border-b border-indigo-100/45 py-1">
                  <span className="text-slate-500">Município</span>
                  <span className="font-extrabold text-slate-800">{currentSol.municipio}</span>
                </div>
                <div className="flex justify-between border-b border-indigo-100/45 py-1">
                  <span className="text-slate-500">SRE Regional</span>
                  <span className="font-extrabold text-slate-800">{currentSol.sre}</span>
                </div>
                <div className="flex justify-between border-b border-indigo-100/45 py-1">
                  <span className="text-slate-500">Empresa Contratada</span>
                  <span className="font-extrabold text-slate-800 truncate max-w-44" title={currentSol.empresaContratada}>
                    {currentSol.empresaContratada || 'Não informada'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Fiscal de Obra</span>
                  <span className="font-extrabold text-slate-800 text-blue-700">{currentSol.fiscalObraAtribuido || 'Não atribuído'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIÁRIO DE OBRA TAB CONTENT */}
      {activeTab === 'diario' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List of diaries */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50 pb-3 mb-4">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Registros do Diário de Ocorrencia
                  </h3>
                  <p className="text-[10px] text-slate-400">Total de {filteredDiarios.length} lançamentos de controle</p>
                </div>

                <div className="relative w-full sm:w-60">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar diário..."
                    value={diarioBusca}
                    onChange={(e) => setDiarioBusca(e.target.value)}
                    className="w-full text-xs pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              {filteredDiarios.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500">Nenhum registro correspondente encontrado.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {filteredDiarios.map((d) => {
                    const tagStyles: { [key: string]: string } = {
                      Ocorrência: 'bg-rose-50 border-rose-200 text-rose-700',
                      Clima: 'bg-sky-50 border-sky-200 text-sky-700',
                      Trabalho: 'bg-emerald-50 border-emerald-200 text-emerald-700',
                      Materiais: 'bg-amber-50 border-amber-200 text-amber-700',
                      Equipe: 'bg-indigo-50 border-indigo-200 text-indigo-700',
                      Segurança: 'bg-purple-50 border-purple-200 text-purple-700'
                    };

                    const cat = d.categoria || 'Ocorrência';
                    const s = tagStyles[cat] || 'bg-slate-50 border-slate-250 text-slate-700';

                    return (
                      <div key={d.id} className="relative bg-slate-50 p-4 rounded-xl border border-slate-210 flex flex-col space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10.5px] font-black text-slate-400">{d.data}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border font-sans ${s}`}>
                              {cat}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-extrabold text-slate-500 flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              {d.autor}
                            </span>
                            <button
                              type="button"
                              onClick={() => deletarDiario(d.id)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                              title="Excluir lançamento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-750 font-sans leading-relaxed text-left w-full">
                          {d.texto}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Form to log new entries */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs text-left">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5 mb-3">
                <Plus className="w-4 h-4 text-emerald-500" /> Logar no Diário de Obra
              </h3>

              <form onSubmit={adicNovoDiario} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">
                    Categoria da Ocorrência
                  </label>
                  <select
                    value={diarioCategoria}
                    onChange={(e) => setDiarioCategoria(e.target.value as any)}
                    className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-800"
                  >
                    <option value="Ocorrência">Ocorrência Geral</option>
                    <option value="Clima">Fatores Climáticos / Chuva</option>
                    <option value="Trabalho">Frentes de Trabalho / Concreto</option>
                    <option value="Materiais">Recebimento / Falta de Materiais</option>
                    <option value="Equipe">Alocação de Mão de Obra</option>
                    <option value="Segurança">EPI / Segurança do Trabalho</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">
                    Detalhamento do Registro *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Descreva com detalhes o progresso técnico do dia, contingências de campo ou notas de fiscalização..."
                    value={diarioTexto}
                    onChange={(e) => setDiarioTexto(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 text-xs text-white font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer shadow-3xs flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Salvar Ocorrência no Diário
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* VISTORIAS TAB CONTENT */}
      {activeTab === 'vistorias' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* History of vistorias */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs text-left">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-50 pb-3">
                Histórico de Vistorias e Relatorios Emitidos
              </h3>

              {listVistorias.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500">Nenhum laudo de vistoria física registrado.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {listVistorias.map((v) => {
                    const statusColors: { [key: string]: string } = {
                      Aprovada: 'bg-emerald-50 border-emerald-200 text-emerald-700',
                      'Aprovada com Ressalvas': 'bg-amber-50 border-amber-200 text-amber-700',
                      Reprovada: 'bg-rose-50 border-rose-200 text-rose-700'
                    };
                    const sc = statusColors[v.resultado] || 'bg-slate-50 border-slate-200 text-slate-700';

                    return (
                      <div key={v.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-black text-slate-400">{v.dataVistoria}</span>
                            <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase border font-sans ${sc}`}>
                              {v.resultado}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-extrabold text-slate-500">
                              Vistoriador: <span className="text-slate-800">{v.vistoriador}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => deletarVistoria(v.id)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                              title="Excluir vistoria"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed font-sans text-left">
                          {v.laudoResumido}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* New vistoria form */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs text-left">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5 mb-3">
                <Plus className="w-4 h-4 text-indigo-500" /> Registrar Visita de Vistoria
              </h3>

              <form onSubmit={adicNovaVistoria} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">
                    Engenheiro Vistoriador / Fiscal *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nome completo do engenheiro fiscal"
                    value={vistoVistoriador}
                    onChange={(e) => setVistoVistoriador(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">
                    Resultado de Avaliação *
                  </label>
                  <select
                    value={vistoResultado}
                    onChange={(e) => setVistoResultado(e.target.value as any)}
                    className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-800"
                  >
                    <option value="Aprovada">Aprovada Integralmente</option>
                    <option value="Aprovada com Ressalvas">Aprovada com Ressalvas / Ajustar</option>
                    <option value="Reprovada">Não Conformidade / Reprovada</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">
                    Laudo Resumido da Intervenção *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Descreva as estruturas inspecionadas e se atendem ao projeto técnico básico aprovado..."
                    value={vistoLaudoResumido}
                    onChange={(e) => setVistoLaudoResumido(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 text-xs text-white font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer shadow-3xs"
                >
                  Registrar Vistoria Técnica
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* RESTRIÇÕES TAB CONTENT */}
      {activeTab === 'restricoes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn text-left">
          {/* List of roadblocks */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-50 pb-3">
                Restrições Ativas e Histórico de Pendências de Campo
              </h3>

              {listRestricoes.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">Obra sem restrições ou entraves ativos!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {listRestricoes.map((r) => {
                    const impactColors = {
                      Alto: 'bg-rose-100 text-rose-800 border-rose-200',
                      Médio: 'bg-amber-100 text-amber-800 border-amber-200',
                      Baixo: 'bg-blue-100 text-blue-800 border-blue-200'
                    };
                    const blockStyles = r.status === 'Resolvida' 
                      ? 'bg-slate-50/70 border-slate-200 opacity-80' 
                      : 'bg-white border-rose-200/60 shadow-3xs';

                    return (
                      <div key={r.id} className={`p-4 rounded-xl border ${blockStyles} flex flex-col space-y-3`}>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-sans border">
                              {r.categoria || 'Geral'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-sans font-black border uppercase ${impactColors[r.impacto]}`}>
                              Impacto {r.impacto}
                            </span>
                            {r.status === 'Resolvida' ? (
                              <span className="px-2 py-0.5 rounded text-[9px] font-sans font-black border bg-emerald-50 text-emerald-700 border-emerald-200 uppercase">
                                Resolvida
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[9px] font-sans font-black border bg-rose-50 text-rose-700 border-rose-250 uppercase animate-pulse">
                                Ativa
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10.5px] font-bold text-slate-400">Identificação: {r.dataIdentificacao}</span>
                            <button
                              type="button"
                              onClick={() => deletarRestricao(r.id)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer ml-1"
                              title="Excluir restrição"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs font-semibold text-slate-750 font-sans leading-relaxed text-left w-full">
                          {r.descricao}
                        </p>

                        {r.previsaoResolucao && r.status === 'Ativa' && (
                          <div className="text-[10PX] font-sans text-amber-700 font-bold bg-amber-50/45 px-2.5 py-1 rounded border border-amber-100/50 self-start">
                            Previsão de Solução Pactuada: <span className="font-mono">{r.previsaoResolucao}</span>
                          </div>
                        )}

                        {/* If resolved details */}
                        {r.status === 'Resolvida' && (
                          <div className="mt-1.5 p-2.5 bg-emerald-50/40 border border-emerald-150 rounded-lg text-xs">
                            <div className="flex items-center gap-1 text-emerald-800 font-bold mb-0.5">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              Resolvida em {r.resolvidaEm}
                            </div>
                            <p className="text-[11px] text-slate-600 font-sans leading-normal italic">
                              "{r.parecerResolucao}"
                            </p>
                          </div>
                        )}

                        {/* Interactive inline resolution */}
                        {r.status === 'Ativa' && (
                          <div className="pt-2 border-t border-slate-100 flex flex-col space-y-2">
                            {resolvendoId === r.id ? (
                              <div className="space-y-2 animate-scaleIn">
                                <label className="text-[10px] font-bold text-emerald-700 block">
                                  Escreva o relatório final de resolução de restrito:
                                </label>
                                <textarea
                                  required
                                  rows={2}
                                  placeholder="Descreva o plano executado, dotações aditivas ou negociação técnica executada..."
                                  value={parecerResolucaoTxt}
                                  onChange={(e) => setParecerResolucaoTxt(e.target.value)}
                                  className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setResolvendoId(null);
                                      setParecerResolucaoTxt('');
                                    }}
                                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => resolverRestricao(r.id)}
                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-750 text-white text-[10px] font-black uppercase rounded"
                                  >
                                    Confirmar Resolução
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setResolvendoId(r.id)}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase rounded-lg self-end cursor-pointer tracking-wider shadow-3xs transition-shadow"
                              >
                                Resolver Restrição da Obra
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* New roadblock / restriction form */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs text-left">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5 mb-3">
                <AlertCircle className="w-4 h-4 text-rose-500 animate-pulse" /> Reportar Nova Restrição
              </h3>

              <form onSubmit={adicNovaRestricao} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">
                    Categoria do Impedimento *
                  </label>
                  <select
                    value={restricaoCategoria}
                    onChange={(e) => setRestricaoCategoria(e.target.value as any)}
                    className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-800"
                  >
                    <option value="Técnica">Técnica / Engenharia / Projetos</option>
                    <option value="Financeira">Financeira / Liberação / Planilhas</option>
                    <option value="Ambiental">Ambiental / Licença / Outorga</option>
                    <option value="Climática">Climática / Chuvas Crônicas</option>
                    <option value="Fornecedor">Fornecedor / Atrasos / Distratos</option>
                    <option value="Outros">Outras Pendências Institucionais</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">
                    Severidade do Impacto *
                  </label>
                  <select
                    value={restricaoImpacto}
                    onChange={(e) => setRestricaoImpacto(e.target.value as any)}
                    className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-800"
                  >
                    <option value="Alto">Alto - Paralisa a Obra Inteira</option>
                    <option value="Médio">Médio - Compromete o Prazo Final</option>
                    <option value="Baixo">Baixo - Sem Alteração Significativa de Termo</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">
                    Previsão de Resolução / Acordo
                  </label>
                  <input
                    type="date"
                    value={restricaoPrevisao}
                    onChange={(e) => setRestricaoPrevisao(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">
                    Descrição do Impedimento *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Descreva o fato causador exato, agentes envolvidos e se há risco imediato de paralisação..."
                    value={restricaoDesc}
                    onChange={(e) => setRestricaoDesc(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 text-xs text-white font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer shadow-3xs"
                >
                  Registrar Entrave / Restrição
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- 3. SUB MEDIÇÕES ---
function SubMedicoes({ currentSol, onUpdate }: { currentSol: Solicitacao | null; onUpdate: (sol: Solicitacao) => void }) {
  const [valorM, setValorM] = useState('');
  const [porcentagemM, setPorcentagemM] = useState('');
  const [descricaoM, setDescricaoM] = useState('');

  // New detailed measurement fields
  const [numeroM, setNumeroM] = useState('');
  const [periodoM, setPeriodoM] = useState('');
  const [dataM, setDataM] = useState('');
  const [responsavelM, setResponsavelM] = useState('');
  const [observacoesM, setObservacoesM] = useState('');
  const [porcentagemFisicaM, setPorcentagemFisicaM] = useState('');
  const [relatorioFileName, setRelatorioFileName] = useState('');
  const [boletimFileName, setBoletimFileName] = useState('');
  
  // Validation feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  if (!currentSol) return <NoObraSelected />;

  const sumMedicoes = currentSol.medicoes?.reduce((sum, m) => sum + m.valor, 0) || 0;
  const originalBudget = currentSol.valorPlanilha || currentSol.valorHomologadoContratacao || 1;
  const leftOver = originalBudget - sumMedicoes;

  // Calculo dos acumulados (Com tratamentos de fallback para registros anteriores)
  const percentualFinanceiroAcumulado = (sumMedicoes / originalBudget) * 100;
  const percentualFisicoAcumulado = currentSol.medicoes?.reduce((sum, m) => {
    const val = m.porcentagemFisica !== undefined ? m.porcentagemFisica : m.porcentagem;
    return sum + val;
  }, 0) || 0;

  // Sync state on school/project change or when measurements list size changes
  useEffect(() => {
    if (currentSol) {
      const nextNum = ((currentSol.medicoes?.length || 0) + 1).toString();
      setNumeroM(nextNum);
      setDataM(new Date().toISOString().split('T')[0]);
      setResponsavelM(currentSol.fiscalObraAtribuido || '');
      setPeriodoM('');
      setObservacoesM('');
      setPorcentagemFisicaM('');
      setValorM('');
      setPorcentagemM('');
      setDescricaoM('');
      setRelatorioFileName('');
      setBoletimFileName('');
      setErrorMessage(null);
      setAttemptedSubmit(false);
    }
  }, [currentSol.id, currentSol.medicoes?.length]);

  // Handler for valor change that pre-populates financial & physical percentage as a default suggestion
  const handleValorMChange = (valStr: string) => {
    setValorM(valStr);
    setErrorMessage(null);
    const val = parseFloat(valStr);
    if (!isNaN(val) && val > 0 && originalBudget > 0) {
      const calcPercent = ((val / originalBudget) * 100).toFixed(2);
      setPorcentagemM(calcPercent);
      setPorcentagemFisicaM(calcPercent);
    } else {
      setPorcentagemM('');
      setPorcentagemFisicaM('');
    }
  };

  const registrarNovaMedicao = (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    setErrorMessage(null);

    if (!valorM || !descricaoM || !numeroM || !periodoM || !dataM || !responsavelM) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    const v = parseFloat(valorM);
    if (isNaN(v) || v <= 0) {
      setErrorMessage('Por favor, informe um valor de medição válido maior que zero.');
      return;
    }

    // MANDATORY ACCURACY RULE: "não posso ter um valor medido maior que o total do contrato"
    if (v + sumMedicoes > originalBudget) {
      setErrorMessage(
        `Impossível Registrar: O valor desta medição (R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) somado ao total medido acumulado até o momento (R$ ${sumMedicoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) é de R$ ${(v + sumMedicoes).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, o que excede o Valor Limite Total do Contrato de R$ ${originalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
      );
      return;
    }

    // MANDATORY ATTACHMENTS RULE: "coloque anexos de forma obrigatória: Relatório de fiscalização e Boletim de medição"
    if (!relatorioFileName || !boletimFileName) {
      setErrorMessage('Atenção: Os documentos "Relatório de Fiscalização" e "Boletim de Medição" são obrigatórios para aprovar a medição.');
      return;
    }

    const pFinanceira = porcentagemM ? parseFloat(porcentagemM) : (v / originalBudget) * 100;
    const pFisica = porcentagemFisicaM ? parseFloat(porcentagemFisicaM) : pFinanceira;

    const novaM: Medicao = {
      id: `med_${Date.now()}`,
      data: dataM,
      valor: v,
      porcentagem: pFinanceira,
      descricao: descricaoM,
      empresaNome: currentSol.empresaContratada || 'Construtora Convencionada',
      empresaCnpj: currentSol.cnpjEmpresa || '01.242.000/0001-33',
      numeroMedicao: numeroM,
      periodoMedicao: periodoM,
      responsavelMedicao: responsavelM,
      observacoes: observacoesM,
      porcentagemFisica: pFisica,
      relatorioFiscalizacaoFileName: relatorioFileName,
      boletimMedicaoFileName: boletimFileName
    };

    const updated = {
      ...currentSol,
      medicoes: [novaM, ...(currentSol.medicoes || [])]
    };

    onUpdate(updated);

    // Reset states
    const nextIndex = ((updated.medicoes?.length || 0) + 1).toString();
    setNumeroM(nextIndex);
    setValorM('');
    setPorcentagemM('');
    setDescricaoM('');
    setPeriodoM('');
    setObservacoesM('');
    setPorcentagemFisicaM('');
    setRelatorioFileName('');
    setBoletimFileName('');
    setErrorMessage(null);
    setAttemptedSubmit(false);
  };

  const deletarMedicao = (id: string) => {
    const updated = {
      ...currentSol,
      medicoes: currentSol.medicoes.filter(m => m.id !== id)
    };
    onUpdate(updated);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
      
      {/* Visual representation gauges */}
      <div className="lg:col-span-2 space-y-4">
        
        {/* Progress bar visual cards */}
        <div className="bg-white rounded-2xl border border-slate-200/85 p-5 shadow-xs">
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-2 mb-4">
            <Layers className="w-4 h-4 text-emerald-500 animate-pulse" /> Relatório Físico-Financeiro Executivo
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-5">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Total do Contrato</span>
              <span className="text-xs font-black text-slate-800 font-mono block mt-0.5 truncate">
                R$ {originalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            <div className="p-3 bg-emerald-50/50 border border-emerald-200/40 rounded-xl text-left">
              <span className="text-[9px] uppercase font-bold text-emerald-600 block">Total Medido</span>
              <span className="text-xs font-black text-emerald-700 font-mono block mt-0.5 truncate">
                R$ {sumMedicoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            <div className="p-3 bg-slate-50/70 border border-slate-200/40 rounded-xl text-left">
              <span className="text-[9px] uppercase font-bold text-slate-500 block">Saldo Restante</span>
              <span className="text-xs font-black text-slate-650 font-mono block mt-0.5 truncate">
                R$ {leftOver.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-3 bg-blue-50/60 border border-blue-200/30 rounded-xl text-left">
              <span className="text-[9px] uppercase font-extrabold text-blue-650 block flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span> Físico Acumulado
              </span>
              <span className="text-base font-black text-blue-700 font-mono block mt-0.5">
                {percentualFisicoAcumulado.toFixed(2)}%
              </span>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, percentualFisicoAcumulado)}%` }}
                ></div>
              </div>
            </div>

            <div className="p-3 bg-teal-50/60 border border-teal-200/30 rounded-xl text-left">
              <span className="text-[9px] uppercase font-extrabold text-teal-650 block flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-550"></span> Financ. Acumulado
              </span>
              <span className="text-base font-black text-teal-700 font-mono block mt-0.5">
                {percentualFinanceiroAcumulado.toFixed(2)}%
              </span>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className="bg-teal-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, percentualFinanceiroAcumulado)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Measurements List */}
          <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-450 mb-3 block text-left">Histórico de Medições Homologadas</h4>
          
          {currentSol.medicoes && currentSol.medicoes.length > 0 ? (
            <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
              {currentSol.medicoes.map(m => {
                const mPhysPercent = m.porcentagemFisica !== undefined ? m.porcentagemFisica : m.porcentagem;
                return (
                  <div key={m.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs shadow-3xs hover:border-slate-300 transition-all text-left">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      
                      <div className="space-y-1.5 font-sans flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-slate-200 text-slate-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase font-mono tracking-wider">
                            MED {m.numeroMedicao || '---'}
                          </span>
                          <span className="font-extrabold text-slate-850 text-sm">{m.descricao}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-1 gap-x-4 text-[10px] text-slate-500 font-medium">
                          <div className="flex items-center gap-1">
                            <span>📅</span> <strong>Medido em:</strong> {m.data}
                          </div>
                          <div className="flex items-center gap-1">
                            <span>⏳</span> <strong>Período:</strong> {m.periodoMedicao || '---'}
                          </div>
                          <div className="flex items-center gap-1 col-span-1 sm:col-span-1">
                            <span>👤</span> <strong>Responsável:</strong> {m.responsavelMedicao || '---'}
                          </div>
                        </div>

                        {m.observacoes && (
                          <div className="text-[10px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 font-medium leading-relaxed">
                            <span className="font-bold text-slate-700 block text-[9.5px] uppercase mb-0.5">Observações:</span>
                            {m.observacoes}
                          </div>
                        )}
                      </div>

                      <div className="flex sm:flex-col items-end gap-3 self-stretch sm:self-auto justify-between shrink-0 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-100">
                        <div className="text-right">
                          <p className="font-black text-emerald-600 font-mono text-sm leading-none">R$ {m.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <div className="flex items-center gap-2 text-[10px] mt-1.5 font-bold justify-end">
                            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100/50">Físico: {mPhysPercent.toFixed(1)}%</span>
                            <span className="bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded border border-teal-100/50">Financ: {m.porcentagem.toFixed(1)}%</span>
                          </div>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => deletarMedicao(m.id)}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all cursor-pointer inline-flex items-center self-end"
                          title="Excluir medição"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>

                    {/* Files Attached Display */}
                    <div className="flex flex-wrap gap-2 pt-2.5 mt-3 border-t border-slate-150">
                      {m.relatorioFiscalizacaoFileName ? (
                        <div className="flex items-center gap-1.5 bg-blue-50/65 px-2.5 py-1 rounded-lg border border-blue-105 text-[10px] text-blue-700">
                          <FileText className="w-3.5 h-3.5 shrink-0 text-blue-550" />
                          <span className="font-semibold block truncate max-w-[170px]" title={m.relatorioFiscalizacaoFileName}>
                            {m.relatorioFiscalizacaoFileName}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 text-[10px] text-amber-700">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Relatório não localizado</span>
                        </div>
                      )}

                      {m.boletimMedicaoFileName ? (
                        <div className="flex items-center gap-1.5 bg-teal-50/65 px-2.5 py-1 rounded-lg border border-teal-105 text-[10px] text-teal-700">
                          <FileCheck className="w-3.5 h-3.5 shrink-0 text-teal-550" />
                          <span className="font-semibold block truncate max-w-[170px]" title={m.boletimMedicaoFileName}>
                            {m.boletimMedicaoFileName}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-105 text-[10px] text-amber-750">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Boletim de medição ausente</span>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-slate-450 text-[11px] font-medium bg-slate-50/50">
              Nenhuma medição física homologada no momento. Registre a primeira medição no formulário ao lado.
            </div>
          )}
        </div>

      </div>

      {/* Register / update medicao */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs text-left h-fit">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5 mb-4">
          <Plus className="w-4 h-4 text-emerald-500" /> Nova Medição
        </h3>

        {/* Error notification banner */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-xl p-3.5 mb-4 text-xs font-medium space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>Erro de Registro</span>
            </div>
            <p className="leading-relaxed text-[11.5px]">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={registrarNovaMedicao} className="space-y-3.5">
          
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Nº Medição*</label>
              <input
                type="text"
                required
                placeholder="Ex: 1"
                value={numeroM}
                onChange={(e) => {
                  setNumeroM(e.target.value);
                  setErrorMessage(null);
                }}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden font-bold tracking-wider"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Data da Medição*</label>
              <input
                type="date"
                required
                value={dataM}
                onChange={(e) => {
                  setDataM(e.target.value);
                  setErrorMessage(null);
                }}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Descrição / Etapa Concluída*</label>
            <input
              id="med-desc-input"
              type="text"
              required
              placeholder="Ex: Alvenaria estrutural do 1º pavimento"
              value={descricaoM}
              onChange={(e) => {
                setDescricaoM(e.target.value);
                setErrorMessage(null);
              }}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden font-semibold"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Período de Medição*</label>
            <input
              type="text"
              required
              placeholder="Ex: 01/05/2026 a 31/05/2026"
              value={periodoM}
              onChange={(e) => {
                setPeriodoM(e.target.value);
                setErrorMessage(null);
              }}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Responsável pela Medição*</label>
            <input
              type="text"
              required
              placeholder="Ex: Engª Helena Rocha (Fiscal)"
              value={responsavelM}
              onChange={(e) => {
                setResponsavelM(e.target.value);
                setErrorMessage(null);
              }}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Valor Medido (R$)*</label>
              <input
                id="med-valor-input"
                type="number"
                step="0.01"
                required
                placeholder="45000"
                value={valorM}
                onChange={(e) => handleValorMChange(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden font-bold text-emerald-700 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Porcentagem Financ. (%)</label>
              <input
                id="med-porc-input"
                type="number"
                step="0.01"
                placeholder="Calculado..."
                value={porcentagemM}
                onChange={(e) => {
                  setPorcentagemM(e.target.value);
                  setErrorMessage(null);
                }}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-700 focus:outline-hidden font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Percentual Físico desta Medição (%)*</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="Ex: 5"
              value={porcentagemFisicaM}
              onChange={(e) => {
                setPorcentagemFisicaM(e.target.value);
                setErrorMessage(null);
              }}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden text-blue-700 font-bold font-mono"
            />
            <span className="text-[9px] text-slate-400 block mt-1">
              Por padrão, corresponde ao avanço financeiro simulado, mas pode ser ajustado para refletir o progresso físico real de campo.
            </span>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Observações da Medição</label>
            <textarea
              rows={2}
              placeholder="Identificações adicionais, notas sobre atrasos ou justificativas..."
              value={observacoesM}
              onChange={(e) => {
                setObservacoesM(e.target.value);
                setErrorMessage(null);
              }}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden leading-relaxed"
            />
          </div>

          {/* OBRIGADORES ANEXOS - Relatório de fiscalização e Boletim de medição */}
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">Documentação Comprovante Obrigatória*</span>
            
            {/* Relatório de Fiscalização */}
            <div className={`border p-2.5 rounded-xl transition-colors ${
              attemptedSubmit && !relatorioFileName ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200 bg-slate-50/50'
            }`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9.5px] font-extrabold text-slate-700 block">1. Relatório de Fiscalização*</span>
                <button
                  type="button"
                  onClick={() => {
                    setRelatorioFileName(`Relatorio_Fiscalizacao_Med_${numeroM || '01'}.pdf`);
                    setErrorMessage(null);
                  }}
                  className="text-[9px] font-black text-blue-650 hover:underline cursor-pointer"
                >
                  [Auto-Preencher Mock]
                </button>
              </div>
              <label className="border border-dashed border-slate-300 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer bg-white hover:bg-slate-50 transition-colors">
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setRelatorioFileName(e.target.files[0].name);
                      setErrorMessage(null);
                    }
                  }}
                  className="hidden"
                />
                <FileText className="w-5 h-5 text-slate-400 mb-1" />
                <span className="text-[10px] text-slate-600 font-bold text-center">
                  {relatorioFileName ? (
                    <span className="text-emerald-600 font-black flex items-center gap-1">
                      ✓ {relatorioFileName}
                    </span>
                  ) : (
                    <span className="text-slate-450 font-semibold text-[9px] block">Arraste ou Clique para anexar o Relatório (PDF)</span>
                  )}
                </span>
              </label>
            </div>

            {/* Boletim de Medição */}
            <div className={`border p-2.5 rounded-xl transition-colors ${
              attemptedSubmit && !boletimFileName ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200 bg-slate-50/50'
            }`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9.5px] font-extrabold text-slate-700 block">2. Boletim de Medição*</span>
                <button
                  type="button"
                  onClick={() => {
                    setBoletimFileName(`Boletim_Medicao_Med_${numeroM || '01'}.xlsx`);
                    setErrorMessage(null);
                  }}
                  className="text-[9px] font-black text-blue-650 hover:underline cursor-pointer"
                >
                  [Auto-Preencher Mock]
                </button>
              </div>
              <label className="border border-dashed border-slate-300 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer bg-white hover:bg-slate-50 transition-colors">
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setBoletimFileName(e.target.files[0].name);
                      setErrorMessage(null);
                    }
                  }}
                  className="hidden"
                />
                <FileCheck className="w-5 h-5 text-slate-400 mb-1" />
                <span className="text-[10px] text-slate-600 font-bold text-center">
                  {boletimFileName ? (
                    <span className="text-emerald-600 font-black flex items-center gap-1">
                      ✓ {boletimFileName}
                    </span>
                  ) : (
                    <span className="text-slate-450 font-semibold text-[9px] block">Arraste ou Clique para anexar a Planilha (Excel/PDF)</span>
                  )}
                </span>
              </label>
            </div>

          </div>

          {/* Value warning simulator */}
          {valorM && !errorMessage && (
            <div className="bg-slate-50 p-3 rounded-xl text-[10.5px] font-mono shadow-inner text-slate-600 block space-y-1 border border-slate-200">
              <span className="font-extrabold text-slate-750 block border-b border-slate-200 pb-1 uppercase text-[9px] tracking-wider">Detalhamento dos Limites</span>
              <div className="flex justify-between">
                <span>Contrato Total:</span>
                <span className="font-bold text-slate-750">R$ {originalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span>Acumulado Anterior:</span>
                <span className="font-bold text-amber-600">R$ {sumMedicoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span>Esta Medição:</span>
                <span className="font-bold text-blue-600">R$ {parseFloat(valorM).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-[11px]">
                <span>Novo Total Estimado:</span>
                <span className={parseFloat(valorM) + sumMedicoes > originalBudget ? 'text-red-600' : 'text-emerald-700'}>
                  R$ {(parseFloat(valorM) + sumMedicoes).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          <button
            id="sub-medicao-nova-btn"
            type="submit"
            className="w-full py-2.5 text-xs text-white font-black uppercase bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer transition-colors shadow-3xs hover:shadow-xs flex items-center justify-center gap-1"
          >
            <FileCheck className="w-4 h-4" /> Validar e Homologar Medição
          </button>
        </form>
      </div>

    </div>
  );
}

// --- 4. SUB CONTRATOS ---
function SubContratos({ 
  currentSol, 
  onUpdate,
  empresasSeguranca = []
}: { 
  currentSol: Solicitacao | null; 
  onUpdate: (sol: Solicitacao) => void;
  empresasSeguranca?: EmpresaSeguranca[];
}) {
  const [selectedEmpresaId, setSelectedEmpresaId] = useState(() => {
    const matched = empresasSeguranca.find(e => e.nome === currentSol?.empresaContratada);
    return matched ? matched.id : '';
  });
  
  const [empresaInput, setEmpresaInput] = useState(() => currentSol?.empresaContratada || '');
  const [cnpjInput, setCnpjInput] = useState(() => currentSol?.cnpjEmpresa || '');
  const [statusContratoInput, setStatusContratoInput] = useState<'Ativa' | 'Distratada'>(() => currentSol?.statusContratoEmpresa || 'Ativa');
  const [duracaoInput, setDuracaoInput] = useState(() => currentSol?.duracaoObraMeses?.toString() || '6');

  // New states for extended fields
  const [valorInicialInput, setValorInicialInput] = useState(() => currentSol?.contratoValorInicial?.toString() || (currentSol?.valorPlanilha || 1350000).toString());
  const [dataAssinaturaInput, setDataAssinaturaInput] = useState(() => currentSol?.contratoDataAssinatura || '2026-01-01');
  const [inicioVigenciaInput, setInicioVigenciaInput] = useState(() => currentSol?.contratoInicioVigencia || currentSol?.dataOrdemInicio || '2026-01-15');
  const [fimVigenciaInput, setFimVigenciaInput] = useState(() => currentSol?.contratoFimVigencia || currentSol?.previsaoTerminoObra || '2026-07-15');

  const [garantiaExigidaInput, setGarantiaExigidaInput] = useState(() => currentSol?.garantiaExigida || 'Sem Garantia');
  const [garantiaValorInput, setGarantiaValorInput] = useState(() => currentSol?.garantiaValor?.toString() || '0');
  const [garantiaTipoInput, setGarantiaTipoInput] = useState(() => currentSol?.garantiaTipo || '');
  const [garantiaValidadeInput, setGarantiaValidadeInput] = useState(() => currentSol?.garantiaValidade || '');

  // Keep state in sync with currentSol selections
  useEffect(() => {
    if (currentSol) {
      const matched = empresasSeguranca.find(e => e.nome === currentSol.empresaContratada);
      setSelectedEmpresaId(matched ? matched.id : '');
      setEmpresaInput(currentSol.empresaContratada || '');
      setCnpjInput(currentSol.cnpjEmpresa || '');
      setStatusContratoInput(currentSol.statusContratoEmpresa || 'Ativa');
      setDuracaoInput(currentSol.duracaoObraMeses?.toString() || '6');
      
      const valInitial = currentSol.contratoValorInicial !== undefined 
        ? currentSol.contratoValorInicial 
        : (currentSol.valorPlanilha || 1350000);
      setValorInicialInput(valInitial.toString());
      
      setDataAssinaturaInput(currentSol.contratoDataAssinatura || '');
      setInicioVigenciaInput(currentSol.contratoInicioVigencia || currentSol.dataOrdemInicio || '');
      setFimVigenciaInput(currentSol.contratoFimVigencia || currentSol.previsaoTerminoObra || '');
      setGarantiaExigidaInput(currentSol.garantiaExigida || 'Sem Garantia');
      setGarantiaValorInput((currentSol.garantiaValor || 0).toString());
      setGarantiaTipoInput(currentSol.garantiaTipo || '');
      setGarantiaValidadeInput(currentSol.garantiaValidade || '');
    }
  }, [currentSol, empresasSeguranca]);

  if (!currentSol) return <NoObraSelected />;

  // Dynamic calculations
  const valorInicial = parseFloat(valorInicialInput) || 0;
  
  // Sum approved aditivos
  const sumAditivos = currentSol.aditivos
    ?.filter(a => a.status === 'Aprovado')
    .reduce((sum, a) => sum + (a.valorExtra || 0), 0) || 0;
    
  const valorAtualizado = valorInicial + sumAditivos;
  
  const sumMedicoes = currentSol.medicoes?.reduce((sum, m) => sum + m.valor, 0) || 0;
  const saldoContratual = Math.max(0, valorAtualizado - sumMedicoes);
  const percentualExecutado = valorAtualizado > 0 ? (sumMedicoes / valorAtualizado) * 100 : 0;

  // Remaining days with countdown semaphore
  const targetDateStr = fimVigenciaInput || currentSol.previsaoTerminoObra || '';
  let diasRestantes: number | null = null;
  let semaphoreColor = 'gray'; // 'green' | 'yellow' | 'red'
  let semaphoreLabel = 'Não Cadastrado';
  
  if (targetDateStr) {
    const today = new Date('2026-05-30T00:00:00');
    const target = new Date(targetDateStr);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (!isNaN(diffDays)) {
      diasRestantes = diffDays;
      if (diasRestantes > 90) {
        semaphoreColor = 'green';
        semaphoreLabel = 'Prazo Confortável (> 90 dias)';
      } else if (diasRestantes >= 30) {
        semaphoreColor = 'yellow';
        semaphoreLabel = 'Prazo em Atenção (30 a 90 dias)';
      } else {
        semaphoreColor = 'red';
        semaphoreLabel = 'Prazo Crítico (< 30 dias)';
      }
    }
  }

  // Guarantee alerts
  const garantiaValidadeStr = garantiaValidadeInput || '';
  let garantiaStatusText = 'Sem pendências de garantias vigentes';
  let garantiaAlertClass = 'bg-slate-550/10 text-slate-700 border-slate-200';
  let garantiaIconColor = 'text-slate-400';
  let hasGarantiaAlert = false;

  if (garantiaExigidaInput && garantiaExigidaInput !== 'Sem Garantia') {
    if (garantiaValidadeStr) {
      const today = new Date('2026-05-30T00:00:00');
      const target = new Date(garantiaValidadeStr);
      const diffTime = target.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (!isNaN(diffDays)) {
        if (diffDays < 0) {
          hasGarantiaAlert = true;
          garantiaStatusText = `ALERTA DE SEGURANÇA: Garantia VENCIDA há ${Math.abs(diffDays)} dias! Expirou em ${new Date(garantiaValidadeStr).toLocaleDateString('pt-BR')}.`;
          garantiaAlertClass = 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse font-bold';
          garantiaIconColor = 'text-rose-600';
        } else if (diffDays <= 30) {
          hasGarantiaAlert = true;
          garantiaStatusText = `AVISO : Garantia expira em ${diffDays} dias! Vencimento em ${new Date(garantiaValidadeStr).toLocaleDateString('pt-BR')}.`;
          garantiaAlertClass = 'bg-amber-50 text-amber-850 border-amber-300 font-bold';
          garantiaIconColor = 'text-amber-600';
        } else {
          garantiaStatusText = `Garantia ativa e regularizada. Restam ${diffDays} dias de vigência da apólice (Validade: ${new Date(garantiaValidadeStr).toLocaleDateString('pt-BR')}).`;
          garantiaAlertClass = 'bg-emerald-50 text-emerald-800 border-emerald-250';
          garantiaIconColor = 'text-emerald-600';
        }
      } else {
        garantiaStatusText = 'Garantia exige apuração: data de validade inválida.';
        garantiaAlertClass = 'bg-amber-50 text-amber-800 border-amber-200';
        garantiaIconColor = 'text-amber-500';
      }
    } else {
      hasGarantiaAlert = true;
      garantiaStatusText = 'ALERTA DE SEGURANÇA: Garantia exigida está pendente de preenchimento da data de validade!';
      garantiaAlertClass = 'bg-red-50 text-red-900 border-red-250 animate-pulse font-bold';
      garantiaIconColor = 'text-red-600';
    }
  }

  const handleUpdateContrato = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...currentSol,
      empresaContratada: empresaInput,
      cnpjEmpresa: cnpjInput,
      statusContratoEmpresa: statusContratoInput,
      duracaoObraMeses: parseInt(duracaoInput) || 6,
      contratoValorInicial: valorInicial,
      contratoDataAssinatura: dataAssinaturaInput,
      contratoInicioVigencia: inicioVigenciaInput,
      contratoFimVigencia: fimVigenciaInput,
      garantiaExigida: garantiaExigidaInput,
      garantiaValor: parseFloat(garantiaValorInput) || 0,
      garantiaTipo: garantiaTipoInput,
      garantiaValidade: garantiaValidadeInput
    };
    onUpdate(updated);
  };

  const selectCompanyFromSeguranca = (empId: string) => {
    setSelectedEmpresaId(empId);
    if (!empId) {
      setEmpresaInput('');
      setCnpjInput('');
      return;
    }
    const emp = empresasSeguranca.find(e => e.id === empId);
    if (emp) {
      setEmpresaInput(emp.nome);
      setCnpjInput(emp.cnpj);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn text-left">
      
      {/* Information card view of contract details */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Dynamic header summary */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-slate-500" />
              Gestão Financeira & Desdobramento Contratual
            </h3>
            <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-black ${currentSol.statusContratoEmpresa === 'Distratada' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'}`}>
              Contrato {currentSol.statusContratoEmpresa || 'Ativo'}
            </span>
          </div>

          {/* Grid de 5 informações solicitadas */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-6">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Valor Inicial</span>
              <span className="text-[12.5px] font-black text-slate-800 block mt-1">
                R$ {valorInicial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Aditivos</span>
              <span className="text-[12.5px] font-black text-amber-600 block mt-1">
                R$ {sumAditivos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Valor Atualizado</span>
              <span className="text-[12.5px] font-black text-blue-700 block mt-1">
                R$ {valorAtualizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Total Executado</span>
              <span className="text-[12.5px] font-black text-emerald-700 block mt-1">
                R$ {sumMedicoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 col-span-2 md:col-span-1">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Saldo Contratual</span>
              <span className="text-[12.5px] font-black text-indigo-700 block mt-1">
                R$ {saldoContratual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Progress Bar do percentual executado */}
          <div className="space-y-1.5 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold">Percentual Executado Contratualmente</span>
              <span className="font-extrabold text-blue-700">{percentualExecutado.toFixed(2)}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  percentualExecutado >= 100 ? 'bg-emerald-600' :
                  percentualExecutado >= 80 ? 'bg-blue-600' :
                  percentualExecutado >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                }`} 
                style={{ width: `${Math.min(100, percentualExecutado)}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-400 flex justify-between">
              <span>Zero Executado</span>
              <span>100% (Totalmente Medido)</span>
            </div>
          </div>
        </div>

        {/* Vigências e Semáforo de Dias Restantes */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-100 pb-3 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-500" />
            Controle de Datas, Vigências & Prazos
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-bold">Data Assinatura:</span>
                <span className="font-bold text-slate-750">{dataAssinaturaInput ? new Date(dataAssinaturaInput).toLocaleDateString('pt-BR') : '---'}</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-bold">Início da Vigência:</span>
                <span className="font-bold text-slate-750">{inicioVigenciaInput ? new Date(inicioVigenciaInput).toLocaleDateString('pt-BR') : '---'}</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-bold">Fim da Vigência:</span>
                <span className="font-bold text-slate-750">{fimVigenciaInput ? new Date(fimVigenciaInput).toLocaleDateString('pt-BR') : '---'}</span>
              </div>
            </div>

            {/* Semaphore widget */}
            <div className="flex flex-col justify-center items-center bg-slate-50 p-5 rounded-2xl border border-slate-150 relative overflow-hidden">
              <span className="text-[9px] uppercase font-bold text-slate-450 block absolute top-2.5 left-3">Semáforo de Vigência SGO</span>
              
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-3.5 h-3.5 rounded-full ${semaphoreColor === 'green' ? 'bg-emerald-500 shadow-emerald-400' : 'bg-slate-200'} shadow-xs`} />
                <span className={`w-3.5 h-3.5 rounded-full ${semaphoreColor === 'yellow' ? 'bg-amber-400 shadow-amber-300' : 'bg-slate-200'} shadow-xs`} />
                <span className={`w-3.5 h-3.5 rounded-full ${semaphoreColor === 'red' ? 'bg-rose-500 shadow-rose-400' : 'bg-slate-200'} shadow-xs`} />
              </div>

              <div className="text-center mt-3">
                <div className="text-xs font-bold text-slate-500">Dias Restantes:</div>
                <div className={`text-xl font-black ${
                  semaphoreColor === 'green' ? 'text-emerald-600' :
                  semaphoreColor === 'yellow' ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  {diasRestantes !== null ? `${diasRestantes} dias` : 'Não Calculável'}
                </div>
                <div className="text-[10px] font-bold text-slate-450 mt-1 uppercase">
                  {semaphoreLabel}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Garantias exigidas e validade */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-100 pb-3 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-slate-500" />
            Garantia Contratual e Apólices de Execução
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="text-xs flex justify-between">
                <span className="text-slate-400 font-bold">Garantia Exigida:</span>
                <span className="font-extrabold text-slate-800">{currentSol.garantiaExigida || 'Sem Garantia'}</span>
              </div>
              <div className="text-xs flex justify-between border-t border-slate-150 pt-2">
                <span className="text-slate-400 font-bold">Valor Assegurado:</span>
                <span className="font-extrabold text-slate-800">
                  R$ {(currentSol.garantiaValor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="text-xs flex justify-between">
                <span className="text-slate-400 font-bold">Tipo / Documento:</span>
                <span className="font-extrabold text-slate-800">{currentSol.garantiaTipo || 'Não preenchido'}</span>
              </div>
              <div className="text-xs flex justify-between border-t border-slate-150 pt-2">
                <span className="text-slate-400 font-bold">Validade:</span>
                <span className="font-extrabold text-slate-800">
                  {currentSol.garantiaValidade ? new Date(currentSol.garantiaValidade).toLocaleDateString('pt-BR') : 'Não cadastrada'}
                </span>
              </div>
            </div>
          </div>

          {/* Alerta de Vencimento da garantia */}
          <div className={`p-4 rounded-xl border ${garantiaAlertClass} text-xs flex gap-3 items-start`}>
            <AlertCircle className={`w-5 h-5 ${garantiaIconColor} shrink-0 mt-0.5`} />
            <div>
              <h4 className="font-extrabold uppercase tracking-wide text-[10.5px]">Monitoramento de Garantia SGO</h4>
              <p className="mt-0.5 opacity-90 leading-relaxed font-medium">{garantiaStatusText}</p>
            </div>
          </div>
        </div>

        {/* History of former companies if Distrato happened */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Histórico de Empresas Distratadas</h4>
          {currentSol.empresasAnteriores && currentSol.empresasAnteriores.length > 0 ? (
            <div className="space-y-2">
              {currentSol.empresasAnteriores.map(emp => (
                <div key={emp.id} className="p-3 bg-red-50/50 rounded-xl border border-red-200/40 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-800">{emp.nome}</span>
                    <span className="text-[9px] block text-slate-400 uppercase font-mono mt-0.5">CNPJ: {emp.cnpj}</span>
                  </div>
                  <span className="text-[10px] text-red-700 font-extrabold bg-red-100/60 px-2 py-0.5 rounded">
                    Distrato Homologado
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl text-slate-450 text-[11px] font-medium">
              Sem ocorrências de distrato ou sanção administrativa com empresas anteriores neste projeto.
            </div>
          )}
        </div>

      </div>

      {/* Editing / registering contract updates form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5 mb-4">
          <Edit className="w-4 h-4 text-blue-500" /> Cadastrar & Alterar Contrato
        </h3>

        <form onSubmit={handleUpdateContrato} className="space-y-4">
          
          {/* SELEÇÃO BASEADA EM LISTA DE EMPRESAS PRÉVIAS */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">
              Selecionar Empresa SGO (do Módulo de Segurança)*
            </label>
            <select
              required
              value={selectedEmpresaId}
              onChange={(e) => selectCompanyFromSeguranca(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-850 font-bold focus:outline-hidden cursor-pointer"
            >
              <option value="">-- Escolher Empresa Cadastrada --</option>
              {empresasSeguranca.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.nome} ({emp.situacaoCadastral})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Razão Social Contratada (Confirmada)</label>
            <input
              type="text"
              required
              readOnly
              value={empresaInput}
              placeholder="Selecione acima na listagem"
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-600 focus:outline-hidden font-bold"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">CNPJ do Responsável da Obra</label>
            <input
              type="text"
              required
              readOnly
              value={cnpjInput}
              placeholder="CNPJ vinculado à empresa escolhida"
              className="w-full text-xs font-mono p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-600 focus:outline-hidden font-bold"
            />
          </div>

          <div className="border-t border-slate-100 pt-3">
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Valor Inicial do Contrato (R$)*</label>
            <input
              type="number"
              required
              value={valorInicialInput}
              onChange={(e) => setValorInicialInput(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 font-bold focus:outline-hidden"
              placeholder="1350000"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Duração (Meses)</label>
              <input
                type="number"
                value={duracaoInput}
                onChange={(e) => setDuracaoInput(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Status Contrato</label>
              <select
                value={statusContratoInput}
                onChange={(e) => setStatusContratoInput(e.target.value as any)}
                className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 focus:outline-hidden cursor-pointer"
              >
                <option value="Ativa">Ativa</option>
                <option value="Distratada">Distratada</option>
              </select>
            </div>
          </div>

          {/* datas do contrato */}
          <div className="border-t border-slate-100 pt-3 space-y-3">
            <h4 className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Vigência & Assinatura</h4>
            
            <div>
              <label className="text-[9px] font-bold text-slate-400 block mb-1">Data Assinatura*</label>
              <input
                type="date"
                required
                value={dataAssinaturaInput}
                onChange={(e) => setDataAssinaturaInput(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-bold text-slate-400 block mb-1">Início da Vigência*</label>
                <input
                  type="date"
                  required
                  value={inicioVigenciaInput}
                  onChange={(e) => setInicioVigenciaInput(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden font-semibold"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 block mb-1">Fim da Vigência*</label>
                <input
                  type="date"
                  required
                  value={fimVigenciaInput}
                  onChange={(e) => setFimVigenciaInput(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden font-semibold"
                />
              </div>
            </div>
          </div>

          {/* garantia exigida */}
          <div className="border-t border-slate-100 pt-3 space-y-3">
            <h4 className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Cadastro de Garantias</h4>
            
            <div>
              <label className="text-[9px] font-bold text-slate-400 block mb-1">Tipo de Garantia Exigida*</label>
              <select
                value={garantiaExigidaInput}
                onChange={(e) => setGarantiaExigidaInput(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded-xl bg-white text-slate-800 font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="Sem Garantia">Sem Garantia</option>
                <option value="Fiança Bancária">Fiança Bancária</option>
                <option value="Seguro Garantia">Seguro Garantia</option>
                <option value="Caução em Dinheiro">Caução em Dinheiro</option>
                <option value="Títulos da Dívida Pública">Títulos da Dívida Pública</option>
              </select>
            </div>

            {garantiaExigidaInput !== 'Sem Garantia' && (
              <div className="space-y-3 animate-fadeIn duration-200">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 block mb-1">Valor Garantido (R$)*</label>
                  <input
                    type="number"
                    required
                    value={garantiaValorInput}
                    onChange={(e) => setGarantiaValorInput(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-xl bg-white text-slate-800 font-semibold focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-400 block mb-1">Tipo de Apólice ou Recibo*</label>
                  <input
                    type="text"
                    required
                    value={garantiaTipoInput}
                    placeholder="ex: Apólice nº 44-551-A"
                    onChange={(e) => setGarantiaTipoInput(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-xl bg-white text-slate-800 font-semibold focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-400 block mb-1">Validade da Garantia*</label>
                  <input
                    type="date"
                    required
                    value={garantiaValidadeInput}
                    onChange={(e) => setGarantiaValidadeInput(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-xl bg-white text-slate-800 font-semibold focus:outline-hidden"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 text-xs text-white font-black uppercase bg-[#1c3870] hover:bg-[#1a2f5c] rounded-xl cursor-pointer transition-colors shadow-xs"
          >
            Salvar Alteração Contratual completo
          </button>
        </form>
      </div>

    </div>
  );
}

// --- 5. SUB ADITIVOS ---
function SubAditivos({ currentSol, onUpdate }: { currentSol: Solicitacao | null; onUpdate: (sol: Solicitacao) => void }) {
  const [activeTab, setActiveTab] = useState<'historico' | 'novo_atendimento'>('historico');
  const [role, setRole] = useState<'proponente' | 'dore'>('proponente'); // Proponente vs Analista DORE
  const [step, setStep] = useState<1 | 2>(1);

  // Form states - Step 1
  const [tipo, setTipo] = useState<'Valor' | 'Prazo' | 'Valor e Prazo'>('Valor');
  const [valorExtra, setValorExtra] = useState('');
  const [prazoExtra, setPrazoExtra] = useState('');
  const [supressao, setSupressao] = useState('');
  const [reprogramacao, setReprogramacao] = useState<'Sim' | 'Não'>('Não');
  const [saldoComplementar, setSaldoComplementar] = useState<'Sim' | 'Não'>('Não');
  const [justificativa, setJustificativa] = useState('');
  
  // Checklist items step 2
  const [checklist, setChecklist] = useState([
    { item: 'Planilha de Serviços (Excel)', checked: false, fileName: '' },
    { item: 'Relatório Técnico', checked: false, fileName: '' },
    { item: 'Justificativa Técnico', checked: false, fileName: '' },
    { item: 'Relatório Fotográfico', checked: false, fileName: '' },
    { item: 'Planilha de Medições Acumuladas', checked: false, fileName: '' },
    { item: 'Extrato Bancário', checked: false, fileName: '' },
    { item: 'Declaração da Escola', checked: false, fileName: '' },
    { item: 'Projeto DWG (quando aplicável)', checked: false, fileName: '' },
    { item: 'Documentos Complementares', checked: false, fileName: '' },
  ]);

  // Selected aditivo for detail view or analyst actions
  const [selectedAditivoId, setSelectedAditivoId] = useState<string | null>(null);
  const [parecerDoreInput, setParecerDoreInput] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'Pendente' | 'Aprovado' | 'Recusado'>('todos');

  if (!currentSol) return <NoObraSelected />;

  // Derived values
  const valorContratoOriginal = currentSol.valorPlanilha || 0;
  const numAcre = parseFloat(valorExtra) || 0;
  const numSup = parseFloat(supressao) || 0;
  const valorAditivoLiquido = numAcre - numSup;
  const displayPercentual = valorContratoOriginal > 0 ? (valorAditivoLiquido / valorContratoOriginal) * 100 : 0;

  // Handle Mock Upload
  const handleMockUpload = (index: number, name: string) => {
    setChecklist(prev => prev.map((item, idx) => {
      if (idx === index) {
        return {
          ...item,
          checked: true,
          fileName: name ? name : `atendimento_doc_${Math.floor(Math.random() * 1000)}.pdf`
        };
      }
      return item;
    }));
  };

  const toggleChecklist = (index: number) => {
    setChecklist(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, checked: !item.checked, fileName: !item.checked ? `documento_declarado.pdf` : '' };
      }
      return item;
    }));
  };

  const handleCreateAditivo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!justificativa.trim()) {
      alert('Por favor, preencha a justificativa!');
      return;
    }

    const novoAditivo: Aditivo = {
      id: `adt_${Date.now()}`,
      data: new Date().toISOString().split('T')[0],
      tipo,
      valorExtra: numAcre > 0 ? numAcre : undefined,
      prazoExtraDias: prazoExtra ? parseInt(prazoExtra) : undefined,
      supressao: numSup > 0 ? numSup : undefined,
      reprogramacao,
      saldoComplementar,
      valorAditivo: valorAditivoLiquido,
      percentualContrato: parseFloat(displayPercentual.toFixed(2)),
      justificativa,
      status: 'Pendente',
      analistaAtribuido: undefined,
      checklistDocs: checklist.map(c => ({ item: c.item, checked: c.checked })),
      parecerConsolidado: ''
    };

    const updated = {
      ...currentSol,
      etapaAtual: 'analise' as const,
      analistaAtribuido: undefined,
      historicoEtapas: [
        ...(currentSol.historicoEtapas || []),
        {
          etapa: 'analise' as const,
          data: new Date().toISOString().split('T')[0],
          responsavel: 'Fiscal de Obra (Novo Pleito de Aditivo de Contrato)'
        }
      ],
      aditivos: [novoAditivo, ...(currentSol.aditivos || [])]
    };

    onUpdate(updated);

    alert('Nova solicitação de aditivo cadastrada e encaminhada com sucesso para Análise Técnica da DORE para atribuição de um analista!');

    // Reset Form
    setTipo('Valor');
    setValorExtra('');
    setPrazoExtra('');
    setSupressao('');
    setReprogramacao('Não');
    setSaldoComplementar('Não');
    setJustificativa('');
    setStep(1);
    setChecklist(checklist.map(c => ({ ...c, checked: false, fileName: '' })));
    setActiveTab('historico');
  };

  const handleDoreAction = (id: string, decision: 'Aprovado' | 'Recusado') => {
    if (!parecerDoreInput.trim()) {
      alert('Favor inserir uma justificativa/parecer consolidado para a decisão.');
      return;
    }

    let updatedSolMock = { ...currentSol };
    const targetAdt = (updatedSolMock.aditivos || []).find(a => a.id === id);

    if (targetAdt) {
      targetAdt.status = decision;
      targetAdt.parecerConsolidado = parecerDoreInput;
      targetAdt.data = new Date().toISOString().split('T')[0];

      // If approved, update main financial/timeline of the project
      if (decision === 'Aprovado') {
        const adtVal = targetAdt.valorAditivo || 0;
        updatedSolMock.valorPlanilha = (updatedSolMock.valorPlanilha || 0) + adtVal;
        updatedSolMock.valorHomologadoContratacao = (updatedSolMock.valorHomologadoContratacao || 0) + adtVal;
      }

      onUpdate(updatedSolMock);
      setParecerDoreInput('');
      setSelectedAditivoId(null);
    }
  };

  const handleExcluirAditivo = (id: string) => {
    let updatedSolMock = { ...currentSol };
    const targetAdt = (updatedSolMock.aditivos || []).find(a => a.id === id);
    if (targetAdt && targetAdt.status === 'Aprovado') {
      const adtVal = targetAdt.valorAditivo || 0;
      updatedSolMock.valorPlanilha = (updatedSolMock.valorPlanilha || 0) - adtVal;
      updatedSolMock.valorHomologadoContratacao = (updatedSolMock.valorHomologadoContratacao || 0) - adtVal;
    }

    updatedSolMock.aditivos = (updatedSolMock.aditivos || []).filter(a => a.id !== id);
    onUpdate(updatedSolMock);
    if (selectedAditivoId === id) setSelectedAditivoId(null);
  };

  const listAditivosFiltered = (currentSol.aditivos || []).filter(a => {
    if (tipoFiltro === 'todos') return true;
    return a.status === tipoFiltro;
  });

  return (
    <div className="space-y-6 animate-fadeIn text-left font-sans">
      {/* Dynamic Header & View Toggle Control */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-750 to-indigo-900 rounded-3xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-blue-200 bg-blue-900/40 px-3 py-1 rounded-full border border-blue-500/20">
            DORE - Acompanhamento de Aditivos de Obra
          </span>
          <h2 className="text-xl md:text-2xl font-black mt-2 tracking-tight">
            Controle e Gestão de Termos Aditivos
          </h2>
          <p className="text-xs text-blue-100/90 mt-1 max-w-xl">
            Aditivos e ajustes agem como solicitações que demandam instrução processual detalhada, checklist documental de 2ª etapa e parecer consolidado técnico homologado pela DORE.
          </p>
        </div>

        {/* Persona Switch Box */}
        <div className="bg-white/10 backdrop-blur-xs p-1.5 rounded-2xl border border-white/15 flex items-center gap-1 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setRole('proponente')}
            className={`flex-1 md:flex-initial text-[11px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all flex items-center justify-center gap-1 ${role === 'proponente' ? 'bg-white text-blue-900 shadow-sm' : 'text-white hover:bg-white/5'}`}
          >
            <User className="w-3.5 h-3.5" /> Escola/SRE
          </button>
          <button
            type="button"
            onClick={() => setRole('dore')}
            className={`flex-1 md:flex-initial text-[11px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all flex items-center justify-center gap-1 ${role === 'dore' ? 'bg-white text-indigo-900 shadow-sm' : 'text-white hover:bg-white/5'}`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Analista DORE
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('historico')}
          className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider transition-colors flex items-center gap-2 border-b-2 ${activeTab === 'historico' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-850'}`}
        >
          <History className="w-4 h-4" /> Histórico de Aditivos ({currentSol.aditivos?.length || 0})
        </button>
        <button
          onClick={() => {
            setActiveTab('novo_atendimento');
            setStep(1);
          }}
          className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider transition-colors flex items-center gap-2 border-b-2 ${activeTab === 'novo_atendimento' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-850'}`}
        >
          <Plus className="w-4 h-4" /> Iniciar Novo Atendimento (Aditivo)
        </button>
      </div>

      {/* CONTENT AREA */}
      {activeTab === 'historico' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List of aditivos */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filter bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Filtrar Pedidos:</span>
              <div className="flex items-center gap-1.5 text-xs">
                {(['todos', 'Pendente', 'Aprovado', 'Recusado'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setTipoFiltro(f)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${tipoFiltro === f ? 'bg-slate-800 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {f === 'todos' ? 'Todos' : f}
                  </button>
                ))}
              </div>
            </div>

            {listAditivosFiltered.length > 0 ? (
              <div className="space-y-4">
                {listAditivosFiltered.map(adt => {
                  const numDocsChecked = adt.checklistDocs ? adt.checklistDocs.filter(c => c.checked).length : 0;
                  const totalDocs = adt.checklistDocs ? adt.checklistDocs.length : 9;
                  const adtLiq = adt.valorAditivo || 0;

                  return (
                    <div
                      key={adt.id}
                      onClick={() => setSelectedAditivoId(adt.id === selectedAditivoId ? null : adt.id)}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer bg-white text-left ${selectedAditivoId === adt.id ? 'border-blue-500 ring-2 ring-blue-500/10 shadow-md' : 'border-slate-200 hover:border-slate-300 shadow-xs'}`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-slate-100 text-slate-800 uppercase tracking-widest border border-slate-200">
                              Nº {adt.id.split('_')[1] || adt.id}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              adt.status === 'Aprovado' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              adt.status === 'Recusado' ? 'bg-red-50 text-red-700 border border-red-200' :
                              'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                            }`}>
                              ● {adt.status}
                            </span>
                          </div>
                          <p className="text-xs font-black text-slate-800 mt-2">
                            Aditivo de {adt.tipo}
                          </p>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                            {adt.justificativa}
                          </p>
                        </div>

                        <div className="text-right space-y-1.5 shrink-0">
                          <p className="text-xs text-slate-400 font-mono">{adt.data}</p>
                          {adt.valorExtra !== undefined && (
                            <p className="text-xs font-bold text-slate-700">Acrés: +R$ {adt.valorExtra.toLocaleString('pt-BR')}</p>
                          )}
                          {adt.supressao !== undefined && (
                            <p className="text-[10px] text-red-500 font-mono">Supr.: -R$ {adt.supressao.toLocaleString('pt-BR')}</p>
                          )}
                          <p className={`text-xs font-black font-mono ${adtLiq >= 0 ? 'text-emerald-600' : 'text-red-650'}`}>
                            Líq: R$ {adtLiq.toLocaleString('pt-BR')} ({adt.percentualContrato || 0}%)
                          </p>
                        </div>
                      </div>

                      {/* Summary indicator */}
                      <div className="flex gap-4 items-center mt-4 pt-4 border-t border-slate-100 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1 font-bold">
                          <FileText className="w-3.5 h-3.5 text-blue-500" />
                          Checklist: <span className="text-slate-800">{numDocsChecked}/{totalDocs} anexos</span>
                        </span>
                        {adt.prazoExtraDias && (
                          <span className="flex items-center gap-1 font-bold">
                            <Clock className="w-3.5 h-3.5 text-indigo-500" />
                            Prorrogação: <span className="text-slate-800">{adt.prazoExtraDias} dias</span>
                          </span>
                        )}
                        <span className="ml-auto text-blue-600 font-bold hover:underline flex items-center gap-0.5">
                          {selectedAditivoId === adt.id ? 'Recolher Detalhes ▲' : 'Ver Detalhes ▼'}
                        </span>
                      </div>

                      {/* Expandable Panel */}
                      {selectedAditivoId === adt.id && (
                        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-slate-50/50 p-4 rounded-xl cursor-default" onClick={e => e.stopPropagation()}>
                          <div className="space-y-2">
                            <h4 className="font-extrabold text-slate-700 border-b border-slate-150 pb-1">Memória Técnica e Respostas</h4>
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <p><span className="text-slate-400">Reprogramação:</span> <strong className="text-slate-700">{adt.reprogramacao || 'Não'}</strong></p>
                              <p><span className="text-slate-400">Saldo Complementar:</span> <strong className="text-slate-700">{adt.saldoComplementar || 'Não'}</strong></p>
                              <p><span className="text-slate-400">Tipo Aditivo:</span> <strong className="text-slate-700">{adt.tipo}</strong></p>
                              <p><span className="text-slate-400">Percentual do Contrato:</span> <strong className="text-slate-700">{adt.percentualContrato}%</strong></p>
                            </div>
                            <div className="mt-2">
                              <span className="text-slate-400 block text-[10px] uppercase font-bold">Justificativa do Proponente:</span>
                              <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-mono text-[11px] max-h-24 overflow-y-auto mt-1 whitespace-pre-wrap">
                                {adt.justificativa}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-extrabold text-slate-700 border-b border-slate-150 pb-1">Checklist Documental Anexado</h4>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                              {adt.checklistDocs ? adt.checklistDocs.map((itemObj, i) => (
                                <div key={i} className="flex items-center justify-between text-[10px] p-1 bg-white rounded border border-slate-150">
                                  <span className="font-bold text-slate-700 max-w-[180px] truncate">{itemObj.item}</span>
                                  {itemObj.checked ? (
                                    <span className="px-1.5 py-0.5 rounded text-[8px] bg-emerald-100 text-emerald-800 font-black">☑ OK (Anexado)</span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[8px] bg-amber-100 text-amber-800 font-bold">☐ Ausente</span>
                                  )}
                                </div>
                              )) : (
                                <span className="text-[11px] text-slate-400">Lista ausente</span>
                              )}
                            </div>
                          </div>

                          {/* Parecer DORE Consolidado se houver */}
                          {adt.parecerConsolidado && (
                            <div className="col-span-1 md:col-span-2 p-3 bg-blue-50 border border-blue-250 rounded-xl space-y-1.5 text-left">
                              <span className="font-black text-blue-800 text-[10px] uppercase tracking-wider flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                                Despacho / Parecer de Homologação DORE:
                              </span>
                              <p className="text-slate-700 italic font-mono text-[11px] whitespace-pre-wrap font-bold">
                                {adt.parecerConsolidado}
                              </p>
                            </div>
                          )}

                          {/* ACTION PANEL FOR USERS */}
                          <div className="col-span-1 md:col-span-2 pt-2 flex justify-between items-center bg-slate-100/50 p-2 rounded-lg">
                            <button
                              type="button"
                              onClick={() => handleExcluirAditivo(adt.id)}
                              className="text-red-500 hover:text-red-700 text-[10px] font-extrabold uppercase flex items-center gap-1 p-1 transition-colors"
                            >
                              <Trash className="w-3.5 h-3.5" /> Excluir Registro
                            </button>

                            {role === 'dore' && adt.status === 'Pendente' && (
                              <span className="text-[10px] text-indigo-700 font-black">Análise Pendente</span>
                            )}
                          </div>

                          {/* Dedicated Action Box for DORE Analista within the selected adit */}
                          {role === 'dore' && adt.status === 'Pendente' && (
                            <div className="col-span-1 md:col-span-2 p-4 bg-indigo-50/50 border border-indigo-200 rounded-2xl text-left space-y-3 mt-2">
                              <h5 className="font-extrabold text-indigo-900 text-xs flex items-center gap-1">
                                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                                Console de Análise Técnica - DORE
                              </h5>
                              <p className="text-[11px] text-slate-600">
                                Como analista da equipe interna da DORE, verifique se a Planilha de Serviços, Memorial e Relatórios Fotográficos justificam esta alteração. Emita seu parecer e decida se aprova ou recusa.
                              </p>

                              <div>
                                <label className="text-[9px] font-bold text-slate-600 uppercase block mb-1">Parecer Consolidado da DORE (Obrigatório)*</label>
                                <textarea
                                  value={parecerDoreInput}
                                  onChange={(e) => setParecerDoreInput(e.target.value)}
                                  placeholder="Ex: Após criterioso exame da justificativa técnica de instabilidade do talude, constata-se a real necessidade de fundações profundas não cobertas pelo contrato original. Pleito deferido e aditivo homologado de acordo com Art. 81."
                                  rows={2}
                                  className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-1 focus:ring-indigo-550"
                                />
                              </div>

                              <div className="flex gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleDoreAction(adt.id, 'Recusado')}
                                  className="px-4 py-1.5 text-xs font-black text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg uppercase cursor-pointer"
                                >
                                  Indeferir / Recusar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDoreAction(adt.id, 'Aprovado')}
                                  className="px-4 py-1.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg uppercase cursor-pointer shadow-xs"
                                >
                                  Deferir e Homologar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 bg-slate-50 rounded-2xl text-slate-400 text-xs">
                Nenhum aditivo com o status "{tipoFiltro}" foi encontrado para este projeto.
              </div>
            )}
          </div>

          {/* Quick instructions & stats panel */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs text-left">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">Resumo do Contrato SGO</h3>
              <div className="text-xs space-y-2 text-slate-600">
                <div className="flex justify-between border-b pb-1">
                  <span>Escola:</span>
                  <strong className="text-slate-800 max-w-[140px] truncate">{currentSol.nomeEscola}</strong>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>SRE Jurisdição:</span>
                  <strong className="text-slate-800">{currentSol.sre}</strong>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>Contrato Base:</span>
                  <strong className="text-slate-800 font-mono">R$ {(currentSol.valorPlanilha || 0).toLocaleString('pt-BR')}</strong>
                </div>
                <div className="flex justify-between pb-1">
                  <span>Pleitos Enviados:</span>
                  <strong className="text-slate-800 font-mono">{(currentSol.aditivos || []).length}</strong>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 text-xs text-amber-800 space-y-2">
              <h4 className="font-extrabold flex items-center gap-1">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" /> Regra Geral de Aditamentos (Incentivos SGO)
              </h4>
              <p className="leading-relaxed text-[11px]">
                Os acréscimos de valor em termos aditivos estão limitados legalmente a <b>25%</b> do valor inicial atualizado do contrato para obras e engenharia, e até <b>50%</b> exclusivamente para reformas de edifícios escolares.
              </p>
              <p className="leading-relaxed text-[11px] font-bold">
                Todos os pedidos agem como um novo atendimento inicial e necessitam de instrução contendo os 9 documentos de checklist.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* NOVO ATENDIMENTO DE ADITIVO */
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm text-left">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 mb-6">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Etapa {step} de 2</span>
              <h3 className="text-base font-black text-slate-800">
                {step === 1 ? 'Instrução do Pleito de Aditivo' : ' Checklist Documental Anexo do Pleito'}
              </h3>
            </div>

            {/* Stepper bubbles */}
            <div className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>1</span>
              <span className="w-6 h-0.5 bg-slate-200"></span>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>2</span>
            </div>
          </div>

          <form onSubmit={handleCreateAditivo} className="space-y-6">
            {step === 1 ? (
              /* ETAPA 1 - DADOS DO PLEITO */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 transition-all">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tipo de Pleito Contratual*</label>
                    <select
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value as any)}
                      className="w-full text-xs font-bold p-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-800"
                    >
                      <option value="Valor">De Valor (Acréscimos Financeiros)</option>
                      <option value="Prazo">De Prazo (Prorrogação de Cronograma)</option>
                      <option value="Valor e Prazo">Misto (De Valor e Prazo integrado)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Reprogramação de Metas Requerida?</label>
                    <select
                      value={reprogramacao}
                      onChange={(e) => setReprogramacao(e.target.value as any)}
                      className="w-full text-xs font-bold p-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-800"
                    >
                      <option value="Não">Não (Mesmo escopo de serviços primitivos)</option>
                      <option value="Sim">Sim (Readequação do cronograma físico-financeiro)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Exige Saldo Complementar?</label>
                    <select
                      value={saldoComplementar}
                      onChange={(e) => setSaldoComplementar(e.target.value as any)}
                      className="w-full text-xs font-bold p-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-800"
                    >
                      <option value="Não">Não</option>
                      <option value="Sim">Sim (Adicional orçamentário externo ao PAF padrão)</option>
                    </select>
                  </div>

                  {/* Justificativa */}
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Justificativa Técnica do Pleito*</label>
                    <textarea
                      required
                      value={justificativa}
                      onChange={(e) => setJustificativa(e.target.value)}
                      rows={4}
                      placeholder="Descreva detalhadamente as contingências externas de engenharia que justificam este pedido..."
                      className="w-full text-xs p-3 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Economic calculations */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/85 space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1 border-b pb-2">
                    <Calculator className="w-4 h-4 text-emerald-600" />
                    Simulador do Impacto Contratual
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Valor Atual SGO</span>
                      <p className="font-bold text-slate-700 font-mono mt-1.5">R$ {valorContratoOriginal.toLocaleString('pt-BR')}</p>
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Prorrogação de Prazo</span>
                      <input
                        type="number"
                        disabled={tipo === 'Valor'}
                        placeholder="Ex: 90 dias"
                        value={prazoExtra}
                        onChange={(e) => setPrazoExtra(e.target.value)}
                        className="w-full text-xs p-1.5 border border-slate-300 rounded-lg bg-white mt-1 font-mono"
                      />
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Acréscimo de Valor (R$)*</span>
                      <input
                        type="number"
                        disabled={tipo === 'Prazo'}
                        placeholder="Ex. 50000"
                        value={valorExtra}
                        onChange={(e) => setValorExtra(e.target.value)}
                        className="w-full text-xs p-1.5 border border-slate-300 rounded-lg bg-white mt-1 font-mono"
                      />
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Supressão Financeira (R$)</span>
                      <input
                        type="number"
                        disabled={tipo === 'Prazo'}
                        placeholder="Ex. 10000"
                        value={supressao}
                        onChange={(e) => setSupressao(e.target.value)}
                        className="w-full text-xs p-1.5 border border-slate-300 rounded-lg bg-white mt-1 font-mono"
                      />
                    </div>
                  </div>

                  {/* Calculated metrics */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-2 mt-4 text-xs">
                     <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-bold">Valor Líquido do Aditivo:</span>
                      <strong className={`font-mono text-sm ${valorAditivoLiquido >= 0 ? 'text-emerald-650' : 'text-rose-500'}`}>
                        R$ {valorAditivoLiquido.toLocaleString('pt-BR')}
                      </strong>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-bold">Percentual do Contrato:</span>
                      <strong className={`font-mono text-sm ${displayPercentual > 25 ? 'text-red-650' : 'text-slate-700'}`}>
                        {displayPercentual.toFixed(2)}%
                      </strong>
                    </div>

                    {displayPercentual > 25 && (
                      <p className="text-[10px] text-red-600 bg-red-50 p-1.5 rounded font-black border border-red-200">
                        ⚠️ Atenção: Limite ordinário de 25% ultrapassado. Requer especial análise jurídica interna.
                      </p>
                    )}
                  </div>

                  <div className="pt-2 text-right">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-6 py-2.5 text-xs font-black uppercase text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer shadow-xs inline-flex items-center gap-1"
                    >
                      Avançar para Checklist <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ETAPA 2 - CHECKLIST DOCUMENTAL */
              <div className="transition-all space-y-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl text-xs text-blue-800">
                  <p className="font-extrabold mb-1">📥 Cadastro de Anexos Oficiais de Obra (Etapa de Instrução)</p>
                  As portarias DORE regulam o anexo de toda essa documentação para autorização processual. Anexe ou marque como concluídos:
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {checklist.map((c, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
                      <div className="text-left space-y-1">
                        <span className="font-black text-slate-700 block">{c.item}</span>
                        {c.fileName ? (
                          <span className="text-[10px] text-blue-600 font-mono flex items-center gap-0.5">
                            📎 {c.fileName}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono italic">Pendente de anexo</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleChecklist(idx)}
                          className={`p-1.5 rounded-lg border text-[10px] font-extrabold uppercase transition-all ${c.checked ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                        >
                          {c.checked ? '☑ OK' : '☐ Marcar'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMockUpload(idx, '')}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
                          title="Anexar arquivo"
                        >
                          <FileUp className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-200 pt-5 flex justify-between items-center bg-slate-50/50 p-3.5 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg uppercase"
                  >
                    Voltar aos Dados
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 text-xs text-white font-black uppercase bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer shadow-md"
                  >
                    Enviar Processo para Homologação
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

// --- 6. SUB AJUSTE FILIAL ---
function SubAjustes({ currentSol, onUpdate }: { currentSol: Solicitacao | null; onUpdate: (sol: Solicitacao) => void }) {
  const [activeTab, setActiveTab] = useState<'historico' | 'novo_atendimento'>('historico');
  const [role, setRole] = useState<'proponente' | 'dore'>('proponente'); // Proponente vs Analista DORE
  const [step, setStep] = useState<1 | 2>(1);

  // Form states - Step 1
  const [tipoAjuste, setTipoAjuste] = useState<'sem_alteracao_meta' | 'com_alteracao_meta' | 'com_alteracao_meta_projeto' | 'sem_alteracao_meta_com_projeto'>('sem_alteracao_meta');
  const [valorAjusteInp, setValorAjusteInp] = useState('');
  const [supressao, setSupressao] = useState('');
  const [prazoExtra, setPrazoExtra] = useState('');
  const [reprogramacao, setReprogramacao] = useState<'Sim' | 'Não'>('Não');
  const [saldoComplementar, setSaldoComplementar] = useState<'Sim' | 'Não'>('Não');
  const [responsavelP, setResponsavelP] = useState('Guilherme Pereira e Silva');
  const [registroProfissional, setRegistroProfissional] = useState('CREA 21458/D');
  const [observacoesAjuste, setObservacoesAjuste] = useState('');

  // Checklist items step 2
  const [checklist, setChecklist] = useState([
    { item: 'Planilha de Serviços (Excel)', checked: false, fileName: '' },
    { item: 'Relatório Técnico', checked: false, fileName: '' },
    { item: 'Justificativa Técnico', checked: false, fileName: '' },
    { item: 'Relatório Fotográfico', checked: false, fileName: '' },
    { item: 'Planilha de Medições Acumuladas', checked: false, fileName: '' },
    { item: 'Extrato Bancário', checked: false, fileName: '' },
    { item: 'Declaração da Escola', checked: false, fileName: '' },
    { item: 'Projeto DWG (quando aplicável)', checked: false, fileName: '' },
    { item: 'Documentos Complementares', checked: false, fileName: '' },
  ]);

  // Selected adjust for detail view or analyst actions
  const [selectedAjusteId, setSelectedAjusteId] = useState<string | null>(null);
  const [parecerDoreInput, setParecerDoreInput] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'em_elaboracao' | 'analise_dore' | 'validado'>('todos');

  if (!currentSol) return <NoObraSelected />;

  // Derived values
  const valorContratoOriginal = currentSol.valorPlanilha || 0;
  const numAcre = parseFloat(valorAjusteInp) || 0;
  const numSup = parseFloat(supressao) || 0;
  const valorAditivoLiquido = numAcre - numSup;
  const percentualContrato = valorContratoOriginal > 0 ? (valorAditivoLiquido / valorContratoOriginal) * 100 : 0;

  // Handle Mock Upload
  const handleMockUpload = (index: number, name: string) => {
    setChecklist(prev => prev.map((item, idx) => {
      if (idx === index) {
        return {
          ...item,
          checked: true,
          fileName: name ? name : `ajuste_doc_${Math.floor(Math.random() * 1000)}.pdf`
        };
      }
      return item;
    }));
  };

  const toggleChecklist = (index: number) => {
    setChecklist(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, checked: !item.checked, fileName: !item.checked ? `ajuste_confirmado.pdf` : '' };
      }
      return item;
    }));
  };

  const handleCreateAjuste = (e: React.FormEvent) => {
    e.preventDefault();
    if (!observacoesAjuste.trim()) {
      alert('Por favor, preencha as notas técnicas / justificativa!');
      return;
    }

    const novoAjuste: AjustePlanilha = {
      id: `ajust_${Date.now()}`,
      numero: (currentSol.ajustes?.length || 0) + 1,
      tipoAjuste,
      valorAjuste: numAcre,
      responsavelPlanilha: responsavelP,
      registroProfissional,
      ajusteReferente: 'atendimento_inicial',
      valorContrato: valorContratoOriginal,
      diferencaPlanilhas: valorAditivoLiquido,
      desconto: 0,
      avancoFisico: 0,
      observacoes: observacoesAjuste,
      dataCriacao: new Date().toISOString().split('T')[0],
      status: 'analise_dore', // Sent to DORE
      analistaAtribuido: undefined,
      supressao: numSup > 0 ? numSup : undefined,
      reprogramacao,
      saldoComplementar,
      valorAditivo: valorAditivoLiquido,
      percentualContrato: parseFloat(percentualContrato.toFixed(2)),
      checklistDocs: checklist.map(c => ({ item: c.item, checked: c.checked })),
      parecerDore: ''
    };

    const updated = {
      ...currentSol,
      etapaAtual: 'analise' as const,
      analistaAtribuido: undefined,
      historicoEtapas: [
        ...(currentSol.historicoEtapas || []),
        {
          etapa: 'analise' as const,
          data: new Date().toISOString().split('T')[0],
          responsavel: 'Fiscal de Obra (Novo Pleito de Ajuste de Planilha)'
        }
      ],
      ajustes: [novoAjuste, ...(currentSol.ajustes || [])]
    };

    onUpdate(updated);

    alert('Nova solicitação de ajuste cadastrada e encaminhada com sucesso para Análise Técnica da DORE para atribuição de um analista!');

    // Reset Form
    setTipoAjuste('sem_alteracao_meta');
    setValorAjusteInp('');
    setSupressao('');
    setPrazoExtra('');
    setReprogramacao('Não');
    setSaldoComplementar('Não');
    setObservacoesAjuste('');
    setStep(1);
    setChecklist(checklist.map(c => ({ ...c, checked: false, fileName: '' })));
    setActiveTab('historico');
  };

  const handleDoreAction = (id: string, decision: 'validado' | 'em_elaboracao') => {
    if (!parecerDoreInput.trim()) {
      alert('Favor inserir uma justificativa/parecer técnico para esta validação.');
      return;
    }

    let updatedSolMock = { ...currentSol };
    const targetAjuste = (updatedSolMock.ajustes || []).find(a => a.id === id);

    if (targetAjuste) {
      targetAjuste.status = decision;
      targetAjuste.parecerDore = parecerDoreInput;
      targetAjuste.dataCriacao = new Date().toISOString().split('T')[0];

      // If validated/approved, compile effects into valorPlanilha
      if (decision === 'validado') {
        const ajuVal = targetAjuste.valorAditivo || 0;
        updatedSolMock.valorPlanilha = (updatedSolMock.valorPlanilha || 0) + ajuVal;
        updatedSolMock.valorHomologadoContratacao = (updatedSolMock.valorHomologadoContratacao || 0) + ajuVal;
      }

      onUpdate(updatedSolMock);
      setParecerDoreInput('');
      setSelectedAjusteId(null);
    }
  };

  const handleExcluirAjuste = (id: string) => {
    let updatedSolMock = { ...currentSol };
    const targetAjuste = (updatedSolMock.ajustes || []).find(a => a.id === id);
    if (targetAjuste && targetAjuste.status === 'validado') {
      const ajuVal = targetAjuste.valorAditivo || 0;
      updatedSolMock.valorPlanilha = (updatedSolMock.valorPlanilha || 0) - ajuVal;
      updatedSolMock.valorHomologadoContratacao = (updatedSolMock.valorHomologadoContratacao || 0) - ajuVal;
    }

    updatedSolMock.ajustes = (updatedSolMock.ajustes || []).filter(a => a.id !== id);
    onUpdate(updatedSolMock);
    if (selectedAjusteId === id) setSelectedAjusteId(null);
  };

  const listAjustesFiltered = (currentSol.ajustes || []).filter(a => {
    if (tipoFiltro === 'todos') return true;
    return a.status === tipoFiltro;
  });

  return (
    <div className="space-y-6 animate-fadeIn text-left font-sans">
      {/* Dynamic Header & View Toggle Control */}
      <div className="bg-gradient-to-r from-indigo-700 to-purple-800 rounded-3xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[indigo-200] bg-indigo-900/40 px-3 py-1 rounded-full border border-indigo-500/20">
            DORE - Ajustes de Planilha de Obra
          </span>
          <h2 className="text-xl md:text-2xl font-black mt-2 tracking-tight">
            Remanejamentos e Ajustes de Planilha
          </h2>
          <p className="text-xs text-indigo-100/90 mt-1 max-w-xl">
            Ajustes e mudanças orçamentárias que demandem aprovação interna da equipe DORE para validade jurídica e financeira.
          </p>
        </div>

        {/* Persona Switch Box */}
        <div className="bg-white/10 backdrop-blur-xs p-1.5 rounded-2xl border border-white/15 flex items-center gap-1 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setRole('proponente')}
            className={`flex-1 md:flex-initial text-[11px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all flex items-center justify-center gap-1 ${role === 'proponente' ? 'bg-white text-indigo-900 shadow-sm' : 'text-white hover:bg-white/5'}`}
          >
            <User className="w-3.5 h-3.5" /> Engenheiro / Escola
          </button>
          <button
            type="button"
            onClick={() => setRole('dore')}
            className={`flex-1 md:flex-initial text-[11px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all flex items-center justify-center gap-1 ${role === 'dore' ? 'bg-white text-purple-900 shadow-sm' : 'text-white hover:bg-white/5'}`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Analista DORE
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('historico')}
          className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider transition-colors flex items-center gap-2 border-b-2 ${activeTab === 'historico' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-850'}`}
        >
          <History className="w-4 h-4" /> Histórico de Ajustes ({currentSol.ajustes?.length || 0})
        </button>
        <button
          onClick={() => {
            setActiveTab('novo_atendimento');
            setStep(1);
          }}
          className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider transition-colors flex items-center gap-2 border-b-2 ${activeTab === 'novo_atendimento' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-850'}`}
        >
          <Plus className="w-4 h-4" /> Registrar Ajuste de Planilha
        </button>
      </div>

      {/* CONTENT AREA */}
      {activeTab === 'historico' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List of adjustments */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filter bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Filtrar Ajustes:</span>
              <div className="flex items-center gap-1.5 text-xs">
                {(['todos', 'em_elaboracao', 'analise_dore', 'validado'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setTipoFiltro(f)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${tipoFiltro === f ? 'bg-slate-800 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {f === 'todos' ? 'Todos' : f === 'em_elaboracao' ? 'Correção/Rascunho' : f === 'analise_dore' ? 'Em Análise' : 'Validado'}
                  </button>
                ))}
              </div>
            </div>

            {listAjustesFiltered.length > 0 ? (
              <div className="space-y-4">
                {listAjustesFiltered.map(aju => {
                  const numDocsChecked = aju.checklistDocs ? aju.checklistDocs.filter(c => c.checked).length : 0;
                  const totalDocs = aju.checklistDocs ? aju.checklistDocs.length : 9;
                  const ajuLiq = aju.valorAditivo || 0;

                  return (
                    <div
                      key={aju.id}
                      onClick={() => setSelectedAjusteId(aju.id === selectedAjusteId ? null : aju.id)}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer bg-white text-left ${selectedAjusteId === aju.id ? 'border-indigo-500 ring-2 ring-indigo-500/10 shadow-md' : 'border-slate-200 hover:border-slate-300 shadow-xs'}`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-slate-100 text-slate-800 uppercase tracking-widest border border-slate-200">
                              Ajuste Nº {aju.numero}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              aju.status === 'validado' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              aju.status === 'em_elaboracao' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse'
                            }`}>
                              ● {aju.status === 'validado' ? 'Validado' : aju.status === 'em_elaboracao' ? 'Correção Requerida' : 'DORE em Análise'}
                            </span>
                          </div>
                          <p className="text-xs font-black text-slate-800 mt-2">
                            Ajuste: {aju.tipoAjuste.replace(/_/g, ' ')}
                          </p>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                            {aju.observacoes}
                          </p>
                        </div>

                        <div className="text-right space-y-1.5 shrink-0 text-xs font-mono">
                          <p className="text-[11px] text-slate-400">{aju.dataCriacao}</p>
                          <p className="font-extrabold text-slate-700">Acr: R$ {aju.valorAjuste.toLocaleString('pt-BR')}</p>
                          {aju.supressao !== undefined && (
                            <p className="text-[10px] text-red-500">Sup: -R$ {aju.supressao.toLocaleString('pt-BR')}</p>
                          )}
                          <p className={`font-black ${ajuLiq >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            Líq: R$ {ajuLiq.toLocaleString('pt-BR')} ({aju.percentualContrato || 0}%)
                          </p>
                        </div>
                      </div>

                      {/* Summary footer */}
                      <div className="flex gap-4 items-center mt-4 pt-4 border-t border-slate-100 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1 font-bold">
                          <FileText className="w-3.5 h-3.5 text-indigo-500" />
                          Responsável: <span className="text-slate-800 font-extrabold">{aju.responsavelPlanilha} ({aju.registroProfissional})</span>
                        </span>
                        <span className="flex items-center gap-1 font-bold">
                          <ClipboardCheck className="w-3.5 h-3.5 text-emerald-500" />
                          Checklist: <span className="text-slate-800">{numDocsChecked}/{totalDocs} documentos</span>
                        </span>
                        <span className="ml-auto text-indigo-600 font-bold hover:underline flex items-center gap-0.5">
                          {selectedAjusteId === aju.id ? 'Recolher Detalhes ▲' : 'Ver Detalhes ▼'}
                        </span>
                      </div>

                      {/* Expandable panel details */}
                      {selectedAjusteId === aju.id && (
                        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-slate-50/50 p-4 rounded-xl cursor-default" onClick={e => e.stopPropagation()}>
                          <div className="space-y-2">
                            <h4 className="font-extrabold text-slate-700 border-b border-slate-150 pb-1">Memória de Remanejamento Orçamentário</h4>
                            <div className="grid grid-cols-1 gap-1.5 text-[11px] text-slate-600">
                              <p><b>Reprogramação Física de Metas:</b> <span className="text-slate-800">{aju.reprogramacao || 'Não'}</span></p>
                              <p><b>Necessitou Saldo Complementar:</b> <span className="text-slate-800">{aju.saldoComplementar || 'Não'}</span></p>
                              <p><b>Classificação Técnica Adjunto:</b> <span className="text-slate-850 font-mono text-[10px]">{aju.tipoAjuste.toUpperCase()}</span></p>
                            </div>
                            <div className="space-y-1 mt-2">
                              <span className="text-[10px] text-slate-400 block font-bold uppercase">Notas do Engenheiro Planilhador:</span>
                              <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-mono text-[11px] overflow-y-auto whitespace-pre-wrap max-h-32">
                                {aju.observacoes}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-extrabold text-slate-700 border-b border-slate-150 pb-1">Checklist Documental Validado</h4>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                              {aju.checklistDocs ? aju.checklistDocs.map((itemObj, i) => (
                                <div key={i} className="flex items-center justify-between text-[10px] p-1 bg-white rounded border border-slate-150">
                                  <span className="font-bold text-slate-700 max-w-[180px] truncate">{itemObj.item}</span>
                                  {itemObj.checked ? (
                                    <span className="px-1.5 py-0.5 rounded text-[8px] bg-emerald-100 text-emerald-800 font-black">☑ OK (Verificado)</span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[8px] bg-amber-100 text-amber-800 font-bold">☐ Requerido</span>
                                  )}
                                </div>
                              )) : (
                                <span className="text-[10.5px] text-slate-400">Sem checklist cadastrartdo</span>
                              )}
                            </div>
                          </div>

                          {/* Parecer DORE se existente */}
                          {aju.parecerDore && (
                            <div className="col-span-1 md:col-span-2 p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-1 text-left">
                              <span className="font-black text-purple-800 text-[10px] uppercase tracking-wider flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                                Despacho da Assessoria Técnica DORE:
                              </span>
                              <p className="text-slate-700 italic font-mono text-[11px] whitespace-pre-wrap font-bold">
                                {aju.parecerDore}
                              </p>
                            </div>
                          )}

                          {/* Delete controls */}
                          <div className="col-span-1 md:col-span-2 pt-2 flex justify-between items-center bg-slate-100/50 p-2 rounded-lg">
                            <button
                              type="button"
                              onClick={() => handleExcluirAjuste(aju.id)}
                              className="text-red-500 hover:text-red-700 text-[10px] font-extrabold uppercase flex items-center gap-1 p-1 transition-colors"
                            >
                              <Trash className="w-3.5 h-3.5" /> Excluir Ajuste
                            </button>

                            {role === 'dore' && aju.status === 'analise_dore' && (
                              <span className="text-[10px] text-purple-800 font-black">Aguardando Validação</span>
                            )}
                          </div>

                          {/* DORE action panel */}
                          {role === 'dore' && aju.status === 'analise_dore' && (
                            <div className="col-span-1 md:col-span-2 p-4 bg-purple-50/50 border border-purple-200 rounded-2xl text-left space-y-3 mt-2">
                              <h5 className="font-extrabold text-purple-900 text-xs flex items-center gap-1">
                                <ShieldCheck className="w-4 h-4 text-purple-700" />
                                Homologação Interna DORE / SGO
                              </h5>
                              <p className="text-[11px] text-slate-600">
                                Como analista ou subdiretor, analise se o remanejamento proposto altera a meta inicial do PAF e valide o pleito.
                              </p>

                              <div>
                                <label className="text-[9px] font-bold text-slate-600 uppercase block mb-1">Observações / Parecer da DORE*</label>
                                <textarea
                                  value={parecerDoreInput}
                                  onChange={(e) => setParecerDoreInput(e.target.value)}
                                  placeholder="Ex: Pleito analisado. Ajuste orçamentário cabível conforme dotação vigente sob justificativa de juste na fundação, mantido o objeto contratual sem acréscimo de metas físicas. Homologado."
                                  rows={2}
                                  className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-1 focus:ring-purple-500"
                                />
                              </div>

                              <div className="flex gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleDoreAction(aju.id, 'em_elaboracao')}
                                  className="px-4 py-1.5 text-xs font-black text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg uppercase cursor-pointer"
                                >
                                  Retornar p/ Correção
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDoreAction(aju.id, 'validado')}
                                  className="px-4 py-1.5 text-xs font-black text-white bg-purple-650 hover:bg-purple-700 rounded-lg uppercase cursor-pointer shadow-xs"
                                >
                                  Validar e Publicar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 bg-slate-50 rounded-2xl text-slate-400 text-xs">
                Nenhum ajuste com o status "{tipoFiltro}" foi encontrado para essa escola.
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs text-left">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">Escola Vinculada</h3>
              <p className="text-xs text-slate-755"><b>Escola:</b> {currentSol.nomeEscola}</p>
              <p className="text-xs text-slate-755 mt-1"><b>Planilha SGO:</b> R$ {(currentSol.valorPlanilha || 0).toLocaleString('pt-BR')}</p>
            </div>

            <div className="bg-purple-50 border border-purple-200 text-purple-900 rounded-2xl p-4 text-xs space-y-2">
              <h4 className="font-extrabold flex items-center gap-1 text-[11px] uppercase tracking-wider">
                <AlertCircle className="w-4 h-4 text-purple-600" />
                Instruções de Ajuste Orçamentário
              </h4>
              <p className="leading-relaxed text-[11px]">
                Os ajustes referem-se à substituição de insumos, planilhamento ou remanejamentos que não alterem o objeto primitivo ou estendam o orçamento extra do PAF.
              </p>
              <p className="leading-relaxed text-[11px] font-bold">
                Checklist de 2ª Etapa e anotações técnicas do Engenheiro são necessários para homologação e publicação.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* NOVO AJUSTE EXECUTADO EM MODO DE ATENDIMENTO */
        <div className="bg-white rounded-3xl border border-slate-250 p-6 shadow-sm text-left">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider">Etapa {step} de 2</span>
              <h3 className="text-base font-black text-slate-800">
                {step === 1 ? 'Instrução do Ajuste Técnico' : 'Checklist e Documentos Técnicos'}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>1</span>
              <span className="w-6 h-0.5 bg-slate-200"></span>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>2</span>
            </div>
          </div>

          <form onSubmit={handleCreateAjuste} className="space-y-6">
            {step === 1 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 transition-all">
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tipo de Remanejamento Planejado*</label>
                    <select
                      value={tipoAjuste}
                      onChange={(e) => setTipoAjuste(e.target.value as any)}
                      className="w-full text-xs font-bold p-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 focus:outline-hidden"
                    >
                      <option value="sem_alteracao_meta">Ajuste técnico sem alteração de metas físicas</option>
                      <option value="com_alteracao_meta">Remanejamento com alteração de metas parciais</option>
                      <option value="com_alteracao_meta_projeto">Alteração substancial de metas e adequação de projetos</option>
                      <option value="sem_alteracao_meta_com_projeto">Adequação técnica de projeto sem impacto de metas</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Responsável Técnico (Eng)*</label>
                      <input
                        type="text"
                        required
                        value={responsavelP}
                        onChange={(e) => setResponsavelP(e.target.value)}
                        className="w-full text-xs p-3 border border-slate-300 rounded-xl bg-white focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nº Registro Mtb (CREA/CAU)*</label>
                      <input
                        type="text"
                        required
                        value={registroProfissional}
                        onChange={(e) => setRegistroProfissional(e.target.value)}
                        className="w-full text-xs p-3 border border-slate-300 rounded-xl bg-white focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Reprogramação Física Requerida?</label>
                      <select
                        value={reprogramacao}
                        onChange={(e) => setReprogramacao(e.target.value as any)}
                        className="w-full text-xs p-3 border border-slate-300 rounded-xl bg-slate-50 focus:outline-hidden"
                      >
                        <option value="Não">Não</option>
                        <option value="Sim">Sim</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Saldo Complementar Requerido?</label>
                      <select
                        value={saldoComplementar}
                        onChange={(e) => setSaldoComplementar(e.target.value as any)}
                        className="w-full text-xs p-3 border border-slate-300 rounded-xl bg-slate-50 focus:outline-hidden"
                      >
                        <option value="Não">Não</option>
                        <option value="Sim">Sim</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Justificativa e Anotações Técnicas de Ajuste*</label>
                    <textarea
                      required
                      value={observacoesAjuste}
                      onChange={(e) => setObservacoesAjuste(e.target.value)}
                      rows={4}
                      placeholder="Identifique de forma lógica as alterações de insumos e especificações técnicas de materiais..."
                      className="w-full text-xs p-3 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Calculations info */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 text-xs">
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1 border-b pb-2">
                    <Calculator className="w-4 h-4 text-indigo-600" />
                    Balanço Orçamentário Proposto
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Acréscimo de Itens (R$)</span>
                      <input
                        type="number"
                        placeholder="Ex: 15400"
                        value={valorAjusteInp}
                        onChange={(e) => setValorAjusteInp(e.target.value)}
                        className="w-full text-xs p-1.5 border border-slate-300 bg-white rounded-lg mt-1 font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Supressão de Itens (R$)</span>
                      <input
                        type="number"
                        placeholder="Ex: 12000"
                        value={supressao}
                        onChange={(e) => setSupressao(e.target.value)}
                        className="w-full text-xs p-1.5 border border-slate-300 bg-white rounded-lg mt-1 font-mono"
                      />
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2 mt-4 text-xs">
                    <div className="flex justify-between items-center bg-white">
                      <span className="text-slate-500 font-bold">Valor Líquido do Ajuste:</span>
                      <strong className={`font-mono ${valorAditivoLiquido >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        R$ {valorAditivoLiquido.toLocaleString('pt-BR')}
                      </strong>
                    </div>

                    <div className="flex justify-between items-center mt-1">
                      <span className="text-slate-500 font-bold">Porcentagem do Contrato:</span>
                      <strong className="text-slate-700 font-mono">
                        {percentualContrato.toFixed(2)}%
                      </strong>
                    </div>
                  </div>

                  <div className="pt-2 text-right">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-6 py-2.5 text-xs font-black uppercase text-white bg-indigo-650 hover:bg-indigo-700 rounded-xl cursor-pointer shadow-xs inline-flex items-center gap-1"
                    >
                      Checklist de Evidências <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ETAPA 2 - CHECKLIST DOCUMENTAL DO AJUSTE */
              <div className="transition-all space-y-4 text-xs">
                <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl text-[11px] text-slate-700 space-y-1">
                  <p className="font-extrabold text-indigo-900">📥 Registro de Anexos para Ajuste Técnico de Projeto</p>
                  Marque ou junte arquivos comprobatórios para a homologação do remanejamento junto de nossos analistas técnicos da DORE:
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {checklist.map((c, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                      <div className="text-left space-y-1">
                        <span className="font-black text-slate-700 block">{c.item}</span>
                        {c.fileName ? (
                          <span className="text-[10px] text-indigo-600 font-mono flex items-center gap-0.5">
                            📎 {c.fileName}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono italic">Pendente</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleChecklist(idx)}
                          className={`p-1.5 rounded-lg border text-[10px] font-extrabold uppercase transition-all ${c.checked ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                        >
                          {c.checked ? '☑ OK' : '☐ Marcar'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMockUpload(idx, '')}
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200"
                          title="Anexar arquivo"
                        >
                          <FileUp className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-200 pt-5 flex justify-between items-center bg-slate-50/50 p-3.5 rounded-2xl font-black">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg uppercase"
                  >
                    Voltar aos Dados
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 text-xs text-white bg-indigo-650 hover:bg-indigo-700 font-black rounded-xl uppercase cursor-pointer"
                  >
                    Enviar Proposta para Validação da DORE
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

// --- 7. SUB FISCALIZAÇÃO ---
function SubFiscalizacao({ currentSol, onUpdate }: { currentSol: Solicitacao | null; onUpdate: (sol: Solicitacao) => void }) {
  const [fiscalInput, setFiscalInput] = useState(() => currentSol?.fiscalObraAtribuido || '');
  const [diarioTexto, setDiarioTexto] = useState('');
  const [historicoDiarios, setHistoricoDiarios] = useState<string[]>([
    'Vistoria de rotina realizada em 2026-05-20. Alvenaria 45% executada. Recomenda-se maior velocidade na cobertura.',
    'Verificação técnica em 2026-05-10. Instalações elétricas em bom andamento.'
  ]);

  if (!currentSol) return <NoObraSelected />;

  const salvarFiscal = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...currentSol,
      fiscalObraAtribuido: fiscalInput
    };
    onUpdate(updated);
  };

  const adicionarDiario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diarioTexto) return;
    setHistoricoDiarios([`Lançamento Diário em ${new Date().toISOString().split('T')[0]} - ${diarioTexto}`, ...historicoDiarios]);
    setDiarioTexto('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
      
      {/* Diary history viewer */}
      <div className="lg:col-span-2 space-y-4">
        
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-50 pb-2 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Diário de Campo e Vistorias
          </h3>

          <div className="space-y-3">
            {historicoDiarios.map((diario, index) => (
              <div key={index} className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-750 font-sans relative pl-8">
                <div className="absolute left-3 top-3.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
                <p className="leading-relaxed">{diario}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Editor & Fiscal Attrib card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs space-y-5 text-left col-span-1">
        <div>
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5 mb-3">
            <User className="w-4 h-4 text-blue-500" /> Fiscal de Obra Credenciado
          </h3>
          <form onSubmit={salvarFiscal} className="space-y-3">
            <input
              id="fiscal-obra-input"
              type="text"
              placeholder="Ex: Engª. Helena Rocha"
              value={fiscalInput}
              onChange={(e) => setFiscalInput(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden"
            />
            <button
              id="save-fiscal-btn"
              type="submit"
              className="w-full py-1.5 text-xs text-white font-bold bg-slate-800 hover:bg-slate-900 rounded-lg cursor-pointer transition-colors"
            >
              Atribuir Fiscal
            </button>
          </form>
        </div>

        <div>
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5 mb-3">
            <Plus className="w-4 h-4 text-emerald-500" /> Logar no Diário de Obra
          </h3>
          <form onSubmit={adicionarDiario} className="space-y-3">
            <textarea
              id="diario-campo-textarea"
              required
              rows={3}
              placeholder="Descreva nova ocorrência..."
              value={diarioTexto}
              onChange={(e) => setDiarioTexto(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden"
            />
            <button
              id="add-diario-btn"
              type="submit"
              className="w-full py-2 text-xs text-white font-black uppercase bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer transition-colors animate-pulse"
            >
              Enviar Diário de Campo
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}

// --- 8. SUB DOCUMENTOS (GED) ---
function SubDocumentos({ currentSol, onUpdate }: { currentSol: Solicitacao | null; onUpdate: (sol: Solicitacao) => void }) {
  const [documentosSalvos, setDocumentosSalvos] = useState<{ name: string; size: string; type: string; date: string }[]>([
    { name: 'Planilha_Completa_Original_Assinada.pdf', size: '2.5 MB', type: 'Planilha Orçamentária', date: '2026-05-15' },
    { name: 'Cronograma_Geral_Instalacoes.xlsx', size: '1.2 MB', type: 'Planejamento', date: '2026-05-16' },
    { name: 'ART_Projeto_Futu_Estrutural.pdf', size: '150 KB', type: 'Certidão & ART', date: '2026-05-18' }
  ]);

  const [documentoSelecionado, setDocumentoSelecionado] = useState('Planilha Orçamentária');
  const [docNameLocal, setDocNameLocal] = useState('');

  if (!currentSol) return <NoObraSelected />;

  const dragOverFake = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const uploadFake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docNameLocal) return;

    const novoDoc = {
      name: docNameLocal.endsWith('.pdf') ? docNameLocal : `${docNameLocal}.pdf`,
      size: `${Math.floor(100 + Math.random() * 800)} KB`,
      type: documentoSelecionado,
      date: new Date().toISOString().split('T')[0]
    };

    setDocumentosSalvos([novoDoc, ...documentosSalvos]);
    setDocNameLocal('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
      
      {/* File tree browser */}
      <div className="lg:col-span-2 space-y-4">
        
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-50 pb-2 flex items-center gap-1">
            <UploadCloud className="w-4 h-4 text-indigo-500" />
            Central de Arquivos da Obra Escolar
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* Folder 1 */}
            <div className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-2.5 transition-colors cursor-pointer">
              <span className="text-xl">📂</span>
              <div className="text-left">
                <span className="text-[11px] font-bold text-slate-700 block">Planilhas Físicas</span>
                <span className="text-[9px] text-slate-400 font-mono block">3 arquivos salvos</span>
              </div>
            </div>

            {/* Folder 2 */}
            <div className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-2.5 transition-colors cursor-pointer">
              <span className="text-xl">📂</span>
              <div className="text-left">
                <span className="text-[11px] font-bold text-slate-700 block">Fotografia Geral</span>
                <span className="text-[9px] text-slate-400 font-mono block">6 fotos anexas</span>
              </div>
            </div>

            {/* Folder 3 */}
            <div className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-2.5 transition-colors cursor-pointer text-left">
              <span className="text-xl">📂</span>
              <div className="text-left">
                <span className="text-[11px] font-bold text-slate-700 block">Certidões e ART</span>
                <span className="text-[9px] text-slate-400 font-mono block">2 arquivos salvos</span>
              </div>
            </div>
          </div>

          <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Histórico GED Consolidade</h4>
          <div className="space-y-2">
            {documentosSalvos.map((d, index) => (
              <div key={index} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <div className="text-left">
                    <span className="font-bold text-slate-800 break-all">{d.name}</span>
                    <span className="text-[10px] text-slate-405 block">{d.type} • Upload {d.date}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded">{d.size}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Upload files drawer */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs ">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5 mb-4">
          <FileUp className="w-4 h-4 text-blue-500" /> Upload de Novo Documento
        </h3>

        <form onSubmit={uploadFake} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Selecione a Pasta Destino</label>
            <select
              id="documentos-tipo-select"
              value={documentoSelecionado}
              onChange={(e) => setDocumentoSelecionado(e.target.value)}
              className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 focus:outline-hidden"
            >
              <option value="Planilha Orçamentária">Planilha Orçamentária</option>
              <option value="Planejamento">Planejamento</option>
              <option value="Diário do Dia">Diário do Dia</option>
              <option value="Certidão & ART">Certidão & ART</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Nome Amigável do Arquivo*</label>
            <input
              id="documentos-nome-input"
              type="text"
              required
              placeholder="Ex: Planilha_Medicao_Fisica_Aprovada"
              value={docNameLocal}
              onChange={(e) => setDocNameLocal(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden"
            />
          </div>

          {/* Simulated drag zone */}
          <div 
            onDragOver={dragOverFake}
            className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50"
          >
            <p className="text-xs font-semibold text-slate-500">Arraste novos documentos aqui</p>
            <p className="text-[10px] text-slate-400 mt-1">Formatos suportados: PDF, XLS, JPG (Max 15MB)</p>
          </div>

          <button
            id="btn-upload-ged"
            type="submit"
            className="w-full py-2.5 text-xs text-white font-black uppercase bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer transition-colors"
          >
            Anexar Eletronicamente
          </button>
        </form>
      </div>

    </div>
  );
}



// --- HELPER WRAPPER ---
function NoObraSelected() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">
      <HardHat className="w-12 h-12 mx-auto text-slate-300 mb-2 animate-bounce" />
      <h3 className="text-sm font-black uppercase text-slate-700 mb-1">Selecione uma Obra para Atuar</h3>
      <p className="text-xs">Para gerenciar este subunidade, por favor escolha uma escola em execução na barra superior de filtros.</p>
    </div>
  );
}
