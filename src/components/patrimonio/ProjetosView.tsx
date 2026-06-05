import React, { useState, useEffect } from 'react';
import {
  FolderOpen, Plus, Search, Home, CheckCircle, AlertCircle,
  Clock, X, Save, ChevronLeft, Pencil, FileText, Zap,
  Droplets, ShieldCheck, Accessibility, BarChart2, Wind,
  Network, Leaf, Layers, Wrench, HelpCircle, Trash2, UploadCloud, Lock,
} from 'lucide-react';
import { ImovelPatrimonio } from './types';

export const PROJETOS_KEY = 'patrimonio_projetos_mg';
const fltCls = 'px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/20';

// ─── Tipos de projeto ────────────────────────────────────────────────────────
export interface ProjetoEscolar {
  id: string;
  imovelId: string;
  tipo: string;
  status: 'Atualizado' | 'Desatualizado' | 'Em Elaboração' | 'Não Possui';
  versao?: string;
  dataElaboracao?: string;
  dataAtualizacao?: string;
  responsavelTecnico?: string;
  registroProfissional?: string;
  numeroART?: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  uploadedAt?: string;
  artFileName?: string;
  artFileSize?: string;
  artUploadedAt?: string;
  observacoes?: string;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const EXT_BADGE: Record<string, string> = {
  DWG: 'bg-blue-600 text-white',
  DXF: 'bg-indigo-600 text-white',
  RVT: 'bg-purple-600 text-white',
  PDF: 'bg-rose-600 text-white',
  SKP: 'bg-orange-500 text-white',
};
const extBadge = (ext?: string) => EXT_BADGE[ext?.toUpperCase() ?? ''] ?? 'bg-slate-500 text-white';

interface TipoProjeto {
  label: string;
  icon: React.ReactNode;
  cor: string;
}

const TIPOS_PROJETO: TipoProjeto[] = [
  { label: 'Arquitetônico',                  icon: <Home className="w-5 h-5" />,          cor: 'text-teal-600 bg-teal-50 border-teal-200' },
  { label: 'Estrutural',                     icon: <Layers className="w-5 h-5" />,         cor: 'text-slate-600 bg-slate-50 border-slate-200' },
  { label: 'Instalações Elétricas',          icon: <Zap className="w-5 h-5" />,            cor: 'text-amber-600 bg-amber-50 border-amber-200' },
  { label: 'Instalações Hidrossanitárias',   icon: <Droplets className="w-5 h-5" />,       cor: 'text-blue-600 bg-blue-50 border-blue-200' },
  { label: 'SPDA / Para-raios',              icon: <Zap className="w-5 h-5" />,            cor: 'text-violet-600 bg-violet-50 border-violet-200' },
  { label: 'Prevenção e Combate a Incêndio', icon: <ShieldCheck className="w-5 h-5" />,   cor: 'text-rose-600 bg-rose-50 border-rose-200' },
  { label: 'Acessibilidade',                 icon: <Accessibility className="w-5 h-5" />,  cor: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { label: 'Sondagem / Geotécnico',          icon: <BarChart2 className="w-5 h-5" />,      cor: 'text-orange-600 bg-orange-50 border-orange-200' },
  { label: 'Climatização / HVAC',            icon: <Wind className="w-5 h-5" />,           cor: 'text-sky-600 bg-sky-50 border-sky-200' },
  { label: 'Cabeamento Estruturado / TI',    icon: <Network className="w-5 h-5" />,        cor: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { label: 'Paisagismo',                     icon: <Leaf className="w-5 h-5" />,           cor: 'text-lime-600 bg-lime-50 border-lime-200' },
  { label: 'Outro',                          icon: <HelpCircle className="w-5 h-5" />,     cor: 'text-gray-600 bg-gray-50 border-gray-200' },
];

const STATUS_CONFIG = {
  'Atualizado':      { badge: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500', icon: <CheckCircle className="w-3 h-3" /> },
  'Desatualizado':   { badge: 'bg-amber-100 text-amber-800',     dot: 'bg-amber-400',   icon: <AlertCircle className="w-3 h-3" /> },
  'Em Elaboração':   { badge: 'bg-blue-100 text-blue-800',       dot: 'bg-blue-500',    icon: <Clock className="w-3 h-3" /> },
  'Não Possui':      { badge: 'bg-slate-100 text-slate-500',     dot: 'bg-slate-300',   icon: <X className="w-3 h-3" /> },
} as const;

const inputCls  = 'w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20';
const labelCls  = 'block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1';
const selectCls = inputCls + ' cursor-pointer';

function emptyProjeto(imovelId: string, tipo: string): ProjetoEscolar {
  return {
    id: `PRJ-${Date.now()}`,
    imovelId,
    tipo,
    status: 'Em Elaboração',
    dataAtualizacao: new Date().toISOString().split('T')[0],
  };
}

// ─── Componente principal ────────────────────────────────────────────────────
interface Props {
  imoveis: ImovelPatrimonio[];
  sreRestrita?: string;
}

export default function ProjetosView({ imoveis, sreRestrita = '' }: Props) {
  const [projetos, setProjetos] = useState<ProjetoEscolar[]>(() => {
    try { return JSON.parse(localStorage.getItem(PROJETOS_KEY) || '[]'); } catch { return []; }
  });
  const [selectedImovel, setSelectedImovel] = useState<ImovelPatrimonio | null>(null);
  const [editingProjeto, setEditingProjeto] = useState<ProjetoEscolar | null>(null);
  const [editingTipo, setEditingTipo] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [saved, setSaved] = useState(false);
  const [tipoCustom, setTipoCustom] = useState('');
  const [filtMunicipio, setFiltMunicipio] = useState('');
  const [filtStatusPrj, setFiltStatusPrj] = useState('');

  useEffect(() => {
    localStorage.setItem(PROJETOS_KEY, JSON.stringify(projetos));
  }, [projetos]);

  const salvarProjeto = () => {
    if (!editingProjeto) return;
    const final = editingProjeto.tipo === 'Outro' && tipoCustom.trim()
      ? { ...editingProjeto, tipo: tipoCustom.trim() }
      : editingProjeto;
    setProjetos(prev => {
      const idx = prev.findIndex(p => p.id === final.id);
      return idx >= 0 ? prev.map(p => p.id === final.id ? final : p) : [final, ...prev];
    });
    setEditingProjeto(null);
    setEditingTipo(null);
    setTipoCustom('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const removerProjeto = (id: string) => {
    setProjetos(prev => prev.filter(p => p.id !== id));
  };

  const abrirEdicao = (imovelId: string, tipo: string) => {
    const existing = projetos.find(p => p.imovelId === imovelId && p.tipo === tipo);
    setEditingProjeto(existing ? { ...existing } : emptyProjeto(imovelId, tipo));
    setEditingTipo(tipo);
  };

  const municipiosUnicos = [...new Set(imoveis.map(i => i.municipio).filter(Boolean))].sort();
  const hasFiltros = !!(filtMunicipio || filtStatusPrj);

  const filtrados = imoveis.filter(i => {
    const q = busca.toLowerCase();
    if (busca && !i.nomeEscola.toLowerCase().includes(q) && !i.codesc.includes(busca) && !i.municipio.toLowerCase().includes(q)) return false;
    if (filtMunicipio && i.municipio !== filtMunicipio) return false;
    const prjs = projetos.filter(p => p.imovelId === i.id);
    if (filtStatusPrj === 'sem' && prjs.length > 0) return false;
    if (filtStatusPrj === 'desatualizado' && !prjs.some(p => p.status === 'Desatualizado')) return false;
    if (filtStatusPrj === 'ok' && prjs.some(p => p.status === 'Desatualizado' || p.status === 'Em Elaboração')) return false;
    if (filtStatusPrj === 'elaboracao' && !prjs.some(p => p.status === 'Em Elaboração')) return false;
    return true;
  });

  // stats globais
  const totalProjetos    = projetos.length;
  const atualizados      = projetos.filter(p => p.status === 'Atualizado').length;
  const desatualizados   = projetos.filter(p => p.status === 'Desatualizado').length;
  const emElaboracao     = projetos.filter(p => p.status === 'Em Elaboração').length;

  // ── Painel da escola ──────────────────────────────────────────────────────
  if (selectedImovel) {
    const imovelId = selectedImovel.id;
    const projetosEscola = projetos.filter(p => p.imovelId === imovelId);

    // projetos extras (tipo 'Outro' personalizado)
    const tiposPadrao = TIPOS_PROJETO.map(t => t.label);
    const tiposExtras = projetosEscola
      .filter(p => !tiposPadrao.includes(p.tipo))
      .map(p => p.tipo);

    const todosOsTipos = [...TIPOS_PROJETO.map(t => t.label), ...tiposExtras];

    const getProjeto = (tipo: string) => projetosEscola.find(p => p.tipo === tipo);
    const getTipoConfig = (tipo: string): TipoProjeto =>
      TIPOS_PROJETO.find(t => t.label === tipo) ?? {
        label: tipo,
        icon: <Wrench className="w-5 h-5" />,
        cor: 'text-gray-600 bg-gray-50 border-gray-200',
      };

    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button type="button" onClick={() => { setSelectedImovel(null); setEditingProjeto(null); setEditingTipo(null); }}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition cursor-pointer font-bold mt-0.5 shrink-0">
              <ChevronLeft className="w-3.5 h-3.5" /> Voltar
            </button>
            <div>
              <h2 className="text-sm font-extrabold text-slate-800">{selectedImovel.nomeEscola}</h2>
              <p className="text-[10px] text-slate-400 font-mono">CODESC {selectedImovel.codesc} · {selectedImovel.municipio} · {selectedImovel.sre}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Salvo
              </span>
            )}
            <button type="button"
              onClick={() => abrirEdicao(imovelId, 'Outro')}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-xl transition cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Outro Projeto
            </button>
          </div>
        </div>

        {/* Resumo da escola */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Cadastrados',    value: projetosEscola.length,                                          color: 'text-slate-700' },
            { label: 'Atualizados',    value: projetosEscola.filter(p => p.status === 'Atualizado').length,    color: 'text-emerald-700' },
            { label: 'Desatualizados', value: projetosEscola.filter(p => p.status === 'Desatualizado').length, color: 'text-amber-700' },
            { label: 'Em Elaboração',  value: projetosEscola.filter(p => p.status === 'Em Elaboração').length, color: 'text-blue-700' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Grade de tipos de projeto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {todosOsTipos.map(tipoLabel => {
            const cfg     = getTipoConfig(tipoLabel);
            const projeto  = getProjeto(tipoLabel);
            const statusCfg = projeto ? STATUS_CONFIG[projeto.status] : null;
            const isEditing = editingTipo === tipoLabel;

            return (
              <div key={tipoLabel} className={`rounded-2xl border overflow-hidden transition-all ${
                isEditing ? 'border-teal-300 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}>
                {/* Card header */}
                <div className="p-4 bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${cfg.cor}`}>
                        {cfg.icon}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 leading-tight">{tipoLabel}</p>
                        {projeto ? (
                          <div className="flex items-center gap-1 mt-1">
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${statusCfg!.badge}`}>
                              {statusCfg!.icon} {projeto.status}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[9px] text-slate-400 italic">Não cadastrado</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button"
                        onClick={() => isEditing ? setEditingTipo(null) : abrirEdicao(imovelId, tipoLabel)}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          isEditing
                            ? 'text-teal-600 bg-teal-50 hover:bg-teal-100'
                            : 'text-slate-400 hover:text-teal-600 hover:bg-teal-50'
                        }`} title={projeto ? 'Editar' : 'Cadastrar'}>
                        {isEditing ? <X className="w-3.5 h-3.5" /> : projeto ? <Pencil className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </button>
                      {projeto && (
                        <button type="button" onClick={() => removerProjeto(projeto.id)}
                          className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer" title="Remover">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Info resumida (quando não está editando) */}
                  {projeto && !isEditing && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1">
                      {projeto.versao && (
                        <p className="text-[10px] text-slate-500"><span className="font-bold">Versão:</span> {projeto.versao}</p>
                      )}
                      {projeto.dataAtualizacao && (
                        <p className="text-[10px] text-slate-500"><span className="font-bold">Atualizado em:</span> {projeto.dataAtualizacao}</p>
                      )}
                      {projeto.responsavelTecnico && (
                        <p className="text-[10px] text-slate-500 truncate"><span className="font-bold">RT:</span> {projeto.responsavelTecnico}</p>
                      )}
                      {projeto.numeroART && (
                        <p className="text-[10px] text-slate-400 font-mono">ART/RRT: {projeto.numeroART}</p>
                      )}
                      {projeto.fileName && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${extBadge(projeto.fileType)}`}>
                            {projeto.fileType || 'ARQ'}
                          </span>
                          <span className="text-[10px] text-teal-700 font-semibold truncate max-w-[120px]" title={projeto.fileName}>
                            {projeto.fileName}
                          </span>
                          {projeto.fileSize && (
                            <span className="text-[9px] text-slate-400 shrink-0">{projeto.fileSize}</span>
                          )}
                        </div>
                      )}
                      {projeto.artFileName && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-rose-600 text-white shrink-0">ART</span>
                          <span className="text-[10px] text-rose-700 font-semibold truncate max-w-[120px]" title={projeto.artFileName}>
                            {projeto.artFileName}
                          </span>
                          {projeto.artFileSize && (
                            <span className="text-[9px] text-slate-400 shrink-0">{projeto.artFileSize}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Formulário inline */}
                {isEditing && editingProjeto && (
                  <div className="border-t border-teal-100 bg-teal-50/30 p-4 space-y-3">
                    {/* Se tipo for "Outro", mostrar campo para nome personalizado */}
                    {tipoLabel === 'Outro' && (
                      <div>
                        <label className={labelCls}>Nome do Projeto *</label>
                        <input type="text" placeholder="Ex: Laudos de Acessibilidade Específico"
                          value={tipoCustom} onChange={e => setTipoCustom(e.target.value)}
                          className={inputCls} />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={labelCls}>Status *</label>
                        <select value={editingProjeto.status}
                          onChange={e => setEditingProjeto(p => p ? { ...p, status: e.target.value as ProjetoEscolar['status'] } : p)}
                          className={selectCls}>
                          <option value="Atualizado">Atualizado</option>
                          <option value="Desatualizado">Desatualizado</option>
                          <option value="Em Elaboração">Em Elaboração</option>
                          <option value="Não Possui">Não Possui</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Versão / Revisão</label>
                        <input type="text" placeholder="Ex: Rev. 03"
                          value={editingProjeto.versao || ''}
                          onChange={e => setEditingProjeto(p => p ? { ...p, versao: e.target.value } : p)}
                          className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Data de Elaboração</label>
                        <input type="date"
                          value={editingProjeto.dataElaboracao || ''}
                          onChange={e => setEditingProjeto(p => p ? { ...p, dataElaboracao: e.target.value } : p)}
                          className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Última Atualização</label>
                        <input type="date"
                          value={editingProjeto.dataAtualizacao || ''}
                          onChange={e => setEditingProjeto(p => p ? { ...p, dataAtualizacao: e.target.value } : p)}
                          className={inputCls} />
                      </div>
                    </div>

                    <div>
                      <label className={labelCls}>Responsável Técnico (RT)</label>
                      <input type="text" placeholder="Nome do Engenheiro / Arquiteto"
                        value={editingProjeto.responsavelTecnico || ''}
                        onChange={e => setEditingProjeto(p => p ? { ...p, responsavelTecnico: e.target.value } : p)}
                        className={inputCls} />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={labelCls}>Registro CREA / CAU</label>
                        <input type="text" placeholder="Ex: CREA-MG 123456/D"
                          value={editingProjeto.registroProfissional || ''}
                          onChange={e => setEditingProjeto(p => p ? { ...p, registroProfissional: e.target.value } : p)}
                          className={inputCls + ' font-mono'} />
                      </div>
                      <div>
                        <label className={labelCls}>Número ART / RRT</label>
                        <input type="text" placeholder="Ex: 1234567890"
                          value={editingProjeto.numeroART || ''}
                          onChange={e => setEditingProjeto(p => p ? { ...p, numeroART: e.target.value } : p)}
                          className={inputCls + ' font-mono'} />
                      </div>
                    </div>

                    <div>
                      <label className={labelCls}>Arquivo do Projeto</label>

                      {/* Arquivo já selecionado */}
                      {editingProjeto.fileName ? (
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-teal-50 border border-teal-200 rounded-xl">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 ${extBadge(editingProjeto.fileType)}`}>
                            {editingProjeto.fileType || 'ARQ'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-teal-800 truncate">{editingProjeto.fileName}</p>
                            <p className="text-[9px] text-teal-600">
                              {editingProjeto.fileSize && <span>{editingProjeto.fileSize} · </span>}
                              {editingProjeto.uploadedAt && <span>Anexado em {editingProjeto.uploadedAt}</span>}
                            </p>
                          </div>
                          <button type="button"
                            onClick={() => setEditingProjeto(p => p ? { ...p, fileName: undefined, fileSize: undefined, fileType: undefined, uploadedAt: undefined } : p)}
                            className="p-1 text-teal-400 hover:text-rose-500 transition cursor-pointer shrink-0"
                            title="Remover arquivo">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        /* Zona de upload */
                        <label htmlFor={`file-${editingProjeto.id}`}
                          className="flex flex-col items-center justify-center gap-2 px-4 py-5 border-2 border-dashed border-slate-300 hover:border-teal-400 hover:bg-teal-50/30 rounded-xl cursor-pointer transition-all group">
                          <UploadCloud className="w-6 h-6 text-slate-300 group-hover:text-teal-500 transition" />
                          <div className="text-center">
                            <p className="text-xs font-bold text-slate-500 group-hover:text-teal-700 transition">
                              Clique para anexar o arquivo do projeto
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              DWG, DXF, RVT, PDF, SKP · sem limite de tamanho
                            </p>
                          </div>
                          <input
                            id={`file-${editingProjeto.id}`}
                            type="file"
                            accept=".dwg,.dxf,.rvt,.pdf,.skp"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const ext = file.name.split('.').pop()?.toUpperCase() || '';
                              setEditingProjeto(p => p ? {
                                ...p,
                                fileName:   file.name,
                                fileSize:   fmtSize(file.size),
                                fileType:   ext,
                                uploadedAt: new Date().toISOString().split('T')[0],
                              } : p);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      )}
                    </div>

                    <div>
                      <label className={labelCls}>ART / RRT (PDF)</label>

                      {editingProjeto.artFileName ? (
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-rose-50 border border-rose-200 rounded-xl">
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-600 text-white shrink-0">ART</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-rose-800 truncate">{editingProjeto.artFileName}</p>
                            <p className="text-[9px] text-rose-500">
                              {editingProjeto.artFileSize && <span>{editingProjeto.artFileSize} · </span>}
                              {editingProjeto.artUploadedAt && <span>Anexado em {editingProjeto.artUploadedAt}</span>}
                            </p>
                          </div>
                          <button type="button"
                            onClick={() => setEditingProjeto(p => p ? { ...p, artFileName: undefined, artFileSize: undefined, artUploadedAt: undefined } : p)}
                            className="p-1 text-rose-300 hover:text-rose-600 transition cursor-pointer shrink-0"
                            title="Remover ART">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label htmlFor={`art-${editingProjeto.id}`}
                          className="flex flex-col items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-slate-300 hover:border-rose-400 hover:bg-rose-50/30 rounded-xl cursor-pointer transition-all group">
                          <UploadCloud className="w-5 h-5 text-slate-300 group-hover:text-rose-400 transition" />
                          <div className="text-center">
                            <p className="text-xs font-bold text-slate-500 group-hover:text-rose-700 transition">
                              Clique para anexar a ART / RRT
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Somente PDF</p>
                          </div>
                          <input
                            id={`art-${editingProjeto.id}`}
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setEditingProjeto(p => p ? {
                                ...p,
                                artFileName:  file.name,
                                artFileSize:  fmtSize(file.size),
                                artUploadedAt: new Date().toISOString().split('T')[0],
                              } : p);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      )}
                    </div>

                    <div>
                      <label className={labelCls}>Observações</label>
                      <textarea rows={2}
                        value={editingProjeto.observacoes || ''}
                        onChange={e => setEditingProjeto(p => p ? { ...p, observacoes: e.target.value } : p)}
                        placeholder="Informações relevantes sobre este projeto..."
                        className={inputCls + ' leading-relaxed'} />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button type="button" onClick={() => { setEditingProjeto(null); setEditingTipo(null); }}
                        className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer font-bold">
                        Cancelar
                      </button>
                      <button type="button" onClick={salvarProjeto}
                        disabled={tipoLabel === 'Outro' && !tipoCustom.trim()}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl transition cursor-pointer shadow-sm">
                        <Save className="w-3.5 h-3.5" /> Salvar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Lista de escolas ────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h2 className="text-base font-extrabold text-slate-800 font-sans">Projetos das Escolas</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Gerencie os projetos técnicos atualizados de cada imóvel — arquitetônico, elétrico, hidráulico e demais.
        </p>
      </div>

      {/* Stats globais */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total de Projetos',  value: totalProjetos,  color: 'text-slate-700',   bg: 'bg-slate-50 border-slate-200' },
          { label: 'Atualizados',        value: atualizados,    color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
          { label: 'Desatualizados',     value: desatualizados, color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-100' },
          { label: 'Em Elaboração',      value: emElaboracao,   color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-100' },
        ].map(s => (
          <div key={s.label} className={`border rounded-xl p-3 text-center ${s.bg}`}>
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
          <select value={filtStatusPrj} onChange={e => setFiltStatusPrj(e.target.value)} className={fltCls}>
            <option value="">Todas as situações</option>
            <option value="sem">Sem projetos cadastrados</option>
            <option value="desatualizado">Com projetos desatualizados</option>
            <option value="elaboracao">Com projetos em elaboração</option>
            <option value="ok">Todos atualizados</option>
          </select>
          {hasFiltros && (
            <button type="button"
              onClick={() => { setFiltMunicipio(''); setFiltStatusPrj(''); }}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer font-bold">
              <X className="w-3 h-3" /> Limpar filtros
            </button>
          )}
          {(hasFiltros || busca) && (
            <span className="text-[10px] text-slate-400">{filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* Lista de escolas */}
      {imoveis.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm space-y-2">
          <FolderOpen className="w-10 h-10 mx-auto opacity-30" />
          <p className="font-semibold">Nenhum imóvel cadastrado.</p>
          <p className="text-xs">Cadastre imóveis em "Cadastro de Próprios" para gerenciar projetos aqui.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(imovel => {
            const projetosEscola  = projetos.filter(p => p.imovelId === imovel.id);
            const qtdAtualizado   = projetosEscola.filter(p => p.status === 'Atualizado').length;
            const qtdDesatualiz   = projetosEscola.filter(p => p.status === 'Desatualizado').length;
            const qtdEmElab       = projetosEscola.filter(p => p.status === 'Em Elaboração').length;
            const tiposCadastrados = projetosEscola.map(p => p.tipo);

            return (
              <button key={imovel.id} type="button" onClick={() => setSelectedImovel(imovel)}
                className="w-full bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-4 hover:border-teal-300 hover:shadow-sm transition-all text-left group">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-teal-100 transition">
                    <FolderOpen className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-800 truncate">{imovel.nomeEscola || 'Escola não informada'}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      CODESC {imovel.codesc || '—'} · {imovel.municipio || '—'}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {projetosEscola.length === 0 ? (
                        <span className="text-[9px] text-slate-400 italic">Nenhum projeto cadastrado</span>
                      ) : (
                        <>
                          <span className="text-[9px] text-slate-500 font-semibold">
                            {projetosEscola.length} projeto{projetosEscola.length !== 1 ? 's' : ''}
                          </span>
                          {qtdAtualizado > 0 && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full">
                              {qtdAtualizado} ok
                            </span>
                          )}
                          {qtdDesatualiz > 0 && (
                            <span className="text-[9px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">
                              {qtdDesatualiz} desatualizado{qtdDesatualiz > 1 ? 's' : ''}
                            </span>
                          )}
                          {qtdEmElab > 0 && (
                            <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full">
                              {qtdEmElab} em elaboração
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    {tiposCadastrados.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {tiposCadastrados.slice(0, 4).map(t => (
                          <span key={t} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium truncate max-w-[100px]">
                            {t}
                          </span>
                        ))}
                        {tiposCadastrados.length > 4 && (
                          <span className="text-[9px] text-slate-400">+{tiposCadastrados.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-[10px] text-teal-600 font-black group-hover:underline">
                    Gerenciar →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
