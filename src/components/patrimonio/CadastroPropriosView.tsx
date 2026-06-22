import React, { useState } from 'react';
import {
  Building2, Plus, Search, CheckCircle, AlertCircle,
  Layers, ClipboardList, Trash2, Database, X, Save, Home, Lock,
} from 'lucide-react';
import { ImovelPatrimonio } from './types';
import { newImovel, SRES_MG, MUNICIPIOS_MG } from './PatrimonioModule';

interface Props {
  imoveis: ImovelPatrimonio[];
  setImoveis: React.Dispatch<React.SetStateAction<ImovelPatrimonio[]>>;
  regionaisRestrita?: string[];
  somenteLeitura?: boolean;
}

const inputCls  = 'w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20';
const monoCls   = inputCls + ' font-mono';
const fltCls    = 'px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/20';
const labelCls = 'block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1';
const selectCls = inputCls + ' cursor-pointer';

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-2">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

export default function CadastroPropriosView({ imoveis, setImoveis, regionaisRestrita = [], somenteLeitura = false }: Props) {
  const sreUnica = regionaisRestrita.length === 1 ? regionaisRestrita[0] : '';
  const [view, setView] = useState<'lista' | 'form'>('lista');
  const [current, setCurrent] = useState<ImovelPatrimonio | null>(null);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');
  const [savedMsg, setSavedMsg] = useState(false);
  const [filtMunicipio, setFiltMunicipio] = useState('');
  const [filtSre, setFiltSre] = useState('');
  const [filtStatus, setFiltStatus] = useState('');
  const [filtOcupacao, setFiltOcupacao] = useState('');

  const save = (draft: boolean) => {
    if (!current) return;
    if (!draft && (!current.codesc || !current.nomeEscola)) {
      setErro('Preencha os campos obrigatórios: CODESC e Nome da Escola.');
      return;
    }
    const updated = { ...current, status: draft ? 'rascunho' : 'cadastrado' } as ImovelPatrimonio;
    setImoveis(prev => {
      const idx = prev.findIndex(i => i.id === updated.id);
      return idx >= 0 ? prev.map(i => i.id === updated.id ? updated : i) : [updated, ...prev];
    });
    setErro('');
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
    if (!draft) setView('lista');
  };

  const remover = (id: string) => {
    if (!confirm('Remover este imóvel do cadastro?')) return;
    setImoveis(prev => prev.filter(i => i.id !== id));
  };

  const abrirForm = (imovel?: ImovelPatrimonio) => {
    const base = imovel ? { ...imovel } : newImovel();
    if (!imovel && sreUnica) base.sre = sreUnica;
    setCurrent(base);
    setErro('');
    setView('form');
  };

  const municipiosUnicos = [...new Set(imoveis.map(i => i.municipio).filter(Boolean))].sort();
  const sresUnicas       = [...new Set(imoveis.map(i => i.sre).filter(Boolean))].sort();
  const ocupacoesUnicas  = [...new Set(imoveis.map(i => i.formaOcupacao).filter(Boolean))].sort();
  const hasFiltros = !!(filtMunicipio || filtSre || filtStatus || filtOcupacao);

  const filtrados = imoveis.filter(i => {
    const q = busca.toLowerCase();
    if (busca && !i.nomeEscola.toLowerCase().includes(q) && !i.codesc.includes(busca) && !i.municipio.toLowerCase().includes(q)) return false;
    if (filtMunicipio && i.municipio !== filtMunicipio) return false;
    if (filtSre && i.sre !== filtSre) return false;
    if (filtStatus && i.status !== filtStatus) return false;
    if (filtOcupacao && i.formaOcupacao !== filtOcupacao) return false;
    return true;
  });

  const total = imoveis.length;
  const cadastrados = imoveis.filter(i => i.status === 'cadastrado' || i.status === 'regularizado').length;
  const rascunhos = imoveis.filter(i => i.status === 'rascunho').length;

  // ── Lista ──────────────────────────────────────────────────────────────────
  if (view === 'lista') {
    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-800 font-sans">Cadastro de Próprios</h2>
            <p className="text-xs text-slate-500 mt-0.5">Registro patrimonial dos imóveis da rede estadual de MG.</p>
          </div>
          {!somenteLeitura && (
          <button type="button" onClick={() => abrirForm()}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase rounded-xl shadow-sm transition cursor-pointer">
            <Plus className="w-4 h-4" /> Novo Imóvel
          </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Cadastrado', value: total, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' },
            { label: 'Regularizados', value: cadastrados, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            { label: 'Em Rascunho', value: rascunhos, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-3 text-center`}>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search + Filtros */}
        <div className="space-y-2">
          <div className="relative max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Buscar por escola, CODESC, município..."
              value={busca} onChange={e => setBusca(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={filtMunicipio} onChange={e => setFiltMunicipio(e.target.value)} className={fltCls}>
              <option value="">Todos os municípios</option>
              {municipiosUnicos.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {/* Filtro de SRE oculto quando o acesso já está restrito à(s) regional(is) */}
            {regionaisRestrita.length === 0 && (
              <select value={filtSre} onChange={e => setFiltSre(e.target.value)} className={fltCls}>
                <option value="">Todas as SREs</option>
                {sresUnicas.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <select value={filtStatus} onChange={e => setFiltStatus(e.target.value)} className={fltCls}>
              <option value="">Todos os status</option>
              <option value="rascunho">Rascunho</option>
              <option value="cadastrado">Cadastrado</option>
              <option value="regularizado">Regularizado</option>
            </select>
            <select value={filtOcupacao} onChange={e => setFiltOcupacao(e.target.value)} className={fltCls}>
              <option value="">Todas as ocupações</option>
              {ocupacoesUnicas.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            {hasFiltros && (
              <button type="button"
                onClick={() => { setFiltMunicipio(''); setFiltSre(''); setFiltStatus(''); setFiltOcupacao(''); }}
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer font-bold">
                <X className="w-3 h-3" /> Limpar filtros
              </button>
            )}
            {(hasFiltros || busca) && (
              <span className="text-[10px] text-slate-400">{filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>

        {/* List */}
        {filtrados.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm space-y-2">
            <Building2 className="w-10 h-10 mx-auto opacity-30" />
            <p className="font-semibold">{busca ? 'Nenhum resultado encontrado.' : 'Nenhum imóvel cadastrado ainda.'}</p>
            {!busca && <p className="text-xs">Clique em "Novo Imóvel" para iniciar o registro.</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {filtrados.map(i => (
              <div key={i.id}
                className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-4 hover:border-teal-200 transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Home className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-800 truncate">{i.nomeEscola || 'Escola não informada'}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      CODESC {i.codesc || '—'} · {i.municipio || '—'} · {i.sre || '—'}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                        i.status === 'regularizado' ? 'bg-emerald-100 text-emerald-700' :
                        i.status === 'cadastrado'   ? 'bg-blue-100 text-blue-700' :
                                                      'bg-amber-100 text-amber-700'
                      }`}>{i.status}</span>
                      {i.formaOcupacao && (
                        <span className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{i.formaOcupacao}</span>
                      )}
                      <span className="text-[9px] text-slate-400">Cadastrado em {i.dataCadastro}</span>
                    </div>
                  </div>
                </div>
                {!somenteLeitura && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button type="button" onClick={() => abrirForm(i)}
                    className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition cursor-pointer" title="Editar">
                    <ClipboardList className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => remover(i.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer" title="Remover">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Formulário ─────────────────────────────────────────────────────────────
  if (view === 'form' && current) {
    const set = (patch: Partial<ImovelPatrimonio>) => {
      setCurrent(prev => prev ? { ...prev, ...patch } : prev);
      setErro('');
    };

    return (
      <div className="max-w-3xl mx-auto space-y-5 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setView('lista')}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer">
              <X className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-sm font-extrabold text-slate-800">{current.nomeEscola || 'Novo Imóvel'}</h2>
              <p className="text-[10px] text-slate-400 font-mono">{current.id}</p>
            </div>
          </div>
          {!somenteLeitura && (
          <div className="flex items-center gap-2">
            {savedMsg && (
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Salvo
              </span>
            )}
            <button type="button" onClick={() => save(true)}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer flex items-center gap-1">
              <Save className="w-3.5 h-3.5" /> Rascunho
            </button>
            <button type="button" onClick={() => save(false)}
              className="px-4 py-1.5 text-xs font-black text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition cursor-pointer flex items-center gap-1 shadow-sm">
              <CheckCircle className="w-3.5 h-3.5" /> Cadastrar Imóvel
            </button>
          </div>
          )}
        </div>

        {erro && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />{erro}
          </div>
        )}

        {/* Seção A — Identificação Escolar */}
        <SectionCard icon={<Database className="w-4 h-4 text-teal-500" />} title="Identificação Escolar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Código CODESC *</label>
              <input type="text" placeholder="Ex: 145236" value={current.codesc}
                onChange={e => set({ codesc: e.target.value })} className={monoCls} />
            </div>
            <div>
              <label className={labelCls}>Código de Endereço *</label>
              <input type="text" placeholder="Ex: 00123456" value={current.codigoEndereco}
                onChange={e => set({ codigoEndereco: e.target.value })} className={monoCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Nome da Escola *</label>
            <input type="text" placeholder="Ex: EE Padre Almir Neves" value={current.nomeEscola}
              onChange={e => set({ nomeEscola: e.target.value })} className={inputCls} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Município</label>
              <select value={current.municipio} onChange={e => set({ municipio: e.target.value })} className={selectCls}>
                <option value="">Selecione...</option>
                {MUNICIPIOS_MG.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>
                Superintendência (SRE)
                {sreUnica && <span className="ml-1.5 text-[9px] text-blue-500 font-black uppercase inline-flex items-center gap-0.5"><Lock className="w-2.5 h-2.5" /> Fixado</span>}
              </label>
              {sreUnica ? (
                /* Apenas 1 regional: campo bloqueado */
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-800">
                  <Lock className="w-3.5 h-3.5 text-blue-400 shrink-0" />{sreUnica}
                </div>
              ) : regionaisRestrita.length > 1 ? (
                /* Múltiplas regionais: select restrito */
                <select value={current.sre} onChange={e => set({ sre: e.target.value })} className={selectCls}>
                  <option value="">Selecione sua regional...</option>
                  {regionaisRestrita.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                /* Acesso total: select completo */
                <select value={current.sre} onChange={e => set({ sre: e.target.value })} className={selectCls}>
                  <option value="">Selecione...</option>
                  {SRES_MG.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className={labelCls}>Endereço Completo</label>
              <input type="text" placeholder="Rua, número, bairro..." value={current.enderecoCompleto}
                onChange={e => set({ enderecoCompleto: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>CEP</label>
              <input type="text" placeholder="00000-000" value={current.cep}
                onChange={e => set({ cep: e.target.value })} className={monoCls} />
            </div>
            <div>
              <label className={labelCls}>Latitude</label>
              <input type="text" placeholder="-19.123456" value={current.coordLat || ''}
                onChange={e => set({ coordLat: e.target.value })} className={monoCls} />
            </div>
            <div>
              <label className={labelCls}>Longitude</label>
              <input type="text" placeholder="-44.123456" value={current.coordLng || ''}
                onChange={e => set({ coordLng: e.target.value })} className={monoCls} />
            </div>
          </div>
        </SectionCard>

        {/* Seção B — Classificação Patrimonial */}
        <SectionCard icon={<Layers className="w-4 h-4 text-teal-500" />} title="Classificação Patrimonial">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Forma de Ocupação</label>
              <select value={current.formaOcupacao} onChange={e => set({ formaOcupacao: e.target.value })} className={selectCls}>
                {['PRÓPRIO', 'ALUGADO', 'CEDIDO', 'COMODATO', 'CESSÃO DE USO', 'OUTRO'].map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Prédio</label>
              <select value={current.predio} onChange={e => set({ predio: e.target.value })} className={selectCls}>
                <option value="PRINCIPAL">PRINCIPAL</option>
                <option value="ANEXO">ANEXO</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Tombamento</label>
              <select value={current.tombado}
                onChange={e => set({ tombado: e.target.value, orgaoTombador: e.target.value === 'NÃO É TOMBADO' ? '' : current.orgaoTombador })}
                className={selectCls}>
                <option value="NÃO É TOMBADO">NÃO É TOMBADO</option>
                <option value="TOMBADO PARCIALMENTE">TOMBADO PARCIALMENTE</option>
                <option value="TOMBADO TOTALMENTE">TOMBADO TOTALMENTE</option>
              </select>
            </div>
            {current.tombado !== 'NÃO É TOMBADO' && (
              <div>
                <label className={labelCls}>Órgão Tombador</label>
                <select value={current.orgaoTombador || ''} onChange={e => set({ orgaoTombador: e.target.value })} className={selectCls}>
                  <option value="">Selecione...</option>
                  {['MUNICIPAL', 'ESTADUAL', 'FEDERAL'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className={labelCls}>Imóvel Coabitado?</label>
              <select value={current.coabitado}
                onChange={e => set({ coabitado: e.target.value, tipoCoabitado: e.target.value === 'NÃO' ? '' : current.tipoCoabitado })}
                className={selectCls}>
                <option value="NÃO">NÃO</option>
                <option value="SIM">SIM</option>
              </select>
            </div>
            {current.coabitado === 'SIM' && (
              <div>
                <label className={labelCls}>Tipo de Coabitação</label>
                <select value={current.tipoCoabitado || ''} onChange={e => set({ tipoCoabitado: e.target.value })} className={selectCls}>
                  <option value="">Selecione...</option>
                  {[
                    'Coabitado com outra escola Estadual',
                    'Coabitado com outra escola Municipal',
                    'Coabitado com outro órgão estadual',
                    'Coabitado com outro órgão municipal',
                    'Coabitado com instituto federal',
                  ].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Seção C — Dados Físicos */}
        <SectionCard icon={<Building2 className="w-4 h-4 text-teal-500" />} title="Dados Físicos do Imóvel">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {([
              { label: 'Área do Terreno (m²)', key: 'areaTerrenoM2',    placeholder: 'Ex: 5000' },
              { label: 'Área Construída (m²)', key: 'areaConstruidaM2', placeholder: 'Ex: 2500' },
              { label: 'Número de Blocos',     key: 'numeroBlocos',     placeholder: 'Ex: 3' },
              { label: 'Número de Pavimentos', key: 'numeroPavimentos', placeholder: 'Ex: 2' },
              { label: 'Ano de Construção',    key: 'anoConstrucao',    placeholder: 'Ex: 1982' },
              { label: 'Capacidade de Alunos', key: 'capacidadeAlunos', placeholder: 'Ex: 800' },
            ] as { label: string; key: keyof ImovelPatrimonio; placeholder: string }[]).map(f => (
              <div key={f.key}>
                <label className={labelCls}>{f.label}</label>
                <input type="number" placeholder={f.placeholder}
                  value={(current[f.key] as number) || ''}
                  onChange={e => set({ [f.key]: e.target.value ? Number(e.target.value) : undefined })}
                  className={monoCls} />
              </div>
            ))}
          </div>
          <div>
            <label className={labelCls}>Observações</label>
            <textarea rows={2} value={current.observacoes || ''} onChange={e => set({ observacoes: e.target.value })}
              placeholder="Informações adicionais sobre o imóvel..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 leading-relaxed" />
          </div>
        </SectionCard>

        {!somenteLeitura && (
        <div className="flex justify-end gap-2 pb-4">
          <button type="button" onClick={() => save(true)}
            className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5">
            <Save className="w-3.5 h-3.5" /> Salvar Rascunho
          </button>
          <button type="button" onClick={() => save(false)}
            className="px-5 py-2 text-xs font-black text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm">
            <CheckCircle className="w-3.5 h-3.5" /> Cadastrar Imóvel
          </button>
        </div>
        )}
      </div>
    );
  }

  return null;
}
