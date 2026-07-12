import React, { useState } from 'react';
import { Solicitacao, EtapaProcesso, PerfilUsuario, UsuarioSistema } from '../types';
import {
  Building2, MapPin, User, ChevronRight, AlertCircle, Sparkles, CheckCircle2,
  HelpCircle, Clock, Undo2, ArrowRightLeft, Shield, Check, Trash2, RefreshCw, Plus, Pencil, Filter
} from 'lucide-react';
import { calcularPrioridade, calcularEstrelas, getInfoEtiqueta, compararPorPrioridade, CodigoEtiqueta } from '../utils/prioridade';
import { calcularIEE, CLASSE_IEE_INFO, CAPACIDADE_MAXIMA_ANALISTA, getPontosIEEDisponiveis } from '../utils/iee';

interface KanbanViewsProps {
  solicitacoes: Solicitacao[];
  onSelect: (sol: Solicitacao) => void;
  perfilUsuario: PerfilUsuario;
  somenteLeitura?: boolean;
  onUpdate: (updated: Solicitacao) => void;
  onDelete: (id: string) => void;
  onEdit?: (sol: Solicitacao) => void;
  mode: 'status' | 'usuario';
  viewMode: 'lista' | 'kanban_status' | 'kanban_analista';
  onMudarViewMode: (mode: 'lista' | 'kanban_status' | 'kanban_analista') => void;
  onNovaSolicitacao: () => void;
  activeSubTask?: string;
  usuariosSeguranca?: UsuarioSistema[];
}

export default function KanbanViews({
  solicitacoes,
  onSelect,
  perfilUsuario,
  somenteLeitura = false,
  onUpdate,
  onDelete,
  onEdit,
  mode,
  viewMode,
  onMudarViewMode,
  onNovaSolicitacao,
  activeSubTask,
  usuariosSeguranca = []
}: KanbanViewsProps) {
  const currentUserNome = usuariosSeguranca.find(u => u.perfil === perfilUsuario)?.nome || '';
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filtros avançados e detalhados solicitados pelo usuário
  const [filtroId, setFiltroId] = useState('');
  const [filtroEscola, setFiltroEscola] = useState('');
  const [filtroMunicipio, setFiltroMunicipio] = useState('todos');
  const [filtroEtapa, setFiltroEtapa] = useState<string>('todos');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroCodesc, setFiltroCodesc] = useState('');
  const [filtroSre, setFiltroSre] = useState('todos');
  const [filtroEstrelas, setFiltroEstrelas] = useState('todas');
  const [filtroEtiqueta, setFiltroEtiqueta] = useState<'todas' | CodigoEtiqueta>('todas');

  const isReadOnly = activeSubTask === 'cadastro' || somenteLeitura;

  // Obter a lista de municípios e sres/regionais únicas para popular o select de filtros
  const municipiosUnicos = React.useMemo(() => Array.from(new Set(solicitacoes.map(s => s.municipio).filter(Boolean))).sort(), [solicitacoes]);
  const sresUnicas = React.useMemo(() => Array.from(new Set(solicitacoes.map(s => s.sre).filter(Boolean))).sort(), [solicitacoes]);
  const escolasUnicas = React.useMemo(() => Array.from(new Set(solicitacoes.map(s => s.nomeEscola).filter(Boolean))).sort(), [solicitacoes]);
  const idsUnicos = React.useMemo(() => Array.from(new Set(solicitacoes.map(s => s.id).filter(Boolean))).sort(), [solicitacoes]);
  const codescsUnicos = React.useMemo(() => Array.from(new Set(solicitacoes.map(s => s.codesc).filter(Boolean))).sort(), [solicitacoes]);

  const filtrosAtivosCount = 
    (filtroId ? 1 : 0) + 
    (filtroEscola ? 1 : 0) + 
    (filtroMunicipio !== 'todos' ? 1 : 0) + 
    (filtroEtapa !== 'todos' ? 1 : 0) + 
    (filtroDataInicio ? 1 : 0) + 
    (filtroDataFim ? 1 : 0) +
    (filtroCodesc ? 1 : 0) +
    (filtroSre !== 'todos' ? 1 : 0) +
    (filtroEstrelas !== 'todas' ? 1 : 0) +
    (filtroEtiqueta !== 'todas' ? 1 : 0);

  const limparTodosFiltros = () => {
    setFiltroId('');
    setFiltroEscola('');
    setFiltroMunicipio('todos');
    setFiltroEtapa('todos');
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setFiltroCodesc('');
    setFiltroSre('todos');
    setFiltroEstrelas('todas');
    setFiltroEtiqueta('todas');
  };

  // Coluna "Sem Atribuição" (fixa) + uma coluna por usuário ativo com perfil
  // "Analista de Engenharia (DORE)" — gerado dinamicamente a partir do cadastro de usuários,
  // então um novo analista cadastrado aparece automaticamente, sem alteração de código.
  const analistasDore = React.useMemo(
    () => usuariosSeguranca.filter(u => u.perfil === 'analista_dore'),
    [usuariosSeguranca]
  );
  const listaAnalistas = React.useMemo(
    () => ['Sem Atribuição', ...analistasDore.map(u => u.nome)],
    [analistasDore]
  );

  // Stages to categorize "Kanban by Status"
  const colunasStatus: { key: EtapaProcesso; label: string; desc: string; color: string; bgHeader: string }[] = [
    { 
      key: 'cadastro', 
      label: 'Atendimento Inicial', 
      desc: 'Demanda inicial registrada pela SRE', 
      color: 'border-t-amber-500 text-amber-900',
      bgHeader: 'bg-amber-50 border-amber-250'
    },
    { 
      key: 'analise', 
      label: 'Análise Técnica DORE', 
      desc: 'Validação Engenharia', 
      color: 'border-t-indigo-500 text-indigo-950',
      bgHeader: 'bg-indigo-50 border-indigo-200'
    },
    { 
      key: 'correcao', 
      label: 'Correção na SRE', 
      desc: 'Inadequações na SRE', 
      color: 'border-t-red-500 text-red-950',
      bgHeader: 'bg-red-50 border-red-200'
    },
    { 
      key: 'paf_autorizacao', 
      label: 'Análise Validada', 
      desc: 'Análise técnica concluída', 
      color: 'border-t-emerald-500 text-emerald-950',
      bgHeader: 'bg-emerald-50 border-emerald-250'
    },
    { 
      key: 'cancelado', 
      label: 'Cancelados', 
      desc: 'Processos cancelados ou arquivados', 
      color: 'border-t-slate-500 text-slate-900',
      bgHeader: 'bg-slate-100 border-slate-300'
    }
  ];

  // Apply advanced filters and text search first
  const filtradas = solicitacoes.filter(s => {
    // 2. Filtro por ID de Obra
    if (filtroId && s.id !== filtroId) {
      return false;
    }

    // 3. Filtro por Escola
    if (filtroEscola && s.nomeEscola !== filtroEscola) {
      return false;
    }

    // 4. Filtro por Município
    if (filtroMunicipio !== 'todos' && s.municipio !== filtroMunicipio) {
      return false;
    }

    // 5. Filtro por Etapa Atual
    if (filtroEtapa !== 'todos') {
      const matchesEtapa = 
        filtroEtapa === 'cadastro_correcao' 
          ? (s.etapaAtual === 'cadastro' || s.etapaAtual === 'correcao')
          : (s.etapaAtual === filtroEtapa);
      if (!matchesEtapa) return false;
    }

    // 6. Filtro por Data de Criação
    if (filtroDataInicio && s.dataCriacao < filtroDataInicio) {
      return false;
    }
    if (filtroDataFim && s.dataCriacao > filtroDataFim) {
      return false;
    }

    // 7. Filtro por CODESC
    if (filtroCodesc && s.codesc !== filtroCodesc) {
      return false;
    }

    // 8. Filtro por Regional (SRE)
    if (filtroSre !== 'todos' && s.sre !== filtroSre) {
      return false;
    }

    // 9. Filtro por número de estrelas de prioridade
    if (filtroEstrelas !== 'todas') {
      const estrelasSol = s.estrelas ?? calcularEstrelas(s);
      if (String(estrelasSol) !== filtroEstrelas) return false;
    }

    // 10. Filtro por etiqueta de prioridade
    if (filtroEtiqueta !== 'todas') {
      const etiquetasSol = s.etiquetasPrioridade as CodigoEtiqueta[] | undefined ?? calcularPrioridade(s).etiquetas;
      if (!etiquetasSol.includes(filtroEtiqueta)) return false;
    }

    return true;
  });

  // Action: Change analyst quickly from card
  // Matriz de permissões: Admin e Gestor (DORE/PAF) podem atribuir para qualquer analista;
  // Analista de Engenharia (DORE) só pode atribuir para si mesmo (auto-atribuição).
  // Além disso valida a capacidade de 35 pts IEE do analista de destino (Parte 4) — Admin/Gestor
  // podem forçar a atribuição acima da capacidade (grava atribuicaoForcada: true).
  const handleMudarAnalista = (sol: Solicitacao, analista: string) => {
    const destino = analista === 'Sem Atribuição' || !analista ? '' : analista;

    if (perfilUsuario === 'analista_dore' && destino !== currentUserNome) {
      alert('Você só pode atribuir processos para si mesmo.');
      return;
    }

    if (destino) {
      const pontosObra = sol.ieePontos ?? calcularIEE(sol)?.pontos ?? 0;
      const outrosProcessos = solicitacoes.filter(s => s.id !== sol.id);
      const pontosDisponiveis = getPontosIEEDisponiveis(destino, outrosProcessos);

      if (pontosObra > pontosDisponiveis) {
        const podeForcar = (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore') || perfilUsuario === 'gestor_dore' || perfilUsuario === 'gestor_paf';
        const mensagem = `Analista sem capacidade disponível para esta obra (${pontosDisponiveis} pontos disponíveis, obra requer ${pontosObra} pontos).`;

        if (!podeForcar) {
          alert(mensagem);
          return;
        }
        if (!window.confirm(`${mensagem}\n\nDeseja forçar a atribuição mesmo assim?`)) {
          return;
        }
        onUpdate({ ...sol, analistaAtribuido: destino, atribuicaoForcada: true });
        return;
      }
    }

    onUpdate({
      ...sol,
      analistaAtribuido: destino || undefined,
      atribuicaoForcada: destino ? false : undefined
    });
  };

  // Ação explícita e separada de desatribuição — nenhum perfil pode "voltar" um card
  // para Sem Atribuição apenas trocando a seleção do dropdown de atribuição.
  const handleRemoverAtribuicao = (sol: Solicitacao) => {
    onUpdate({ ...sol, analistaAtribuido: undefined });
  };

  // Action: Move status quickly from card
  const handleAvançarStatus = (sol: Solicitacao, proxima: EtapaProcesso) => {
    const responsavelNome = currentUserNome || perfilUsuario;

    onUpdate({
      ...sol,
      etapaAtual: proxima,
      historicoEtapas: [
        ...sol.historicoEtapas,
        {
          etapa: proxima,
          data: new Date().toISOString().split('T')[0],
          responsavel: `${responsavelNome} (Kanban Quickmove)`
        }
      ]
    });
  };

  const renderCardSolicitacao = (sol: Solicitacao) => {
    const numAnexos = sol.documentos.filter(d => d.fileName).length;
    const numAprovados = sol.documentos.filter(d => d.status === 'aprovado').length;
    const temRecusados = sol.documentos.some(d => d.status === 'recusado');
    const totalDocs = sol.documentos.length;
    const prioridadeScoreCalc = sol.prioridadeScore ?? calcularPrioridade(sol).score;
    const etiquetasCalc: CodigoEtiqueta[] = sol.etiquetasPrioridade as CodigoEtiqueta[] | undefined ?? calcularPrioridade(sol).etiquetas;
    const estrelasCalc = sol.estrelas ?? calcularEstrelas(sol);
    const ieeClasseCalc = sol.ieeClasse ?? calcularIEE(sol)?.classe;

    return (
      <div 
        key={sol.id}
        onClick={() => onSelect(sol)}
        className="bg-white rounded-xl border border-slate-200 hover:border-blue-400 p-4 shadow-3xs hover:shadow-sm cursor-pointer transition select-none flex flex-col justify-between group space-y-3 shrink-0"
      >
        <div className="space-y-1.5">
          {/* Header of Card */}
          <div className="flex items-center justify-between gap-1.5">
            <span className="font-mono text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
              {sol.id}
            </span>

            {/* Delete button option */}
            {!isReadOnly && sol.etapaAtual === 'cadastro' && (
              confirmDeleteId === sol.id ? (
                <div className="flex items-center gap-1 bg-red-50 px-1 py-0.5 rounded border border-red-200 text-[9px] scale-95 transition-all">
                  <span className="text-red-750 font-bold">Apagar?</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(sol.id);
                      setConfirmDeleteId(null);
                    }}
                    className="bg-red-600 text-white font-bold px-1 rounded hover:bg-red-700 text-[8.5px] py-px cursor-pointer"
                  >
                    S
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(null);
                    }}
                    className="bg-slate-200 text-slate-700 font-bold px-1 rounded hover:bg-slate-300 text-[8.5px] py-px cursor-pointer"
                  >
                    N
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  {onEdit && (
                    <button
                      type="button"
                      title="Editar Atendimento"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(sol);
                      }}
                      className=" p-1 hover:bg-amber-100 hover:text-amber-750 text-slate-500 rounded transition cursor-pointer"
                    >
                      <Pencil className="w-3 h-3 text-amber-600 font-bold" />
                    </button>
                  )}
                  <button
                    type="button"
                    title="Apagar solicitação"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(sol.id);
                    }}
                    className=" p-1 hover:bg-red-100 hover:text-red-600 text-slate-400 rounded transition cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )
            )}
          </div>

          {/* Estrelas de Prioridade — destaque visual principal do card */}
          {estrelasCalc > 0 && (
            <div className="flex items-center gap-2" title={`${estrelasCalc} de 5 estrelas de prioridade`}>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map(n => (
                  <span key={n} className={`text-sm leading-none ${n <= estrelasCalc ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                ))}
              </div>
              <span className="text-[8px] text-slate-300 font-mono tracking-wide">score: {prioridadeScoreCalc}</span>
            </div>
          )}

          {/* Etiquetas de Prioridade (cumulativas) */}
          {etiquetasCalc.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {etiquetasCalc.map(codigo => {
                const info = getInfoEtiqueta(codigo, sol);
                return (
                  <span key={codigo} className={`${info.corClassName} text-[8.5px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 inline-block`}>
                    {info.label}
                  </span>
                );
              })}
            </div>
          )}
          {estrelasCalc === 0 && (
            <span className="text-[8px] text-slate-300 font-mono tracking-wide">score: {prioridadeScoreCalc}</span>
          )}

          {/* Classe IEE (complexidade da obra) — lógica independente das etiquetas de prioridade acima,
              por isso fica em linha própria, visualmente separada */}
          {ieeClasseCalc && (
            <div className="flex items-center gap-1 pt-1 border-t border-dashed border-slate-100">
              <span className={`${CLASSE_IEE_INFO[ieeClasseCalc].corClassName} text-[8.5px] font-black uppercase tracking-wide rounded px-1.5 py-0.5 inline-block`}>
                {CLASSE_IEE_INFO[ieeClasseCalc].label}
              </span>
              <span className="text-[8px] text-slate-300 font-mono tracking-wide">({sol.ieePontos ?? calcularIEE(sol)?.pontos} pts IEE)</span>
            </div>
          )}

          {/* School and Location info */}
          <h4 className="font-sans font-bold text-xs text-slate-800 leading-tight group-hover:text-blue-600 transition duration-150 text-left">
            {sol.nomeEscola}
          </h4>
          <p className="text-[10px] text-slate-400 flex items-center gap-1 leading-none text-left">
            <MapPin className="w-2.5 h-2.5 shrink-0" />
            {sol.municipio} ({sol.sre})
          </p>

          <div className="bg-slate-50/70 py-1.5 px-2.5 rounded-lg border border-slate-100/80 text-[10px] space-y-0.5 text-left">
            <span className="text-slate-500 font-medium">Obra: </span>
            <span className="text-slate-800 font-bold">{sol.tipoObra || sol.tipo}</span>
          </div>

          {/* Documentation status or warning lights */}
          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100 text-slate-500">
            <span>Docs do Checklist:</span>
            <span className={`font-semibold ${temRecusados ? 'text-red-600' : 'text-slate-700'}`}>
              {numAnexos}/{totalDocs} {temRecusados && '⚠️'}
            </span>
          </div>

          {/* Special verification flag status */}
          {sol.fichaVerificada === true && (
            <div className="bg-emerald-50/70 border border-emerald-150 text-emerald-800 rounded px-1.5 py-0.5 text-[9px] flex items-center gap-1 font-semibold">
              <span className="text-emerald-600 text-[11px]">✓</span> Ficha Validada por Engenharia
            </div>
          )}
          {sol.fichaVerificada === false && (
            <div className="bg-red-50/70 border border-red-150 text-red-800 rounded px-1.5 py-0.5 text-[9px] flex items-center gap-1 font-semibold animate-pulse">
              <span className="text-red-600 text-[11px]">⚠️</span> Ficha com Inconsistências
            </div>
          )}

          {/* Solicitação de cancelamento pendente — processo continua na etapa normalmente */}
          {sol.solicitacaoCancelamento && (
            <div className="bg-rose-50/70 border border-rose-200 text-rose-700 rounded px-1.5 py-0.5 text-[9px] flex items-center gap-1 font-bold animate-pulse" title={sol.motivoSolicitacaoCancelamento}>
              <span className="text-rose-600 text-[11px]">⚠</span> Cancelamento Solicitado
            </div>
          )}
        </div>

        {/* Footer actions of Card (e.g. assignment dropdown or moves) */}
        <div className="pt-2 border-t border-slate-100 space-y-1.5 text-left" onClick={(e) => e.stopPropagation()}>
          
          {/* Quick Assign Dropdown — Admin/Gestor podem atribuir a qualquer analista;
              Analista de Engenharia (DORE) só pode se auto-atribuir (validado em handleMudarAnalista) */}
          {(!isReadOnly && (perfilUsuario === 'gestor_dore' || perfilUsuario === 'gestor_paf' || (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore') || perfilUsuario === 'analista_dore')) ? (
            <div className="space-y-1">
              <label className="text-[8.5px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                <User className="w-2.5 h-2.5 text-slate-400" /> Atribuição:
                {sol.atribuicaoForcada && (
                  <span className="text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 py-0.5 font-black normal-case" title="Atribuída acima da capacidade disponível do analista">
                    forçada
                  </span>
                )}
              </label>
              <select
                value={sol.analistaAtribuido || ''}
                onChange={(e) => handleMudarAnalista(sol, e.target.value)}
                disabled={perfilUsuario === 'analista_dore' && !!sol.analistaAtribuido && sol.analistaAtribuido !== currentUserNome}
                className="w-full text-[9.5px] p-1 border border-indigo-150 rounded bg-white text-slate-700 cursor-pointer outline-hidden disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                {!sol.analistaAtribuido && <option value="">Selecionar analista...</option>}
                {listaAnalistas.filter(ana => ana !== 'Sem Atribuição').map(ana => (
                  <option key={ana} value={ana}>{ana}</option>
                ))}
              </select>
              {(perfilUsuario === 'gestor_dore' || perfilUsuario === 'gestor_paf' || (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore')) && sol.analistaAtribuido && (
                <button
                  type="button"
                  onClick={() => handleRemoverAtribuicao(sol)}
                  className="text-[8.5px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                >
                  Remover atribuição
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[10px] text-slate-500">
              <User className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">
                {sol.analistaAtribuido ? (
                  <strong className="text-slate-700 font-semibold">{sol.analistaAtribuido}</strong>
                ) : (
                  <span className="italic text-amber-600">Aguardando Gestor</span>
                )}
              </span>
            </div>
          )}

          {/* Quick return/recall action for SRE technician on the Kanban Card */}
          {!isReadOnly && perfilUsuario === 'tecnico_infra' && sol.etapaAtual === 'analise' && !sol.analistaAtribuido && (
            <div className="pt-1.5 border-t border-dashed border-slate-100 flex items-center justify-between gap-1.5">
              <span className="text-[8.5px] text-amber-600 font-extrabold uppercase tracking-wide">Esqueceu documento?</span>
              <button
                type="button"
                onClick={() => {
                  const confirmRecall = window.confirm(
                    `Deseja resgatar de volta o processo ${sol.id} de ${sol.nomeEscola} para a etapa de atendimento inicial?`
                  );
                  if (confirmRecall) {
                    onUpdate({
                      ...sol,
                      etapaAtual: 'cadastro',
                      historicoEtapas: [
                        ...sol.historicoEtapas,
                        {
                          etapa: 'cadastro',
                          data: new Date().toISOString().split('T')[0],
                          responsavel: 'Téc. SRE (Resgate direto do Kanban)'
                        }
                      ]
                    });
                    alert('Processo devolvido para a SRE (Atendimento Inicial)!');
                  }
                }}
                className="px-1.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded font-bold text-[8.5px] text-amber-800 transition cursor-pointer flex items-center gap-0.5"
              >
                <RefreshCw className="w-2.5 h-2.5 text-amber-600 animate-spin-slow animate-none shrink-0" />
                <span>Recolher</span>
              </button>
            </div>
          )}

          {/* Quick advancement flow if relevant */}
          {!isReadOnly && (
            <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-100 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Ações Rápidas:</span>
                <div className="flex gap-1">
                  {sol.etapaAtual !== 'cadastro' && (
                    <button
                      type="button"
                      title="Voltar etapa"
                      onClick={() => {
                        if (['paf_autorizacao', 'paf', 'ordem_inicio', 'execucao'].includes(sol.etapaAtual)) {
                          handleAvançarStatus(sol, 'analise');
                        } else if (sol.etapaAtual === 'analise') {
                          handleAvançarStatus(sol, 'correcao');
                        } else if (sol.etapaAtual === 'correcao') {
                          handleAvançarStatus(sol, 'cadastro');
                        } else if (sol.etapaAtual === 'cancelado') {
                          handleAvançarStatus(sol, 'cadastro');
                        }
                      }}
                      className="px-1.5 py-0.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded text-[8.5px] text-slate-600 cursor-pointer transition flex items-center gap-0.5"
                    >
                      <Undo2 className="w-2.5 h-2.5" />
                      <span>Voltar</span>
                    </button>
                  )}
                  {sol.etapaAtual !== 'cancelado' && !['paf_autorizacao', 'paf', 'ordem_inicio', 'execucao'].includes(sol.etapaAtual) && (
                    <button
                      type="button"
                      title="Avançar etapa"
                      onClick={() => {
                        if (sol.etapaAtual === 'cadastro' || sol.etapaAtual === 'correcao') {
                          handleAvançarStatus(sol, 'analise');
                        } else if (sol.etapaAtual === 'analise') {
                          handleAvançarStatus(sol, 'paf_autorizacao');
                        }
                      }}
                      className="px-1.5 py-0.5 border border-blue-250 bg-blue-50 text-blue-800 font-bold rounded hover:bg-blue-100 text-[8.5px] cursor-pointer transition flex items-center gap-0.5"
                    >
                      Avançar
                    </button>
                  )}
                  {sol.etapaAtual !== 'cancelado' && (
                    <button
                      type="button"
                      title="Cancelar Atendimento"
                      onClick={() => {
                        handleAvançarStatus(sol, 'cancelado');
                      }}
                      className="px-1.5 py-0.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded text-[8.5px] cursor-pointer transition flex items-center gap-0.5"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end text-[9.5px] text-blue-600 font-bold hover:underline select-none pt-1">
            <span onClick={() => onSelect(sol)} className="cursor-pointer">Abrir Detalhes →</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      
      {/* Search and context layout */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-205 font-sans font-semibold text-sm">Filtros de Pesquisa</span>
            {filtrosAtivosCount > 0 && (
              <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {filtrosAtivosCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-2 md:mt-0 justify-end">
            <div className="text-right hidden sm:flex flex-col items-end shrink-0">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">Tipo de Exibição</span>
              <span className="text-[9.5px] text-slate-500 font-bold leading-tight mt-0.5">Mudar o modo de visualizar</span>
            </div>
            <select
              value={viewMode}
              onChange={(e) => onMudarViewMode(e.target.value as any)}
              className="px-3.5 py-2 text-xs border border-slate-700 bg-slate-800 rounded-lg text-slate-100 font-bold focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer shadow-3xs"
            >
              <option value="lista">📋 Lista de Atribuição</option>
              <option value="kanban_status">📊 Kanban por Status</option>
              {activeSubTask === 'analise_atribuicao' && (
                <option value="kanban_analista">👥 Kanban por Analista</option>
              )}
            </select>
          </div>
        </div>

        {/* Painel de Filtros Avançados dentro do card escuro do Kanban */}
        <div className="p-4 bg-slate-800/40 border border-slate-755/50 border-slate-700/50 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-8 gap-3.5 animation-fadeIn text-left mt-1.5">
            {/* 1. ID de Obra */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ID de Obra</label>
              <select
                value={filtroId}
                onChange={(e) => setFiltroId(e.target.value)}
                className="w-full text-[11px] bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500/35 text-slate-100 cursor-pointer"
              >
                <option value="">Todos os IDs</option>
                {idsUnicos.map(id => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
            </div>

            {/* 2. CODESC */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CODESC</label>
              <select
                value={filtroCodesc}
                onChange={(e) => setFiltroCodesc(e.target.value)}
                className="w-full text-[11px] bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500/35 text-slate-100 cursor-pointer"
              >
                <option value="">Todos os CODESCs</option>
                {codescsUnicos.map(cod => (
                  <option key={cod} value={cod}>{cod}</option>
                ))}
              </select>
            </div>

            {/* 3. Município */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Município</label>
              <select
                value={filtroMunicipio}
                onChange={(e) => setFiltroMunicipio(e.target.value)}
                className="w-full text-[11px] bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500/35 text-slate-100 cursor-pointer"
              >
                <option value="todos">Todos os Municípios</option>
                {municipiosUnicos.map(mun => (
                  <option key={mun} value={mun}>{mun}</option>
                ))}
              </select>
            </div>

            {/* 4. Regional (SRE) */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Regional (SRE)</label>
              <select
                value={filtroSre}
                onChange={(e) => setFiltroSre(e.target.value)}
                className="w-full text-[11px] bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500/35 text-slate-100 cursor-pointer"
              >
                <option value="todos">Todas as Regionais (SRE)</option>
                {sresUnicas.map(sreOp => (
                  <option key={sreOp} value={sreOp}>{sreOp}</option>
                ))}
              </select>
            </div>

            {/* 5. Escola */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Escola</label>
              <select
                value={filtroEscola}
                onChange={(e) => setFiltroEscola(e.target.value)}
                className="w-full text-[11px] bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500/35 text-slate-100 cursor-pointer"
              >
                <option value="">Todas as Escolas</option>
                {escolasUnicas.map(esc => (
                  <option key={esc} value={esc}>{esc}</option>
                ))}
              </select>
            </div>

            {/* 6. Etapa Atual */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Etapa Atual</label>
              <select
                value={filtroEtapa}
                onChange={(e) => setFiltroEtapa(e.target.value)}
                className="w-full text-[11px] bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500/35 text-slate-100 cursor-pointer"
              >
                <option value="todos">Todas as etapas</option>
                <option value="cadastro">Atendimento Inicial</option>
                <option value="correcao">Correção SRE</option>
                <option value="cadastro_correcao">Inicial ou Correção SRE</option>
                <option value="analise">Análise Técnica DORE</option>
                <option value="paf">Geração PAF</option>
                <option value="ordem_inicio">Ordem de Início</option>
                <option value="execucao">Execução Física de Obra</option>
              </select>
            </div>

            {/* 7. Estrelas de Prioridade */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estrelas</label>
              <select
                value={filtroEstrelas}
                onChange={(e) => setFiltroEstrelas(e.target.value)}
                className="w-full text-[11px] bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500/35 text-slate-100 cursor-pointer"
              >
                <option value="todas">Todas</option>
                <option value="5">★★★★★ (5)</option>
                <option value="4">★★★★ (4)</option>
                <option value="3">★★★ (3)</option>
                <option value="2">★★ (2)</option>
                <option value="1">★ (1)</option>
                <option value="0">Sem estrela (0)</option>
              </select>
            </div>

            {/* 8. Etiqueta de Prioridade */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Etiqueta</label>
              <select
                value={filtroEtiqueta}
                onChange={(e) => setFiltroEtiqueta(e.target.value as 'todas' | CodigoEtiqueta)}
                className="w-full text-[11px] bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500/35 text-slate-100 cursor-pointer"
              >
                <option value="todas">Todas</option>
                <option value="EMERGENCIAL">EMERGENCIAL</option>
                <option value="PRIORIDADE">⭐ PRIORIDADE (ADM)</option>
                <option value="ESPECIAL">ESPECIAL</option>
                <option value="SEM_LIB_FINANCEIRA">SEM LIBERAÇÃO FINANCEIRA</option>
                <option value="NORMAL">⚪ NORMAL</option>
              </select>
            </div>

            {/* 9. Data de Criação */}
            <div className="space-y-1 sm:col-span-2 lg:col-span-2 xl:col-span-2 shadow-2xs">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Data de Criação</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={filtroDataInicio}
                  onChange={(e) => setFiltroDataInicio(e.target.value)}
                  className="w-full min-w-0 flex-1 text-[11px] bg-slate-950 border border-slate-700 rounded-lg py-1 px-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500/35 text-slate-100 cursor-pointer text-center"
                  title="Data Inicial"
                />
                <span className="text-[10.5px] text-slate-400 font-bold px-0.5 shrink-0">à</span>
                <input
                  type="date"
                  value={filtroDataFim}
                  onChange={(e) => setFiltroDataFim(e.target.value)}
                  className="w-full min-w-0 flex-1 text-[11px] bg-slate-950 border border-slate-700 rounded-lg py-1 px-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500/35 text-slate-100 cursor-pointer text-center"
                  title="Data Final"
                />
              </div>
            </div>

            {/* Footer of Filters if active */}
            {filtrosAtivosCount > 0 && (
              <div className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-8 flex flex-col sm:flex-row justify-between items-center gap-2 pt-2 border-t border-slate-750/70 mt-1">
                <span className="text-[10.5px] text-blue-300 font-sans font-semibold bg-blue-500/10 border border-blue-400/25 px-2 py-0.5 rounded">
                  Mostrando {filtradas.length} de {solicitacoes.length} atendimentos filtrados
                </span>
                <button
                  type="button"
                  onClick={limparTodosFiltros}
                  className="px-2.5 py-1 text-[10px] font-bold text-red-300 bg-red-950/45 border border-red-800/30 rounded hover:bg-red-950 hover:text-red-200 transition flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Limpar Filtros</span>
                </button>
              </div>
            )}
          </div>
      </div>

      {mode === 'status' ? (
        /* KANBAN BY STATUS CARD GRIDS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 items-start overflow-x-auto pb-4">
          {colunasStatus.map((col) => {
            const itensNaColuna = filtradas.filter(sol => {
              if (col.key === 'paf_autorizacao') {
                return ['paf_autorizacao', 'paf', 'ordem_inicio', 'execucao'].includes(sol.etapaAtual);
              }
              return sol.etapaAtual === col.key;
            }).sort(compararPorPrioridade);

            return (
              <div 
                key={col.key}
                className="bg-slate-100/70 border border-slate-200/60 rounded-xl p-3 flex flex-col space-y-3 min-w-[210px] max-h-[800px] overflow-y-auto"
              >
                {/* Column header */}
                <div className={`p-2 rounded-lg border text-left ${col.bgHeader}`}>
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span className="text-xs tracking-tight font-display">{col.label}</span>
                    <span className="font-mono text-[9.5px] px-1.5 py-0.5 bg-white border rounded">
                      {itensNaColuna.length}
                    </span>
                  </div>
                  <p className="text-[9.5px] text-slate-500 mt-0.5">{col.desc}</p>
                </div>

                {/* Cards Container */}
                <div className="space-y-2.5">
                  {itensNaColuna.length === 0 ? (
                    <div className="border border-dashed border-slate-250 rounded-xl p-6 text-center text-[10px] text-slate-500">
                      Nenhum processo nesta etapa
                    </div>
                  ) : (
                    itensNaColuna.map(sol => renderCardSolicitacao(sol))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* KANBAN BY USER CARD GRIDS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start overflow-x-auto pb-4">
          {listaAnalistas.map((nomeAna) => {
            const itensNaColuna = filtradas.filter(sol => {
              // Processos cancelados saem das filas de atribuição ativas — ainda aparecem na
              // coluna "Cancelados" do Kanban por Status e na Lista de Atendimentos (histórico).
              if (sol.etapaAtual === 'cancelado') return false;
              if (nomeAna === 'Sem Atribuição') {
                return !sol.analistaAtribuido;
              }
              return sol.analistaAtribuido === nomeAna;
            }).sort(compararPorPrioridade);

            const usuarioColuna = analistasDore.find(u => u.nome === nomeAna);
            const iniciais = usuarioColuna
              ? usuarioColuna.nome.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase()
              : null;

            // Pontos IEE somados dos processos da coluna — para analistas é a "carga" usada contra a
            // capacidade fixa de 35 pts (Parte 4/5); para "Sem Atribuição" é só um total informativo.
            const pontosColuna = itensNaColuna.reduce((soma, sol) => soma + (sol.ieePontos ?? calcularIEE(sol)?.pontos ?? 0), 0);
            const corBarraPontos = pontosColuna > CAPACIDADE_MAXIMA_ANALISTA
              ? 'bg-red-900'
              : pontosColuna >= 29
                ? 'bg-red-500'
                : pontosColuna >= 21
                  ? 'bg-amber-400'
                  : 'bg-emerald-500';

            return (
              <div
                key={usuarioColuna?.id || 'sem-atribuicao'}
                className="bg-slate-100/70 border border-slate-200/60 rounded-xl p-3 flex flex-col space-y-3 min-w-[220px] max-h-[800px] overflow-y-auto"
              >
                {/* Column header */}
                <div className={`p-2.5 rounded-lg border text-left bg-white border-slate-205 shadow-3xs`}>
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span className="text-xs font-display flex items-center gap-1.5">
                      {iniciais ? (
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-black flex items-center justify-center shrink-0">
                          {iniciais}
                        </span>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-amber-450 animate-pulse" />
                      )}
                      {nomeAna}
                    </span>
                    <span className="font-mono text-[9.5px] px-1.5 py-0.5 bg-slate-50 border rounded-md">
                      {itensNaColuna.length}
                    </span>
                  </div>
                  <p className="text-[9.5px] text-slate-400 mt-0.5">
                    {nomeAna === 'Sem Atribuição' ? 'Aguardando ação de Atendimento DORE' : 'Análises sob alçada de Engenharia'}
                  </p>

                  {usuarioColuna ? (
                    <div className="mt-1.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono font-bold text-slate-500" title="Pontos IEE em uso na capacidade do analista (máx. 35)">
                          {pontosColuna} / {CAPACIDADE_MAXIMA_ANALISTA} pts
                        </span>
                        {pontosColuna > CAPACIDADE_MAXIMA_ANALISTA && (
                          <span className="text-[8.5px] font-black uppercase text-red-700">Sobrecarga</span>
                        )}
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${corBarraPontos} transition-all`}
                          style={{ width: `${Math.min(100, (pontosColuna / CAPACIDADE_MAXIMA_ANALISTA) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-[9.5px] text-amber-700 font-bold mt-1">
                      {itensNaColuna.length} processos — {pontosColuna} pts no total aguardando atribuição
                    </p>
                  )}
                </div>

                {/* Cards Container */}
                <div className="space-y-2.5">
                  {itensNaColuna.length === 0 ? (
                    <div className="border border-dashed border-slate-250 rounded-xl p-6 text-center text-[10px] text-slate-500">
                      Nenhum processo atribuído
                    </div>
                  ) : (
                    itensNaColuna.map(sol => renderCardSolicitacao(sol))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
