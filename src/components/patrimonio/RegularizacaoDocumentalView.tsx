import React, { useState } from 'react';
import {
  FileText, CheckCircle, AlertCircle, Home, Search,
  ShieldCheck, UploadCloud, ChevronLeft, Save, X, Lock,
} from 'lucide-react';

const fltCls = 'px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/20';
import { ImovelPatrimonio, SITUACOES_IMOVEL } from './types';

interface Props {
  imoveis: ImovelPatrimonio[];
  setImoveis: React.Dispatch<React.SetStateAction<ImovelPatrimonio[]>>;
  sreRestrita?: string;
}

const SITUACAO_COLOR: Record<string, string> = {
  'Próprio do Estado':   'bg-emerald-100 text-emerald-800',
  'Municipal Cedido':    'bg-blue-100 text-blue-800',
  'Alugado':             'bg-orange-100 text-orange-800',
  'Comodato':            'bg-violet-100 text-violet-800',
  'Cessão de Uso':       'bg-cyan-100 text-cyan-800',
  'Em Regularização':    'bg-rose-100 text-rose-800',
};

export default function RegularizacaoDocumentalView({ imoveis, setImoveis, sreRestrita = '' }: Props) {
  const [selected, setSelected] = useState<ImovelPatrimonio | null>(null);
  const [busca, setBusca] = useState('');
  const [savedMsg, setSavedMsg] = useState(false);
  const [filtMunicipio, setFiltMunicipio] = useState('');
  const [filtSituacao, setFiltSituacao] = useState('');
  const [filtDocs, setFiltDocs] = useState('');

  const salvar = () => {
    if (!selected) return;
    setImoveis(prev => prev.map(i => i.id === selected.id ? { ...selected } : i));
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  const toggleDoc = (id: string) => {
    if (!selected) return;
    setSelected(prev => prev ? {
      ...prev,
      documentos: prev.documentos.map(d =>
        d.id === id
          ? {
              ...d,
              status: d.status === 'anexado' ? 'pendente' : 'anexado',
              fileName: d.status === 'pendente' ? `${d.nome.replace(/\s/g, '_')}.pdf` : undefined,
              uploadedAt: d.status === 'pendente' ? new Date().toISOString().split('T')[0] : undefined,
            }
          : d
      ),
    } : prev);
  };

  const municipiosUnicos = [...new Set(imoveis.map(i => i.municipio).filter(Boolean))].sort();
  const hasFiltros = !!(filtMunicipio || filtSituacao || filtDocs);

  const filtrados = imoveis.filter(i => {
    const q = busca.toLowerCase();
    if (busca && !i.nomeEscola.toLowerCase().includes(q) && !i.codesc.includes(busca)) return false;
    if (filtMunicipio && i.municipio !== filtMunicipio) return false;
    if (filtSituacao && i.situacaoImovel !== filtSituacao) return false;
    if (filtDocs === 'completo' && i.documentos.filter(d => d.obrigatorio).some(d => d.status === 'pendente')) return false;
    if (filtDocs === 'pendente' && i.documentos.filter(d => d.obrigatorio).every(d => d.status === 'anexado')) return false;
    if (filtDocs === 'sem_situacao' && i.situacaoImovel) return false;
    return true;
  });

  const totalDocs = imoveis.reduce((acc, i) => acc + i.documentos.filter(d => d.obrigatorio).length, 0);
  const anexados = imoveis.reduce((acc, i) => acc + i.documentos.filter(d => d.obrigatorio && d.status === 'anexado').length, 0);
  const regularizados = imoveis.filter(i => i.situacaoImovel && i.documentos.filter(d => d.obrigatorio).every(d => d.status === 'anexado')).length;

  // ── Editor de regularização ────────────────────────────────────────────────
  if (selected) {
    const obrigPendentes = selected.documentos.filter(d => d.obrigatorio && d.status === 'pendente').length;
    const totalAnexados  = selected.documentos.filter(d => d.status === 'anexado').length;

    return (
      <div className="max-w-3xl mx-auto space-y-5 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setSelected(null)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition cursor-pointer font-bold">
              <ChevronLeft className="w-3.5 h-3.5" /> Voltar
            </button>
            <div>
              <h2 className="text-sm font-extrabold text-slate-800">{selected.nomeEscola}</h2>
              <p className="text-[10px] text-slate-400 font-mono">CODESC {selected.codesc} · {selected.municipio}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {savedMsg && (
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Salvo
              </span>
            )}
            <button type="button" onClick={salvar}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl shadow-sm transition cursor-pointer">
              <Save className="w-3.5 h-3.5" /> Salvar Alterações
            </button>
          </div>
        </div>

        {/* Status resumido */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-xl font-black text-slate-700">{totalAnexados}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Documentos Anexados</p>
          </div>
          <div className={`border rounded-xl p-3 text-center ${obrigPendentes > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
            <p className={`text-xl font-black ${obrigPendentes > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{obrigPendentes}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Obrig. Pendentes</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-xl font-black text-slate-700">{selected.documentos.length}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total de Documentos</p>
          </div>
        </div>

        {/* Situação do Imóvel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <ShieldCheck className="w-4 h-4 text-teal-500" /> Situação do Imóvel
          </h3>
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 leading-relaxed">
            A regularização fundiária dos imóveis é uma das maiores demandas da SEE-MG. Informe a situação atual do imóvel.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SITUACOES_IMOVEL.map(s => (
              <label key={s}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer text-xs font-semibold transition-all ${
                  selected.situacaoImovel === s
                    ? 'border-teal-400 bg-teal-50 text-teal-800 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}>
                <input type="radio" name="situacaoImovel" value={s}
                  checked={selected.situacaoImovel === s}
                  onChange={() => setSelected(prev => prev ? { ...prev, situacaoImovel: s } : prev)}
                  className="shrink-0 text-teal-600" />
                {s}
              </label>
            ))}
          </div>
        </div>

        {/* Documentos */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <UploadCloud className="w-4 h-4 text-teal-500" /> Documentos do Imóvel
          </h3>
          <p className="text-[10px] text-slate-500">
            Marque cada documento conforme sua disponibilidade. Os documentos obrigatórios são destacados em vermelho enquanto pendentes.
          </p>
          <div className="space-y-2">
            {selected.documentos.map(doc => (
              <div key={doc.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border text-xs transition-colors ${
                doc.status === 'anexado' ? 'bg-emerald-50 border-emerald-200' :
                doc.obrigatorio ? 'bg-rose-50/40 border-rose-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-2 min-w-0">
                  {doc.status === 'anexado'
                    ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    : <FileText className={`w-4 h-4 shrink-0 ${doc.obrigatorio ? 'text-rose-400' : 'text-slate-400'}`} />
                  }
                  <div className="min-w-0">
                    <span className={`font-bold block truncate ${doc.status === 'anexado' ? 'text-emerald-700' : doc.obrigatorio ? 'text-rose-700' : 'text-slate-700'}`}>
                      {doc.nome}
                      {doc.obrigatorio && (
                        <span className="ml-1.5 text-[9px] bg-rose-100 text-rose-600 px-1 rounded font-black uppercase">Obrigatório</span>
                      )}
                    </span>
                    {doc.uploadedAt && (
                      <span className="text-[9px] text-slate-400">Marcado em {doc.uploadedAt}</span>
                    )}
                  </div>
                </div>
                <button type="button" onClick={() => toggleDoc(doc.id)}
                  className={`shrink-0 px-3 py-1 text-[10px] font-black rounded-lg border transition cursor-pointer ${
                    doc.status === 'anexado'
                      ? 'bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}>
                  {doc.status === 'anexado' ? '✓ Anexado' : '+ Marcar como Anexado'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Lista de imóveis ────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div>
        <h2 className="text-base font-extrabold text-slate-800 font-sans">Regularização Documental</h2>
        <p className="text-xs text-slate-500 mt-0.5">Gerencie a situação fundiária e os documentos de cada imóvel.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-slate-700">{imoveis.length}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total de Imóveis</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-emerald-700">{regularizados}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Com Docs Completos</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-blue-700">{totalDocs > 0 ? Math.round((anexados / totalDocs) * 100) : 0}%</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Docs Obrig. Anexados</p>
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
          <select value={filtSituacao} onChange={e => setFiltSituacao(e.target.value)} className={fltCls}>
            <option value="">Todas as situações</option>
            {SITUACOES_IMOVEL.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filtDocs} onChange={e => setFiltDocs(e.target.value)} className={fltCls}>
            <option value="">Todos os docs</option>
            <option value="completo">Docs obrig. completos</option>
            <option value="pendente">Com docs pendentes</option>
            <option value="sem_situacao">Situação não informada</option>
          </select>
          {hasFiltros && (
            <button type="button"
              onClick={() => { setFiltMunicipio(''); setFiltSituacao(''); setFiltDocs(''); }}
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
          <FileText className="w-10 h-10 mx-auto opacity-30" />
          <p className="font-semibold">Nenhum imóvel cadastrado.</p>
          <p className="text-xs">Cadastre imóveis na tela de "Cadastro de Próprios" para gerenciar documentos aqui.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(i => {
            const obrigPend = i.documentos.filter(d => d.obrigatorio && d.status === 'pendente').length;
            const totalAnex = i.documentos.filter(d => d.status === 'anexado').length;
            const docColor  = obrigPend === 0 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-rose-600 bg-rose-50 border-rose-100';

            return (
              <div key={i.id}
                className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-4 hover:border-teal-200 transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Home className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-800 truncate">{i.nomeEscola || 'Escola não informada'}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">CODESC {i.codesc} · {i.municipio}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {i.situacaoImovel ? (
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${SITUACAO_COLOR[i.situacaoImovel] || 'bg-slate-100 text-slate-600'}`}>
                          {i.situacaoImovel}
                        </span>
                      ) : (
                        <span className="text-[9px] text-rose-500 font-bold flex items-center gap-0.5">
                          <AlertCircle className="w-3 h-3" /> Situação não informada
                        </span>
                      )}
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${docColor}`}>
                        {totalAnex}/{i.documentos.length} docs anexados
                      </span>
                      {obrigPend > 0 && (
                        <span className="text-[9px] text-rose-600 font-bold">
                          {obrigPend} obrigatório{obrigPend > 1 ? 's' : ''} pendente{obrigPend > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => setSelected({ ...i })}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition cursor-pointer">
                  <ShieldCheck className="w-3.5 h-3.5" /> Regularizar
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
