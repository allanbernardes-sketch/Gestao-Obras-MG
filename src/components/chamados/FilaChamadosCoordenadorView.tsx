import React, { useMemo, useState } from 'react';
import {
  Chamado, StatusChamado, STATUS_CHAMADO_INFO, MOTIVO_SOLICITACAO_OPCOES,
  TIPO_OBRA_CHAMADO_OPCOES, STATUS_VISTORIA_OPCOES, FAROL_INFO, FarolChamado, StatusVistoriaChamado,
} from '../../types';
import { useChamados } from '../../hooks/useChamados';
import { normalizarSre } from '../../lib/persistencia';
import ChamadoDetalhesPanel from './ChamadoDetalhesPanel';
import { ClipboardList, RefreshCw, Inbox, ShieldAlert, Eye } from 'lucide-react';

interface FilaChamadosCoordenadorViewProps {
  usuario: { id: string; nome: string; regionais: string[] };
}

const formatarData = (iso?: string) => {
  if (!iso) return '—';
  try { return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR'); } catch { return iso; }
};

const PRIORIDADE_OPCOES: NonNullable<Chamado['prioridade']>[] = ['Crítico', 'Alto', 'Médio', 'Baixo'];

const STATUS_FILTRO_OPCOES: { value: 'todos' | StatusChamado; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'aberto', label: 'Aberto' },
  { value: 'em_analise', label: 'Em Análise' },
  { value: 'em_atendimento', label: 'Em Atendimento' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'recusado', label: 'Recusado' },
];

const motivoLabel = (t: Chamado['motivoTipo']) => MOTIVO_SOLICITACAO_OPCOES.find(o => o.value === t)?.label ?? t;

// ---------------------------------------------------------------------------
// Células editáveis do Painel de Controle — salvam via atualizarCampos (sem tocar em
// status/histórico). Cada uma mantém rascunho local pra não perder digitação por causa do
// re-render otimista do hook. Ver [[modulo-chamados]].
// ---------------------------------------------------------------------------

const celInputCls = 'w-full min-w-0 px-1.5 py-1 text-[11px] bg-transparent border border-transparent rounded hover:border-slate-200 focus:border-blue-400 focus:bg-white focus:outline-hidden transition-colors';

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
      className={celInputCls}
    />
  );
}

function CelulaNumero({ valor, onSalvar }: { valor?: number; onSalvar: (v: number | null) => void }) {
  const [draft, setDraft] = useState(valor != null ? String(valor) : '');
  React.useEffect(() => { setDraft(valor != null ? String(valor) : ''); }, [valor]);
  return (
    <input
      type="number"
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => {
        const novo = draft === '' ? null : parseFloat(draft);
        if (novo !== (valor ?? null)) onSalvar(novo);
      }}
      className={`${celInputCls} text-right`}
    />
  );
}

function CelulaData({ valor, onSalvar }: { valor?: string; onSalvar: (v: string | null) => void }) {
  return (
    <input
      type="date"
      value={valor ?? ''}
      onChange={e => onSalvar(e.target.value || null)}
      className={`${celInputCls} font-mono`}
    />
  );
}

function CelulaSelect<T extends string>({ valor, opcoes, onSalvar, vazio = 'Selecione...' }: {
  valor?: T; opcoes: { value: T; label: string }[]; onSalvar: (v: T | null) => void; vazio?: string;
}) {
  return (
    <select
      value={valor ?? ''}
      onChange={e => onSalvar((e.target.value || null) as T | null)}
      className={`${celInputCls} cursor-pointer`}
    >
      <option value="">{vazio}</option>
      {opcoes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function CelulaFarol({ valor, onSalvar }: { valor?: FarolChamado; onSalvar: (v: FarolChamado | null) => void }) {
  return (
    <div className="flex items-center justify-center gap-1">
      {(Object.keys(FAROL_INFO) as FarolChamado[]).map(f => (
        <button
          key={f}
          type="button"
          title={FAROL_INFO[f].label}
          onClick={() => onSalvar(valor === f ? null : f)}
          className={`w-3.5 h-3.5 rounded-full cursor-pointer transition-all ${FAROL_INFO[f].dotClass} ${valor === f ? 'ring-2 ring-offset-1 ring-slate-400' : 'opacity-30 hover:opacity-70'}`}
        />
      ))}
    </div>
  );
}

// As 4 colunas Planejado/Replanejado/Realizado/Aguardando do papel original — um único status por
// trás (decisão do usuário), renderizado como 4 rádios-célula pra manter a fidelidade da planilha.
function CelulasStatusVistoria({ valor, onSalvar }: { valor?: StatusVistoriaChamado; onSalvar: (v: StatusVistoriaChamado | null) => void }) {
  return (
    <>
      {STATUS_VISTORIA_OPCOES.filter(o => o.value !== 'aguardando').map(o => (
        <td key={o.value} className="px-1 py-1 text-center border-l border-slate-100">
          <input type="radio" checked={valor === o.value} onChange={() => onSalvar(valor === o.value ? null : o.value)} className="accent-blue-600 cursor-pointer" />
        </td>
      ))}
      <td className="px-1 py-1 text-center border-l border-slate-100">
        <input type="radio" checked={valor === 'aguardando'} onChange={() => onSalvar(valor === 'aguardando' ? null : 'aguardando')} className="accent-blue-600 cursor-pointer" />
      </td>
    </>
  );
}

function LinhaChamado({ c, onAbrir, atualizarCampos }: {
  c: Chamado;
  onAbrir: () => void;
  atualizarCampos: ReturnType<typeof useChamados>['atualizarCampos'];
}) {
  const statusInfo = STATUS_CHAMADO_INFO[c.status];
  const salvar = (campos: Parameters<typeof atualizarCampos>[1]) => atualizarCampos(c.id, campos).catch(() => {});

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/50 align-top">
      {/* Identificação demanda — somente leitura */}
      <td className="px-2 py-1.5 text-[11px] text-slate-600 whitespace-nowrap">{formatarData(c.dataSolicitacao)}</td>
      <td className="px-2 py-1.5 text-[11px] text-slate-600 whitespace-nowrap">{motivoLabel(c.motivoTipo)}</td>
      <td className="px-2 py-1.5 text-[11px] text-slate-600 font-mono whitespace-nowrap">{c.codesc}</td>
      <td className="px-2 py-1.5 text-[11px] text-slate-600 whitespace-nowrap">{c.sre}</td>
      <td className="px-2 py-1.5 text-[11px] text-slate-600 whitespace-nowrap">{c.municipio}</td>
      <td className="px-2 py-1.5 text-[11px] text-slate-700 font-semibold max-w-[10rem] truncate" title={c.escolaNome}>{c.escolaNome}</td>
      <td className="px-2 py-1.5 text-[11px] text-slate-600 whitespace-nowrap">{c.predioDescricao || c.codigoEndereco || '—'}</td>

      {/* Resultado da Priorização — Painel Controle */}
      <td className="px-1 py-1 border-l border-slate-100 min-w-[8rem]">
        <CelulaSelect valor={c.tipoObra} opcoes={TIPO_OBRA_CHAMADO_OPCOES.map(t => ({ value: t, label: t }))} onSalvar={v => salvar({ tipoObra: v ?? '' })} />
      </td>
      <td className="px-1 py-1 min-w-[4.5rem]"><CelulaNumero valor={c.pontuacaoAtual} onSalvar={v => salvar({ pontuacaoAtual: v })} /></td>
      <td className="px-1 py-1 min-w-[6rem]">
        <CelulaSelect valor={c.prioridade} opcoes={PRIORIDADE_OPCOES.map(p => ({ value: p, label: p }))} onSalvar={v => salvar({ prioridade: v ?? undefined })} />
      </td>
      <td className="px-2 py-1.5 text-[11px] text-slate-500 max-w-[12rem] truncate" title={c.descricaoProblema}>{c.descricaoProblema}</td>

      {/* Distribuição — Bloco Parecer */}
      <td className="px-1 py-1 border-l border-slate-100 min-w-[7rem]"><CelulaData valor={c.primeiroRetornoAte} onSalvar={v => salvar({ primeiroRetornoAte: v })} /></td>
      <td className="px-1 py-1 min-w-[8rem]"><CelulaTexto valor={c.engenheiroFiscalEscola} onSalvar={v => salvar({ engenheiroFiscalEscola: v })} placeholder="Nome..." /></td>
      <td className="px-1 py-1 min-w-[4.5rem]"><CelulaNumero valor={c.pontuacaoAjustada} onSalvar={v => salvar({ pontuacaoAjustada: v })} /></td>
      <td className="px-2 py-1.5">
        <button type="button" onClick={onAbrir} className={`px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer ${statusInfo.badgeClass}`} title="Ver detalhes e triar">
          {statusInfo.label}
        </button>
      </td>
      <td className="px-1 py-1 min-w-[3.5rem]"><CelulaFarol valor={c.farolVistoria} onSalvar={v => salvar({ farolVistoria: v })} /></td>
      <td className="px-1 py-1 min-w-[3.5rem]"><CelulaFarol valor={c.farolProcesso} onSalvar={v => salvar({ farolProcesso: v })} /></td>
      <td className="px-1 py-1 min-w-[7rem]"><CelulaData valor={c.dataPlanejadaVistoria} onSalvar={v => salvar({ dataPlanejadaVistoria: v })} /></td>
      <td className="px-1 py-1 min-w-[7rem]"><CelulaData valor={c.dataReplanejadaVistoria} onSalvar={v => salvar({ dataReplanejadaVistoria: v })} /></td>
      <td className="px-1 py-1 min-w-[7rem]"><CelulaData valor={c.dataRealVistoria} onSalvar={v => salvar({ dataRealVistoria: v })} /></td>
      <CelulasStatusVistoria valor={c.statusVistoria} onSalvar={v => salvar({ statusVistoria: v })} />
      <td className="px-1 py-1 min-w-[9rem]"><CelulaTexto valor={c.numeroSeiProcessoDore} onSalvar={v => salvar({ numeroSeiProcessoDore: v })} placeholder="SEI nº..." /></td>
      <td className="px-1 py-1 min-w-[7rem]"><CelulaData valor={c.dataEnvioDore} onSalvar={v => salvar({ dataEnvioDore: v })} /></td>

      {/* Observação */}
      <td className="px-1 py-1 border-l border-slate-100 min-w-[10rem]">
        <CelulaTexto valor={c.parecerCoordenador} onSalvar={v => salvar({ parecerCoordenador: v })} placeholder="Observações..." />
      </td>
      <td className="px-1 py-1.5 text-center">
        <button type="button" onClick={onAbrir} title="Ver chamado completo" className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer">
          <Eye className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

function PainelTriagem({ chamado, usuario, onFechar }: { chamado: Chamado; usuario: { id: string; nome: string }; onFechar: () => void }) {
  const { atualizarStatus } = useChamados();
  const [prioridade, setPrioridade] = useState(chamado.prioridade ?? '');
  const [parecer, setParecer] = useState(chamado.parecerCoordenador ?? '');
  const [justificativaRecusa, setJustificativaRecusa] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const transicoesPorStatus: Record<StatusChamado, { status: StatusChamado; label: string; classe: string }[]> = {
    aberto: [{ status: 'em_analise', label: 'Iniciar Análise', classe: 'bg-amber-600 hover:bg-amber-700' }],
    em_analise: [{ status: 'em_atendimento', label: 'Encaminhar p/ Atendimento', classe: 'bg-purple-600 hover:bg-purple-700' }],
    em_atendimento: [{ status: 'concluido', label: 'Concluir Chamado', classe: 'bg-emerald-600 hover:bg-emerald-700' }],
    concluido: [],
    recusado: [],
  };
  const transicoes = transicoesPorStatus[chamado.status];

  const podeRecusar = chamado.status === 'aberto' || chamado.status === 'em_analise';

  const executarTransicao = async (status: StatusChamado, observacao?: string, extra?: Record<string, any>) => {
    setSalvando(true);
    setErro('');
    try {
      await atualizarStatus(chamado.id, status, usuario.nome, observacao, {
        prioridade: (prioridade || undefined) as Chamado['prioridade'],
        coordenadorAtribuidoId: usuario.id,
        parecerCoordenador: parecer || undefined,
        ...extra,
      });
      onFechar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao atualizar o chamado.');
    } finally {
      setSalvando(false);
    }
  };

  const handleRecusar = async () => {
    if (!justificativaRecusa.trim()) {
      setErro('Informe a justificativa da recusa.');
      return;
    }
    await executarTransicao('recusado', justificativaRecusa, { justificativaRecusa });
  };

  if (chamado.status === 'concluido' || chamado.status === 'recusado') return null;

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
        <ShieldAlert className="w-4 h-4 text-blue-500" />
        Triagem do Coordenador
      </h4>

      {erro && <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">{erro}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Prioridade</label>
          <select value={prioridade} onChange={e => setPrioridade(e.target.value as any)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white cursor-pointer">
            <option value="">Não definida</option>
            {PRIORIDADE_OPCOES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Parecer</label>
        <textarea value={parecer} onChange={e => setParecer(e.target.value)} rows={3} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {transicoes.map(t => (
          <button
            key={t.status}
            type="button"
            disabled={salvando}
            onClick={() => executarTransicao(t.status)}
            className={`px-4 py-2 text-xs font-bold text-white rounded-lg disabled:opacity-50 cursor-pointer transition-colors ${t.classe}`}
          >
            {t.label}
          </button>
        ))}
        {!podeRecusar && (
          <button type="button" disabled={salvando} onClick={() => executarTransicao(chamado.status)} className="px-4 py-2 text-xs font-bold text-white rounded-lg bg-slate-500 hover:bg-slate-600 cursor-pointer">
            Salvar Prioridade/Parecer
          </button>
        )}
      </div>

      {podeRecusar && (
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <label className="block text-[10px] font-bold text-rose-600 uppercase tracking-wider">Recusar chamado — justificativa obrigatória</label>
          <textarea value={justificativaRecusa} onChange={e => setJustificativaRecusa(e.target.value)} rows={2} className="w-full px-3 py-2 text-sm border border-rose-200 rounded-lg" />
          <button type="button" disabled={salvando} onClick={handleRecusar} className="px-4 py-2 text-xs font-bold text-white rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 cursor-pointer">
            Recusar Chamado
          </button>
        </div>
      )}
    </div>
  );
}

const gTh = 'px-2 py-1.5 text-[9px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap border-b border-slate-100';

export default function FilaChamadosCoordenadorView({ usuario }: FilaChamadosCoordenadorViewProps) {
  const { chamados, carregando, erro, recarregar, atualizarCampos } = useChamados();
  const [selecionado, setSelecionado] = useState<Chamado | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<'todos' | StatusChamado>('todos');

  const regionaisNormalizadas = useMemo(() => usuario.regionais.map(normalizarSre), [usuario.regionais]);

  // Sem regionais vinculadas (ex: Admin/Diretor DORE olhando o módulo) = enxerga a fila inteira,
  // não fail-closed — só o coordenador_regional (com SRE cadastrada) é restrito de fato.
  const filaDaRegional = useMemo(
    () => regionaisNormalizadas.length === 0
      ? chamados
      : chamados.filter(c => regionaisNormalizadas.includes(normalizarSre(c.sre))),
    [chamados, regionaisNormalizadas]
  );

  const filaFiltrada = filtroStatus === 'todos' ? filaDaRegional : filaDaRegional.filter(c => c.status === filtroStatus);

  return (
    <div className="w-full flex-1 flex flex-col space-y-5 text-left p-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-blue-50 border border-blue-100 rounded-xl text-blue-700">
              <ClipboardList className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-black text-slate-800 uppercase tracking-wider font-sans leading-none">Painel de Controle de Chamados</h2>
              <p className="text-xs text-slate-500 mt-0.5">Priorização, distribuição e acompanhamento de vistoria das escolas da sua regional.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as any)} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white cursor-pointer">
              {STATUS_FILTRO_OPCOES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button onClick={recarregar} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
              <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {erro && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">{erro}</div>}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs overflow-hidden">
        {carregando ? (
          <div className="p-10 text-center text-sm text-slate-400">Carregando painel...</div>
        ) : filaFiltrada.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center gap-2">
            <Inbox className="w-8 h-8 text-slate-300" />
            <span className="text-sm text-slate-400">Nenhum chamado nesta fila.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th colSpan={7} className={`${gTh} text-center bg-slate-100/80`}>Identificação demanda</th>
                  <th colSpan={4} className={`${gTh} text-center bg-blue-50 border-l border-slate-200`}>Resultado da Priorização</th>
                  <th colSpan={15} className={`${gTh} text-center bg-purple-50 border-l border-slate-200`}>Distribuição</th>
                  <th colSpan={2} className={`${gTh} text-center bg-slate-100/80 border-l border-slate-200`}>Observação</th>
                </tr>
                <tr>
                  <th colSpan={7} className={`${gTh} bg-slate-50`}></th>
                  <th colSpan={4} className={`${gTh} text-center bg-blue-50/60 border-l border-slate-200`}>Painel Controle</th>
                  <th colSpan={15} className={`${gTh} text-center bg-purple-50/60 border-l border-slate-200`}>Bloco Parecer</th>
                  <th colSpan={2} className={`${gTh} bg-slate-50 border-l border-slate-200`}></th>
                </tr>
                <tr className="bg-slate-50">
                  <th className={gTh}>Data solicitação</th>
                  <th className={gTh}>Origem</th>
                  <th className={gTh}>CODESC</th>
                  <th className={gTh}>SRE</th>
                  <th className={gTh}>Município</th>
                  <th className={gTh}>Escola</th>
                  <th className={gTh}>Prédio Principal ou Anexo</th>
                  <th className={`${gTh} border-l border-slate-200`}>Tipo de Obra</th>
                  <th className={gTh}>Pontuação Atual</th>
                  <th className={gTh}>Prioridade</th>
                  <th className={gTh}>Justificativa da demanda</th>
                  <th className={`${gTh} border-l border-slate-200`}>Primeiro retorno até</th>
                  <th className={gTh}>Engenheiro Fiscal Escola</th>
                  <th className={gTh}>Pontuação Ajustada</th>
                  <th className={gTh}>Status</th>
                  <th className={gTh}>Farol Vistoria</th>
                  <th className={gTh}>Farol Processo</th>
                  <th className={gTh}>Data planejada Vistoria</th>
                  <th className={gTh}>Data Replanejada Vistoria</th>
                  <th className={gTh}>Data Real Vistoria</th>
                  <th className={gTh}>Planejado</th>
                  <th className={gTh}>Replanejado</th>
                  <th className={gTh}>Realizado</th>
                  <th className={gTh}>Aguardando</th>
                  <th className={gTh}>Nº SEI processo Análise Técnica DORE</th>
                  <th className={gTh}>Data envio DORE</th>
                  <th className={`${gTh} border-l border-slate-200`}>Observações Coordenador</th>
                  <th className={gTh}></th>
                </tr>
              </thead>
              <tbody>
                {filaFiltrada.map(c => (
                  <LinhaChamado key={c.id} c={c} onAbrir={() => setSelecionado(c)} atualizarCampos={atualizarCampos} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selecionado && (
        <ChamadoDetalhesPanel
          chamado={selecionado}
          onClose={() => setSelecionado(null)}
          acoes={<PainelTriagem chamado={selecionado} usuario={usuario} onFechar={() => setSelecionado(null)} />}
        />
      )}
    </div>
  );
}
