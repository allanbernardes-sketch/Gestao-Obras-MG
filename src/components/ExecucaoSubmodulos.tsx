import React, { useState, useMemo } from 'react';
import { 
  Building2, HardHat, Layers, ClipboardList, Plus, Calculator, ShieldCheck, 
  UploadCloud, LayoutGrid, DollarSign, Calendar, MapPin, Search, CheckCircle, 
  Trash2, AlertCircle, Sparkles, User, FileText, ChevronRight, Scale, Clock,
  FileCheck, FileUp, Zap, HelpCircle, History, Info, Trash, RefreshCw, Eye,
  TrendingUp, Edit, ClipboardCheck, Wrench
} from 'lucide-react';
import { Solicitacao, Medicao, Aditivo, AjustePlanilha, PerfilUsuario } from '../types';

interface ExecucaoSubmodulosProps {
  activeSubTask: string;
  solicitacoes: Solicitacao[];
  onUpdate: (updated: Solicitacao) => void;
  perfilUsuario: PerfilUsuario;
  onSelect: (sol: Solicitacao) => void;
}

export default function ExecucaoSubmodulos({ 
  activeSubTask, 
  solicitacoes, 
  onUpdate, 
  perfilUsuario, 
  onSelect 
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
        tipo: 'REFORMA',
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
              </div>
            </div>

            {/* Complementary information fields - REQUIREMENT CONSTRAINT */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
              <h4 className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-1 pb-1 border-b border-slate-100">
                <Wrench className="w-3.5 h-3.5 text-blue-500" />
                Complementar Dados de Execução e Responsabilidade
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Classificação Regulamentar da Obra*</label>
                  <select
                    value={classeObra}
                    onChange={(e) => setClasseObra(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 font-bold focus:outline-hidden"
                  >
                    <option value="Pequeno Porte">Pequeno Porte (Até R$ 500mil)</option>
                    <option value="Médio Porte">Médio Porte (R$ 500mil a R$ 2M)</option>
                    <option value="Grande Porte">Grande Porte (R$ 2M a R$ 10M)</option>
                    <option value="Alta Complexidade / Especial">Especial / Complexa (&gt; R$ 10M)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Complexidade Técnica DORE (1 a 5)*</label>
                  <select
                    value={pontuacaoComplexidade}
                    onChange={(e) => setPontuacaoComplexidade(parseInt(e.target.value))}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 font-bold focus:outline-hidden"
                  >
                    <option value="1">Nível 1 - Complexidade Baixa</option>
                    <option value="2">Nível 2 - Complexidade Normal</option>
                    <option value="3">Nível 3 - Complexidade Moderada</option>
                    <option value="4">Nível 4 - Complexidade Elevada</option>
                    <option value="5">Nível 5 - Complexidade Altíssima</option>
                  </select>
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
  const [novoStatus, setNovoStatus] = useState<'Não Iniciada' | 'Em Andamento' | 'Paralisada' | 'Concluída'>('Não Iniciada');
  const [descricaoProgresso, setDescricaoProgresso] = useState('');

  if (!currentSol) return <NoObraSelected />;

  const sumMedicoes = currentSol.medicoes?.reduce((sum, m) => sum + m.valor, 0) || 0;
  const currentPercent = (currentSol.valorPlanilha || 1) > 0 ? (sumMedicoes / (currentSol.valorPlanilha || 1)) * 105 : 0;
  const safePercent = Math.min(100, Math.max(0, currentPercent));

  const updateObraStatus = () => {
    const updated = {
      ...currentSol,
      statusObra: novoStatus,
      observacoesFicha: descricaoProgresso ? `${descricaoProgresso}. (Log: status alterado para ${novoStatus})` : currentSol.observacoesFicha
    };
    onUpdate(updated);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Interaction block */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Physical progression gauge */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <HardHat className="w-4 h-4 text-amber-500" />
            Avanço e Status de Campo
          </h2>

          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/40 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-900 leading-relaxed font-sans">
              <strong>Procedimento de Controle:</strong> A porcentagem de avanço físico mostrada no painel é calculada a partir do consolidado das medições financeiras enviadas e validadas pelo fiscal de campo credenciado.
            </p>
          </div>

          <div className="py-6 flex flex-col items-center justify-center space-y-4">
            <div className="relative w-40 h-40">
              {/* Simple beautiful circular visual tracker */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="#3b82f6" 
                  strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * safePercent) / 100}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-800 font-mono tracking-tighter">
                  {safePercent.toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-400 font-black uppercase">Executado</span>
              </div>
            </div>

            <div className="text-center">
              <span className="text-[9.5px] uppercase font-bold text-slate-400">Total Medido Acumulado</span>
              <p className="text-sm font-black text-slate-700 font-mono mt-0.5">
                R$ {sumMedicoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Form to alter status of active production */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1 border-b border-slate-50 pb-2">
            <Scale className="w-4 h-4 text-blue-500" /> Atualizar Situação Operacional da Obra
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Status de Execução</label>
              <select
                id="select-novo-status-obras"
                value={novoStatus}
                onChange={(e) => setNovoStatus(e.target.value as any)}
                className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 outline-hidden"
              >
                <option value="Não Iniciada">Não Iniciada</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Paralisada">Paralisada</option>
                <option value="Concluída">Concluída</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Nota Pública do Diário / Progresso</label>
              <input
                id="input-desc-progresso"
                type="text"
                placeholder="Ex. Fundações finalizadas, iniciando alvenaria estrutural..."
                value={descricaoProgresso}
                onChange={(e) => setDescricaoProgresso(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              id="btn-update-status-obras"
              type="button"
              onClick={updateObraStatus}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer"
            >
              Registrar Alteração de Status
            </button>
          </div>
        </div>

      </div>

      {/* Timeline stages side visual */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs space-y-4">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1 border-b border-slate-100 pb-2.5">
          <Clock className="w-4 h-4 text-indigo-500" /> Cronograma de Marcos Físicos
        </h3>

        <div className="space-y-6 relative pl-3.5 border-l border-slate-200/80 ml-2 py-2">
          
          {/* Milestone 1 */}
          <div className="relative">
            <div className="absolute -left-[23px] top-0.5 bg-sky-500 rounded-full w-4 h-4 border-2 border-white shadow-xs" />
            <div className="font-sans">
              <div className="text-[10px] text-sky-600 font-extrabold uppercase">Março 1 • Autorizado</div>
              <h4 className="text-xs font-bold text-slate-800">Assinatura de Ordem de Início</h4>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Empresas e fiscais credenciados para as vistorias prévias.</p>
            </div>
          </div>

          {/* Milestone 2 */}
          <div className="relative">
            <div className={`absolute -left-[23px] top-0.5 rounded-full w-4 h-4 border-2 border-white shadow-xs ${
              currentPercent > 0 ? 'bg-amber-500' : 'bg-slate-300'
            }`} />
            <div className="font-sans">
              <div className="text-[10px] text-amber-600 font-extrabold uppercase">Março 2 • Em Execução</div>
              <h4 className="text-xs font-bold text-slate-800">Avanço Físico Intermediário</h4>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Lançamento sistemático das primeiras medições de medição estrutural.</p>
            </div>
          </div>

          {/* Milestone 3 */}
          <div className="relative">
            <div className={`absolute -left-[23px] top-0.5 rounded-full w-4 h-4 border-2 border-white shadow-xs ${
              currentPercent >= 100 ? 'bg-emerald-500' : 'bg-slate-300'
            }`} />
            <div className="font-sans">
              <div className="text-[10px] text-emerald-600 font-extrabold uppercase">Março 3 • Conclusão</div>
              <h4 className="text-xs font-bold text-slate-800">Laudo Técnico Conclusivo</h4>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Vistoria geral e emissão do termo de recebimento definitivo.</p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

// --- 3. SUB MEDIÇÕES ---
function SubMedicoes({ currentSol, onUpdate }: { currentSol: Solicitacao | null; onUpdate: (sol: Solicitacao) => void }) {
  const [valorM, setValorM] = useState('');
  const [porcentagemM, setPorcentagemM] = useState('');
  const [descricaoM, setDescricaoM] = useState('');

  if (!currentSol) return <NoObraSelected />;

  const sumMedicoes = currentSol.medicoes?.reduce((sum, m) => sum + m.valor, 0) || 0;
  const originalBudget = currentSol.valorPlanilha || currentSol.valorHomologadoContratacao || 1;
  const leftOver = originalBudget - sumMedicoes;
  const percentTotal = (sumMedicoes / originalBudget) * 100;

  const registrarNovaMedicao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valorM || !descricaoM) return;

    const v = parseFloat(valorM);
    const p = porcentagemM ? parseFloat(porcentagemM) : (v / originalBudget) * 100;

    const novaM: Medicao = {
      id: `med_${Date.now()}`,
      data: new Date().toISOString().split('T')[0],
      valor: v,
      porcentagem: p,
      descricao: descricaoM,
      empresaNome: currentSol.empresaContratada || 'Construtora Convencionada',
      empresaCnpj: currentSol.cnpjEmpresa || '01.242.000/0001-33'
    };

    const updated = {
      ...currentSol,
      medicoes: [novaM, ...(currentSol.medicoes || [])]
    };

    onUpdate(updated);
    setValorM('');
    setPorcentagemM('');
    setDescricaoM('');
  };

  const deletarMedicao = (id: string) => {
    const updated = {
      ...currentSol,
      medicoes: currentSol.medicoes.filter(m => m.id !== id)
    };
    onUpdate(updated);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Visual representation gauges */}
      <div className="lg:col-span-2 space-y-4">
        
        {/* Progress bar visual cards */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-2 mb-4">
            <Layers className="w-4 h-4 text-emerald-500" /> Relatório Físico-Financeiro das Medições
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Total do Contrato</span>
              <span className="text-sm font-black text-slate-800 font-mono block mt-0.5">
                R$ {originalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-3 bg-emerald-50/50 border border-emerald-200/40 rounded-xl">
              <span className="text-[9px] uppercase font-bold text-emerald-600 block">Total Medido</span>
              <span className="text-sm font-black text-emerald-700 font-mono block mt-0.5">
                R$ {sumMedicoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-3 bg-indigo-50/50 border border-indigo-200/40 rounded-xl col-span-2 sm:col-span-1">
              <span className="text-[9px] uppercase font-bold text-indigo-600 block">Saldo Contratual</span>
              <span className="text-sm font-black text-indigo-700 font-mono block mt-0.5">
                R$ {leftOver.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Measurements List */}
          <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Histórico de Medições Efetuadas</h4>
          
          {currentSol.medicoes && currentSol.medicoes.length > 0 ? (
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {currentSol.medicoes.map(m => (
                <div key={m.id} className="bg-slate-55 p-3 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                  <div className="text-left font-sans">
                    <p className="font-bold text-slate-700">{m.descricao}</p>
                    <span className="text-[10px] text-slate-400 block font-mono">Pago em {m.data} • Resp: {m.empresaNome || 'Construtora'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-extrabold text-emerald-600 font-mono">R$ {m.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <span className="text-[10px] text-slate-500 font-bold block">{m.porcentagem.toFixed(1)}%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => deletarMedicao(m.id)}
                      className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors cursor-pointer"
                      title="Excluir medição"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl text-slate-450 text-[11px]">
              Nenhuma medição física homologada no momento. Registre a primeira medição ao lado.
            </div>
          )}
        </div>

      </div>

      {/* Register / update medicao */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5 mb-4">
          <Plus className="w-4 h-4 text-emerald-500" /> Registrar Medição
        </h3>

        <form onSubmit={registrarNovaMedicao} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Descrição / Etapa Concluída*</label>
            <input
              id="med-desc-input"
              type="text"
              required
              placeholder="Ex: 1ª Medição Físico-Financeira: Fundação e Pilares"
              value={descricaoM}
              onChange={(e) => setDescricaoM(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Valor Medido (R$)*</label>
              <input
                id="med-valor-input"
                type="number"
                required
                placeholder="45000"
                value={valorM}
                onChange={(e) => setValorM(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Porcentagem (%)</label>
              <input
                id="med-porc-input"
                type="number"
                placeholder="OPCIONAL (Ex: 12.5)"
                value={porcentagemM}
                onChange={(e) => setPorcentagemM(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Simple helper calculations */}
          {valorM && (
            <div className="bg-slate-50 p-3 rounded-lg text-[10px] font-mono shadow-inner text-slate-600 block">
              Simulação de Impacto: <br />
              - Avanço correspondente: <strong className="text-blue-600">{((parseFloat(valorM) / originalBudget) * 100).toFixed(2)}%</strong> <br />
              - Novo acumulado: <strong className="text-emerald-600">{(((sumMedicoes + parseFloat(valorM)) / originalBudget) * 100).toFixed(2)}%</strong>
            </div>
          )}

          <button
            id="sub-medicao-nova-btn"
            type="submit"
            className="w-full py-2.5 text-xs text-white font-black uppercase bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer transition-colors"
          >
            Validar e Homologar Medição
          </button>
        </form>
      </div>

    </div>
  );
}

// --- 4. SUB CONTRATOS ---
function SubContratos({ currentSol, onUpdate }: { currentSol: Solicitacao | null; onUpdate: (sol: Solicitacao) => void }) {
  const [empresaInput, setEmpresaInput] = useState(() => currentSol?.empresaContratada || '');
  const [cnpjInput, setCnpjInput] = useState(() => currentSol?.cnpjEmpresa || '');
  const [statusContratoInput, setStatusContratoInput] = useState<'Ativa' | 'Distratada'>(() => currentSol?.statusContratoEmpresa || 'Ativa');
  const [duracaoInput, setDuracaoInput] = useState(() => currentSol?.duracaoObraMeses?.toString() || '6');

  if (!currentSol) return <NoObraSelected />;

  const handleUpdateContrato = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...currentSol,
      empresaContratada: empresaInput,
      cnpjEmpresa: cnpjInput,
      statusContratoEmpresa: statusContratoInput,
      duracaoObraMeses: parseInt(duracaoInput) || 6
    };
    onUpdate(updated);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
      
      {/* Information card view of contract details */}
      <div className="lg:col-span-2 space-y-4">
        
        {/* Dynamic header summary */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-100 pb-2 flex items-center gap-1">
            <ClipboardList className="w-4 h-4 text-slate-500" />
            Dados Vigentes do Contrato de Instalações
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Razão Social Contratada</span>
              <span className="text-xs font-bold text-slate-800 block mt-0.5">{currentSol.empresaContratada || 'Não Informada'}</span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">CNPJ da Empresa</span>
              <span className="text-xs font-bold font-mono text-slate-800 block mt-0.5">{currentSol.cnpjEmpresa || '---'}</span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Vigência Homologada</span>
              <span className="text-xs font-bold text-slate-800 block mt-0.5">
                {currentSol.duracaoObraMeses || '6'} Meses ({currentSol.previsaoTerminoObra || '180 dias corrigidos'})
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Status Jurídico Contratual</span>
              <span className={`text-xs font-black block mt-0.5 ${currentSol.statusContratoEmpresa === 'Distratada' ? 'text-rose-600' : 'text-emerald-600'}`}>
                {currentSol.statusContratoEmpresa || 'Ativa'}
              </span>
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
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs ">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5 mb-4">
          <Edit className="w-4 h-4 text-blue-500" /> Atualizar Proprietário do Contrato
        </h3>

        <form onSubmit={handleUpdateContrato} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Razão Social Contratada*</label>
            <input
              id="contrato-empresa-input"
              type="text"
              required
              value={empresaInput}
              onChange={(e) => setEmpresaInput(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">CNPJ do Responsável da Obra*</label>
            <input
              id="contrato-cnpj-input"
              type="text"
              required
              value={cnpjInput}
              onChange={(e) => setCnpjInput(e.target.value)}
              className="w-full text-xs font-mono p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Duração Obra (Meses)</label>
              <input
                id="contrato-duracao-input"
                type="number"
                value={duracaoInput}
                onChange={(e) => setDuracaoInput(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Status Contrato</label>
              <select
                id="contrato-status-select"
                value={statusContratoInput}
                onChange={(e) => setStatusContratoInput(e.target.value as any)}
                className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 focus:outline-hidden"
              >
                <option value="Ativa">Ativa</option>
                <option value="Distratada">Distratada</option>
              </select>
            </div>
          </div>

          <button
            id="contrato-save-btn"
            type="submit"
            className="w-full py-2.5 text-xs text-white font-black uppercase bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer transition-colors"
          >
            Salvar Alteração Contratual
          </button>
        </form>
      </div>

    </div>
  );
}

// --- 5. SUB ADITIVOS ---
function SubAditivos({ currentSol, onUpdate }: { currentSol: Solicitacao | null; onUpdate: (sol: Solicitacao) => void }) {
  const [tipoA, setTipoA] = useState<'Valor' | 'Prazo' | 'Valor e Prazo'>('Valor');
  const [valorExtra, setValorExtra] = useState('');
  const [prazoExtra, setPrazoExtra] = useState('');
  const [justificativaA, setJustificativaA] = useState('');

  if (!currentSol) return <NoObraSelected />;

  const submitAditivo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!justificativaA) return;

    const novoAditivo: Aditivo = {
      id: `adt_${Date.now()}`,
      data: new Date().toISOString().split('T')[0],
      tipo: tipoA,
      valorExtra: valorExtra ? parseFloat(valorExtra) : undefined,
      prazoExtraDias: prazoExtra ? parseInt(prazoExtra) : undefined,
      justificativa: justificativaA,
      status: 'Aprovado' // Instantly approved for simple interactive simulation
    };

    // Calculate direct increase on current values
    let updatedValor = currentSol.valorPlanilha || 0;
    if (novoAditivo.valorExtra) {
      updatedValor += novoAditivo.valorExtra;
    }

    const updated = {
      ...currentSol,
      valorPlanilha: updatedValor,
      valorHomologadoContratacao: updatedValor,
      aditivos: [novoAditivo, ...(currentSol.aditivos || [])]
    };

    onUpdate(updated);
    // cleaning state
    setValorExtra('');
    setPrazoExtra('');
    setJustificativaA('');
  };

  const deletarAditivo = (id: string, extVal: number) => {
    const updated = {
      ...currentSol,
      valorPlanilha: (currentSol.valorPlanilha || 0) - extVal,
      aditivos: currentSol.aditivos.filter(a => a.id !== id)
    };
    onUpdate(updated);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
      <div className="lg:col-span-2 space-y-4">
        
        {/* Aditivos list display */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs col-span-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-50 pb-2 flex items-center gap-1">
            <Calculator className="w-4 h-4 text-blue-500" />
            Aditivos & Supressões Homologados no Contrato
          </h3>

          {currentSol.aditivos && currentSol.aditivos.length > 0 ? (
            <div className="space-y-3">
              {currentSol.aditivos.map(adt => (
                <div key={adt.id} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex justify-between items-start text-xs font-sans">
                  <div className="text-left space-y-1">
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-indigo-50 text-indigo-700 uppercase">
                      Aditivo de {adt.tipo}
                    </span>
                    <p className="font-bold text-slate-700 mt-1">{adt.justificativa}</p>
                    <span className="text-[10px] text-slate-400 block font-mono">DORE registrado em {adt.data || '2026-05-28'}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {adt.valorExtra && (
                        <p className="font-black text-emerald-600 font-mono">+ R$ {adt.valorExtra.toLocaleString('pt-BR')}</p>
                      )}
                      {adt.prazoExtraDias && (
                        <p className="font-bold text-blue-600 font-mono">+{adt.prazoExtraDias} dias corridos</p>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold block text-center mt-1">Aprovado</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => deletarAditivo(adt.id, adt.valorExtra || 0)}
                      className="text-slate-400 hover:text-red-500 p-1.5 rounded-md transition-colors"
                      title="Excluir aditivo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl text-slate-400 text-xs">
              Sem aditivos cadastrados para esta obra. Preencha o simulador à direita para cadastrar novos aditivos.
            </div>
          )}
        </div>

      </div>

      {/* Simulator and Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs text-left">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5 mb-4">
          <Plus className="w-4 h-4 text-blue-500" /> Cadastrar Novo Aditivo
        </h3>

        <form onSubmit={submitAditivo} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Tipo de Adição Contratual*</label>
            <select
              id="aditivo-tipo-select"
              value={tipoA}
              onChange={(e) => setTipoA(e.target.value as any)}
              className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 focus:outline-hidden"
            >
              <option value="Valor">De Valor (Acréscimo Financeiro)</option>
              <option value="Prazo">De Prazo (Extensão Temporal)</option>
              <option value="Valor e Prazo">De Valor e Prazo integrado</option>
            </select>
          </div>

          {(tipoA === 'Valor' || tipoA === 'Valor e Prazo') && (
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Valor do Acréscimo (R$)*</label>
              <input
                id="aditivo-valor-input"
                type="number"
                required
                placeholder="Ex. 45000"
                value={valorExtra}
                onChange={(e) => setValorExtra(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden"
              />
            </div>
          )}

          {(tipoA === 'Prazo' || tipoA === 'Valor e Prazo') && (
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Prazo Prorrogado (Dias)</label>
              <input
                id="aditivo-prazo-input"
                type="number"
                placeholder="Ex: 90"
                value={prazoExtra}
                onChange={(e) => setPrazoExtra(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden"
              />
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Justificativa do Aditivo técnico*</label>
            <textarea
              id="aditivo-justificativa-input"
              required
              rows={3}
              placeholder="Justificativa legal e alteração de projeto por necessidade de reforço estrutural não previsto em planilhas base."
              value={justificativaA}
              onChange={(e) => setJustificativaA(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden"
            />
          </div>

          <button
            id="aditivo-submit-btn"
            type="submit"
            className="w-full py-2.5 text-xs text-white font-black uppercase bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer transition-colors"
          >
            Homologar Aditivo SGO
          </button>
        </form>
      </div>

    </div>
  );
}

// --- 6. SUB AJUSTE FILIAL ---
function SubAjustes({ currentSol, onUpdate }: { currentSol: Solicitacao | null; onUpdate: (sol: Solicitacao) => void }) {
  const [tipoAjuste, setTipoAjuste] = useState<'sem_alteracao_meta' | 'com_alteracao_meta' | 'com_alteracao_meta_projeto' | 'sem_alteracao_meta_com_projeto'>('sem_alteracao_meta');
  const [responsavelP, setResponsavelP] = useState('Guilherme Pereira e Silva');
  const [valorAjusteInp, setValorAjusteInp] = useState('');
  const [observacoesAjuste, setObservacoesAjuste] = useState('');

  if (!currentSol) return <NoObraSelected />;

  const submitAjustePlanilha = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valorAjusteInp) return;

    const novoAjuste: AjustePlanilha = {
      id: `ajust_${Date.now()}`,
      numero: (currentSol.ajustes?.length || 0) + 1,
      tipoAjuste: tipoAjuste,
      valorAjuste: parseFloat(valorAjusteInp),
      responsavelPlanilha: responsavelP,
      registroProfissional: 'CREA 21458/D',
      ajusteReferente: 'atendimento_inicial',
      valorContrato: currentSol.valorPlanilha || 400000,
      diferencaPlanilhas: 0,
      desconto: 0,
      avancoFisico: 0,
      observacoes: observacoesAjuste || 'Remanejamento de dotação orçamentária.',
      dataCriacao: new Date().toISOString().split('T')[0],
      status: 'validado'
    };

    const updated = {
      ...currentSol,
      ajustes: [novoAjuste, ...(currentSol.ajustes || [])]
    };

    onUpdate(updated);
    setValorAjusteInp('');
    setObservacoesAjuste('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
      
      {/* Table view list of adjustments */}
      <div className="lg:col-span-2 space-y-4">
        
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-50 pb-2 flex items-center gap-1">
            <Calculator className="w-4 h-4 text-indigo-550" />
            Ajustes e Remanejamentos de Planilhas de Obra
          </h3>

          {currentSol.ajustes && currentSol.ajustes.length > 0 ? (
            <div className="space-y-3">
              {currentSol.ajustes.map(aju => (
                <div key={aju.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-sans space-y-2">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                    <span className="font-extrabold text-indigo-700 font-mono">Registro Nº {aju.numero}</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-250">
                      Homologado e Validado
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <p><strong>Tipo:</strong> {aju.tipoAjuste}</p>
                    <p className="text-right"><strong>Valor:</strong> <span className="font-bold text-slate-800 font-mono">R$ {aju.valorAjuste.toLocaleString('pt-BR')}</span></p>
                    <p><strong>Responsável:</strong> {aju.responsavelPlanilha}</p>
                    <p className="text-right font-mono text-[10px] text-slate-400">Em {aju.dataCriacao}</p>
                  </div>
                  <p className="text-[10.5px] italic text-slate-500 pt-1 border-t border-dashed border-slate-150">{aju.observacoes}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl text-slate-400 text-xs">
              Sem ajustes de planilha orçamentária cadastrados para esta escola. Preencha o formulário ao lado.
            </div>
          )}
        </div>

      </div>

      {/* Adjust builder form card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs text-left col-span-1">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5 mb-4">
          <Plus className="w-4 h-4 text-indigo-500" /> Registrar Ajuste de Planilha
        </h3>

        <form onSubmit={submitAjustePlanilha} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Tipo de Remanejamento Técnico*</label>
            <select
              id="ajuste-p-select"
              value={tipoAjuste}
              onChange={(e) => setTipoAjuste(e.target.value as any)}
              className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 focus:outline-hidden"
            >
              <option value="sem_alteracao_meta">Sem alteração de meta</option>
              <option value="com_alteracao_meta">Com alteração de meta</option>
              <option value="com_alteracao_meta_projeto">Com alteração de meta e projeto adjacente</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Valor do Ajuste Planilhado (R$)*</label>
            <input
              id="ajuste-valor-p-input"
              type="number"
              required
              placeholder="Ex: 12420.94"
              value={valorAjusteInp}
              onChange={(e) => setValorAjusteInp(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Engenheiro / Responsável Planilha</label>
            <input
              id="ajuste-responsavel-p-input"
              type="text"
              required
              value={responsavelP}
              onChange={(e) => setResponsavelP(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Notas Técnicas Complementares</label>
            <textarea
              id="ajuste-obs-p-input"
              rows={2}
              placeholder="Ex: Remanejamento solicitado para adequação das fundações..."
              value={observacoesAjuste}
              onChange={(e) => setObservacoesAjuste(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden"
            />
          </div>

          <button
            id="ajuste-submit-btn"
            type="submit"
            className="w-full py-2.5 text-xs text-white font-black uppercase bg-indigo-650 hover:bg-indigo-700 rounded-xl cursor-pointer transition-colors"
          >
            Registrar Ajuste Técnico
          </button>
        </form>
      </div>

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
