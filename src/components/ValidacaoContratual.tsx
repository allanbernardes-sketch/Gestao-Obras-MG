import React, { useEffect, useState } from 'react';
import {
  FileCheck, CheckCircle, XCircle, ChevronRight, Lock, FileText, Download,
} from 'lucide-react';
import { Solicitacao, Aditivo, AjustePlanilha, ReequilibrioItem, SaldoComplementarItem, PerfilUsuario, UsuarioSistema, ChecklistSla } from '../types';
import { supabase } from '../lib/supabase';
import { calcularSlaCorrente, STATUS_SLA_INFO, formatarDuracaoHoras } from '../utils/sla';
import { podeHomologarComAuxiliares, auxiliaresPendentes } from '../utils/auxiliares';
import PainelParecerAuxiliar from './PainelParecerAuxiliar';

type TipoItemContratual = 'aditivo' | 'ajuste' | 'reequilibrio' | 'saldo';

// Ajuste/Reequilíbrio/Saldo passam por 'aguardando_liberacao_financeira' depois da homologação
// técnica da DORE — o item já está aprovado do ponto de vista técnico, só falta o Subsecretário de
// Administração (gestor_paf) liberar o recurso. Ver [[gate-liberacao-financeira]].
function toneFinanceiro(status: string): 'pendente' | 'aprovado' | 'recusado' {
  if (status === 'reprovado' || status === 'recusado') return 'recusado';
  if (status === 'aprovado' || status === 'aguardando_liberacao_financeira') return 'aprovado';
  return 'pendente';
}

// Badge de SLA do checkpoint corrente do item (atribuição / início / conclusão). Ver [[sla-atendimentos]].
function SlaBadge({ item }: { item: ChecklistSla }) {
  const resultado = calcularSlaCorrente(item);
  const info = STATUS_SLA_INFO[resultado.status];
  const checkpointLabel = resultado.checkpoint === 'atribuicao' ? 'p/ atribuir' : resultado.checkpoint === 'inicio' ? 'p/ iniciar' : 'p/ concluir';
  return (
    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${info.corBadge}`} title={`SLA ${checkpointLabel}: ${formatarDuracaoHoras(resultado.horasRestantes)} ${resultado.horasRestantes >= 0 ? 'restantes' : 'de atraso'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${info.corPonto}`} />
      SLA {info.label}
    </span>
  );
}

// Botão que registra o início formal da análise (checkpoint 2→3 do SLA) — não bloqueia o parecer,
// é só o registro de tempo pedido para começar a contabilizar a análise em si.
function BotaoIniciarAnalise({ item, onIniciar, salvando }: { item: ChecklistSla; onIniciar: () => void; salvando: boolean }) {
  if (item.dataInicioAnalise) {
    return (
      <span className="text-[10px] text-slate-400 font-semibold inline-flex items-center gap-1">
        <CheckCircle className="w-3 h-3 text-emerald-500" /> Análise iniciada em {new Date(item.dataInicioAnalise).toLocaleString('pt-BR')}
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={salvando}
      onClick={onIniciar}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10.5px] font-black uppercase tracking-wide text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      ▶ Iniciar Análise
    </button>
  );
}

interface ValidacaoContratualProps {
  solicitacao: Solicitacao | null;
  itemSelecionado: { tipo: TipoItemContratual; itemId: string } | null;
  perfilUsuario?: PerfilUsuario;
  usuariosSeguranca?: UsuarioSistema[];
  onUpdate: (sol: Solicitacao) => void;
}

const PERFIS_QUE_VALIDAM: PerfilUsuario[] = ['analista_dore', 'admin', 'diretor_dore'];

const TABS: { id: TipoItemContratual; label: string }[] = [
  { id: 'aditivo', label: 'Aditivos' },
  { id: 'ajuste', label: 'Ajustes de Planilha' },
  { id: 'reequilibrio', label: 'Reequilíbrios' },
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
  // Nome do usuário logado — usado pra saber se ele é um dos auxiliares de validação pendentes
  // num item. Ver [[equipes-analista-auxiliares]].
  const meuNome = usuariosSeguranca.find(u => u.perfil === perfilUsuario)?.nome || '';
  const [salvandoAuxiliarId, setSalvandoAuxiliarId] = useState<string | null>(null);

  const handleSalvarParecerAuxiliar = async (tipo: TipoItemContratual, itemId: string, auxiliarId: string, aprovado: boolean, parecer: string) => {
    setSalvandoAuxiliarId(auxiliarId);
    const dataParecer = new Date().toISOString();
    const { error } = await supabase
      .from('processo_auxiliares')
      .update({ aprovado, parecer, data_parecer: dataParecer })
      .eq('id', auxiliarId);
    setSalvandoAuxiliarId(null);
    if (error) { console.error(error); alert('Erro ao gravar o parecer do auxiliar no banco de dados.'); return; }

    const atualizarLista = (lista: any[] | undefined) =>
      (lista || []).map(a => a.id === auxiliarId ? { ...a, aprovado, parecer, dataParecer } : a);

    onUpdate({
      ...solicitacao,
      ajustes: tipo === 'ajuste' ? (solicitacao.ajustes || []).map(a => a.id === itemId ? { ...a, auxiliares: atualizarLista(a.auxiliares) } : a) : solicitacao.ajustes,
      reequilibrios: tipo === 'reequilibrio' ? (solicitacao.reequilibrios || []).map(r => r.id === itemId ? { ...r, auxiliares: atualizarLista(r.auxiliares) } : r) : solicitacao.reequilibrios,
      saldosComplementares: tipo === 'saldo' ? (solicitacao.saldosComplementares || []).map(s => s.id === itemId ? { ...s, auxiliares: atualizarLista(s.auxiliares) } : s) : solicitacao.saldosComplementares,
    });
  };

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

  // Registra o início formal da análise (checkpoint 2→3 do SLA) — ver [[sla-atendimentos]]. Não
  // bloqueia o parecer, é só o marco de tempo pedido para começar a contabilizar a análise em si.
  const [salvandoInicioId, setSalvandoInicioId] = useState<string | null>(null);
  const handleIniciarAnalise = async (tabela: 'ajustes_planilha' | 'reequilibrios_financeiros' | 'saldos_complementares', tipo: TipoItemContratual, itemId: string) => {
    setSalvandoInicioId(itemId);
    const agora = new Date().toISOString();
    const { error } = await supabase.from(tabela).update({ data_inicio_analise: agora }).eq('id', itemId);
    setSalvandoInicioId(null);
    if (error) { console.error(error); alert('Erro ao registrar o início da análise no banco de dados.'); return; }

    onUpdate({
      ...solicitacao,
      ajustes: tipo === 'ajuste'
        ? (solicitacao.ajustes || []).map(a => a.id === itemId ? { ...a, dataInicioAnalise: agora } : a)
        : solicitacao.ajustes,
      reequilibrios: tipo === 'reequilibrio'
        ? (solicitacao.reequilibrios || []).map(r => r.id === itemId ? { ...r, dataInicioAnalise: agora } : r)
        : solicitacao.reequilibrios,
      saldosComplementares: tipo === 'saldo'
        ? (solicitacao.saldosComplementares || []).map(s => s.id === itemId ? { ...s, dataInicioAnalise: agora } : s)
        : solicitacao.saldosComplementares,
    });
  };

  // --- AJUSTES DE PLANILHA ---
  const aprovarAjuste = async (item: AjustePlanilha) => {
    const parecer = (pareceres[item.id] || '').trim();
    if (!parecer) { alert('Insira o parecer técnico antes de homologar.'); return; }
    if (!podeHomologarComAuxiliares(item.auxiliares)) {
      alert(`Ainda há auxiliar(es) de validação pendente(s) de parecer: ${auxiliaresPendentes(item.auxiliares).map(a => a.nome).join(', ')}.`);
      return;
    }
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

  // --- REEQUILÍBRIO FINANCEIRO ---
  const aprovarReequilibrio = async (item: ReequilibrioItem) => {
    const parecer = (pareceres[item.id] || '').trim();
    if (!parecer) { alert('Insira o parecer técnico antes de homologar.'); return; }
    if (!podeHomologarComAuxiliares(item.auxiliares)) {
      alert(`Ainda há auxiliar(es) de validação pendente(s) de parecer: ${auxiliaresPendentes(item.auxiliares).map(a => a.nome).join(', ')}.`);
      return;
    }
    setSalvandoId(item.id);
    // Homologação técnica da DORE — ainda não é a liberação final do recurso, que fica a cargo
    // do Subsecretário de Administração, agora reunida na fila da tela de Autorização do PAF. Ver [[fusao-liberacao-financeira-autorizacao]].
    const { error } = await supabase
      .from('reequilibrios_financeiros')
      .update({ status: 'aguardando_liberacao_financeira', parecer_dore: parecer })
      .eq('id', item.id);
    setSalvandoId(null);
    if (error) { console.error(error); alert('Erro ao homologar o reequilíbrio no banco de dados.'); return; }

    onUpdate({
      ...solicitacao,
      reequilibrios: (solicitacao.reequilibrios || []).map(r =>
        r.id === item.id ? { ...r, status: 'aguardando_liberacao_financeira', parecerDore: parecer } : r
      ),
    });
    setParecer(item.id, '');
  };

  const recusarReequilibrio = async (item: ReequilibrioItem, motivo: string) => {
    setSalvandoId(item.id);
    const { error } = await supabase
      .from('reequilibrios_financeiros')
      .update({ status: 'recusado', parecer_dore: motivo })
      .eq('id', item.id);
    setSalvandoId(null);
    if (error) { console.error(error); alert('Erro ao recusar o reequilíbrio no banco de dados.'); return; }

    onUpdate({
      ...solicitacao,
      reequilibrios: (solicitacao.reequilibrios || []).map(r =>
        r.id === item.id ? { ...r, status: 'reprovado', parecerDore: motivo } : r
      ),
    });
    setRecusandoId(null);
  };

  // --- SALDO COMPLEMENTAR ---
  const aprovarSaldo = async (item: SaldoComplementarItem) => {
    const parecer = (pareceres[item.id] || '').trim();
    if (!parecer) { alert('Insira o parecer técnico antes de homologar.'); return; }
    if (!podeHomologarComAuxiliares(item.auxiliares)) {
      alert(`Ainda há auxiliar(es) de validação pendente(s) de parecer: ${auxiliaresPendentes(item.auxiliares).map(a => a.nome).join(', ')}.`);
      return;
    }
    setSalvandoId(item.id);
    // Homologação técnica da DORE — ainda não é a liberação final do recurso, que fica a cargo
    // do Subsecretário de Administração, agora reunida na fila da tela de Autorização do PAF. Ver [[fusao-liberacao-financeira-autorizacao]].
    const { error } = await supabase
      .from('saldos_complementares')
      .update({ status: 'aguardando_liberacao_financeira', descricao: parecer })
      .eq('id', item.id);
    setSalvandoId(null);
    if (error) { console.error(error); alert('Erro ao homologar o saldo complementar no banco de dados.'); return; }

    onUpdate({
      ...solicitacao,
      saldosComplementares: (solicitacao.saldosComplementares || []).map(s =>
        s.id === item.id ? { ...s, status: 'aguardando_liberacao_financeira' } : s
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
  const reequilibrios = solicitacao.reequilibrios || [];
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
                <div className="flex items-center gap-1.5">
                  <SlaBadge item={aju} />
                  <StatusBadge tone={aju.status === 'validado' ? 'aprovado' : (aju.status === 'analise_dore' || aju.status === 'aguardando_coordenador') ? 'pendente' : 'recusado'}>
                    {aju.status}
                  </StatusBadge>
                </div>
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
              {podeValidar && aju.status === 'analise_dore' && (
                <BotaoIniciarAnalise item={aju} salvando={salvandoInicioId === aju.id} onIniciar={() => handleIniciarAnalise('ajustes_planilha', 'ajuste', aju.id)} />
              )}
              <PainelParecerAuxiliar
                auxiliares={aju.auxiliares || []}
                nomeUsuarioLogado={meuNome}
                salvandoId={salvandoAuxiliarId}
                onSalvarParecer={(auxId, aprovado, parecer) => handleSalvarParecerAuxiliar('ajuste', aju.id, auxId, aprovado, parecer)}
              />
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

      {/* REEQUILÍBRIO FINANCEIRO */}
      {activeTab === 'reequilibrio' && (
        <div className="space-y-4">
          {reequilibrios.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-8">Nenhuma solicitação de reequilíbrio financeiro registrada para esta obra.</p>
          )}
          {reequilibrios.map(req => (
            <CardWrapper key={req.id} id={req.id} destaque={destaqueId === req.id}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
                  Reequilíbrio Financeiro
                </h3>
                <div className="flex items-center gap-1.5">
                  <SlaBadge item={req} />
                  <StatusBadge tone={toneFinanceiro(req.status)}>
                    {req.status}
                  </StatusBadge>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <CampoLeitura label="Valor Original" value={fmtBRL(req.valorOriginal)} />
                <CampoLeitura label="Valor Reequilibrado" value={fmtBRL(req.valorReequilibrado)} />
                <CampoLeitura label="Desconto Contratual" value={req.descontoContratual != null ? `${req.descontoContratual}%` : '—'} />
                <CampoLeitura label="Data de Referência SEE" value={req.dataReferenceSEE} />
                <CampoLeitura label="Data de Criação" value={req.dataCriacao} />
              </div>
              <div className="space-y-2">
                <span className="text-[9.5px] text-slate-500 uppercase font-extrabold block">Documentos Anexados</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { label: 'Justificativa', fileName: req.justificativaFileName },
                    { label: 'Autorização DIPC', fileName: req.autorizacaoDIPCFileName },
                    { label: 'Planilha de Reequilíbrio', fileName: req.planilhaFileName },
                  ].map((doc, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl border border-slate-200 bg-white text-[11px] flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-slate-500 text-[9.5px] uppercase font-extrabold">{doc.label}</p>
                        {doc.fileName ? (
                          <button
                            type="button"
                            onClick={() => baixarDocumentoSimulado(doc.fileName!, doc.label)}
                            className="text-blue-600 hover:text-blue-800 font-mono truncate block cursor-pointer text-left"
                          >
                            {doc.fileName}
                          </button>
                        ) : (
                          <span className="italic text-slate-400">Não anexado</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {req.parecerDore && (
                <CampoLeitura label="Parecer DORE Registrado" value={req.parecerDore} />
              )}
              {(req.liberadoPor || req.justificativaReprovacaoFinanceira) && (
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl space-y-1 text-left">
                  <span className="font-black text-slate-700 text-[10px] uppercase tracking-wider flex items-center gap-1">
                    Liberação Financeira: {req.liberadoPor || '—'}
                    {req.dataLiberacaoFinanceira && ` (${req.dataLiberacaoFinanceira})`}
                  </span>
                  {req.justificativaReprovacaoFinanceira && (
                    <p className="text-slate-700 italic font-mono text-[11px] whitespace-pre-wrap font-bold">
                      {req.justificativaReprovacaoFinanceira}
                    </p>
                  )}
                </div>
              )}
              {podeValidar && (req.status === 'aguardando_analista' || req.status === 'em_analise') && (
                <BotaoIniciarAnalise item={req} salvando={salvandoInicioId === req.id} onIniciar={() => handleIniciarAnalise('reequilibrios_financeiros', 'reequilibrio', req.id)} />
              )}
              <PainelParecerAuxiliar
                auxiliares={req.auxiliares || []}
                nomeUsuarioLogado={meuNome}
                salvandoId={salvandoAuxiliarId}
                onSalvarParecer={(auxId, aprovado, parecer) => handleSalvarParecerAuxiliar('reequilibrio', req.id, auxId, aprovado, parecer)}
              />
              <AcoesValidacao
                podeAgir={req.status === 'aguardando_analista' || req.status === 'em_analise'}
                podeValidar={podeValidar}
                parecer={pareceres[req.id] || ''}
                onParecerChange={(texto) => setParecer(req.id, texto)}
                salvando={salvandoId === req.id}
                recusando={recusandoId === req.id}
                onIniciarRecusa={() => setRecusandoId(req.id)}
                onCancelarRecusa={() => setRecusandoId(null)}
                onAprovar={() => aprovarReequilibrio(req)}
                onRecusar={(motivo) => recusarReequilibrio(req, motivo)}
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
                <div className="flex items-center gap-1.5">
                  <SlaBadge item={sal} />
                  <StatusBadge tone={toneFinanceiro(sal.status)}>
                    {sal.status}
                  </StatusBadge>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <CampoLeitura label="Valor TC" value={fmtBRL(sal.valorTC)} />
                <CampoLeitura label="Valor Liberado" value={fmtBRL(sal.valorLiberado)} />
                <CampoLeitura label="Valor Pago" value={fmtBRL(sal.valorPago)} />
                <CampoLeitura label="Saldo em Conta" value={fmtBRL(sal.saldoEmConta)} />
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
              {(sal.liberadoPor || sal.justificativaReprovacaoFinanceira) && (
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl space-y-1 text-left">
                  <span className="font-black text-slate-700 text-[10px] uppercase tracking-wider flex items-center gap-1">
                    Liberação Financeira: {sal.liberadoPor || '—'}
                    {sal.dataLiberacaoFinanceira && ` (${sal.dataLiberacaoFinanceira})`}
                  </span>
                  {sal.justificativaReprovacaoFinanceira && (
                    <p className="text-slate-700 italic font-mono text-[11px] whitespace-pre-wrap font-bold">
                      {sal.justificativaReprovacaoFinanceira}
                    </p>
                  )}
                </div>
              )}
              {podeValidar && (sal.status === 'aguardando_analista' || sal.status === 'em_analise') && (
                <BotaoIniciarAnalise item={sal} salvando={salvandoInicioId === sal.id} onIniciar={() => handleIniciarAnalise('saldos_complementares', 'saldo', sal.id)} />
              )}
              <PainelParecerAuxiliar
                auxiliares={sal.auxiliares || []}
                nomeUsuarioLogado={meuNome}
                salvandoId={salvandoAuxiliarId}
                onSalvarParecer={(auxId, aprovado, parecer) => handleSalvarParecerAuxiliar('saldo', sal.id, auxId, aprovado, parecer)}
              />
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
