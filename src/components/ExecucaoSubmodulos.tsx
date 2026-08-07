import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2, HardHat, Layers, ClipboardList, Plus, Calculator, ShieldCheck,
  UploadCloud, LayoutGrid, DollarSign, Calendar, MapPin, Search, CheckCircle,
  Trash2, AlertCircle, Sparkles, User, FileText, ChevronRight, Scale, Clock,
  FileCheck, FileUp, Zap, HelpCircle, History, Info, Trash, RefreshCw, Eye,
  TrendingUp, Edit, ClipboardCheck, Wrench, ArrowRight, Lock, Filter, X,
  BarChart2, Coins, Lightbulb, Download,
} from 'lucide-react';
import { Solicitacao, Medicao, Aditivo, AjustePlanilha, SaldoComplementarItem, ReequilibrioItem, PerfilUsuario, EmpresaSeguranca, UsuarioSistema, DocumentoChecklist, ParcelaPAF, computeStatusObra, montarChecklistGED } from '../types';
import { supabase } from '../lib/supabase';
import { useEscolas } from '../hooks/useEscolas';

interface ExecucaoSubmodulosProps {
  activeSubTask: string;
  solicitacoes: Solicitacao[];
  onUpdate: (updated: Solicitacao) => void;
  perfilUsuario: PerfilUsuario;
  somenteLeitura?: boolean;
  onSelect: (sol: Solicitacao) => void;
  empresasSeguranca?: EmpresaSeguranca[];
  usuariosSeguranca?: UsuarioSistema[];
  setActiveSubTask?: (subTask: string) => void;
}

export default function ExecucaoSubmodulos({
  activeSubTask,
  solicitacoes,
  onUpdate,
  perfilUsuario,
  somenteLeitura = false,
  onSelect,
  empresasSeguranca = [],
  usuariosSeguranca = [],
  setActiveSubTask
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

  // Modal de seleção de obra
  const [modalObraAberto, setModalObraAberto] = useState(false);
  const [modalBusca, setModalBusca] = useState('');
  const [modalFiltroId, setModalFiltroId] = useState('');
  const [modalFiltroCodesc, setModalFiltroCodesc] = useState('Todos');
  const [modalFiltroMunicipio, setModalFiltroMunicipio] = useState('Todos');
  const [modalFiltroSre, setModalFiltroSre] = useState('Todos');
  const [modalFiltroEscola, setModalFiltroEscola] = useState('Todos');
  const [modalFiltroFiscal, setModalFiltroFiscal] = useState('Não Definido');
  const [modalFiltroStatus, setModalFiltroStatus] = useState('Todos');

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

  const hasContract = useMemo(() => {
    if (!selectedSol) return false;
    return !!selectedSol.contratoValorInicial && !!selectedSol.contratoDataAssinatura;
  }, [selectedSol]);

  const renderBlockedScreen = () => {
    const schoolName = selectedSol?.nomeEscola || 'Obra Selecionada';
    return (
      <div id="contract-required-lock-gate" className="bg-white rounded-2xl border border-rose-200 p-8 shadow-sm text-center max-w-2xl mx-auto my-8 space-y-5">
        <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600 animate-pulse">
          <Lock className="w-8 h-8 text-rose-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-base font-bold text-slate-800 font-sans flex items-center justify-center gap-1.5 font-sans">
            <span>🔒</span>
            <span>Módulo Bloqueado — Contrato Requerido</span>
          </h3>
          <p className="text-xs text-slate-500 font-sans leading-relaxed">
            De acordo com as diretrizes regulamentares da DORE no SGO, após o cadastro inicial de uma obra escolar, o <b>Contrato correspondente deve ser obrigatoriamente registrado</b>.
          </p>
          <p className="text-xs text-slate-500 font-sans leading-relaxed">
            As seções de <b>Medições Físico-Financeiras</b>, <b>Termos Aditivos</b> e <b>Ajustes de Planilha</b> estão bloqueadas para o atendimento abaixo até que o respectivo contrato seja registrado e salvo.
          </p>
          <div className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 font-mono inline-block">
            Obra sob Foco: <b className="text-slate-800">{schoolName}</b>
          </div>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setActiveSubTask && setActiveSubTask('execucao_contratos')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition duration-150 flex items-center gap-1.5 mx-auto cursor-pointer shadow-3xs"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>👉 Ir para Gestão de Contratos de Obra</span>
          </button>
        </div>
      </div>
    );
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

        {/* Obra sob Foco — trigger button */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-sans">
            {selectedSol ? (
              <>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Obra sob Foco:</span>
                <span className="font-black text-slate-800">{selectedSol.nomeEscola}</span>
                <span className="text-slate-400">•</span>
                <span className="font-mono text-blue-700 font-bold">{selectedSol.id}</span>
                <span className="text-slate-400 hidden sm:inline">•</span>
                <span className="text-slate-500 hidden sm:inline">{selectedSol.municipio} • {selectedSol.sre}</span>
              </>
            ) : (
              <span className="text-slate-400 italic">Nenhuma obra selecionada</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setModalObraAberto(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#13264d] hover:bg-[#1a3a6e] text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-sm shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
            Alterar Obra Focada
            <span className="bg-blue-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{execSols.length}</span>
          </button>
        </div>

        {/* MODAL SELEÇÃO DE OBRA */}
        {modalObraAberto && (() => {
          const municipios = ['Todos', ...Array.from(new Set(execSols.map(s => s.municipio)))];
          const sres = ['Todos', ...Array.from(new Set(execSols.map(s => s.sre)))];
          const escolas = ['Todos', ...execSols.map(s => s.nomeEscola)];
          const fiscais = ['Não Definido', ...Array.from(new Set(execSols.map(s => s.fiscalObraAtribuido).filter(Boolean) as string[]))];
          const statusOpts = ['Todos', 'Em cadastramento da obra', 'Em processo de contratação', 'Não iniciada', 'Em execução', 'Paralisada', 'Concluída'];

          const obrasFiltradas = execSols.filter(s => {
            const q = modalBusca.toLowerCase();
            const matchBusca = !modalBusca || s.nomeEscola.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.municipio.toLowerCase().includes(q) || s.codesc.includes(q);
            const matchId = !modalFiltroId || s.id === modalFiltroId;
            const matchCodesc = modalFiltroCodesc === 'Todos' || s.codesc === modalFiltroCodesc;
            const matchMun = modalFiltroMunicipio === 'Todos' || s.municipio === modalFiltroMunicipio;
            const matchSre = modalFiltroSre === 'Todos' || s.sre === modalFiltroSre;
            const matchEscola = modalFiltroEscola === 'Todos' || s.nomeEscola === modalFiltroEscola;
            const matchFiscal = modalFiltroFiscal === 'Não Definido' || s.fiscalObraAtribuido === modalFiltroFiscal;
            const matchStatus = modalFiltroStatus === 'Todos' || computeStatusObra(s).label === modalFiltroStatus;
            return matchBusca && matchId && matchCodesc && matchMun && matchSre && matchEscola && matchFiscal && matchStatus;
          });

          const limparFiltros = () => {
            setModalFiltroId('');
            setModalFiltroCodesc('Todos');
            setModalFiltroMunicipio('Todos');
            setModalFiltroSre('Todos');
            setModalFiltroEscola('Todos');
            setModalFiltroFiscal('Não Definido');
            setModalFiltroStatus('Todos');
            setModalBusca('');
          };

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setModalObraAberto(false)} />
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden">

                {/* Modal header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">Mudar Escola em Foco</h2>
                  </div>
                  <button onClick={() => setModalObraAberto(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition text-slate-500 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="px-5 py-3 overflow-y-auto flex-1 space-y-4">
                  <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
                    Selecione outra escola aplicando filtros de pesquisa abaixo. As alterações feitas serão preservadas em seu ambiente de trabalho.
                  </p>

                  {/* Filters */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Filter className="w-3 h-3 text-blue-500" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">Filtros de Pesquisa</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">ID de Obra</label>
                        <select value={modalFiltroId} onChange={e => setModalFiltroId(e.target.value)} className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-white font-sans">
                          <option value="">Todos</option>
                          {execSols.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">CODESC</label>
                        <select value={modalFiltroCodesc} onChange={e => setModalFiltroCodesc(e.target.value)} className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-white font-sans">
                          {['Todos', ...Array.from(new Set(execSols.map(s => s.codesc)))].map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Município</label>
                        <select value={modalFiltroMunicipio} onChange={e => setModalFiltroMunicipio(e.target.value)} className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-white font-sans">
                          {municipios.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Regional (SRE)</label>
                        <select value={modalFiltroSre} onChange={e => setModalFiltroSre(e.target.value)} className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-white font-sans">
                          {sres.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Escola</label>
                        <select value={modalFiltroEscola} onChange={e => setModalFiltroEscola(e.target.value)} className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-white font-sans">
                          {escolas.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Responsável (Fiscal)</label>
                        <select value={modalFiltroFiscal} onChange={e => setModalFiltroFiscal(e.target.value)} className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-white font-sans">
                          {fiscais.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Status</label>
                        <select value={modalFiltroStatus} onChange={e => setModalFiltroStatus(e.target.value)} className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-white font-sans">
                          {statusOpts.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                    </div>

                    <button onClick={limparFiltros} className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 font-bold ml-auto cursor-pointer transition">
                      <RefreshCw className="w-3 h-3" /> Limpar Filtros
                    </button>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Busca rápida por palavra-chave..."
                      value={modalBusca}
                      onChange={e => setModalBusca(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 font-sans"
                    />
                  </div>

                  {/* Results */}
                  <div className="space-y-2">
                    {obrasFiltradas.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 font-sans">
                        Nenhuma obra encontrada com os filtros aplicados.
                      </div>
                    ) : obrasFiltradas.map(sol => {
                      const isSelecionada = sol.id === selectedSolId;
                      const statusInfo = computeStatusObra(sol);
                      return (
                        <button
                          key={sol.id}
                          type="button"
                          onClick={() => {
                            setSelectedSolId(sol.id);
                            setModalObraAberto(false);
                          }}
                          className={`w-full text-left px-4 py-3 rounded-xl border transition-all cursor-pointer ${
                            isSelecionada
                              ? 'border-blue-400 bg-blue-50 shadow-sm'
                              : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/70'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className={`text-xs font-black leading-tight ${isSelecionada ? 'text-blue-800' : 'text-slate-800'}`}>{sol.nomeEscola}</p>
                              <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                                {sol.municipio} • {sol.sre} • CODESC {sol.codesc}
                              </p>
                            </div>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border shrink-0 ${statusInfo.badgeClass}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                          {isSelecionada && (
                            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-blue-600 font-bold">
                              <CheckCircle className="w-3 h-3" /> Em foco
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Modal footer */}
                <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <span className="text-[10px] text-slate-400 font-sans">
                    Exibindo {obrasFiltradas.length} {obrasFiltradas.length === 1 ? 'escola' : 'escolas'} pós-PAF
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalObraAberto(false)}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 hover:text-slate-800 transition cursor-pointer"
                  >
                    <LayoutGrid className="w-3 h-3" />
                    Voltar para Painel Mestre
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
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
          setActiveSubTask={setActiveSubTask}
          usuariosSeguranca={usuariosSeguranca}
          somenteLeitura={somenteLeitura}
          perfilUsuario={perfilUsuario}
        />
      )}

      {/* 2. ACOMPANHAMENTO DE EXECUÇÃO */}
      {activeSubTask === 'execucao_acompanhamento' && (
        <SubAcompanhamento
          currentSol={selectedSol}
          onUpdate={handlePropagateUpdate}
          somenteLeitura={somenteLeitura}
        />
      )}

      {/* 3. MEDIÇÕES */}
      {activeSubTask === 'execucao_medicoes' && (
        hasContract ? (
          <SubMedicoes
            currentSol={selectedSol}
            onUpdate={handlePropagateUpdate}
            somenteLeitura={somenteLeitura}
          />
        ) : renderBlockedScreen()
      )}

      {/* 4. CONTRATOS */}
      {activeSubTask === 'execucao_contratos' && (
        <SubContratos
          currentSol={selectedSol}
          onUpdate={handlePropagateUpdate}
          empresasSeguranca={empresasSeguranca}
          todasSolicitacoes={solicitacoes}
          selectedSolId={selectedSolId}
          setSelectedSolId={setSelectedSolId}
          somenteLeitura={somenteLeitura}
        />
      )}

      {/* 5. ADITIVOS */}
      {activeSubTask === 'execucao_aditivos' && (
        hasContract ? (
          <SubAditivos
            currentSol={selectedSol}
            onUpdate={handlePropagateUpdate}
            somenteLeitura={somenteLeitura}
          />
        ) : renderBlockedScreen()
      )}

      {/* 6. AJUSTE */}
      {activeSubTask === 'execucao_ajustes' && (
        hasContract ? (
          <SubAjustes
            currentSol={selectedSol}
            onUpdate={handlePropagateUpdate}
            usuariosSeguranca={usuariosSeguranca}
            somenteLeitura={somenteLeitura}
          />
        ) : renderBlockedScreen()
      )}

      {/* 7. FISCALIZAÇÃO */}
      {activeSubTask === 'execucao_fiscalizacao' && (
        <SubFiscalizacao
          currentSol={selectedSol}
          onUpdate={handlePropagateUpdate}
          solicitacoes={solicitacoes}
          usuariosSeguranca={usuariosSeguranca}
          somenteLeitura={somenteLeitura}
          perfilUsuario={perfilUsuario}
        />
      )}

      {/* 7b. REEQUILÍBRIO FINANCEIRO */}
      {activeSubTask === 'execucao_reequilibrio' && (
        hasContract ? (
          <SubReequilibrio currentSol={selectedSol} onUpdate={handlePropagateUpdate} somenteLeitura={somenteLeitura} />
        ) : renderBlockedScreen()
      )}

      {/* 7c. SALDO COMPLEMENTAR OBRA DISTRATADA */}
      {activeSubTask === 'execucao_saldo_complementar' && (
        hasContract ? (
          <SubSaldoComplementar
            currentSol={selectedSol}
            onUpdate={handlePropagateUpdate}
            somenteLeitura={somenteLeitura}
          />
        ) : renderBlockedScreen()
      )}

      {/* 8. DOCUMENTOS */}
      {activeSubTask === 'execucao_documentos' && (
        <SubDocumentos
          currentSol={selectedSol}
          onUpdate={handlePropagateUpdate}
          somenteLeitura={somenteLeitura}
        />
      )}

    </div>
  );
}

// ==========================================================
// SUBMODULES COMPONENT IMPLEMENTATIONS
// ==========================================================

// --- HELPER TO CALCULATE ALLOCATION POINTS FOR FISCAL ENGINEERS ---
export function getFiscalPoints(fiscalName: string, allSolicitacoes: Solicitacao[]): number {
  if (!fiscalName) return 0;
  // Filter active works in execution/started assigned to this fiscal
  const activeWorks = allSolicitacoes.filter(
    s => (s.etapaAtual === 'execucao' || s.etapaAtual === 'ordem_inicio') && 
         s.fiscalObraAtribuido === fiscalName
  );
  
  return activeWorks.reduce((acc, s) => {
    const cls = (s.classeObra || '').toUpperCase().trim();
    if (cls === 'IV' || cls.includes('SPECIAL') || cls.includes('MUITO ALTA') || cls === 'CLASSE IV' || cls.includes('CLASSE 4')) {
      return acc + 4;
    }
    if (cls === 'III' || cls.includes('GRANDE') || cls === 'CLASSE III' || cls.includes('CLASSE 3')) {
      return acc + 3;
    }
    if (cls === 'II' || cls.includes('MÉDIO') || cls.includes('MEDIO') || cls === 'CLASSE II' || cls.includes('CLASSE 2')) {
      return acc + 2;
    }
    // Default to 1 point for Class I, Pequeno Porte, or undefined
    return acc + 1;
  }, 0);
}

// --- 1. SUB CADASTRO DE OBRAS ---
function SubCadastro({ solicitacoes, todasSolicitacoes, currentSol, onUpdate, onSelect, setFocoObra, setActiveSubTask, usuariosSeguranca = [], somenteLeitura = false, perfilUsuario }: {
  solicitacoes: Solicitacao[];
  todasSolicitacoes: Solicitacao[];
  currentSol: Solicitacao | null;
  onUpdate: (sol: Solicitacao) => void;
  onSelect: (sol: Solicitacao) => void;
  setFocoObra: (id: string) => void;
  setActiveSubTask?: (subTask: string) => void;
  usuariosSeguranca?: UsuarioSistema[];
  somenteLeitura?: boolean;
  perfilUsuario?: PerfilUsuario;
}) {
  // Só o coordenador regional (ou gestor_paf/admin) pode atribuir/reatribuir o fiscal de obra — o técnico não pode mais se autoatribuir.
  const podeAtribuirFiscal = perfilUsuario === 'coordenador_regional' || perfilUsuario === 'gestor_paf' || (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore');

  const [showNovoForm, setShowNovoForm] = useState(false);
  
  // Estados para Filtros de Pesquisa Avançados
  const [filtroIdObra, setFiltroIdObra] = useState('todos');
  const [filtroCodescObra, setFiltroCodescObra] = useState('todos');
  const [filtroMunicipioObra, setFiltroMunicipioObra] = useState('todos');
  const [filtroSreObra, setFiltroSreObra] = useState('todos');
  const [filtroEscolaObra, setFiltroEscolaObra] = useState('todos');
  const [filtroResponsavelObra, setFiltroResponsavelObra] = useState('todos');
  const [filtroStatusObra, setFiltroStatusObra] = useState('todos');

  // Reatribuir Fiscal
  const [reatribuirFiscalSolId, setReatribuirFiscalSolId] = useState<string | null>(null);
  const [novoFiscalSelecionado, setNovoFiscalSelecionado] = useState('');

  // Filtragem inicial: somente processos que passaram do status de geração de PAF
  const listProcessosObra = useMemo(() => {
    return todasSolicitacoes.filter(s => 
      s.etapaAtual === 'ordem_inicio' || s.etapaAtual === 'execucao' || !!s.numeroPAF
    );
  }, [todasSolicitacoes]);

  // Opções exclusivas extraídas dos processos qualificados
  const uniqueIds = useMemo(() => Array.from(new Set(listProcessosObra.map(s => s.id).filter(Boolean))).sort(), [listProcessosObra]);
  const uniqueCodescs = useMemo(() => Array.from(new Set(listProcessosObra.map(s => s.codesc).filter(Boolean))).sort(), [listProcessosObra]);
  const uniqueMunicipios = useMemo(() => Array.from(new Set(listProcessosObra.map(s => s.municipio).filter(Boolean))).sort(), [listProcessosObra]);
  const uniqueSres = useMemo(() => Array.from(new Set(listProcessosObra.map(s => s.sre).filter(Boolean))).sort(), [listProcessosObra]);
  const uniqueEscolas = useMemo(() => Array.from(new Set(listProcessosObra.map(s => s.nomeEscola).filter(Boolean))).sort(), [listProcessosObra]);
  const uniqueResponsaveis = useMemo(() => Array.from(new Set(listProcessosObra.map(s => s.fiscalObraAtribuido || 'Não Definido').filter(Boolean))).sort(), [listProcessosObra]);

  const getObraComputedStatus = (s: Solicitacao) => {
    if (s.statusObra === 'Concluída') return 'Concluída';
    if (s.statusObra === 'Paralisada') return 'Paralisada';
    if (s.statusObra === 'Em Andamento') return 'Em execução';
    if (s.contratoValorInicial && s.contratoDataAssinatura) {
      return 'Em contratação Cadastro do contrato';
    }
    return 'Em processo de contratação';
  };

  const obrasFiltradas = useMemo(() => {
    return listProcessosObra.filter(sol => {
      if (filtroIdObra !== 'todos' && sol.id !== filtroIdObra) return false;
      if (filtroCodescObra !== 'todos' && sol.codesc !== filtroCodescObra) return false;
      if (filtroMunicipioObra !== 'todos' && sol.municipio !== filtroMunicipioObra) return false;
      if (filtroSreObra !== 'todos' && sol.sre !== filtroSreObra) return false;
      if (filtroEscolaObra !== 'todos' && sol.nomeEscola !== filtroEscolaObra) return false;
      
      const resp = sol.fiscalObraAtribuido || 'Não Definido';
      if (filtroResponsavelObra !== 'todos' && resp !== filtroResponsavelObra) return false;
      
      const computedStatus = getObraComputedStatus(sol);
      if (filtroStatusObra !== 'todos' && computedStatus !== filtroStatusObra) return false;
      
      return true;
    });
  }, [listProcessosObra, filtroIdObra, filtroCodescObra, filtroMunicipioObra, filtroSreObra, filtroEscolaObra, filtroResponsavelObra, filtroStatusObra]);
  
  // Selection of approved technical services
  const [vincularExistente, setVincularExistente] = useState(true);
  const [selectedAtendimentoId, setSelectedAtendimentoId] = useState('');

  // Base de escolas/endereços (mesma fonte usada na tela de Atendimento Inicial) para a
  // Identificação Escolar do Cadastro Manual do Zero — substitui os campos digitáveis por listas.
  const { escolas, enderecos, carregando: carregandoEscolas } = useEscolas();

  // Form states - Technical & Administrative info
  const [escolaInput, setEscolaInput] = useState('');
  const [codEscInput, setCodEscInput] = useState('');
  const [municipioInput, setMunicipioInput] = useState('');
  const [sreInput, setSreInput] = useState('');
  const [codigoEnderecoInput, setCodigoEnderecoInput] = useState('');
  const [valorInput, setValorInput] = useState('');
  const [tipoObraInput, setTipoObraInput] = useState('REFORMA');

  // Opções de SRE/Município respeitando o nível já escolhido acima (SRE > Município > Escola > Endereço)
  const sresDisponiveis = useMemo(() => [...new Set(escolas.map(item => item.sre))].sort(), [escolas]);
  const municipiosDisponiveis = useMemo(() => [...new Set(
    (sreInput ? escolas.filter(item => item.sre === sreInput) : escolas).map(item => item.municipio)
  )].sort(), [escolas, sreInput]);

  // Escolas visíveis nos seletores de CODESC/Nome, restritas à SRE e ao Município já escolhidos
  const escolasNoFiltroCadastro = useMemo(() => escolas.filter(item =>
    (!sreInput || item.sre === sreInput) && (!municipioInput || item.municipio === municipioInput)
  ), [escolas, sreInput, municipioInput]);

  // Endereços disponíveis: restritos ao CODESC já escolhido, ou às escolas do filtro de SRE/Município
  const enderecosParaSelecaoCadastro = useMemo(() => (codEscInput
    ? enderecos.filter(e => e.codesc === codEscInput)
    : enderecos.filter(e => escolasNoFiltroCadastro.some(item => item.codesc === e.codesc))
  ).sort((a, b) => {
    const na = Number(a.codigoEndereco);
    const nb = Number(b.codigoEndereco);
    return !Number.isNaN(na) && !Number.isNaN(nb) ? na - nb : a.codigoEndereco.localeCompare(b.codigoEndereco);
  }), [codEscInput, enderecos, escolasNoFiltroCadastro]);

  // Preenche município/SRE a partir de uma escola já resolvida
  const aplicarEscolaCadastro = (match?: { municipio: string; sre: string }) => {
    setMunicipioInput(match?.municipio || '');
    setSreInput(match?.sre || '');
  };

  const selecionarPorSreCadastro = (val: string) => {
    setSreInput(val);
    setMunicipioInput('');
    setCodEscInput('');
    setEscolaInput('');
    setCodigoEnderecoInput('');
  };

  const selecionarPorMunicipioCadastro = (val: string) => {
    setMunicipioInput(val);
    setCodEscInput('');
    setEscolaInput('');
    setCodigoEnderecoInput('');
    const match = escolas.find(item => item.municipio === val);
    setSreInput(match?.sre || '');
  };

  const selecionarPorCodescCadastro = (val: string) => {
    setCodEscInput(val);
    setCodigoEnderecoInput('');
    const match = escolasNoFiltroCadastro.find(item => item.codesc === val) || escolas.find(item => item.codesc === val);
    setEscolaInput(match?.nome || '');
    aplicarEscolaCadastro(match);
  };

  const selecionarPorNomeEscolaCadastro = (val: string) => {
    setEscolaInput(val);
    setCodigoEnderecoInput('');
    const match = escolasNoFiltroCadastro.find(item => item.nome === val) || escolas.find(item => item.nome === val);
    setCodEscInput(match?.codesc || '');
    aplicarEscolaCadastro(match);
  };

  const selecionarPorCodigoEnderecoCadastro = (val: string) => {
    setCodigoEnderecoInput(val);
    const enderecoMatch = enderecosParaSelecaoCadastro.find(e => e.codigoEndereco === val);
    const escolaMatch = enderecoMatch ? escolas.find(item => item.codesc === enderecoMatch.codesc) : undefined;
    setCodEscInput(enderecoMatch?.codesc || '');
    setEscolaInput(escolaMatch?.nome || '');
    aplicarEscolaCadastro(escolaMatch);
  };
  
  // Complementary Obra fields
  const [classeObra, setClasseObra] = useState('Pequeno Porte');
  const [pontuacaoComplexidade, setPontuacaoComplexidade] = useState(2);
  const [fiscalObraAtribuido, setFiscalObraAtribuido] = useState('');
  const [empresaInput, setEmpresaInput] = useState('');
  const [cnpjInput, setCnpjInput] = useState('');
  const [valorHomologadoInput, setValorHomologadoInput] = useState('');

  // PAF do processo — obra cadastrada do zero nunca passa pela geração de PAF da Análise DORE
  // (SolicitacaoDetalhes), então esses dados precisam ser capturados aqui. Mesmo modelo de
  // parcelasPAF/statusPAF usado lá, para não quebrar o Acompanhamento de PAF.
  const [numeroPAFInput, setNumeroPAFInput] = useState('');
  const [dataHomologacaoInput, setDataHomologacaoInput] = useState(new Date().toISOString().split('T')[0]);
  const [valorLiberadoInput, setValorLiberadoInput] = useState('');
  const [dataLiberacaoInput, setDataLiberacaoInput] = useState(new Date().toISOString().split('T')[0]);

  // Schedule fields
  const [dataInicioInput, setDataInicioInput] = useState('');
  const [duracaoMeses, setDuracaoMeses] = useState('');
  const [dataTerminoInput, setDataTerminoInput] = useState('');

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

  // Filter possible approved services for import - only those that have been authorized and PAF generated
  const atendimentosDisponiveis = useMemo(() => {
    return todasSolicitacoes.filter(
      s => (s.etapaAtual === 'paf' || s.etapaAtual === 'ordem_inicio') && !!s.numeroPAF
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
      setSreInput(selected.sre || '');
      setCodigoEnderecoInput(selected.codigoEndereco || '');
      const val = selected.valorPlanilha || selected.valorHomologado || 0;
      setValorInput(val.toString());
      setValorHomologadoInput(val.toString());
      setEmpresaInput(selected.empresaContratada || '');
      setCnpjInput(selected.cnpjEmpresa || '');
      setTipoObraInput(selected.tipoObra || selected.tipo || 'REFORMA');
    }
  };


  const submitNovaObra = (e: React.FormEvent) => {
    e.preventDefault();
    if (vincularExistente && !selectedAtendimentoId) {
      alert('Selecione um atendimento técnico aprovado para importar.');
      return;
    }
    if (!vincularExistente && (!sreInput || !municipioInput || !codEscInput || !escolaInput)) {
      alert('Selecione a SRE, o Município, o CODESC e a Escola para identificar a unidade de ensino.');
      return;
    }
    if (!vincularExistente && !numeroPAFInput.trim()) {
      alert('Informe o número do PAF deste processo.');
      return;
    }
    if (!vincularExistente && parseFloat(valorLiberadoInput) > 0 && !dataLiberacaoInput) {
      alert('Informe a data de liberação do valor já liberado.');
      return;
    }
    if (!escolaInput || !codEscInput || !valorInput) return;

    const baseVal = parseFloat(valorInput) || 0;
    const finalVal = parseFloat(valorHomologadoInput) || baseVal;
    const fiscalObraAtribuidoId = usuariosSeguranca.find(u => u.nome === fiscalObraAtribuido)?.id;

    // PAF do processo (obra do zero não passa pela geração de PAF da Análise DORE) — o valor já
    // liberado vira a 1ª parcela real de parcelasPAF, com statusPAF derivado do mesmo jeito que
    // salvarPAF em SolicitacaoDetalhes.tsx, para o Acompanhamento de PAF refletir corretamente.
    const valorLiberadoNum = parseFloat(valorLiberadoInput) || 0;
    const parcelasPAFIniciais: ParcelaPAF[] = valorLiberadoNum > 0
      ? [{ id: `parcela_${Date.now()}`, valor: valorLiberadoNum, dataPagamento: dataLiberacaoInput }]
      : [];
    const statusPAFInicial: Solicitacao['statusPAF'] = valorLiberadoNum === 0
      ? 'Aguardando Pagamento'
      : valorLiberadoNum >= baseVal ? 'Pago e Liberado' : 'Pago Parcialmente';

    // Is it based on an existing ticket/request, or creating fresh?
    if (vincularExistente && selectedAtendimentoId) {
      const original = todasSolicitacoes.find(s => s.id === selectedAtendimentoId);
      if (original) {
        const obraAtualizada: Solicitacao = {
          ...original,
          etapaAtual: 'execucao',
          statusObra: 'Não Iniciada',
          cadastroObraConfirmado: true,
          classeObra,
          pontuacaoComplexidade,
          fiscalObraAtribuido,
          fiscalObraAtribuidoId,
          // Preserva empresa/CNPJ/status já existentes no atendimento importado (se houver);
          // não gera fictícios quando o ticket ainda não tem contratação registrada — segue
          // para a aba Contratos como qualquer obra sem contrato.
          ...(empresaInput ? { empresaContratada: empresaInput } : {}),
          ...(cnpjInput ? { cnpjEmpresa: cnpjInput } : {}),
          valorHomologadoContratacao: finalVal,
          valorPlanilha: baseVal,
          duracaoObraMeses: parseInt(duracaoMeses) || 6,
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
        codigoEndereco: codigoEnderecoInput || undefined,
        tipo: tipoObraInput,
        tipoObra: tipoObraInput,
        municipio: municipioInput,
        sre: sreInput,
        dataCriacao: new Date().toISOString().split('T')[0],
        etapaAtual: 'execucao',
        historicoEtapas: [{ etapa: 'execucao', data: new Date().toISOString().split('T')[0], responsavel: 'Gestor Operacional DORE' }],
        valorPlanilha: baseVal,
        valorHomologadoContratacao: finalVal,
        // Empresa/CNPJ/contrato NÃO são definidos aqui — obra nasce sem contratação e segue
        // para a aba Contratos (SubContratos), onde o fiscal registra a empresa real, CNPJ,
        // data de assinatura e vigência. Evita gravar dados fictícios de placeholder.
        classeObra,
        pontuacaoComplexidade,
        fiscalObraAtribuido,
        fiscalObraAtribuidoId,
        duracaoObraMeses: parseInt(duracaoMeses) || 6,
        statusObra: 'Não Iniciada',
        cadastroObraConfirmado: true,
        documentos: [],
        medicoes: [],
        aditivos: [],
        ajustes: [],
        numeroPAF: numeroPAFInput.trim(),
        valorHomologado: baseVal,
        dataHomologacao: dataHomologacaoInput,
        parcelasPAF: parcelasPAFIniciais,
        statusPAF: statusPAFInicial,
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
    setSreInput('');
    setCodigoEnderecoInput('');
    setValorInput('');
    setValorHomologadoInput('');
    setEmpresaInput('');
    setCnpjInput('');
    setNumeroPAFInput('');
    setDataHomologacaoInput(new Date().toISOString().split('T')[0]);
    setValorLiberadoInput('');
    setDataLiberacaoInput(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* Modal Reatribuir Fiscal */}
      {reatribuirFiscalSolId && (() => {
        const targetSol = todasSolicitacoes.find(s => s.id === reatribuirFiscalSolId);
        return (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-500" /> Reatribuir Fiscal de Obra
                </h3>
                <button
                  type="button"
                  onClick={() => setReatribuirFiscalSolId(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-slate-600 space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p><span className="font-bold text-slate-700">Obra:</span> {targetSol?.nomeEscola}</p>
                <p><span className="font-bold text-slate-700">ID:</span> <span className="font-mono text-blue-700">{reatribuirFiscalSolId}</span></p>
                <p>
                  <span className="font-bold text-slate-700">Fiscal Atual: </span>
                  <span className={targetSol?.fiscalObraAtribuido ? 'text-slate-700' : 'text-amber-600 italic'}>
                    {targetSol?.fiscalObraAtribuido || 'Não Definido'}
                  </span>
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
                  Novo Fiscal Responsável *
                </label>
                <select
                  value={novoFiscalSelecionado}
                  onChange={(e) => setNovoFiscalSelecionado(e.target.value)}
                  disabled={!podeAtribuirFiscal}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 font-bold focus:outline-hidden cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <option value="">Selecione o fiscal...</option>
                  {usuariosSeguranca
                    .filter(u => u.perfil === 'tecnico_infra')
                    .map(u => (
                      <option key={u.id} value={u.nome}>
                        {u.nome}
                      </option>
                    ))
                  }
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReatribuirFiscalSolId(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl cursor-pointer transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!podeAtribuirFiscal || !targetSol || !novoFiscalSelecionado) return;
                    const novoFiscalId = usuariosSeguranca.find(u => u.nome === novoFiscalSelecionado)?.id;
                    onUpdate({ ...targetSol, fiscalObraAtribuido: novoFiscalSelecionado, fiscalObraAtribuidoId: novoFiscalId });
                    setReatribuirFiscalSolId(null);
                  }}
                  disabled={!podeAtribuirFiscal}
                  className="px-5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer transition shadow-xs flex items-center gap-1.5 disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Confirmar Reatribuição
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Header toolbar for listing */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-2xl border border-slate-200 gap-3 shadow-3xs">
        <div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <ClipboardCheck className="w-4.5 h-4.5 text-blue-600" />
            Obras Oficializadas (SGO Ativo)
          </h2>
          <p className="text-[10px] text-slate-500">Listagem de Obras com execução técnica em andamento</p>
        </div>
        {!somenteLeitura && (
        <button
          id="btn-registra-obra-obras"
          onClick={() => setShowNovoForm(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs text-white font-bold bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer transition-colors shrink-0 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Oficialmente Obra
        </button>
        )}
      </div>

      {/* Form Wizard - New register as a beautiful modal */}
      {showNovoForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-4 animate-scaleIn">
            <form onSubmit={submitNovaObra} className="space-y-4">
              
              <div className="flex justify-between items-center border-b border-slate-150 pb-3">
                <h3 className="text-[12px] font-black uppercase text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" /> 
                  Oficialização de Novo Cadastro de Obra
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNovoForm(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-extrabold bg-slate-100 hover:bg-slate-200 px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer"
                >
                  ×
                </button>
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
                  setSreInput('');
                  setCodigoEnderecoInput('');
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
                {!vincularExistente && carregandoEscolas && (
                  <span className="text-[10px] text-slate-400 normal-case font-normal ml-1">(carregando escolas...)</span>
                )}
              </h4>

              {/* Identificação Escolar por listas — mesma base e hierarquia (SRE > Município > CODESC/Nome > Endereço) da tela de Atendimento Inicial */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Superintendência Regional (SRE)</label>
                  <select
                    required={!vincularExistente}
                    disabled={vincularExistente}
                    value={sreInput}
                    onChange={(e) => selecionarPorSreCadastro(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 disabled:bg-slate-100/80 text-slate-800 focus:outline-hidden cursor-pointer"
                  >
                    <option value="">Selecione a SRE...</option>
                    {sresDisponiveis.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Município</label>
                  <select
                    required={!vincularExistente}
                    disabled={vincularExistente}
                    value={municipioInput}
                    onChange={(e) => selecionarPorMunicipioCadastro(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 disabled:bg-slate-100/80 text-slate-800 focus:outline-hidden cursor-pointer"
                  >
                    <option value="">Selecione o município...</option>
                    {municipiosDisponiveis.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Código da Escola (CODESC)</label>
                  <select
                    required={!vincularExistente}
                    disabled={vincularExistente}
                    value={codEscInput}
                    onChange={(e) => selecionarPorCodescCadastro(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 disabled:bg-slate-100/80 text-slate-800 font-mono focus:outline-hidden cursor-pointer"
                  >
                    <option value="">Selecione o CODESC...</option>
                    {escolasNoFiltroCadastro.map(item => (
                      <option key={item.codesc} value={item.codesc}>{item.codesc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Nome Completo da Unidade de Ensino</label>
                  <select
                    required={!vincularExistente}
                    disabled={vincularExistente}
                    value={escolaInput}
                    onChange={(e) => selecionarPorNomeEscolaCadastro(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 disabled:bg-slate-100/80 text-slate-800 focus:outline-hidden cursor-pointer"
                  >
                    <option value="">Selecione a escola...</option>
                    {escolasNoFiltroCadastro.map(item => (
                      <option key={item.codesc} value={item.nome}>{item.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Código do Endereço</label>
                  <select
                    disabled={vincularExistente}
                    value={codigoEnderecoInput}
                    onChange={(e) => selecionarPorCodigoEnderecoCadastro(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 disabled:bg-slate-100/80 text-slate-800 font-mono focus:outline-hidden cursor-pointer"
                  >
                    <option value="">Selecione o endereço...</option>
                    {enderecosParaSelecaoCadastro.map(e => (
                      <option key={`${e.codesc}-${e.codigoEndereco}`} value={e.codigoEndereco}>
                        {e.codigoEndereco} — {e.descricao}
                      </option>
                    ))}
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

            {/* PAF do processo — obra do zero não passa pela Geração de PAF da Análise DORE, então
                esses dados precisam ser capturados aqui (mesmo modelo de parcelasPAF/statusPAF). */}
            {!vincularExistente && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-1 pb-1 border-b border-slate-100">
                  <FileCheck className="w-3.5 h-3.5 text-blue-500" />
                  PAF do Processo
                </h4>
                <p className="text-[10.5px] text-slate-500 leading-relaxed">
                  Esta obra não passou pela Geração de PAF da Análise DORE — informe aqui o número do PAF já existente e, se houver, o valor já liberado até o momento deste cadastro.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Número do PAF *</label>
                    <input
                      type="text"
                      required
                      value={numeroPAFInput}
                      onChange={(e) => setNumeroPAFInput(e.target.value)}
                      placeholder="Ex: PAF-5510-2026"
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 font-mono font-bold focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Data de Homologação do PAF</label>
                    <input
                      type="date"
                      value={dataHomologacaoInput}
                      onChange={(e) => setDataHomologacaoInput(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Valor Já Liberado (R$)</label>
                    <input
                      type="number"
                      value={valorLiberadoInput}
                      onChange={(e) => setValorLiberadoInput(e.target.value)}
                      placeholder="Ex: 150000 (deixe em branco se nada foi liberado ainda)"
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 font-mono font-bold focus:outline-hidden text-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">
                      Data de Liberação {parseFloat(valorLiberadoInput) > 0 && '*'}
                    </label>
                    <input
                      type="date"
                      required={parseFloat(valorLiberadoInput) > 0}
                      disabled={!(parseFloat(valorLiberadoInput) > 0)}
                      value={dataLiberacaoInput}
                      onChange={(e) => setDataLiberacaoInput(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 disabled:bg-slate-100/80 text-slate-800 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            )}

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

                <div id="wrapper-fiscal-selection" className="col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Definir Fiscal de Acompanhamento Técnico*</label>
                  <select
                    id="select-fiscal-obra"
                    value={fiscalObraAtribuido}
                    onChange={(e) => setFiscalObraAtribuido(e.target.value)}
                    disabled={!podeAtribuirFiscal}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 font-bold focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                    <option value="">Selecione o fiscal...</option>
                    {usuariosSeguranca
                      .filter(u => u.perfil === 'tecnico_infra')
                      .map(u => (
                        <option key={u.id} value={u.nome}>
                          {u.nome}
                        </option>
                      ))
                    }
                  </select>

                  {fiscalObraAtribuido && (() => {
                    const currentPoints = getFiscalPoints(fiscalObraAtribuido, todasSolicitacoes);
                    const incomingPoints = complexidadeCalculada.classe === 'IV' ? 4 : complexidadeCalculada.classe === 'III' ? 3 : complexidadeCalculada.classe === 'II' ? 2 : 1;
                    const totalSimulated = currentPoints + incomingPoints;
                    
                    let isSuperAllocated = totalSimulated > 35;
                    let badgeBg = isSuperAllocated 
                      ? 'bg-rose-50 border-rose-250 text-rose-800' 
                      : totalSimulated >= 25 
                        ? 'bg-amber-50 border-amber-250 text-amber-850' 
                        : 'bg-emerald-50 border-emerald-250 text-emerald-800';
                        
                    let dotColor = isSuperAllocated 
                      ? 'bg-rose-600 animate-ping' 
                      : totalSimulated >= 25 
                        ? 'bg-amber-500' 
                        : 'bg-emerald-500';

                    return (
                      <div id="fiscal-allocation-semaphore-detail" className={`mt-2 p-2.5 rounded-xl border ${badgeBg} text-[10px] transition-all flex flex-col gap-1`}>
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                          <span className="uppercase tracking-wider">
                            {isSuperAllocated ? '🚨 SUPER-ALOCADO (CRÍTICO)' : totalSimulated >= 25 ? '⚠️ ALOCAÇÃO ALTA (ATENÇÃO)' : '✅ ALOCAÇÃO REGULAR (OK)'}
                          </span>
                        </div>
                        <p className="opacity-90">
                          Este fiscal possui <strong>{currentPoints} pontos</strong> alocados em obras ativas. Com esta nova obra (Classe {complexidadeCalculada.classe}, <strong>+{incomingPoints} pts</strong>), passará a tener <strong>{totalSimulated} / 35 pontos</strong> recomendados.
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Schedule metrics - REQUIREMENT CONSTRAINT */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-1 pb-1 border-b border-slate-100">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                Registrar Prazo Previsto
              </h4>

              <p className="text-[10.5px] text-slate-600 leading-relaxed bg-slate-50 border-l-2 border-slate-400 p-2.5 rounded-r-lg">
                ℹ️ <strong>Nota Técnica:</strong> O registro do prazo estimado para a ordem de serviço constitui uma estimativa de prazos a ser calculada e analisada, servindo para determinar e validar a classe de complexidade técnica da obra e estruturar o repasse adequado das diretrizes para a devida contratação da mesma.
              </p>

              <div className="max-w-xs">
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Duração Planejada (Meses)*</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="120"
                  value={duracaoMeses}
                  onChange={(e) => setDuracaoMeses(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-hidden font-bold"
                />
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
          </div>
        </div>
      )}

        {/* Filtros de Pesquisa (Divididos) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs mb-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4.5 h-4.5 text-blue-600" />
              <span className="text-xs font-black uppercase text-slate-700 tracking-wider font-sans">
                Filtros de Pesquisa
              </span>
            </div>
            {(filtroIdObra !== 'todos' || filtroCodescObra !== 'todos' || filtroMunicipioObra !== 'todos' || filtroSreObra !== 'todos' || filtroEscolaObra !== 'todos' || filtroResponsavelObra !== 'todos' || filtroStatusObra !== 'todos') && (
              <button
                type="button"
                onClick={() => {
                  setFiltroIdObra('todos');
                  setFiltroCodescObra('todos');
                  setFiltroMunicipioObra('todos');
                  setFiltroSreObra('todos');
                  setFiltroEscolaObra('todos');
                  setFiltroResponsavelObra('todos');
                  setFiltroStatusObra('todos');
                }}
                className="text-[11px] text-blue-605 hover:text-blue-800 hover:underline font-bold transition duration-150 cursor-pointer"
              >
                Limpar Filtros
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* ID de Obra */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">ID de Obra</label>
              <select
                value={filtroIdObra}
                onChange={(e) => setFiltroIdObra(e.target.value)}
                className="text-[11px] p-2 border border-slate-200 rounded-xl bg-slate-50 hover:bg-white text-slate-800 font-bold focus:outline-hidden cursor-pointer w-full text-ellipsis overflow-hidden"
              >
                <option value="todos">Todos</option>
                {uniqueIds.map(id => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
            </div>
            
            {/* CODESC */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">CODESC</label>
              <select
                value={filtroCodescObra}
                onChange={(e) => setFiltroCodescObra(e.target.value)}
                className="text-[11px] p-2 border border-slate-200 rounded-xl bg-slate-50 hover:bg-white text-slate-800 font-bold focus:outline-hidden cursor-pointer w-full text-ellipsis overflow-hidden"
              >
                <option value="todos">Todos</option>
                {uniqueCodescs.map(codesc => (
                  <option key={codesc} value={codesc}>{codesc}</option>
                ))}
              </select>
            </div>

            {/* Município */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Município</label>
              <select
                value={filtroMunicipioObra}
                onChange={(e) => setFiltroMunicipioObra(e.target.value)}
                className="text-[11px] p-2 border border-slate-200 rounded-xl bg-slate-50 hover:bg-white text-slate-800 font-bold focus:outline-hidden cursor-pointer w-full text-ellipsis overflow-hidden"
              >
                <option value="todos">Todos</option>
                {uniqueMunicipios.map(muni => (
                  <option key={muni} value={muni}>{muni}</option>
                ))}
              </select>
            </div>

            {/* Regional (SRE) */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Regional (SRE)</label>
              <select
                value={filtroSreObra}
                onChange={(e) => setFiltroSreObra(e.target.value)}
                className="text-[11px] p-2 border border-slate-200 rounded-xl bg-slate-50 hover:bg-white text-slate-800 font-bold focus:outline-hidden cursor-pointer w-full text-ellipsis overflow-hidden"
              >
                <option value="todos">Todos</option>
                {uniqueSres.map(sre => (
                  <option key={sre} value={sre}>{sre}</option>
                ))}
              </select>
            </div>

            {/* Escola */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Escola</label>
              <select
                value={filtroEscolaObra}
                onChange={(e) => setFiltroEscolaObra(e.target.value)}
                className="text-[11px] p-2 border border-slate-200 rounded-xl bg-slate-50 hover:bg-white text-slate-800 font-bold focus:outline-hidden cursor-pointer w-full text-ellipsis overflow-hidden"
              >
                <option value="todos">Todos</option>
                {uniqueEscolas.map(esc => (
                  <option key={esc} value={esc}>{esc}</option>
                ))}
              </select>
            </div>

            {/* Responsável */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Responsável (Fiscal)</label>
              <select
                value={filtroResponsavelObra}
                onChange={(e) => setFiltroResponsavelObra(e.target.value)}
                className="text-[11px] p-2 border border-slate-200 rounded-xl bg-slate-50 hover:bg-white text-slate-800 font-bold focus:outline-hidden cursor-pointer w-full text-ellipsis overflow-hidden"
              >
                <option value="todos">Todos</option>
                {uniqueResponsaveis.map(resp => (
                  <option key={resp} value={resp}>{resp}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Status</label>
              <select
                value={filtroStatusObra}
                onChange={(e) => setFiltroStatusObra(e.target.value)}
                className="text-[11px] p-2 border border-slate-200 rounded-xl bg-slate-50 hover:bg-white text-slate-800 font-bold focus:outline-hidden cursor-pointer w-full text-ellipsis overflow-hidden"
              >
                <option value="todos">Todos</option>
                <option value="Em processo de contratação">Em processo de contratação</option>
                <option value="Em contratação Cadastro do contrato">Em contratação Cadastro do contrato</option>
                <option value="Em execução">Em execução</option>
                <option value="Paralisada">Paralisada</option>
                <option value="Concluída">Concluída</option>
              </select>
            </div>
          </div>
        </div>

        {/* List Table (Modo de Lista) */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-3xs">
          <div className="p-3.5 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-550 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              Relação de Obras Cadastradas ({obrasFiltradas.length})
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/20 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[9px] h-11">
                  <th className="py-2.5 px-4 font-sans font-bold whitespace-nowrap">ID de Obra</th>
                  <th className="py-2.5 px-4 font-sans font-bold whitespace-nowrap">CODESC</th>
                  <th className="py-2.5 px-4 font-sans font-bold whitespace-nowrap">Município</th>
                  <th className="py-2.5 px-4 font-sans font-bold whitespace-nowrap">Regional (SRE)</th>
                  <th className="py-2.5 px-4 font-sans font-bold whitespace-nowrap">Escola</th>
                  <th className="py-2.5 px-4 font-sans font-bold whitespace-nowrap">Responsável</th>
                  <th className="py-2.5 px-4 font-sans font-bold text-center whitespace-nowrap">Status</th>
                  <th className="py-2.5 px-4 font-sans font-bold text-right whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {obrasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400 font-semibold text-xs">
                      Não há nenhuma obra cadastrada que corresponda aos filtros de pesquisa.
                    </td>
                  </tr>
                ) :
                  obrasFiltradas.map(sol => {
                    const computedStatus = getObraComputedStatus(sol);
                    const isFocussed = currentSol?.id === sol.id;

                    return (
                      <tr 
                        key={sol.id} 
                        onClick={() => {
                          setFocoObra(sol.id);
                          if (setActiveSubTask) {
                            setActiveSubTask('execucao_acompanhamento');
                          }
                        }}
                        className={`hover:bg-slate-50/90 transition-all cursor-pointer group ${
                          isFocussed ? 'bg-blue-50/30' : ''
                        }`}
                        title="Clique para ir para o Acompanhamento da Obra"
                      >
                        {/* 1. ID de Obra */}
                        <td className="py-3 px-4 font-mono font-bold text-blue-700 text-[11px] whitespace-nowrap">
                          {sol.id}
                        </td>

                        {/* 2. CODESC */}
                        <td className="py-3 px-4 font-mono text-slate-700 font-semibold text-[11px] whitespace-nowrap">
                          {sol.codesc || '---'}
                        </td>

                        {/* 3. Município */}
                        <td className="py-3 px-4 text-slate-800 font-bold font-sans text-[11.5px] uppercase whitespace-nowrap">
                          {sol.municipio || '---'}
                        </td>

                        {/* 4. Regional (SRE) */}
                        <td className="py-3 px-4 text-slate-500 font-bold font-sans text-[10.5px] uppercase whitespace-nowrap">
                          {sol.sre || '---'}
                        </td>

                        {/* 5. Escola */}
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-slate-800 uppercase text-[11px] leading-tight line-clamp-1 max-w-[180px]">
                            {sol.nomeEscola}
                          </div>
                        </td>

                        {/* 6. Responsável (Fiscal de obra) */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {sol.fiscalObraAtribuido ? (
                            <span className="font-bold text-slate-700 text-xs">
                              {sol.fiscalObraAtribuido}
                            </span>
                          ) : (
                            <span className="text-amber-600 font-medium italic text-[11px]">
                              Não Definido
                            </span>
                          )}
                        </td>

                        {/* 7. Status */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className={`text-[9.5px] font-black px-2.5 py-1.5 rounded-full uppercase tracking-wider inline-block ${
                            computedStatus === 'Em processo de contratação' ? 'bg-blue-50 text-blue-750 border border-blue-200' :
                            computedStatus === 'Em contratação Cadastro do contrato' ? 'bg-purple-50 text-purple-755 border border-purple-200' :
                            computedStatus === 'Em execução' ? 'bg-amber-50 text-amber-705 border border-amber-205' :
                            computedStatus === 'Paralisada' ? 'bg-rose-50 text-rose-705 border border-rose-205' :
                            computedStatus === 'Concluída' ? 'bg-emerald-50 text-emerald-755 border border-emerald-250' :
                            'bg-slate-50 text-slate-500 border border-slate-205'
                          }`}>
                            {computedStatus}
                          </span>
                        </td>

                        {/* 8. Ação */}
                        <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setFocoObra(sol.id)}
                              className="px-2 py-1 text-[9.5px] font-extrabold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer transition"
                            >
                              Focalizar
                            </button>
                            {podeAtribuirFiscal && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReatribuirFiscalSolId(sol.id);
                                  setNovoFiscalSelecionado(sol.fiscalObraAtribuido || '');
                                }}
                                className="px-2 py-1 text-[9.5px] font-extrabold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg cursor-pointer transition"
                              >
                                Reatribuir Fiscal
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setFocoObra(sol.id);
                                if (setActiveSubTask) {
                                  let targetSubTask = 'execucao_acompanhamento';
                                  if (computedStatus === 'Em processo de contratação') {
                                    targetSubTask = 'execucao_cadastro';
                                  } else if (computedStatus === 'Em contratação Cadastro do contrato') {
                                    targetSubTask = 'execucao_contratos';
                                  } else if (computedStatus === 'Em execução' || computedStatus === 'Paralisada' || computedStatus === 'Concluída') {
                                    targetSubTask = 'execucao_acompanhamento';
                                  }
                                  setActiveSubTask(targetSubTask);
                                }
                              }}
                              className="px-2.5 py-1 text-[9.5px] font-extrabold text-white bg-[#13264d] hover:bg-[#1f3c75] rounded-lg cursor-pointer flex items-center gap-1 transition-all"
                            >
                              Acompanhar →
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        </div>
      

      {/* Selected work detailed overview in CADASTRO subtask - Horizontally rearranged */}
      {currentSol ? (
        <div id="ficha-consolidado-card" className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-3xs animate-fadeIn">
          <div className="flex items-center border-b border-slate-100 pb-3">
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <Info className="w-4 h-4 text-blue-500" />
              Ficha do Cadastro Consolidado: <span className="text-blue-700 font-mono text-[13px] font-black ml-1 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">{currentSol.id}</span>
            </h2>
          </div>

          {(() => {
            const obraCadastrada = !!(currentSol.cadastroObraConfirmado || (currentSol.fiscalObraAtribuido && currentSol.classeObra));
            return (
          <div className={`grid gap-6 font-sans ${obraCadastrada ? 'grid-cols-1 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'}`}>
            {/* Col 1: Escola / Identificação — sempre visível */}
            <div className="space-y-3 pb-3 md:pb-0 md:border-r border-slate-100 pr-2">
              <div>
                <span className="text-[9.5px] text-slate-500 uppercase font-extrabold block mb-0.5 font-sans">Unidade Escolar</span>
                <p className="text-xs font-black text-slate-800 uppercase leading-snug">{currentSol.nomeEscola}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[8.5px] text-slate-404 uppercase font-bold block">CODESC</span>
                  <p className="text-[11px] font-mono font-bold text-slate-700">{currentSol.codesc || '---'}</p>
                </div>
                <div>
                  <span className="text-[8.5px] text-slate-404 uppercase font-bold block">Regional (SRE)</span>
                  <p className="text-[10px] font-bold text-slate-600 uppercase truncate">{currentSol.sre}</p>
                </div>
              </div>
              <div>
                <span className="text-[8.5px] text-slate-404 uppercase font-bold block">Município</span>
                <p className="text-xs font-bold text-slate-800 uppercase">{currentSol.municipio || '---'}</p>
              </div>
            </div>

            {obraCadastrada ? (
              <>
                {/* Col 2: Prazos e Cronograma */}
                <div className="space-y-3 pb-3 md:pb-0 md:border-r border-slate-100 pr-2">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block border-b border-slate-100 pb-1">Cronograma</span>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[8.5px] text-slate-405 uppercase block font-bold">Início Real</span>
                      <p className="font-bold text-slate-700 font-mono text-[11px]">{currentSol.dataOrdemInicio || 'Aguardando Ordem'}</p>
                    </div>
                    <div>
                      <span className="text-[8.5px] text-slate-405 uppercase block font-bold">Duração</span>
                      <p className="font-bold text-slate-700 text-[11px]">{currentSol.duracaoObraMeses ? `${currentSol.duracaoObraMeses} Meses` : '—'}</p>
                    </div>
                    <div>
                      <span className="text-[8.5px] text-slate-405 uppercase block font-bold">Previsão Término</span>
                      <p className="font-bold text-slate-705 font-mono text-[11px]">{currentSol.previsaoTerminoObra || '—'}</p>
                    </div>
                    <div>
                      <span className="text-[8.5px] text-slate-405 uppercase block font-bold">Classificação</span>
                      <p className="font-bold text-slate-705 text-[11px]">{currentSol.classeObra || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Col 3: Responsabilidades e Equipes */}
                <div className="space-y-2.5 p-3.5 bg-slate-50/80 rounded-xl border border-slate-205/60 flex flex-col justify-between">
                  <span className="text-[9.5px] text-slate-550 font-black uppercase tracking-wider block border-b border-slate-200/50 pb-1">Responsabilidade Técnica</span>
                  <div className="space-y-1.5 text-[11px] flex-1 mt-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-505">Fiscal Responsável:</span>
                      <span className="font-bold text-slate-800">{currentSol.fiscalObraAtribuido || 'Não Definido'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-505 block">Complexidade:</span>
                      <span className="font-black text-amber-600 font-sans">{currentSol.pontuacaoComplexidade ? `Grau ${currentSol.pontuacaoComplexidade}` : '—'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-505 block truncate max-w-[100px]">Empresa:</span>
                      <span className="font-bold text-slate-700 truncate max-w-[124px]" title={currentSol.empresaContratada || '—'}>{currentSol.empresaContratada || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Col 4: Dados Financeiros */}
                <div className="space-y-2.5 p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-110/65 flex flex-col justify-between">
                  <div>
                    <span className="text-[9.5px] text-emerald-800 font-black uppercase tracking-wider block border-b border-emerald-200/40 pb-1">Dados Financeiros Vigentes</span>
                    <div className="space-y-1.5 text-[11px] mt-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-550">Valor Homologado:</span>
                        <span className="font-bold text-emerald-800 font-mono">
                          {currentSol.valorHomologadoContratacao
                            ? `R$ ${currentSol.valorHomologadoContratacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                            : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-555">Dotação de PAF:</span>
                        <span className="font-bold text-indigo-700 font-mono">{currentSol.numeroPAF || 'Não Consta'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Placeholder quando obra ainda não foi cadastrada */
              <div className="md:col-span-1 flex flex-col items-center justify-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                <AlertCircle className="w-6 h-6 text-amber-500" />
                <p className="text-xs font-black text-amber-800 uppercase tracking-wide">Obra não cadastrada</p>
                <p className="text-[10px] text-amber-700 leading-relaxed">Preencha os dados no formulário acima e clique em <strong>Cadastrar Obra</strong> para registrar o cronograma, fiscal e informações financeiras.</p>
              </div>
            )}
          </div>
          );
          })()}
        </div>
      ) : (
        <div id="ficha-placeholder-card" className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 text-center text-slate-400 transition animate-fadeIn">
          <Building2 className="w-8 h-8 mx-auto text-slate-300 mb-1.5" />
          <p className="text-xs font-bold text-slate-600 uppercase tracking-widest font-sans">Ficha do Cadastro Consolidado</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Selecione uma obra listada em nossa planilha acima clicando na linha correspondente para abrir o consolidado de prazos, finanças e responsabilidade técnica.</p>
        </div>
      )}
    </div>
  );
}

// --- 2. SUB ACOMPANHAMENTO DE EXECUÇÃO ---
function SubAcompanhamento({ currentSol, onUpdate, somenteLeitura = false }: { currentSol: Solicitacao | null; onUpdate: (sol: Solicitacao) => void; somenteLeitura?: boolean }) {
  const [activeTab, setActiveTab2] = useState<'dashboard' | 'ordem_inicio' | 'vistorias' | 'restricoes' | 'licoes_aprendidas'>('dashboard');

  // Ordem de Início states
  const [ordemDataInicio, setOrdemDataInicio] = useState('');
  const [ataFile, setAtaFile] = useState<{ name: string; size: string } | null>(null);
  const [ataDragOver, setAtaDragOver] = useState(false);
  const [cronogFile, setCronogFile] = useState<{ name: string; size: string } | null>(null);
  const [cronogDragOver, setCronogDragOver] = useState(false);
  const [novoAnexoNome, setNovoAnexoNome] = useState('');
  const [ordemSalva, setOrdemSalva] = useState(false);

  // Dashboard states
  const [novoStatus, setNovoStatus] = useState<'Não Iniciada' | 'Em Andamento' | 'Paralisada' | 'Concluída'>('Não Iniciada');
  const [mostrarParalisacao, setMostrarParalisacao] = useState(false);
  const [justificativaParalisacao, setJustificativaParalisacao] = useState('');
  const [dataParalisacao, setDataParalisacao] = useState('');

  // Diário de Obra states
  const [diarioTexto, setDiarioTexto] = useState('');
  const [diarioCategoria, setDiarioCategoria] = useState<'Ocorrência' | 'Clima' | 'Trabalho' | 'Materiais' | 'Equipe' | 'Segurança'>('Ocorrência');
  const [diarioBusca, setDiarioBusca] = useState('');

  // Vistorias states
  const [vistoriaData, setVistoriaData] = useState(new Date().toISOString().split('T')[0]);
  const [vistoVistoriador, setVistoVistoriador] = useState('');
  const [vistoResultado, setVistoResultado] = useState<'Aprovada' | 'Aprovada com Ressalvas' | 'Reprovada'>('Aprovada');
  const [vistoLaudoResumido, setVistoLaudoResumido] = useState('');
  const [relatorioVisitaFile, setRelatorioVisitaFile] = useState<{ name: string; size: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Restrições states
  const [restricaoDesc, setRestricaoDesc] = useState('');
  const [restricaoCategoria, setRestricaoCategoria] = useState<'Financeira' | 'Ambiental' | 'Técnica' | 'Climática' | 'Fornecedor' | 'Outros'>('Técnica');
  const [restricaoImpacto, setRestricaoImpacto] = useState<'Alto' | 'Médio' | 'Baixo'>('Médio');
  const [restricaoPrevisao, setRestricaoPrevisao] = useState('');
  const [parecerResolucaoTxt, setParecerResolucaoTxt] = useState('');
  const [resolvendoId, setResolvendoId] = useState<string | null>(null);

  // Lições Aprendidas states
  const [licaoDesc, setLicaoDesc] = useState('');
  const [licaoCategoria, setLicaoCategoria] = useState<'Técnica' | 'Gestão' | 'Cronograma' | 'Fornecedor' | 'Financeira' | 'Outros'>('Técnica');

  if (!currentSol) return <NoObraSelected />;

  // Sync state whenever selected school changes
  useEffect(() => {
    if (currentSol) {
      setNovoStatus(currentSol.statusObra || 'Não Iniciada');
      setVistoVistoriador(currentSol.fiscalObraAtribuido || '');
      setOrdemDataInicio(currentSol.dataOrdemInicio || '');
      setAtaFile(currentSol.ataOrdemInicioFileName ? { name: currentSol.ataOrdemInicioFileName, size: currentSol.ataOrdemInicioFileSize || '' } : null);
      setCronogFile(currentSol.cronogramaFisicoFinanceiroFileName ? { name: currentSol.cronogramaFisicoFinanceiroFileName, size: currentSol.cronogramaFisicoFinanceiroFileSize || '' } : null);
      setJustificativaParalisacao(currentSol.justificativaParalizacao || '');
      setDataParalisacao(currentSol.dataParalizacao || '');
      setMostrarParalisacao(currentSol.statusObra === 'Paralisada');
    }
  }, [currentSol.id, currentSol.fiscalObraAtribuido]);

  // Cálculo acumulado de todas as empresas (base monetária)
  const _cnpjAtual = currentSol.cnpjEmpresa || '';
  const _cnpjsAnteriores = new Set((currentSol.empresasAnteriores || []).map(e => e.cnpj).filter(Boolean));
  const _medEmpresaAtual = (currentSol.medicoes || []).filter(m =>
    _cnpjAtual ? m.empresaCnpj === _cnpjAtual : !_cnpjsAnteriores.has(m.empresaCnpj || '')
  );
  const _contratoAtual = currentSol.contratoValorInicial || currentSol.valorHomologadoContratacao || currentSol.valorPlanilha || 1;
  const _valorExecAtual = _medEmpresaAtual.reduce((s, m) => s + m.valor, 0);
  const _valorExecAnteriores = (currentSol.empresasAnteriores || []).reduce((s, e) => s + (e.valorExecutado ?? 0), 0);
  const sumMedicoes = _valorExecAnteriores + _valorExecAtual;
  // Valor efetivamente repassado à empresa nos pagamentos liberados pela Secretaria (Administrativo DORE),
  // registrados na Autorização do PAF — distinto de sumMedicoes, que é o avanço físico homologado (nem
  // sempre já pago).
  const sumPagamentosLiberados = (currentSol.parcelasPAF || []).reduce((s, p) => s + (p.valor || 0), 0);
  // Alerta de saldo liberado quase esgotado — mesmo limiar usado em Acompanhamento de PAF
  const percentGastoLiberado = sumPagamentosLiberados > 0 ? (sumMedicoes / sumPagamentosLiberados) * 100 : 0;
  const precisaProximaParcela = sumPagamentosLiberados > 0 && percentGastoLiberado >= 90;
  // Orçamento fixo da obra (PAF) — não soma contratos, pois cada nova empresa contrata pelo saldo restante
  const originalBudget = currentSol.valorPlanilha || currentSol.valorHomologado
    || (currentSol.empresasAnteriores?.[0]?.contratoValorInicial ?? 0)
    || _contratoAtual;
  const safePercent = originalBudget > 0 ? Math.min(100, Math.max(0, (sumMedicoes / originalBudget) * 100)) : 0;
  // Avanço da empresa atual individualmente
  const _fisicoEmpresaAtual = _contratoAtual > 0 ? Math.min(100, (_valorExecAtual / _contratoAtual) * 100) : 0;
  const _temEmpresas = (currentSol.empresasAnteriores || []).length > 0;

  // Default values lazily resolved for rendering if not initialized on Solicitacao
  const listDiarios = currentSol.diariosObra || [];

  const listVistorias = currentSol.vistoriasObra || [];

  const listRestricoes = currentSol.restricoesObra || [];

  const listLicoesAprendidas = currentSol.licoesAprendidas || [];

  // Action handlers
  const updateObraStatus = () => {
    const isParalisando = mostrarParalisacao && justificativaParalisacao;
    const updated: typeof currentSol = {
      ...currentSol,
      observacoesFicha: currentSol.observacoesFicha,
      ...(isParalisando && {
        statusObra: 'Paralisada',
        justificativaParalizacao: justificativaParalisacao,
        dataParalizacao: dataParalisacao || new Date().toISOString().split('T')[0],
      }),
    };
    onUpdate(updated);
    if (isParalisando) setMostrarParalisacao(false);
  };

  const adicNovoDiario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diarioTexto.trim()) return;

    let dbId = currentSol._dbId;
    if (!dbId) {
      const { data: solRow, error: solError } = await supabase
        .from('solicitacoes')
        .select('id')
        .eq('codigo_sgo', currentSol.id)
        .single();
      if (solError || !solRow) {
        alert('Não foi possível localizar o registro da obra no banco para gravar o diário.');
        return;
      }
      dbId = solRow.id;
    }

    const dataRegistro = new Date().toISOString().split('T')[0];
    const autor = currentSol.fiscalObraAtribuido || 'Fiscal de Campo DORE';
    const { data: userData } = await supabase.auth.getUser();

    const { data: diarioRow, error: diarioError } = await supabase
      .from('diarios_obra')
      .insert({
        solicitacao_id: dbId,
        data_registro: dataRegistro,
        conteudo: diarioTexto,
        categoria: diarioCategoria ?? null,
        anexo_foto: null,
        autor: autor ?? null,
        usuario_id: userData.user?.id ?? null
      })
      .select('id')
      .single();

    if (diarioError || !diarioRow) {
      console.error('Erro ao gravar diário no Supabase:', diarioError);
      alert('Erro ao gravar o diário no banco de dados. Tente novamente.');
      return;
    }

    const novoReg = {
      id: diarioRow.id,
      data: dataRegistro,
      texto: diarioTexto,
      autor,
      categoria: diarioCategoria
    };

    const updated = {
      ...currentSol,
      diariosObra: [novoReg, ...listDiarios]
    };

    onUpdate(updated);
    setDiarioTexto('');
  };

  const deletarDiario = async (id: string) => {
    const { error } = await supabase.from('diarios_obra').delete().eq('id', id);
    if (error) {
      console.error('Erro ao excluir diário no Supabase:', error);
      alert('Erro ao excluir o diário no banco de dados. Tente novamente.');
      return;
    }

    const updated = {
      ...currentSol,
      diariosObra: listDiarios.filter(d => d.id !== id)
    };
    onUpdate(updated);
  };

  const adicNovaVistoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vistoLaudoResumido.trim()) return;

    let dbId = currentSol._dbId;
    if (!dbId) {
      const { data: solRow, error: solError } = await supabase
        .from('solicitacoes')
        .select('id')
        .eq('codigo_sgo', currentSol.id)
        .single();
      if (solError || !solRow) {
        alert('Não foi possível localizar o registro da obra no banco para gravar a vistoria.');
        return;
      }
      dbId = solRow.id;
    }

    const vistoriador = vistoVistoriador || 'Engenheiro Responsável';
    const nomeRelatorio = relatorioVisitaFile ? relatorioVisitaFile.name : undefined;
    const tamanhoRelatorio = relatorioVisitaFile ? relatorioVisitaFile.size : undefined;
    const { data: userData } = await supabase.auth.getUser();

    const { data: vistoriaRow, error: vistoriaError } = await supabase
      .from('vistorias_obra')
      .insert({
        solicitacao_id: dbId,
        data_vistoria: vistoriaData,
        vistoriador: vistoriador ?? null,
        observacoes: vistoLaudoResumido ?? null,
        nome_relatorio: nomeRelatorio ?? null,
        tamanho_relatorio: tamanhoRelatorio ?? null,
        resultado: 'emitido',
        usuario_id: userData.user?.id ?? null
      })
      .select('id')
      .single();

    if (vistoriaError || !vistoriaRow) {
      console.error('Erro ao gravar vistoria no Supabase:', vistoriaError);
      alert('Erro ao gravar a vistoria no banco de dados. Tente novamente.');
      return;
    }

    const novoReg = {
      id: vistoriaRow.id,
      dataVistoria: vistoriaData,
      vistoriador,
      laudoResumido: vistoLaudoResumido,
      resultado: 'emitido',
      nomeRelatorio,
      tamanhoRelatorio
    };

    const updated = {
      ...currentSol,
      vistoriasObra: [novoReg, ...listVistorias]
    };

    onUpdate(updated);
    setVistoLaudoResumido('');
    setRelatorioVisitaFile(null);
  };

  const deletarVistoria = async (id: string) => {
    const { error } = await supabase.from('vistorias_obra').delete().eq('id', id);
    if (error) {
      console.error('Erro ao excluir vistoria no Supabase:', error);
      alert('Erro ao excluir a vistoria no banco de dados. Tente novamente.');
      return;
    }

    const updated = {
      ...currentSol,
      vistoriasObra: listVistorias.filter(v => v.id !== id)
    };
    onUpdate(updated);
  };

  const adicNovaRestricao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restricaoDesc.trim()) return;

    let dbId = currentSol._dbId;
    if (!dbId) {
      const { data: solRow, error: solError } = await supabase
        .from('solicitacoes')
        .select('id')
        .eq('codigo_sgo', currentSol.id)
        .single();
      if (solError || !solRow) {
        alert('Não foi possível localizar o registro da obra no banco para gravar a restrição.');
        return;
      }
      dbId = solRow.id;
    }

    const dataIdentificacao = new Date().toISOString().split('T')[0];
    const { data: userData } = await supabase.auth.getUser();

    const { data: restricaoRow, error: restricaoError } = await supabase
      .from('restricoes_obra')
      .insert({
        solicitacao_id: dbId,
        descricao: restricaoDesc,
        tipo: restricaoCategoria ?? null,
        status: 'ativa',
        data_abertura: dataIdentificacao,
        impacto: restricaoImpacto ?? null,
        previsao_resolucao: restricaoPrevisao && restricaoPrevisao.trim() !== '' ? restricaoPrevisao : null,
        usuario_id: userData.user?.id ?? null
      })
      .select('id')
      .single();

    if (restricaoError || !restricaoRow) {
      console.error('Erro ao gravar restrição no Supabase:', restricaoError);
      alert('Erro ao gravar a restrição no banco de dados. Tente novamente.');
      return;
    }

    const novoReg = {
      id: restricaoRow.id,
      descricao: restricaoDesc,
      dataIdentificacao,
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

  const resolverRestricao = async (id: string) => {
    if (!parecerResolucaoTxt.trim()) return;

    const resolvidaEm = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('restricoes_obra')
      .update({
        status: 'resolvida',
        data_resolucao: resolvidaEm,
        parecer_resolucao: parecerResolucaoTxt
      })
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar restrição no Supabase:', error);
      alert('Erro ao atualizar a restrição no banco de dados. Tente novamente.');
      return;
    }

    const updatedRestricoes = listRestricoes.map(r => {
      if (r.id === id) {
        return {
          ...r,
          status: 'Resolvida' as const,
          resolvidaEm,
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

  const deletarRestricao = async (id: string) => {
    const { error } = await supabase.from('restricoes_obra').delete().eq('id', id);
    if (error) {
      console.error('Erro ao excluir restrição no Supabase:', error);
      alert('Erro ao excluir a restrição no banco de dados. Tente novamente.');
      return;
    }

    const updated = {
      ...currentSol,
      restricoesObra: listRestricoes.filter(r => r.id !== id)
    };
    onUpdate(updated);
  };

  const adicNovaLicaoAprendida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licaoDesc.trim()) return;

    let dbId = currentSol._dbId;
    if (!dbId) {
      const { data: solRow, error: solError } = await supabase
        .from('solicitacoes')
        .select('id')
        .eq('codigo_sgo', currentSol.id)
        .single();
      if (solError || !solRow) {
        alert('Não foi possível localizar o registro da obra no banco para gravar a lição aprendida.');
        return;
      }
      dbId = solRow.id;
    }

    const dataRegistro = new Date().toISOString().split('T')[0];
    const { data: userData } = await supabase.auth.getUser();

    const { data: licaoRow, error: licaoError } = await supabase
      .from('licoes_aprendidas_obra')
      .insert({
        solicitacao_id: dbId,
        descricao: licaoDesc,
        categoria: licaoCategoria ?? null,
        usuario_id: userData.user?.id ?? null
      })
      .select('id')
      .single();

    if (licaoError || !licaoRow) {
      console.error('Erro ao gravar lição aprendida no Supabase:', licaoError);
      alert('Erro ao gravar a lição aprendida no banco de dados. Tente novamente.');
      return;
    }

    const novoReg = {
      id: licaoRow.id,
      descricao: licaoDesc,
      categoria: licaoCategoria,
      dataRegistro
    };

    const updated = {
      ...currentSol,
      licoesAprendidas: [novoReg, ...listLicoesAprendidas]
    };

    onUpdate(updated);
    setLicaoDesc('');
  };

  const deletarLicaoAprendida = async (id: string) => {
    const { error } = await supabase.from('licoes_aprendidas_obra').delete().eq('id', id);
    if (error) {
      console.error('Erro ao excluir lição aprendida no Supabase:', error);
      alert('Erro ao excluir a lição aprendida no banco de dados. Tente novamente.');
      return;
    }

    const updated = {
      ...currentSol,
      licoesAprendidas: listLicoesAprendidas.filter(l => l.id !== id)
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
          onClick={() => setActiveTab2('ordem_inicio')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
            activeTab === 'ordem_inicio'
              ? 'bg-blue-600 text-white shadow-3xs'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Ordem de Início
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
          Não Conformidades
          {listRestricoes.filter(r => r.status === 'Ativa').length > 0 && (
            <span className="px-1.5 py-0.2 text-[9px] bg-rose-600 text-white rounded-full font-mono font-black animate-pulse">
              {listRestricoes.filter(r => r.status === 'Ativa').length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab2('licoes_aprendidas')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
            activeTab === 'licoes_aprendidas'
              ? 'bg-blue-600 text-white shadow-3xs'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          Lições Aprendidas
          {listLicoesAprendidas.length === 0 && (
            <span className="px-1.5 py-0.2 text-[9px] bg-amber-500 text-white rounded-full font-mono font-black">
              !
            </span>
          )}
        </button>
      </div>

      {/* DASHBOARD TAB CONTENT */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">

          {/* Alerta de saldo liberado pelo PAF quase esgotado */}
          {precisaProximaParcela && (
            <div className="flex items-start gap-2 p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Atenção:</strong> já foi gasto {percentGastoLiberado.toFixed(1)}% do valor liberado até agora.
                Solicite a liberação da próxima parcela para não interromper a execução da obra.
              </span>
            </div>
          )}

          {/* Top Status and Progress KPIs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Circular progress card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4 text-left">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                <HardHat className="w-4 h-4 text-amber-500 animate-pulse" />
                Avanço Físico-Financeiro Consolidado
              </h3>

              <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/40 flex items-center gap-3">
                <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0 animate-bounce" />
                <p className="text-[11px] text-amber-900 leading-normal font-sans font-medium">
                  <strong>Controle Gerencial DORE:</strong> A porcentagem de avanço físico mostrada no painel é calculada em conformidade com o consolidado das medições físico-financeiras enviadas e homologadas.
                </p>
              </div>

              <div className="py-6 flex flex-col items-center justify-center space-y-4 bg-slate-50/40 rounded-xl border border-slate-100">
                {/* Indicador circular — Avanço Acumulado da Obra */}
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                    {/* Anel das empresas anteriores (cinza) */}
                    {_temEmpresas && (
                      <circle cx="50" cy="50" r="40" stroke="#94a3b8" strokeWidth="8" fill="transparent"
                        strokeDasharray="251.2"
                        strokeDashoffset={251.2 - (251.2 * Math.min(100, (_valorExecAnteriores / originalBudget) * 100)) / 100}
                        strokeLinecap="butt"
                      />
                    )}
                    {/* Anel da empresa atual (azul) */}
                    <circle cx="50" cy="50" r="40" stroke="#2563eb" strokeWidth="8" fill="transparent"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (251.2 * safePercent) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-slate-800 font-mono tracking-tighter">
                      {safePercent.toFixed(1)}%
                    </span>
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Acumulado</span>
                  </div>
                </div>

                <div className="w-full space-y-2 px-2">
                  {/* Avanço acumulado da obra */}
                  <div className="text-center">
                    <span className="text-[9.5px] uppercase font-bold text-slate-400 block tracking-wider">Total Executado (Obra)</span>
                    <p className="text-sm font-black text-slate-800 font-mono mt-0.5">
                      R$ {sumMedicoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      <span className="text-[9px] text-slate-400 font-normal ml-1">
                        / R$ {originalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </p>
                  </div>

                  {/* Indicador da empresa atual (separado) */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                    <span className="text-[9px] uppercase font-bold text-blue-600 block tracking-wider">Avanço da Empresa Atual</span>
                    <p className="text-base font-black text-blue-800 font-mono mt-0.5">{_fisicoEmpresaAtual.toFixed(1)}%</p>
                    <div className="w-full bg-blue-100 h-1 rounded-full mt-1 overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${_fisicoEmpresaAtual}%` }} />
                    </div>
                    <p className="text-[9px] text-blue-500 mt-0.5">
                      R$ {_valorExecAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {_contratoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  {/* Empresas anteriores, se houver */}
                  {_temEmpresas && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block tracking-wider">Empresas Anteriores ({(currentSol.empresasAnteriores || []).length})</span>
                      <p className="text-base font-black text-slate-700 font-mono mt-0.5">
                        {(_valorExecAnteriores / originalBudget * 100).toFixed(1)}%
                        <span className="text-[9px] text-slate-400 font-normal ml-1">(contribuição acumulada)</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Situação Operacional Computada */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4 text-left flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-2 mb-3">
                  <Scale className="w-4 h-4 text-blue-500" /> Situação Operacional da Obra
                </h3>

                {(() => {
                  const statusInfo = computeStatusObra(currentSol);
                  const isParalisada = statusInfo.label === 'Paralisada';
                  const podeParalisar = statusInfo.label === 'Em execução';
                  return (
                    <div className="space-y-4">
                      {/* Status computado */}
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider mb-1.5">Status da Obra</label>
                          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-black ${statusInfo.badgeClass}`}>
                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                              statusInfo.color === 'green' ? 'bg-green-500' :
                              statusInfo.color === 'blue' ? 'bg-blue-500' :
                              statusInfo.color === 'yellow' ? 'bg-yellow-500' :
                              statusInfo.color === 'orange' ? 'bg-orange-500' :
                              statusInfo.color === 'purple' ? 'bg-purple-500' : 'bg-slate-400'
                            }`} />
                            {statusInfo.label}
                          </div>
                          <p className="text-[10px] text-slate-500 font-sans mt-1.5 leading-relaxed">{statusInfo.descricao}</p>
                        </div>
                      </div>

                      {/* Botão Paralisar / Desparalisar */}
                      {!somenteLeitura && podeParalisar && !isParalisada && (
                        <button
                          type="button"
                          onClick={() => setMostrarParalisacao(prev => !prev)}
                          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                            mostrarParalisacao
                              ? 'bg-rose-50 border-rose-400 text-rose-700'
                              : 'bg-white border-rose-300 text-rose-600 hover:bg-rose-50 hover:border-rose-400'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                          Paralisar esta obra
                        </button>
                      )}

                      {isParalisada && (
                        currentSol.statusContratoEmpresa === 'Distratada' ? (
                          <div className="w-full flex items-start gap-3 px-4 py-3 rounded-xl border-2 border-amber-300 bg-amber-50 text-xs text-amber-800">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                            <div>
                              <p className="font-black uppercase tracking-wide mb-0.5">Retomada bloqueada — contrato distratado</p>
                              <p className="font-normal leading-relaxed">Para retomar a execução é necessário: <strong>1.</strong> Cadastrar nova empresa na aba Contratos; <strong>2.</strong> Emitir nova Ordem de Início.</p>
                            </div>
                          </div>
                        ) : !somenteLeitura ? (
                          <button
                            type="button"
                            onClick={() => {
                              onUpdate({ ...currentSol, statusObra: 'Em Andamento', justificativaParalizacao: undefined, dataParalizacao: undefined });
                              setMostrarParalisacao(false);
                              setJustificativaParalisacao('');
                              setDataParalisacao('');
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black border-2 border-blue-300 bg-white text-blue-700 hover:bg-blue-50 transition-all cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Retomar execução da obra
                          </button>
                        ) : null
                      )}

                      {/* Seção Paralisação Temporária */}
                      {mostrarParalisacao && !isParalisada && (
                        <div className="p-4 rounded-xl border-2 border-rose-200 bg-rose-50/60 space-y-3">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-700 font-sans">
                            Informações de Paralisação Temporária
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-extrabold text-slate-600 block uppercase tracking-wider">
                                Justificativa da Paralisação *
                              </label>
                              <select
                                value={justificativaParalisacao}
                                onChange={e => setJustificativaParalisacao(e.target.value)}
                                className="w-full text-xs font-bold p-2.5 border border-rose-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-rose-400 cursor-pointer"
                              >
                                <option value="">Selecione uma justificativa...</option>
                                <option value="Aguardando diretor da cx escolar realizar notificação à empresa">Aguardando diretor da cx escolar realizar notificação à empresa</option>
                                <option value="Condições climáticas">Condições climáticas</option>
                                <option value="Falta de material ou insumos">Falta de material ou insumos</option>
                                <option value="Inadimplência ou problemas financeiros da contratada">Inadimplência ou problemas financeiros da contratada</option>
                                <option value="Restrição técnica ou de engenharia">Restrição técnica ou de engenharia</option>
                                <option value="Interferência de concessionária (CEMIG, COPASA, etc.)">Interferência de concessionária (CEMIG, COPASA, etc.)</option>
                                <option value="Determinação judicial ou administrativa">Determinação judicial ou administrativa</option>
                                <option value="Outro motivo">Outro motivo</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-extrabold text-slate-600 block uppercase tracking-wider">
                                Data da Paralisação *
                              </label>
                              <input
                                type="date"
                                value={dataParalisacao}
                                onChange={e => setDataParalisacao(e.target.value)}
                                className="w-full text-xs font-bold p-2.5 border border-rose-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-rose-400 cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 font-sans mt-3">
                <span className="font-extrabold text-slate-700 block mb-0.5">ℹ️ Sincronização em tempo real SGO</span>
                O status é determinado automaticamente pelo fluxo da obra. A paralisação manual é a única exceção permitida por este módulo.
              </div>

              {!somenteLeitura && (
              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={updateObraStatus}
                  className="w-full md:w-auto px-6 py-3 text-xs font-black uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer shadow-3xs transition-all"
                >
                  Registrar Alteração de Status
                </button>
              </div>
              )}
            </div>

          </div>

          {/* MAIN DYNAMIC BENTO GRID - SUMMARY OF EVERYTHING */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. ATENDIMENTO E DADOS DA OBRA */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs text-left space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileText className="w-4 h-4 text-indigo-500" /> Dossiê Técnico do Atendimento
              </h3>
              
              <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Nome da Escola</span>
                  <span className="font-extrabold text-slate-800 block truncate" title={currentSol.nomeEscola}>
                    {currentSol.nomeEscola}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Código INEP / Código</span>
                  <span className="font-mono font-bold text-slate-700">{currentSol.codesc || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Município</span>
                  <span className="font-bold text-slate-800">{currentSol.municipio}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">SRE Regional</span>
                  <span className="font-bold text-indigo-700">{currentSol.sre}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Tipo de Atendimento</span>
                  <span className="font-semibold text-slate-700">{currentSol.tipoAtendimento || currentSol.tipo || 'Obras Escolares'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Notificação / PAF</span>
                  <span className="font-semibold text-slate-700">{currentSol.numeroPAF || currentSol.numPaf || 'Não Informado'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Fiscal Responsável Designado</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-[10.5px] font-black rounded-lg mt-1 font-sans">
                    <User className="w-3.5 h-3.5" />
                    {currentSol.fiscalObraAtribuido || 'Aguardando Atribuição DORE'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. VALORES E ORÇAMENTOS */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs text-left space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <DollarSign className="w-4 h-4 text-emerald-500" /> Balanço Financeiro da Execução
              </h3>

              <div className="space-y-3.5 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Planilha Base de Referência</span>
                    <strong className="text-slate-800 font-mono block">
                      R$ {(currentSol.valorPlanilha || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50/50 p-2.5 rounded-xl border border-blue-200/40 text-left">
                    <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Valor Contratado Inicial</span>
                    <strong className="text-blue-800 font-mono text-[13px]">
                      R$ {(currentSol.contratoValorInicial || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>

                  <div className="bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-200/40 text-left">
                    <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Total Medições Homologadas</span>
                    <strong className="text-emerald-700 font-mono text-[13px]">
                      R$ {sumMedicoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>

                  <div className="bg-purple-50/40 p-2.5 rounded-xl border border-purple-200/40 text-left">
                    <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Repassado pela Secretaria</span>
                    <strong className="text-purple-700 font-mono text-[13px]">
                      R$ {sumPagamentosLiberados.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                    <span className="text-[8px] text-slate-400 block mt-0.5">
                      {(currentSol.parcelasPAF || []).length} pagamento{(currentSol.parcelasPAF || []).length !== 1 ? 's' : ''} liberado{(currentSol.parcelasPAF || []).length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="bg-amber-50/30 p-2.5 rounded-xl border border-amber-200/40 text-left flex justify-between items-center">
                  <div>
                    <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Saldo de Contrato à Medir</span>
                    <strong className="text-amber-800 font-mono">
                      R$ {Math.max(0, (currentSol.contratoValorInicial || 0) - sumMedicoes).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <span className="text-[9.5px] font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200/80">
                    {Math.max(0, 100 - safePercent).toFixed(1)}% restando
                  </span>
                </div>
              </div>
            </div>

            {/* 3. CONTRATO PRINCIPAL E GARANTIA */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs text-left space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileCheck className="w-4 h-4 text-blue-500" /> Contrato de Empreiteira Credenciada
              </h3>

              {!currentSol.contratoDataAssinatura ? (
                <div className="py-6 text-center text-slate-400 text-xs italic">
                  Nenhum contrato ativo cadastrado para este atendimento.
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <Building2 className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Razão Social Contratada</span>
                      <strong className="text-slate-800 block text-[11.5px]">{currentSol.empresaContratada}</strong>
                      <span className="text-[10px] text-slate-500 block font-mono">CNPJ: {currentSol.cnpjEmpresa || 'Não informado'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sans">
                    <div className="border-r border-slate-100 pr-1">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Data Assinatura</span>
                      <strong className="text-slate-800 text-[11px] block">{currentSol.contratoDataAssinatura || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Período de Vigência</span>
                      <strong className="text-slate-800 text-[10.5px] block font-mono">
                        {currentSol.contratoInicioVigencia || 'N/A'} — {currentSol.contratoFimVigencia || 'N/A'}
                      </strong>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider mb-1">Garantia Técnica SGO</span>
                    <div className="bg-slate-55/70 p-2 rounded-lg border border-slate-100/50 flex justify-between items-center text-[11px]">
                      <div>
                        <span className="font-bold text-slate-600 block">{currentSol.garantiaExigida || 'Caução de Execução'}</span>
                        {currentSol.garantiaValidade && (
                          <span className="text-[9.5px] text-slate-400 font-mono block">Vencimento: {currentSol.garantiaValidade}</span>
                        )}
                      </div>
                      <span className="font-mono font-black text-slate-800 bg-white shadow-3xs px-2 py-1 rounded">
                        R$ {(currentSol.garantiaValor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. MEDIÇÕES FÍSICO-FINANCEIRAS */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs text-left space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <ClipboardCheck className="w-4 h-4 text-emerald-500" /> Histórico Resumido de Medições
              </h3>

              {!currentSol.medicoes || currentSol.medicoes.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  Nenhuma medição física ou boletim de medição lançado ainda nesta obra.
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>Lançamentos Recentes ({currentSol.medicoes.length})</span>
                    <span>Total Homologado</span>
                  </div>

                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {currentSol.medicoes.map((med, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 text-xs font-medium">
                        <div className="space-y-0.5">
                          <strong className="text-slate-800 font-sans block text-[11px]">
                            Medição #{med.numeroMedicao || (idx + 1)}
                          </strong>
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 pt-0.5">
                            <Calendar className="w-3.5 h-3.5" />
                            Período: {med.periodoMedicao || 'N/A'}
                          </span>
                        </div>

                        <div className="text-right space-y-0.5">
                          <strong className="text-slate-900 block font-mono text-[11px]">
                            R$ {(med.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </strong>
                          <span className="inline-flex items-center text-[8.5px] font-black uppercase text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded mt-0.5">
                            RECEBIDA & APROVADA
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 5. TERMOS ADITIVOS */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs text-left space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <Layers className="w-4 h-4 text-amber-500" /> Termos Aditivos de Escopo & Prazos
              </h3>

              {!currentSol.aditivos || currentSol.aditivos.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200/70">
                  Nenhum aditivo de valor ou dilação de prazo assinado para este contrato.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-amber-50/40 p-3 rounded-xl border border-amber-200/40 text-xs text-amber-900 font-bold mb-1">
                    <span>Aditivos Cadastrados: {currentSol.aditivos.length}</span>
                    <span className="font-mono text-amber-700">
                      R$ {currentSol.aditivos.reduce((sum, a) => sum + (a.valorAditivo || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} aditados
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {currentSol.aditivos.map((ad, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-5/50 hover:bg-slate-50 rounded-lg border border-slate-200/80 text-xs space-y-1.5 text-sans">
                        <div className="flex justify-between items-center bg-transparent">
                          <strong className="text-slate-800 font-sans text-[11px]">
                            Aditivo nº {ad.numeroAditivo || (idx + 1)}
                          </strong>
                          <span className="text-[9.5px] font-black uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg">
                            {ad.tipo || 'Aditivo Misto'}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                          <span>Assinado em: <strong className="text-slate-600 font-mono">{ad.data || 'N/A'}</strong></span>
                          <span>Prazo: <strong className="text-slate-600 font-mono">+{Math.round((ad.prazoExtraDias || 0) / 30) || 0} meses</strong></span>
                          <span>Valor: <strong className="text-slate-800 font-mono">R$ {(ad.valorAditivo || 0).toLocaleString('pt-BR')}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 6. AJUSTES TÉCNICOS DE PLANILHA */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs text-left space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <Wrench className="w-4 h-4 text-indigo-500" /> Ajustes Técnicos de Planilha (Meta/Escopo)
              </h3>

              {!currentSol.ajustes || currentSol.ajustes.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200/70">
                  Nenhum remanejamento, compensação ou ajuste técnico de planilha homologado.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-indigo-50/40 p-3 rounded-xl border border-indigo-200/40 text-xs text-indigo-900 font-bold mb-1">
                    <span>Ajustes Homologados: {currentSol.ajustes.length}</span>
                    <span className="font-mono text-indigo-700">
                      R$ {currentSol.ajustes.reduce((sum, a) => sum + (a.valorAjuste || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} líquidos
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {currentSol.ajustes.map((aj, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-5/50 hover:bg-slate-50 rounded-lg border border-slate-200/80 text-xs space-y-1 text-sans">
                        <div className="flex justify-between items-center">
                          <strong className="text-slate-800 font-sans text-[11px]">
                            Ajuste de Itens #{idx + 1}
                          </strong>
                          <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.2 rounded-md font-sans">
                            {aj.tipoAjuste === 'sem_alteracao_meta' ? 'Sem Alteração de Meta' : 'Ajuste de Escala'}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-500 italic leading-snug text-left truncate" title={aj.observacoes || 'Remanejamento de insumos e compensação de alvenaria.'}>
                          💡 {aj.observacoes || 'Remanejamento de insumos e compensação de alvenaria.'}
                        </p>
                        <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1 border-t border-slate-100 pt-1">
                          <span>Referência: <strong className="text-slate-600 font-sans">{aj.ajusteReferente === 'atendimento_inicial' ? 'Planilha Inicial' : 'Saldo Cotação'}</strong></span>
                          <span>Saldo do Ajuste: <strong className="text-slate-800 font-mono">R$ {(aj.valorAjuste || 0).toLocaleString('pt-BR')}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ORDEM DE INÍCIO TAB CONTENT */}
      {activeTab === 'ordem_inicio' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start gap-3 p-4 bg-blue-50/60 border border-blue-200/60 rounded-xl">
            <FileCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                Gestão de Ordem de Início e Cronograma
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-sans leading-relaxed">
                Registre a data oficial de expedição da ordem de início da obra escolar e faça o upload da ata da reunião de partida e do cronograma físico-financeiro homologado. Heurística gerencial de controle DORE.
              </p>
            </div>
          </div>

          {/* Bloqueio quando contrato distratado */}
          {currentSol.statusContratoEmpresa === 'Distratada' ? (
            <div className="flex items-start gap-4 p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl">
              <div className="p-2.5 bg-slate-200 rounded-xl shrink-0">
                <Lock className="w-5 h-5 text-slate-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black text-slate-700 uppercase tracking-wide">Ordem de Início bloqueada</p>
                <p className="text-xs text-slate-500 font-sans leading-relaxed">
                  A Ordem de Início da empresa anterior está encerrada e não pode ser editada após o distrato contratual.
                  Para emitir uma nova Ordem de Início, cadastre uma nova empresa na aba <strong>Contratos</strong>.
                </p>
                {currentSol.dataOrdemInicio && (
                  <p className="text-[10px] text-slate-400 font-mono mt-2">
                    Ordem anterior emitida em: {new Date(currentSol.dataOrdemInicio).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
          ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">

            {/* Data da Ordem de Início */}
            <div className="space-y-1.5 max-w-sm">
              <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">
                Data da Ordem de Início *
              </label>
              <input
                type="date"
                value={ordemDataInicio}
                onChange={e => setOrdemDataInicio(e.target.value)}
                className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 focus:ring-1 focus:ring-blue-500 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400 font-sans">
                Utilizado para o cálculo de vigência contratual e termo final estimado da obra.
              </p>
            </div>

            {/* Upload areas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Ata da Reunião */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">
                  Ata da Reunião de Ordem de Início
                </label>
                <div
                  onDragOver={e => { e.preventDefault(); setAtaDragOver(true); }}
                  onDragLeave={() => setAtaDragOver(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setAtaDragOver(false);
                    if (e.dataTransfer.files?.[0]) {
                      const f = e.dataTransfer.files[0];
                      setAtaFile({ name: f.name, size: `${(f.size / 1024).toFixed(0)} KB` });
                    }
                  }}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
                    ataDragOver
                      ? 'border-blue-500 bg-blue-50/50'
                      : ataFile
                        ? 'border-emerald-500 bg-emerald-50/10'
                        : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/50'
                  }`}
                >
                  {ataFile ? (
                    <div className="flex items-center justify-between gap-3 bg-white border border-emerald-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-5 h-5 text-emerald-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{ataFile.name}</p>
                          <p className="text-[10px] text-slate-400 font-sans">{ataFile.size}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAtaFile(null)}
                        className="text-red-400 hover:text-red-600 shrink-0 p-1 hover:bg-red-50 rounded transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center gap-2">
                      <FileUp className="w-8 h-8 text-blue-400" />
                      <p className="text-xs font-bold text-slate-600">Ata da Reunião de Ordem de Início</p>
                      <span className="text-[10px] text-slate-400 font-sans">Escolher arquivo ou arraste e solte</span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.png"
                        onChange={e => {
                          if (e.target.files?.[0]) {
                            const f = e.target.files[0];
                            setAtaFile({ name: f.name, size: `${(f.size / 1024).toFixed(0)} KB` });
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Cronograma Físico-Financeiro */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">
                  Cronograma Físico-Financeiro Homologado
                </label>
                <div
                  onDragOver={e => { e.preventDefault(); setCronogDragOver(true); }}
                  onDragLeave={() => setCronogDragOver(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setCronogDragOver(false);
                    if (e.dataTransfer.files?.[0]) {
                      const f = e.dataTransfer.files[0];
                      setCronogFile({ name: f.name, size: `${(f.size / 1024).toFixed(0)} KB` });
                    }
                  }}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
                    cronogDragOver
                      ? 'border-blue-500 bg-blue-50/50'
                      : cronogFile
                        ? 'border-emerald-500 bg-emerald-50/10'
                        : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/50'
                  }`}
                >
                  {cronogFile ? (
                    <div className="flex items-center justify-between gap-3 bg-white border border-emerald-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-5 h-5 text-emerald-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{cronogFile.name}</p>
                          <p className="text-[10px] text-slate-400 font-sans">{cronogFile.size}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCronogFile(null)}
                        className="text-red-400 hover:text-red-600 shrink-0 p-1 hover:bg-red-50 rounded transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center gap-2">
                      <FileUp className="w-8 h-8 text-blue-400" />
                      <p className="text-xs font-bold text-slate-600">Cronograma Físico-Financeiro</p>
                      <span className="text-[10px] text-slate-400 font-sans">Escolher arquivo ou arraste e solte</span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.xlsx,.xls,.doc,.docx"
                        onChange={e => {
                          if (e.target.files?.[0]) {
                            const f = e.target.files[0];
                            setCronogFile({ name: f.name, size: `${(f.size / 1024).toFixed(0)} KB` });
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Outros Anexos */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2">
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                  Outros Anexos ({(currentSol.outrosAnexosOrdemInicio || []).length})
                </h3>
                <div className="flex items-center gap-2 max-w-sm w-full">
                  <input
                    type="text"
                    placeholder="Nome do documento extra..."
                    value={novoAnexoNome}
                    onChange={e => setNovoAnexoNome(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && novoAnexoNome.trim()) {
                        const novo = { id: `anexo-${Date.now()}`, nome: novoAnexoNome.trim() };
                        onUpdate({ ...currentSol, outrosAnexosOrdemInicio: [...(currentSol.outrosAnexosOrdemInicio || []), novo] });
                        setNovoAnexoNome('');
                      }
                    }}
                    className="px-2.5 py-1.5 border border-slate-250 rounded-lg text-xs flex-1 focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!novoAnexoNome.trim()) return;
                      const novo = { id: `anexo-${Date.now()}`, nome: novoAnexoNome.trim() };
                      onUpdate({ ...currentSol, outrosAnexosOrdemInicio: [...(currentSol.outrosAnexosOrdemInicio || []), novo] });
                      setNovoAnexoNome('');
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold rounded-lg inline-flex items-center gap-1 transition cursor-pointer shrink-0"
                  >
                    <Plus className="w-3 h-3 text-white" />
                    + Adicionar Campo
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {(currentSol.outrosAnexosOrdemInicio || []).length === 0 ? (
                  <div className="p-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center text-xs text-slate-400 font-sans">
                    Nenhum anexo complementar adicionado. Use o campo acima para criar entradas sob demanda.
                  </div>
                ) : (
                  (currentSol.outrosAnexosOrdemInicio || []).map(anexo => (
                    <div key={anexo.id} className={`p-4 rounded-xl border transition-all ${anexo.fileName ? 'border-emerald-200 bg-emerald-50/5' : 'border-slate-200 bg-white shadow-xs'}`}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-sans font-extrabold text-slate-800 text-sm">{anexo.nome}</h4>
                            <span className="text-[10px] bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5 uppercase text-indigo-700 font-bold tracking-wider font-mono">Personalizado</span>
                          </div>
                          {anexo.fileName && (
                            <div className="mt-2 flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-mono">
                              <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-slate-800 block truncate">{anexo.fileName}</span>
                                <span className="text-[10px] text-slate-400">{anexo.fileSize} | {anexo.uploadedAt}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 text-xs font-bold transition">
                            <FileUp className="w-3.5 h-3.5" />
                            {anexo.fileName ? 'Substituir' : 'Anexar Arquivo'}
                            <input
                              type="file"
                              className="hidden"
                              onChange={e => {
                                if (e.target.files?.[0]) {
                                  const f = e.target.files[0];
                                  const updated = (currentSol.outrosAnexosOrdemInicio || []).map(a =>
                                    a.id === anexo.id
                                      ? { ...a, fileName: f.name, fileSize: `${(f.size / 1024).toFixed(0)} KB`, uploadedAt: new Date().toLocaleDateString('pt-BR') }
                                      : a
                                  );
                                  onUpdate({ ...currentSol, outrosAnexosOrdemInicio: updated });
                                }
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (currentSol.outrosAnexosOrdemInicio || []).filter(a => a.id !== anexo.id);
                              onUpdate({ ...currentSol, outrosAnexosOrdemInicio: updated });
                            }}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition"
                            title="Remover campo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Save button */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              {ordemSalva && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 font-sans">
                  <CheckCircle className="w-4 h-4" />
                  Ordem de Início salva com sucesso!
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  onUpdate({
                    ...currentSol,
                    dataOrdemInicio: ordemDataInicio || undefined,
                    ataOrdemInicioFileName: ataFile?.name,
                    ataOrdemInicioFileSize: ataFile?.size,
                    ataOrdemInicioUploadedAt: ataFile ? new Date().toLocaleDateString('pt-BR') : undefined,
                    cronogramaFisicoFinanceiroFileName: cronogFile?.name,
                    cronogramaFisicoFinanceiroFileSize: cronogFile?.size,
                    cronogramaFisicoFinanceiroUploadedAt: cronogFile ? new Date().toLocaleDateString('pt-BR') : undefined,
                  });
                  setOrdemSalva(true);
                  setTimeout(() => setOrdemSalva(false), 3500);
                }}
                className="px-6 py-2.5 bg-[#13264d] hover:bg-[#1a3a6e] text-white text-xs font-black rounded-xl transition font-sans shadow-sm tracking-wide uppercase"
              >
                Salvar Ordem de Início
              </button>
            </div>

          </div>
          )} {/* fim do ternário distratada/não-distratada */}

          {/* Histórico de Ordens de Início anteriores (empresas distratadas) */}
          {(currentSol.empresasAnteriores || []).filter(e => e.dataOrdemInicio).length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                Histórico de Ordens de Início Anteriores
              </h4>
              {(currentSol.empresasAnteriores || []).filter(e => e.dataOrdemInicio).map((emp, idx) => (
                <div key={emp.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">
                        {idx + 1}ª Empresa — {emp.nome || emp.cnpj || 'Empresa anterior'}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wide rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                      Distratada
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Data Ordem de Início</span>
                      <p className="font-mono font-bold text-slate-700">
                        {emp.dataOrdemInicio ? new Date(emp.dataOrdemInicio).toLocaleDateString('pt-BR') : '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Fiscal</span>
                      <p className="font-bold text-slate-700">{emp.fiscalObraAtribuido || '—'}</p>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Duração Contratada</span>
                      <p className="font-bold text-slate-700">{emp.duracaoObraMeses ? `${emp.duracaoObraMeses} meses` : '—'}</p>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Data do Distrato</span>
                      <p className="font-mono font-bold text-rose-700">
                        {emp.dataDistrato ? new Date(emp.dataDistrato).toLocaleDateString('pt-BR') : '—'}
                      </p>
                    </div>
                  </div>
                  {(emp.ataOrdemInicioFileName || emp.cronogramaFisicoFinanceiroFileName || (emp.outrosAnexosOrdemInicio || []).length > 0) && (
                    <div className="pt-2 border-t border-slate-200 space-y-1.5">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Documentos Anexados</span>
                      <div className="flex flex-wrap gap-2">
                        {emp.ataOrdemInicioFileName && (
                          <span className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg font-mono">
                            <FileText className="w-3 h-3 text-blue-400 shrink-0" />
                            {emp.ataOrdemInicioFileName}
                            {emp.ataOrdemInicioFileSize && <span className="text-slate-400 ml-0.5">({emp.ataOrdemInicioFileSize})</span>}
                          </span>
                        )}
                        {emp.cronogramaFisicoFinanceiroFileName && (
                          <span className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg font-mono">
                            <FileText className="w-3 h-3 text-indigo-400 shrink-0" />
                            {emp.cronogramaFisicoFinanceiroFileName}
                            {emp.cronogramaFisicoFinanceiroFileSize && <span className="text-slate-400 ml-0.5">({emp.cronogramaFisicoFinanceiroFileSize})</span>}
                          </span>
                        )}
                        {(emp.outrosAnexosOrdemInicio || []).filter(a => a.fileName).map(a => (
                          <span key={a.id} className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg font-mono">
                            <FileText className="w-3 h-3 text-emerald-400 shrink-0" />
                            {a.fileName}
                            {a.fileSize && <span className="text-slate-400 ml-0.5">({a.fileSize})</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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
                      Aprovada: 'bg-emerald-50 border-emerald-250 text-emerald-700',
                      'Aprovada com Ressalvas': 'bg-amber-50 border-amber-250 text-amber-700',
                      Reprovada: 'bg-rose-50 border-rose-200 text-rose-700',
                      emitido: 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    };
                    const sc = statusColors[v.resultado || ''] || 'bg-slate-50 border-slate-200 text-slate-700';

                    return (
                      <div key={v.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-black text-slate-400">{v.dataVistoria}</span>
                            <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase border font-sans ${sc}`}>
                              {v.resultado || 'Relatório de Visita'}
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

                        {v.laudoResumido && (
                          <p className="text-xs text-slate-705 leading-relaxed font-sans text-left">
                            {v.laudoResumido}
                          </p>
                        )}

                        {v.nomeRelatorio && (
                          <div className="flex items-center gap-2 mt-1 pt-1.5 border-t border-slate-200/50">
                            <span className="text-[9px] uppercase font-extrabold text-slate-400">Relatório técnico:</span>
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                alert(`Visualizando documento técnico: ${v.nomeRelatorio}`);
                              }}
                              className="inline-flex items-center gap-1.5 px-2 py-1 bg-indigo-50 border border-indigo-250 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-805 transition-colors text-[10px] font-black rounded-lg decoration-none cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-indigo-600" />
                              {v.nomeRelatorio} {v.tamanhoRelatorio && `(${v.tamanhoRelatorio})`}
                            </a>
                          </div>
                        )}
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
                    readOnly
                    placeholder="Nome do engenheiro fiscal"
                    value={vistoVistoriador}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50/60 text-slate-500 font-bold cursor-not-allowed"
                  />
                  <span className="text-[9.5px] text-indigo-500 block font-medium mt-0.5">
                    ℹ️ Preenchido automaticamente conforme designação vinculada ao cadastro da obra.
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">
                    Detalhamento Técnico da Visita *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Descreva as estruturas inspecionadas, medições em campo e principais anotações da visita de fiscalização..."
                    value={vistoLaudoResumido}
                    onChange={(e) => setVistoLaudoResumido(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">
                    Relatório de Visita Oficial (PDF / Imagem) *
                  </label>
                  
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        const file = e.dataTransfer.files[0];
                        setRelatorioVisitaFile({
                          name: file.name,
                          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                        });
                      }
                    }}
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${
                      isDragOver
                        ? 'border-indigo-600 bg-indigo-50/50'
                        : relatorioVisitaFile
                          ? 'border-emerald-500 bg-emerald-50/10'
                          : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
                    }`}
                  >
                    <input
                      type="file"
                      id="relatorio-visita-upload-input"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setRelatorioVisitaFile({
                            name: file.name,
                            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                          });
                        }
                      }}
                    />
                    <label htmlFor="relatorio-visita-upload-input" className="cursor-pointer block w-full">
                      {relatorioVisitaFile ? (
                        <div className="flex flex-col items-center gap-1">
                          <FileText className="w-8 h-8 text-emerald-600 animate-bounce" />
                          <span className="text-xs font-black text-slate-800 break-all">{relatorioVisitaFile.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({relatorioVisitaFile.size})</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setRelatorioVisitaFile(null);
                            }}
                            className="mt-1.5 px-2.5 py-1 bg-rose-50 hover:bg-rose-100/80 border border-rose-250 text-rose-700 hover:text-rose-800 transition-colors text-[9.5px] font-black rounded-lg uppercase cursor-pointer"
                          >
                            Remover arquivo
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 py-1">
                          <FileUp className="w-8 h-8 text-indigo-500" />
                          <p className="text-xs font-bold text-slate-705">Arrastar o Relatório de Visita ou clique para selecionar</p>
                          <span className="text-[9.5px] text-slate-400 block font-normal">Suporta arquivos PDF, DOCX, ou Imagens (Max. 10MB)</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 text-xs text-white font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer shadow-3xs hover:shadow-xs transition-all"
                  >
                    Registrar Visita com Relatório
                  </button>
                </div>
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
                Não Conformidades Ativas e Histórico de Pendências de Campo
              </h3>

              {listRestricoes.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">Obra sem não conformidades ou entraves ativos!</p>
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
                              title="Excluir não conformidade"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs font-semibold text-slate-700 font-sans leading-relaxed text-left w-full">
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
                                Resolver Não Conformidade da Obra
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
                <AlertCircle className="w-4 h-4 text-rose-500 animate-pulse" /> Reportar Nova Não Conformidade
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
                  Registrar Entrave / Não Conformidade
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* LIÇÕES APRENDIDAS TAB CONTENT */}
      {activeTab === 'licoes_aprendidas' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn text-left">
          {/* List of lessons learned */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-50 pb-3">
                Lições Aprendidas Registradas
              </h3>

              {listLicoesAprendidas.length === 0 ? (
                <div className="p-8 text-center bg-amber-50 rounded-xl border border-dashed border-amber-200">
                  <Lightbulb className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">Nenhuma lição aprendida registrada ainda.</p>
                  <p className="text-[10.5px] text-slate-500 mt-1">É necessário registrar pelo menos 1 lição aprendida para liberar o encerramento da obra.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {listLicoesAprendidas.map((l) => (
                    <div key={l.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {l.categoria && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                              {l.categoria}
                            </span>
                          )}
                          <span className="text-[10.5px] font-bold text-slate-400">Registrada em: {l.dataRegistro}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => deletarLicaoAprendida(l.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                          title="Excluir lição aprendida"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 font-sans leading-relaxed">
                        {l.descricao}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* New lesson learned form */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs text-left">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5 mb-3">
                <Lightbulb className="w-4 h-4 text-amber-500" /> Registrar Nova Lição Aprendida
              </h3>

              <form onSubmit={adicNovaLicaoAprendida} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">
                    Categoria
                  </label>
                  <select
                    value={licaoCategoria}
                    onChange={(e) => setLicaoCategoria(e.target.value as any)}
                    className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 cursor-pointer"
                  >
                    <option value="Técnica">Técnica</option>
                    <option value="Gestão">Gestão</option>
                    <option value="Cronograma">Cronograma</option>
                    <option value="Fornecedor">Fornecedor</option>
                    <option value="Financeira">Financeira</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">
                    Descrição da Lição Aprendida *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Descreva o que aconteceu, o que foi aprendido e como isso pode ajudar em obras futuras..."
                    value={licaoDesc}
                    onChange={(e) => setLicaoDesc(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 text-xs text-white font-black uppercase tracking-wider bg-amber-600 hover:bg-amber-700 rounded-xl cursor-pointer shadow-3xs"
                >
                  Registrar Lição Aprendida
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
function SubMedicoes({ currentSol, onUpdate, somenteLeitura = false }: { currentSol: Solicitacao | null; onUpdate: (sol: Solicitacao) => void; somenteLeitura?: boolean }) {
  const [valorM, setValorM] = useState('');
  const [porcentagemM, setPorcentagemM] = useState('');
  const [descricaoM, setDescricaoM] = useState('');

  // New detailed measurement fields
  const [numeroM, setNumeroM] = useState('');
  const [periodoMInicio, setPeriodoMInicio] = useState('');
  const [periodoMFim, setPeriodoMFim] = useState('');
  const [dataM, setDataM] = useState('');
  const [responsavelM, setResponsavelM] = useState('');
  const [observacoesM, setObservacoesM] = useState('');
  const [porcentagemFisicaM, setPorcentagemFisicaM] = useState('');
  const [relatorioFileName, setRelatorioFileName] = useState('');
  const [boletimFileName, setBoletimFileName] = useState('');
  
  // Validation feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [activeTab, setActiveTab] = useState<'historico' | 'nova_medicao'>('historico');

  if (!currentSol) return <NoObraSelected />;

  const isDistratada = currentSol.statusContratoEmpresa === 'Distratada';
  const isEmExecucao = computeStatusObra(currentSol).label === 'Em execução';
  const podeRegistrarMedicao = isEmExecucao && !isDistratada;
  const currentCnpj = currentSol.cnpjEmpresa || '';

  // Separação de medições por empresa
  const allCnpjsAnteriores = new Set(
    (currentSol.empresasAnteriores || []).map(e => e.cnpj).filter(Boolean)
  );
  const medicoesDaEmpresaAtual = (currentSol.medicoes || []).filter(m =>
    currentCnpj ? m.empresaCnpj === currentCnpj : !allCnpjsAnteriores.has(m.empresaCnpj || '')
  );

  // Valores financeiros — empresa atual
  const contratoEmpresaAtual = currentSol.contratoValorInicial || currentSol.valorHomologadoContratacao || currentSol.valorPlanilha || 1;
  const sumMedicoesEmpresaAtual = medicoesDaEmpresaAtual.reduce((sum, m) => sum + m.valor, 0);
  const restanteEmpresaAtual = Math.max(0, contratoEmpresaAtual - sumMedicoesEmpresaAtual);

  // Valores financeiros — empresas anteriores (acumulado histórico)
  const valorExecutadoAnteriores = (currentSol.empresasAnteriores || []).reduce(
    (sum, e) => sum + (e.valorExecutado ?? 0), 0
  );
  // Totais da obra (todas as empresas)
  const sumMedicoes = valorExecutadoAnteriores + sumMedicoesEmpresaAtual;
  // Orçamento fixo da obra (PAF) — não soma contratos, pois cada nova empresa contrata pelo saldo restante
  // Ex: PAF=250k, Emp1 executa 50k e distratos, Emp2 contrata 200k (saldo). Total obra = 250k.
  const originalBudget = currentSol.valorPlanilha || currentSol.valorHomologado
    || (currentSol.empresasAnteriores?.[0]?.contratoValorInicial ?? 0)
    || contratoEmpresaAtual;
  const leftOver = restanteEmpresaAtual;

  // Avanço físico — empresa atual (base: contrato desta empresa)
  const fisicoEmpresaAtual = contratoEmpresaAtual > 0
    ? Math.min(100, (sumMedicoesEmpresaAtual / contratoEmpresaAtual) * 100)
    : 0;

  // Avanço físico acumulado da obra (base: orçamento PAF fixo)
  // Ex: PAF=250k, executado total=50k → 50k/250k = 20%
  const percentualFisicoAcumulado = originalBudget > 0
    ? Math.min(100, (sumMedicoes / originalBudget) * 100)
    : 0;
  const percentualFinanceiroAcumulado = percentualFisicoAcumulado;

  // Disponível para medição da empresa atual (até atingir 100% do seu contrato)
  const fisicoDisponivel = Math.max(0, 100 - fisicoEmpresaAtual);

  // Saldo liberado pelo PAF (todas as parcelas pagas pela SEE) vs. total já medido na obra
  // (todas as empresas) — controle financeiro independente do limite contratual acima.
  const totalLiberadoPAF = (currentSol.parcelasPAF || []).reduce((acc, p) => acc + (p.valor || 0), 0);
  const totalMedidoPAF = (currentSol.medicoes || []).reduce((acc, m) => acc + (m.valor || 0), 0);
  const saldoDisponivelPAF = totalLiberadoPAF - totalMedidoPAF;

  // Sync state on school/project change or when measurements list size changes
  useEffect(() => {
    if (currentSol) {
      const nextNum = ((currentSol.medicoes?.length || 0) + 1).toString();
      setNumeroM(nextNum);
      setDataM(new Date().toISOString().split('T')[0]);
      setResponsavelM(currentSol.fiscalObraAtribuido || '');
      setPeriodoMInicio('');
      setPeriodoMFim('');
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
      // Sugerir físico limitado ao disponível
      const sugerido = Math.min(parseFloat(calcPercent), fisicoDisponivel).toFixed(2);
      setPorcentagemFisicaM(sugerido);
    } else {
      setPorcentagemM('');
      setPorcentagemFisicaM('');
    }
  };

  const registrarNovaMedicao = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    setErrorMessage(null);

    if (isDistratada) {
      setErrorMessage('Obras com contrato distratado não permitem novas medições. Cadastre um novo contrato primeiro.');
      return;
    }
    if (!isEmExecucao) {
      setErrorMessage(`Medições só são permitidas quando a obra está Em execução. Status atual: "${computeStatusObra(currentSol).label}".`);
      return;
    }

    const responsavelFinal = responsavelM || currentSol.fiscalObraAtribuido || '';
    const camposFaltando: string[] = [];
    if (!valorM) camposFaltando.push('Valor Medido');
    if (!descricaoM) camposFaltando.push('Descrição');
    if (!numeroM) camposFaltando.push('Número da Medição');
    if (!periodoMInicio) camposFaltando.push('Período (início)');
    if (!periodoMFim) camposFaltando.push('Período (fim)');
    if (!dataM) camposFaltando.push('Data');
    if (!responsavelFinal) camposFaltando.push('Responsável (defina o fiscal na aba Cadastro de Obras)');
    if (camposFaltando.length > 0) {
      setErrorMessage(`Campos obrigatórios não preenchidos: ${camposFaltando.join(' · ')}.`);
      return;
    }

    const v = parseFloat(valorM);
    if (isNaN(v) || v <= 0) {
      setErrorMessage('Por favor, informe um valor de medição válido maior que zero.');
      return;
    }

    // Valida contra o orçamento da empresa atual (não o total da obra)
    if (v + sumMedicoesEmpresaAtual > contratoEmpresaAtual) {
      setErrorMessage(
        `Impossível Registrar: O valor desta medição (R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) somado ao total medido por esta empresa (R$ ${sumMedicoesEmpresaAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) excede o valor do contrato desta empresa de R$ ${contratoEmpresaAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
      );
      return;
    }

    // Valida contra o saldo já liberado pelo PAF — só quando há ao menos uma parcela
    // registrada (obras ainda sem parcelas lançadas não ficam travadas por este limite)
    if (totalLiberadoPAF > 0 && v > saldoDisponivelPAF) {
      setErrorMessage(
        `Impossível Registrar: o valor desta medição (R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) excede o saldo liberado disponível (R$ ${saldoDisponivelPAF.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Solicite a liberação de mais uma parcela do PAF antes de registrar esta medição.`
      );
      return;
    }

    // Valida a data fim do período da medição contra a vigência do contrato
    if (currentSol.contratoFimVigencia && periodoMFim > currentSol.contratoFimVigencia) {
      setErrorMessage(
        `A data fim da medição (${new Date(periodoMFim + 'T12:00:00').toLocaleDateString('pt-BR')}) é posterior ao fim da vigência do contrato (${new Date(currentSol.contratoFimVigencia + 'T12:00:00').toLocaleDateString('pt-BR')}). Verifique as datas antes de continuar.`
      );
      return;
    }

    // Percentual financeiro e físico desta medição (base: contrato desta empresa)
    const pFinanceira = porcentagemM ? parseFloat(porcentagemM) : (v / contratoEmpresaAtual) * 100;
    const pFisica = porcentagemFisicaM ? parseFloat(porcentagemFisicaM) : pFinanceira;

    if (!relatorioFileName || !boletimFileName) {
      setErrorMessage('Atenção: Os documentos "Relatório de Fiscalização" e "Boletim de Medição" são obrigatórios para aprovar a medição.');
      return;
    }

    const periodoFormatado = `${new Date(periodoMInicio + 'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(periodoMFim + 'T12:00:00').toLocaleDateString('pt-BR')}`;
    const empresaNomeFinal = currentSol.empresaContratada || 'Construtora Convencionada';
    const empresaCnpjFinal = currentSol.cnpjEmpresa || '01.242.000/0001-33';

    // Resolve o uuid real da solicitação (usa o cache local ou busca pelo codigo_sgo)
    let dbId = currentSol._dbId;
    if (!dbId) {
      const { data: solRow, error: solError } = await supabase
        .from('solicitacoes')
        .select('id')
        .eq('codigo_sgo', currentSol.id)
        .single();
      if (solError || !solRow) {
        setErrorMessage('Não foi possível localizar o registro da obra no banco para gravar a medição.');
        return;
      }
      dbId = solRow.id;
    }

    const { data: userData } = await supabase.auth.getUser();
    const numeroMedicaoInt = parseInt(numeroM, 10);

    const { data: medicaoRow, error: medicaoError } = await supabase
      .from('medicoes')
      .insert({
        solicitacao_id: dbId,
        numero_medicao: Number.isFinite(numeroMedicaoInt) ? numeroMedicaoInt : (currentSol.medicoes?.length || 0) + 1,
        numero_medicao_display: numeroM,
        valor: v,
        data_medicao: dataM,
        descricao: descricaoM,
        empresa_nome: empresaNomeFinal,
        empresa_cnpj: empresaCnpjFinal,
        periodo_medicao: periodoFormatado,
        responsavel_medicao: responsavelFinal,
        observacao: observacoesM || null,
        porcentagem: pFinanceira,
        porcentagem_fisica: pFisica,
        usuario_id: userData.user?.id ?? null,
      })
      .select('id')
      .single();

    if (medicaoError || !medicaoRow) {
      console.error('Erro ao gravar medição no Supabase:', medicaoError);
      setErrorMessage('Erro ao gravar a medição no banco de dados. Tente novamente.');
      return;
    }

    const novaM: Medicao = {
      id: medicaoRow.id,
      data: dataM,
      valor: v,
      porcentagem: pFinanceira,
      descricao: descricaoM,
      empresaNome: empresaNomeFinal,
      empresaCnpj: empresaCnpjFinal,
      numeroMedicao: numeroM,
      periodoMedicao: periodoFormatado,
      responsavelMedicao: responsavelFinal,
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
    setObservacoesM('');
    setPorcentagemFisicaM('');
    setRelatorioFileName('');
    setBoletimFileName('');
    setErrorMessage(null);
    setAttemptedSubmit(false);
  };

  const deletarMedicao = async (id: string) => {
    const { error } = await supabase.from('medicoes').delete().eq('id', id);
    if (error) {
      console.error('Erro ao excluir medição no Supabase:', error);
      return;
    }
    const updated = {
      ...currentSol,
      medicoes: currentSol.medicoes.filter(m => m.id !== id)
    };
    onUpdate(updated);
  };

  return (
    <div className="animate-fadeIn">

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('historico')}
          className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider transition-colors flex items-center gap-2 border-b-2 ${activeTab === 'historico' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <History className="w-4 h-4" /> Histórico de Medições ({currentSol.medicoes?.length || 0})
        </button>
        {!somenteLeitura && (
        <button
          type="button"
          onClick={() => podeRegistrarMedicao && setActiveTab('nova_medicao')}
          title={
            isDistratada ? 'Contrato distratado — cadastre um novo contrato para retomar medições' :
            !isEmExecucao ? `Medições só são permitidas quando a obra está Em execução. Status atual: "${computeStatusObra(currentSol).label}"` : ''
          }
          className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider transition-colors flex items-center gap-2 border-b-2 ${
            !podeRegistrarMedicao
              ? 'border-transparent text-slate-300 cursor-not-allowed'
              : activeTab === 'nova_medicao'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {!podeRegistrarMedicao ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          Registrar Nova Medição
          {!podeRegistrarMedicao && <span className="text-[9px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded font-black uppercase ml-1">Bloqueado</span>}
        </button>
        )}
      </div>

      {activeTab === 'historico' ? (
      <div className="space-y-4">
        
        {/* Progress bar visual cards */}
        <div className="bg-white rounded-2xl border border-slate-200/85 p-5 shadow-xs">
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-2 mb-4">
            <Layers className="w-4 h-4 text-emerald-500 animate-pulse" /> Relatório Físico-Financeiro Executivo
          </h3>

          {/* Alerta de distrato */}
          {isDistratada && (
            <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl mb-4 text-xs">
              <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-rose-800 uppercase text-[10px] tracking-wide">Contrato Distratado — Execução Congelada</p>
                <p className="text-rose-700 mt-0.5 font-medium leading-relaxed">
                  O avanço físico desta empresa foi congelado em <strong>{fisicoEmpresaAtual.toFixed(2)}%</strong>.
                  {fisicoDisponivel > 0 && ` Há ${fisicoDisponivel.toFixed(2)}% de avanço físico disponível para a próxima empresa contratada.`}
                  {!currentSol.empresaContratada && ' Cadastre um novo contrato para retomar as medições.'}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-5">
            {/* Contrato empresa atual */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Contrato Atual</span>
              <span className="text-xs font-black text-slate-800 font-mono block mt-0.5 truncate">
                R$ {contratoEmpresaAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Medido pela empresa atual */}
            <div className="p-3 bg-emerald-50/50 border border-emerald-200/40 rounded-xl text-left">
              <span className="text-[9px] uppercase font-bold text-emerald-600 block">Medido (Empresa)</span>
              <span className="text-xs font-black text-emerald-700 font-mono block mt-0.5 truncate">
                R$ {sumMedicoesEmpresaAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Saldo restante para esta empresa */}
            <div className="p-3 bg-slate-50/70 border border-slate-200/40 rounded-xl text-left">
              <span className="text-[9px] uppercase font-bold text-slate-500 block">Saldo da Empresa</span>
              <span className="text-xs font-black text-slate-600 font-mono block mt-0.5 truncate">
                R$ {restanteEmpresaAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Avanço físico da empresa atual */}
            <div className="p-3 bg-blue-50/60 border border-blue-200/30 rounded-xl text-left">
              <span className="text-[9px] uppercase font-extrabold text-blue-600 block flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                Avan. Empresa Atual
              </span>
              <span className="text-base font-black text-blue-700 font-mono block mt-0.5">
                {fisicoEmpresaAtual.toFixed(2)}%
              </span>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${fisicoEmpresaAtual}%` }} />
              </div>
              <p className="text-[9px] text-blue-500 mt-1 font-medium">
                Disponível: {fisicoDisponivel.toFixed(1)}%
              </p>
            </div>

            {/* Avanço acumulado da obra (todas as empresas, base monetária) */}
            <div className="p-3 bg-teal-50/60 border border-teal-200/30 rounded-xl text-left">
              <span className="text-[9px] uppercase font-extrabold text-teal-700 block flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span> Acumulado Obra
              </span>
              <span className="text-base font-black text-teal-800 font-mono block mt-0.5">
                {percentualFisicoAcumulado.toFixed(2)}%
              </span>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div className="bg-teal-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentualFisicoAcumulado}%` }} />
              </div>
              {(currentSol.empresasAnteriores || []).length > 0 && (
                <p className="text-[9px] text-slate-500 mt-1 font-medium">
                  {(currentSol.empresasAnteriores || []).length} contrato(s) anterior(es)
                </p>
              )}
            </div>
          </div>

          {/* Measurements List — separado por empresa */}
          <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-3 block text-left">Histórico de Medições por Empresa</h4>

          {(currentSol.medicoes || []).length > 0 ? (() => {
            const renderMedicaoCard = (m: typeof currentSol.medicoes[0], isHistorica: boolean) => {
              const mPhysPercent = m.porcentagemFisica !== undefined ? m.porcentagemFisica : m.porcentagem;
              return (
                <div key={m.id} className={`p-4 rounded-xl border text-xs shadow-3xs transition-all text-left ${isHistorica ? 'bg-slate-100/60 border-slate-300/60' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="space-y-1.5 font-sans flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-slate-200 text-slate-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase font-mono tracking-wider">
                          MED {m.numeroMedicao || '---'}
                        </span>
                        <span className="font-extrabold text-slate-800 text-sm">{m.descricao}</span>
                        {isHistorica && <span className="text-[9px] bg-slate-300 text-slate-600 px-1.5 py-0.5 rounded font-black uppercase">Congelada</span>}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-1 gap-x-4 text-[10px] text-slate-500 font-medium">
                        <div className="flex items-center gap-1"><span>📅</span> <strong>Medido em:</strong> {m.data}</div>
                        <div className="flex items-center gap-1"><span>⏳</span> <strong>Período:</strong> {m.periodoMedicao || '---'}</div>
                        <div className="flex items-center gap-1"><span>👤</span> <strong>Responsável:</strong> {m.responsavelMedicao || '---'}</div>
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
                      {!isHistorica && (
                        <button type="button" onClick={() => deletarMedicao(m.id)}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all cursor-pointer inline-flex items-center self-end"
                          title="Excluir medição">
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2.5 mt-3 border-t border-slate-150">
                    {m.relatorioFiscalizacaoFileName ? (
                      <div className="flex items-center gap-1.5 bg-blue-50/65 px-2.5 py-1 rounded-lg border border-blue-105 text-[10px] text-blue-700">
                        <FileText className="w-3.5 h-3.5 shrink-0 text-blue-550" />
                        <span className="font-semibold block truncate max-w-[170px]" title={m.relatorioFiscalizacaoFileName}>{m.relatorioFiscalizacaoFileName}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 text-[10px] text-amber-700">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /><span>Relatório não localizado</span>
                      </div>
                    )}
                    {m.boletimMedicaoFileName ? (
                      <div className="flex items-center gap-1.5 bg-teal-50/65 px-2.5 py-1 rounded-lg border border-teal-105 text-[10px] text-teal-700">
                        <FileCheck className="w-3.5 h-3.5 shrink-0 text-teal-550" />
                        <span className="font-semibold block truncate max-w-[170px]" title={m.boletimMedicaoFileName}>{m.boletimMedicaoFileName}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-105 text-[10px] text-amber-750">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /><span>Boletim de medição ausente</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            };

            return (
              <div className="space-y-5 max-h-[560px] overflow-y-auto pr-1">
                {/* Empresa atual */}
                {(currentSol.empresaContratada || medicoesDaEmpresaAtual.length > 0) && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        Empresa Atual {currentSol.empresaContratada ? `— ${currentSol.empresaContratada}` : ''}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium">Físico: {fisicoEmpresaAtual.toFixed(2)}%</span>
                    </div>
                    {medicoesDaEmpresaAtual.length > 0
                      ? <div className="space-y-3">{medicoesDaEmpresaAtual.map(m => renderMedicaoCard(m, false))}</div>
                      : <div className="text-center py-4 border border-dashed border-emerald-200 rounded-xl text-slate-400 text-[11px] font-medium">Nenhuma medição desta empresa ainda.</div>
                    }
                  </div>
                )}

                {/* Empresas anteriores distratadas */}
                {(currentSol.empresasAnteriores || []).map(emp => {
                  const medsEmpresa = (currentSol.medicoes || []).filter(m => m.empresaCnpj === emp.cnpj);
                  return (
                    <div key={emp.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[9px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                          Distratada — {emp.nome}
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium">Físico congelado: {(emp.avancoFisicoOriginal || 0).toFixed(2)}%</span>
                        {emp.dataDistrato && <span className="text-[9px] text-slate-400">• Distrato: {new Date(emp.dataDistrato).toLocaleDateString('pt-BR')}</span>}
                      </div>
                      {medsEmpresa.length > 0
                        ? <div className="space-y-3">{medsEmpresa.map(m => renderMedicaoCard(m, true))}</div>
                        : <div className="text-center py-4 border border-dashed border-rose-200 rounded-xl text-slate-400 text-[11px] font-medium">
                            Avanço físico de {(emp.avancoFisicoOriginal || 0).toFixed(2)}% congelado no histórico.
                          </div>
                      }
                    </div>
                  );
                })}
              </div>
            );
          })() : (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-slate-500 text-[11px] font-medium bg-slate-50/50">
              Nenhuma medição física homologada no momento. Registre a primeira medição no formulário ao lado.
            </div>
          )}
        </div>

      </div>
      ) : (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs text-left max-w-2xl mx-auto">
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

        {/* Saldo liberado pelo PAF — controle financeiro independente do limite contratual */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-left">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Total Liberado (SEE)</span>
            <span className="text-xs font-black text-slate-800 font-mono block mt-0.5 truncate">
              R$ {totalLiberadoPAF.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-left">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Total Já Medido</span>
            <span className="text-xs font-black text-slate-800 font-mono block mt-0.5 truncate">
              R$ {totalMedidoPAF.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className={`p-2.5 border rounded-xl text-left ${saldoDisponivelPAF >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            <span className={`text-[9px] uppercase font-bold block ${saldoDisponivelPAF >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Saldo Disponível p/ Medir</span>
            <span className={`text-xs font-black font-mono block mt-0.5 truncate ${saldoDisponivelPAF >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              R$ {saldoDisponivelPAF.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

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
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-slate-400 font-bold block mb-0.5">Data Início</label>
                <input
                  type="date"
                  required
                  value={periodoMInicio}
                  onChange={(e) => {
                    setPeriodoMInicio(e.target.value);
                    setErrorMessage(null);
                  }}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden font-mono"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-400 font-bold block mb-0.5">Data Fim</label>
                <input
                  type="date"
                  required
                  min={periodoMInicio}
                  value={periodoMFim}
                  onChange={(e) => {
                    setPeriodoMFim(e.target.value);
                    setErrorMessage(null);
                  }}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">
              Responsável pela Medição
              <span className="ml-1 text-[9px] text-blue-500 font-medium normal-case">(Fiscal da Obra atribuído)</span>
            </label>
            <input
              type="text"
              readOnly
              value={responsavelM || currentSol.fiscalObraAtribuido || 'Fiscal não atribuído'}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-semibold cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Valor Medido (R$)*</label>
              <input
                data-testid="medicao-valor"
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
              <span className="text-[9.5px] font-extrabold text-slate-700 block mb-1">1. Relatório de Fiscalização*</span>
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
                    <span className="text-slate-500 font-semibold text-[9px] block">Arraste ou Clique para anexar o Relatório (PDF)</span>
                  )}
                </span>
              </label>
            </div>

            {/* Boletim de Medição */}
            <div className={`border p-2.5 rounded-xl transition-colors ${
              attemptedSubmit && !boletimFileName ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200 bg-slate-50/50'
            }`}>
              <span className="text-[9.5px] font-extrabold text-slate-700 block mb-1">2. Boletim de Medição*</span>
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
                    <span className="text-slate-500 font-semibold text-[9px] block">Arraste ou Clique para anexar a Planilha (Excel/PDF)</span>
                  )}
                </span>
              </label>
            </div>

          </div>

          {/* Value warning simulator */}
          {valorM && !errorMessage && (
            <div className="bg-slate-50 p-3 rounded-xl text-[10.5px] font-mono shadow-inner text-slate-600 block space-y-1 border border-slate-200">
              <span className="font-extrabold text-slate-700 block border-b border-slate-200 pb-1 uppercase text-[9px] tracking-wider">Detalhamento dos Limites</span>
              <div className="flex justify-between">
                <span>Total da Obra (PAF):</span>
                <span className="font-bold text-slate-700">R$ {originalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
            data-testid="medicao-registrar"
            id="sub-medicao-nova-btn"
            type="submit"
            className="w-full py-2.5 text-xs text-white font-black uppercase bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer transition-colors shadow-3xs hover:shadow-xs flex items-center justify-center gap-1"
          >
            <FileCheck className="w-4 h-4" /> Validar e Homologar Medição
          </button>
        </form>
      </div>
      )}

    </div>
  );
}

// --- 4. SUB CONTRATOS ---
function SubContratos({
  currentSol,
  onUpdate,
  empresasSeguranca = [],
  todasSolicitacoes = [],
  selectedSolId = '',
  setSelectedSolId,
  somenteLeitura = false
}: {
  currentSol: Solicitacao | null;
  onUpdate: (sol: Solicitacao) => void;
  empresasSeguranca?: EmpresaSeguranca[];
  somenteLeitura?: boolean;
  todasSolicitacoes?: Solicitacao[];
  selectedSolId?: string;
  setSelectedSolId?: (id: string) => void;
}) {
  // 1. FILTER CONTROLS FOR THE SEARCH FILTER CARD (Obras em processo de contratação Only)
  const [filtroIdContrato, setFiltroIdContrato] = useState('todos');
  const [filtroCodescContrato, setFiltroCodescContrato] = useState('todos');
  const [filtroMunicipioContrato, setFiltroMunicipioContrato] = useState('todos');
  const [filtroSreContrato, setFiltroSreContrato] = useState('todos');
  const [filtroEscolaContrato, setFiltroEscolaContrato] = useState('todos');
  const [filtroResponsavelContrato, setFiltroResponsavelContrato] = useState('todos');

  // Filter list of works in process of contracting (Obras em processo de contratação)
  const worksInContratacao = useMemo(() => {
    return (todasSolicitacoes || []).filter(sol => {
      const isConcluida  = sol.statusObra === 'Concluída';
      const hasContrato  = !!(sol.contratoDataAssinatura && sol.statusContratoEmpresa !== 'Distratada');
      return !isConcluida && !hasContrato;
    });
  }, [todasSolicitacoes]);

  // Extract unique criteria options
  const uniqueIds = useMemo(() => Array.from(new Set(worksInContratacao.map(s => s.id).filter(Boolean))).sort(), [worksInContratacao]);
  const uniqueCodescs = useMemo(() => Array.from(new Set(worksInContratacao.map(s => s.codesc).filter(Boolean))).sort(), [worksInContratacao]);
  const uniqueMunicipios = useMemo(() => Array.from(new Set(worksInContratacao.map(s => s.municipio).filter(Boolean))).sort(), [worksInContratacao]);
  const uniqueSres = useMemo(() => Array.from(new Set(worksInContratacao.map(s => s.sre).filter(Boolean))).sort(), [worksInContratacao]);
  const uniqueEscolas = useMemo(() => Array.from(new Set(worksInContratacao.map(s => s.nomeEscola).filter(Boolean))).sort(), [worksInContratacao]);
  const uniqueResponsaveis = useMemo(() => Array.from(new Set(worksInContratacao.map(s => s.fiscalObraAtribuido || 'Não Definido').filter(Boolean))).sort(), [worksInContratacao]);

  // Apply filters
  const worksFiltradasContratacao = useMemo(() => {
    return worksInContratacao.filter(sol => {
      if (filtroIdContrato !== 'todos' && sol.id !== filtroIdContrato) return false;
      if (filtroCodescContrato !== 'todos' && sol.codesc !== filtroCodescContrato) return false;
      if (filtroMunicipioContrato !== 'todos' && sol.municipio !== filtroMunicipioContrato) return false;
      if (filtroSreContrato !== 'todos' && sol.sre !== filtroSreContrato) return false;
      if (filtroEscolaContrato !== 'todos' && sol.nomeEscola !== filtroEscolaContrato) return false;
      
      const resp = sol.fiscalObraAtribuido || 'Não Definido';
      if (filtroResponsavelContrato !== 'todos' && resp !== filtroResponsavelContrato) return false;
      
      return true;
    });
  }, [worksInContratacao, filtroIdContrato, filtroCodescContrato, filtroMunicipioContrato, filtroSreContrato, filtroEscolaContrato, filtroResponsavelContrato]);

  const [selectedEmpresaId, setSelectedEmpresaId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [modalCadastroAberto, setModalCadastroAberto] = useState(false);
  const [modalAlteracaoAberto, setModalAlteracaoAberto] = useState(false);
  const [modalDistratoAberto, setModalDistratoAberto] = useState(false);
  const [distratoJustificativa, setDistratoJustificativa] = useState('');
  const [distratoData, setDistratoData] = useState('');
  const [distratoFile, setDistratoFile] = useState<{ name: string; size: string } | null>(null);
  const [empresaInput, setEmpresaInput] = useState('');
  const [cnpjInput, setCnpjInput] = useState('');
  const [tipoAcaoInput, setTipoAcaoInput] = useState<'alteracao' | 'distrato'>('alteracao');
  const [duracaoInput, setDuracaoInput] = useState('6');

  // New states for extended fields
  const [valorInicialInput, setValorInicialInput] = useState('0');
  const [dataAssinaturaInput, setDataAssinaturaInput] = useState('2026-01-01');
  const [inicioVigenciaInput, setInicioVigenciaInput] = useState('2026-01-15');
  const [fimVigenciaInput, setFimVigenciaInput] = useState('2026-07-15');

  const [garantiaExigidaInput, setGarantiaExigidaInput] = useState('Sem Garantia');
  const [garantiaValorInput, setGarantiaValorInput] = useState('0');
  const [garantiaTipoInput, setGarantiaTipoInput] = useState('');
  const [garantiaValidadeInput, setGarantiaValidadeInput] = useState('');

  // Sync logic when currentSol changes
  useEffect(() => {
    if (currentSol) {
      const foiDistratada = currentSol.statusContratoEmpresa === 'Distratada';

      if (foiDistratada) {
        // Após distrato: campos de nova contratação chegam em branco
        setSelectedEmpresaId('');
        setEmpresaInput('');
        setCnpjInput('');
        setTipoAcaoInput('alteracao');
        setDuracaoInput('');
        setValorInicialInput('');
        setDataAssinaturaInput('');
        setInicioVigenciaInput('');
        setFimVigenciaInput('');
        setGarantiaExigidaInput('Sem Garantia');
        setGarantiaValorInput('');
        setGarantiaTipoInput('');
        setGarantiaValidadeInput('');
      } else {
        const matched = empresasSeguranca.find(e => e.nome === currentSol.empresaContratada);
        setSelectedEmpresaId(matched ? matched.id : '');
        setEmpresaInput(currentSol.empresaContratada || '');
        setCnpjInput(currentSol.cnpjEmpresa || '');
        setTipoAcaoInput('alteracao');
        setDuracaoInput(currentSol.duracaoObraMeses?.toString() || '');
        setValorInicialInput((currentSol.contratoValorInicial ?? '').toString());
        setDataAssinaturaInput(currentSol.contratoDataAssinatura || '');
        setInicioVigenciaInput(currentSol.contratoInicioVigencia || '');
        setFimVigenciaInput(currentSol.contratoFimVigencia || '');
        setGarantiaExigidaInput(currentSol.garantiaExigida || 'Sem Garantia');
        setGarantiaValorInput((currentSol.garantiaValor || 0).toString());
        setGarantiaTipoInput(currentSol.garantiaTipo || '');
        setGarantiaValidadeInput(currentSol.garantiaValidade || '');
      }
    } else {
      setSelectedEmpresaId('');
      setEmpresaInput('');
      setCnpjInput('');
      setTipoAcaoInput('alteracao');
      setDuracaoInput('');
      setValorInicialInput('');
      setDataAssinaturaInput('');
      setInicioVigenciaInput('');
      setFimVigenciaInput('');
      setGarantiaExigidaInput('Sem Garantia');
      setGarantiaValorInput('');
      setGarantiaTipoInput('');
      setGarantiaValidadeInput('');
    }
  }, [currentSol, empresasSeguranca]);

  // ── Tela de listagem: nenhuma obra selecionada ───────────────────────────
  if (!currentSol) {
    const totalComContrato = todasSolicitacoes.filter(s => s.contratoValorInicial && s.contratoDataAssinatura).length;
    const fmtC = (v?: number) => v ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';

    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        {/* Cabeçalho */}
        <div>
          <h2 className="text-base font-extrabold text-slate-800 font-sans flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-500" /> Gestão de Contratos de Obra
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Selecione uma obra para gerenciar ou cadastrar o contrato.
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-amber-700">{worksFiltradasContratacao.length}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Aguardando Contrato</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-emerald-700">{totalComContrato}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Com Contrato Ativo</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-slate-700">{todasSolicitacoes.length}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Total de Obras</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 items-center">
          {[
            { label: 'Município', value: filtroMunicipioContrato, set: setFiltroMunicipioContrato, opts: uniqueMunicipios },
            { label: 'SRE',       value: filtroSreContrato,       set: setFiltroSreContrato,       opts: uniqueSres },
            { label: 'Escola',    value: filtroEscolaContrato,    set: setFiltroEscolaContrato,    opts: uniqueEscolas },
          ].map(f => (
            <select key={f.label} value={f.value} onChange={e => f.set(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="todos">{f.label}: Todos</option>
              {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
          {(filtroMunicipioContrato !== 'todos' || filtroSreContrato !== 'todos' || filtroEscolaContrato !== 'todos') && (
            <button type="button"
              onClick={() => { setFiltroMunicipioContrato('todos'); setFiltroSreContrato('todos'); setFiltroEscolaContrato('todos'); }}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer font-bold">
              ✕ Limpar filtros
            </button>
          )}
        </div>

        {/* Lista de obras */}
        {worksFiltradasContratacao.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm space-y-2">
            <ClipboardList className="w-10 h-10 mx-auto opacity-20" />
            <p className="font-semibold">Nenhuma obra aguardando contratação.</p>
            <p className="text-xs">Todas as obras já possuem contrato formalizado ou estão em outro status.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {worksFiltradasContratacao.map(sol => (
              <div key={sol.id}
                className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-4 hover:border-blue-200 transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-800 truncate">{sol.nomeEscola}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {sol.id} · CODESC {sol.codesc} · {sol.municipio}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold">{sol.tipo}</span>
                      <span className="text-[9px] bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded font-semibold border border-violet-100">
                        PAF: {fmtC(sol.valorPlanilha || sol.valorHomologado)}
                      </span>
                      {sol.sre && (
                        <span className="text-[9px] text-slate-400">{sol.sre}</span>
                      )}
                      {sol.fiscalObraAtribuido && (
                        <span className="text-[9px] text-slate-400">Fiscal: {sol.fiscalObraAtribuido}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSolId?.(sol.id)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-[10px] font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition cursor-pointer shadow-sm whitespace-nowrap">
                  <Plus className="w-3.5 h-3.5" /> Cadastrar Contrato
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Dynamic calculations
  const valorInicial = parseFloat(valorInicialInput) || 0;
  const vigenciaInvalida = !!(inicioVigenciaInput && fimVigenciaInput && fimVigenciaInput < inicioVigenciaInput);
  
  // Sum approved aditivos
  const sumAditivos = currentSol?.aditivos
    ?.filter(a => a.status === 'Aprovado')
    .reduce((sum, a) => sum + (a.valorExtra || 0), 0) || 0;
    
  const valorAtualizado = valorInicial + sumAditivos;
  
  const sumMedicoes = currentSol?.medicoes?.reduce((sum, m) => sum + m.valor, 0) || 0;
  const saldoContratual = Math.max(0, valorAtualizado - sumMedicoes);
  const percentualExecutado = valorAtualizado > 0 ? (sumMedicoes / valorAtualizado) * 100 : 0;

  // Helper: calculate semaphore from a date string
  const calcSemaphore = (dateStr: string) => {
    if (!dateStr) return { dias: null as number | null, color: 'gray', label: 'Não Cadastrado' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (isNaN(diffDays)) return { dias: null as number | null, color: 'gray', label: 'Não Cadastrado' };
    if (diffDays > 90) return { dias: diffDays, color: 'green', label: 'Prazo Confortável (> 90 dias)' };
    if (diffDays >= 30) return { dias: diffDays, color: 'yellow', label: 'Prazo em Atenção (30 a 90 dias)' };
    return { dias: diffDays, color: 'red', label: 'Prazo Crítico (< 30 dias)' };
  };

  // Semáforo de Execução da Obra (fim da vigência do contrato)
  const obraSem = calcSemaphore(fimVigenciaInput || currentSol?.previsaoTerminoObra || '');
  const diasRestantes = obraSem.dias;
  const semaphoreColor = obraSem.color;
  const semaphoreLabel = obraSem.label;

  // Semáforo de Vigência do PAF
  const pafSem = calcSemaphore(currentSol?.dataVigenciaPAF || '');

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
    if (!currentSol) return;

    const isDistrato = tipoAcaoInput === 'distrato';

    if (!isDistrato) {
      const valorPAF = currentSol.valorPlanilha || currentSol.valorHomologado || 0;
      if (valorPAF > 0 && valorInicial > valorPAF) {
        alert(
          `Valor Homologado (Certame) não pode ser maior que o Valor Autorizado (PAF).\n\n` +
          `Certame: R$ ${valorInicial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
          `Autorizado (PAF): R$ ${valorPAF.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        );
        return;
      }
      if (vigenciaInvalida) {
        alert('O Fim da Vigência não pode ser anterior ao Início da Vigência.');
        return;
      }
    }

    let updatedEmpresasAnteriores = [...(currentSol.empresasAnteriores || [])];

    if (isDistrato && empresaInput) {
      const alreadyArchived = updatedEmpresasAnteriores.some(emp => emp.cnpj === cnpjInput);
      if (!alreadyArchived) {
        updatedEmpresasAnteriores.push({
          id: `prev_${Date.now()}`,
          nome: empresaInput,
          cnpj: cnpjInput,
          avancoFisicoOriginal: 0,
          dataDistrato: new Date().toISOString().split('T')[0]
        });
      }
    }

    const updated = {
      ...currentSol,
      empresaContratada: isDistrato ? '' : empresaInput,
      cnpjEmpresa: isDistrato ? '' : cnpjInput,
      statusContratoEmpresa: (isDistrato ? 'Distratada' : 'Ativa') as 'Ativa' | 'Distratada',
      duracaoObraMeses: parseInt(duracaoInput) || 6,
      contratoValorInicial: valorInicial,
      contratoDataAssinatura: dataAssinaturaInput,
      contratoInicioVigencia: inicioVigenciaInput,
      contratoFimVigencia: fimVigenciaInput,
      garantiaExigida: garantiaExigidaInput,
      garantiaValor: parseFloat(garantiaValorInput) || 0,
      garantiaTipo: garantiaTipoInput,
      garantiaValidade: garantiaValidadeInput,
      empresasAnteriores: updatedEmpresasAnteriores
    };

    onUpdate(updated);

    setShowForm(false);

    if (isDistrato) {
      setSelectedEmpresaId('');
      setEmpresaInput('');
      setCnpjInput('');
      setTipoAcaoInput('alteracao');
      alert('Contrato distratado com sucesso! A empresa anterior foi arquivada no histórico da obra.');
    } else {
      alert('Alteração contratual salva com sucesso!');
    }
  };

  const handleCadastrarContrato = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSol) return;

    const valorPAF = currentSol.valorPlanilha || currentSol.valorHomologado || 0;
    if (valorPAF > 0 && valorInicial > valorPAF) {
      alert(
        `Valor Homologado (Certame) não pode ser maior que o Valor Autorizado (PAF).\n\n` +
        `Certame: R$ ${valorInicial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
        `Autorizado (PAF): R$ ${valorPAF.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      );
      return;
    }

    if (vigenciaInvalida) {
      alert('O Fim da Vigência não pode ser anterior ao Início da Vigência.');
      return;
    }

    const isNovaEmpresaPosDistrato = currentSol.statusContratoEmpresa === 'Distratada';

    const updated = {
      ...currentSol,
      empresaContratada: empresaInput,
      cnpjEmpresa: cnpjInput,
      statusContratoEmpresa: 'Ativa' as 'Ativa' | 'Distratada',
      duracaoObraMeses: parseInt(duracaoInput) || 6,
      contratoValorInicial: valorInicial,
      contratoDataAssinatura: dataAssinaturaInput,
      contratoInicioVigencia: inicioVigenciaInput,
      contratoFimVigencia: fimVigenciaInput,
      garantiaExigida: garantiaExigidaInput,
      garantiaValor: parseFloat(garantiaValorInput) || 0,
      garantiaTipo: garantiaTipoInput,
      garantiaValidade: garantiaValidadeInput,
      ...(isNovaEmpresaPosDistrato ? {
        statusObra: 'Não Iniciada' as const,
        dataOrdemInicio: undefined,
        previsaoTerminoObra: undefined,
        fiscalObraAtribuido: undefined,
        fiscalObraAtribuidoId: undefined,
        cadastroObraConfirmado: false,
        classeObra: undefined,
        pontuacaoComplexidade: undefined,
        ataOrdemInicioFileName: undefined,
        ataOrdemInicioFileSize: undefined,
        ataOrdemInicioUploadedAt: undefined,
        outrosAnexosOrdemInicio: undefined,
        cronogramaFisicoFinanceiroFileName: undefined,
        cronogramaFisicoFinanceiroFileSize: undefined,
        cronogramaFisicoFinanceiroUploadedAt: undefined,
      } : {}),
    };

    onUpdate(updated);
    setModalCadastroAberto(false);
    alert(isNovaEmpresaPosDistrato
      ? 'Nova empresa cadastrada! É necessário realizar nova Ordem de Início antes de registrar medições.'
      : 'Contrato cadastrado com sucesso!');
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
      <div className={showForm ? "lg:col-span-2 space-y-6" : "lg:col-span-3 space-y-6"}>

        {/* Voltar à lista */}
        {setSelectedSolId && (
          <div className="flex items-center justify-between">
            <button type="button"
              onClick={() => setSelectedSolId('')}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition cursor-pointer">
              ← Voltar à lista
            </button>
            <p className="text-[10px] text-slate-400 font-mono truncate">{currentSol.nomeEscola} · {currentSol.id}</p>
          </div>
        )}

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

          {/* Grid financeiro — Valor Autorizado separado do Valor Homologado */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <div className="bg-violet-50 p-3 rounded-xl border border-violet-200">
              <span className="text-[9px] uppercase font-bold text-violet-500 block">Valor Autorizado (PAF)</span>
              <span className="text-[12.5px] font-black text-violet-800 block mt-1">
                R$ {(currentSol.valorPlanilha || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[8.5px] text-violet-400 font-medium mt-0.5 block">Orçamento aprovado no atendimento</span>
            </div>

            <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
              <span className="text-[9px] uppercase font-bold text-blue-500 block">Valor Homologado (Certame)</span>
              <span className={`text-[12.5px] font-black block mt-1 ${valorInicial > 0 ? 'text-blue-800' : 'text-slate-400'}`}>
                {valorInicial > 0 ? `R$ ${valorInicial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não cadastrado'}
              </span>
              <span className="text-[8.5px] text-blue-400 font-medium mt-0.5 block">Valor ganho pela empresa no certame</span>
            </div>

            <div className={`p-3 rounded-xl border ${valorInicial > 0 && currentSol.valorPlanilha ? (valorInicial <= (currentSol.valorPlanilha || 0) ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200') : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Variação Certame</span>
              {valorInicial > 0 && currentSol.valorPlanilha ? (() => {
                const diff = valorInicial - (currentSol.valorPlanilha || 0);
                const pct = ((diff / (currentSol.valorPlanilha || 1)) * 100).toFixed(1);
                return (
                  <>
                    <span className={`text-[12.5px] font-black block mt-1 ${diff <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {diff <= 0 ? '▼' : '▲'} {Math.abs(diff).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className={`text-[8.5px] font-bold mt-0.5 block ${diff <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {diff <= 0 ? 'Desconto' : 'Acréscimo'} de {Math.abs(parseFloat(pct))}%
                    </span>
                  </>
                );
              })() : <span className="text-[11px] text-slate-400 block mt-1">—</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Aditivos Aprovados</span>
              <span className="text-[12.5px] font-black text-amber-600 block mt-1">
                R$ {sumAditivos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Valor Contratual Atual</span>
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

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Dates column */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-bold">Data Assinatura:</span>
                <span className="font-bold text-slate-700">{dataAssinaturaInput ? new Date(dataAssinaturaInput).toLocaleDateString('pt-BR') : '---'}</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-bold">Início da Vigência (Obra):</span>
                <span className="font-bold text-slate-700">{inicioVigenciaInput ? new Date(inicioVigenciaInput).toLocaleDateString('pt-BR') : '---'}</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-bold">Fim da Vigência (Obra):</span>
                <span className="font-bold text-slate-700">{fimVigenciaInput ? new Date(fimVigenciaInput).toLocaleDateString('pt-BR') : '---'}</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1.5">
                <span className="text-slate-500 font-bold">Vigência do PAF:</span>
                <span className="font-bold text-blue-600">
                  {currentSol?.dataVigenciaPAF ? new Date(currentSol.dataVigenciaPAF).toLocaleDateString('pt-BR') : '---'}
                </span>
              </div>
            </div>

            {/* Semáforo de Execução da Obra */}
            <div className="flex flex-col justify-center items-center bg-slate-50 p-5 rounded-2xl border border-slate-150 relative overflow-hidden">
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block mb-3 text-center">Semáforo de Execução da Obra</span>
              <div className="flex items-center gap-2">
                <span className={`w-3.5 h-3.5 rounded-full shadow-xs ${semaphoreColor === 'green' ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                <span className={`w-3.5 h-3.5 rounded-full shadow-xs ${semaphoreColor === 'yellow' ? 'bg-amber-400' : 'bg-slate-200'}`} />
                <span className={`w-3.5 h-3.5 rounded-full shadow-xs ${semaphoreColor === 'red' ? 'bg-rose-500' : 'bg-slate-200'}`} />
              </div>
              <div className="text-center mt-3">
                <div className="text-xs font-bold text-slate-500">Dias Restantes:</div>
                <div className={`text-2xl font-black ${
                  semaphoreColor === 'green' ? 'text-emerald-600' :
                  semaphoreColor === 'yellow' ? 'text-amber-500' :
                  semaphoreColor === 'red' ? 'text-rose-600' : 'text-slate-400'
                }`}>
                  {diasRestantes !== null ? `${diasRestantes} dias` : 'Não Calculável'}
                </div>
                <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wide">
                  {semaphoreLabel}
                </div>
              </div>
            </div>

            {/* Semáforo de Vigência do PAF */}
            <div className="flex flex-col justify-center items-center bg-slate-50 p-5 rounded-2xl border border-slate-150 relative overflow-hidden">
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block mb-3 text-center">Semáforo de Vigência do PAF</span>
              <div className="flex items-center gap-2">
                <span className={`w-3.5 h-3.5 rounded-full shadow-xs ${pafSem.color === 'green' ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                <span className={`w-3.5 h-3.5 rounded-full shadow-xs ${pafSem.color === 'yellow' ? 'bg-amber-400' : 'bg-slate-200'}`} />
                <span className={`w-3.5 h-3.5 rounded-full shadow-xs ${pafSem.color === 'red' ? 'bg-rose-500' : 'bg-slate-200'}`} />
              </div>
              <div className="text-center mt-3">
                <div className="text-xs font-bold text-slate-500">Dias Restantes:</div>
                <div className={`text-2xl font-black ${
                  pafSem.color === 'green' ? 'text-emerald-600' :
                  pafSem.color === 'yellow' ? 'text-amber-500' :
                  pafSem.color === 'red' ? 'text-rose-600' : 'text-slate-400'
                }`}>
                  {pafSem.dias !== null ? `${pafSem.dias} dias` : 'Não Calculável'}
                </div>
                <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wide">
                  {pafSem.label}
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
          <div className={`p-4 rounded-xl border ${garantiaAlertClass} text-xs flex gap-3 items-start mb-4`}>
            <AlertCircle className={`w-5 h-5 ${garantiaIconColor} shrink-0 mt-0.5`} />
            <div>
              <h4 className="font-extrabold uppercase tracking-wide text-[10.5px]">Monitoramento de Garantia SGO</h4>
              <p className="mt-0.5 opacity-90 leading-relaxed font-medium">{garantiaStatusText}</p>
            </div>
          </div>

          {/* AÇÕES CONTRATUAIS — abrem modais dedicados */}
          {!somenteLeitura && (
          <div className="border-t border-slate-105 pt-4">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2.5">Ações Contratuais Disponíveis no SGO</h4>
            {!currentSol.contratoDataAssinatura || currentSol.statusContratoEmpresa === 'Distratada' ? (
              <button
                type="button"
                onClick={() => {
                  // Sempre resetar campos ao abrir modal para novo contrato
                  setSelectedEmpresaId('');
                  setEmpresaInput('');
                  setCnpjInput('');
                  setTipoAcaoInput('alteracao');
                  setDuracaoInput('');
                  setValorInicialInput('');
                  setDataAssinaturaInput('');
                  setInicioVigenciaInput('');
                  setFimVigenciaInput('');
                  setGarantiaExigidaInput('Sem Garantia');
                  setGarantiaValorInput('');
                  setGarantiaTipoInput('');
                  setGarantiaValidadeInput('');
                  setModalCadastroAberto(true);
                }}
                className="w-full py-3 px-4 rounded-xl border font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-emerald-50/50 hover:bg-emerald-100/60 text-emerald-700 border-emerald-200 hover:border-emerald-300"
              >
                <Plus className="w-4 h-4" /> Cadastrar Contrato
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setTipoAcaoInput('alteracao'); setModalAlteracaoAberto(true); }}
                  className="py-3 px-4 rounded-xl border font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-blue-50/50 hover:bg-blue-100/60 text-blue-700 border-blue-200 hover:border-blue-300"
                >
                  <Edit className="w-4 h-4" /> Alteração do Contrato
                </button>
                {currentSol.statusObra === 'Paralisada' ? (
                  <button
                    type="button"
                    onClick={() => { setTipoAcaoInput('distrato'); setModalDistratoAberto(true); }}
                    className="py-3 px-4 rounded-xl border font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-rose-50/50 hover:bg-rose-100/60 text-rose-700 border-rose-200 hover:border-rose-300"
                  >
                    <Trash2 className="w-4 h-4" /> Distrato do Contrato
                  </button>
                ) : (
                  <div
                    title={`Distrato só é permitido quando a obra está Paralisada. Status atual: ${currentSol.statusObra || 'Não definido'}`}
                    className="py-3 px-4 rounded-xl border font-black text-xs flex items-center justify-center gap-1.5 bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed select-none"
                  >
                    <Lock className="w-4 h-4" /> Distrato do Contrato
                  </div>
                )}
              </div>
            )}
          </div>
          )}
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
            <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl text-slate-500 text-[11px] font-medium">
              Sem ocorrências de distrato ou sanção administrativa com empresas anteriores neste projeto.
            </div>
          )}
        </div>

      </div>

      {/* ===== MODAL CADASTRAR CONTRATO ===== */}
      {modalCadastroAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setModalCadastroAberto(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-100 bg-emerald-50/40 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <Plus className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-sm font-black text-emerald-800 uppercase tracking-wide">Cadastrar Contrato</h2>
              </div>
              <button onClick={() => setModalCadastroAberto(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4">
              <form onSubmit={handleCadastrarContrato} className="space-y-4">

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">
                    Selecionar Empresa SGO (do Módulo de Segurança)*
                  </label>
                  <select
                    required
                    value={selectedEmpresaId}
                    onChange={(e) => selectCompanyFromSeguranca(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 font-bold focus:outline-hidden cursor-pointer"
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

                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 block">Valor Homologado — Ganho no Certame (R$)*</label>
                    {currentSol.valorPlanilha ? (
                      <span className="text-[9px] text-violet-600 font-bold bg-violet-50 border border-violet-200 px-2 py-0.5 rounded">
                        Autorizado (PAF): R$ {(currentSol.valorPlanilha).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    ) : null}
                  </div>
                  {(() => {
                    const valorPAF = currentSol.valorPlanilha || currentSol.valorHomologado || 0;
                    const excede = valorPAF > 0 && valorInicial > valorPAF;
                    return (
                      <>
                        <input
                          type="number"
                          required
                          value={valorInicialInput}
                          onChange={(e) => setValorInicialInput(e.target.value)}
                          className={`w-full text-xs p-2.5 border rounded-xl bg-white text-slate-800 font-bold focus:outline-hidden ${excede ? 'border-rose-400 bg-rose-50/30 text-rose-800' : 'border-slate-300'}`}
                          placeholder="1350000"
                        />
                        {excede && (
                          <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-1">
                            ⚠ O valor do certame excede o valor autorizado no PAF em R$ {(valorInicial - valorPAF).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Corrija antes de salvar.
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Duração (Meses)</label>
                  <input
                    type="number"
                    value={duracaoInput}
                    onChange={(e) => setDuracaoInput(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden font-bold"
                  />
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Vigência &amp; Assinatura</h4>

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
                      <label className={`text-[9px] font-bold block mb-1 ${vigenciaInvalida ? 'text-rose-500' : 'text-slate-400'}`}>Fim da Vigência*</label>
                      <input
                        type="date"
                        required
                        min={inicioVigenciaInput || undefined}
                        value={fimVigenciaInput}
                        onChange={(e) => setFimVigenciaInput(e.target.value)}
                        className={`w-full text-xs p-2 border rounded-xl bg-white focus:outline-hidden font-semibold ${vigenciaInvalida ? 'border-rose-400 bg-rose-50/30 text-rose-800' : 'border-slate-300 text-slate-800'}`}
                      />
                      {vigenciaInvalida && (
                        <p className="text-[9px] text-rose-600 font-bold mt-1">⚠ Fim da Vigência não pode ser anterior ao Início.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Cadastro de Garantias</h4>

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
                    <div className="space-y-3">
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
                  className="w-full py-2.5 text-xs text-white font-black uppercase rounded-xl cursor-pointer transition-colors shadow-xs bg-emerald-600 hover:bg-emerald-700"
                >
                  Cadastrar Contrato
                </button>
              </form>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setModalCadastroAberto(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition cursor-pointer">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL ALTERAÇÃO DO CONTRATO ===== */}
      {modalAlteracaoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setModalAlteracaoAberto(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Edit className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">Alteração do Contrato</h2>
              </div>
              <button onClick={() => setModalAlteracaoAberto(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4">
          <div id="edit-contract-form" className="space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 mb-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Edit className="w-4 h-4 text-blue-500" />
              Alterar Contrato
            </h3>
          </div>

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
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 font-bold focus:outline-hidden cursor-pointer"
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

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Duração (Meses)</label>
              <input
                type="number"
                value={duracaoInput}
                onChange={(e) => setDuracaoInput(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden font-bold"
              />
            </div>

            {/* datas do contrato */}
            <div className="border-t border-slate-100 pt-3 space-y-3">
              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Vigência & Assinatura</h4>
              
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
                  <label className={`text-[9px] font-bold block mb-1 ${vigenciaInvalida ? 'text-rose-500' : 'text-slate-400'}`}>Fim da Vigência*</label>
                  <input
                    type="date"
                    required
                    min={inicioVigenciaInput || undefined}
                    value={fimVigenciaInput}
                    onChange={(e) => setFimVigenciaInput(e.target.value)}
                    className={`w-full text-xs p-2 border rounded-xl bg-white focus:outline-hidden font-semibold ${vigenciaInvalida ? 'border-rose-400 bg-rose-50/30 text-rose-800' : 'border-slate-300 text-slate-800'}`}
                  />
                  {vigenciaInvalida && (
                    <p className="text-[9px] text-rose-600 font-bold mt-1">⚠ Fim da Vigência não pode ser anterior ao Início.</p>
                  )}
                </div>
              </div>
            </div>

            {/* garantia exigida */}
            <div className="border-t border-slate-100 pt-3 space-y-3">
              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Cadastro de Garantias</h4>
              
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
              className={`w-full py-2.5 text-xs text-white font-black uppercase rounded-xl cursor-pointer transition-colors shadow-xs ${
                tipoAcaoInput === 'distrato'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-[#1c3870] hover:bg-[#1a2f5c]'
              }`}
            >
              Salvar Alteração Contratual
            </button>
          </form>
        </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setModalAlteracaoAberto(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition cursor-pointer">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL DISTRATO DO CONTRATO ===== */}
      {modalDistratoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setModalDistratoAberto(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-rose-100 bg-rose-50/40 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-rose-600 rounded-lg flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-sm font-black text-rose-800 uppercase tracking-wide">Distrato do Contrato</h2>
              </div>
              <button onClick={() => setModalDistratoAberto(false)} className="p-1.5 hover:bg-rose-100 rounded-lg transition text-rose-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

              {/* Aviso */}
              <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-rose-800">Ação irreversível — Distrato Contratual</p>
                  <p className="text-[11px] text-rose-700 font-sans mt-0.5 leading-relaxed">
                    Ao homologar o distrato, o contrato ativo será encerrado, a empresa será arquivada no histórico e a obra retornará ao status de contratação.
                  </p>
                </div>
              </div>

              {/* Empresa atual */}
              <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500">Empresa a ser distratada</h4>
                <div className="space-y-2">
                  <div>
                    <label className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider mb-1">Razão Social</label>
                    <input readOnly value={currentSol?.empresaContratada || '—'} className="w-full text-xs font-bold p-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider mb-1">CNPJ</label>
                    <input readOnly value={currentSol?.cnpjEmpresa || '—'} className="w-full text-xs font-mono font-bold p-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 cursor-not-allowed" />
                  </div>
                </div>
              </div>

              {/* Campos do distrato */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-600 block uppercase tracking-wider">Data do Distrato *</label>
                  <input
                    type="date"
                    value={distratoData}
                    onChange={e => setDistratoData(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-rose-400 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-600 block uppercase tracking-wider">Justificativa do Distrato *</label>
                  <select
                    value={distratoJustificativa}
                    onChange={e => setDistratoJustificativa(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-rose-400 cursor-pointer"
                  >
                    <option value="">Selecione o motivo...</option>
                    <option value="Inadimplência contratual da empresa">Inadimplência contratual da empresa</option>
                    <option value="Abandono de obra">Abandono de obra</option>
                    <option value="Descumprimento de cláusulas contratuais">Descumprimento de cláusulas contratuais</option>
                    <option value="Acordo mútuo entre as partes">Acordo mútuo entre as partes</option>
                    <option value="Falência ou recuperação judicial da empresa">Falência ou recuperação judicial da empresa</option>
                    <option value="Determinação judicial">Determinação judicial</option>
                    <option value="Irregularidade fiscal ou cadastral da contratada">Irregularidade fiscal ou cadastral da contratada</option>
                    <option value="Outro motivo">Outro motivo</option>
                  </select>
                </div>

                {/* Upload documento de distrato */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-600 block uppercase tracking-wider">Documento de Distrato</label>
                  <div className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${distratoFile ? 'border-emerald-400 bg-emerald-50/10' : 'border-rose-200 hover:border-rose-400 hover:bg-rose-50/30'}`}>
                    {distratoFile ? (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-500" />
                          <div className="text-left">
                            <p className="text-xs font-bold text-slate-800">{distratoFile.name}</p>
                            <p className="text-[10px] text-slate-400">{distratoFile.size}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => setDistratoFile(null)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center gap-1.5">
                        <FileUp className="w-7 h-7 text-rose-300" />
                        <p className="text-xs font-bold text-slate-500">Termo / Ata de Distrato</p>
                        <span className="text-[10px] text-slate-400 font-sans">Clique ou arraste o arquivo aqui (PDF)</span>
                        <input type="file" className="hidden" accept=".pdf,.doc,.docx"
                          onChange={e => {
                            if (e.target.files?.[0]) {
                              const f = e.target.files[0];
                              setDistratoFile({ name: f.name, size: `${(f.size / 1024).toFixed(0)} KB` });
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-rose-100 bg-rose-50/30 flex items-center justify-between gap-3 shrink-0">
              <button type="button" onClick={() => setModalDistratoAberto(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition cursor-pointer">
                Cancelar
              </button>
              <button
                type="button"
                disabled={!distratoJustificativa || !distratoData || currentSol?.statusObra !== 'Paralisada'}
                onClick={() => {
                  if (!currentSol) return;
                  if (currentSol.statusObra !== 'Paralisada') {
                    alert('Distrato só é permitido quando a obra está com status Paralisada.');
                    return;
                  }
                  const updatedAnteriores = [...(currentSol.empresasAnteriores || [])];
                  const jaArquivada = updatedAnteriores.some(e => e.cnpj === currentSol.cnpjEmpresa);
                  if (!jaArquivada && currentSol.empresaContratada) {
                    const cnpjAtual = currentSol.cnpjEmpresa || '';
                    const contratoValor = currentSol.contratoValorInicial || currentSol.valorHomologadoContratacao || 0;
                    const valorExecutado = (currentSol.medicoes || [])
                      .filter(m => cnpjAtual ? m.empresaCnpj === cnpjAtual : true)
                      .reduce((sum, m) => sum + m.valor, 0);
                    const avancoFisico = contratoValor > 0 ? (valorExecutado / contratoValor) * 100 : 0;
                    updatedAnteriores.push({
                      id: `prev_${Date.now()}`,
                      nome: currentSol.empresaContratada,
                      cnpj: cnpjAtual,
                      contratoValorInicial: contratoValor,
                      valorExecutado,
                      avancoFisicoOriginal: avancoFisico,
                      fiscalObraAtribuido: currentSol.fiscalObraAtribuido,
                      dataOrdemInicio: currentSol.dataOrdemInicio,
                      ataOrdemInicioFileName: currentSol.ataOrdemInicioFileName,
                      ataOrdemInicioFileSize: currentSol.ataOrdemInicioFileSize,
                      outrosAnexosOrdemInicio: currentSol.outrosAnexosOrdemInicio,
                      previsaoTerminoObra: currentSol.previsaoTerminoObra,
                      duracaoObraMeses: currentSol.duracaoObraMeses,
                      classeObra: currentSol.classeObra,
                      pontuacaoComplexidade: currentSol.pontuacaoComplexidade,
                      cronogramaFisicoFinanceiroFileName: currentSol.cronogramaFisicoFinanceiroFileName,
                      cronogramaFisicoFinanceiroFileSize: currentSol.cronogramaFisicoFinanceiroFileSize,
                      dataDistrato: distratoData,
                      justificativaDistrato: distratoJustificativa,
                      documentoDistratoFileName: distratoFile?.name,
                    });
                  }
                  onUpdate({
                    ...currentSol,
                    empresaContratada: '',
                    cnpjEmpresa: '',
                    statusContratoEmpresa: 'Distratada',
                    justificativaDistrato: distratoJustificativa,
                    dataDistrato: distratoData,
                    documentoDistratoFileName: distratoFile?.name,
                    empresasAnteriores: updatedAnteriores,
                  });
                  setModalDistratoAberto(false);
                  setDistratoJustificativa('');
                  setDistratoData('');
                  setDistratoFile(null);
                }}
                className="px-5 py-2.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                Homologar Distrato Contratual
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- 5. SUB ADITIVOS ---
function SubAditivos({ currentSol, onUpdate, somenteLeitura = false }: { currentSol: Solicitacao | null; onUpdate: (sol: Solicitacao) => void; somenteLeitura?: boolean }) {
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

  const isDistratadaAdt = currentSol.statusContratoEmpresa === 'Distratada';
  const isEmExecucaoAdt = computeStatusObra(currentSol).label === 'Em execução';
  const podeSolicitarAditivo = isEmExecucaoAdt && !isDistratadaAdt;

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

  const handleNextStep = () => {
    if (!justificativa.trim()) {
      alert('Por favor, preencha o campo obrigatório: Justificativa Técnica do Pleito!');
      return;
    }
    if (tipo === 'Valor' || tipo === 'Valor e Prazo') {
      const val = parseFloat(valorExtra) || 0;
      if (val <= 0) {
        alert('Por favor, preencha o campo obrigatório: Acréscimo de Valor (R$)!');
        return;
      }
    }
    if (tipo === 'Prazo' || tipo === 'Valor e Prazo') {
      const pz = parseInt(prazoExtra) || 0;
      if (pz <= 0) {
        alert('Por favor, preencha o campo obrigatório: Prorrogação de Prazo (dias)!');
        return;
      }
    }
    setStep(2);
  };

  const handleCreateAditivo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!justificativa.trim()) {
      alert('Por favor, preencha a justificativa!');
      return;
    }

    // Resolve o uuid real da solicitação (usa o cache local ou busca pelo codigo_sgo)
    let dbId = currentSol._dbId;
    if (!dbId) {
      const { data: solRow, error: solError } = await supabase
        .from('solicitacoes')
        .select('id')
        .eq('codigo_sgo', currentSol.id)
        .single();
      if (solError || !solRow) {
        alert('Não foi possível localizar o registro da obra no banco para gravar o aditivo.');
        return;
      }
      dbId = solRow.id;
    }

    const { count, error: countError } = await supabase
      .from('aditivos')
      .select('id', { count: 'exact', head: true })
      .eq('solicitacao_id', dbId);
    if (countError) {
      console.error('Erro ao contar aditivos existentes:', countError);
      alert('Erro ao calcular o número do aditivo. Tente novamente.');
      return;
    }
    const numeroAditivoInt = (count ?? 0) + 1;

    const tipoBanco = tipo === 'Valor e Prazo' ? 'valor_prazo' : tipo === 'Valor' ? 'valor' : 'prazo';
    const dataAditivo = new Date().toISOString().split('T')[0];
    const { data: userData } = await supabase.auth.getUser();

    const { data: aditivoRow, error: aditivoError } = await supabase
      .from('aditivos')
      .insert({
        solicitacao_id: dbId,
        numero_aditivo: numeroAditivoInt,
        tipo: tipoBanco,
        valor_adicional: numAcre > 0 ? numAcre : null,
        prazo_adicional_dias: prazoExtra ? parseInt(prazoExtra) : null,
        motivo: justificativa,
        status: 'pendente',
        supressao: numSup > 0 ? numSup : null,
        reprogramacao,
        saldo_complementar: saldoComplementar,
        valor_aditivo: valorAditivoLiquido,
        percentual_contrato: parseFloat(displayPercentual.toFixed(2)),
        data_aditivo: dataAditivo,
        usuario_id: userData.user?.id ?? null,
      })
      .select('id')
      .single();

    if (aditivoError || !aditivoRow) {
      console.error('Erro ao gravar aditivo no Supabase:', aditivoError);
      alert('Erro ao gravar o aditivo no banco de dados. Tente novamente.');
      return;
    }

    const novoAditivo: Aditivo = {
      id: aditivoRow.id,
      data: dataAditivo,
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
      numeroAditivo: String(numeroAditivoInt),
      checklistDocs: checklist.map(c => ({ item: c.item, checked: c.checked, fileName: c.fileName || undefined })),
      parecerConsolidado: '',
      documentos: [
        { id: 'relatorio_tecnico', nome: 'Parecer Circunstanciado de Engenharia / Memorial Descritivo', desc: 'Justificativa técnica circunstanciada assinada por engenheiro.', status: 'pendente', obrigatorio: true },
        { id: 'planilha_orcamentaria_ref', nome: 'Planilha de Custos Unitários Aditiva Refatorada e Cronograma', desc: 'Apresentação de custos aditivos detalhados com indicação do reajuste.', status: 'pendente', obrigatorio: true },
        { id: 'anotacao_responsabilidade_tecnica', nome: 'ART do Responsável Técnico do Projeto Alterado', desc: 'Anotação de responsabilidade registrada no CREA.', status: 'pendente', obrigatorio: false }
      ]
    };

    const updated = {
      ...currentSol,
      aditivos: [novoAditivo, ...(currentSol.aditivos || [])]
    };

    onUpdate(updated);

    alert('Nova solicitação de aditivo cadastrada com sucesso e está pendente de análise. A obra continua em execução.');

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

  const handleDoreAction = async (id: string, decision: 'Aprovado' | 'Recusado') => {
    if (!parecerDoreInput.trim()) {
      alert('Favor inserir uma justificativa/parecer consolidado para a decisão.');
      return;
    }

    const targetAdt = (currentSol.aditivos || []).find(a => a.id === id);
    if (!targetAdt) return;

    const statusBanco = decision === 'Aprovado' ? 'aprovado' : 'recusado';
    const dataDecisao = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('aditivos')
      .update({
        status: statusBanco,
        parecer_consolidado: parecerDoreInput,
        data_aditivo: dataDecisao,
      })
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar aditivo no Supabase:', error);
      alert('Erro ao atualizar o aditivo no banco de dados. Tente novamente.');
      return;
    }

    let updatedSolMock = { ...currentSol };
    const targetAdtLocal = (updatedSolMock.aditivos || []).find(a => a.id === id);

    if (targetAdtLocal) {
      targetAdtLocal.status = decision;
      targetAdtLocal.parecerConsolidado = parecerDoreInput;
      targetAdtLocal.data = dataDecisao;

      // If approved, update main financial/timeline of the project
      if (decision === 'Aprovado') {
        const adtVal = targetAdtLocal.valorAditivo || 0;
        updatedSolMock.valorPlanilha = (updatedSolMock.valorPlanilha || 0) + adtVal;
        updatedSolMock.valorHomologadoContratacao = (updatedSolMock.valorHomologadoContratacao || 0) + adtVal;
      }

      onUpdate(updatedSolMock);
      setParecerDoreInput('');
      setSelectedAditivoId(null);
    }
  };

  const handleExcluirAditivo = async (id: string) => {
    const { error } = await supabase.from('aditivos').delete().eq('id', id);
    if (error) {
      console.error('Erro ao excluir aditivo no Supabase:', error);
      return;
    }

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
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('historico')}
          className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider transition-colors flex items-center gap-2 border-b-2 ${activeTab === 'historico' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <History className="w-4 h-4" /> Histórico de Aditivos ({currentSol.aditivos?.length || 0})
        </button>
        {!somenteLeitura && (
        <button
          data-testid="aditivo-criar"
          onClick={() => { if (podeSolicitarAditivo) { setActiveTab('novo_atendimento'); setStep(1); } }}
          title={
            isDistratadaAdt ? 'Contrato distratado — não é possível solicitar aditivos' :
            !isEmExecucaoAdt ? `Aditivos só são permitidos quando a obra está Em execução. Status atual: "${computeStatusObra(currentSol).label}"` : ''
          }
          className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider transition-colors flex items-center gap-2 border-b-2 ${
            !podeSolicitarAditivo ? 'border-transparent text-slate-300 cursor-not-allowed' :
            activeTab === 'novo_atendimento' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {!podeSolicitarAditivo ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          Iniciar Novo Atendimento (Aditivo)
          {!podeSolicitarAditivo && <span className="text-[9px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded font-black uppercase ml-1">Bloqueado</span>}
        </button>
        )}
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
                          <p className={`text-xs font-black font-mono ${adtLiq >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
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
                                  data-testid="aditivo-recusar"
                                  type="button"
                                  onClick={() => handleDoreAction(adt.id, 'Recusado')}
                                  className="px-4 py-1.5 text-xs font-black text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg uppercase cursor-pointer"
                                >
                                  Indeferir / Recusar
                                </button>
                                <button
                                  data-testid="aditivo-aprovar"
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

                  </div>

                  {/* Calculated metrics */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-2 mt-4 text-xs">
                     <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-bold">Valor Líquido do Aditivo:</span>
                      <strong className={`font-mono text-sm ${valorAditivoLiquido >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        R$ {valorAditivoLiquido.toLocaleString('pt-BR')}
                      </strong>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-bold">Percentual do Contrato:</span>
                      <strong className={`font-mono text-sm ${displayPercentual > 25 ? 'text-red-600' : 'text-slate-700'}`}>
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
                      onClick={handleNextStep}
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
                      <div className="text-left space-y-1 flex-1 min-w-0">
                        <span className="font-black text-slate-700 block truncate">{c.item}</span>
                        {c.fileName ? (
                          <span className="text-[10px] text-blue-600 font-mono flex items-center gap-0.5 truncate">
                            📎 {c.fileName}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">Pendente</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleChecklist(idx)}
                          className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-extrabold uppercase transition-all whitespace-nowrap ${c.checked ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                        >
                          {c.checked ? '☑ OK' : '☐ Marcar'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMockUpload(idx, '')}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 shrink-0"
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
                    className="px-6 py-2.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl uppercase cursor-pointer shadow-xs"
                  >
                    Voltar aos Dados
                  </button>

                  <button
                    data-testid="aditivo-salvar"
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
function SubAjustes({
  currentSol,
  onUpdate,
  usuariosSeguranca = [],
  somenteLeitura = false,
}: {
  currentSol: Solicitacao | null;
  onUpdate: (sol: Solicitacao) => void;
  usuariosSeguranca?: UsuarioSistema[];
  somenteLeitura?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<'historico' | 'novo_atendimento'>('historico');
  const [role, setRole] = useState<'proponente' | 'dore'>('proponente');
  const [step, setStep] = useState<1 | 2>(1);

  // Form states - Step 1
  const [tipoAjuste, setTipoAjuste] = useState<'sem_alteracao_meta' | 'com_alteracao_meta' | 'com_alteracao_meta_projeto' | 'sem_alteracao_meta_com_projeto' | 'ajuste_sem_meta_com_projeto'>('sem_alteracao_meta');
  const [valorAjusteInp, setValorAjusteInp] = useState('');
  const [supressao, setSupressao] = useState('');
  const [prazoExtra, setPrazoExtra] = useState('');
  const [reprogramacao, setReprogramacao] = useState<'Sim' | 'Não'>('Não');
  const [saldoComplementar, setSaldoComplementar] = useState<'Sim' | 'Não'>('Não');
  const [responsavelP, setResponsavelP] = useState(currentSol?.fiscalObraAtribuido || '');
  const [registroProfissional, setRegistroProfissional] = useState('');
  const [observacoesAjuste, setObservacoesAjuste] = useState('');

  // Sincroniza fiscal da obra quando currentSol muda
  useEffect(() => {
    const nome = currentSol?.fiscalObraAtribuido || '';
    setResponsavelP(nome);
    if (nome && usuariosSeguranca.length) {
      const u = usuariosSeguranca.find(usr =>
        usr.nome && (
          usr.nome.toLowerCase().includes(nome.toLowerCase()) ||
          nome.toLowerCase().includes(usr.nome.toLowerCase())
        )
      );
      setRegistroProfissional(u?.creaNum || '');
    } else {
      setRegistroProfissional('');
    }
  }, [currentSol?.id]);

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

  const isDistratadaAjuste = currentSol.statusContratoEmpresa === 'Distratada';

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

  const handleNextStep = () => {
    if (!responsavelP.trim()) {
      alert('Nenhum fiscal técnico atribuído à obra. Atribua um fiscal antes de registrar o ajuste.');
      return;
    }
    if (!observacoesAjuste.trim()) {
      alert('Por favor, preencha o campo obrigatório: Justificativa e Anotações Técnicas de Ajuste!');
      return;
    }
    const acre = parseFloat(valorAjusteInp) || 0;
    const sup = parseFloat(supressao) || 0;
    if (acre <= 0 && sup <= 0) {
      alert('Por favor, preencha um valor maior que zero em pelo menos um campo: Acréscimo ou Supressão!');
      return;
    }
    setStep(2);
  };

  const handleCreateAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!observacoesAjuste.trim()) {
      alert('Por favor, preencha as notas técnicas / justificativa!');
      return;
    }

    // Resolve o uuid real da solicitação (usa o cache local ou busca pelo codigo_sgo)
    let dbId = currentSol._dbId;
    if (!dbId) {
      const { data: solRow, error: solError } = await supabase
        .from('solicitacoes')
        .select('id')
        .eq('codigo_sgo', currentSol.id)
        .single();
      if (solError || !solRow) {
        alert('Não foi possível localizar o registro da obra no banco para gravar o ajuste.');
        return;
      }
      dbId = solRow.id;
    }

    const { count, error: countError } = await supabase
      .from('ajustes_planilha')
      .select('id', { count: 'exact', head: true })
      .eq('solicitacao_id', dbId);
    if (countError) {
      console.error('Erro ao contar ajustes existentes:', countError);
      alert('Erro ao calcular o número do ajuste. Tente novamente.');
      return;
    }
    const numeroAjusteInt = (count ?? 0) + 1;

    const dataAjuste = new Date().toISOString().split('T')[0];
    const { data: userData } = await supabase.auth.getUser();

    const { data: ajusteRow, error: ajusteError } = await supabase
      .from('ajustes_planilha')
      .insert({
        solicitacao_id: dbId,
        numero_ajuste: numeroAjusteInt,
        valor_ajuste: numAcre,
        status: 'pendente',
        tipo_ajuste: tipoAjuste,
        responsavel_planilha: responsavelP,
        registro_profissional: registroProfissional,
        ajuste_referente: 'atendimento_inicial',
        valor_contrato: valorContratoOriginal,
        diferenca_planilhas: valorAditivoLiquido,
        desconto: 0,
        avanco_fisico: 0,
        supressao: numSup > 0 ? numSup : null,
        reprogramacao,
        saldo_complementar: saldoComplementar,
        percentual_contrato: parseFloat(percentualContrato.toFixed(2)),
        observacoes: observacoesAjuste,
        data_ajuste: dataAjuste,
        usuario_id: userData.user?.id ?? null,
      })
      .select('id')
      .single();

    if (ajusteError || !ajusteRow) {
      console.error('Erro ao gravar ajuste no Supabase:', ajusteError);
      alert('Erro ao gravar o ajuste no banco de dados. Tente novamente.');
      return;
    }

    const novoAjuste: AjustePlanilha = {
      id: ajusteRow.id,
      numero: numeroAjusteInt,
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
      dataCriacao: dataAjuste,
      status: 'analise_dore', // Sent to DORE (banco: 'pendente')
      analistaAtribuido: undefined,
      supressao: numSup > 0 ? numSup : undefined,
      reprogramacao,
      saldoComplementar,
      valorAditivo: valorAditivoLiquido,
      percentualContrato: parseFloat(percentualContrato.toFixed(2)),
      checklistDocs: checklist.map(c => ({ item: c.item, checked: c.checked, fileName: c.fileName || undefined })),
      parecerDore: ''
    };

    const updated = {
      ...currentSol,
      ajustes: [novoAjuste, ...(currentSol.ajustes || [])]
    };

    onUpdate(updated);

    alert('Nova solicitação de ajuste cadastrada com sucesso e está pendente de análise. A obra continua em execução.');

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

  const handleDoreAction = async (id: string, decision: 'validado' | 'em_elaboracao') => {
    if (!parecerDoreInput.trim()) {
      alert('Favor inserir uma justificativa/parecer técnico para esta validação.');
      return;
    }

    const targetAjuste = (currentSol.ajustes || []).find(a => a.id === id);
    if (!targetAjuste) return;

    const statusBanco = decision === 'validado' ? 'aprovado' : 'recusado';
    const dataDecisao = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('ajustes_planilha')
      .update({
        status: statusBanco,
        parecer_dore: parecerDoreInput,
        data_ajuste: dataDecisao,
      })
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar ajuste no Supabase:', error);
      alert('Erro ao atualizar o ajuste no banco de dados. Tente novamente.');
      return;
    }

    let updatedSolMock = { ...currentSol };
    const targetAjusteLocal = (updatedSolMock.ajustes || []).find(a => a.id === id);

    if (targetAjusteLocal) {
      targetAjusteLocal.status = decision;
      targetAjusteLocal.parecerDore = parecerDoreInput;
      targetAjusteLocal.dataCriacao = dataDecisao;

      // Se aprovado, soma a diferença de planilha (não o valor líquido do ajuste) ao contrato
      if (decision === 'validado') {
        const ajuVal = targetAjusteLocal.diferencaPlanilhas || 0;
        updatedSolMock.valorPlanilha = (updatedSolMock.valorPlanilha || 0) + ajuVal;
        updatedSolMock.valorHomologadoContratacao = (updatedSolMock.valorHomologadoContratacao || 0) + ajuVal;
      }

      onUpdate(updatedSolMock);
      setParecerDoreInput('');
      setSelectedAjusteId(null);
    }
  };

  const handleExcluirAjuste = async (id: string) => {
    const { error } = await supabase.from('ajustes_planilha').delete().eq('id', id);
    if (error) {
      console.error('Erro ao excluir ajuste no Supabase:', error);
      return;
    }

    let updatedSolMock = { ...currentSol };
    const targetAjuste = (updatedSolMock.ajustes || []).find(a => a.id === id);
    if (targetAjuste && targetAjuste.status === 'validado') {
      const ajuVal = targetAjuste.diferencaPlanilhas || 0;
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
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('historico')}
          className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider transition-colors flex items-center gap-2 border-b-2 ${activeTab === 'historico' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <History className="w-4 h-4" /> Histórico de Ajustes ({currentSol.ajustes?.length || 0})
        </button>
        {!somenteLeitura && (
        <button
          data-testid="ajuste-criar"
          onClick={() => { if (!isDistratadaAjuste) { setActiveTab('novo_atendimento'); setStep(1); } }}
          title={isDistratadaAjuste ? 'Contrato distratado — não é possível registrar ajustes' : ''}
          className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider transition-colors flex items-center gap-2 border-b-2 ${
            isDistratadaAjuste ? 'border-transparent text-slate-300 cursor-not-allowed' :
            activeTab === 'novo_atendimento' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {isDistratadaAjuste ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          Registrar Ajuste de Planilha
          {isDistratadaAjuste && <span className="text-[9px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded font-black uppercase ml-1">Bloqueado</span>}
        </button>
        )}
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
                              <p><b>Classificação Técnica Adjunto:</b> <span className="text-slate-800 font-mono text-[10px]">{aju.tipoAjuste.toUpperCase()}</span></p>
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
                                  data-testid="ajuste-recusar"
                                  type="button"
                                  onClick={() => handleDoreAction(aju.id, 'em_elaboracao')}
                                  className="px-4 py-1.5 text-xs font-black text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg uppercase cursor-pointer"
                                >
                                  Retornar p/ Correção
                                </button>
                                <button
                                  data-testid="ajuste-aprovar"
                                  type="button"
                                  onClick={() => handleDoreAction(aju.id, 'validado')}
                                  className="px-4 py-1.5 text-xs font-black text-white bg-purple-600 hover:bg-purple-700 rounded-lg uppercase cursor-pointer shadow-xs"
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
              <div className="space-y-5 text-xs">

                {/* Tipo de Remanejamento + Cronograma lado a lado */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tipo de Remanejamento Planejado *</label>
                    <select value={tipoAjuste} onChange={(e) => setTipoAjuste(e.target.value as any)}
                      className="w-full text-xs font-bold p-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 focus:outline-hidden">
                      <option value="sem_alteracao_meta">Ajuste técnico sem alteração de metas físicas</option>
                      <option value="com_alteracao_meta">Remanejamento com alteração de metas parciais</option>
                      <option value="com_alteracao_meta_projeto">Alteração substancial de metas e adequação de projetos</option>
                      <option value="sem_alteracao_meta_com_projeto">Adequação técnica de projeto sem impacto de metas</option>
                      <option value="ajuste_sem_meta_com_projeto">Ajuste sem alteração de meta e com alteração de projeto</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Exigirá atualização no cronograma físico financeiro?
                    </label>
                    <select value={reprogramacao} onChange={(e) => setReprogramacao(e.target.value as any)}
                      className="w-full text-xs p-3 border border-slate-300 rounded-xl bg-slate-50 focus:outline-hidden">
                      <option value="Não">Não</option>
                      <option value="Sim">Sim</option>
                    </select>
                  </div>
                </div>

                {/* Valor do Acréscimo + Valor da Supressão lado a lado */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Valor do Acréscimo (R$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={valorAjusteInp}
                      onChange={(e) => setValorAjusteInp(e.target.value)}
                      placeholder="Ex. 50000"
                      className="w-full text-xs p-3 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Valor da Supressão (R$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={supressao}
                      onChange={(e) => setSupressao(e.target.value)}
                      placeholder="Ex. 10000"
                      className="w-full text-xs p-3 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                {/* Responsável + CREA — auto-preenchidos pelo fiscal da obra */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Responsável Técnico (Eng)
                      <span className="ml-1.5 text-[8px] text-emerald-500 font-black normal-case bg-emerald-50 px-1 py-0.5 rounded">Auto</span>
                    </label>
                    <div className={`px-3 py-2.5 text-xs border rounded-xl font-semibold ${responsavelP ? 'border-emerald-200 bg-emerald-50/40 text-slate-800' : 'border-slate-200 bg-slate-50 text-slate-400 italic'}`}>
                      {responsavelP || 'Nenhum fiscal atribuído à obra'}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Nº Registro (CREA/CAU)
                      <span className="ml-1.5 text-[8px] text-emerald-500 font-black normal-case bg-emerald-50 px-1 py-0.5 rounded">Auto</span>
                    </label>
                    <div className={`px-3 py-2.5 text-xs border rounded-xl font-semibold font-mono ${registroProfissional ? 'border-emerald-200 bg-emerald-50/40 text-slate-800' : 'border-slate-200 bg-slate-50 text-slate-400 italic'}`}>
                      {registroProfissional || 'CREA/CAU não informado no perfil do fiscal'}
                    </div>
                  </div>
                </div>

                {/* Justificativa */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Justificativa e Anotações Técnicas de Ajuste *
                  </label>
                  <textarea required value={observacoesAjuste} onChange={(e) => setObservacoesAjuste(e.target.value)}
                    rows={5}
                    placeholder="Identifique de forma lógica as alterações de insumos e especificações técnicas de materiais..."
                    className="w-full text-xs p-3 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden leading-relaxed"
                  />
                </div>

                {/* Botão próximo */}
                <div className="flex justify-end pt-1">
                  <button type="button" onClick={handleNextStep}
                    className="px-6 py-2.5 text-xs font-black uppercase text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer shadow-xs inline-flex items-center gap-1.5">
                    Checklist de Evidências <ArrowRight className="w-4 h-4" />
                  </button>
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
                      <div className="text-left space-y-1 flex-1 min-w-0">
                        <span className="font-black text-slate-700 block truncate">{c.item}</span>
                        {c.fileName ? (
                          <span className="text-[10px] text-indigo-600 font-mono flex items-center gap-0.5 truncate">
                            📎 {c.fileName}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">Pendente</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleChecklist(idx)}
                          className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-extrabold uppercase transition-all whitespace-nowrap ${c.checked ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                        >
                          {c.checked ? '☑ OK' : '☐ Marcar'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMockUpload(idx, '')}
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shrink-0"
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
                    className="px-6 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl uppercase cursor-pointer shadow-xs"
                  >
                    Voltar aos Dados
                  </button>

                  <button
                    data-testid="ajuste-salvar"
                    type="submit"
                    className="px-6 py-2.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 font-black rounded-xl uppercase cursor-pointer"
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
function SubFiscalizacao({
  currentSol,
  onUpdate,
  solicitacoes = [],
  usuariosSeguranca = [],
  somenteLeitura = false,
  perfilUsuario
}: {
  currentSol: Solicitacao | null;
  onUpdate: (sol: Solicitacao) => void;
  solicitacoes?: Solicitacao[];
  usuariosSeguranca?: UsuarioSistema[];
  somenteLeitura?: boolean;
  perfilUsuario?: PerfilUsuario;
}) {
  // Só o coordenador regional (ou gestor_paf/admin) pode atribuir/reatribuir o fiscal de obra — o técnico não pode mais se autoatribuir.
  const podeAtribuirFiscal = perfilUsuario === 'coordenador_regional' || perfilUsuario === 'gestor_paf' || (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore');
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
      fiscalObraAtribuido: fiscalInput,
      fiscalObraAtribuidoId: usuariosSeguranca.find(u => u.nome === fiscalInput)?.id
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
              <div key={index} className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 font-sans relative pl-8">
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
            <select
              id="fiscal-obra-input"
              value={fiscalInput}
              onChange={(e) => setFiscalInput(e.target.value)}
              disabled={!podeAtribuirFiscal}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 font-bold focus:outline-hidden cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              <option value="">-- Atribuir Fiscal de Engenharia --</option>
              {usuariosSeguranca
                .filter(u => u.perfil === 'tecnico_infra')
                .map(u => (
                  <option key={u.id} value={u.nome}>
                    {u.nome}
                  </option>
                ))
              }
            </select>

            {fiscalInput && (() => {
              const currentPoints = getFiscalPoints(fiscalInput, solicitacoes);
              const isAlreadyAssigned = currentSol?.fiscalObraAtribuido === fiscalInput;
              const cl = (currentSol?.classeObra || '').toUpperCase().trim();
              const thisWorkPoints = cl === 'IV' || cl.includes('SPECIAL') || cl.includes('MUITO ALTA') || cl === 'CLASSE IV' ? 4
                : cl === 'III' || cl.includes('GRANDE') || cl === 'CLASSE III' ? 3
                : cl === 'II' || cl.includes('MÉDIO') || cl.includes('MEDIO') || cl === 'CLASSE II' ? 2
                : 1;

              const simulatedPoints = isAlreadyAssigned 
                ? currentPoints 
                : currentPoints + thisWorkPoints;

              let isSuperAllocated = simulatedPoints > 35;
              let badgeBg = isSuperAllocated 
                ? 'bg-rose-50 border-rose-250 text-rose-800' 
                : simulatedPoints >= 25 
                  ? 'bg-amber-50 border-amber-250 text-amber-850' 
                  : 'bg-emerald-50 border-emerald-250 text-emerald-800';
                  
              let dotColor = isSuperAllocated 
                ? 'bg-rose-600 animate-ping' 
                : simulatedPoints >= 25 
                  ? 'bg-amber-500' 
                  : 'bg-emerald-500';

              return (
                <div id="fiscal-control-allocation-semaphore-detail" className={`p-2.5 rounded-xl border ${badgeBg} text-[10px] transition-all flex flex-col gap-1`}>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                    <span className="uppercase tracking-wider">
                      {isSuperAllocated ? '🚨 SUPER-ALOCADO (CRÍTICO)' : simulatedPoints >= 25 ? '⚠️ ALOCAÇÃO ALTA (ATENÇÃO)' : '✅ ALOCAÇÃO REGULAR (OK)'}
                    </span>
                  </div>
                  <p className="opacity-90">
                    Pontuação atual de fiscalização: <strong>{simulatedPoints} / 35 pontos</strong> recomendados.
                    {isAlreadyAssigned 
                      ? ` (Obra corrente inclusa na contagem: ${thisWorkPoints} pts)` 
                      : ` (Passará a incluir esta obra no histórico: +${thisWorkPoints} pts)`
                    }
                  </p>
                </div>
              );
            })()}

            {!somenteLeitura && (
            <button
              id="save-fiscal-btn"
              type="submit"
              className="w-full py-1.5 text-xs text-white font-bold bg-slate-800 hover:bg-slate-900 rounded-lg cursor-pointer transition-colors"
            >
              Atribuir Fiscal
            </button>
            )}
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
            {!somenteLeitura && (
            <button
              id="add-diario-btn"
              type="submit"
              className="w-full py-2 text-xs text-white font-black uppercase bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer transition-colors animate-pulse"
            >
              Enviar Diário de Campo
            </button>
            )}
          </form>
        </div>
      </div>

    </div>
  );
}

// Simula o download de um documento anexado (mesmo padrão usado em SolicitacaoDetalhes.tsx:
// gera um arquivo de texto placeholder, já que o app ainda não integra um storage real).
function simularDownloadDocumento(fileName: string, label: string) {
  const textContent = `--- Governo do Estado de Minas Gerais ---
Secretaria de Estado de Educação (SEE-MG)

DOCUMENTO: ${label}
ARQUIVO ORIGEM: ${fileName}
DATA DE CONSULTA: ${new Date().toLocaleDateString('pt-BR')}

Este é um arquivo auxiliar gerado dinamicamente para simulação do processo físico-financeiro de obras e faturamento de dotação do PAF e SGO. Todas as validações foram formalizadas eletronicamente via fluxo de trabalho.

----------------------------------------
Plataforma e-SGO - SEE-MG`;

  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// --- 8. SUB DOCUMENTOS (GED) ---
// Checklist de documentos obrigatórios da execução (ART, Projetos…) — anexado pelo fiscal
// da obra e persistido em public.documentos (categoria 'ged_execucao'). Itens obrigatórios
// pendentes bloqueiam o checklist de Conclusão de Obra (ver SolicitacaoDetalhes.tsx).
function SubDocumentos({ currentSol, onUpdate, somenteLeitura = false }: { currentSol: Solicitacao | null; onUpdate: (sol: Solicitacao) => void; somenteLeitura?: boolean }) {
  if (!currentSol) return <NoObraSelected />;

  const documentosGED = montarChecklistGED(currentSol.documentosGED);
  const pendentesObrigatorios = documentosGED.filter(d => d.obrigatorio && !d.fileName);

  const handleUpload = (docId: string, file: File) => {
    const sizeFormatted = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    const atualizados = documentosGED.map(d => d.id === docId
      ? { ...d, fileName: file.name, fileSize: sizeFormatted, uploadedAt: new Date().toISOString().split('T')[0], status: 'aprovado' as const }
      : d);
    onUpdate({ ...currentSol, documentosGED: atualizados });
  };

  const handleRemover = (docId: string) => {
    const atualizados = documentosGED.map(d => d.id === docId
      ? { ...d, fileName: undefined, fileSize: undefined, uploadedAt: undefined, status: 'pendente' as const }
      : d);
    onUpdate({ ...currentSol, documentosGED: atualizados });
  };

  return (
    <div className="grid grid-cols-1 gap-6 animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex justify-between items-center border-b border-slate-50 pb-3 mb-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <UploadCloud className="w-4 h-4 text-indigo-500" />
            Documentos Obrigatórios da Execução
          </h3>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${pendentesObrigatorios.length === 0 ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
            {pendentesObrigatorios.length === 0 ? 'TUDO ANEXADO' : `${pendentesObrigatorios.length} PENDENTE(S)`}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 mb-4 mt-2">
          Estes documentos são exigidos pelo checklist de Conclusão de Obra — a obra não pode ser encerrada enquanto houver item obrigatório pendente aqui.
        </p>

        <div className="space-y-3">
          {documentosGED.map(doc => (
            <GEDDocRow
              key={doc.id}
              doc={doc}
              somenteLeitura={somenteLeitura}
              onUpload={(file) => handleUpload(doc.id, file)}
              onRemover={() => handleRemover(doc.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Linha de upload de um documento obrigatório da GED — mesmo padrão visual dos uploads da
// aba Conclusão de Obra em SolicitacaoDetalhes.tsx (fileName/fileSize/uploadedAt), sem o
// fluxo de aprovação do analista DORE (aqui quem anexa é o próprio fiscal responsável).
function GEDDocRow({ doc, somenteLeitura, onUpload, onRemover }: {
  doc: DocumentoChecklist;
  somenteLeitura: boolean;
  onUpload: (file: File) => void;
  onRemover: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const isUploaded = !!doc.fileName;

  return (
    <div className={`p-4 rounded-xl border ${isUploaded ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/50'}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-800 text-xs">{doc.nome}</span>
            {doc.obrigatorio && (
              <span className="text-[9px] font-black text-red-500 uppercase tracking-wide">Obrigatório</span>
            )}
          </div>
          <p className="text-[10.5px] text-slate-500 mt-0.5 leading-tight">{doc.desc}</p>
          {isUploaded && (
            <p className="text-[10px] text-slate-400 font-mono mt-1 break-all">
              {doc.fileName} • {doc.fileSize} • Enviado em {doc.uploadedAt ? new Date(doc.uploadedAt + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informado'}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            type="file"
            accept=".pdf,.doc,.docx,.dwg"
            ref={inputRef}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = '';
            }}
          />
          {isUploaded ? (
            <>
              <button
                type="button"
                onClick={() => simularDownloadDocumento(doc.fileName!, doc.nome)}
                className="text-blue-600 hover:text-blue-800 text-xs font-bold px-2 py-1 hover:bg-blue-50 rounded transition-all cursor-pointer flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Baixar
              </button>
              {!somenteLeitura && (
                <button type="button" onClick={onRemover} className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 hover:bg-red-50 rounded transition-all cursor-pointer flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Remover
                </button>
              )}
            </>
          ) : (
            !somenteLeitura && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="px-3 py-1.5 border border-dashed border-slate-350 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <UploadCloud className="w-3.5 h-3.5 text-slate-500" /> Anexar
              </button>
            )
          )}
        </div>
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

// ==========================================================
// AJUSTES CONTRATUAIS — COMPONENTES
// ==========================================================

// Mapeia o status interno (4 valores) para o enum do banco (3 valores: pendente/aprovado/recusado)
function statusParaBanco(status: 'aguardando_analista' | 'em_analise' | 'aprovado' | 'reprovado'): 'pendente' | 'aprovado' | 'recusado' {
  if (status === 'aprovado') return 'aprovado';
  if (status === 'reprovado') return 'recusado';
  return 'pendente';
}

// --- REEQUILÍBRIO FINANCEIRO ---
function SubReequilibrio({
  currentSol,
  onUpdate,
  somenteLeitura = false,
}: {
  currentSol: Solicitacao | null;
  onUpdate: (sol: Solicitacao) => void;
  somenteLeitura?: boolean;
}) {
  const [step, setStep] = useState<1 | 2>(1);

  // Etapa 1
  const [justificativaFile, setJustificativaFile]     = useState<{ name: string; size: string } | null>(null);
  const [autorizacaoDIPCFile, setAutorizacaoDIPCFile] = useState<{ name: string; size: string } | null>(null);

  // Etapa 2
  const [planilhaFile, setPlanilhaFile]           = useState<{ name: string; size: string } | null>(null);
  const [dataRefSEE, setDataRefSEE]               = useState('');
  const [descontoContratual, setDescontoContratual] = useState('');
  const [valorReequilibrado, setValorReequilibrado] = useState('');

  if (!currentSol) return <NoObraSelected />;

  // ── Validação Automática de Homologação ──────────────────────────────────
  const dataRef = currentSol.dataHomologacao || currentSol.contratoDataAssinatura;
  const mesesDesdeHomologacao = (() => {
    if (!dataRef) return null;
    const d = new Date(dataRef + 'T00:00:00');
    const hoje = new Date();
    return (hoje.getFullYear() - d.getFullYear()) * 12 + (hoje.getMonth() - d.getMonth());
  })();
  const validacaoOk = mesesDesdeHomologacao !== null && mesesDesdeHomologacao > 12;

  const valorOriginal = currentSol.valorHomologadoContratacao || currentSol.valorPlanilha || currentSol.valorHomologado || 0;
  const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const fmtSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (f: { name: string; size: string } | null) => void,
  ) => {
    const file = e.target.files?.[0];
    if (file) setter({ name: file.name, size: fmtSize(file.size) });
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!planilhaFile) { alert('Anexe a Planilha de Reequilíbrio.'); return; }
    if (!dataRefSEE)   { alert('Informe a Data da Referência SEE.'); return; }

    let dbId = currentSol._dbId;
    if (!dbId) {
      const { data: solRow, error: solError } = await supabase
        .from('solicitacoes')
        .select('id')
        .eq('codigo_sgo', currentSol.id)
        .single();
      if (solError || !solRow) {
        alert('Não foi possível localizar o registro da obra no banco para gravar o reequilíbrio.');
        return;
      }
      dbId = solRow.id;
    }

    const status: ReequilibrioItem['status'] = 'aguardando_analista';
    const descontoNum = parseFloat(descontoContratual) || 0;
    const valorReequilibradoNum = parseFloat(valorReequilibrado) || undefined;
    const { data: userData } = await supabase.auth.getUser();

    const { data: reequilibrioRow, error: reequilibrioError } = await supabase
      .from('reequilibrios_financeiros')
      .insert({
        solicitacao_id: dbId,
        valor_reequilibrio: valorReequilibradoNum ?? null,
        motivo: null,
        status: statusParaBanco(status),
        data_referencia_see: dataRefSEE || null,
        desconto_contratual: descontoNum ?? null,
        valor_original: valorOriginal ?? null,
        analista_nome: null,
        usuario_id: userData.user?.id ?? null
      })
      .select('id')
      .single();

    if (reequilibrioError || !reequilibrioRow) {
      console.error('Erro ao gravar reequilíbrio no Supabase:', reequilibrioError);
      alert('Erro ao gravar a solicitação de reequilíbrio no banco de dados. Tente novamente.');
      return;
    }

    const novo: ReequilibrioItem = {
      id: reequilibrioRow.id,
      dataCriacao: new Date().toISOString().split('T')[0],
      status,
      justificativaFileName:   justificativaFile?.name,
      justificativaFileSize:   justificativaFile?.size,
      autorizacaoDIPCFileName: autorizacaoDIPCFile?.name,
      autorizacaoDIPCFileSize: autorizacaoDIPCFile?.size,
      planilhaFileName:        planilhaFile.name,
      planilhaFileSize:        planilhaFile.size,
      dataReferenceSEE:        dataRefSEE,
      descontoContratual:      descontoNum,
      valorOriginal,
      valorReequilibrado: valorReequilibradoNum,
    };

    onUpdate({ ...currentSol, reequilibrios: [...(currentSol.reequilibrios || []), novo] });
    alert('Solicitação de Reequilíbrio Financeiro enviada! Aguardando atribuição de analista.');
  };

  const inputCls = 'w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20';
  const labelCls = 'block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1';

  const UploadZone = ({
    id, label, file, accept, onFile, cor,
  }: {
    id: string; label: string; accept: string;
    file: { name: string; size: string } | null;
    onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
    cor: string;
  }) => (
    <div>
      <label className={labelCls}>{label}</label>
      {file ? (
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs ${cor}`}>
          <FileText className="w-4 h-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-bold truncate">{file.name}</p>
            <p className="text-[9px] opacity-70">{file.size}</p>
          </div>
          <label htmlFor={id} className="shrink-0 px-2 py-1 text-[9px] font-black border rounded cursor-pointer hover:opacity-80 transition">
            Trocar
          </label>
          <input id={id} type="file" accept={accept} className="hidden" onChange={onFile} />
        </div>
      ) : (
        <label htmlFor={id}
          className="flex flex-col items-center justify-center gap-1.5 px-4 py-4 border-2 border-dashed border-slate-300 hover:border-violet-400 hover:bg-violet-50/20 rounded-xl cursor-pointer transition group">
          <UploadCloud className="w-5 h-5 text-slate-300 group-hover:text-violet-400 transition" />
          <p className="text-xs font-bold text-slate-500 group-hover:text-violet-700 transition">Clique para anexar</p>
          <p className="text-[9px] text-slate-400">{accept.toUpperCase().replace(/\./g, '').replace(/,/g, ', ')}</p>
          <input id={id} type="file" accept={accept} className="hidden" onChange={onFile} />
        </label>
      )}
    </div>
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-violet-600" /> Reequilíbrio Financeiro
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Solicitação de reequilíbrio econômico-financeiro do contrato de obra.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {[1, 2].map(n => (
            <span key={n} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 ${step === n ? 'bg-violet-600 text-white border-violet-600' : n < step ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>{n}</span>
          ))}
        </div>
      </div>

      {/* ── ETAPA 1 ────────────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">

          {/* Validação Automática */}
          <div className={`rounded-2xl border p-5 space-y-3 ${validacaoOk ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              {validacaoOk
                ? <CheckCircle className="w-4 h-4 text-emerald-600" />
                : <AlertCircle className="w-4 h-4 text-rose-500" />
              }
              <span className={validacaoOk ? 'text-emerald-800' : 'text-rose-800'}>
                Validação Automática — Tempo de Homologação
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white/70 rounded-xl border p-3">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Data de Homologação (PAF)</p>
                <p className="text-xs font-black text-slate-800 mt-1 font-mono">
                  {dataRef ? new Date(dataRef + 'T12:00:00').toLocaleDateString('pt-BR') : 'Não informada'}
                </p>
              </div>
              <div className="bg-white/70 rounded-xl border p-3">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Meses Decorridos</p>
                <p className={`text-xl font-black mt-1 ${validacaoOk ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {mesesDesdeHomologacao !== null ? `${mesesDesdeHomologacao} meses` : '—'}
                </p>
              </div>
              <div className={`rounded-xl border p-3 flex items-center gap-2 ${validacaoOk ? 'bg-emerald-100 border-emerald-300' : 'bg-rose-100 border-rose-300'}`}>
                {validacaoOk
                  ? <><CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" /><div><p className="text-[10px] font-black text-emerald-800">Apto para reequilíbrio</p><p className="text-[9px] text-emerald-600">Homologação superior a 12 meses</p></div></>
                  : <><AlertCircle className="w-5 h-5 text-rose-500 shrink-0" /><div><p className="text-[10px] font-black text-rose-800">Processo bloqueado</p><p className="text-[9px] text-rose-600">Necessário mínimo de 12 meses</p></div></>
                }
              </div>
            </div>

            {!validacaoOk && (
              <div className="p-3 bg-rose-100 border border-rose-300 rounded-xl text-xs text-rose-800 font-medium leading-relaxed">
                O processo de reequilíbrio financeiro somente pode ser iniciado quando a homologação do contrato
                superar <strong>12 meses</strong>. Retorne após atingir este prazo.
              </div>
            )}
          </div>

          {validacaoOk && (
            <>
              {/* Documentos Etapa 1 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-violet-500" /> Documentos da Etapa 1
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <UploadZone
                    id="just-empresa" label="Justificativa da Empresa *"
                    accept=".pdf" file={justificativaFile}
                    cor="border-violet-200 bg-violet-50 text-violet-800"
                    onFile={e => handleFile(e, setJustificativaFile)}
                  />
                  <UploadZone
                    id="autoriza-dipc" label="Autorização da DIPC *"
                    accept=".pdf" file={autorizacaoDIPCFile}
                    cor="border-blue-200 bg-blue-50 text-blue-800"
                    onFile={e => handleFile(e, setAutorizacaoDIPCFile)}
                  />
                </div>
              </div>

              {!somenteLeitura && (
              <div className="flex justify-end">
                <button type="button"
                  disabled={!justificativaFile || !autorizacaoDIPCFile}
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1.5 px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl transition cursor-pointer">
                  Planilha de Reequilíbrio <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── ETAPA 2 ────────────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5">
          {/* Upload planilha */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-violet-500" /> Planilha de Reequilíbrio
            </h3>
            <UploadZone
              id="planilha-req" label="Planilha XLSX *"
              accept=".xlsx,.xls"
              file={planilhaFile}
              cor="border-emerald-200 bg-emerald-50 text-emerald-800"
              onFile={e => handleFile(e, setPlanilhaFile)}
            />
          </div>

          {/* Dados do reequilíbrio */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-violet-500" /> Dados Registrados pelo Sistema
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Data da Referência SEE *</label>
                <input type="date" value={dataRefSEE} onChange={e => setDataRefSEE(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Desconto Contratual (%)</label>
                <input type="number" placeholder="Ex: 5.5" value={descontoContratual}
                  onChange={e => setDescontoContratual(e.target.value)} className={inputCls + ' font-mono'} />
              </div>
              <div>
                <label className={labelCls}>Valor Original (R$)</label>
                <div className="px-3 py-2 text-xs border border-emerald-200 bg-emerald-50/40 rounded-xl font-mono font-bold text-slate-800">
                  {fmtBRL(valorOriginal)}
                </div>
              </div>
              <div>
                <label className={labelCls}>Valor Reequilibrado (R$)</label>
                <input type="number" placeholder="Calculado ou informado" value={valorReequilibrado}
                  onChange={e => setValorReequilibrado(e.target.value)} className={inputCls + ' font-mono'} />
              </div>
            </div>

            {/* Resumo */}
            {(descontoContratual || valorReequilibrado) && (
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-xs space-y-1.5">
                <p className="font-black text-violet-700 text-[10px] uppercase tracking-wider">Resumo do Reequilíbrio</p>
                <div className="flex justify-between">
                  <span className="text-slate-600">Valor Original:</span>
                  <span className="font-mono font-bold">{fmtBRL(valorOriginal)}</span>
                </div>
                {descontoContratual && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Desconto Contratual:</span>
                    <span className="font-mono font-bold text-rose-600">−{descontoContratual}%</span>
                  </div>
                )}
                {valorReequilibrado && (
                  <div className="flex justify-between border-t border-violet-200 pt-1.5">
                    <span className="font-bold text-violet-800">Valor Reequilibrado:</span>
                    <span className="font-mono font-black text-violet-800">{fmtBRL(parseFloat(valorReequilibrado))}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {!somenteLeitura && (
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(1)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer">
              ← Voltar
            </button>
            <button type="button" onClick={handleSubmit}
              className="flex items-center gap-1.5 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-black rounded-xl shadow-sm transition cursor-pointer">
              <CheckCircle className="w-4 h-4" /> Enviar Solicitação
            </button>
          </div>
          )}
        </div>
      )}

      {/* Histórico */}
      {(currentSol.reequilibrios || []).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
            Histórico de Solicitações
          </h3>
          {(currentSol.reequilibrios || []).map(r => (
            <div key={r.id} className="flex items-start justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <p className="font-bold text-slate-700">{r.id} — {r.dataCriacao}</p>
                {r.valorReequilibrado && <p className="text-slate-500 mt-0.5">Valor reequilibrado: {fmtBRL(r.valorReequilibrado)}</p>}
              </div>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                r.status === 'aguardando_analista' ? 'bg-amber-100 text-amber-700' :
                r.status === 'em_analise'          ? 'bg-blue-100 text-blue-700' :
                r.status === 'aprovado'            ? 'bg-emerald-100 text-emerald-700' :
                                                    'bg-rose-100 text-rose-700'
              }`}>{r.status.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- SALDO COMPLEMENTAR OBRA DISTRATADA ---
const DOCS_SALDO_COMPLEMENTAR = [
  'Extrato bancário',
  'Declaração da escola',
  'Medições acumuladas',
  'Distrato',
  'Relatório técnico',
  'Justificativa técnica',
  'Ata do colegiado',
  'Relatório fotográfico',
  'Projeto básico',
];

function SubSaldoComplementar({
  currentSol,
  onUpdate,
  somenteLeitura = false,
}: {
  currentSol: Solicitacao | null;
  onUpdate: (sol: Solicitacao) => void;
  somenteLeitura?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<'dados' | 'documentos'>('dados');

  // Documentos
  const [docs, setDocs] = useState(
    DOCS_SALDO_COMPLEMENTAR.map(item => ({ item, fileName: '', fileSize: '' }))
  );

  const [saved, setSaved] = useState(false);

  if (!currentSol) return <NoObraSelected />;

  // Disponível apenas para obras com contrato distratado
  const isDistratada =
    currentSol.statusContratoEmpresa === 'Distratada' ||
    (currentSol.empresasAnteriores && currentSol.empresasAnteriores.length > 0);

  if (!isDistratada) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
        <Lock className="w-12 h-12 mx-auto text-slate-300" />
        <h3 className="text-sm font-black text-slate-700">Funcionalidade Restrita</h3>
        <p className="text-xs max-w-xs mx-auto leading-relaxed">
          O Saldo Complementar de Obra Distratada está disponível apenas para obras cujo contrato
          foi <strong className="text-rose-600">distratado</strong>.
        </p>
      </div>
    );
  }

  // Empresa distratada
  const empresaDistratada =
    currentSol.empresasAnteriores?.slice(-1)[0]?.nome ||
    (currentSol.statusContratoEmpresa === 'Distratada' ? currentSol.empresaContratada : '') ||
    '—';

  // Dados financeiros — vêm do próprio sistema, não são digitados aqui:
  // Valor TC = valor homologado do PAF; Valor Liberado = soma das parcelas já pagas do PAF;
  // Valor Pago = valor executado (medido) pela empresa distratada; Saldo em Conta = Liberado − Pago.
  const numTC    = currentSol.valorHomologado || currentSol.valorPlanilha || 0;
  const numLib   = (currentSol.parcelasPAF || []).reduce((s, p) => s + (p.valor || 0), 0);
  const numPago  = currentSol.empresasAnteriores?.slice(-1)[0]?.valorExecutado || 0;
  const numSaldo = Math.max(0, numLib - numPago);

  const valorDisponivel        = numSaldo;
  const valorAindaNaoLiberado  = Math.max(0, numTC - numLib);
  const valorTotalDisponivel   = valorDisponivel + valorAindaNaoLiberado;

  const fmtBRL = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const todosDocsAnexados = docs.every(d => !!d.fileName);

  const handleUploadDoc = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocs(prev => prev.map((d, i) =>
      i === idx ? { ...d, fileName: file.name, fileSize: `${(file.size / 1024).toFixed(0)} KB` } : d
    ));
    e.target.value = '';
  };

  const handleRemoveDoc = (idx: number) => {
    setDocs(prev => prev.map((d, i) => (i === idx ? { ...d, fileName: '', fileSize: '' } : d)));
  };

  const handleSubmit = async () => {
    if (!todosDocsAnexados) {
      alert('Todos os documentos são obrigatórios. Anexe todos antes de enviar.');
      return;
    }
    if (!numTC) {
      alert('Não foi encontrado PAF homologado para esta obra. Registre o PAF antes de solicitar o saldo complementar.');
      return;
    }

    let dbId = currentSol._dbId;
    if (!dbId) {
      const { data: solRow, error: solError } = await supabase
        .from('solicitacoes')
        .select('id')
        .eq('codigo_sgo', currentSol.id)
        .single();
      if (solError || !solRow) {
        alert('Não foi possível localizar o registro da obra no banco para gravar o saldo complementar.');
        return;
      }
      dbId = solRow.id;
    }

    const documentos = docs.map(d => ({ item: d.item, obrigatorio: true, checked: !!d.fileName, fileName: d.fileName || undefined }));
    const { data: userData } = await supabase.auth.getUser();

    const { data: saldoRow, error: saldoError } = await supabase
      .from('saldos_complementares')
      .insert({
        solicitacao_id: dbId,
        valor_saldo: numSaldo,
        descricao: null,
        status: 'pendente',
        valor_tc: numTC,
        valor_liberado: numLib,
        valor_pago: numPago,
        saldo_em_conta: numSaldo,
        analista_nome: null,
        documentos_checklist: JSON.stringify(documentos),
        usuario_id: userData.user?.id ?? null
      })
      .select('id')
      .single();

    if (saldoError || !saldoRow) {
      console.error('Erro ao gravar saldo complementar no Supabase:', saldoError);
      alert('Erro ao gravar a solicitação de saldo complementar no banco de dados. Tente novamente.');
      return;
    }

    const novo: SaldoComplementarItem = {
      id: saldoRow.id,
      dataCriacao: new Date().toISOString().split('T')[0],
      status: 'aguardando_analista',
      valorTC: numTC,
      valorLiberado: numLib,
      valorPago: numPago,
      saldoEmConta: numSaldo,
      documentos,
    };

    onUpdate({
      ...currentSol,
      saldosComplementares: [...(currentSol.saldosComplementares || []), novo],
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    alert('Solicitação de Saldo Complementar enviada! Aguardando atribuição de analista.');
  };

  const labelCls = 'block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1';
  const autoCls  = 'px-3 py-2 text-xs border border-emerald-200 bg-emerald-50/40 rounded-xl font-semibold text-slate-800';

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <Coins className="w-4 h-4 text-teal-600" /> Saldo Complementar — Obra Distratada
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Levantamento financeiro e documental para continuidade da obra após distrato contratual.
          </p>
        </div>
        {saved && (
          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 shrink-0">
            <CheckCircle className="w-3.5 h-3.5" /> Enviado
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-1">
        {[
          { id: 'dados',      label: 'Dados & Financeiro' },
          { id: 'documentos', label: 'Documentação Obrigatória' },
        ].map(t => (
          <button key={t.id} type="button"
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2.5 text-xs font-black border-b-2 transition-colors cursor-pointer ${
              activeTab === t.id
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ABA 1: DADOS ─────────────────────────────────────────────────── */}
      {activeTab === 'dados' && (
        <div className="space-y-5">
          {/* Dados da Obra */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-teal-500" /> Dados da Obra
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className={labelCls}>TC / PAF</label>
                <div className={autoCls}>{currentSol.numeroPAF || '—'}</div>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Escola</label>
                <div className={autoCls}>{currentSol.nomeEscola}</div>
              </div>
              <div>
                <label className={labelCls}>Município</label>
                <div className={autoCls}>{currentSol.municipio || '—'}</div>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>SRE</label>
                <div className={autoCls}>{currentSol.sre || '—'}</div>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Empresa — Contrato Distratado</label>
                <div className="px-3 py-2 text-xs border border-rose-200 bg-rose-50/30 rounded-xl font-semibold text-rose-800">
                  {empresaDistratada}
                </div>
              </div>
            </div>
          </div>

          {/* Dados Financeiros — vêm do próprio sistema (PAF homologado e execução da empresa
              distratada), não são digitados aqui. */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-teal-500" /> Dados Financeiros
            </h3>
            {numTC === 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                ⚠️ Nenhum PAF homologado encontrado para esta obra. Os valores abaixo ficarão zerados até o PAF ser registrado.
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Valor TC (R$)',      val: numTC },
                { label: 'Valor Liberado (R$)', val: numLib },
                { label: 'Valor Pago (R$)',     val: numPago },
                { label: 'Saldo em Conta (R$)', val: numSaldo },
              ].map(f => (
                <div key={f.label}>
                  <label className={labelCls}>{f.label}</label>
                  <div className={autoCls}>{fmtBRL(f.val)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Cálculo */}
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
              <Calculator className="w-4 h-4" /> Valor Total Disponível — Cálculo Automático
            </h3>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Valor Disponível (Saldo em Conta)',  value: valorDisponivel,       sign: '' },
                { label: 'Valor Ainda Não Liberado',           value: valorAindaNaoLiberado,  sign: '+' },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between gap-4 text-xs">
                  <span className="text-teal-700 font-semibold flex items-center gap-1.5">
                    {r.sign && <span className="text-teal-500 font-black w-3">{r.sign}</span>}
                    {!r.sign && <span className="w-3" />}
                    {r.label}
                  </span>
                  <span className="font-mono font-bold text-teal-900">{fmtBRL(r.value)}</span>
                </div>
              ))}
              <div className="border-t border-teal-300 pt-2 flex items-center justify-between gap-4">
                <span className="text-teal-800 font-black text-xs flex items-center gap-1.5">
                  <span className="text-teal-600 font-black w-3">=</span>
                  Valor Total Disponível
                </span>
                <span className="font-mono font-black text-base text-teal-900">{fmtBRL(valorTotalDisponivel)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="button" onClick={() => setActiveTab('documentos')}
              className="flex items-center gap-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl transition cursor-pointer">
              Documentação <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── ABA 2: DOCUMENTAÇÃO ──────────────────────────────────────────── */}
      {activeTab === 'documentos' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <UploadCloud className="w-4 h-4 text-teal-500" /> Documentação Obrigatória
              </h3>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${todosDocsAnexados ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                {docs.filter(d => d.fileName).length}/{docs.length} anexados
              </span>
            </div>
            <p className="text-[10px] text-slate-500">
              Todos os documentos são obrigatórios para envio da solicitação.
            </p>
            <div className="space-y-2">
              {docs.map((doc, idx) => {
                const isUploaded = !!doc.fileName;
                const inputId = `file-saldo-comp-${idx}`;
                return (
                  <div key={doc.item}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl border text-xs transition-colors ${
                      isUploaded ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50/30 border-rose-200'
                    }`}>
                    <div className="flex items-center gap-2 min-w-0">
                      {isUploaded
                        ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                        : <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                      }
                      <div className="min-w-0">
                        <span className={`font-bold block truncate ${isUploaded ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {doc.item}
                          <span className="ml-1.5 text-[8px] bg-rose-100 text-rose-600 px-1 rounded font-black uppercase">Obrigatório</span>
                        </span>
                        {isUploaded && (
                          <span className="text-[9px] text-slate-400 font-mono block truncate">{doc.fileName} · {doc.fileSize}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="file"
                        id={inputId}
                        className="hidden"
                        onChange={(e) => handleUploadDoc(idx, e)}
                      />
                      {isUploaded && (
                        <button type="button" onClick={() => handleRemoveDoc(idx)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Remover arquivo">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <label htmlFor={inputId}
                        className={`flex items-center gap-1 px-3 py-1 text-[10px] font-black rounded-lg border transition cursor-pointer ${
                          isUploaded
                            ? 'bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                            : 'bg-white border-rose-300 text-rose-600 hover:bg-rose-50'
                        }`}>
                        <UploadCloud className="w-3.5 h-3.5" />
                        {isUploaded ? 'Substituir' : 'Anexar'}
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {!somenteLeitura && (
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => setActiveTab('dados')}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer">
              ← Voltar
            </button>
            <button type="button" onClick={handleSubmit}
              disabled={!todosDocsAnexados}
              className="flex items-center gap-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl shadow-sm transition cursor-pointer">
              <CheckCircle className="w-4 h-4" /> Enviar Solicitação
            </button>
          </div>
          )}
        </div>
      )}

      {/* Histórico */}
      {(currentSol.saldosComplementares || []).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
            Histórico de Solicitações
          </h3>
          {(currentSol.saldosComplementares || []).map(sc => (
            <div key={sc.id} className="flex items-start justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <p className="font-bold text-slate-700">{sc.id} — {sc.dataCriacao}</p>
                <p className="text-slate-500 mt-0.5">Valor Total: {fmtBRL(sc.saldoEmConta + Math.max(0, sc.valorTC - sc.valorLiberado))}</p>
              </div>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                sc.status === 'aguardando_analista' ? 'bg-amber-100 text-amber-700' :
                sc.status === 'em_analise'          ? 'bg-blue-100 text-blue-700' :
                sc.status === 'aprovado'            ? 'bg-emerald-100 text-emerald-700' :
                                                     'bg-rose-100 text-rose-700'
              }`}>{sc.status.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
