import React, { useState, useMemo } from 'react';
import { FileClock, Search, ShieldCheck, User, Terminal, X } from 'lucide-react';
import { SistemaLog, PerfilUsuario } from '../types';

interface CentralLogsProps {
  logs: SistemaLog[];
  perfilUsuario: PerfilUsuario;
  onAddSimulatedLog: (action: string, detail: string, tipo: 'info' | 'sucesso' | 'alerta' | 'erro') => void;
}

export default function CentralNotificacoesLogs({ logs, perfilUsuario }: CentralLogsProps) {

  // Filtros
  const [logSearch, setLogSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('todos');
  const [filterPerfil, setFilterPerfil] = useState('todos');
  const [filterOperador, setFilterOperador] = useState('todos');
  const [filterEscola, setFilterEscola] = useState('todos');
  const [filterProcesso, setFilterProcesso] = useState('todos');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [somenteLigados, setSomenteLigados] = useState(false);

  const getPerfilNome = (perf: PerfilUsuario) => {
    switch (perf) {
      case 'gestor_dore': return 'Aline Davino (Gestor DORE)';
      case 'gestor_paf': return 'Silas Fagundes (Subsecretário de Administração)';
      default: return 'Gestor do Sistema';
    }
  };

  // Listas únicas para os selects
  const operadoresUnicos = useMemo(() => Array.from(new Set(logs.map(l => l.usuario).filter(Boolean))).sort(), [logs]);
  const escolasUnicas = useMemo(() => Array.from(new Set(logs.map(l => l.escola).filter(Boolean) as string[])).sort(), [logs]);
  const processosUnicos = useMemo(() => Array.from(new Set(logs.map(l => l.solicitacaoId).filter(Boolean) as string[])).sort(), [logs]);

  const filteredLogs = useMemo(() => logs.filter(l => {
    const busca = logSearch.toLowerCase();
    if (busca && !l.acao.toLowerCase().includes(busca) && !l.detalhe.toLowerCase().includes(busca) &&
        !l.usuario.toLowerCase().includes(busca) && !(l.escola || '').toLowerCase().includes(busca)) return false;

    if (filterSeverity !== 'todos' && l.tipo !== filterSeverity) return false;

    if (filterPerfil !== 'todos') {
      const p = l.perfil.toLowerCase();
      if (filterPerfil === 'tecnico' && !p.includes('técnico') && !p.includes('tecnico')) return false;
      if (filterPerfil === 'analista' && !p.includes('analista')) return false;
      if (filterPerfil === 'gestor' && !p.includes('gestor')) return false;
      if (filterPerfil === 'administrativo' && !p.includes('administrativo')) return false;
    }

    if (filterOperador !== 'todos' && l.usuario !== filterOperador) return false;
    if (filterEscola !== 'todos' && l.escola !== filterEscola) return false;
    if (filterProcesso !== 'todos' && l.solicitacaoId !== filterProcesso) return false;

    if (somenteLigados && !l.solicitacaoId) return false;

    if (filterDateFrom) {
      const logDate = l.dataHora.split('T')[0];
      if (logDate < filterDateFrom) return false;
    }
    if (filterDateTo) {
      const logDate = l.dataHora.split('T')[0];
      if (logDate > filterDateTo) return false;
    }

    return true;
  }), [logs, logSearch, filterSeverity, filterPerfil, filterOperador, filterEscola, filterProcesso, filterDateFrom, filterDateTo, somenteLigados]);

  const limparFiltros = () => {
    setLogSearch(''); setFilterSeverity('todos'); setFilterPerfil('todos');
    setFilterOperador('todos'); setFilterEscola('todos'); setFilterProcesso('todos');
    setFilterDateFrom(''); setFilterDateTo(''); setSomenteLigados(false);
  };

  const temFiltros = logSearch || filterSeverity !== 'todos' || filterPerfil !== 'todos' ||
    filterOperador !== 'todos' || filterEscola !== 'todos' || filterProcesso !== 'todos' ||
    filterDateFrom || filterDateTo || somenteLigados;

  const formatIsoDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    } catch { return isoStr; }
  };

  const getLogTypeClasses = (tipo: string) => {
    switch (tipo) {
      case 'sucesso': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'erro': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'alerta': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col space-y-5 text-left p-6">

      {/* HEADER */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-blue-50 border border-blue-100 rounded-xl text-blue-700">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-black text-slate-800 uppercase tracking-wider font-sans leading-none">
                Log do Sistema — Auditoria SGO
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Histórico completo de ações. Acesso restrito a gestores.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total</span>
              <strong className="text-slate-800 text-lg font-black leading-none">{logs.length}</strong>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 text-center">
              <span className="text-[10px] uppercase font-bold text-blue-500 block tracking-wider">Filtrados</span>
              <strong className="text-blue-800 text-lg font-black leading-none">{filteredLogs.length}</strong>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 text-center min-w-[110px]">
              <span className="text-[10px] uppercase font-bold text-indigo-500 block tracking-wider">Operador</span>
              <strong className="text-indigo-800 text-xs font-bold line-clamp-1">
                {getPerfilNome(perfilUsuario).split(' (')[0]}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* PAINEL DE FILTROS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-blue-500" /> Filtros de Pesquisa
          </span>
          {temFiltros && (
            <button type="button" onClick={limparFiltros}
              className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer flex items-center gap-1">
              <X className="w-3 h-3" /> Limpar Filtros
            </button>
          )}
        </div>

        {/* Linha 1: Busca + Severidade + Perfil */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1 relative">
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Busca livre</label>
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 bottom-2.5" />
            <input type="text" value={logSearch} onChange={(e) => setLogSearch(e.target.value)}
              placeholder="Ação, usuário, escola, detalhe..."
              className="w-full text-xs border border-slate-200 rounded-lg pl-8 pr-3 py-2 bg-white text-slate-800 outline-hidden focus:ring-1 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Severidade</label>
            <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 outline-hidden cursor-pointer focus:ring-1 focus:ring-blue-400">
              <option value="todos">Todas as severidades</option>
              <option value="sucesso">Sucesso / Conclusão</option>
              <option value="erro">Erro / Pendência</option>
              <option value="alerta">Alerta / Cadastro</option>
              <option value="info">Informação</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Perfil do Operador</label>
            <select value={filterPerfil} onChange={(e) => setFilterPerfil(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 outline-hidden cursor-pointer focus:ring-1 focus:ring-blue-400">
              <option value="todos">Todos os perfis</option>
              <option value="tecnico">Técnico de Infraestrutura</option>
              <option value="analista">Analista DORE</option>
              <option value="gestor">Gestor</option>
              <option value="administrativo">Administrativo</option>
            </select>
          </div>
        </div>

        {/* Linha 2: Operador + Escola + Processo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Operador</label>
            <select value={filterOperador} onChange={(e) => setFilterOperador(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 outline-hidden cursor-pointer focus:ring-1 focus:ring-blue-400">
              <option value="todos">Todos os operadores</option>
              {operadoresUnicos.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Escola</label>
            <select value={filterEscola} onChange={(e) => setFilterEscola(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 outline-hidden cursor-pointer focus:ring-1 focus:ring-blue-400">
              <option value="todos">Todas as escolas</option>
              {escolasUnicas.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">ID do Processo</label>
            <select value={filterProcesso} onChange={(e) => setFilterProcesso(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 outline-hidden cursor-pointer focus:ring-1 focus:ring-blue-400">
              <option value="todos">Todos os processos</option>
              {processosUnicos.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* Linha 3: Datas + Toggle */}
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Data — De</label>
            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 outline-hidden focus:ring-1 focus:ring-blue-400 font-mono" />
          </div>
          <span className="text-slate-400 font-bold text-sm pb-2">à</span>
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Até</label>
            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 outline-hidden focus:ring-1 focus:ring-blue-400 font-mono" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer pb-1.5 ml-2 select-none">
            <input type="checkbox" checked={somenteLigados} onChange={(e) => setSomenteLigados(e.target.checked)}
              className="w-3.5 h-3.5 accent-blue-600 cursor-pointer" />
            <span className="text-xs font-semibold text-slate-600">Somente logs com processo vinculado</span>
          </label>
          <span className="ml-auto pb-1.5 text-[10px] text-slate-400 font-mono font-bold">
            {filteredLogs.length} de {logs.length} registros
          </span>
        </div>
      </div>

      {/* TABELA DE LOGS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-extrabold text-slate-500 uppercase border-b border-slate-150 tracking-wider">
                <th className="py-3 px-4 whitespace-nowrap">Timestamp</th>
                <th className="py-3 px-4 whitespace-nowrap">Operador</th>
                <th className="py-3 px-4 whitespace-nowrap">Ação Sistêmica</th>
                <th className="py-3 px-4 whitespace-nowrap">Dossiê / Escola</th>
                <th className="py-3 px-4">Detalhamento</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Tipo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400">
                    <Terminal className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold">Nenhum registro localizado com os filtros aplicados.</p>
                  </td>
                </tr>
              ) : filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-3.5 px-4 font-mono text-[10.5px] text-slate-500 whitespace-nowrap">
                    {formatIsoDate(log.dataHora)}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="p-1 bg-slate-100 rounded text-slate-600 shrink-0">
                        <User className="w-3.5 h-3.5" />
                      </span>
                      <div>
                        <span className="font-bold text-slate-800 block text-[11px]">{log.usuario}</span>
                        <span className="text-[10px] text-slate-400 block tracking-wide">{log.perfil}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-700 text-[11.5px] block whitespace-nowrap">{log.acao}</span>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {log.solicitacaoId ? (
                      <div>
                        <span className="font-mono text-[10.5px] font-bold text-indigo-700 block">{log.solicitacaoId}</span>
                        <span className="text-[10px] text-slate-400 block max-w-[140px] truncate" title={log.escola}>{log.escola}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic font-mono text-[10px]">— Geral —</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 max-w-[300px]">
                    <p className="text-slate-600 leading-relaxed text-[11px]">{log.detalhe}</p>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`inline-block text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded border ${getLogTypeClasses(log.tipo)}`}>
                      {log.tipo}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-150 flex items-center justify-between text-[11px] font-medium text-slate-500">
          <span>Rastreabilidade de auditoria governamental ativa — SGO/DORE/MG.</span>
          <span className="font-mono text-[10px]">{filteredLogs.length} / {logs.length} registros exibidos</span>
        </div>
      </div>

    </div>
  );
}
