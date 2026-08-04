import React, { useEffect, useState } from 'react';
import {
  FileCheck, CheckCircle, XCircle, ChevronRight, Lock, FileText, Download,
} from 'lucide-react';
import { Solicitacao, Aditivo, AjustePlanilha, SaldoComplementarItem, PerfilUsuario, UsuarioSistema } from '../types';
import { supabase } from '../lib/supabase';

type TipoItemContratual = 'aditivo' | 'ajuste' | 'saldo';

interface ValidacaoContratualProps {
  solicitacao: Solicitacao | null;
  itemSelecionado: { tipo: TipoItemContratual; itemId: string } | null;
  perfilUsuario?: PerfilUsuario;
  usuariosSeguranca?: UsuarioSistema[];
  onUpdate: (sol: Solicitacao) => void;
}

const PERFIS_QUE_VALIDAM: PerfilUsuario[] = ['analista_dore', 'gestor_dore', 'admin', 'diretor_dore'];

const TABS: { id: TipoItemContratual; label: string }[] = [
  { id: 'aditivo', label: 'Aditivos' },
  { id: 'ajuste', label: 'Ajustes de Planilha' },
  { id: 'saldo', label: 'Saldo Complementar' },
];

const fmtBRL = (v?: number) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function StatusBadge({ children, tone }: { children: React.ReactNode; tone: 'pendente' | 'aprovado' | 'recusado' }) {
  const classes = {
    pendente: 'bg-amber-50 text-amber-700 border-amber-200',
    aprovado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    recusado: 'bg-red-50 text-red-700 border-red-200',
  }[tone];
  return (
    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${classes}`}>
      {children}
    </span>
  );
}

function CampoLeitura({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-[9.5px] text-slate-500 uppercase font-extrabold block mb-0.5">{label}</span>
      <p className="text-xs font-bold text-slate-800">{value ?? '—'}</p>
    </div>
  );
}

type StatusDoc = 'pendente' | 'aprovado' | 'recusado';

// Card de documento no mesmo padrão visual/interação da Validação Técnica
// (SolicitacaoDetalhes.tsx, aba "checklist"): nome + categoria, baixar, Validado / Não Validado, status atual.
const DocumentoChecklistCard: React.FC<{
  numero: number;
  nome: string;
  obrigatorio: boolean;
  anexado: boolean;
  fileName?: string;
  status: StatusDoc;
  podeValidar: boolean;
  onDownload?: () => void;
  onValidar: () => void;
  onRecusar: () => void;
}> = ({
  numero,
  nome,
  obrigatorio,
  anexado,
  fileName,
  status,
  podeValidar,
  onDownload,
  onValidar,
  onRecusar,
}) => {
  return (
    <div
      className={`p-3.5 rounded-xl border transition-all ${
        status === 'recusado'
          ? 'border-red-200 bg-red-50/15'
          : status === 'aprovado'
            ? 'border-emerald-100 bg-emerald-50/10'
            : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                status === 'aprovado'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : status === 'recusado'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-slate-50 text-slate-600 border border-slate-100'
              }`}
            >
              Item {numero}
            </span>
            <h4 className="font-bold text-slate-800 text-xs">{nome}</h4>
            {obrigatorio ? (
              <span className="text-[9.5px] font-bold text-red-500 uppercase">Obrigatório</span>
            ) : (
              <span className="text-[9.5px] font-medium text-slate-400">Opcional</span>
            )}
          </div>

          {anexado ? (
            <div className="mt-2 flex items-center gap-2 bg-slate-50 border border-slate-200/70 px-2.5 py-1.5 rounded-lg text-[11px]">
              <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="font-mono text-slate-700 truncate flex-1">
                {fileName || 'Documento declarado pelo técnico'}
              </span>
              {onDownload && (
                <button
                  type="button"
                  onClick={onDownload}
                  className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 font-extrabold text-[10px] uppercase border border-blue-200 rounded px-1.5 py-1 cursor-pointer"
                  title="Baixar Documento"
                >
                  <Download className="w-3 h-3" /> Baixar
                </button>
              )}
            </div>
          ) : (
            <span className="text-[10.5px] italic text-slate-400 block mt-1.5">
              ⚠️ Nenhum documento anexado ainda.
            </span>
          )}
        </div>

        <div className="shrink-0">
          {podeValidar ? (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                disabled={!anexado}
                onClick={onValidar}
                title="Validar Documento"
                className={`px-2.5 py-1.5 rounded-md text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                  status === 'aprovado' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                } ${!anexado ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <CheckCircle className="w-3.5 h-3.5" /> Validado
              </button>
              <button
                type="button"
                disabled={!anexado}
                onClick={onRecusar}
                title="Não Validar Documento"
                className={`px-2.5 py-1.5 rounded-md text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                  status === 'recusado' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                } ${!anexado ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <XCircle className="w-3.5 h-3.5" /> Não Validado
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-slate-500">
              Status:{' '}
              <span
                className={`uppercase font-bold ${
                  status === 'aprovado' ? 'text-emerald-600' : status === 'recusado' ? 'text-red-500' : 'text-slate-400'
                }`}
              >
                {status}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CardWrapper: React.FC<{ id: string; destaque: boolean; children: React.ReactNode }> = ({ id, destaque, children }) => {
  return (
    <div
      id={`item-contratual-${id}`}
      className={`bg-white rounded-2xl border p-5 space-y-4 transition-all duration-500 ${
        destaque ? 'border-blue-400 ring-2 ring-blue-200 shadow-md' : 'border-slate-200'
      }`}
    >
      {children}
    </div>
  );
};

function AcoesValidacao({
  podeAgir,
  podeValidar,
  parecer,
  onParecerChange,
  salvando,
  recusando,
  onIniciarRecusa,
  onCancelarRecusa,
  onAprovar,
  onRecusar,
}: {
  podeAgir: boolean;
  podeValidar: boolean;
  parecer: string;
  onParecerChange: (texto: string) => void;
  salvando: boolean;
  recusando: boolean;
  onIniciarRecusa: () => void;
  onCancelarRecusa: () => void;
  onAprovar: () => void;
  onRecusar: (motivo: string) => void;
}) {
  if (!podeValidar) {
    return (
      <div className="flex items-center gap-1.5 text-[10.5px] text-slate-400 font-semibold">
        <Lock className="w-3.5 h-3.5" /> Apenas analistas DORE podem validar este item.
      </div>
    );
  }
  if (!podeAgir) return null;
  return (
    <>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
          Parecer Técnico do Analista DORE *
        </label>
        <textarea
          value={parecer}
          onChange={(e) => onParecerChange(e.target.value)}
          rows={3}
          placeholder="Registre a análise técnica desta solicitação..."
          className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={salvando}
          onClick={onAprovar}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          <CheckCircle className="w-3.5 h-3.5" /> Homologar e Aprovar
        </button>
        <button
          type="button"
          disabled={salvando}
          onClick={onIniciarRecusa}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <XCircle className="w-3.5 h-3.5" /> Recusar / Devolver
        </button>
      </div>
      {recusando && (
        <ModalRecusa onCancelar={onCancelarRecusa} onConfirmar={onRecusar} />
      )}
    </>
  );
}

// Modal simples de recusa — pede motivo antes de gravar a devolução.
function ModalRecusa({ onConfirmar, onCancelar }: { onConfirmar: (motivo: string) => void; onCancelar: () => void }) {
  const [motivo, setMotivo] = useState('');
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-500" /> Recusar / Devolver Item
        </h3>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={4}
          placeholder="Descreva o motivo da recusa/devolução..."
          className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-red-400"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancelar}
            className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!motivo.trim()}
            onClick={() => onConfirmar(motivo)}
            className="px-5 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-xl cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            Confirmar Recusa
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ValidacaoContratual({
  solicitacao,
  itemSelecionado,
  perfilUsuario,
  usuariosSeguranca = [],
  onUpdate,
}: ValidacaoContratualProps) {
  const [activeTab, setActiveTab] = useState<TipoItemContratual>(itemSelecionado?.tipo || 'aditivo');
  const [pareceres, setPareceres] = useState<{ [itemId: string]: string }>({});
  const [recusandoId, setRecusandoId] = useState<string | null>(null);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [destaqueId, setDestaqueId] = useState<string | null>(null);
  const [statusDocs, setStatusDocs] = useState<{ [docKey: string]: StatusDoc }>({});

  const podeValidar = !!perfilUsuario && PERFIS_QUE_VALIDAM.includes(perfilUsuario);

  // Chave por item pai + índice — os checklists de aditivo/ajuste/saldo não têm id próprio por documento.
  const docKey = (parentId: string, idx: number) => `${parentId}__${idx}`;
  const getDocStatus = (parentId: string, idx: number): StatusDoc => statusDocs[docKey(parentId, idx)] || 'pendente';
  const setDocStatus = (parentId: string, idx: number, status: StatusDoc) =>
    setStatusDocs(prev => ({ ...prev, [docKey(parentId, idx)]: status }));

  // Documentos deste protótipo não têm conteúdo real anexado — gera um arquivo simulado para download,
  // no mesmo padrão usado pela Validação Técnica (handleDownloadDocument em SolicitacaoDetalhes.tsx).
  const baixarDocumentoSimulado = (fileName: string, label: string) => {
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
  };

  useEffect(() => {
    if (!itemSelecionado) return;
    setActiveTab(itemSelecionado.tipo);
    setDestaqueId(itemSelecionado.itemId);
    const el = document.getElementById(`item-contratual-${itemSelecionado.itemId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(() => setDestaqueId(null), 4000);
    return () => clearTimeout(t);
  }, [itemSelecionado]);

  if (!solicitacao) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
        <FileCheck className="w-12 h-12 mx-auto text-slate-300" />
        <h3 className="text-sm font-black text-slate-700">Nenhuma obra selecionada</h3>
        <p className="text-xs max-w-xs mx-auto leading-relaxed">
          Selecione um processo com aditivo, ajuste de planilha ou saldo complementar pendente para validar.
        </p>
      </div>
    );
  }

  const setParecer = (itemId: string, texto: string) =>
    setPareceres(prev => ({ ...prev, [itemId]: texto }));

  // --- ADITIVOS ---
  const aprovarAditivo = async (item: Aditivo) => {
    const parecer = (pareceres[item.id] || '').trim();
    if (!parecer) { alert('Insira o parecer técnico antes de homologar.'); return; }
    setSalvandoId(item.id);
    const dataDecisao = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('aditivos')
      .update({ status: 'aprovado', parecer_consolidado: parecer, data_aditivo: dataDecisao })
      .eq('id', item.id);
    setSalvandoId(null);
    if (error) { console.error(error); alert('Erro ao homologar o aditivo no banco de dados.'); return; }

    const adtVal = item.valorAditivo || 0;
    onUpdate({
      ...solicitacao,
      aditivos: (solicitacao.aditivos || []).map(a =>
        a.id === item.id ? { ...a, status: 'Aprovado', parecerConsolidado: parecer, data: dataDecisao } : a
      ),
      valorPlanilha: (solicitacao.valorPlanilha || 0) + adtVal,
      valorHomologadoContratacao: (solicitacao.valorHomologadoContratacao || 0) + adtVal,
    });
    setParecer(item.id, '');
  };

  const recusarAditivo = async (item: Aditivo, motivo: string) => {
    setSalvandoId(item.id);
    const dataDecisao = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('aditivos')
      .update({ status: 'recusado', parecer_consolidado: motivo, data_aditivo: dataDecisao })
      .eq('id', item.id);
    setSalvandoId(null);
    if (error) { console.error(error); alert('Erro ao recusar o aditivo no banco de dados.'); return; }

    onUpdate({
      ...solicitacao,
      aditivos: (solicitacao.aditivos || []).map(a =>
        a.id === item.id ? { ...a, status: 'Recusado', parecerConsolidado: motivo, data: dataDecisao } : a
      ),
    });
    setRecusandoId(null);
  };

  // --- AJUSTES DE PLANILHA ---
  const aprovarAjuste = async (item: AjustePlanilha) => {
    const parecer = (pareceres[item.id] || '').trim();
    if (!parecer) { alert('Insira o parecer técnico antes de homologar.'); return; }
    setSalvandoId(item.id);
    const dataDecisao = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('ajustes_planilha')
      .update({ status: 'aprovado', parecer_dore: parecer, data_ajuste: dataDecisao })
      .eq('id', item.id);
    setSalvandoId(null);
    if (error) { console.error(error); alert('Erro ao homologar o ajuste no banco de dados.'); return; }

    const ajuVal = item.diferencaPlanilhas || 0;
    onUpdate({
      ...solicitacao,
      ajustes: (solicitacao.ajustes || []).map(a =>
        a.id === item.id ? { ...a, status: 'validado', parecerDore: parecer, dataCriacao: dataDecisao } : a
      ),
      valorPlanilha: (solicitacao.valorPlanilha || 0) + ajuVal,
      valorHomologadoContratacao: (solicitacao.valorHomologadoContratacao || 0) + ajuVal,
    });
    setParecer(item.id, '');
  };

  const recusarAjuste = async (item: AjustePlanilha, motivo: string) => {
    setSalvandoId(item.id);
    const dataDecisao = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('ajustes_planilha')
      .update({ status: 'recusado', parecer_dore: motivo, data_ajuste: dataDecisao })
      .eq('id', item.id);
    setSalvandoId(null);
    if (error) { console.error(error); alert('Erro ao recusar o ajuste no banco de dados.'); return; }

    onUpdate({
      ...solicitacao,
      ajustes: (solicitacao.ajustes || []).map(a =>
        a.id === item.id ? { ...a, status: 'em_elaboracao', parecerDore: motivo, dataCriacao: dataDecisao } : a
      ),
    });
    setRecusandoId(null);
  };

  // --- SALDO COMPLEMENTAR ---
  const aprovarSaldo = async (item: SaldoComplementarItem) => {
    const parecer = (pareceres[item.id] || '').trim();
    if (!parecer) { alert('Insira o parecer técnico antes de homologar.'); return; }
    setSalvandoId(item.id);
    const { error } = await supabase
      .from('saldos_complementares')
      .update({ status: 'aprovado', descricao: parecer })
      .eq('id', item.id);
    setSalvandoId(null);
    if (error) { console.error(error); alert('Erro ao homologar o saldo complementar no banco de dados.'); return; }

    onUpdate({
      ...solicitacao,
      saldosComplementares: (solicitacao.saldosComplementares || []).map(s =>
        s.id === item.id ? { ...s, status: 'aprovado' } : s
      ),
    });
    setParecer(item.id, '');
  };

  const recusarSaldo = async (item: SaldoComplementarItem, motivo: string) => {
    setSalvandoId(item.id);
    const { error } = await supabase
      .from('saldos_complementares')
      .update({ status: 'recusado', descricao: motivo })
      .eq('id', item.id);
    setSalvandoId(null);
    if (error) { console.error(error); alert('Erro ao recusar o saldo complementar no banco de dados.'); return; }

    onUpdate({
      ...solicitacao,
      saldosComplementares: (solicitacao.saldosComplementares || []).map(s =>
        s.id === item.id ? { ...s, status: 'reprovado' } : s
      ),
    });
    setRecusandoId(null);
  };

  const aditivos = solicitacao.aditivos || [];
  const ajustes = solicitacao.ajustes || [];
  const saldos = solicitacao.saldosComplementares || [];

  return (
    <div className="space-y-6 animate-fadeIn text-left font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-purple-800 rounded-3xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="px-2 py-0.5 bg-white/15 text-white font-extrabold text-[10px] rounded uppercase tracking-wider">
            Validação Contratual
          </span>
          <h2 className="text-base sm:text-lg font-extrabold tracking-tight mt-1 flex items-center gap-2">
            <FileCheck className="w-5 h-5 shrink-0" />
            {solicitacao.nomeEscola}
          </h2>
          <p className="text-xs text-indigo-100 mt-0.5 font-mono">
            CODESC {solicitacao.codesc} · ID {solicitacao.id}
          </p>
        </div>
      </div>

      {/* Abas internas */}
      <div className="flex gap-2 border-b border-slate-200">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition cursor-pointer ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ADITIVOS */}
      {activeTab === 'aditivo' && (
        <div className="space-y-4">
          {aditivos.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-8">Nenhum aditivo registrado para esta obra.</p>
          )}
          {aditivos.map(adt => (
            <CardWrapper key={adt.id} id={adt.id} destaque={destaqueId === adt.id}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
                  Aditivo {adt.numeroAditivo ? `#${adt.numeroAditivo}` : adt.id}
                </h3>
                <StatusBadge tone={adt.status === 'Aprovado' ? 'aprovado' : adt.status === 'Recusado' ? 'recusado' : 'pendente'}>
                  {adt.status}
                </StatusBadge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <CampoLeitura label="Tipo" value={adt.tipo} />
                <CampoLeitura label="Acréscimo de Valor" value={adt.valorExtra ? fmtBRL(adt.valorExtra) : '—'} />
                <CampoLeitura label="Supressão" value={adt.supressao ? fmtBRL(adt.supressao) : '—'} />
                <CampoLeitura label="Prorrogação de Prazo" value={adt.prazoExtraDias ? `${adt.prazoExtraDias} dias` : '—'} />
                <CampoLeitura label="Reprogramação" value={adt.reprogramacao} />
                <CampoLeitura label="Saldo Complementar" value={adt.saldoComplementar} />
                <CampoLeitura label="Data de Criação" value={adt.data} />
                <CampoLeitura label="Analista Atribuído" value={adt.analistaAtribuido} />
              </div>
              <CampoLeitura label="Justificativa Técnica" value={adt.justificativa} />
              {(adt.checklistDocs || []).length > 0 && (
                <div className="space-y-2">
                  <span className="text-[9.5px] text-slate-500 uppercase font-extrabold block">Checklist de Documentos</span>
                  {(adt.checklistDocs || []).map((d, idx) => (
                    <DocumentoChecklistCard
                      key={idx}
                      numero={idx + 1}
                      nome={d.item}
                      obrigatorio
                      anexado={d.checked}
                      fileName={d.fileName}
                      status={getDocStatus(adt.id, idx)}
                      podeValidar={podeValidar && adt.status === 'Pendente'}
                      onDownload={d.fileName ? () => baixarDocumentoSimulado(d.fileName!, d.item) : undefined}
                      onValidar={() => setDocStatus(adt.id, idx, 'aprovado')}
                      onRecusar={() => setDocStatus(adt.id, idx, 'recusado')}
                    />
                  ))}
                </div>
              )}
              {adt.parecerConsolidado && (
                <CampoLeitura label="Parecer Consolidado Registrado" value={adt.parecerConsolidado} />
              )}
              <AcoesValidacao
                podeAgir={adt.status === 'Pendente'}
                podeValidar={podeValidar}
                parecer={pareceres[adt.id] || ''}
                onParecerChange={(texto) => setParecer(adt.id, texto)}
                salvando={salvandoId === adt.id}
                recusando={recusandoId === adt.id}
                onIniciarRecusa={() => setRecusandoId(adt.id)}
                onCancelarRecusa={() => setRecusandoId(null)}
                onAprovar={() => aprovarAditivo(adt)}
                onRecusar={(motivo) => recusarAditivo(adt, motivo)}
              />
            </CardWrapper>
          ))}
        </div>
      )}

      {/* AJUSTES DE PLANILHA */}
      {activeTab === 'ajuste' && (
        <div className="space-y-4">
          {ajustes.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-8">Nenhum ajuste de planilha registrado para esta obra.</p>
          )}
          {ajustes.map(aju => (
            <CardWrapper key={aju.id} id={aju.id} destaque={destaqueId === aju.id}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
                  Ajuste #{aju.numero}
                </h3>
                <StatusBadge tone={aju.status === 'validado' ? 'aprovado' : aju.status === 'analise_dore' ? 'pendente' : 'recusado'}>
                  {aju.status}
                </StatusBadge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <CampoLeitura label="Tipo de Ajuste" value={aju.tipoAjuste} />
                <CampoLeitura label="Valor do Ajuste" value={fmtBRL(aju.valorAjuste)} />
                <CampoLeitura label="Supressão" value={aju.supressao ? fmtBRL(aju.supressao) : '—'} />
                <CampoLeitura label="Diferença de Planilha" value={fmtBRL(aju.diferencaPlanilhas)} />
                <CampoLeitura label="Reprogramação" value={aju.reprogramacao} />
                <CampoLeitura label="Saldo Complementar" value={aju.saldoComplementar} />
                <CampoLeitura label="Responsável (Fiscal)" value={aju.responsavelPlanilha} />
                <CampoLeitura label="Registro Profissional (CREA)" value={aju.registroProfissional} />
                <CampoLeitura label="Data de Criação" value={aju.dataCriacao} />
              </div>
              <CampoLeitura label="Observações" value={aju.observacoes} />
              {(aju.checklistDocs || []).length > 0 && (
                <div className="space-y-2">
                  <span className="text-[9.5px] text-slate-500 uppercase font-extrabold block">Checklist de Documentos</span>
                  {(aju.checklistDocs || []).map((d, idx) => (
                    <DocumentoChecklistCard
                      key={idx}
                      numero={idx + 1}
                      nome={d.item}
                      obrigatorio
                      anexado={d.checked}
                      fileName={d.fileName}
                      status={getDocStatus(aju.id, idx)}
                      podeValidar={podeValidar && aju.status === 'analise_dore'}
                      onDownload={d.fileName ? () => baixarDocumentoSimulado(d.fileName!, d.item) : undefined}
                      onValidar={() => setDocStatus(aju.id, idx, 'aprovado')}
                      onRecusar={() => setDocStatus(aju.id, idx, 'recusado')}
                    />
                  ))}
                </div>
              )}
              {aju.parecerDore && (
                <CampoLeitura label="Parecer DORE Registrado" value={aju.parecerDore} />
              )}
              <AcoesValidacao
                podeAgir={aju.status === 'analise_dore'}
                podeValidar={podeValidar}
                parecer={pareceres[aju.id] || ''}
                onParecerChange={(texto) => setParecer(aju.id, texto)}
                salvando={salvandoId === aju.id}
                recusando={recusandoId === aju.id}
                onIniciarRecusa={() => setRecusandoId(aju.id)}
                onCancelarRecusa={() => setRecusandoId(null)}
                onAprovar={() => aprovarAjuste(aju)}
                onRecusar={(motivo) => recusarAjuste(aju, motivo)}
              />
            </CardWrapper>
          ))}
        </div>
      )}

      {/* SALDO COMPLEMENTAR */}
      {activeTab === 'saldo' && (
        <div className="space-y-4">
          {saldos.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-8">Nenhuma solicitação de saldo complementar registrada para esta obra.</p>
          )}
          {saldos.map(sal => (
            <CardWrapper key={sal.id} id={sal.id} destaque={destaqueId === sal.id}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
                  Saldo Complementar
                </h3>
                <StatusBadge tone={sal.status === 'aprovado' ? 'aprovado' : sal.status === 'reprovado' ? 'recusado' : 'pendente'}>
                  {sal.status}
                </StatusBadge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <CampoLeitura label="Valor TC" value={fmtBRL(sal.valorTC)} />
                <CampoLeitura label="Valor Liberado" value={fmtBRL(sal.valorLiberado)} />
                <CampoLeitura label="Valor Pago" value={fmtBRL(sal.valorPago)} />
                <CampoLeitura label="Saldo em Conta" value={fmtBRL(sal.saldoEmConta)} />
                <CampoLeitura label="Necessidade de Aditivo" value={fmtBRL(sal.necessidadeAditivo)} />
                <CampoLeitura label="Data de Criação" value={sal.dataCriacao} />
              </div>
              {(sal.documentos || []).length > 0 && (
                <div className="space-y-2">
                  <span className="text-[9.5px] text-slate-500 uppercase font-extrabold block">Checklist de Documentos</span>
                  {(sal.documentos || []).map((d, idx) => (
                    <DocumentoChecklistCard
                      key={idx}
                      numero={idx + 1}
                      nome={d.item}
                      obrigatorio={d.obrigatorio}
                      anexado={d.checked}
                      fileName={d.fileName}
                      status={getDocStatus(sal.id, idx)}
                      podeValidar={podeValidar && (sal.status === 'aguardando_analista' || sal.status === 'em_analise')}
                      onDownload={d.fileName ? () => baixarDocumentoSimulado(d.fileName!, d.item) : undefined}
                      onValidar={() => setDocStatus(sal.id, idx, 'aprovado')}
                      onRecusar={() => setDocStatus(sal.id, idx, 'recusado')}
                    />
                  ))}
                </div>
              )}
              <AcoesValidacao
                podeAgir={sal.status === 'aguardando_analista' || sal.status === 'em_analise'}
                podeValidar={podeValidar}
                parecer={pareceres[sal.id] || ''}
                onParecerChange={(texto) => setParecer(sal.id, texto)}
                salvando={salvandoId === sal.id}
                recusando={recusandoId === sal.id}
                onIniciarRecusa={() => setRecusandoId(sal.id)}
                onCancelarRecusa={() => setRecusandoId(null)}
                onAprovar={() => aprovarSaldo(sal)}
                onRecusar={(motivo) => recusarSaldo(sal, motivo)}
              />
            </CardWrapper>
          ))}
        </div>
      )}
    </div>
  );
}
