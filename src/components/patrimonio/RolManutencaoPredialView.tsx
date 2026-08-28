import React, { useMemo, useState } from 'react';
import { ROL_MANUTENCAO_ITENS_PADRAO, RolManutencaoItem } from '../../types';
import { useRolManutencao } from '../../hooks/useRolManutencao';
import { useEscolas } from '../../hooks/useEscolas';
import { ClipboardCheck, RefreshCw, Paperclip, X, CheckCircle2, Search, Eye } from 'lucide-react';

interface UsuarioLogado {
  id: string;
  nome: string;
  escolasVinculadas?: { escolaId: string; codesc: string; nome: string }[];
}

interface RolManutencaoPredialViewProps {
  usuario: UsuarioLogado;
  /** true para coordenador_regional/admin/Diretor DORE — só visualizam, não editam nem anexam. */
  somenteLeitura?: boolean;
  /** Restringe a busca de escola por SRE (coordenador_regional). Vazio/omitido = todas as escolas (admin/Diretor DORE). */
  regionaisRestritas?: string[];
}

const ANO_ATUAL = new Date().getFullYear();
const ANOS_DISPONIVEIS = [ANO_ATUAL, ANO_ATUAL - 1, ANO_ATUAL - 2, ANO_ATUAL - 3];

const inputCls = 'w-full min-w-0 px-1.5 py-1 text-[11px] bg-white border border-slate-200 rounded focus:border-blue-400 focus:outline-hidden transition-colors';

function CelulaTexto({ valor, onSalvar, placeholder }: { valor?: string; onSalvar: (v: string) => void; placeholder?: string }) {
  const [draft, setDraft] = useState(valor ?? '');
  React.useEffect(() => { setDraft(valor ?? ''); }, [valor]);
  return (
    <input
      type="text"
      value={draft}
      placeholder={placeholder}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { if (draft !== (valor ?? '')) onSalvar(draft); }}
      className={inputCls}
    />
  );
}

function CelulaData({ valor, onSalvar }: { valor?: string; onSalvar: (v: string | null) => void }) {
  return (
    <input type="date" value={valor ?? ''} onChange={e => onSalvar(e.target.value || null)} className={`${inputCls} font-mono`} />
  );
}

const textoStatus = (status?: RolManutencaoItem['status']) =>
  status === 'executado' ? 'Executado' : status === 'nao_executado' ? 'Não executado' : '—';

function LinhaItem({ item, meta, primeiraDaSecao, rowSpanSecao, somenteLeitura, atualizarItem, anexarComprovante }: {
  item: RolManutencaoItem;
  meta: typeof ROL_MANUTENCAO_ITENS_PADRAO[number];
  primeiraDaSecao: boolean;
  rowSpanSecao: number;
  somenteLeitura: boolean;
  atualizarItem: ReturnType<typeof useRolManutencao>['atualizarItem'];
  anexarComprovante: ReturnType<typeof useRolManutencao>['anexarComprovante'];
}) {
  const [enviando, setEnviando] = useState(false);
  const salvar = (campos: Parameters<typeof atualizarItem>[1]) => atualizarItem(item.id, campos).catch(() => {});

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnviando(true);
    try {
      const fileSize = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${(file.size / 1024).toFixed(0)} KB`;
      await anexarComprovante(item.id, { fileName: file.name, fileType: file.type, fileSize });
    } finally {
      setEnviando(false);
    }
  };

  const removerAnexo = () => anexarComprovante(item.id, null).catch(() => {});

  return (
    <tr className="border-b border-slate-100 align-top hover:bg-slate-50/40">
      {primeiraDaSecao && (
        <td rowSpan={rowSpanSecao} className="px-2 py-2 text-[11px] font-extrabold text-slate-600 uppercase align-top border-r border-slate-100 bg-slate-50/60 whitespace-nowrap">
          {meta.sistema}
        </td>
      )}
      <td className="px-2 py-2 text-[11px] text-slate-700 font-semibold max-w-[9rem]">{meta.elemento}</td>
      <td className="px-2 py-2 text-[11px] text-slate-500 max-w-[11rem]">{meta.atividade}</td>

      {somenteLeitura ? (
        <>
          <td className="px-2 py-2 text-[11px] text-slate-700 font-semibold whitespace-nowrap">{textoStatus(item.status)}</td>
          <td className="px-2 py-2 text-[11px] text-slate-600 whitespace-nowrap">{item.dataExecucao ? new Date(`${item.dataExecucao}T12:00:00`).toLocaleDateString('pt-BR') : '—'}</td>
          <td className="px-2 py-2 text-[11px] text-slate-600 max-w-[9rem] truncate">{item.empresaProfissional || '—'}</td>
          <td className="px-2 py-2 text-[11px] text-slate-600 whitespace-nowrap">{item.cnpjCpf || '—'}</td>
          <td className="px-2 py-2 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-semibold">{item.comprovacaoDespesa ? 'Sim' : 'Não'}</span>
              {item.documento?.fileName && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span className="truncate max-w-[7rem]">{item.documento.fileName}</span>
                </span>
              )}
            </div>
          </td>
        </>
      ) : (
        <>
          <td className="px-2 py-2">
            <div className="flex flex-col gap-0.5">
              {(['executado', 'nao_executado'] as const).map(v => (
                <label key={v} className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer whitespace-nowrap">
                  <input type="radio" checked={item.status === v} onChange={() => salvar({ status: item.status === v ? null : v })} className="accent-blue-600" />
                  {v === 'executado' ? 'Executado' : 'Não executado'}
                </label>
              ))}
            </div>
          </td>
          <td className="px-1 py-2 min-w-[7.5rem]"><CelulaData valor={item.dataExecucao} onSalvar={v => salvar({ dataExecucao: v })} /></td>
          <td className="px-1 py-2 min-w-[9rem]"><CelulaTexto valor={item.empresaProfissional} onSalvar={v => salvar({ empresaProfissional: v })} placeholder="Razão social..." /></td>
          <td className="px-1 py-2 min-w-[7rem]"><CelulaTexto valor={item.cnpjCpf} onSalvar={v => salvar({ cnpjCpf: v })} placeholder="CNPJ/MEI/CPF" /></td>
          <td className="px-2 py-2 min-w-[10rem]">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                {(['Sim', 'Não'] as const).map(v => (
                  <label key={v} className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                    <input
                      type="radio"
                      checked={(item.comprovacaoDespesa ?? false) === (v === 'Sim')}
                      onChange={() => salvar({ comprovacaoDespesa: v === 'Sim' })}
                      className="accent-blue-600"
                    />
                    {v}
                  </label>
                ))}
              </div>
              {item.documento?.fileName ? (
                <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span className="truncate max-w-[7rem]">{item.documento.fileName}</span>
                  <button type="button" onClick={removerAnexo} className="text-emerald-400 hover:text-rose-600 cursor-pointer shrink-0"><X className="w-3 h-3" /></button>
                </span>
              ) : (
                <label className="flex items-center gap-1 text-[10px] text-blue-600 font-semibold cursor-pointer">
                  <Paperclip className="w-3 h-3" />
                  {enviando ? 'Enviando...' : 'Anexar comprovante'}
                  <input type="file" className="hidden" disabled={enviando} onChange={handleUpload} />
                </label>
              )}
            </div>
          </td>
        </>
      )}
    </tr>
  );
}

// Seletor de escola por busca (nome/CODESC) — usado por coordenador_regional/admin/Diretor DORE,
// que não têm uma escola própria vinculada como o diretor_escola. Ver [[modulo-chamados]].
function SeletorEscolaBusca({ regionaisRestritas, onSelecionar }: { regionaisRestritas?: string[]; onSelecionar: (e: { escolaId: string; codesc: string; nome: string }) => void }) {
  const { escolas } = useEscolas();
  const [busca, setBusca] = useState('');

  const escolasFiltradas = useMemo(() => {
    const base = regionaisRestritas && regionaisRestritas.length > 0
      ? escolas.filter(e => regionaisRestritas.some(r => r.toLowerCase() === e.sre.toLowerCase()))
      : escolas;
    if (busca.trim().length < 3) return [];
    const termo = busca.toLowerCase();
    return base.filter(e => e.nome.toLowerCase().includes(termo) || e.codesc.includes(busca.trim())).slice(0, 20);
  }, [escolas, regionaisRestritas, busca]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-5 max-w-lg">
      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
        Buscar escola por nome ou CODESC
      </label>
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Digite ao menos 3 caracteres..."
          className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
        />
      </div>
      {escolasFiltradas.length > 0 && (
        <div className="mt-2 max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
          {escolasFiltradas.map(e => (
            <button
              key={e.codesc}
              type="button"
              onClick={() => onSelecionar({ escolaId: e.id, codesc: e.codesc, nome: e.nome })}
              className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <span className="font-bold">{e.nome}</span>
              <span className="text-slate-400 ml-1.5">CODESC {e.codesc} — {e.municipio}/{e.sre}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RolManutencaoPredialView({ usuario, somenteLeitura = false, regionaisRestritas }: RolManutencaoPredialViewProps) {
  const escolasDoDireto = usuario.escolasVinculadas ?? [];
  const modoBusca = escolasDoDireto.length === 0;

  const [escolaSelecionada, setEscolaSelecionada] = useState(escolasDoDireto[0] ?? null);
  const [ano, setAno] = useState(ANO_ATUAL);

  const { rol, carregando, erro, recarregar, atualizarItem, anexarComprovante } = useRolManutencao(
    escolaSelecionada?.escolaId, ano, somenteLeitura ? null : usuario.id, somenteLeitura
  );

  const itensPorCodigo = useMemo(() => new Map((rol?.itens ?? []).map(i => [i.itemCodigo, i])), [rol]);
  const totalExecutados = (rol?.itens ?? []).filter(i => i.status === 'executado').length;

  // rowSpan por bloco de Sistema consecutivo, igual à planilha original
  const rowSpanPorIndice = useMemo(() => {
    const spans: number[] = [];
    for (let i = 0; i < ROL_MANUTENCAO_ITENS_PADRAO.length; i++) {
      if (i > 0 && ROL_MANUTENCAO_ITENS_PADRAO[i].sistema === ROL_MANUTENCAO_ITENS_PADRAO[i - 1].sistema) {
        spans.push(0);
      } else {
        let span = 1;
        for (let j = i + 1; j < ROL_MANUTENCAO_ITENS_PADRAO.length && ROL_MANUTENCAO_ITENS_PADRAO[j].sistema === ROL_MANUTENCAO_ITENS_PADRAO[i].sistema; j++) span++;
        spans.push(span);
      }
    }
    return spans;
  }, []);

  if (!modoBusca && escolasDoDireto.length === 0) {
    return (
      <div className="w-full flex-1 flex items-center justify-center py-12 text-sm text-slate-400 p-6">
        Nenhuma escola vinculada ao seu usuário — contate o administrador.
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col space-y-5 text-left p-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-teal-50 border border-teal-100 rounded-xl text-teal-700">
              {somenteLeitura ? <Eye className="w-5 h-5" /> : <ClipboardCheck className="w-5 h-5" />}
            </span>
            <div>
              <h2 className="text-base font-black text-slate-800 uppercase tracking-wider font-sans leading-none">Rol de Manutenção Predial Anual Obrigatória</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {somenteLeitura
                  ? 'Consulta das manutenções executadas no prédio, com comprovação de despesa.'
                  : 'Registro das manutenções executadas no prédio, com comprovação de despesa.'}
              </p>
            </div>
          </div>
          {escolaSelecionada && (
            <div className="flex items-center gap-2">
              {escolasDoDireto.length > 1 && (
                <select
                  value={escolaSelecionada.escolaId}
                  onChange={e => setEscolaSelecionada(escolasDoDireto.find(ev => ev.escolaId === e.target.value) ?? null)}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white cursor-pointer"
                >
                  {escolasDoDireto.map(ev => <option key={ev.escolaId} value={ev.escolaId}>{ev.nome}</option>)}
                </select>
              )}
              {modoBusca && (
                <button onClick={() => setEscolaSelecionada(null)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                  Trocar escola
                </button>
              )}
              <select value={ano} onChange={e => setAno(parseInt(e.target.value, 10))} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white cursor-pointer">
                {ANOS_DISPONIVEIS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <button onClick={recarregar} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>
          )}
        </div>
        {escolaSelecionada && (
          <p className="text-[11px] text-slate-400 mt-2">{escolaSelecionada.nome} — CODESC {escolaSelecionada.codesc}</p>
        )}
        {rol && (
          <div className="mt-3 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-[11px] font-bold">
              {totalExecutados} de {ROL_MANUTENCAO_ITENS_PADRAO.length} itens executados em {ano}
            </span>
          </div>
        )}
      </div>

      {erro && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">{erro}</div>}

      {!escolaSelecionada ? (
        <SeletorEscolaBusca regionaisRestritas={regionaisRestritas} onSelecionar={setEscolaSelecionada} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs overflow-hidden">
          {carregando ? (
            <div className="p-10 text-center text-sm text-slate-400">Carregando rol de manutenção...</div>
          ) : !rol ? (
            <div className="p-10 text-center text-sm text-slate-400">
              {somenteLeitura ? `Nenhum Rol de Manutenção registrado para ${ano} nesta escola.` : 'Carregando rol de manutenção...'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="px-2 py-2 text-left whitespace-nowrap">Sistema</th>
                    <th className="px-2 py-2 text-left whitespace-nowrap">Elemento / Componente</th>
                    <th className="px-2 py-2 text-left whitespace-nowrap">Atividade Técnica</th>
                    <th className="px-2 py-2 text-left whitespace-nowrap">Status</th>
                    <th className="px-2 py-2 text-left whitespace-nowrap">Data Execução</th>
                    <th className="px-2 py-2 text-left whitespace-nowrap">Empresa ou Profissional Especializado</th>
                    <th className="px-2 py-2 text-left whitespace-nowrap">CNPJ</th>
                    <th className="px-2 py-2 text-left whitespace-nowrap">Comprovação despesa</th>
                  </tr>
                </thead>
                <tbody>
                  {ROL_MANUTENCAO_ITENS_PADRAO.map((meta, i) => {
                    const item = itensPorCodigo.get(meta.codigo);
                    if (!item) return null;
                    return (
                      <LinhaItem
                        key={meta.codigo}
                        item={item}
                        meta={meta}
                        primeiraDaSecao={rowSpanPorIndice[i] > 0}
                        rowSpanSecao={rowSpanPorIndice[i]}
                        somenteLeitura={somenteLeitura}
                        atualizarItem={atualizarItem}
                        anexarComprovante={anexarComprovante}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
