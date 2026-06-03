import React, { useState } from 'react';
import { 
  Bell, FileClock, Search, Check, Trash, Filter, ShieldCheck, 
  AlertCircle, XCircle, ExternalLink, RefreshCw, SlidersHorizontal, 
  CheckCircle, ArrowRight, User, Terminal
} from 'lucide-react';
import { Notificacao, SistemaLog, Solicitacao, PerfilUsuario } from '../types';

interface CentralNotificacoesLogsProps {
  notifications: Notificacao[];
  logs: SistemaLog[];
  solicitacoes: Solicitacao[];
  perfilUsuario: PerfilUsuario;
  onSelectSolicitacao: (id: string, subTask?: string) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearNotifications: () => void;
  onAddSimulatedLog: (action: string, detail: string, tipo: 'info' | 'sucesso' | 'alerta' | 'erro') => void;
}

export default function CentralNotificacoesLogs({
  notifications,
  logs,
  solicitacoes,
  perfilUsuario,
  onSelectSolicitacao,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearNotifications,
  onAddSimulatedLog
}: CentralNotificacoesLogsProps) {
  const [activeTab, setActiveTab] = useState<'notifications' | 'logs'>('notifications');
  
  // Notification filters
  const [notifFilterType, setNotifFilterType] = useState<string>('all');
  const [notifSearch, setNotifSearch] = useState('');

  // Log filters
  const [logFilterSeverity, setLogFilterSeverity] = useState<string>('all');
  const [logFilterUser, setLogFilterUser] = useState<string>('all');
  const [logSearch, setLogSearch] = useState('');

  // Simulated log input
  const [simLogAcao, setSimLogAcao] = useState('');
  const [simLogDetalhes, setSimLogDetalhes] = useState('');
  const [simLogTipo, setSimLogTipo] = useState<'info' | 'sucesso' | 'alerta' | 'erro'>('info');

  const getPerfilNome = (perf: PerfilUsuario) => {
    switch (perf) {
      case 'tecnico_infra': return 'João Paulo (Técnico SRE)';
      case 'gestor_dore': return 'Aline Davino (Gestor DORE)';
      case 'analista_dore': return 'Flavia Borges (Analista DORE)';
      case 'gestor_paf': return 'Silas Fagundes (Gestor PAF)';
      case 'fiscal_obra': return 'Insp. Mariana Souza (Fiscal)';
      case 'administrativo_dore': return 'Rui Lages (Administrativo)';
      default: return 'Usuário do Sistema';
    }
  };

  // Filtered Notifications
  const filteredNotifs = notifications.filter(n => {
    const matchesSearch = n.titulo.toLowerCase().includes(notifSearch.toLowerCase()) || 
                          n.mensagem.toLowerCase().includes(notifSearch.toLowerCase()) ||
                          (n.escola || '').toLowerCase().includes(notifSearch.toLowerCase());
    
    if (notifFilterType === 'unread') return matchesSearch && !n.lida;
    if (notifFilterType === 'read') return matchesSearch && n.lida;
    if (notifFilterType === 'processos') return matchesSearch && (n.tipo === 'processo_avanco' || n.tipo === 'processo_retrocesso');
    if (notifFilterType === 'alteracoes') return matchesSearch && (n.tipo === 'aditivo_pendente' || n.tipo === 'ajuste_pendente');
    return matchesSearch;
  });

  // Filtered Logs
  const filteredLogs = logs.filter(l => {
    const matchesSearch = l.acao.toLowerCase().includes(logSearch.toLowerCase()) || 
                          l.detalhe.toLowerCase().includes(logSearch.toLowerCase()) ||
                          l.usuario.toLowerCase().includes(logSearch.toLowerCase()) ||
                          (l.escola || '').toLowerCase().includes(logSearch.toLowerCase());
    
    const matchesSeverity = logFilterSeverity === 'all' || l.tipo === logFilterSeverity;
    
    const matchesUser = logFilterUser === 'all' || 
                        (logFilterUser === 'fiscal' && l.perfil.toLowerCase().includes('fiscal')) ||
                        (logFilterUser === 'analista' && l.perfil.toLowerCase().includes('analista')) ||
                        (logFilterUser === 'gestor' && l.perfil.toLowerCase().includes('gestor')) ||
                        (logFilterUser === 'tecnico' && l.perfil.toLowerCase().includes('técnico'));

    return matchesSearch && matchesSeverity && matchesUser;
  });

  const handleCreateSimulatedLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simLogAcao || !simLogDetalhes) {
      alert('Por favor, defina a Ação e os Detalhes do Log.');
      return;
    }
    onAddSimulatedLog(simLogAcao, simLogDetalhes, simLogTipo);
    setSimLogAcao('');
    setSimLogDetalhes('');
    alert('Log de simulação registrado e replicado com sucesso!');
  };

  const formatIsoDate = (isoStr: string) => {
    try {
      const dt = new Date(isoStr);
      return dt.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  const getNotifIconBg = (tipo: string) => {
    switch (tipo) {
      case 'processo_avanco': return 'bg-emerald-50 text-emerald-600 border border-emerald-120';
      case 'processo_retrocesso': return 'bg-rose-50 text-rose-600 border border-rose-120';
      case 'aditivo_pendente': return 'bg-indigo-50 text-indigo-600 border border-indigo-120';
      case 'ajuste_pendente': return 'bg-amber-50 text-amber-600 border border-amber-120';
      case 'alerta': return 'bg-red-50 text-red-600 border border-red-120';
      default: return 'bg-slate-50 text-slate-600 border border-slate-120';
    }
  };

  const getLogTypeClasses = (tipo: string) => {
    switch (tipo) {
      case 'sucesso': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'erro': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'alerta': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col space-y-6 text-left p-6">
      
      {/* HEADER INTEGRADO COM STATS */}
      <div className="bg-white rounded-2xl border border-slate-205 shadow-3xs p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 border border-blue-100 rounded-xl text-blue-700">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-black text-slate-800 uppercase tracking-wider font-sans leading-none">
                  Central de Notificações, Log & Auditoria SGO
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Acompanhe em tempo real as tramitações de processos, solicitações de aditivos e alterações sistêmicas.
                </p>
              </div>
            </div>
          </div>
          
          {/* STATS RÁPIDOS */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-center min-w-[100px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Pendentes</span>
              <strong className="text-slate-800 text-lg font-black font-sans leading-none">
                {notifications.filter(n => !n.lida).length}
              </strong>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-center min-w-[100px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Logs</span>
              <strong className="text-slate-800 text-lg font-black font-sans leading-none">
                {logs.length}
              </strong>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 text-center min-w-[100px]">
              <span className="text-[10px] uppercase font-bold text-indigo-500 block tracking-wider">Operador</span>
              <strong className="text-indigo-800 text-xs font-bold font-sans line-clamp-1">
                {getPerfilNome(perfilUsuario).split(' (')[0]}
              </strong>
            </div>
          </div>
        </div>

        {/* ABAS DO SISTEMA */}
        <div className="flex border-t border-slate-100 mt-6 pt-4 gap-3">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
              activeTab === 'notifications'
                ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm'
                : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            <Bell className="w-4 h-4" />
            Notificações ({notifications.filter(n => !n.lida).length} não lidas)
          </button>
          
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
              activeTab === 'logs'
                ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm'
                : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            <FileClock className="w-4 h-4" />
            Logs do Sistema ({logs.length} registros)
          </button>
        </div>
      </div>

      {activeTab === 'notifications' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* PAINEL LISTAGEM DE NOTIFICAÇÕES (ESQUERDA 2 COLS) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-202 shadow-2xs overflow-hidden flex flex-col">
              
              {/* FILTROS E BUSCA */}
              <div className="p-4 bg-slate-50 border-b border-slate-150 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <Search className="w-4 h-4 text-slate-400 absolute ml-3" />
                  <input
                    type="text"
                    value={notifSearch}
                    onChange={(e) => setNotifSearch(e.target.value)}
                    placeholder="Filtrar por escola, alteração ou descrição..."
                    className="w-full sm:w-64 text-xs border border-slate-200 rounded-lg pl-9 pr-3 py-2 bg-white text-slate-800 outline-hidden"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-sans hidden sm:inline">Exibir:</span>
                  <select
                    value={notifFilterType}
                    onChange={(e) => setNotifFilterType(e.target.value)}
                    className="text-xs p-2 border border-slate-200 rounded-lg bg-white cursor-pointer font-sans"
                  >
                    <option value="all">Todas as notificações</option>
                    <option value="unread">Não lidas</option>
                    <option value="read">Lidas</option>
                    <option value="processos">Apenas trâmites de processo</option>
                    <option value="alteracoes">Termos de Aditivos e Ajustes</option>
                  </select>
                </div>
              </div>

              {/* CONTROLES RÁPIDOS */}
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-white text-xs">
                <span className="font-medium text-slate-500 font-sans">
                  Mostrando {filteredNotifs.length} de {notifications.length} notificações
                </span>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={onMarkAllAsRead}
                    className="text-blue-600 hover:text-blue-800 font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Marcar todas lidas
                  </button>
                  <span className="text-slate-300">|</span>
                  <button 
                    onClick={onClearNotifications}
                    className="text-slate-500 hover:text-rose-600 font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Trash className="w-3.5 h-3.5" />
                    Limpar lidas
                  </button>
                </div>
              </div>

              {/* LISTA */}
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {filteredNotifs.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 space-y-2">
                    <Bell className="w-8 h-8 mx-auto text-slate-300 animate-bounce" />
                    <p className="text-xs font-semibold">Nenhuma notificação encontrada com os filtros selecionados.</p>
                  </div>
                ) : (
                  filteredNotifs.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`p-5 flex gap-4 hover:bg-slate-50/50 transition-colors relative ${!notif.lida ? 'bg-blue-50/15 border-l-3 border-blue-550' : ''}`}
                    >
                      {/* Círculo indicador / Icone */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${getNotifIconBg(notif.tipo)}`}>
                        <Bell className="w-4 h-4" />
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-extrabold text-slate-800 font-sans flex items-center gap-2">
                            {notif.titulo}
                            {!notif.lida && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping shrink-0" />
                            )}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono font-medium shrink-0">
                            {formatIsoDate(notif.dataHora)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed font-sans">{notif.mensagem}</p>
                        
                        {notif.escola && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                            <span>Escola afetada:</span>
                            <span className="text-slate-700 font-bold bg-slate-50 border border-slate-150 px-1 rounded">{notif.escola}</span>
                          </div>
                        )}

                        {/* Ações Rápidas por Notificação */}
                        <div className="flex items-center gap-3 pt-2">
                          {!notif.lida && (
                            <button
                              onClick={() => onMarkAsRead(notif.id)}
                              className="text-[10px] font-black text-emerald-600 hover:text-emerald-800 transition flex items-center gap-1 cursor-pointer hover:underline"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Marcar como lida
                            </button>
                          )}
                          
                          {notif.solicitacaoId && (
                            <button
                              onClick={() => {
                                // If aditivo/ajuste related, open specific subtasks
                                let st = 'visao_geral';
                                if (notif.tipo === 'aditivo_pendente') st = 'execucao_aditivos';
                                if (notif.tipo === 'ajuste_pendente') st = 'execucao_ajustes';
                                if (notif.tipo === 'processo_retrocesso') st = 'cadastro';
                                onSelectSolicitacao(notif.solicitacaoId, st);
                              }}
                              className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1 cursor-pointer hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Acessar Processo ({notif.solicitacaoId})
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* PAINEL LATERAL INFORMATIVO (DIREITA 1 COL) */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-205 p-6 shadow-3xs space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">
                Como Funciona a Central?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                As notificações são emitidas de forma autônoma para garantir a rastreabilidade técnica governamental do <strong>GESTO/SGO</strong>.
              </p>
              
              <div className="space-y-3 pt-1 text-[11px] font-sans">
                <div className="flex gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-700">Avanços de Etapa:</strong> Notificado quando o dossiê da escola avança para Análise Técnica, PAF ou Execução de Obras.
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-700">Pendências e Retornos:</strong> Alerta imediato se um analista identificar inconformidades documentais no dossiê.
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-700">Solicitações de Aditivo:</strong> Pedidos de modificação física, financeira ou de prazos cadastrados por fiscais.
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-700">Ajustes de Planilha:</strong> Lançamento de compensações financeiras ou reprogramações locais.
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* TABELA DE LOGS (ESQUERDA 3 COLS) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-202 shadow-2xs overflow-hidden flex flex-col">
              
              {/* FILTROS INTEGRADOS PARA OS LOGS */}
              <div className="p-4 bg-slate-50 border-b border-slate-150 flex flex-wrap gap-3 items-center justify-between">
                
                {/* Busca rápida */}
                <div className="w-full md:w-60">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      placeholder="Pesquisar ação, usuário ou descrição..."
                      className="w-full text-xs border border-slate-200 rounded-lg pl-9 pr-3 py-2 bg-white text-slate-800 outline-hidden"
                    />
                  </div>
                </div>

                {/* Filtro gravidade e Alçada */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto md:justify-end">
                  <select
                    value={logFilterSeverity}
                    onChange={(e) => setLogFilterSeverity(e.target.value)}
                    className="text-xs p-2 border border-slate-200 rounded-lg bg-white cursor-pointer font-sans"
                  >
                    <option value="all">Todas as Severidades</option>
                    <option value="sucesso">Sucesso / Conclusão</option>
                    <option value="erro">Erros / Pendências</option>
                    <option value="alerta">Alertas / Cadastros</option>
                    <option value="info">Informações</option>
                  </select>

                  <select
                    value={logFilterUser}
                    onChange={(e) => setLogFilterUser(e.target.value)}
                    className="text-xs p-2 border border-slate-200 rounded-lg bg-white cursor-pointer font-sans"
                  >
                    <option value="all">Todas as Funções</option>
                    <option value="tecnico">Apenas Técnicos SRE</option>
                    <option value="analista">Apenas Analistas DORE</option>
                    <option value="fiscal">Apenas Fiscais de Obra</option>
                    <option value="gestor">Apenas Gestores</option>
                  </select>
                </div>
              </div>

              {/* ESTRUTURA DA TABELA DE LOGS */}
              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-extrabold text-slate-500 uppercase border-b border-slate-150 tracking-wider">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Operador SGO</th>
                      <th className="py-3 px-4">Ação Sistêmica</th>
                      <th className="py-3 px-4">Dossiê/Obra</th>
                      <th className="py-3 px-4">Detalhamento Técnico</th>
                      <th className="py-3 px-4 text-center">Tipo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <Terminal className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          Nenhum registro de log localizado com os filtros inseridos.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition">
                          {/* Data/Hora */}
                          <td className="py-3.5 px-4 font-mono text-[10.5px] text-slate-500 whitespace-nowrap">
                            {formatIsoDate(log.dataHora)}
                          </td>
                          {/* Operador */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="p-1 bg-slate-100 rounded text-slate-600 shrink-0">
                                <User className="w-3.5 h-3.5" />
                              </span>
                              <div>
                                <span className="font-bold text-slate-800 block text-[11px]">{log.usuario}</span>
                                <span className="text-[10px] text-slate-400 block tracking-wide">{log.perfil}</span>
                              </div>
                            </div>
                          </td>
                          {/* Ação */}
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-700 text-[11.5px] block">{log.acao}</span>
                          </td>
                          {/* Obra */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {log.solicitacaoId ? (
                              <div>
                                <span className="font-mono text-[10.5px] font-bold text-indigo-700 block">{log.solicitacaoId}</span>
                                <span className="text-[10px] text-slate-400 block max-w-[130px] truncate" title={log.escola}>{log.escola}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic font-mono">- Geral -</span>
                            )}
                          </td>
                          {/* Detalhe */}
                          <td className="py-3.5 px-4 max-w-[280px]">
                            <p className="text-slate-600 leading-normal text-[11px] text-justify">{log.detalhe}</p>
                          </td>
                          {/* Tipo */}
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded border ${getLogTypeClasses(log.tipo)}`}>
                              {log.tipo}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* FOOTER DA TABELA */}
              <div className="p-4 bg-slate-50 border-t border-slate-150 flex items-center justify-between text-[11px] font-medium text-slate-500">
                <span>Rastreabilidade de auditoria governamental ativa.</span>
                <span className="font-mono text-[10px]">Total de logs carregados: {logs.length}</span>
              </div>
            </div>
          </div>

          {/* PAINEL LATERAL DE CADASTRO SIMULADO DE LOGS (DIREITA 1 COL) */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-[#dbeafe] p-5 shadow-3xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Terminal className="w-5 h-5 text-blue-600" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest font-sans">
                  Registar Ação (Emulador)
                </h3>
              </div>
              
              <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                Para fins de demonstração, você pode emular o registro de novos logs administrativos e testar o refinamento dos filtros de segurança.
              </p>

              <form onSubmit={handleCreateSimulatedLog} className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Ação Sistêmica
                  </label>
                  <input
                    type="text"
                    required
                    value={simLogAcao}
                    onChange={(e) => setSimLogAcao(e.target.value)}
                    placeholder="ex: Alteração de Gestor Responsável"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500 outline-hidden font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Operador Contextual
                  </label>
                  <div className="bg-slate-50 border border-slate-150 rounded-lg p-2.5 text-xs text-slate-600 font-medium font-sans">
                    {getPerfilNome(perfilUsuario)}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Detalhamento Técnico / Log
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={simLogDetalhes}
                    onChange={(e) => setSimLogDetalhes(e.target.value)}
                    placeholder="Evidências do log de simulação..."
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500 outline-hidden font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Classificação / Severidade
                  </label>
                  <select
                    value={simLogTipo}
                    onChange={(e) => setSimLogTipo(e.target.value as any)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white cursor-pointer font-sans"
                  >
                    <option value="info">INFO - Log Geral</option>
                    <option value="sucesso">SUCESSO - Transições de Conclusão</option>
                    <option value="alerta">ALERTA - Pedidos de Modificação</option>
                    <option value="erro">ERRO - Rejeição/Pendências Técnicas</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full p-2.5 bg-blue-600 hover:bg-blue-750 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-3xs cursor-pointer flex items-center justify-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Registrar Entrada de Log
                </button>
              </form>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
