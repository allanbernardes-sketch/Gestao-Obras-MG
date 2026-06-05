import React, { useState, useEffect } from 'react';
import {
  BookOpen, Search, Home, Database, Layers, Building2,
  FileText, CheckCircle, AlertCircle, HardHat, Wrench,
  BarChart2, MapPin, Calendar, ChevronRight, X, Lock,
} from 'lucide-react';
import { ImovelPatrimonio, SITUACOES_IMOVEL } from './types';
import { VISTORIAS_KEY } from './PatrimonioModule';

const fltCls = 'px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/20';

interface Props {
  imoveis: ImovelPatrimonio[];
  sreRestrita?: string;
}

interface VistoriaItem {
  id: string;
  imovelId: string;
  data: string;
  tipo: string;
  resultado: string;
  responsavel: string;
  observacoes?: string;
}

interface ObraResumida {
  id: string;
  nomeEscola: string;
  tipo?: string;
  etapaAtual?: string;
  statusObra?: string;
  dataCriacao?: string;
  valorHomologado?: number;
  empresaContratada?: string;
  previsaoTerminoObra?: string;
}

const ETAPA_LABEL: Record<string, string> = {
  cadastro:         'Cadastro',
  analise:          'Análise',
  correcao:         'Correção',
  paf_autorizacao:  'PAF/Autorização',
  paf:              'PAF',
  ordem_inicio:     'Ordem de Início',
  execucao:         'Em Execução',
  cancelado:        'Cancelado',
};

const ETAPA_COLOR: Record<string, string> = {
  execucao:     'bg-blue-100 text-blue-800',
  cancelado:    'bg-red-100 text-red-700',
  paf:          'bg-violet-100 text-violet-800',
  ordem_inicio: 'bg-teal-100 text-teal-800',
};

function InfoRow({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
  return (
    <div>
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-xs text-slate-800 font-semibold ${mono ? 'font-mono' : ''}`}>
        {value != null && value !== '' ? String(value) : <span className="text-slate-300 font-normal">—</span>}
      </p>
    </div>
  );
}

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

function fmt(v?: number) {
  if (!v) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function FichaConsolidadaView({ imoveis, sreRestrita = '' }: Props) {
  const [busca, setBusca] = useState('');
  const [selected, setSelected] = useState<ImovelPatrimonio | null>(null);
  const [obras, setObras] = useState<ObraResumida[]>([]);
  const [vistorias, setVistorias] = useState<VistoriaItem[]>([]);
  const [filtMunicipio, setFiltMunicipio] = useState('');
  const [filtSre, setFiltSre] = useState('');
  const [filtSituacao, setFiltSituacao] = useState('');
  const [filtStatus, setFiltStatus] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('gesto_solicitacoes');
      if (raw) setObras(JSON.parse(raw));
    } catch { /* silently ignore */ }
    try {
      const raw = localStorage.getItem(VISTORIAS_KEY);
      if (raw) setVistorias(JSON.parse(raw));
    } catch { /* silently ignore */ }
  }, []);

  const municipiosUnicos = [...new Set(imoveis.map(i => i.municipio).filter(Boolean))].sort();
  const sresUnicas       = [...new Set(imoveis.map(i => i.sre).filter(Boolean))].sort();
  const hasFiltros = !!(filtMunicipio || filtSre || filtSituacao || filtStatus);

  const filtrados = imoveis.filter(i => {
    const q = busca.toLowerCase();
    if (busca && !i.nomeEscola.toLowerCase().includes(q) && !i.codesc.includes(busca) && !i.municipio.toLowerCase().includes(q)) return false;
    if (filtMunicipio && i.municipio !== filtMunicipio) return false;
    if (filtSre && i.sre !== filtSre) return false;
    if (filtSituacao && i.situacaoImovel !== filtSituacao) return false;
    if (filtStatus && i.status !== filtStatus) return false;
    return true;
  });

  // ── Seleção ────────────────────────────────────────────────────────────────
  if (!selected) {
    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 font-sans">Ficha Consolidada</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Prontuário imobiliário completo — identificação, situação documental, obras e vistorias.
          </p>
        </div>

        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-teal-800">Como usar esta tela</p>
            <p className="text-[11px] text-teal-700 mt-0.5 leading-relaxed">
              Selecione um imóvel abaixo para visualizar seu prontuário completo, incluindo dados cadastrais,
              situação documental, histórico de obras e vistorias realizadas.
            </p>
          </div>
        </div>

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
            <select value={filtSre} onChange={e => setFiltSre(e.target.value)} className={fltCls}>
              <option value="">Todas as SREs</option>
              {sresUnicas.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filtSituacao} onChange={e => setFiltSituacao(e.target.value)} className={fltCls}>
              <option value="">Todas as situações</option>
              {SITUACOES_IMOVEL.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filtStatus} onChange={e => setFiltStatus(e.target.value)} className={fltCls}>
              <option value="">Todos os status</option>
              <option value="rascunho">Rascunho</option>
              <option value="cadastrado">Cadastrado</option>
              <option value="regularizado">Regularizado</option>
            </select>
            {hasFiltros && (
              <button type="button"
                onClick={() => { setFiltMunicipio(''); setFiltSre(''); setFiltSituacao(''); setFiltStatus(''); }}
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
            <BookOpen className="w-10 h-10 mx-auto opacity-30" />
            <p className="font-semibold">Nenhum imóvel cadastrado ainda.</p>
            <p className="text-xs">Cadastre imóveis em "Cadastro de Próprios" para acessar a ficha consolidada.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtrados.map(i => {
              const imovelObras = obras.filter(o =>
                o.nomeEscola?.toLowerCase().includes(i.nomeEscola.toLowerCase()) ||
                (i.codesc && o.nomeEscola?.toLowerCase().includes(i.codesc))
              );
              const imovelVistorias = vistorias.filter(v => v.imovelId === i.id);
              const docsOk = i.documentos.filter(d => d.obrigatorio).every(d => d.status === 'anexado');

              return (
                <button key={i.id} type="button" onClick={() => setSelected(i)}
                  className="w-full bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-4 hover:border-teal-300 hover:shadow-sm transition-all text-left group">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-teal-100 transition">
                      <Home className="w-4 h-4 text-teal-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate">{i.nomeEscola || 'Escola não informada'}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        CODESC {i.codesc || '—'} · {i.municipio || '—'}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {i.situacaoImovel && (
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold">{i.situacaoImovel}</span>
                        )}
                        <span className="text-[9px] text-slate-400">
                          {imovelObras.length} obra{imovelObras.length !== 1 ? 's' : ''} ·{' '}
                          {imovelVistorias.length} vistoria{imovelVistorias.length !== 1 ? 's' : ''}
                        </span>
                        {docsOk
                          ? <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-0.5"><CheckCircle className="w-3 h-3" /> Docs OK</span>
                          : <span className="text-[9px] text-rose-500 font-bold flex items-center gap-0.5"><AlertCircle className="w-3 h-3" /> Docs pendentes</span>
                        }
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500 transition shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Prontuário ──────────────────────────────────────────────────────────────
  const imovelObras = obras.filter(o =>
    o.nomeEscola?.toLowerCase().includes(selected.nomeEscola.toLowerCase()) ||
    (selected.codesc && o.nomeEscola?.toLowerCase().includes(selected.codesc))
  );
  const imovelVistorias = vistorias.filter(v => v.imovelId === selected.id);
  const docsAnexados   = selected.documentos.filter(d => d.status === 'anexado').length;
  const docsObrigPend  = selected.documentos.filter(d => d.obrigatorio && d.status === 'pendente').length;
  const obrasEmExec    = imovelObras.filter(o => o.etapaAtual === 'execucao').length;

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button type="button" onClick={() => setSelected(null)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition cursor-pointer font-bold mt-0.5 shrink-0">
            ← Voltar
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold text-slate-800">{selected.nomeEscola || 'Escola não informada'}</h2>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                selected.status === 'regularizado' ? 'bg-emerald-100 text-emerald-700' :
                selected.status === 'cadastrado'   ? 'bg-blue-100 text-blue-700' :
                                                     'bg-amber-100 text-amber-700'
              }`}>{selected.status}</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              {selected.id} · CODESC {selected.codesc} · {selected.municipio} · {selected.sre}
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Área do Terreno',
            value: selected.areaTerrenoM2 ? `${selected.areaTerrenoM2.toLocaleString('pt-BR')} m²` : '—',
            icon: <MapPin className="w-4 h-4 text-slate-400" />,
          },
          {
            label: 'Área Construída',
            value: selected.areaConstruidaM2 ? `${selected.areaConstruidaM2.toLocaleString('pt-BR')} m²` : '—',
            icon: <Building2 className="w-4 h-4 text-teal-500" />,
          },
          {
            label: 'Histórico de Obras',
            value: `${imovelObras.length} registro${imovelObras.length !== 1 ? 's' : ''}`,
            icon: <HardHat className="w-4 h-4 text-amber-500" />,
          },
          {
            label: 'Vistorias Realizadas',
            value: `${imovelVistorias.length} registro${imovelVistorias.length !== 1 ? 's' : ''}`,
            icon: <Wrench className="w-4 h-4 text-blue-500" />,
          },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-3 flex items-start gap-2.5">
            <div className="mt-0.5 shrink-0">{card.icon}</div>
            <div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{card.label}</p>
              <p className="text-xs font-black text-slate-800 mt-0.5">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 1. Identificação */}
      <SectionCard icon={<Database className="w-4 h-4 text-teal-500" />} title="Identificação Escolar">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <InfoRow label="CODESC"              value={selected.codesc}           mono />
          <InfoRow label="Código de Endereço"  value={selected.codigoEndereco}   mono />
          <InfoRow label="Município"           value={selected.municipio} />
          <InfoRow label="SRE"                 value={selected.sre} />
          <div className="sm:col-span-2">
            <InfoRow label="Endereço Completo" value={selected.enderecoCompleto} />
          </div>
          <InfoRow label="CEP"       value={selected.cep}       mono />
          <InfoRow label="Latitude"  value={selected.coordLat}  mono />
          <InfoRow label="Longitude" value={selected.coordLng}  mono />
        </div>
      </SectionCard>

      {/* 2. Classificação Patrimonial */}
      <SectionCard icon={<Layers className="w-4 h-4 text-teal-500" />} title="Classificação Patrimonial">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoRow label="Forma de Ocupação" value={selected.formaOcupacao} />
          <InfoRow label="Prédio"            value={selected.predio} />
          <InfoRow label="Tombamento"        value={selected.tombado} />
          {selected.orgaoTombador && <InfoRow label="Órgão Tombador" value={selected.orgaoTombador} />}
          <InfoRow label="Coabitado" value={selected.coabitado} />
          {selected.tipoCoabitado && <InfoRow label="Tipo de Coabitação" value={selected.tipoCoabitado} />}
        </div>
      </SectionCard>

      {/* 3. Dados Físicos */}
      <SectionCard icon={<Building2 className="w-4 h-4 text-teal-500" />} title="Dados Físicos do Imóvel">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoRow label="Área do Terreno (m²)"  value={selected.areaTerrenoM2}    mono />
          <InfoRow label="Área Construída (m²)"  value={selected.areaConstruidaM2} mono />
          <InfoRow label="Número de Blocos"      value={selected.numeroBlocos}      mono />
          <InfoRow label="Número de Pavimentos"  value={selected.numeroPavimentos}  mono />
          <InfoRow label="Ano de Construção"     value={selected.anoConstrucao}     mono />
          <InfoRow label="Capacidade de Alunos"  value={selected.capacidadeAlunos}  mono />
        </div>
        {selected.observacoes && (
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Observações</p>
            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 rounded-xl border border-slate-200 p-3">
              {selected.observacoes}
            </p>
          </div>
        )}
      </SectionCard>

      {/* 4. Situação Documental */}
      <SectionCard icon={<FileText className="w-4 h-4 text-teal-500" />} title="Situação Documental">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          {selected.situacaoImovel ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-xl text-xs font-bold text-teal-800">
              <MapPin className="w-3.5 h-3.5" /> {selected.situacaoImovel}
            </span>
          ) : (
            <span className="text-xs text-rose-500 font-bold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Situação fundiária não informada
            </span>
          )}
          <span className={`text-xs font-bold flex items-center gap-1 ${docsObrigPend === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {docsObrigPend === 0
              ? <><CheckCircle className="w-3.5 h-3.5" /> Todos os docs obrigatórios anexados</>
              : <><AlertCircle className="w-3.5 h-3.5" /> {docsObrigPend} doc{docsObrigPend > 1 ? 's' : ''} obrigatório{docsObrigPend > 1 ? 's' : ''} pendente{docsObrigPend > 1 ? 's' : ''}</>
            }
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {selected.documentos.map(doc => (
            <div key={doc.id} className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs ${
              doc.status === 'anexado' ? 'bg-emerald-50 border-emerald-200' :
              doc.obrigatorio ? 'bg-rose-50/40 border-rose-200' : 'bg-slate-50 border-slate-200'
            }`}>
              {doc.status === 'anexado'
                ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                : <FileText className={`w-3.5 h-3.5 shrink-0 ${doc.obrigatorio ? 'text-rose-400' : 'text-slate-400'}`} />
              }
              <span className={`font-semibold ${doc.status === 'anexado' ? 'text-emerald-700' : doc.obrigatorio ? 'text-rose-700' : 'text-slate-600'}`}>
                {doc.nome}
              </span>
              {doc.obrigatorio && (
                <span className="ml-auto text-[9px] bg-rose-100 text-rose-600 px-1 py-0.5 rounded font-black uppercase shrink-0">Obrigatório</span>
              )}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          {docsAnexados} de {selected.documentos.length} documentos anexados.
          Para gerenciar, acesse "Regularização Documental".
        </p>
      </SectionCard>

      {/* 5. Histórico de Obras */}
      <SectionCard icon={<HardHat className="w-4 h-4 text-teal-500" />} title={`Histórico de Obras (${imovelObras.length})`}>
        {imovelObras.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs space-y-1">
            <HardHat className="w-8 h-8 mx-auto opacity-20" />
            <p>Nenhuma obra encontrada para este imóvel no sistema.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {imovelObras.map(o => (
              <div key={o.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <HardHat className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-700">{o.tipo || 'Obra'}</span>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${ETAPA_COLOR[o.etapaAtual || ''] || 'bg-slate-100 text-slate-600'}`}>
                      {ETAPA_LABEL[o.etapaAtual || ''] || o.etapaAtual || '—'}
                    </span>
                    {o.statusObra && (
                      <span className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-semibold">{o.statusObra}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {o.dataCriacao && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                        <Calendar className="w-3 h-3" /> {o.dataCriacao}
                      </span>
                    )}
                    {o.valorHomologado != null && (
                      <span className="text-[10px] text-slate-500 font-semibold">{fmt(o.valorHomologado)}</span>
                    )}
                    {o.empresaContratada && (
                      <span className="text-[10px] text-slate-500 truncate">{o.empresaContratada}</span>
                    )}
                  </div>
                </div>
                <span className="text-[9px] text-slate-300 font-mono shrink-0 mt-0.5">{o.id}</span>
              </div>
            ))}
          </div>
        )}
        {obrasEmExec > 0 && (
          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-blue-600 font-bold">
            <BarChart2 className="w-3.5 h-3.5" />
            {obrasEmExec} obra{obrasEmExec > 1 ? 's' : ''} atualmente em execução
          </div>
        )}
      </SectionCard>

      {/* 6. Vistorias */}
      <SectionCard icon={<Wrench className="w-4 h-4 text-teal-500" />} title={`Vistorias Realizadas (${imovelVistorias.length})`}>
        {imovelVistorias.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs space-y-1">
            <Wrench className="w-8 h-8 mx-auto opacity-20" />
            <p>Nenhuma vistoria registrada para este imóvel.</p>
            <p>Registre vistorias na tela "Vistorias & Inspeções".</p>
          </div>
        ) : (
          <div className="space-y-2">
            {imovelVistorias.map(v => {
              const resultConfig = {
                'Satisfatório':               'bg-emerald-100 text-emerald-800 border-emerald-200',
                'Parcialmente Satisfatório':  'bg-amber-100 text-amber-800 border-amber-200',
                'Insatisfatório':             'bg-rose-100 text-rose-800 border-rose-200',
              }[v.resultado] ?? 'bg-slate-100 text-slate-700 border-slate-200';

              return (
                <div key={v.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border shrink-0 mt-0.5 ${resultConfig}`}>
                    {v.resultado}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-700">{v.tipo}</span>
                      <span className="text-[10px] text-slate-400">{v.data}</span>
                      <span className="text-[10px] text-slate-500">— {v.responsavel}</span>
                    </div>
                    {v.observacoes && (
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{v.observacoes}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <div className="pb-4" />
    </div>
  );
}
