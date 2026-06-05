import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck, Plus, Search, Home, CheckCircle, AlertTriangle,
  Minus, X, Save, Calendar, User, ChevronDown, ChevronUp, Lock,
} from 'lucide-react';
import { ImovelPatrimonio } from './types';
import { VISTORIAS_KEY } from './PatrimonioModule';

const fltCls = 'px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/20';

interface VistoriaItem {
  id: string;
  imovelId: string;
  data: string;
  tipo: string;
  resultado: 'Satisfatório' | 'Parcialmente Satisfatório' | 'Insatisfatório';
  responsavel: string;
  observacoes?: string;
}

const TIPOS_VISTORIA = [
  'Vistoria Rotineira',
  'Vistoria Emergencial',
  'Auditoria Predial',
  'Inspeção de Segurança',
  'Laudo de Conservação',
  'Avaliação Estrutural',
];

const RESULTADO_CONFIG = {
  'Satisfatório':               { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  'Parcialmente Satisfatório':  { color: 'text-amber-700 bg-amber-50 border-amber-200',       icon: <Minus className="w-3.5 h-3.5" /> },
  'Insatisfatório':             { color: 'text-rose-700 bg-rose-50 border-rose-200',           icon: <AlertTriangle className="w-3.5 h-3.5" /> },
};

interface Props {
  imoveis: ImovelPatrimonio[];
  sreRestrita?: string;
}

function emptyVistoria(imovelId: string): VistoriaItem {
  return {
    id: `VIS-${Date.now()}`,
    imovelId,
    data: new Date().toISOString().split('T')[0],
    tipo: 'Vistoria Rotineira',
    resultado: 'Satisfatório',
    responsavel: '',
    observacoes: '',
  };
}

export default function VistoriasInspecoesView({ imoveis, sreRestrita = '' }: Props) {
  const [vistorias, setVistorias] = useState<VistoriaItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(VISTORIAS_KEY) || '[]'); } catch { return []; }
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formImovelId, setFormImovelId] = useState<string | null>(null);
  const [draft, setDraft] = useState<VistoriaItem | null>(null);
  const [busca, setBusca] = useState('');
  const [saved, setSaved] = useState(false);
  const [filtMunicipio, setFiltMunicipio] = useState('');
  const [filtPresenca, setFiltPresenca] = useState('');
  const [filtResultado, setFiltResultado] = useState('');

  useEffect(() => {
    localStorage.setItem(VISTORIAS_KEY, JSON.stringify(vistorias));
  }, [vistorias]);

  const abrirForm = (imovelId: string) => {
    setDraft(emptyVistoria(imovelId));
    setFormImovelId(imovelId);
    setExpandedId(imovelId);
  };

  const salvar = () => {
    if (!draft || !draft.responsavel.trim()) return;
    setVistorias(prev => [draft, ...prev]);
    setDraft(null);
    setFormImovelId(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const removerVistoria = (id: string) => {
    setVistorias(prev => prev.filter(v => v.id !== id));
  };

  const municipiosUnicos = [...new Set(imoveis.map(i => i.municipio).filter(Boolean))].sort();
  const hasFiltros = !!(filtMunicipio || filtPresenca || filtResultado);

  const filtrados = imoveis.filter(i => {
    const q = busca.toLowerCase();
    if (busca && !i.nomeEscola.toLowerCase().includes(q) && !i.codesc.includes(busca)) return false;
    if (filtMunicipio && i.municipio !== filtMunicipio) return false;
    const imovelVistorias = vistorias.filter(v => v.imovelId === i.id);
    if (filtPresenca === 'com' && imovelVistorias.length === 0) return false;
    if (filtPresenca === 'sem' && imovelVistorias.length > 0) return false;
    if (filtResultado && (imovelVistorias.length === 0 || imovelVistorias[0].resultado !== filtResultado)) return false;
    return true;
  });

  const totalVistorias = vistorias.length;
  const insatisfatorias = vistorias.filter(v => v.resultado === 'Insatisfatório').length;
  const imoveisComVistoria = new Set(vistorias.map(v => v.imovelId)).size;

  const inputCls = 'w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20';
  const labelCls = 'block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1';

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 font-sans">Vistorias & Inspeções</h2>
          <p className="text-xs text-slate-500 mt-0.5">Registro de vistorias prediais e inspeções de integridade.</p>
        </div>
        {saved && (
          <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
            <CheckCircle className="w-4 h-4" /> Vistoria registrada
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-slate-700">{totalVistorias}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total de Vistorias</p>
        </div>
        <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-teal-700">{imoveisComVistoria}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Imóveis Vistoriados</p>
        </div>
        <div className={`border rounded-xl p-3 text-center ${insatisfatorias > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
          <p className={`text-2xl font-black ${insatisfatorias > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{insatisfatorias}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Insatisfatórias</p>
        </div>
      </div>

      {/* Search + Filtros */}
      <div className="space-y-2">
        <div className="relative max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Buscar por escola ou CODESC..."
            value={busca} onChange={e => setBusca(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filtMunicipio} onChange={e => setFiltMunicipio(e.target.value)} className={fltCls}>
            <option value="">Todos os municípios</option>
            {municipiosUnicos.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={filtPresenca} onChange={e => setFiltPresenca(e.target.value)} className={fltCls}>
            <option value="">Com ou sem vistoria</option>
            <option value="com">Com vistoria registrada</option>
            <option value="sem">Sem vistoria registrada</option>
          </select>
          <select value={filtResultado} onChange={e => setFiltResultado(e.target.value)} className={fltCls}>
            <option value="">Qualquer resultado</option>
            <option value="Satisfatório">Última satisfatória</option>
            <option value="Parcialmente Satisfatório">Última parcial</option>
            <option value="Insatisfatório">Última insatisfatória</option>
          </select>
          {hasFiltros && (
            <button type="button"
              onClick={() => { setFiltMunicipio(''); setFiltPresenca(''); setFiltResultado(''); }}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer font-bold">
              <X className="w-3 h-3" /> Limpar filtros
            </button>
          )}
          {(hasFiltros || busca) && (
            <span className="text-[10px] text-slate-400">{filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {imoveis.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm space-y-2">
          <ClipboardCheck className="w-10 h-10 mx-auto opacity-30" />
          <p className="font-semibold">Nenhum imóvel cadastrado.</p>
          <p className="text-xs">Cadastre imóveis em "Cadastro de Próprios" para registrar vistorias.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(imovel => {
            const vistoriasImovel = vistorias.filter(v => v.imovelId === imovel.id);
            const ultima = vistoriasImovel[0];
            const isExpanded = expandedId === imovel.id;
            const showForm = formImovelId === imovel.id;

            return (
              <div key={imovel.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Row */}
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Home className="w-4 h-4 text-teal-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate">{imovel.nomeEscola || 'Escola não informada'}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">CODESC {imovel.codesc} · {imovel.municipio}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {vistoriasImovel.length === 0 ? (
                          <span className="text-[9px] text-slate-400">Nenhuma vistoria registrada</span>
                        ) : (
                          <>
                            <span className="text-[9px] text-slate-500 font-bold">{vistoriasImovel.length} vistoria{vistoriasImovel.length > 1 ? 's' : ''}</span>
                            {ultima && (
                              <span className={`text-[9px] font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded border ${RESULTADO_CONFIG[ultima.resultado].color}`}>
                                {RESULTADO_CONFIG[ultima.resultado].icon} Última: {ultima.resultado}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button type="button" onClick={() => abrirForm(imovel.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition cursor-pointer">
                      <Plus className="w-3.5 h-3.5" /> Nova Vistoria
                    </button>
                    {vistoriasImovel.length > 0 && (
                      <button type="button"
                        onClick={() => setExpandedId(isExpanded && !showForm ? null : imovel.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Formulário de nova vistoria */}
                {showForm && draft && (
                  <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-black text-slate-700">Nova Vistoria</p>
                      <button type="button" onClick={() => { setDraft(null); setFormImovelId(null); }}
                        className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className={labelCls}><Calendar className="w-3 h-3 inline mr-0.5" /> Data</label>
                        <input type="date" value={draft.data}
                          onChange={e => setDraft(d => d ? { ...d, data: e.target.value } : d)}
                          className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Tipo de Vistoria</label>
                        <select value={draft.tipo}
                          onChange={e => setDraft(d => d ? { ...d, tipo: e.target.value } : d)}
                          className={inputCls + ' cursor-pointer'}>
                          {TIPOS_VISTORIA.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Resultado</label>
                        <select value={draft.resultado}
                          onChange={e => setDraft(d => d ? { ...d, resultado: e.target.value as VistoriaItem['resultado'] } : d)}
                          className={inputCls + ' cursor-pointer'}>
                          <option value="Satisfatório">Satisfatório</option>
                          <option value="Parcialmente Satisfatório">Parcialmente Satisfatório</option>
                          <option value="Insatisfatório">Insatisfatório</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}><User className="w-3 h-3 inline mr-0.5" /> Responsável *</label>
                        <input type="text" placeholder="Nome do fiscal" value={draft.responsavel}
                          onChange={e => setDraft(d => d ? { ...d, responsavel: e.target.value } : d)}
                          className={inputCls} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Observações</label>
                      <textarea rows={2} value={draft.observacoes || ''}
                        onChange={e => setDraft(d => d ? { ...d, observacoes: e.target.value } : d)}
                        placeholder="Descreva as condições observadas, itens verificados, etc."
                        className={inputCls + ' leading-relaxed'} />
                    </div>
                    <div className="flex justify-end">
                      <button type="button" onClick={salvar}
                        disabled={!draft.responsavel.trim()}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl transition cursor-pointer">
                        <Save className="w-3.5 h-3.5" /> Registrar Vistoria
                      </button>
                    </div>
                  </div>
                )}

                {/* Histórico de vistorias */}
                {isExpanded && vistoriasImovel.length > 0 && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Histórico de Vistorias</p>
                    {vistoriasImovel.map(v => (
                      <div key={v.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-start gap-3">
                        <div className={`mt-0.5 px-2 py-1 rounded-lg border text-[9px] font-black flex items-center gap-1 shrink-0 ${RESULTADO_CONFIG[v.resultado].color}`}>
                          {RESULTADO_CONFIG[v.resultado].icon}
                          {v.resultado}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-700">{v.tipo}</span>
                            <span className="text-[10px] text-slate-400">{v.data}</span>
                            <span className="text-[10px] text-slate-500">— {v.responsavel}</span>
                          </div>
                          {v.observacoes && (
                            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{v.observacoes}</p>
                          )}
                        </div>
                        <button type="button" onClick={() => removerVistoria(v.id)}
                          className="p-1 text-slate-300 hover:text-rose-500 transition cursor-pointer shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
