import React, { useState } from 'react';
import { Solicitacao, PerfilUsuario, UsuarioSistema } from '../types';
import { 
  Plus, Layers, ClipboardCheck, DollarSign, Building, 
  MapPin, ChevronRight, User, ShieldCheck, AlertTriangle, Trash2, RefreshCw,
  FileSpreadsheet, FileText, Pencil, Calendar, Filter
} from 'lucide-react';

interface DashboardProps {
  solicitacoes: Solicitacao[];
  onSelect: (sol: Solicitacao) => void;
  onNovaSolicitacao: () => void;
  perfilUsuario: PerfilUsuario;
  onMudarPerfil: (perfil: PerfilUsuario) => void;
  onDelete: (id: string) => void;
  onUpdate?: (updated: Solicitacao) => void;
  onEdit?: (sol: Solicitacao) => void;
  viewMode: 'lista' | 'kanban_status' | 'kanban_analista';
  onMudarViewMode: (mode: 'lista' | 'kanban_status' | 'kanban_analista') => void;
  activeSubTask?: string;
  usuariosSeguranca?: UsuarioSistema[];
}

export default function Dashboard({
  solicitacoes,
  onSelect,
  onNovaSolicitacao,
  perfilUsuario,
  onMudarPerfil,
  onDelete,
  onUpdate,
  onEdit,
  viewMode,
  onMudarViewMode,
  activeSubTask,
  usuariosSeguranca = []
}: DashboardProps) {
  const currentUserNome = usuariosSeguranca.find(u => u.perfil === perfilUsuario)?.nome || '';
  const [filtroEtapa, setFiltroEtapa] = useState<string>('todos');
  const [filtroAtribuicao, setFiltroAtribuicao] = useState<'todos' | 'minhas'>('minhas');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDevolverId, setConfirmDevolverId] = useState<string | null>(null);

  // Filtros avançados e detalhados solicitados pelo usuário
  const [filtroId, setFiltroId] = useState('');
  const [filtroEscola, setFiltroEscola] = useState('');
  const [filtroMunicipio, setFiltroMunicipio] = useState('todos');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroCodesc, setFiltroCodesc] = useState('');
  const [filtroSre, setFiltroSre] = useState('todos');

  const isReadOnly = activeSubTask === 'cadastro';

  const exportarParaExcel = () => {
    const headers = [
      'Obra ID', 'CODESC', 'Escola', 'Município', 'SRE', 'Tipo de Obra', 
      'Data de Criação', 'Tipo de Prédio', 'Tipo de Atendimento', 'Atendimento Outro Órgão', 'Etapa Atual', 'Status da Obra'
    ];
    
    const rows = solicitacoesFiltradas.map(s => [
      s.id,
      s.codesc,
      s.nomeEscola,
      s.municipio,
      s.sre,
      s.tipoObra || s.tipo,
      s.dataCriacao,
      s.predio || 'Próprio Estadual',
      s.tipoAtendimento || 'Atendimento Direto',
      s.atendimentoOrgao || 'Exclusivo Estadual',
      s.etapaAtual.toUpperCase(),
      s.statusObra || 'Não Iniciada'
    ]);
    
    const BOM = '\uFEFF';
    let csvContent = BOM + headers.join('\t') + '\n';
    
    rows.forEach(row => {
      csvContent += row.map(val => {
        const cleanVal = String(val).replace(/"/g, '""');
        return `"${cleanVal}"`;
      }).join('\t') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/xls;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Dossie_Obras_GESTO_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pre-calculate count stats
  const total = solicitacoes.length;
  const analise = solicitacoes.filter(s => s.etapaAtual === 'analise').length;
  const correcao = solicitacoes.filter(s => s.etapaAtual === 'correcao').length;
  const paf = solicitacoes.filter(s => s.etapaAtual === 'paf').length;
  const ordemInicio = solicitacoes.filter(s => s.etapaAtual === 'ordem_inicio').length;
  const execucao = solicitacoes.filter(s => s.etapaAtual === 'execucao').length;
  const cadastro = solicitacoes.filter(s => s.etapaAtual === 'cadastro').length;

  // Obter a lista de municípios e sres/regionais únicas para popular o select de filtros
  const municipiosUnicos = Array.from(new Set(solicitacoes.map(s => s.municipio).filter(Boolean))).sort();
  const sresUnicas = Array.from(new Set(solicitacoes.map(s => s.sre).filter(Boolean))).sort();
  const escolasUnicas = Array.from(new Set(solicitacoes.map(s => s.nomeEscola).filter(Boolean))).sort();
  const idsUnicos = Array.from(new Set(solicitacoes.map(s => s.id).filter(Boolean))).sort();
  const codescsUnicos = Array.from(new Set(solicitacoes.map(s => s.codesc).filter(Boolean))).sort();

  // Filter solicitations
  const solicitacoesFiltradas = solicitacoes.filter(s => {
    // 1. Filtro por ID de Obra (se selecionado)
    const matchesId = !filtroId || filtroId === 'todos' || s.id === filtroId;

    // 2. Filtro por Escola (se preenchido)
    const matchesEscola = !filtroEscola || s.nomeEscola === filtroEscola;

    // 3. Filtro por Município (se selecionado)
    const matchesMunicipio = filtroMunicipio === 'todos' || s.municipio === filtroMunicipio;

    // 4. Filtro por Etapa Atual
    const matchesEtapa = 
      filtroEtapa === 'todos' ||
      (filtroEtapa === 'cadastro_correcao' && (s.etapaAtual === 'cadastro' || s.etapaAtual === 'correcao')) ||
      (s.etapaAtual === filtroEtapa);

    // 5. Filtro por Data de Criação (se selecionado o período)
    let matchesData = true;
    if (filtroDataInicio) {
      matchesData = matchesData && (s.dataCriacao >= filtroDataInicio);
    }
    if (filtroDataFim) {
      matchesData = matchesData && (s.dataCriacao <= filtroDataFim);
    }

    // 6. Filtro por CODESC (se selecionado)
    const matchesCodesc = !filtroCodesc || filtroCodesc === 'todos' || s.codesc === filtroCodesc;

    // 7. Filtro por Regional (SRE) (se selecionado)
    const matchesSre = filtroSre === 'todos' || s.sre === filtroSre;

    if (!matchesId || !matchesEscola || !matchesMunicipio || !matchesEtapa || !matchesData || !matchesCodesc || !matchesSre) {
      return false;
    }

    // Se o usuário logado for Analista DORE e estiver focado nas tarefas dele
    if (perfilUsuario === 'analista_dore' && filtroAtribuicao === 'minhas') {
      return s.etapaAtual === 'analise' && !!s.analistaAtribuido && (currentUserNome ? s.analistaAtribuido === currentUserNome : true);
    }

    return true;
  });

  // Profiles config
  const perfisConfig = [
    { 
      id: 'tecnico_infra' as PerfilUsuario, 
      label: 'Técnico de Infraestrutura SRE', 
      desc: 'Cadastra escolas, envia documentação oficial e corrige checklists recusados.',
      icon: Layers,
      colorClass: 'border-amber-200 bg-amber-50/70 text-amber-800'
    },
    { 
      id: 'gestor_dore' as PerfilUsuario, 
      label: 'Gestor Atendimento DORE - Aline Davino', 
      desc: 'Recebe as análises das SREs, visualiza o atendimento inicial e decide qual analista irá avaliar.',
      icon: User,
      colorClass: 'border-indigo-200 bg-indigo-50/70 text-indigo-800'
    },
    { 
      id: 'analista_dore' as PerfilUsuario, 
      label: 'Analista de Engenharia DORE - Flavia Borges', 
      desc: 'Avalia checklists documentais de engenharia, emite pareceres técnicos e aprova projetos.', 
      icon: ShieldCheck,
      colorClass: 'border-blue-200 bg-blue-50/70 text-blue-800'
    },
    { 
      id: 'gestor_paf' as PerfilUsuario, 
      label: 'Gestor Geral (PAF) - Silas Fagundes', 
      desc: 'Analisa e autoriza homologações financeiras na Etapa 3 (Autorização do PAF).', 
      icon: DollarSign,
      colorClass: 'border-cyan-200 bg-cyan-50/70 text-cyan-800'
    },
    { 
      id: 'administrativo_dore' as PerfilUsuario, 
      label: 'Administrativo DORE - Rui Lages', 
      desc: 'Preenche e gera o número oficial do PAF na Etapa 4 (Geração do PAF) e libera para Ordem de Início.', 
      icon: FileText,
      colorClass: 'border-purple-200 bg-purple-50/70 text-purple-800'
    },
    { 
      id: 'tecnico_infra' as PerfilUsuario, 
      label: 'Fiscalização de Obra', 
      desc: 'Acompanha obras presenciais, registra medições periódicas e gerencia aditivos técnicos.', 
      icon: Building,
      colorClass: 'border-emerald-200 bg-emerald-50/70 text-emerald-800'
    }
  ];

  const filtrosAtivosCount = 
    (filtroId ? 1 : 0) + 
    (filtroEscola ? 1 : 0) + 
    (filtroMunicipio !== 'todos' ? 1 : 0) + 
    (filtroEtapa !== 'todos' ? 1 : 0) + 
    (filtroDataInicio ? 1 : 0) + 
    (filtroDataFim ? 1 : 0) +
    (filtroCodesc ? 1 : 0) +
    (filtroSre !== 'todos' ? 1 : 0);

  const limparTodosFiltros = () => {
    setFiltroId('');
    setFiltroEscola('');
    setFiltroMunicipio('todos');
    setFiltroEtapa('todos');
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setFiltroCodesc('');
    setFiltroSre('todos');
  };

  return (
    <div className="space-y-6">

      {/* CONTROLES E BUSCA */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Barra Principal */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row gap-3 flex-1 items-stretch md:items-center">
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-sans font-semibold text-sm">Filtros de Pesquisa</span>
              {filtrosAtivosCount > 0 && (
                <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {filtrosAtivosCount}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3.5 mt-2 md:mt-0 justify-end">
            <div className="text-right hidden sm:flex flex-col items-end shrink-0">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">Tipo de Exibição</span>
              <span className="text-[9.5px] text-slate-500 font-bold leading-tight mt-0.5">Mudar o modo de visualizar os processos</span>
            </div>
            <select
              value={viewMode}
              onChange={(e) => onMudarViewMode(e.target.value as any)}
              className="px-3 py-2 text-sm border border-slate-200 bg-white rounded-lg text-slate-700 font-bold focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer shadow-3xs"
            >
              <option value="lista">📋 Lista de Demandas</option>
              <option value="kanban_status">📊 Kanban por Status</option>
            </select>
          </div>
        </div>

        {/* Painel de Filtros Avançados */}
        <div className="p-4 bg-slate-50/30 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-8 gap-3.5 animation-fadeIn">
          {/* 1. ID de Obra */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ID de Obra</label>
              <select
                value={filtroId}
                onChange={(e) => setFiltroId(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg py-2 px-2.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 bg-white text-slate-705 cursor-pointer"
              >
                <option value="">Todos os IDs</option>
                {idsUnicos.map(id => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
            </div>

            {/* 2. CODESC */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">CODESC</label>
              <select
                value={filtroCodesc}
                onChange={(e) => setFiltroCodesc(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg py-2 px-2.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 bg-white text-slate-705 cursor-pointer"
              >
                <option value="">Todos os CODESCs</option>
                {codescsUnicos.map(cod => (
                  <option key={cod} value={cod}>{cod}</option>
                ))}
              </select>
            </div>

            {/* 3. Município */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Município</label>
              <select
                value={filtroMunicipio}
                onChange={(e) => setFiltroMunicipio(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg py-2 px-2.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 bg-white text-slate-705 cursor-pointer"
              >
                <option value="todos">Todos os Municípios</option>
                {municipiosUnicos.map(mun => (
                  <option key={mun} value={mun}>{mun}</option>
                ))}
              </select>
            </div>

            {/* 4. Regional (SRE) */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Regional (SRE)</label>
              <select
                value={filtroSre}
                onChange={(e) => setFiltroSre(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg py-2 px-2.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 bg-white text-slate-705 cursor-pointer"
              >
                <option value="todos">Todas as Regionais (SRE)</option>
                {sresUnicas.map(sreOp => (
                  <option key={sreOp} value={sreOp}>{sreOp}</option>
                ))}
              </select>
            </div>

            {/* 5. Escola */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Escola</label>
              <select
                value={filtroEscola}
                onChange={(e) => setFiltroEscola(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg py-2 px-2.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 bg-white text-slate-705 cursor-pointer"
              >
                <option value="">Todas as Escolas</option>
                {escolasUnicas.map(esc => (
                  <option key={esc} value={esc}>{esc}</option>
                ))}
              </select>
            </div>

            {/* 6. Etapa Atual */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Etapa Atual</label>
              <select
                value={filtroEtapa}
                onChange={(e) => setFiltroEtapa(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg py-2 px-2.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 bg-white text-slate-705 cursor-pointer"
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

            {/* 7. Data de Criação */}
            <div className="space-y-1 sm:col-span-2 lg:col-span-2 xl:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Data de Criação</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={filtroDataInicio}
                  onChange={(e) => setFiltroDataInicio(e.target.value)}
                  className="w-full min-w-0 flex-1 text-[10px] border border-slate-200 rounded-lg py-1 px-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 bg-white text-slate-705 cursor-pointer text-center"
                  title="Data Inicial"
                />
                <span className="text-[10px] text-slate-500 font-bold px-0.5 shrink-0">à</span>
                <input
                  type="date"
                  value={filtroDataFim}
                  onChange={(e) => setFiltroDataFim(e.target.value)}
                  className="w-full min-w-0 flex-1 text-[10px] border border-slate-200 rounded-lg py-1 px-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 bg-white text-slate-705 cursor-pointer text-center"
                  title="Data Final"
                />
              </div>
            </div>

            {/* Rodapé dos Filtros se tiver algum ativo */}
            {filtrosAtivosCount > 0 && (
              <div className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-8 flex flex-col sm:flex-row justify-between items-center gap-2 pt-2 border-t border-slate-100 mt-1">
                <span className="text-[11px] text-blue-700 font-sans font-semibold bg-blue-50 px-2 py-0.5 rounded-md">
                  Mostrando {solicitacoesFiltradas.length} de {solicitacoes.length} atendimentos filtrados
                </span>
                <button
                  type="button"
                  onClick={limparTodosFiltros}
                  className="px-3 py-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:text-red-700 transition flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 text-red-500" />
                  <span>Limpar Filtros</span>
                </button>
              </div>
            )}
          </div>

        {/* Filtros específicos de perfil analista/gestor */}
        {(perfilUsuario === 'analista_dore' || perfilUsuario === 'gestor_dore') && (
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Visão focada por atribuição de analistas:</span>
            {perfilUsuario === 'analista_dore' && (
              <div className="flex bg-slate-200/60 p-0.5 rounded-md border border-slate-250 select-none">
                <button
                  type="button"
                  onClick={() => setFiltroAtribuicao('minhas')}
                  className={`px-2.5 py-0.5 text-[11px] font-bold rounded-sm transition-all cursor-pointer ${
                    filtroAtribuicao === 'minhas'
                      ? 'bg-blue-600 text-white shadow-3xs'
                      : 'text-slate-600 hover:text-slate-900 bg-transparent'
                  }`}
                >
                  Minhas Análises (Eng. André)
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroAtribuicao('todos')}
                  className={`px-2.5 py-0.5 text-[11px] font-bold rounded-sm transition-all cursor-pointer ${
                    filtroAtribuicao === 'todos'
                      ? 'bg-blue-600 text-white shadow-3xs'
                      : 'text-slate-600 hover:text-slate-900 bg-transparent'
                  }`}
                >
                  Todas
                </button>
              </div>
            )}

            {perfilUsuario === 'gestor_dore' && (
              <div className="flex bg-slate-200/60 p-0.5 rounded-md border border-slate-250 select-none">
                <button
                  type="button"
                  onClick={() => setFiltroAtribuicao('minhas')}
                  className={`px-2.5 py-0.5 text-[11px] font-bold rounded-sm transition-all cursor-pointer ${
                    filtroAtribuicao === 'minhas'
                      ? 'bg-indigo-600 text-white shadow-3xs'
                      : 'text-slate-600 hover:text-slate-900 bg-transparent'
                  }`}
                >
                  Aguardando Atribuição
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroAtribuicao('todos')}
                  className={`px-2.5 py-0.5 text-[11px] font-bold rounded-sm transition-all cursor-pointer ${
                    filtroAtribuicao === 'todos'
                      ? 'bg-indigo-600 text-white shadow-3xs'
                      : 'text-slate-600 hover:text-slate-900 bg-transparent'
                  }`}
                >
                  Todas
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* TABELA DE SOLICITAÇÕES */}
      {solicitacoesFiltradas.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
          <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="font-display font-semibold text-slate-800 text-sm">Nenhuma solicitação encontrada</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Por favor, refine seu termo de pesquisa ou mude o filtro para visualizar outras demandas.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-550 font-bold uppercase tracking-wider text-[10px] h-11">
                  <th className="py-3 px-4 w-28">OBRA ID</th>
                  <th className="py-3 px-4">ESCOLA / LOCALIZAÇÃO</th>
                  <th className="py-3 px-4">TIPO / DEMANDA</th>
                  <th className="py-3 px-4">TIPO ATENDIMENTO</th>
                  <th className="py-3 px-4 w-48">DESCRIÇÃO</th>
                  <th className="py-3 px-4">VALOR PLANILHA</th>
                  <th className="py-3 px-4">DATA CRIAÇÃO</th>
                  <th className="py-3 px-4">RESPONSÁVEL (ENCAMINHOU)</th>
                  <th className="py-3 px-4">ANALISTA DESIGNADO</th>
                  <th className="py-3 px-4 text-center">CHECKLIST DOCS</th>
                  <th className="py-3 px-4">ETAPA ATUAL</th>
                  <th className="py-3 px-4 text-right w-36">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {solicitacoesFiltradas.map((sol) => {
                  const numAnexados = sol.documentos.filter((d) => d.fileName).length;
                  const numAprovados = sol.documentos.filter((d) => d.status === 'aprovado').length;
                  const numTotal = sol.documentos.length;
                  const temRecusas = sol.documentos.some((d) => d.status === 'recusado');

                  return (
                    <tr 
                      key={sol.id}
                      onClick={() => onSelect(sol)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      {/* OBRA ID */}
                      <td className="py-4 px-4 font-mono font-bold text-slate-600 whitespace-nowrap">
                        <span>{sol.id}</span>
                      </td>

                      {/* ESCOLA / LOCALIZAÇÃO */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-800 text-xs leading-snug font-sans text-left">
                          {sol.nomeEscola}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-left font-sans">
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{sol.municipio}</span>
                          </span>
                          <span>•</span>
                          <span>SRE: <span className="font-semibold text-slate-600">{sol.sre}</span></span>
                          <span>•</span>
                          <span>CODESC: <span className="font-mono text-slate-600 font-semibold">{sol.codesc}</span></span>
                        </div>
                      </td>

                      {/* TIPO / DEMANDA */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-850 font-semibold border border-indigo-150 rounded text-[10px] tracking-wide uppercase">
                          {sol.tipoObra || sol.tipo || 'REFORMA'}
                        </span>
                      </td>

                      {/* TIPO ATENDIMENTO */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-bold border border-emerald-150 rounded text-[10px] uppercase">
                          {sol.tipoAtendimento || 'DIRETO'}
                        </span>
                      </td>

                      {/* DESCRIÇÃO */}
                      <td className="py-4 px-4 max-w-[180px]">
                        <span className="text-slate-500 text-[11px] block truncate" title={sol.descricaoFolhaRosto || sol.tipo}>
                          {sol.descricaoFolhaRosto || sol.tipo || 'Sem descrição'}
                        </span>
                      </td>

                      {/* VALOR PLANILHA */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-800 font-sans text-[11.5px]">
                          R$ {(sol.valorPlanilha || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* DATA CRIAÇÃO */}
                      <td className="py-4 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {sol.dataCriacao}
                      </td>

                      {/* RESPONSÁVEL (ENCAMINHOU) */}
                      <td className="py-4 px-4 max-w-[140px]">
                        <span className="text-slate-600 text-[11px] block truncate" title={sol.responsavel || 'Infra SRE'}>
                          🧑‍💻 {sol.responsavel || 'Infra SRE'}
                        </span>
                      </td>

                      {/* ANALISTA DESIGNADO */}
                      <td className="py-4 px-4 text-slate-600">
                        {sol.analistaAtribuido ? (
                          <span className="font-semibold text-slate-705 bg-slate-100 border border-slate-205 px-2 py-0.5 rounded flex items-center gap-1.5 text-[10px] w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            {sol.analistaAtribuido}
                          </span>
                        ) : (
                          <span className="font-semibold text-amber-700 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded flex items-center gap-1.5 text-[10px] w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Não Designado
                          </span>
                        )}
                      </td>

                      {/* CHECKLIST DOCS */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <div className="font-bold text-slate-700 text-xs text-center">
                          {numAnexados} / {numTotal}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5 text-center">
                          {temRecusas ? (
                            <span className="text-red-600 font-bold">⚠️ Correções</span>
                          ) : numAnexados === numTotal ? (
                            <span className="text-emerald-700 font-bold">Completo</span>
                          ) : (
                            <span>Alocado</span>
                          )}
                        </div>
                      </td>

                      {/* ETAPA ATUAL */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {sol.statusObra === 'Concluída' ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[10px] font-bold">
                            Concluída (100%)
                          </span>
                        ) : sol.etapaAtual === 'cadastro' ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            temRecusas ? 'bg-red-50 text-red-750 border-red-200' : 'bg-amber-50 text-amber-750 border-amber-200'
                          }`}>
                            {temRecusas ? 'Atendimento Inicial (Correção)' : 'Atendimento Inicial'}
                          </span>
                        ) : sol.etapaAtual === 'correcao' ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-750 border border-red-200 rounded text-[10px] font-bold animate-pulse">
                            Correção na SRE
                          </span>
                        ) : sol.etapaAtual === 'analise' ? (
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded text-[10px] font-bold">
                            Análise Técnica DORE
                          </span>
                        ) : sol.etapaAtual === 'paf_autorizacao' ? (
                          <span className="px-2 py-0.5 bg-pink-50 text-pink-800 border border-pink-200 rounded text-[10px] font-bold">
                            Autorização PAF
                          </span>
                        ) : sol.etapaAtual === 'paf' ? (
                          <span className="px-2 py-0.5 bg-cyan-50 text-cyan-800 border border-cyan-200 rounded text-[10px] font-bold">
                            Plano Atendimento Financeiro (PAF)
                          </span>
                        ) : sol.etapaAtual === 'ordem_inicio' ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[10px] font-bold">
                            Ordem de Início
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-250 rounded text-[10px] font-bold">
                            Execução Física de Obra
                          </span>
                        )}
                      </td>

                      {/* AÇÕES */}
                      <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {/* SRE Technician recall action */}
                          {perfilUsuario === 'tecnico_infra' && sol.etapaAtual === 'analise' && !sol.analistaAtribuido && onUpdate && (
                            confirmDevolverId === sol.id ? (
                              <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded border border-amber-250 text-[10px] shrink-0 text-left">
                                <span className="text-amber-800 font-extrabold text-[9px]">Devolver?</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onUpdate) {
                                      onUpdate({
                                        ...sol,
                                        etapaAtual: 'cadastro',
                                        historicoEtapas: [
                                          ...sol.historicoEtapas,
                                          {
                                            etapa: 'cadastro',
                                            data: new Date().toISOString().split('T')[0],
                                            responsavel: 'Téc. SRE (Resgate direto do painel)'
                                          }
                                        ]
                                      });
                                      setConfirmDevolverId(null);
                                      alert('Processo devolvido com sucesso para a etapa de checklist!');
                                    }
                                  }}
                                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-1.5 py-0.5 rounded text-[9px] cursor-pointer"
                                >
                                  Sim
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDevolverId(null)}
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-1.5 py-0.5 rounded text-[9px] cursor-pointer"
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                title="Solicitar Devolução do Processo (Resgatar)"
                                onClick={() => setConfirmDevolverId(sol.id)}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 hover:text-amber-900 border border-amber-200 rounded font-bold text-[10px] text-amber-800 flex items-center gap-1 transition cursor-pointer"
                              >
                                <RefreshCw className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>Recolher</span>
                              </button>
                            )
                          )}

                          {sol.etapaAtual === 'cadastro' && (
                            confirmDeleteId === sol.id ? (
                              <div className="flex items-center gap-1 bg-red-50 px-2 py-1 rounded border border-red-200 text-[10px] shrink-0 text-left">
                                <span className="text-red-700 font-extrabold text-[9px]">Apagar?</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDelete(sol.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-1.5 py-0.5 rounded text-[9px] cursor-pointer"
                                >
                                  Sim
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-1.5 py-0.5 rounded text-[9px] cursor-pointer"
                                >
                                  Não
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
                                    className="p-1.5 hover:bg-amber-50 hover:text-amber-700 text-slate-400 rounded-lg transition shrink-0 cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-amber-500" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  title="Apagar solicitação"
                                  onClick={() => setConfirmDeleteId(sol.id)}
                                  className="p-1.5 hover:bg-red-50 hover:text-red-700 text-slate-400 rounded-lg transition shrink-0 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
