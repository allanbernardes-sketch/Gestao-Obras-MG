import React, { useState, useMemo } from 'react';
import { ClipboardList, Search, Eye, HelpCircle, CheckCircle, Landmark } from 'lucide-react';
import { Solicitacao } from '../types';

interface AcompanhamentoPafProps {
  solicitacoes: Solicitacao[];
  onSelectSolicitacao: (id: string) => void;
  perfilUsuario: string;
  onNavigateToTab?: (tab: string, schoolId?: string) => void;
}

export default function AcompanhamentoPaf({
  solicitacoes,
  onSelectSolicitacao,
  perfilUsuario,
  onNavigateToTab
}: AcompanhamentoPafProps) {
  // Filter States
  const [filtroId, setFiltroId] = useState('');
  const [filtroCodesc, setFiltroCodesc] = useState('');
  const [filtroMunicipio, setFiltroMunicipio] = useState('');
  const [filtroSre, setFiltroSre] = useState('');
  const [filtroEscola, setFiltroEscola] = useState('');
  const [filtroResponsavel, setFiltroResponsavel] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroData, setFiltroData] = useState('');

  // Extract unique values from all solicitacoes to populate dropdowns
  const uniqueIds = useMemo(() => {
    return Array.from(new Set(solicitacoes.map(s => s.id))).sort();
  }, [solicitacoes]);

  const uniqueCodescs = useMemo(() => {
    return Array.from(new Set(solicitacoes.map(s => s.codesc).filter(Boolean))).sort();
  }, [solicitacoes]);

  const uniqueMunicipios = useMemo(() => {
    return Array.from(new Set(solicitacoes.map(s => s.municipio).filter(Boolean))).sort();
  }, [solicitacoes]);

  const uniqueSres = useMemo(() => {
    return Array.from(new Set(solicitacoes.map(s => s.sre).filter(Boolean))).sort();
  }, [solicitacoes]);

  const uniqueEscolas = useMemo(() => {
    return Array.from(new Set(solicitacoes.map(s => s.nomeEscola).filter(Boolean))).sort();
  }, [solicitacoes]);

  const uniqueResponsaveis = useMemo(() => {
    const list = new Set<string>();
    solicitacoes.forEach(s => {
      if (s.analistaAtribuido) {
        list.add(s.analistaAtribuido);
      }
    });
    return Array.from(list).sort();
  }, [solicitacoes]);

  // Format YYYY-MM-DD to DD/MM/YYYY
  const formatBrDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Status mapping and styling
  const getAcompStatusInfo = (s: Solicitacao) => {
    if (s.etapaAtual === 'cadastro') {
      return {
        classes: 'bg-slate-100 text-slate-700 border-slate-200',
        label: 'Fase de Cadastro'
      };
    }
    if (s.etapaAtual === 'analise') {
      return {
        classes: 'bg-blue-50 text-blue-700 border-blue-200',
        label: 'Fase de Análise'
      };
    }
    if (s.etapaAtual === 'paf_autorizacao') {
      return {
        classes: 'bg-amber-50 text-amber-800 border-amber-350',
        label: 'Aguardando Autorização'
      };
    }
    if (s.etapaAtual === 'paf') {
      return {
        classes: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        label: 'Aguardando Geração do PAF'
      };
    }
    if (s.numeroPAF) {
      return {
        classes: 'bg-emerald-50 text-emerald-800 border-emerald-250',
        label: `✓ Gerado PAF (${s.numeroPAF})`
      };
    }
    if (s.etapaAtual === 'ordem_inicio' || s.etapaAtual === 'execucao') {
      return {
        classes: 'bg-emerald-50 text-emerald-800 border-emerald-250',
        label: s.numeroPAF ? `✓ Gerado PAF (${s.numeroPAF})` : '✓ Gerado PAF'
      };
    }
    return {
      classes: 'bg-slate-100 text-slate-700 border-slate-200',
      label: s.etapaAtual
    };
  };

  // Filter logic
  const filteredSolicitacoes = useMemo(() => {
    return solicitacoes.filter(s => {
      if (filtroId && s.id !== filtroId) return false;
      if (filtroCodesc && s.codesc !== filtroCodesc) return false;
      if (filtroMunicipio && s.municipio !== filtroMunicipio) return false;
      if (filtroSre && s.sre !== filtroSre) return false;
      if (filtroEscola && s.nomeEscola !== filtroEscola) return false;
      
      if (filtroResponsavel) {
        if (filtroResponsavel === 'Não atribuído') {
          if (s.analistaAtribuido) return false;
        } else {
          if (s.analistaAtribuido !== filtroResponsavel) return false;
        }
      }

      if (filtroStatus) {
        if (filtroStatus === 'cadastro' && s.etapaAtual !== 'cadastro') return false;
        if (filtroStatus === 'analise' && s.etapaAtual !== 'analise') return false;
        if (filtroStatus === 'paf_autorizacao' && s.etapaAtual !== 'paf_autorizacao') return false;
        if (filtroStatus === 'paf' && s.etapaAtual !== 'paf') return false;
        if (filtroStatus === 'execucao') {
          const isExec = s.etapaAtual === 'execucao' || s.etapaAtual === 'ordem_inicio' || !!s.numeroPAF;
          if (!isExec) return false;
        }
      }

      if (filtroData) {
        if (s.dataCriacao !== filtroData) return false;
      }

      return true;
    });
  }, [
    solicitacoes,
    filtroId,
    filtroCodesc,
    filtroMunicipio,
    filtroSre,
    filtroEscola,
    filtroResponsavel,
    filtroStatus,
    filtroData
  ]);

  return (
    <div id="paf-acompanhamento-view" className="w-full flex-grow flex flex-col space-y-6">
      
      {/* CABEÇALHO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-left font-sans">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xs">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-800">
              Acompanhamento de PAF
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed mt-0.5 max-w-2xl">
              Acompanhe o status, os valores e faturamentos homologados dos Planos de Atendimento Financeiro (PAF).
            </p>
          </div>
        </div>
        
        <div className="bg-slate-50 border border-slate-200 py-2 px-3.5 rounded-xl flex items-center gap-2.5 self-start md:self-auto shrink-0">
          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider font-sans">Total Encontrado:</span>
          <span className="bg-blue-600 text-white font-extrabold text-[12px] h-6 px-2.5 rounded-full flex items-center justify-center">
            {filteredSolicitacoes.length}
          </span>
        </div>
      </div>

      {/* FILTROS DE PESQUISA */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs text-left space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <Search className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-black font-sans uppercase tracking-wider text-slate-700">
            Filtros de Pesquisa
          </h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 font-sans">
          {/* ID DE OBRA */}
          <div className="flex flex-col space-y-1">
            <label className="text-[9px] uppercase font-black text-slate-400 tracking-wider">ID de Obra</label>
            <select
              value={filtroId}
              onChange={(e) => setFiltroId(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 truncate h-9"
            >
              <option value="">Todos os IDs</option>
              {uniqueIds.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>

          {/* CODESC */}
          <div className="flex flex-col space-y-1">
            <label className="text-[9px] uppercase font-black text-slate-400 tracking-wider">CODESC</label>
            <select
              value={filtroCodesc}
              onChange={(e) => setFiltroCodesc(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 truncate h-9"
            >
              <option value="">Todos os CODESCs</option>
              {uniqueCodescs.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* MUNICÍPIO */}
          <div className="flex flex-col space-y-1">
            <label className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Município</label>
            <select
              value={filtroMunicipio}
              onChange={(e) => setFiltroMunicipio(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 truncate h-9"
            >
              <option value="">Todos os Municípios</option>
              {uniqueMunicipios.map(m => m && <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* REGIONAL (SRE) */}
          <div className="flex flex-col space-y-1">
            <label className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Regional (SRE)</label>
            <select
              value={filtroSre}
              onChange={(e) => setFiltroSre(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 truncate h-9"
            >
              <option value="">Todas as Regionais</option>
              {uniqueSres.map(s => s && <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* ESCOLA */}
          <div className="flex flex-col space-y-1">
            <label className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Escola</label>
            <select
              value={filtroEscola}
              onChange={(e) => setFiltroEscola(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 truncate h-9"
            >
              <option value="">Todas as Escolas</option>
              {uniqueEscolas.map(e => e && <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          {/* RESPONSÁVEL */}
          <div className="flex flex-col space-y-1">
            <label className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Responsável</label>
            <select
              value={filtroResponsavel}
              onChange={(e) => setFiltroResponsavel(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 truncate h-9"
            >
              <option value="">Todos</option>
              <option value="Não atribuído">Não atribuído</option>
              {uniqueResponsaveis.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* STATUS */}
          <div className="flex flex-col space-y-1">
            <label className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 truncate h-9"
            >
              <option value="">Todos os Status</option>
              <option value="cadastro">Fase de Cadastro</option>
              <option value="analise">Fase de Análise</option>
              <option value="paf_autorizacao">Aguardando Autorização</option>
              <option value="paf">Geração do PAF</option>
              <option value="execucao">Gerado PAF / Execução</option>
            </select>
          </div>

          {/* DATA DE CRIAÇÃO */}
          <div className="flex flex-col space-y-1">
            <label className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Data de Criação</label>
            <input
              type="date"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 h-9"
            />
          </div>
        </div>

        {(filtroId || filtroCodesc || filtroMunicipio || filtroSre || filtroEscola || filtroResponsavel || filtroStatus || filtroData) && (
          <div className="flex justify-end pt-2 border-t border-slate-100 font-sans">
            <button
              type="button"
              onClick={() => {
                setFiltroId('');
                setFiltroCodesc('');
                setFiltroMunicipio('');
                setFiltroSre('');
                setFiltroEscola('');
                setFiltroResponsavel('');
                setFiltroStatus('');
                setFiltroData('');
              }}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-lg text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
            >
              Limpar Filtros e Restaurar
            </button>
          </div>
        )}
      </div>

      {/* TABELA DE ACOMPANHAMENTO DE PAF */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs text-left">
        {filteredSolicitacoes.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-sans space-y-3 max-w-md mx-auto">
            <div className="w-12 h-12 bg-slate-50 border border-slate-150 rounded-full flex items-center justify-center text-slate-500 mx-auto shadow-3xs">
              <ClipboardList className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-700">Nenhum registro encontrado.</p>
            <p className="text-xs text-slate-400">Modifique ou limpe seus filtros de pesquisa para visualizar outros Planos de Atendimento Financeiro (PAF).</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px] h-12">
                  <th className="py-3 px-5 w-36">Obra ID</th>
                  <th className="py-3 px-4 w-32">CODESC</th>
                  <th className="py-3 px-4 w-52">Município / SRE</th>
                  <th className="py-3 px-4">Escola</th>
                  <th className="py-3 px-4 w-44">Tipo de Atendimento</th>
                  <th className="py-3 px-4 w-36">Data Criação</th>
                  <th className="py-3 px-4 text-right w-40">Valor Homologado</th>
                  <th className="py-3 px-5 text-center w-64">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSolicitacoes.map((sol) => {
                  const statusInfo = getAcompStatusInfo(sol);
                  const formattedDate = formatBrDate(sol.dataCriacao);
                  const valorObra = sol.valorHomologado || sol.valorPlanilha || 0;

                  const handleRowClick = () => {
                    if (sol.etapaAtual === 'paf') {
                      if (onNavigateToTab) {
                        onNavigateToTab('paf', sol.id);
                      }
                    } else if (sol.etapaAtual === 'paf_autorizacao') {
                      if (onNavigateToTab) {
                        onNavigateToTab('paf_autorizacao', sol.id);
                      }
                    } else if (
                      sol.numeroPAF ||
                      sol.etapaAtual === 'ordem_inicio' ||
                      sol.etapaAtual === 'execucao' ||
                      (sol.statusPAF && sol.statusPAF.toLowerCase().includes('gerado')) ||
                      (sol.statusObra && sol.statusObra.toLowerCase().includes('gerado'))
                    ) {
                      if (onNavigateToTab) {
                        onNavigateToTab('execucao_cadastro', sol.id);
                      }
                    } else {
                      onSelectSolicitacao(sol.id);
                    }
                  };

                  return (
                    <tr
                      key={sol.id}
                      onClick={handleRowClick}
                      className="hover:bg-blue-50/20 active:bg-blue-100/30 transition-colors group align-middle h-16 cursor-pointer"
                    >
                      {/* OBRA ID */}
                      <td className="py-3 px-5 font-mono font-black text-blue-700">
                        <span className="hover:underline transition-colors font-bold">
                          {sol.id}
                        </span>
                      </td>

                      {/* CODESC */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-600">
                        {sol.codesc || '---'}
                      </td>

                      {/* MUNICÍPIO / SRE */}
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-800 leading-tight">
                          {sol.municipio}
                        </p>
                        <p className="text-[9px] uppercase tracking-wide font-black text-slate-400 mt-0.5 leading-none">
                          {sol.sre}
                        </p>
                      </td>

                      {/* ESCOLA */}
                      <td className="py-3 px-4 font-bold text-slate-700">
                        {sol.nomeEscola}
                      </td>

                      {/* TIPO DE ATENDIMENTO */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black uppercase tracking-wide font-sans">
                          {sol.tipoAtendimento || sol.tipo || 'NORMAL'}
                        </span>
                      </td>

                      {/* DATA CRIAÇÃO */}
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {formattedDate}
                      </td>

                      {/* VALOR */}
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-[12.5px] text-slate-805">
                        {valorObra > 0 ? (
                          <span>R$ {valorObra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        ) : (
                          <span className="text-slate-400 font-sans font-normal text-[11px]">---</span>
                        )}
                      </td>

                      {/* STATUS Badge */}
                      <td className="py-3 px-5 text-center">
                        <span className={`inline-block px-3 py-1.5 border font-semibold rounded-full text-[11px] shrink-0 tracking-wide select-none ${statusInfo.classes}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
