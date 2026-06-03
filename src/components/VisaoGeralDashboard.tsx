import React, { useState, useMemo } from 'react';
import { Solicitacao } from '../types';
import { 
  Building2, Coins, HardHat, Layers, FileText, Landmark, CheckCircle, 
  MapPin, Search, ArrowUpRight, TrendingUp, Users, Calendar, AlertCircle
} from 'lucide-react';

interface VisaoGeralDashboardProps {
  solicitacoes: Solicitacao[];
  onSelectSchool: (sol: Solicitacao) => void;
  onNavigateToSubTask: (subTask: string) => void;
}

export default function VisaoGeralDashboard({ 
  solicitacoes, 
  onSelectSchool, 
  onNavigateToSubTask 
}: VisaoGeralDashboardProps) {
  // Region-wise and School-wise filters state inside Dashboard
  const [sreFilter, setSreFilter] = useState<string>('todos');
  const [searchSchoolQuery, setSearchSchoolQuery] = useState<string>('');
  const [selectedMunicipio, setSelectedMunicipio] = useState<string>('todos');

  // List of SREs and Municipios for sidebar lists
  const sresDisponiveis = useMemo(() => {
    return Array.from(new Set(solicitacoes.map(s => s.sre).filter(Boolean))).sort();
  }, [solicitacoes]);

  const municipiosDisponiveis = useMemo(() => {
    return Array.from(new Set(solicitacoes.map(s => s.municipio).filter(Boolean))).sort();
  }, [solicitacoes]);

  // Apply dashboard level filters dynamically
  const filteredSolicitacoes = useMemo(() => {
    return solicitacoes.filter(s => {
      const matchSre = sreFilter === 'todos' || s.sre === sreFilter;
      const matchMun = selectedMunicipio === 'todos' || s.municipio === selectedMunicipio;
      const matchSearch = !searchSchoolQuery || 
        s.nomeEscola.toLowerCase().includes(searchSchoolQuery.toLowerCase()) ||
        s.codesc.toLowerCase().includes(searchSchoolQuery.toLowerCase()) ||
        s.id.toLowerCase().includes(searchSchoolQuery.toLowerCase());
      return matchSre && matchMun && matchSearch;
    });
  }, [solicitacoes, sreFilter, selectedMunicipio, searchSchoolQuery]);

  // Statistics calculation on filtered data
  const stats = useMemo(() => {
    const totalCount = filteredSolicitacoes.length;
    
    // Stage counts
    const cadastroCount = filteredSolicitacoes.filter(s => s.etapaAtual === 'cadastro' || s.etapaAtual === 'correcao').length;
    const analiseCount = filteredSolicitacoes.filter(s => s.etapaAtual === 'analise').length;
    const pafAutorizacaoCount = filteredSolicitacoes.filter(s => s.etapaAtual === 'paf_autorizacao').length;
    const pafCount = filteredSolicitacoes.filter(s => s.etapaAtual === 'paf').length;
    const ordemInicioCount = filteredSolicitacoes.filter(s => s.etapaAtual === 'ordem_inicio').length;
    const execucaoCount = filteredSolicitacoes.filter(s => s.etapaAtual === 'execucao').length;
    const canceladoCount = filteredSolicitacoes.filter(s => s.etapaAtual === 'cancelado').length;

    // Financial calculations
    const totalPlannedValue = filteredSolicitacoes.reduce((acc, curr) => acc + (curr.valorPlanilha || 0), 0);
    const totalApprovedValue = filteredSolicitacoes.reduce((acc, curr) => acc + (curr.valorHomologado || curr.valorHomologadoContratacao || 0), 0);
    
    // Measured value
    const totalMeasuredValue = filteredSolicitacoes.reduce((acc, curr) => {
      const medSum = curr.medicoes?.reduce((sum, item) => sum + (item.valor || 0), 0) || 0;
      return acc + medSum;
    }, 0);

    return {
      totalCount,
      cadastroCount,
      analiseCount,
      pafAutorizacaoCount,
      pafCount,
      ordemInicioCount,
      execucaoCount,
      canceladoCount,
      totalPlannedValue,
      totalApprovedValue,
      totalMeasuredValue
    };
  }, [filteredSolicitacoes]);

  // SRE allocations calculation for custom mini SRE Bar Chart
  const sreAllocations = useMemo(() => {
    const map: { [key: string]: { count: number, value: number } } = {};
    filteredSolicitacoes.forEach(s => {
      if (!map[s.sre]) {
        map[s.sre] = { count: 0, value: 0 };
      }
      map[s.sre].count += 1;
      map[s.sre].value += s.valorPlanilha || 0;
    });

    return Object.entries(map).map(([sreName, entry]) => ({
      sre: sreName,
      ...entry
    })).sort((a, b) => b.value - a.value);
  }, [filteredSolicitacoes]);

  // Format currencies
  const formatBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Stage timeline helper percentages
  const getPercentageOfTotal = (count: number) => {
    if (stats.totalCount === 0) return 3;
    return Math.max(3, Math.round((count / stats.totalCount) * 100));
  };

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      
      {/* SEÇÃO DO BANNER SUPERIOR INFORMATIVO */}
      <div className="bg-gradient-to-r from-[#17336b] to-[#254ea3] text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/35 border border-blue-400/40 text-[9px] font-bold text-blue-200 uppercase tracking-widest rounded">
            📊 PAINEL ANALÍTICO CONSOLIDADO
          </div>
          <h2 className="text-xl font-extrabold tracking-tight font-sans">
            Visão Geral do Portfólio de Obras
          </h2>
          <p className="text-xs text-blue-250 font-medium max-w-xl block text-slate-100">
            Acompanhe indicadores gerais de contratos de infraestrutura, liberação de parcelas pelo PAF, distribuição de aportes financeiros por Regionais (SRE) e gargalos de fluxo de engenharia.
          </p>
        </div>

        {/* CONTROLES RÁPIDOS NO BANNER */}
        <div className="flex flex-wrap gap-2 text-slate-800 self-stretch md:self-auto justify-end">
          <div className="bg-white/10 backdrop-blur-md p-1 rounded-xl border border-white/10 flex items-center gap-1">
            <span className="text-[10px] text-white font-bold ml-1.5 uppercase tracking-wide">Filtros Dashboard:</span>
            <button 
              onClick={() => {
                setSreFilter('todos');
                setSelectedMunicipio('todos');
                setSearchSchoolQuery('');
              }}
              className="text-[10px] bg-white/20 text-white font-extrabold hover:bg-white/35 transition px-2 py-1 rounded"
            >
              Resetar Visão
            </button>
          </div>
        </div>
      </div>

      {/* BENTO GRID DE METRICAS FINANCEIRAS E QUANTITATIVAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-205 shadow-3xs flex items-center gap-4 hover:border-blue-250 transition-all duration-300">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <HardHat className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Total de Demandas</span>
            <span className="text-2xl font-bold font-mono text-slate-800 block mt-1">
              {stats.totalCount}
            </span>
            <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-indigo-505 bg-indigo-500"></span>
              {stats.execucaoCount} obras em execução física
            </span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-205 shadow-3xs flex items-center gap-4 hover:border-blue-250 transition-all duration-300">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Investimento Planejado</span>
            <span className="text-lg font-bold font-mono text-slate-800 block mt-1.5">
              {formatBRL(stats.totalPlannedValue)}
            </span>
            <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
              Custo médio: {formatBRL(stats.totalCount > 0 ? stats.totalPlannedValue / stats.totalCount : 0)} / obra
            </span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-205 shadow-3xs flex items-center gap-4 hover:border-blue-250 transition-all duration-300">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Total Homologado</span>
            <span className="text-lg font-bold font-mono text-slate-800 block mt-1.5">
              {formatBRL(stats.totalApprovedValue)}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
              {stats.totalPlannedValue > 0 ? Math.round((stats.totalApprovedValue / stats.totalPlannedValue) * 100) : 0}% de conversão PAF
            </span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-205 shadow-3xs flex items-center gap-4 hover:border-blue-250 transition-all duration-300">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Recursos Medidos / Pagos</span>
            <span className="text-lg font-bold font-mono text-slate-800 block mt-1.5">
              {formatBRL(stats.totalMeasuredValue)}
            </span>
            <span className="text-[10px] text-purple-600 font-bold block mt-0.5 flex items-center gap-1">
              <span>{stats.totalApprovedValue > 0 ? Math.round((stats.totalMeasuredValue / stats.totalApprovedValue) * 100) : 0}% desemboço financeiro</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA 1 & 2: CONTRATOS POR ETAPA DO FLUXO E APORTES */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* PAINEL DE GARGALOS E REPARTIÇÃO POR ETAPA (CHART DE FUNIL) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 font-sans">
                  Repartição das Obras por Etapa do Fluxo
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Quantidade de escolas paradas em cada portão regulatório</p>
              </div>
              <span className="text-[10px] bg-indigo-50 text-indigo-705 px-2 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
                Portões SGO
              </span>
            </div>

            <div className="space-y-3">
              {/* ETAPA 1: CADASTRO */}
              <div 
                className="group cursor-pointer" 
                onClick={() => onNavigateToSubTask('cadastro')}
                title="Ir para Atendimento Inicial"
              >
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1 group-hover:text-blue-600 transition-colors">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-blue-500 block"></span>
                    1. Atendimento Inicial & Checklist
                  </span>
                  <span className="font-mono font-bold">
                    {stats.cadastroCount} {stats.cadastroCount === 1 ? 'escola' : 'escolas'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-6.5 rounded-lg overflow-hidden flex relative items-center px-2 group-hover:bg-slate-200/50 transition-all">
                  <div 
                    className="bg-blue-500 h-full absolute left-0 top-0 rounded-l-lg transition-all duration-300"
                    style={{ width: `${getPercentageOfTotal(stats.cadastroCount)}%` }}
                  />
                  <span className="text-[10px] text-slate-705 font-black z-10 block ml-0.5">
                    {getPercentageOfTotal(stats.cadastroCount)}%
                  </span>
                </div>
              </div>

              {/* ETAPA 2: ANALISE TÉCNICA */}
              <div 
                className="group cursor-pointer" 
                onClick={() => onNavigateToSubTask('analise')}
                title="Ir para Análise Técnica"
              >
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1 group-hover:text-indigo-600 transition-colors">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-indigo-500 block"></span>
                    2. Análise Técnica DORE (Engenharia)
                  </span>
                  <span className="font-mono font-bold">
                    {stats.analiseCount} {stats.analiseCount === 1 ? 'escola' : 'escolas'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-6.5 rounded-lg overflow-hidden flex relative items-center px-2 group-hover:bg-slate-200/50 transition-all">
                  <div 
                    className="bg-indigo-500 h-full absolute left-0 top-0 rounded-l-lg transition-all duration-300"
                    style={{ width: `${getPercentageOfTotal(stats.analiseCount)}%` }}
                  />
                  <span className="text-[10px] text-slate-700 font-black z-10 block ml-0.5">
                    {getPercentageOfTotal(stats.analiseCount)}%
                  </span>
                </div>
              </div>

              {/* ETAPA 3: AUTORIZACAO DO PAF */}
              <div 
                className="group cursor-pointer" 
                onClick={() => onNavigateToSubTask('paf_autorizacao')}
                title="Ir para Autorizações SGO"
              >
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1 group-hover:text-cyan-600 transition-colors">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-cyan-500 block"></span>
                    3. Autorização SGO (Financeiro)
                  </span>
                  <span className="font-mono font-bold">
                    {stats.pafAutorizacaoCount} {stats.pafAutorizacaoCount === 1 ? 'escola' : 'escolas'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-6.5 rounded-lg overflow-hidden flex relative items-center px-2 group-hover:bg-slate-200/50 transition-all">
                  <div 
                    className="bg-cyan-500 h-full absolute left-0 top-0 rounded-l-lg transition-all duration-300"
                    style={{ width: `${getPercentageOfTotal(stats.pafAutorizacaoCount)}%` }}
                  />
                  <span className="text-[10px] text-slate-700 font-black z-10 block ml-0.5">
                    {getPercentageOfTotal(stats.pafAutorizacaoCount)}%
                  </span>
                </div>
              </div>

              {/* ETAPA 4: GERACAO DO PAF */}
              <div 
                className="group cursor-pointer" 
                onClick={() => onNavigateToSubTask('paf')}
                title="Ir para Geração de PAF"
              >
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1 group-hover:text-purple-600 transition-colors">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-purple-500 block"></span>
                    4. Homologação / Faturamento do PAF
                  </span>
                  <span className="font-mono font-bold">
                    {stats.pafCount} {stats.pafCount === 1 ? 'escola' : 'escolas'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-6.5 rounded-lg overflow-hidden flex relative items-center px-2 group-hover:bg-slate-200/50 transition-all">
                  <div 
                    className="bg-purple-500 h-full absolute left-0 top-0 rounded-l-lg transition-all duration-300"
                    style={{ width: `${getPercentageOfTotal(stats.pafCount)}%` }}
                  />
                  <span className="text-[10px] text-slate-755 font-black z-10 block ml-0.5">
                    {getPercentageOfTotal(stats.pafCount)}%
                  </span>
                </div>
              </div>

              {/* ETAPA 5 & 6: ORDEM INICIO E MEDICÕES */}
              <div 
                className="group cursor-pointer" 
                onClick={() => onNavigateToSubTask('execucao')}
                title="Ir para Execução/Medições"
              >
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1 group-hover:text-emerald-600 transition-colors">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500 block"></span>
                    5 & 6. Ordem de Início / Execução Física
                  </span>
                  <span className="font-mono font-bold">
                    {stats.ordemInicioCount + stats.execucaoCount} { (stats.ordemInicioCount + stats.execucaoCount) === 1 ? 'escola' : 'escolas' }
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-6.5 rounded-lg overflow-hidden flex relative items-center px-2 group-hover:bg-slate-200/50 transition-all">
                  <div 
                    className="bg-emerald-500 h-full absolute left-0 top-0 rounded-l-lg transition-all duration-300"
                    style={{ width: `${getPercentageOfTotal(stats.ordemInicioCount + stats.execucaoCount)}%` }}
                  />
                  <span className="text-[10px] text-slate-755 font-black z-10 block ml-0.5">
                    {getPercentageOfTotal(stats.ordemInicioCount + stats.execucaoCount)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-start gap-3">
              <AlertCircle className="w-4.5 h-4.5 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-slate-800">Dica de Navegação SGO:</span>
                <p className="text-slate-500 mt-0.5 leading-relaxed">
                  Clique diretamente em qualquer uma das barras acima para ir para o fluxo operacional do respectivo portão de análise técnica de obras.
                </p>
              </div>
            </div>
          </div>

          {/* HISTOGRAMA / MINI GRAFICO DE INVESTMENT POR REGIONAL (SRE) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 font-sans">
                Aportes Financeiros de Obras por Regional (SRE)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Análise financeira consolidada dos orçamentos planilhados por Superintendência Regional</p>
            </div>

            <div className="space-y-3 pt-1">
              {sreAllocations.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 font-medium">Nenhuma regional com dados de orçamento no momento.</div>
              ) : (
                sreAllocations.map((item, idx) => {
                  const maxVal = Math.max(...sreAllocations.map(s => s.value), 1);
                  const widthPercent = Math.max(4, Math.round((item.value / maxVal) * 100));
                  return (
                    <div key={item.sre} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-bold font-mono">#{idx+1}</span>
                          {item.sre}
                        </span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-[10.5px] font-bold text-slate-800">{formatBRL(item.value)}</span>
                          <span className="text-[9.5px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded font-extrabold border border-slate-200/50">
                            {item.count} {item.count === 1 ? 'escola' : 'escolas'}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-50 h-3 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-660 bg-blue-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* COLUNA 3: EXPLORADOR DE ESCOLAS & FILTRO DE LISTAS INTEGRADO */}
        <div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col h-full min-h-[500px]">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800 font-sans flex items-center gap-1.5">
                <Building2 className="w-4.5 h-4.5 text-blue-605 text-blue-605 text-blue-600 shrink-0" />
                Explorador de Escolas das Regionais
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Selecione escolas pelo filtro de listas abaixo para acompanhar os processos.</p>
            </div>

            {/* SELETORES GERAIS - FILTRO DE LISTAS */}
            <div className="space-y-3">
              {/* SRE Filter list select */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Filtrar Regional (SRE):</label>
                <select
                  value={sreFilter}
                  onChange={(e) => setSreFilter(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg py-2 px-2 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white font-bold text-slate-700 cursor-pointer"
                >
                  <option value="todos">Todas as Regionais (Sem Filtro)</option>
                  {sresDisponiveis.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Municipio Filter list select */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Filtrar Município:</label>
                <select
                  value={selectedMunicipio}
                  onChange={(e) => setSelectedMunicipio(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg py-2 px-2 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white font-bold text-slate-700 cursor-pointer"
                >
                  <option value="todos">Todos os Municípios (Sem Filtro)</option>
                  {municipiosDisponiveis.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Text School Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Escreva para buscar CODESC/Escola..."
                  value={searchSchoolQuery}
                  onChange={(e) => setSearchSchoolQuery(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg py-2 pl-8 pr-3 focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-medium outline-hidden placeholder-slate-400"
                />
              </div>
            </div>

            {/* LISTA DE MATRICULAS / CHECKLIST DE ESCOLAS ENCONTRADAS */}
            <div className="flex-1 overflow-y-auto max-h-[380px] divide-y divide-slate-105 pr-1 text-slate-700">
              {filteredSolicitacoes.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-405 font-semibold font-sans">
                  Nenhuma escola encontrada com esses filtros de busca.
                </div>
              ) : (
                filteredSolicitacoes.map(s => {
                  // Get colorful badge for current progress
                  const getEtapaLabelAndColor = (etapa: string) => {
                    switch(etapa) {
                      case 'cadastro': return { label: 'Cadastro', css: 'bg-slate-100 text-slate-700 border-slate-200' };
                      case 'correcao': return { label: 'Correção', css: 'bg-orange-50 text-orange-700 border-orange-200' };
                      case 'analise': return { label: 'Análise', css: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
                      case 'paf_autorizacao': return { label: 'Autorização', css: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
                      case 'paf': return { label: 'Geração PAF', css: 'bg-purple-50 text-purple-700 border-purple-200' };
                      case 'ordem_inicio': return { label: 'Ordem Înicio', css: 'bg-blue-50 text-blue-700 border-blue-200' };
                      case 'execucao': return { label: 'Execução', css: 'bg-emerald-50 text-emerald-700 border-emerald-250' };
                      case 'cancelado': return { label: 'Cancelado', css: 'bg-red-50 text-red-750 border-red-200' };
                      default: return { label: etapa, css: 'bg-slate-100 text-slate-700 border-slate-200' };
                    }
                  };
                  const badge = getEtapaLabelAndColor(s.etapaAtual);

                  return (
                    <div 
                      key={s.id} 
                      onClick={() => onSelectSchool(s)}
                      className="py-2.5 flex flex-col gap-1 hover:bg-slate-50/75 px-1 rounded-md transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-extrabold text-[#112347] text-[11.5px] leading-tight group-hover:text-blue-700 transition-colors">
                          {s.nomeEscola}
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-slate-100 px-1 rounded shrink-0 border border-slate-200">
                          {s.id}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5 font-medium">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-405 shrink-0" />
                          <span>{s.municipio} ({s.sre})</span>
                        </span>
                        <span className="font-mono">{s.codesc}</span>
                      </div>

                      <div className="flex items-center justify-between gap-1.5 mt-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${badge.css}`}>
                            {badge.label}
                          </span>
                          <span className="text-[10.5px] font-semibold text-slate-800 font-mono">
                            {formatBRL(s.valorPlanilha || 0)}
                          </span>
                        </div>
                        <span className="text-[9.5px] text-blue-600 hover:underline font-extrabold flex items-center gap-0.5  transition-all leading-none">
                          Abrir Pastas <ArrowUpRight className="w-3.5 h-3.5 inline" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="bg-blue-50/30 p-2.5 rounded-xl border border-slate-100 text-[10.5px] text-slate-500 leading-tight">
              Mostrando <strong className="text-slate-700">{filteredSolicitacoes.length} de {solicitacoes.length}</strong> escolas registradas na base. Use este filtro de listas para encontrar no SGO.
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
