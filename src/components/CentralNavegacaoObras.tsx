import React, { useState, useMemo } from 'react';
import {
  Building2, ClipboardList, HardHat, Layers, Calculator, Plus, UploadCloud,
  Search, CheckCircle, AlertTriangle, User, ArrowRight, Filter, Target,
  DollarSign, Navigation, Crosshair
} from 'lucide-react';
import { Solicitacao, PerfilUsuario, computeStatusObra } from '../types';

interface Props {
  solicitacoes: Solicitacao[];
  perfilUsuario: PerfilUsuario;
  setActiveSubTask: (subTask: string) => void;
}

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function CentralNavegacaoObras({ solicitacoes, perfilUsuario, setActiveSubTask }: Props) {
  const [focoId, setFocoId] = useState<string | null>(null);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroId, setFiltroId] = useState('');
  const [filtroCodesc, setFiltroCodesc] = useState('');
  const [filtroMunicipio, setFiltroMunicipio] = useState('');
  const [filtroSre, setFiltroSre] = useState('');
  const [filtroFiscal, setFiltroFiscal] = useState('');
  const [apenasContratacao, setApenasContratacao] = useState(false);

  const obras = useMemo(
    () => solicitacoes.filter(s => s.etapaAtual === 'ordem_inicio' || s.etapaAtual === 'execucao'),
    [solicitacoes]
  );

  const stats = useMemo(() => ({
    total: obras.length,
    contratacao: obras.filter(s => ['Em cadastramento da obra', 'Em processo de contratação'].includes(computeStatusObra(s).label)).length,
    emExecucao: obras.filter(s => computeStatusObra(s).label === 'Em execução').length,
    paralisadas: obras.filter(s => computeStatusObra(s).label === 'Paralisada' || s.statusContratoEmpresa === 'Distratada').length,
    concluidas: obras.filter(s => computeStatusObra(s).label === 'Concluída').length,
    orcamento: obras.reduce((acc, s) => acc + (s.valorPlanilha || s.valorHomologadoContratacao || 0), 0),
    escolas: new Set(obras.map(s => s.nomeEscola)).size,
  }), [obras]);

  const obrasFiltradas = useMemo(() => {
    return obras.filter(s => {
      const q = filtroTexto.toLowerCase();
      const texto = !filtroTexto ||
        s.nomeEscola.toLowerCase().includes(q) ||
        s.municipio.toLowerCase().includes(q) ||
        s.sre.toLowerCase().includes(q) ||
        (s.empresaContratada || '').toLowerCase().includes(q);
      const id = !filtroId || s.id.toLowerCase().includes(filtroId.toLowerCase());
      const codesc = !filtroCodesc || s.codesc.includes(filtroCodesc);
      const municipio = !filtroMunicipio || s.municipio.toLowerCase().includes(filtroMunicipio.toLowerCase());
      const sre = !filtroSre || s.sre.toLowerCase().includes(filtroSre.toLowerCase());
      const fiscal = !filtroFiscal || (s.fiscalObraAtribuido || '').toLowerCase().includes(filtroFiscal.toLowerCase());
      const contratacao = !apenasContratacao || !s.empresaContratada;
      return texto && id && codesc && municipio && sre && fiscal && contratacao;
    });
  }, [obras, filtroTexto, filtroId, filtroCodesc, filtroMunicipio, filtroSre, filtroFiscal, apenasContratacao]);

  const obraFoco = obrasFiltradas.find(s => s.id === focoId) || null;

  const getStatusInfo = (sol: Solicitacao) => {
    if (sol.statusContratoEmpresa === 'Distratada')
      return { label: 'Distratada', cls: 'bg-orange-100 text-orange-700 border-orange-200' };
    const s = computeStatusObra(sol);
    return { label: s.label, cls: s.badgeClass };
  };

  const navCards = [
    {
      id: 'execucao_cadastro',
      label: 'Cadastro / Dossê',
      desc: 'Visualize o dossê básico da obra ou edite os dados cadastrais.',
      icon: Building2,
      link: 'ACESSAR CADASTRO →',
      titleColor: 'text-blue-700',
    },
    {
      id: 'execucao_contratos',
      label: 'Contratos & Distratos',
      desc: 'Configure valor contratado, dados de vigência, garantias e distratos.',
      icon: ClipboardList,
      link: 'ACESSAR CONTRATO →',
      titleColor: 'text-blue-700',
    },
    {
      id: 'execucao_acompanhamento',
      label: 'Ordem e Acompanhamento',
      desc: 'Emita a Ordem de Início, acompanhe cronograma, vistorias e status.',
      icon: HardHat,
      link: 'ACESSAR ORDEM →',
      titleColor: 'text-orange-600',
    },
    {
      id: 'execucao_medicoes',
      label: 'Medições Físicas',
      desc: 'Registre faturamento e avanços medidos pelo fiscal local de engenharia.',
      icon: Layers,
      link: 'ACESSAR MEDIÇÃO →',
      titleColor: 'text-blue-700',
    },
    {
      id: 'execucao_ajustes',
      label: 'Ajuste de Planilha',
      desc: 'Efetue modificações técnicas de planilha com ou sem alteração de meta.',
      icon: Calculator,
      link: 'ACESSAR AJUSTES →',
      titleColor: 'text-red-600',
    },
    {
      id: 'execucao_aditivos',
      label: 'Termos Aditivos',
      desc: 'Cadastre novos aditivos legais de acréscimo de valor ou prazo da obra.',
      icon: Plus,
      link: 'ACESSAR ADITIVOS →',
      titleColor: 'text-green-700',
    },
    {
      id: 'execucao_acompanhamento',
      label: 'Atribuir Fiscal & Diário',
      desc: 'Atribua engenheiros da DORE e adicione relatos do Diário de Obras.',
      icon: User,
      link: 'ACESSAR FISCALIZAÇÃO →',
      titleColor: 'text-blue-700',
    },
    {
      id: 'execucao_documentos',
      label: 'Documentação (GED)',
      desc: 'Envie de forma persistente arquivos, fotos de campo, laudos e termos.',
      icon: UploadCloud,
      link: 'ACESSAR GED →',
      titleColor: 'text-blue-700',
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto bg-slate-50">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-sans">
              Módulo Físico-Financeiro
            </span>
            <span className="text-slate-300 text-[10px]">›</span>
            <span className="text-[10px] font-bold text-slate-400 font-sans">Porta 3000</span>
            <span className="text-slate-300 text-[10px]">›</span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              SGO Ativo
            </span>
          </div>
          <h2 className="text-2xl font-black text-[#13264d] tracking-tight flex items-center gap-2">
            <Navigation className="w-6 h-6 text-blue-500" />
            Central de Navegação de Obras
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-sans">
            Visualização exclusiva por subunidades em conformidade com o cronograma pactuado de obras escolares.
          </p>
        </div>
        <div className="flex gap-4 shrink-0">
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-sans">Obras Ativas</p>
            <p className="text-lg font-black text-[#13264d]">{stats.escolas} <span className="text-xs font-bold text-slate-500">Escolas</span></p>
          </div>
          <div className="text-right border-l border-slate-200 pl-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-sans">Orçamento Alocado</p>
            <p className="text-lg font-black text-[#13264d]">{formatCurrency(stats.orcamento)}</p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-5 gap-3">
        {[
          {
            label: 'Total de Obras',
            value: stats.total,
            sub: 'Todas as obras pós-PAF',
            color: 'border-slate-300',
            valueColor: 'text-[#13264d]',
            icon: Building2,
            iconColor: 'text-slate-400',
          },
          {
            label: 'Contratação',
            value: stats.contratacao,
            sub: 'Pendente de contrato',
            color: 'border-yellow-400',
            valueColor: 'text-yellow-600',
            icon: ClipboardList,
            iconColor: 'text-yellow-400',
          },
          {
            label: 'Em Execução',
            value: stats.emExecucao,
            sub: 'Em andamento físico',
            color: 'border-blue-400',
            valueColor: 'text-blue-600',
            icon: HardHat,
            iconColor: 'text-blue-400',
          },
          {
            label: 'Paralisadas',
            value: stats.paralisadas,
            sub: 'Paralisadas / Distratadas',
            color: 'border-orange-400',
            valueColor: 'text-orange-600',
            icon: AlertTriangle,
            iconColor: 'text-orange-400',
          },
          {
            label: 'Concluídas',
            value: stats.concluidas,
            sub: 'Prontas para Recebimento',
            color: 'border-green-400',
            valueColor: 'text-green-600',
            icon: CheckCircle,
            iconColor: 'text-green-400',
          },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`bg-white rounded-xl border-t-4 ${card.color} shadow-sm p-4 flex flex-col gap-1`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-sans">{card.label}</span>
                <Icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
              <p className={`text-3xl font-black ${card.valueColor}`}>{card.value}</p>
              <p className="text-[10px] text-slate-400 font-sans">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-sans">
            Filtros de Pesquisa e Refinamento de Busca
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="relative col-span-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-sans bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="Busca Rápida Geral (Termo, Escola ou SRE)"
              value={filtroTexto}
              onChange={e => setFiltroTexto(e.target.value)}
            />
          </div>
          <input
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-sans bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="ID da Obra (Selecione ou Escreva)"
            value={filtroId}
            onChange={e => setFiltroId(e.target.value)}
          />
          <input
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-sans bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="CODESC (Selecione ou Escreva)"
            value={filtroCodesc}
            onChange={e => setFiltroCodesc(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-4 gap-3 items-center">
          <input
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-sans bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="Município (Selecione ou Escreva)"
            value={filtroMunicipio}
            onChange={e => setFiltroMunicipio(e.target.value)}
          />
          <input
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-sans bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="Regional - SRE (Selecione ou Escreva)"
            value={filtroSre}
            onChange={e => setFiltroSre(e.target.value)}
          />
          <input
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-sans bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="Fiscal Responsável (Selecione/Escreva)"
            value={filtroFiscal}
            onChange={e => setFiltroFiscal(e.target.value)}
          />
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={apenasContratacao}
              onChange={e => setApenasContratacao(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-400"
            />
            <span className="text-xs font-bold text-orange-600 font-sans flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Obras em Contratação
            </span>
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 font-sans">
              Relação de Obras Escolares e Execução
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-sans">
            {obrasFiltradas.length} {obrasFiltradas.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {obrasFiltradas.length === 0 ? (
          <div className="py-12 text-center">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400 font-sans">Nenhuma obra encontrada com os filtros aplicados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['ID da Obra', 'Codesc', 'Município', 'Regional (SRE)', 'Escola', 'Responsável (Fiscal)', 'Status', 'Foco e Avanço'].map(col => (
                    <th key={col} className="px-3 py-2 text-left text-[9px] font-black uppercase tracking-widest text-slate-400 font-sans whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {obrasFiltradas.map(sol => {
                  const status = getStatusInfo(sol);
                  const isFocado = focoId === sol.id;
                  return (
                    <tr key={sol.id} className={`transition-colors ${isFocado ? 'bg-blue-50/60' : 'hover:bg-slate-50/70'}`}>
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-bold text-blue-700 font-mono">{sol.id}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-slate-600 font-mono">{sol.codesc}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-slate-700 font-sans">{sol.municipio}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-bold text-blue-700 font-sans">{sol.sre}</span>
                      </td>
                      <td className="px-3 py-2.5 max-w-[200px]">
                        <p className="text-xs font-bold text-slate-800 font-sans leading-tight truncate">{sol.nomeEscola}</p>
                        <p className="text-[10px] text-slate-400 font-sans truncate">{sol.tipo}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        {sol.fiscalObraAtribuido ? (
                          <span className="flex items-center gap-1 text-xs text-slate-700 font-sans">
                            <User className="w-3 h-3 text-slate-400" />
                            {sol.fiscalObraAtribuido}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 font-sans">
                            <AlertTriangle className="w-3 h-3" />
                            Aguardando Fiscal
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${status.cls} font-sans`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setFocoId(isFocado ? null : sol.id)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all font-sans ${
                              isFocado
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600'
                            }`}
                          >
                            <Crosshair className="w-3 h-3" />
                            {isFocado ? 'Focado' : 'Focar'}
                          </button>
                          <button
                            onClick={() => setActiveSubTask('execucao_acompanhamento')}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-[#13264d] text-white border border-[#13264d] hover:bg-[#1a3a6e] transition-all font-sans"
                          >
                            Avanço
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Focused panel */}
      {obraFoco && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-md overflow-hidden">
          <div className="px-5 py-3 bg-gradient-to-r from-slate-800 to-[#13264d] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-300 font-sans">Em Foco Técnico</span>
                <span className="text-[9px] text-slate-400 font-mono">ID: {obraFoco.id}</span>
                <span className="text-[9px] text-slate-400 font-mono">• CODESC: {obraFoco.codesc}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-right">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-sans">Planilha SGO</p>
                <p className="text-sm font-black text-white">{formatCurrency(obraFoco.valorPlanilha || obraFoco.valorHomologadoContratacao || 0)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-sans">Fiscal Atribuído</p>
                <p className="text-sm font-black text-white">{obraFoco.fiscalObraAtribuido || 'Sem Fiscal Técnico'}</p>
              </div>
            </div>
          </div>

          <div className="px-5 py-3 border-b border-slate-100">
            <h3 className="text-lg font-black text-[#13264d]">{obraFoco.nomeEscola}</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">
              Empreendimento: {obraFoco.tipo} • {obraFoco.municipio} / {obraFoco.sre}
            </p>
          </div>

          <div className="px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 font-sans flex items-center gap-1.5">
              <Navigation className="w-3 h-3 text-blue-400" />
              Navegue Instantaneamente Mantendo o Foco Ativo Sobre a Obra:
            </p>
            <div className="grid grid-cols-4 gap-3">
              {navCards.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <button
                    key={`${card.id}-${idx}`}
                    onClick={() => setActiveSubTask(card.id)}
                    className="text-left bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl p-3.5 transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
                      <span className={`text-xs font-black ${card.titleColor} font-sans leading-tight`}>{card.label}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-sans leading-relaxed mb-2">{card.desc}</p>
                    <span className="text-[9px] font-black text-blue-600 group-hover:text-blue-700 font-sans tracking-wide uppercase">
                      {card.link}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
