/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Solicitacao, PerfilUsuario, EmpresaSeguranca, Notificacao, SistemaLog, Medicao, Aditivo, AjustePlanilha, UsuarioSistema, DocumentoChecklist, StatusItemFinanceiroExecucao, EquipeAnalista, AuxiliarProcesso, computeStatusObra, montarChecklistCanonico, montarChecklistGED } from './types';
import { recalcularPrioridade, calcularPontuacaoAutorizacaoPAF, calcularEstrelas, calcularPrioridade, getInfoEtiqueta, CodigoEtiqueta } from './utils/prioridade';
import { recalcularIEE, calcularIEE, CLASSE_IEE_INFO } from './utils/iee';
import { coletarAlertasSla } from './utils/sla';
import { SOLICITACOES_INICIAIS, NOTIFICACOES_INICIAIS, LOGS_INICIAIS } from './initialData';
import Dashboard from './components/Dashboard';
import VisaoGeralDashboard from './components/VisaoGeralDashboard';
import SolicitacaoDetalhes from './components/SolicitacaoDetalhes';
import NovaSolicitacaoModal from './components/NovaSolicitacaoModal';
import EditarSolicitacaoModal from './components/EditarSolicitacaoModal';
import { HardHat, Layers, ShieldCheck, Building2, HelpCircle, ChevronDown, LayoutGrid, Users, Lock, Coins, UserPlus, FileText, ClipboardList, BookOpen, Key, Landmark, CheckCircle, Calculator, Building, UploadCloud, Plus, Search, X, Wrench, Ticket, Bell, FileClock, Navigation, Package, BarChart2, Database, FolderOpen, RefreshCw, Filter, LogOut, ArrowLeft, FileCheck, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import LoginScreen from './components/LoginScreen';
import KanbanViews from './components/KanbanViews';
import { NovoAtendimentoPanel, AtribuicaoPanel, AtribuicaoHistoricoPanel, AprovacaoRegionalPanel } from './components/GestaoObrasViews';
import ExecucaoSubmodulos from './components/ExecucaoSubmodulos';
import AcompanhamentoPaf from './components/AcompanhamentoPaf';
import CentralNotificacoesLogs from './components/CentralNotificacoesLogs';
import CentralNavegacaoObras from './components/CentralNavegacaoObras';
import ValidacaoContratual from './components/ValidacaoContratual';
import OrcamentoModule from './components/orcamento/OrcamentoModule';
import PatrimonioModule from './components/patrimonio/PatrimonioModule';
import { supabase } from './lib/supabase';
import {
  resolverUsuarioIdPorNome,
  sincronizarDocumentosDaSolicitacao,
  sincronizarHistoricoEtapas,
  sincronizarParcelasDaSolicitacao,
  normalizarSre,
  formatarTamanhoArquivo,
} from './lib/persistencia';

// Perfis selecionáveis diretamente no Cadastro de Usuário (Segurança). 'fiscal_obra' fica de fora
// por não ter nenhum comportamento implementado no restante do sistema ainda.
const PERFIS_SELECIONAVEIS: { value: PerfilUsuario; label: string; regional: boolean }[] = [
  { value: 'tecnico_infra', label: 'Técnico de Infraestrutura (SRE)', regional: true },
  { value: 'coordenador_regional', label: 'Coordenador Regional (SRE)', regional: true },
  { value: 'analista_dore', label: 'Analista de Engenharia (DORE)', regional: false },
  { value: 'administrativo_dore', label: 'Administrativo (DORE)', regional: false },
  { value: 'gestor_paf', label: 'Subsecretário de Administração (PAF)', regional: false },
  { value: 'diretor_dore', label: 'Diretor (DORE)', regional: false },
  { value: 'admin', label: 'Administrador do Sistema', regional: false },
];

// Departamento padrão exibido para perfis do órgão central (perfis regionais usam a SRE escolhida).
const DEPARTAMENTO_POR_PERFIL_CENTRAL: Record<string, string> = {
  analista_dore: 'DORE Engenharia',
  administrativo_dore: 'Administrativo DORE',
  gestor_paf: 'SAF/PAF Secretarias',
  diretor_dore: 'Diretoria DORE',
  admin: 'Administração do Sistema',
};

// Formações que exigem registro profissional (CREA/CAU) obrigatório no cadastro.
const FORMACOES_EXIGEM_REGISTRO = ['Engenharia Civil', 'Arquitetura', 'Técnico em Edificações'];

// Rótulo genérico de cada etiqueta de prioridade para uso em filtro (sem interpolar dados de um
// processo específico, ao contrário de getInfoEtiqueta — ver REGRAS_ETIQUETA em utils/prioridade.ts).
const ETIQUETA_LABEL_FILTRO: Record<CodigoEtiqueta, string> = {
  EMERGENCIAL: 'Emergencial',
  PRIORIDADE: 'Prioridade (ADM)',
  ESPECIAL: 'Especial (Notificação de Órgão)',
  EMENDA_IMPOSITIVA: 'Emenda Impositiva',
  SEM_LIB_FINANCEIRA: 'Sem Liberação Financeira',
  NORMAL: 'Normal',
};

// Tela de Autorização do PAF (Etapa 3): uma única fila reúne o Atendimento Inicial (avança
// etapaAtual 'paf_autorizacao' → 'paf') e a liberação financeira final de Reequilíbrio/Saldo
// Complementar já homologados pela DORE (atualiza só o item, a obra permanece em 'execucao') — a
// extinta tela "Liberação Financeira" foi fundida aqui, a pedido do usuário. Ver
// [[fusao-liberacao-financeira-autorizacao]].
type TipoLinhaAutorizacao = 'atendimento_inicial' | 'reequilibrio' | 'saldo';
interface LinhaAutorizacao {
  sol: Solicitacao;
  tipo: TipoLinhaAutorizacao;
  itemId: string | null;
  valor: number;
  label: string;
}
const TIPO_LINHA_AUTORIZACAO_INFO: Record<TipoLinhaAutorizacao, { label: string; corClassName: string }> = {
  atendimento_inicial: { label: 'Atendimento Inicial', corClassName: 'border-blue-300 text-blue-700 bg-blue-50/40' },
  reequilibrio: { label: 'Reequilíbrio Financeiro', corClassName: 'border-purple-300 text-purple-700 bg-purple-50/40' },
  saldo: { label: 'Saldo Complementar', corClassName: 'border-teal-300 text-teal-700 bg-teal-50/40' },
};
const TABELA_POR_TIPO_LINHA_AUTORIZACAO: Record<'reequilibrio' | 'saldo', string> = {
  reequilibrio: 'reequilibrios_financeiros',
  saldo: 'saldos_complementares',
};

// status_obra no banco é um enum snake_case computado (nao_iniciada | em_andamento | paralisada
// | concluida | distratada), diferente do campo statusObra do frontend (que é só um override manual
// usado por computeStatusObra para o caso "Paralisada"). Convertemos a partir do valor computado,
// que é o que realmente aparece pra o usuário. 'distratada' e os estados intermediários de
// contratação (computeStatusObra retorna 6 labels, o banco só tem 5 valores) caem em 'nao_iniciada'
// por não terem equivalente direto — ver computeStatusObra em src/types.ts.
function statusObraParaBanco(sol: Solicitacao): string {
  switch (computeStatusObra(sol).label) {
    case 'Paralisada': return 'paralisada';
    case 'Concluída': return 'concluida';
    case 'Em execução': return 'em_andamento';
    default: return 'nao_iniciada';
  }
}

function statusObraDoBanco(v: string | null | undefined): Solicitacao['statusObra'] {
  switch (v) {
    case 'paralisada': return 'Paralisada';
    case 'concluida': return 'Concluída';
    case 'em_andamento': return 'Em Andamento';
    case 'nao_iniciada': return 'Não Iniciada';
    default: return undefined; // 'distratada' não tem equivalente no frontend hoje
  }
}

// Colunas `date` do Postgres rejeitam string vazia — campos de data não preenchidos
// devem virar null, nunca "".
function dataOuNull(val?: string): string | null {
  return val && val.trim() !== '' ? val : null;
}

export default function App() {
  const [logado, setLogado] = useState(false);
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [idUsuarioLogado, setIdUsuarioLogado] = useState<string | null>(null);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [perfilUsuario, setPerfilUsuario] = useState<PerfilUsuario>('tecnico_infra');
  const [idSolicitacaoSelecionada, setIdSolicitacaoSelecionada] = useState<string | null>(null);
  const [abrirModalCadastro, setAbrirModalCadastro] = useState(false);
  const [solicitacaoEmEdicao, setSolicitacaoEmEdicao] = useState<Solicitacao | null>(null);
  const [atendimentoEmEdicaoDirect, setAtendimentoEmEdicaoDirect] = useState<Solicitacao | null>(null);
  const [mostrarMenuNotif, setMostrarMenuNotif] = useState(false);
  const [viewMode, setViewMode] = useState<'lista' | 'kanban_status' | 'kanban_analista'>('lista');

  // CUSTOM LOGS AND NOTIFICATIONS PERSISTED IN LOCALSTORAGE
  const [notifications, setNotifications] = useState<Notificacao[]>(() => {
    try {
      const cached = localStorage.getItem('sgo_notifications');
      return cached ? JSON.parse(cached) : NOTIFICACOES_INICIAIS;
    } catch {
      return NOTIFICACOES_INICIAIS;
    }
  });

  const [logs, setLogs] = useState<SistemaLog[]>(() => {
    try {
      const cached = localStorage.getItem('sgo_logs');
      return cached ? JSON.parse(cached) : LOGS_INICIAIS;
    } catch {
      return LOGS_INICIAIS;
    }
  });

  const registrarLog = (acao: string, detalhe: string, tipo: 'info' | 'sucesso' | 'alerta' | 'erro', solicitacaoId?: string, escola?: string) => {
    const novoLog: SistemaLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      dataHora: new Date().toISOString(),
      usuario: nomeUsuario || 'Usuário SGO',
      perfil: perfilUsuario === 'admin' ? 'Administrador do Sistema' :
              perfilUsuario === 'tecnico_infra' ? 'Técnico de Infraestrutura SRE' :
              perfilUsuario === 'coordenador_regional' ? 'Coordenador Regional' :
              perfilUsuario === 'analista_dore' ? 'Analista de Engenharia DORE' :
              perfilUsuario === 'gestor_paf' ? 'Subsecretário de Administração' :
              perfilUsuario === 'administrativo_dore' ? 'Administrativo DORE' :
              perfilUsuario === 'diretor_dore' ? 'Diretor DORE' : 'Operador',
      acao,
      detalhe,
      tipo,
      solicitacaoId,
      escola
    };
    const novosLogs = [novoLog, ...logs];
    setLogs(novosLogs);
    localStorage.setItem('sgo_logs', JSON.stringify(novosLogs));
  };

  const criarNotificacao = (titulo: string, mensagem: string, tipo: 'processo_avanco' | 'processo_retrocesso' | 'aditivo_pendente' | 'ajuste_pendente' | 'sistema' | 'alerta', solicitacaoId?: string, escola?: string, slaChave?: string) => {
    const novaNotif: Notificacao = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      titulo,
      mensagem,
      dataHora: new Date().toISOString(),
      lida: false,
      tipo,
      solicitacaoId,
      escola,
      slaChave
    };
    const novasNotifs = [novaNotif, ...notifications];
    setNotifications(novasNotifs);
    localStorage.setItem('sgo_notifications', JSON.stringify(novasNotifs));
  };

  // Verificação periódica de SLA — gera uma notificação de alerta por checkpoint estourado, uma
  // única vez cada (dedup por slaChave). Roda ao carregar/mudar as solicitações e a cada 5min
  // enquanto a aba fica aberta, para pegar atrasos que "vencem" só pela passagem do tempo, sem
  // nenhuma ação do usuário. Ver [[sla-atendimentos]].
  useEffect(() => {
    const verificarSla = () => {
      setNotifications(prevNotifs => {
        const alertas = coletarAlertasSla(solicitacoes);
        const chavesExistentes = new Set(prevNotifs.map(n => n.slaChave).filter(Boolean));
        const novos = alertas.filter(a => !chavesExistentes.has(a.chave));
        if (novos.length === 0) return prevNotifs;
        const novasNotifsSla: Notificacao[] = novos.map(a => ({
          id: `notif-sla-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          titulo: a.titulo,
          mensagem: a.mensagem,
          dataHora: new Date().toISOString(),
          lida: false,
          tipo: 'alerta',
          solicitacaoId: a.solicitacaoId,
          escola: a.escola,
          slaChave: a.chave,
        }));
        const atualizado = [...novasNotifsSla, ...prevNotifs];
        localStorage.setItem('sgo_notifications', JSON.stringify(atualizado));
        return atualizado;
      });
    };
    verificarSla();
    const intervalId = setInterval(verificarSla, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [solicitacoes]);

  // NEW DUAL NAV ARCHITECTURE STATES
  const [activeModule, setActiveModule] = useState<'seguranca' | 'orcamento' | 'gestao_obras' | 'imoveis' | 'abertura_chamados' | 'central_logs'>('gestao_obras');
  const [activeSubTask, setActiveSubTask] = useState<string>('visao_geral');
  const [selectedSchoolsPorSubtask, setSelectedSchoolsPorSubtask] = useState<{ [subtask: string]: string }>({});
  const [itemContratualSelecionado, setItemContratualSelecionado] = useState<{ tipo: 'aditivo' | 'ajuste' | 'saldo'; itemId: string } | null>(null);
  const [schoolSearchQuery, setSchoolSearchQuery] = useState('');
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  // Modal states for Termo de Encerramento (conclusao)
  const [conclusaoModalAberto, setConclusaoModalAberto] = useState(false);
  const [conclusaoModalBusca, setConclusaoModalBusca] = useState('');
  const [conclusaoFiltroId, setConclusaoFiltroId] = useState('');
  const [conclusaoFiltroCodesc, setConclusaoFiltroCodesc] = useState('Todos');
  const [conclusaoFiltroMunicipio, setConclusaoFiltroMunicipio] = useState('Todos');
  const [conclusaoFiltroSre, setConclusaoFiltroSre] = useState('Todos');
  const [conclusaoFiltroEscola, setConclusaoFiltroEscola] = useState('Todos');
  const [conclusaoFiltroStatus, setConclusaoFiltroStatus] = useState('Todos');

  // FILTERS STATE FOR "3. AUTORIZAÇÃO DO PAF"
  const [filterCodesc, setFilterCodesc] = useState('');
  const [filterSre, setFilterSre] = useState('');
  const [filterMunicipio, setFilterMunicipio] = useState('');
  const [filterEscola, setFilterEscola] = useState('');
  const [filterTipoObra, setFilterTipoObra] = useState('');
  const [filterTipoAtendimento, setFilterTipoAtendimento] = useState('');
  const [filterClasseIEE, setFilterClasseIEE] = useState('');
  const [filterEtiqueta, setFilterEtiqueta] = useState('');
  // 'atendimento_inicial' | 'reequilibrio' | 'saldo' — ver [[fusao-liberacao-financeira-autorizacao]]
  const [filterTipoProcesso, setFilterTipoProcesso] = useState('');

  // FILTERS STATE FOR "2. ANÁLISE TÉCNICA" (ProcessAnalysisPanel)
  const [filterAnaliseIdText, setFilterAnaliseIdText] = useState('');
  const [filterAnaliseCodescText, setFilterAnaliseCodescText] = useState('');
  const [filterAnaliseMunicipioText, setFilterAnaliseMunicipioText] = useState('');
  const [filterAnaliseSreText, setFilterAnaliseSreText] = useState('');
  const [filterAnaliseEscolaText, setFilterAnaliseEscolaText] = useState('');
  const [filterAnaliseResponsavelText, setFilterAnaliseResponsavelText] = useState('');
  const [filterAnaliseDataInicio, setFilterAnaliseDataInicio] = useState('');
  const [filterAnaliseDataFim, setFilterAnaliseDataFim] = useState('');

  // Tela de Atribuição: aba ativa (Fila Ativa / Histórico) e preview somente-leitura do histórico
  const [abaAtribuicao, setAbaAtribuicao] = useState<'ativa' | 'historico'>('ativa');
  const [historicoAtribuicaoSelecionadoId, setHistoricoAtribuicaoSelecionadoId] = useState<string | null>(null);


  // AÇÕES DA "3. AUTORIZAÇÃO DO PAF" — a mesma tela trata tanto o Atendimento Inicial (avança
  // etapaAtual) quanto a liberação financeira de Reequilíbrio/Saldo Complementar já homologados
  // pela DORE (atualiza o item, não a etapa da obra). Ver [[fusao-liberacao-financeira-autorizacao]].
  const [linhaConfirmando, setLinhaConfirmando] = useState<LinhaAutorizacao | null>(null);
  const [linhaRejeitando, setLinhaRejeitando] = useState<LinhaAutorizacao | null>(null);
  const [justificativaRejeicaoPaf, setJustificativaRejeicaoPaf] = useState('');

  // SELEÇÃO MÚLTIPLA E AUTORIZAÇÃO EM LOTE PARA "3. AUTORIZAÇÃO DO PAF"
  const [selectedAutorizacaoIds, setSelectedAutorizacaoIds] = useState<Set<string>>(new Set());
  const [modalLoteAutorizacaoAberto, setModalLoteAutorizacaoAberto] = useState(false);
  const [modalLoteSucessoCount, setModalLoteSucessoCount] = useState<number | null>(null);

  // Limpa a seleção em lote sempre que os filtros da tela de Autorização do PAF mudam,
  // para não autorizar por engano itens que saíram da lista filtrada visível
  useEffect(() => {
    setSelectedAutorizacaoIds(new Set());
  }, [filterCodesc, filterSre, filterMunicipio, filterEscola]);

  // REGISTROS DE SEGURANÇA (INTERACTIVE STATE MODEL)
  const [usuariosSeguranca, setUsuariosSeguranca] = useState<UsuarioSistema[]>([
    { id: 'USR-01', nome: 'João Paulo Penfield', email: 'joao.paulo@sre.mg.gov.br', perfil: 'tecnico_infra', departamento: 'SRE Patos de Minas' },
    { id: 'USR-03', nome: 'Flavia Borges', email: 'flavia.borges@educacao.mg.gov.br', perfil: 'analista_dore', departamento: 'DORE Engenharia' },
    { id: 'USR-04', nome: 'Silas Fagundes', email: 'silas.fagundes@paf.mg.gov.br', perfil: 'gestor_paf', departamento: 'SAF/PAF Secretarias' },
    { id: 'USR-05', nome: 'Rui Lages', email: 'rui.lages@educacao.mg.gov.br', perfil: 'administrativo_dore', departamento: 'Administrativo DORE' },
    { id: 'USR-00', nome: 'Administrador SGO', email: 'admin', perfil: 'admin', departamento: 'Administração do Sistema' }
  ]);


  const [empresasSeguranca, setEmpresasSeguranca] = useState<EmpresaSeguranca[]>([
    { id: 'EMP-01', nome: 'Construtora Mantiqueira Ltda', cnpj: '45.123.456/0001-80', responsavelTecnico: 'Eng. Roberto Albuquerque', situacaoCadastral: 'Regular', telefone: '(31) 3244-9088', email: 'contato@mantiqueira.com.br' },
    { id: 'EMP-02', nome: 'IncorpObras Engenharia Ltda', cnpj: '12.987.654/0001-20', responsavelTecnico: 'Arq. Sandra de Oliveira', situacaoCadastral: 'Regular', telefone: '(34) 3821-2244', email: 'comercial@incorpobras.com.br' },
    { id: 'EMP-03', nome: 'Construtora do Estado S.A.', cnpj: '01.242.000/0001-33', responsavelTecnico: 'Eng. Gustavo Mendonça', situacaoCadastral: 'Regular', telefone: '(31) 3212-0055', email: 'licitacoes@construtoraestado.com.br' }
  ]);

  // COLLAPSIBLE MENU CATEGORIES FOR GESTÃO DE OBRAS
  const [collapsedCategories, setCollapsedCategories] = useState<{ [cat: string]: boolean }>({
    atendimentos: false,
    analise: false,
    paf: false,
    execucao: false,
    encerramento: false,
    orca_orcamentos: false,
    orca_banco: false,
    orca_analises: false,
  });

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  // TECHNICAL ASSIGNMENTS FOR CONSTRUCTION DEMANDS
  const [atribuicoesEngenharia, setAtribuicoesEngenharia] = useState<{ [solicitacaoId: string]: string }>({
    'SOL-2026-001': 'USR-03', // Flavia Borges
    'SOL-2026-002': 'USR-01', // João Paulo Penfield
    'SOL-2026-003': 'USR-06', // Insp. Mariana Souza
  });

  // SEGURANÇA FORM STATES - USER
  const [showCadastroUsuarioModal, setShowCadastroUsuarioModal] = useState(false);
  const [usrIdEmEdicao, setUsrIdEmEdicao] = useState<string | null>(null);
  const [usrNome, setUsrNome] = useState('');
  const [usrEmail, setUsrEmail] = useState('');
  const [usrCargo, setUsrCargo] = useState('Engenheiro Civil');
  const [usrFormacao, setUsrFormacao] = useState('Engenharia Civil');
  const [usrCreaNum, setUsrCreaNum] = useState('');
  const [usrCreaSituacao, setUsrCreaSituacao] = useState<'Ativo' | 'Inativo'>('Ativo');
  const [usrDataIngresso, setUsrDataIngresso] = useState('');
  const [usrSituacaoFuncional, setUsrSituacaoFuncional] = useState<'Ativo' | 'Férias' | 'Licença' | 'Afastado' | 'Desligado'>('Ativo');
  const [usrPerfil, setUsrPerfil] = useState<PerfilUsuario>('tecnico_infra');
  const [usrRegionais, setUsrRegionais] = useState<string[]>(['SRE Metropolitana A']);
  // Equipe de especialidade — obrigatória quando usrPerfil === 'analista_dore'. Ver [[equipes-analista-auxiliares]].
  const [usrEquipe, setUsrEquipe] = useState<EquipeAnalista | ''>('');

  // FILTROS DA TABELA DE USUÁRIOS
  const [filtroUsrBusca, setFiltroUsrBusca] = useState('');
  const [filtroUsrCargo, setFiltroUsrCargo] = useState('todos');
  const [filtroUsrSituacao, setFiltroUsrSituacao] = useState('todos');
  const [filtroUsrVinculo, setFiltroUsrVinculo] = useState('todos');
  const [resetSenhaUsrId, setResetSenhaUsrId] = useState<string | null>(null);

  // SEGURANÇA FORM STATES - SCHOOL
  const [escNome, setEscNome] = useState('');
  const [escCodesc, setEscCodesc] = useState('');
  const [escMunicipio, setEscMunicipio] = useState('');
  const [escSre, setEscSre] = useState('SRE Metropolitana A');
  const [escPredio, setEscPredio] = useState('Próprio Estadual');
  const [escAtendimento, setEscAtendimento] = useState('Atendimento Regular');
  const [escOrgao, setEscOrgao] = useState('Exclusivo');

  // SECURITY EVENTS HANDLERS
  const resetFormUsuario = () => {
    setUsrNome('');
    setUsrEmail('');
    setUsrCargo('Engenheiro Civil');
    setUsrFormacao('Engenharia Civil');
    setUsrCreaNum('');
    setUsrCreaSituacao('Ativo');
    setUsrDataIngresso('');
    setUsrSituacaoFuncional('Ativo');
    setUsrPerfil('tecnico_infra');
    setUsrRegionais(['SRE Metropolitana A']);
    setUsrEquipe('');
    setUsrIdEmEdicao(null);
    setShowCadastroUsuarioModal(false);
  };

  const abrirEdicaoUsuario = (u: any) => {
    setUsrIdEmEdicao(u.id);
    setUsrNome(u.nome);
    setUsrEmail(u.email);
    setUsrCargo(u.cargo || 'Engenheiro Civil');
    setUsrFormacao(u.formacao || 'Engenharia Civil');
    setUsrCreaNum(u.creaNum || '');
    setUsrCreaSituacao(u.creaSituacao || 'Ativo');
    setUsrDataIngresso(u.dataIngresso || '');
    setUsrSituacaoFuncional(u.situacaoFuncional || 'Ativo');
    setUsrPerfil((u.perfil as PerfilUsuario) || 'tecnico_infra');
    setUsrRegionais(u.tipoVinculo === 'regional'
      ? (u.regionais?.length ? u.regionais : (u.departamento ? [u.departamento] : ['SRE Metropolitana A']))
      : ['SRE Metropolitana A']);
    setUsrEquipe((u.equipeAnalise as EquipeAnalista) || '');
    setShowCadastroUsuarioModal(true);
  };

  const exportarUsuariosCSV = (usuarios: any[]) => {
    const perfilLabel = (perfil: string) => {
      switch (perfil) {
        case 'tecnico_infra': return 'Técnico de Infraestrutura (SRE)';
        case 'coordenador_regional': return 'Coordenador Regional (SRE)';
        case 'analista_dore': return 'Analista de Engenharia (DORE)';
        case 'gestor_paf': return 'Subsecretário de Administração';
        case 'administrativo_dore': return 'Administrativo DORE';
        case 'diretor_dore': return 'Diretor DORE';
        case 'admin': return 'Administrador do Sistema';
        default: return perfil;
      }
    };

    const cabecalho = [
      'ID', 'Nome', 'E-mail', 'Cargo', 'Formação',
      'Nº Registro CREA/CAU', 'Situação CREA/CAU',
      'Data de Ingresso', 'Situação do Colaborador',
      'Perfil SGO', 'Tipo de Vínculo', 'Departamento / SRE',
      'Equipe Central', 'Data Última Atualização'
    ];

    const linhas = usuarios.map(u => [
      u.id,
      u.nome,
      u.email,
      u.cargo || '',
      u.formacao || '',
      u.creaNum || '',
      u.creaSituacao || '',
      u.dataIngresso || '',
      u.situacaoFuncional || '',
      perfilLabel(u.perfil),
      u.tipoVinculo === 'regional' ? 'Regional (SRE)' : u.tipoVinculo === 'orgao_central' ? 'Órgão Central' : '',
      u.departamento || '',
      u.equipeCentral || '',
      u.dataUltimaAtualizacao || ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`));

    const csv = '﻿' + [cabecalho.map(h => `"${h}"`).join(';'), ...linhas.map(l => l.join(';'))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `usuarios_sgo_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCadastrarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usrNome || !usrEmail) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    if (!usrDataIngresso) {
      alert('Por favor, informe a Data de Ingresso.');
      return;
    }
    if (FORMACOES_EXIGEM_REGISTRO.includes(usrFormacao) && (!usrCreaNum.trim() || !usrCreaSituacao)) {
      alert('Nº de Registro e Situação do Registro (CREA/CAU) são obrigatórios para esta formação.');
      return;
    }
    if (usrPerfil === 'analista_dore' && !usrEquipe) {
      alert('Selecione a equipe de especialidade do Analista de Engenharia (Planejamento, Ajuste, Elétrica, Arquitetura ou PSCIP).');
      return;
    }

    const isRegional = usrPerfil === 'tecnico_infra' || usrPerfil === 'coordenador_regional';
    const departamento = isRegional
      ? (usrRegionais[0] || '')
      : (DEPARTAMENTO_POR_PERFIL_CENTRAL[usrPerfil] || '');

    const dadosAtualizados = {
      nome: usrNome,
      email: usrEmail,
      perfil: usrPerfil,
      departamento,
      regionais: isRegional ? usrRegionais : undefined,
      equipeAnalise: usrPerfil === 'analista_dore' ? (usrEquipe || undefined) : undefined,
      cargo: usrCargo,
      formacao: usrFormacao,
      creaNum: usrCreaNum || undefined,
      creaSituacao: usrCreaSituacao,
      dataIngresso: usrDataIngresso,
      situacaoFuncional: usrSituacaoFuncional,
      dataUltimaAtualizacao: new Date().toISOString().split('T')[0],
      tipoVinculo: isRegional ? 'regional' as const : 'orgao_central' as const
    };

    if (usrIdEmEdicao) {
      // Persiste perfil e equipe no banco (as únicas duas colunas de fato regidas por regra de
      // negócio real hoje — o resto do cadastro segue só em memória, ver [[equipes-analista-auxiliares]]).
      // Só tenta se o id for um uuid real (usuário carregado do Supabase, não um mock local).
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(usrIdEmEdicao)) {
        const { data: perfilRow } = await supabase.from('perfis').select('id').eq('codigo', usrPerfil).single();
        if (perfilRow) {
          const { error: erroPersist } = await supabase
            .from('usuarios')
            .update({ perfil_id: perfilRow.id, equipe_analise: dadosAtualizados.equipeAnalise ?? null })
            .eq('id', usrIdEmEdicao);
          if (erroPersist) {
            console.error('Erro ao gravar perfil/equipe no Supabase:', erroPersist);
            alert('Erro ao gravar o perfil/equipe no banco de dados. As demais alterações do cadastro foram salvas só nesta sessão.');
          }
        }
      }
      setUsuariosSeguranca(usuariosSeguranca.map(u =>
        u.id === usrIdEmEdicao ? { ...u, ...dadosAtualizados } : u
      ));
      resetFormUsuario();
      alert(`Cadastro de "${usrNome}" atualizado com sucesso!`);
    } else {
      const novo = {
        id: `USR-${String(usuariosSeguranca.length + 1).padStart(2, '0')}`,
        ...dadosAtualizados
      };
      setUsuariosSeguranca([...usuariosSeguranca, novo]);
      resetFormUsuario();
      alert(`Usuário "${usrNome}" cadastrado com sucesso nas diretivas de Segurança!`);
    }
  };

  const handleCadastrarEscolaCompleto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!escNome || !escCodesc || !escMunicipio) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const nova: Solicitacao = {
      id: `SOL-2026-${String(solicitacoes.length + 1).padStart(3, '0')}`,
      nomeEscola: escNome.startsWith('E.E.') ? escNome : `E.E. ${escNome}`,
      codesc: escCodesc,
      municipio: escMunicipio,
      sre: escSre,
      tipo: 'Reforma ou Intervenção Física Cadastrada',
      predio: escPredio,
      tipoAtendimento: escAtendimento,
      atendimentoOrgao: escOrgao,
      dataCriacao: new Date().toISOString().split('T')[0],
      etapaAtual: 'cadastro',
      historicoEtapas: [{ etapa: 'cadastro', data: new Date().toISOString().split('T')[0], responsavel: 'Segurança / Sistema de Cadastro' }],
      documentos: [
        { id: 'doc_1', nome: 'Planilha Orçamentária', obrigatorio: true, desc: 'Anexar nos formatos .pdf e .xlsx.', status: 'pendente' },
        { id: 'doc_2', nome: 'Registro do imóvel', obrigatorio: true, desc: 'Título de propriedade ou certidão de registro correspondente.', status: 'pendente' },
        { id: 'doc_3_pdf', nome: 'Projeto de Engenharia (PDF)', obrigatorio: true, desc: 'Projeto técnico estrutural e arquitetônico no formato .pdf.', status: 'pendente' },
        { id: 'doc_3_dwg', nome: 'Projeto de Engenharia (DWG)', obrigatorio: true, desc: 'Projeto técnico estrutural e arquitetônico no formato .dwg (AutoCAD).', status: 'pendente' },
        { id: 'doc_4', nome: 'Parecer técnico', obrigatorio: true, desc: 'Parecer descritivo emitido pela equipe de engenharia habilitada.', status: 'pendente' },
        { id: 'doc_ata', nome: 'Ata do Colegiado', obrigatorio: true, desc: 'Ata de reunião do colegiado escolar aprovando a demanda de intervenção.', status: 'pendente' },
        { id: 'doc_foto', nome: 'Relatório fotográfico', obrigatorio: true, desc: 'Relatório com fotos nítidas dos locais que necessitam de reforma/intervenção, com legendas explicativas.', status: 'pendente' },
        { id: 'doc_5', nome: 'Imposto ISS', obrigatorio: true, desc: 'Guia ou comprovante de recolhimento tributário aplicável.', status: 'pendente' }
      ],
      medicoes: [],
      aditivos: []
    };

    handleNovaSolicitacao(nova);
    
    setEscNome('');
    setEscCodesc('');
    setEscMunicipio('');
    
    alert(`Escola "${escNome}" cadastrada com sucesso! Uma demanda SGO foi iniciada e enviada para a fila de checklist de documentos.`);
  };

  // SEGURANÇA FORM STATES - EMPRESA
  const [empNome, setEmpNome] = useState('');
  const [empCnpj, setEmpCnpj] = useState('');
  const [empResp, setEmpResp] = useState('');
  const [empSit, setEmpSit] = useState<string>('Regular');
  const [empTel, setEmpTel] = useState('');
  const [empMail, setEmpMail] = useState('');
  const [empIdEmEdicao, setEmpIdEmEdicao] = useState<string | null>(null);
  const [showEditarEmpresaModal, setShowEditarEmpresaModal] = useState(false);

  const handleCadastrarEmpresa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empNome || !empCnpj) {
      alert('Por favor, informe a Razão Social e o CNPJ da empresa.');
      return;
    }
    const nova: EmpresaSeguranca = {
      id: `EMP-${String(empresasSeguranca.length + 1).padStart(2, '0')}`,
      nome: empNome,
      cnpj: empCnpj,
      responsavelTecnico: empResp || 'Não Especificado',
      situacaoCadastral: empSit,
      telefone: empTel || '---',
      email: empMail || '---'
    };
    setEmpresasSeguranca([...empresasSeguranca, nova]);
    setEmpNome('');
    setEmpCnpj('');
    setEmpResp('');
    setEmpSit('Regular');
    setEmpTel('');
    setEmpMail('');
    alert(`Empresa "${empNome}" pré-cadastrada e homologada com sucesso no módulo de Segurança.`);
  };

  const abrirEdicaoEmpresa = (emp: EmpresaSeguranca) => {
    setEmpIdEmEdicao(emp.id);
    setEmpNome(emp.nome);
    setEmpCnpj(emp.cnpj);
    setEmpResp(emp.responsavelTecnico ?? '');
    setEmpSit(emp.situacaoCadastral ?? 'Regular');
    setEmpTel(emp.telefone ?? '');
    setEmpMail(emp.email ?? '');
    setShowEditarEmpresaModal(true);
  };

  const handleSalvarEdicaoEmpresa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empNome || !empCnpj) {
      alert('Por favor, informe a Razão Social e o CNPJ da empresa.');
      return;
    }
    setEmpresasSeguranca(empresasSeguranca.map(emp =>
      emp.id === empIdEmEdicao
        ? { ...emp, nome: empNome, cnpj: empCnpj, responsavelTecnico: empResp, situacaoCadastral: empSit, telefone: empTel, email: empMail }
        : emp
    ));
    setShowEditarEmpresaModal(false);
    setEmpIdEmEdicao(null);
    setEmpNome(''); setEmpCnpj(''); setEmpResp(''); setEmpSit('Regular'); setEmpTel(''); setEmpMail('');
  };

  // Controle de acesso regional: tecnico_infra e coordenador_regional só veem dados das suas SREs.
  // O usuário logado é identificado pelo auth uid — nunca por "primeiro usuário com o perfil".
  const perfilRestritoPorRegional = perfilUsuario === 'tecnico_infra' || perfilUsuario === 'coordenador_regional';

  const regionaisDoTecnico: string[] = perfilRestritoPorRegional
    ? (() => {
        const u = usuariosSeguranca.find(u => u.id === idUsuarioLogado);
        if (!u) return [];
        return u.regionais?.length ? u.regionais : (u.departamento ? [u.departamento] : []);
      })()
    : [];

  const sreDoTecnico = regionaisDoTecnico[0] || '';

  // Nome do técnico logado (para permitir acesso a obras onde é fiscal, mesmo fora da sua SRE)
  const nomeTecnicoLogado = perfilUsuario === 'tecnico_infra' ? nomeUsuario : '';

  // Nome do coordenador regional logado (usado para registrar quem aprovou/reprovou o atendimento)
  const nomeCoordenadorLogado = perfilUsuario === 'coordenador_regional' ? nomeUsuario : '';

  // Nome do Subsecretário de Administração logado (usado para registrar quem liberou/reprovou o
  // recurso financeiro de Reequilíbrio/Saldo Complementar). Ver [[gate-liberacao-financeira]].
  const nomeGestorPafLogado = perfilUsuario === 'gestor_paf' ? nomeUsuario : '';

  // Fail-closed: perfil restrito sem regionais cadastradas não vê nada (antes via o estado inteiro)
  const solicitacoesVisiveis = perfilRestritoPorRegional
    ? solicitacoes.filter(s =>
        regionaisDoTecnico.some(sre => normalizarSre(s.sre) === normalizarSre(sre)) ||
        (nomeTecnicoLogado && s.fiscalObraAtribuido === nomeTecnicoLogado)
      )
    : solicitacoes;

  // Initialize from Supabase, falling back to LocalStorage or the rich pre-defined mock set
  useEffect(() => {
    async function carregarSolicitacoes() {
      try {
        const { data, error } = await supabase
          .from('solicitacoes')
          .select('*, analista:usuarios!solicitacoes_analista_atribuido_id_fkey(nome), fiscal:usuarios!solicitacoes_fiscal_obra_atribuido_id_fkey(nome)')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          // Arrays aninhados iniciam vazios aqui e são preenchidos pelos fetches
          // das tabelas-filhas logo abaixo (medições, aditivos, documentos, histórico…).
          const doSupabase: Solicitacao[] = data.map((row: any) => ({
            id: row.codigo_sgo,
            _dbId: row.id,
            nomeEscola: row.nome_escola,
            codesc: row.codesc,
            tipo: row.tipo ?? '',
            municipio: row.municipio ?? '',
            sre: row.sre ?? '',
            dataCriacao: row.created_at ? String(row.created_at).split('T')[0] : '',
            etapaAtual: row.etapa_atual,
            analistaAtribuido: row.analista?.nome ?? undefined,
            fiscalObraAtribuido: row.fiscal?.nome ?? undefined,
            analiseSla: {
              dataEntradaFila: row.analise_data_entrada_fila ?? undefined,
              dataAtribuicao: row.analise_data_atribuicao ?? undefined,
              dataInicioAnalise: row.analise_data_inicio ?? undefined,
              dataConclusao: row.analise_data_conclusao ?? undefined,
            },
            historicoEtapas: [],
            documentos: [],
            medicoes: [],
            aditivos: [],
            ajustes: [],
            prioridadeScore: row.prioridade_score ?? undefined,
            estrelas: row.estrelas ?? undefined,
            iee: row.iee ?? undefined,
            ieeClasse: row.iee_classe ?? undefined,
            ieePontos: row.iee_pontos ?? undefined,
            ieeComplexidade: row.iee_complexidade ?? undefined,
            contadorAnalises: row.contador_analises ?? undefined,
            valorPlanilha: row.valor_planilha ?? undefined,
            cadastroObraConfirmado: row.cadastro_obra_confirmado ?? undefined,
            atribuicaoForcada: row.atribuicao_forcada ?? undefined,
            fichaVerificada: row.ficha_verificada ?? undefined,
            valoresOriginaisTecnico: row.valores_originais_tecnico ?? undefined,
            tipoAtendimento: row.tipo_atendimento ?? undefined,
            atendimentoOrgao: row.atendimento_orgao ?? undefined,
            formaAtendimento: row.forma_atendimento ?? undefined,
            origemDemanda: row.origem_demanda ?? undefined,
            numPaf: row.num_paf ?? undefined,
            anoEmenda: row.ano_emenda ?? undefined,
            tipoEmenda: row.tipo_emenda ?? undefined,
            numeroIndicacaoEmenda: row.numero_indicacao_emenda ?? undefined,
            descricaoFolhaRosto: row.descricao_folha_rosto ?? undefined,
            valorHomologado: row.valor_homologado ?? undefined,
            numeroPAF: row.numero_paf ?? undefined,
            dataHomologacao: row.data_homologacao ?? undefined,
            dataVigenciaPAF: row.data_vigencia_paf ?? undefined,
            dataFinHomologacao: row.data_fin_homologacao ?? undefined,
            statusPAF: row.status_paf ?? undefined,
            cnpjCaixaEscolar: row.cnpj_caixa_escolar ?? undefined,
            prazoEstimadoObra: row.prazo_estimado_obra ?? undefined,
            prazoEstimadoMeses: row.prazo_estimado_meses ?? undefined,
            iss: row.iss ?? undefined,
            codigoEndereco: row.codigo_endereco ?? undefined,
            formaOcupacao: row.forma_ocupacao ?? undefined,
            predio: row.predio ?? undefined,
            tombado: row.tombado ?? undefined,
            orgaoTombador: row.orgao_tombador ?? undefined,
            coabitado: row.coabitado ?? undefined,
            tipoCoabitado: row.tipo_coabitado ?? undefined,
            observacoesFicha: row.observacoes_ficha ?? undefined,
            empresaContratada: row.empresa_contratada ?? undefined,
            cnpjEmpresa: row.cnpj_empresa ?? undefined,
            responsavel: row.responsavel ?? undefined,
            dataOrdemInicio: row.data_ordem_inicio ?? undefined,
            previsaoTerminoObra: row.previsao_termino_obra ?? undefined,
            garantiaTipo: row.garantia_tipo ?? undefined,
            contratoValorInicial: row.valor_contrato ?? undefined,
            contratoDataAssinatura: row.contrato_data_assinatura ?? undefined,
            contratoInicioVigencia: row.contrato_inicio_vigencia ?? undefined,
            contratoFimVigencia: row.contrato_fim_vigencia ?? undefined,
            garantiaValidade: row.garantia_validade ?? undefined,
            garantiaValor: row.garantia_valor ?? undefined,
            garantiaExigida: row.garantia_exigida ?? undefined,
            statusContratoEmpresa: row.status_contrato_empresa ?? undefined,
            duracaoObraMeses: row.duracao_obra_meses ?? undefined,
            statusAprovacaoRegional: row.status_aprovacao_regional ?? undefined,
            coordenadorAprovador: row.coordenador_aprovador ?? undefined,
            dataAprovacaoRegional: row.data_aprovacao_regional ?? undefined,
            justificativaReprovacaoRegional: row.justificativa_reprovacao_regional ?? undefined,
            fiscalObraAtribuidoId: row.fiscal_obra_atribuido_id ?? undefined,
            dataConclusao: row.data_conclusao ?? undefined,
            laudoConclusivoFileName: row.laudo_conclusivo_file_name ?? undefined,
            laudoConclusivoFileSize: row.laudo_conclusivo_file_size ?? undefined,
            laudoConclusivoUploadedAt: row.laudo_conclusivo_uploaded_at ?? undefined,
            relatorioFotograficoFileName: row.relatorio_fotografico_file_name ?? undefined,
            relatorioFotograficoFileSize: row.relatorio_fotografico_file_size ?? undefined,
            relatorioFotograficoUploadedAt: row.relatorio_fotografico_uploaded_at ?? undefined,
            planilhaMedicaoFinalFileName: row.planilha_medicao_final_file_name ?? undefined,
            planilhaMedicaoFinalFileSize: row.planilha_medicao_final_file_size ?? undefined,
            planilhaMedicaoFinalUploadedAt: row.planilha_medicao_final_uploaded_at ?? undefined,
            termoAceiteProvisorioData: row.termo_aceite_provisorio_data ?? undefined,
            termoAceiteProvisorioFileName: row.termo_aceite_provisorio_file_name ?? undefined,
            termoAceiteProvisorioFileSize: row.termo_aceite_provisorio_file_size ?? undefined,
            termoAceiteProvisorioUploadedAt: row.termo_aceite_provisorio_uploaded_at ?? undefined,
            termoAceiteDefinitivoData: row.termo_aceite_definitivo_data ?? undefined,
            termoAceiteDefinitivoFileName: row.termo_aceite_definitivo_file_name ?? undefined,
            termoAceiteDefinitivoFileSize: row.termo_aceite_definitivo_file_size ?? undefined,
            termoAceiteDefinitivoUploadedAt: row.termo_aceite_definitivo_uploaded_at ?? undefined,
            statusObra: statusObraDoBanco(row.status_obra),
            statusSecoes: {
              identificacao_escolar: { status: row.status_identificacao_escolar, motivo: row.motivo_identificacao_escolar ?? undefined },
              classificacao_patrimonial: { status: row.status_classificacao_patrimonial, motivo: row.motivo_classificacao_patrimonial ?? undefined },
              detalhamento_tecnico: { status: row.status_detalhamento_tecnico, motivo: row.motivo_detalhamento_tecnico ?? undefined },
              referencia_dotacao: { status: row.status_referencia_dotacao, motivo: row.motivo_referencia_dotacao ?? undefined },
            },
          }));

          // Carrega o histórico de correções (rodadas de devolução) de cada solicitação
          let comHistorico = doSupabase;
          const dbIds = doSupabase.map(s => s._dbId).filter((id): id is string => !!id);
          if (dbIds.length > 0) {
            const { data: correcoesData, error: correcoesError } = await supabase
              .from('solicitacao_historico_correcoes')
              .select(`
                id, created_at, solicitacao_id,
                historico_correcao_motivos ( motivo ),
                historico_correcao_docs_recusados ( nome_doc )
              `)
              .in('solicitacao_id', dbIds)
              .order('created_at', { ascending: true });

            if (correcoesError) {
              console.error('Erro ao carregar histórico de correções:', correcoesError);
            } else if (correcoesData) {
              const porSolicitacao = new Map<string, any[]>();
              (correcoesData as any[]).forEach((row) => {
                const lista = porSolicitacao.get(row.solicitacao_id) ?? [];
                lista.push(row);
                porSolicitacao.set(row.solicitacao_id, lista);
              });

              comHistorico = doSupabase.map(sol => {
                const linhas = sol._dbId ? porSolicitacao.get(sol._dbId) : undefined;
                if (!linhas || linhas.length === 0) return sol;
                return {
                  ...sol,
                  historicoCorrecoes: linhas.map((row: any, index: number) => ({
                    contador: index + 1,
                    data: row.created_at ? String(row.created_at).split('T')[0] : '',
                    motivos: (row.historico_correcao_motivos || []).map((m: any) => ({ label: '', campo: '', motivo: m.motivo })),
                    docsRecusados: (row.historico_correcao_docs_recusados || []).map((d: any) => ({ nome: d.nome_doc, id: '', justificativa: '' })),
                  })),
                };
              });
            }
          }

          // Carrega as medições registradas de cada solicitação
          let comMedicoes = comHistorico;
          if (dbIds.length > 0) {
            const { data: medicoesData, error: medicoesError } = await supabase
              .from('medicoes')
              .select('*')
              .in('solicitacao_id', dbIds)
              .order('created_at', { ascending: false });

            if (medicoesError) {
              console.error('Erro ao carregar medições:', medicoesError);
            } else if (medicoesData) {
              const porSolicitacaoMed = new Map<string, any[]>();
              (medicoesData as any[]).forEach((row) => {
                const lista = porSolicitacaoMed.get(row.solicitacao_id) ?? [];
                lista.push(row);
                porSolicitacaoMed.set(row.solicitacao_id, lista);
              });

              comMedicoes = comHistorico.map(sol => {
                const linhas = sol._dbId ? porSolicitacaoMed.get(sol._dbId) : undefined;
                if (!linhas || linhas.length === 0) return sol;
                return {
                  ...sol,
                  medicoes: linhas.map((row: any): Medicao => ({
                    id: row.id,
                    data: row.data_medicao ? String(row.data_medicao) : '',
                    valor: row.valor,
                    porcentagem: row.porcentagem ?? 0,
                    descricao: row.descricao ?? '',
                    empresaNome: row.empresa_nome ?? undefined,
                    empresaCnpj: row.empresa_cnpj ?? undefined,
                    numeroMedicao: row.numero_medicao_display ?? String(row.numero_medicao),
                    periodoMedicao: row.periodo_medicao ?? undefined,
                    responsavelMedicao: row.responsavel_medicao ?? undefined,
                    observacoes: row.observacao ?? undefined,
                    porcentagemFisica: row.porcentagem_fisica ?? undefined,
                  })),
                };
              });
            }
          }

          // Carrega os aditivos registrados de cada solicitação
          let comAditivos = comMedicoes;
          if (dbIds.length > 0) {
            const { data: aditivosData, error: aditivosError } = await supabase
              .from('aditivos')
              .select('*')
              .in('solicitacao_id', dbIds)
              .order('numero_aditivo', { ascending: true });

            if (aditivosError) {
              console.error('Erro ao carregar aditivos:', aditivosError);
            } else if (aditivosData) {
              const tipoDoBanco = (v: string | null): Aditivo['tipo'] => {
                switch (v) {
                  case 'valor_prazo': return 'Valor e Prazo';
                  case 'prazo': return 'Prazo';
                  default: return 'Valor';
                }
              };
              const statusDoBanco = (v: string | null): Aditivo['status'] => {
                switch (v) {
                  case 'aprovado': return 'Aprovado';
                  case 'recusado': return 'Recusado';
                  default: return 'Pendente';
                }
              };

              const porSolicitacaoAdt = new Map<string, any[]>();
              (aditivosData as any[]).forEach((row) => {
                const lista = porSolicitacaoAdt.get(row.solicitacao_id) ?? [];
                lista.push(row);
                porSolicitacaoAdt.set(row.solicitacao_id, lista);
              });

              comAditivos = comMedicoes.map(sol => {
                const linhas = sol._dbId ? porSolicitacaoAdt.get(sol._dbId) : undefined;
                if (!linhas || linhas.length === 0) return sol;
                return {
                  ...sol,
                  aditivos: linhas.map((row: any): Aditivo => ({
                    id: row.id,
                    data: row.data_aditivo ? String(row.data_aditivo) : '',
                    tipo: tipoDoBanco(row.tipo),
                    valorExtra: row.valor_adicional ?? undefined,
                    prazoExtraDias: row.prazo_adicional_dias ?? undefined,
                    justificativa: row.motivo ?? '',
                    status: statusDoBanco(row.status),
                    numeroAditivo: row.numero_aditivo != null ? String(row.numero_aditivo) : undefined,
                    parecerConsolidado: row.parecer_consolidado ?? undefined,
                    supressao: row.supressao ?? undefined,
                    reprogramacao: row.reprogramacao ?? undefined,
                    saldoComplementar: row.saldo_complementar ?? undefined,
                    valorAditivo: row.valor_aditivo ?? undefined,
                    percentualContrato: row.percentual_contrato ?? undefined,
                  })),
                };
              });
            }
          }

          // Carrega os ajustes de planilha registrados de cada solicitação
          let comAjustes = comAditivos;
          if (dbIds.length > 0) {
            const { data: ajustesData, error: ajustesError } = await supabase
              .from('ajustes_planilha')
              .select('*')
              .in('solicitacao_id', dbIds)
              .order('numero_ajuste', { ascending: true });

            if (ajustesError) {
              console.error('Erro ao carregar ajustes de planilha:', ajustesError);
            } else if (ajustesData) {
              const statusAjusteDoBanco = (v: string | null): AjustePlanilha['status'] => {
                switch (v) {
                  case 'aprovado': return 'validado';
                  case 'recusado': return 'em_elaboracao';
                  case 'aguardando_coordenador': return 'aguardando_coordenador';
                  default: return 'analise_dore';
                }
              };

              const porSolicitacaoAju = new Map<string, any[]>();
              (ajustesData as any[]).forEach((row) => {
                const lista = porSolicitacaoAju.get(row.solicitacao_id) ?? [];
                lista.push(row);
                porSolicitacaoAju.set(row.solicitacao_id, lista);
              });

              comAjustes = comAditivos.map(sol => {
                const linhas = sol._dbId ? porSolicitacaoAju.get(sol._dbId) : undefined;
                if (!linhas || linhas.length === 0) return sol;
                return {
                  ...sol,
                  ajustes: linhas.map((row: any): AjustePlanilha => ({
                    id: row.id,
                    numero: row.numero_ajuste,
                    tipoAjuste: row.tipo_ajuste ?? 'sem_alteracao_meta',
                    valorAjuste: row.valor_ajuste ?? 0,
                    responsavelPlanilha: row.responsavel_planilha ?? '',
                    registroProfissional: row.registro_profissional ?? '',
                    ajusteReferente: row.ajuste_referente ?? 'atendimento_inicial',
                    valorContrato: row.valor_contrato ?? 0,
                    diferencaPlanilhas: row.diferenca_planilhas ?? 0,
                    desconto: row.desconto ?? 0,
                    avancoFisico: row.avanco_fisico ?? 0,
                    observacoes: row.observacoes ?? '',
                    dataCriacao: row.data_ajuste ? String(row.data_ajuste) : '',
                    status: statusAjusteDoBanco(row.status),
                    analistaAtribuido: row.analista_nome ?? undefined,
                    supressao: row.supressao ?? undefined,
                    reprogramacao: row.reprogramacao ?? undefined,
                    saldoComplementar: row.saldo_complementar ?? undefined,
                    valorAditivo: row.diferenca_planilhas ?? undefined,
                    percentualContrato: row.percentual_contrato ?? undefined,
                    parecerDore: row.parecer_dore ?? undefined,
                    coordenadorAprovador: row.coordenador_aprovador ?? undefined,
                    dataAprovacaoCoordenador: row.data_aprovacao_coordenador ?? undefined,
                    justificativaReprovacaoCoordenador: row.justificativa_reprovacao_coordenador ?? undefined,
                    dataEntradaFila: row.data_entrada_fila ?? undefined,
                    dataAtribuicao: row.data_atribuicao ?? undefined,
                    dataInicioAnalise: row.data_inicio_analise ?? undefined,
                    dataConclusao: row.data_conclusao ?? undefined,
                  })),
                };
              });
            }
          }

          // Carrega os diários de obra registrados de cada solicitação
          let comDiarios = comAjustes;
          if (dbIds.length > 0) {
            const { data: diariosData, error: diariosError } = await supabase
              .from('diarios_obra')
              .select('*')
              .in('solicitacao_id', dbIds)
              .order('data_registro', { ascending: false });

            if (diariosError) {
              console.error('Erro ao carregar diários de obra:', diariosError);
            } else if (diariosData) {
              const porSolicitacaoDiario = new Map<string, any[]>();
              (diariosData as any[]).forEach((row) => {
                const lista = porSolicitacaoDiario.get(row.solicitacao_id) ?? [];
                lista.push(row);
                porSolicitacaoDiario.set(row.solicitacao_id, lista);
              });

              comDiarios = comAjustes.map(sol => {
                const linhas = sol._dbId ? porSolicitacaoDiario.get(sol._dbId) : undefined;
                if (!linhas || linhas.length === 0) return sol;
                return {
                  ...sol,
                  diariosObra: linhas.map((row: any) => ({
                    id: row.id,
                    data: row.data_registro ? String(row.data_registro) : '',
                    texto: row.conteudo ?? '',
                    categoria: row.categoria ?? undefined,
                    anexoFoto: row.anexo_foto ?? undefined,
                    autor: row.autor ?? '',
                  })),
                };
              });
            }
          }

          // Carrega as restrições de obra registradas de cada solicitação
          let comRestricoes = comDiarios;
          if (dbIds.length > 0) {
            const { data: restricoesData, error: restricoesError } = await supabase
              .from('restricoes_obra')
              .select('*')
              .in('solicitacao_id', dbIds)
              .order('created_at', { ascending: false });

            if (restricoesError) {
              console.error('Erro ao carregar restrições de obra:', restricoesError);
            } else if (restricoesData) {
              const statusRestricaoDoBanco = (v: string | null): 'Ativa' | 'Resolvida' => {
                return v === 'resolvida' ? 'Resolvida' : 'Ativa';
              };

              const porSolicitacaoRestricao = new Map<string, any[]>();
              (restricoesData as any[]).forEach((row) => {
                const lista = porSolicitacaoRestricao.get(row.solicitacao_id) ?? [];
                lista.push(row);
                porSolicitacaoRestricao.set(row.solicitacao_id, lista);
              });

              comRestricoes = comDiarios.map(sol => {
                const linhas = sol._dbId ? porSolicitacaoRestricao.get(sol._dbId) : undefined;
                if (!linhas || linhas.length === 0) return sol;
                return {
                  ...sol,
                  restricoesObra: linhas.map((row: any) => ({
                    id: row.id,
                    descricao: row.descricao ?? '',
                    dataIdentificacao: row.data_abertura ? String(row.data_abertura) : '',
                    categoria: row.tipo ?? undefined,
                    status: statusRestricaoDoBanco(row.status),
                    impacto: row.impacto ?? undefined,
                    previsaoResolucao: row.previsao_resolucao ? String(row.previsao_resolucao) : undefined,
                    resolvidaEm: row.data_resolucao ? String(row.data_resolucao) : undefined,
                    parecerResolucao: row.parecer_resolucao ?? undefined,
                  })),
                };
              });
            }
          }

          // Carrega as vistorias de obra registradas de cada solicitação
          let comVistorias = comRestricoes;
          if (dbIds.length > 0) {
            const { data: vistoriasData, error: vistoriasError } = await supabase
              .from('vistorias_obra')
              .select('*')
              .in('solicitacao_id', dbIds)
              .order('data_vistoria', { ascending: false });

            if (vistoriasError) {
              console.error('Erro ao carregar vistorias de obra:', vistoriasError);
            } else if (vistoriasData) {
              const porSolicitacaoVistoria = new Map<string, any[]>();
              (vistoriasData as any[]).forEach((row) => {
                const lista = porSolicitacaoVistoria.get(row.solicitacao_id) ?? [];
                lista.push(row);
                porSolicitacaoVistoria.set(row.solicitacao_id, lista);
              });

              comVistorias = comRestricoes.map(sol => {
                const linhas = sol._dbId ? porSolicitacaoVistoria.get(sol._dbId) : undefined;
                if (!linhas || linhas.length === 0) return sol;
                return {
                  ...sol,
                  vistoriasObra: linhas.map((row: any) => ({
                    id: row.id,
                    dataVistoria: row.data_vistoria ? String(row.data_vistoria) : '',
                    vistoriador: row.vistoriador ?? '',
                    laudoResumido: row.observacoes ?? '',
                    nomeRelatorio: row.nome_relatorio ?? undefined,
                    tamanhoRelatorio: row.tamanho_relatorio ?? undefined,
                    resultado: row.resultado ?? undefined,
                  })),
                };
              });
            }
          }

          // Carrega as lições aprendidas registradas de cada solicitação
          let comLicoesAprendidas = comVistorias;
          if (dbIds.length > 0) {
            const { data: licoesData, error: licoesError } = await supabase
              .from('licoes_aprendidas_obra')
              .select('*')
              .in('solicitacao_id', dbIds)
              .order('created_at', { ascending: false });

            if (licoesError) {
              console.error('Erro ao carregar lições aprendidas de obra:', licoesError);
            } else if (licoesData) {
              const porSolicitacaoLicao = new Map<string, any[]>();
              (licoesData as any[]).forEach((row) => {
                const lista = porSolicitacaoLicao.get(row.solicitacao_id) ?? [];
                lista.push(row);
                porSolicitacaoLicao.set(row.solicitacao_id, lista);
              });

              comLicoesAprendidas = comVistorias.map(sol => {
                const linhas = sol._dbId ? porSolicitacaoLicao.get(sol._dbId) : undefined;
                if (!linhas || linhas.length === 0) return sol;
                return {
                  ...sol,
                  licoesAprendidas: linhas.map((row: any) => ({
                    id: row.id,
                    descricao: row.descricao ?? '',
                    categoria: row.categoria ?? undefined,
                    etapasServico: Array.isArray(row.etapas_servico) ? row.etapas_servico : [],
                    natureza: row.natureza ?? undefined,
                    recomendacao: row.recomendacao ?? undefined,
                    evidencias: Array.isArray(row.evidencias) ? row.evidencias : [],
                    dataRegistro: row.created_at ? String(row.created_at).slice(0, 10) : '',
                    autor: row.usuario_id ?? undefined,
                  })),
                };
              });
            }
          }

          // Carrega o checklist documental e o histórico de etapas; o que ainda não
          // existe no banco é hidratado do localStorage (recuperação da era pré-persistência)
          const localPorCodigo = new Map<string, Solicitacao>();
          try {
            const salvoLocal = localStorage.getItem('gesto_solicitacoes');
            if (salvoLocal) {
              (JSON.parse(salvoLocal) as Solicitacao[]).forEach(s => localPorCodigo.set(s.id, s));
            }
          } catch (e) {
            console.warn('localStorage ilegível — carga segue sem recuperação local:', e);
          }

          let comDocumentos = comLicoesAprendidas;
          if (dbIds.length > 0) {
            const { data: docsData, error: docsError } = await supabase
              .from('documentos')
              .select('*')
              .in('solicitacao_id', dbIds)
              .in('categoria', ['checklist_obrigatorio', 'checklist_outros', 'ged_execucao']);

            const { data: histData, error: histError } = await supabase
              .from('solicitacao_historico_etapas')
              .select('*')
              .in('solicitacao_id', dbIds)
              .order('created_at', { ascending: true });

            if (docsError) console.error('Erro ao carregar documentos:', docsError);
            if (histError) console.error('Erro ao carregar histórico de etapas:', histError);

            const docsPorSolicitacao = new Map<string, any[]>();
            ((docsData as any[]) ?? []).forEach((row) => {
              const lista = docsPorSolicitacao.get(row.solicitacao_id) ?? [];
              lista.push(row);
              docsPorSolicitacao.set(row.solicitacao_id, lista);
            });

            const histPorSolicitacao = new Map<string, any[]>();
            ((histData as any[]) ?? []).forEach((row) => {
              const lista = histPorSolicitacao.get(row.solicitacao_id) ?? [];
              lista.push(row);
              histPorSolicitacao.set(row.solicitacao_id, lista);
            });

            comDocumentos = comLicoesAprendidas.map(sol => {
              const solLocal = localPorCodigo.get(sol.id);
              const linhasDoc = sol._dbId ? docsPorSolicitacao.get(sol._dbId) : undefined;
              const linhasHist = sol._dbId ? histPorSolicitacao.get(sol._dbId) : undefined;

              let documentos: DocumentoChecklist[];
              let outrosDocumentos = sol.outrosDocumentos;
              let documentosGED = sol.documentosGED;

              if (linhasDoc && linhasDoc.length > 0) {
                // Banco é a fonte; base64 (fileContent) só existe no navegador que fez o upload
                const porNomeLogico = new Map<string, any>(
                  linhasDoc.filter(r => r.categoria === 'checklist_obrigatorio').map(r => [r.nome_logico, r])
                );
                documentos = montarChecklistCanonico([], sol.origemDemanda, sol.formaAtendimento).map(doc => {
                  const row = porNomeLogico.get(doc.id);
                  if (!row) return doc;
                  const docLocal = solLocal?.documentos?.find(d => d.id === doc.id);
                  return {
                    ...doc,
                    status: row.status ?? doc.status,
                    justificativa: row.justificativa ?? undefined,
                    fileName: row.file_name ?? undefined,
                    fileType: row.file_type ?? undefined,
                    fileSize: formatarTamanhoArquivo(row.file_size_bytes),
                    uploadedAt: row.uploaded_at ? String(row.uploaded_at).split('T')[0] : undefined,
                    fileContent: docLocal && docLocal.fileName === row.file_name ? docLocal.fileContent : undefined,
                  };
                });
                outrosDocumentos = linhasDoc
                  .filter(r => r.categoria === 'checklist_outros')
                  .map((row): DocumentoChecklist => ({
                    id: row.id,
                    nome: row.nome_logico,
                    obrigatorio: !!row.obrigatorio,
                    desc: 'Documento complementar anexado ao processo.',
                    status: row.status ?? 'pendente',
                    justificativa: row.justificativa ?? undefined,
                    fileName: row.file_name ?? undefined,
                    fileType: row.file_type ?? undefined,
                    fileSize: formatarTamanhoArquivo(row.file_size_bytes),
                    uploadedAt: row.uploaded_at ? String(row.uploaded_at).split('T')[0] : undefined,
                    fileContent: solLocal?.outrosDocumentos?.find(d => d.nome === row.nome_logico && d.fileName === row.file_name)?.fileContent,
                  }));

                const porNomeLogicoGED = new Map<string, any>(
                  linhasDoc.filter(r => r.categoria === 'ged_execucao').map(r => [r.nome_logico, r])
                );
                documentosGED = montarChecklistGED([]).map(doc => {
                  const row = porNomeLogicoGED.get(doc.id);
                  if (!row) return doc;
                  const docLocal = solLocal?.documentosGED?.find(d => d.id === doc.id);
                  return {
                    ...doc,
                    status: row.status ?? doc.status,
                    justificativa: row.justificativa ?? undefined,
                    fileName: row.file_name ?? undefined,
                    fileType: row.file_type ?? undefined,
                    fileSize: formatarTamanhoArquivo(row.file_size_bytes),
                    uploadedAt: row.uploaded_at ? String(row.uploaded_at).split('T')[0] : undefined,
                    fileContent: docLocal && docLocal.fileName === row.file_name ? docLocal.fileContent : undefined,
                  };
                });
              } else {
                // Recuperação: dados que o bug antigo descartava continuam no localStorage;
                // serão persistidos no banco no próximo save desta solicitação
                documentos = montarChecklistCanonico(solLocal?.documentos, sol.origemDemanda, sol.formaAtendimento);
                outrosDocumentos = solLocal?.outrosDocumentos ?? undefined;
                documentosGED = montarChecklistGED(solLocal?.documentosGED);
              }

              const historicoEtapas = (linhasHist && linhasHist.length > 0)
                ? linhasHist.map(row => ({
                    etapa: row.etapa_nova,
                    data: row.created_at ? String(row.created_at).split('T')[0] : '',
                    responsavel: row.responsavel ?? '',
                  }))
                : (solLocal?.historicoEtapas ?? []);

              return { ...sol, documentos, outrosDocumentos, documentosGED, historicoEtapas };
            });
          }

          // Carrega os reequilíbrios financeiros registrados de cada solicitação
          let comReequilibrios = comDocumentos;
          if (dbIds.length > 0) {
            const { data: reequilibriosData, error: reequilibriosError } = await supabase
              .from('reequilibrios_financeiros')
              .select('*')
              .in('solicitacao_id', dbIds)
              .order('created_at', { ascending: false });

            if (reequilibriosError) {
              console.error('Erro ao carregar reequilíbrios financeiros:', reequilibriosError);
            } else if (reequilibriosData) {
              const statusReequilibrioDoBanco = (v: string | null): StatusItemFinanceiroExecucao => {
                if (v === 'aprovado') return 'aprovado';
                if (v === 'recusado') return 'reprovado';
                if (v === 'aguardando_coordenador') return 'aguardando_coordenador';
                if (v === 'aguardando_liberacao_financeira') return 'aguardando_liberacao_financeira';
                return 'aguardando_analista';
              };

              const porSolicitacaoReequilibrio = new Map<string, any[]>();
              (reequilibriosData as any[]).forEach((row) => {
                const lista = porSolicitacaoReequilibrio.get(row.solicitacao_id) ?? [];
                lista.push(row);
                porSolicitacaoReequilibrio.set(row.solicitacao_id, lista);
              });

              comReequilibrios = comDocumentos.map(sol => {
                const linhas = sol._dbId ? porSolicitacaoReequilibrio.get(sol._dbId) : undefined;
                if (!linhas || linhas.length === 0) return sol;
                return {
                  ...sol,
                  reequilibrios: linhas.map((row: any) => ({
                    id: row.id,
                    dataCriacao: row.created_at ? String(row.created_at).split('T')[0] : '',
                    status: statusReequilibrioDoBanco(row.status),
                    valorReequilibrado: row.valor_reequilibrio ?? undefined,
                    dataReferenceSEE: row.data_referencia_see ? String(row.data_referencia_see) : undefined,
                    descontoContratual: row.desconto_contratual ?? undefined,
                    valorOriginal: row.valor_original ?? undefined,
                    analistaAtribuido: row.analista_nome ?? undefined,
                    coordenadorAprovador: row.coordenador_aprovador ?? undefined,
                    dataAprovacaoCoordenador: row.data_aprovacao_coordenador ?? undefined,
                    justificativaReprovacaoCoordenador: row.justificativa_reprovacao_coordenador ?? undefined,
                    parecerDore: row.parecer_dore ?? undefined,
                    liberadoPor: row.liberado_por ?? undefined,
                    dataLiberacaoFinanceira: row.data_liberacao_financeira ?? undefined,
                    justificativaReprovacaoFinanceira: row.justificativa_reprovacao_financeira ?? undefined,
                    dataEntradaFila: row.data_entrada_fila ?? undefined,
                    dataAtribuicao: row.data_atribuicao ?? undefined,
                    dataInicioAnalise: row.data_inicio_analise ?? undefined,
                    dataConclusao: row.data_conclusao ?? undefined,
                  })),
                };
              });
            }
          }

          // Carrega os saldos complementares registrados de cada solicitação
          let comSaldos = comReequilibrios;
          if (dbIds.length > 0) {
            const { data: saldosData, error: saldosError } = await supabase
              .from('saldos_complementares')
              .select('*')
              .in('solicitacao_id', dbIds)
              .order('created_at', { ascending: false });

            if (saldosError) {
              console.error('Erro ao carregar saldos complementares:', saldosError);
            } else if (saldosData) {
              const statusSaldoDoBanco = (v: string | null): StatusItemFinanceiroExecucao => {
                if (v === 'aprovado') return 'aprovado';
                if (v === 'recusado') return 'reprovado';
                if (v === 'aguardando_coordenador') return 'aguardando_coordenador';
                if (v === 'aguardando_liberacao_financeira') return 'aguardando_liberacao_financeira';
                return 'aguardando_analista';
              };

              const porSolicitacaoSaldo = new Map<string, any[]>();
              (saldosData as any[]).forEach((row) => {
                const lista = porSolicitacaoSaldo.get(row.solicitacao_id) ?? [];
                lista.push(row);
                porSolicitacaoSaldo.set(row.solicitacao_id, lista);
              });

              comSaldos = comReequilibrios.map(sol => {
                const linhas = sol._dbId ? porSolicitacaoSaldo.get(sol._dbId) : undefined;
                if (!linhas || linhas.length === 0) return sol;
                return {
                  ...sol,
                  saldosComplementares: linhas.map((row: any) => ({
                    id: row.id,
                    dataCriacao: row.created_at ? String(row.created_at).split('T')[0] : '',
                    status: statusSaldoDoBanco(row.status),
                    valorTC: row.valor_tc ?? 0,
                    valorLiberado: row.valor_liberado ?? 0,
                    valorPago: row.valor_pago ?? 0,
                    saldoEmConta: row.saldo_em_conta ?? 0,
                    necessidadeAditivo: row.necessidade_aditivo ?? 0,
                    analistaAtribuido: row.analista_nome ?? undefined,
                    documentos: row.documentos_checklist ? JSON.parse(row.documentos_checklist) : [],
                    coordenadorAprovador: row.coordenador_aprovador ?? undefined,
                    dataAprovacaoCoordenador: row.data_aprovacao_coordenador ?? undefined,
                    justificativaReprovacaoCoordenador: row.justificativa_reprovacao_coordenador ?? undefined,
                    liberadoPor: row.liberado_por ?? undefined,
                    dataLiberacaoFinanceira: row.data_liberacao_financeira ?? undefined,
                    justificativaReprovacaoFinanceira: row.justificativa_reprovacao_financeira ?? undefined,
                    dataEntradaFila: row.data_entrada_fila ?? undefined,
                    dataAtribuicao: row.data_atribuicao ?? undefined,
                    dataInicioAnalise: row.data_inicio_analise ?? undefined,
                    dataConclusao: row.data_conclusao ?? undefined,
                  })),
                };
              });
            }
          }

          // Carrega os auxiliares de validação (Elétrica/Arquitetura/PSCIP) de cada processo —
          // precisa vir depois de comSaldos porque distribui nas listas de ajustes/reequilibrios/
          // saldosComplementares já hidratadas. Ver [[equipes-analista-auxiliares]].
          let comAuxiliares = comSaldos;
          if (dbIds.length > 0) {
            const { data: auxData, error: auxError } = await supabase
              .from('processo_auxiliares')
              .select('*')
              .in('solicitacao_id', dbIds)
              .order('created_at', { ascending: true });

            if (auxError) {
              console.error('Erro ao carregar auxiliares de validação:', auxError);
            } else if (auxData) {
              const porSolicitacaoAux = new Map<string, any[]>();
              (auxData as any[]).forEach((row) => {
                const lista = porSolicitacaoAux.get(row.solicitacao_id) ?? [];
                lista.push(row);
                porSolicitacaoAux.set(row.solicitacao_id, lista);
              });

              const paraAuxiliar = (row: any): AuxiliarProcesso => ({
                id: row.id,
                nome: row.nome,
                usuarioId: row.usuario_id ?? undefined,
                equipe: row.equipe,
                parecer: row.parecer ?? undefined,
                aprovado: row.aprovado ?? undefined,
                dataParecer: row.data_parecer ?? undefined,
              });

              comAuxiliares = comSaldos.map(sol => {
                const linhas = sol._dbId ? porSolicitacaoAux.get(sol._dbId) : undefined;
                if (!linhas || linhas.length === 0) return sol;
                const porItem = (tipo: string, itemId: string | null) =>
                  linhas.filter(r => r.tipo_item === tipo && (itemId === null ? true : r.item_id === itemId)).map(paraAuxiliar);
                return {
                  ...sol,
                  auxiliares: porItem('analise', null),
                  ajustes: (sol.ajustes || []).map(a => ({ ...a, auxiliares: porItem('ajuste', a.id) })),
                  reequilibrios: (sol.reequilibrios || []).map(r => ({ ...r, auxiliares: porItem('reequilibrio', r.id) })),
                  saldosComplementares: (sol.saldosComplementares || []).map(s => ({ ...s, auxiliares: porItem('saldo', s.id) })),
                };
              });
            }
          }

          // Carrega as parcelas do PAF (recursos liberados) de cada solicitação
          let comParcelas = comAuxiliares;
          if (dbIds.length > 0) {
            const { data: parcelasData, error: parcelasError } = await supabase
              .from('parcelas_paf')
              .select('*')
              .in('solicitacao_id', dbIds)
              .order('data_pagamento', { ascending: true });

            if (parcelasError) {
              console.error('Erro ao carregar parcelas do PAF:', parcelasError);
            } else if (parcelasData) {
              const porSolicitacaoParcela = new Map<string, any[]>();
              (parcelasData as any[]).forEach((row) => {
                const lista = porSolicitacaoParcela.get(row.solicitacao_id) ?? [];
                lista.push(row);
                porSolicitacaoParcela.set(row.solicitacao_id, lista);
              });

              comParcelas = comSaldos.map(sol => {
                const linhas = sol._dbId ? porSolicitacaoParcela.get(sol._dbId) : undefined;
                if (!linhas || linhas.length === 0) return sol;
                return {
                  ...sol,
                  parcelasPAF: linhas.map((row: any) => ({
                    id: row.id,
                    valor: row.valor ?? 0,
                    dataPagamento: row.data_pagamento ?? '',
                    ordemPagamento: row.ordem_pagamento ?? undefined,
                  })),
                };
              });
            }
          }

          setSolicitacoes(comParcelas);
          return;
        }
      } catch (e) {
        console.error('Falha ao carregar do Supabase, caindo para localStorage:', e);
      }

      // Fallback: localStorage (comportamento original)
      const saved = localStorage.getItem('gesto_solicitacoes');
      if (saved) {
      try {
        const parsed = JSON.parse(saved) as Solicitacao[];

        // Migração do checklist para a estrutura canônica atual, preservando os
        // dados de upload/validação (fonte única: montarChecklistCanonico em types.ts)
        const migrado = parsed.map(s => ({
          ...s,
          documentos: montarChecklistCanonico(s.documentos, s.origemDemanda, s.formaAtendimento),
        }));

        const migradoComPrioridade = migrado.map(recalcularPrioridade).map(recalcularIEE);
        setSolicitacoes(migradoComPrioridade);
        localStorage.setItem('gesto_solicitacoes', JSON.stringify(migradoComPrioridade));
      } catch (e) {
        console.error('Falha ao parsear localStorage, resetando...', e);
        setSolicitacoes([]);
      }
      } else {
        setSolicitacoes([]);
      }
    }

    async function carregarUsuarios() {
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('usuarios')
        .select('id, nome, email, perfil_id, equipe_analise, perfis(codigo), usuario_regionais(regionais_sre(nome))')
        .eq('ativo', true);

      if (usuariosError) {
        console.error('Erro ao carregar usuários:', usuariosError);
        return;
      }

      if (usuariosData) {
        setUsuariosSeguranca(usuariosData.map((u: any) => {
          const regionais = (u.usuario_regionais ?? [])
            .map((ur: any) => ur.regionais_sre?.nome)
            .filter(Boolean) as string[];
          return {
            id: u.id,
            nome: u.nome,
            email: u.email,
            perfil: u.perfis?.codigo ?? '',
            departamento: regionais[0] ?? '',
            regionais,
            equipeAnalise: u.equipe_analise ?? undefined,
          };
        }));
      }
    }

    carregarSolicitacoes();
    carregarUsuarios();
  }, []);

  // Autoreset search criteria on subtask change to avoid bleed
  useEffect(() => {
    setSchoolSearchQuery('');
    setIsSelectorOpen(false);
  }, [activeSubTask]);

  // Restaura sessão do Supabase Auth ao recarregar a página
  useEffect(() => {
    async function restaurarUsuario(userId: string) {
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('nome, perfis(codigo)')
        .eq('id', userId)
        .single();
      if (usuario) {
        setPerfilUsuario((usuario.perfis as unknown as { codigo: string }).codigo as PerfilUsuario);
        setNomeUsuario(usuario.nome as string);
        setIdUsuarioLogado(userId);
        setLogado(true);
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) restaurarUsuario(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setLogado(false);
        setNomeUsuario('');
        setIdUsuarioLogado(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Persiste UMA solicitação no Supabase: upsert dos escalares + sincronização das
  // tabelas-filhas de checklist/histórico. Lança em qualquer erro; retorna o uuid da linha.
  const persistirSolicitacao = async (sol: Solicitacao): Promise<string> => {
    const { data: auth } = await supabase.auth.getUser();
    const usuarioId = auth?.user?.id ?? null;

    const { data, error } = await supabase
      .from('solicitacoes')
      .upsert({
          codigo_sgo: sol.id,
          codesc: sol.codesc,
          nome_escola: sol.nomeEscola,
          municipio: sol.municipio,
          sre: sol.sre,
          tipo: sol.tipo,
          etapa_atual: sol.etapaAtual,
          prioridade_score: sol.prioridadeScore ?? 0,
          estrelas: sol.estrelas ?? 0,
          iee: sol.iee ?? 0,
          iee_classe: sol.ieeClasse ?? null,
          iee_pontos: sol.ieePontos ?? 0,
          iee_complexidade: sol.ieeComplexidade ?? null,
          status_identificacao_escolar: sol.statusSecoes?.identificacao_escolar?.status ?? 'pendente',
          motivo_identificacao_escolar: sol.statusSecoes?.identificacao_escolar?.motivo ?? null,
          status_classificacao_patrimonial: sol.statusSecoes?.classificacao_patrimonial?.status ?? 'pendente',
          motivo_classificacao_patrimonial: sol.statusSecoes?.classificacao_patrimonial?.motivo ?? null,
          status_detalhamento_tecnico: sol.statusSecoes?.detalhamento_tecnico?.status ?? 'pendente',
          motivo_detalhamento_tecnico: sol.statusSecoes?.detalhamento_tecnico?.motivo ?? null,
          status_referencia_dotacao: sol.statusSecoes?.referencia_dotacao?.status ?? 'pendente',
          motivo_referencia_dotacao: sol.statusSecoes?.referencia_dotacao?.motivo ?? null,
          valores_originais_tecnico: sol.valoresOriginaisTecnico ?? null,
          tipo_atendimento: sol.tipoAtendimento ?? null,
          atendimento_orgao: sol.atendimentoOrgao ?? null,
          forma_atendimento: sol.formaAtendimento ?? null,
          origem_demanda: sol.origemDemanda ?? null,
          num_paf: sol.numPaf ?? null,
          ano_emenda: sol.anoEmenda ?? null,
          tipo_emenda: sol.tipoEmenda ?? null,
          numero_indicacao_emenda: sol.numeroIndicacaoEmenda ?? null,
          descricao_folha_rosto: sol.descricaoFolhaRosto ?? null,
          valor_planilha: sol.valorPlanilha ?? null,
          valor_homologado: sol.valorHomologado ?? null,
          numero_paf: sol.numeroPAF ?? null,
          data_homologacao: dataOuNull(sol.dataHomologacao),
          data_vigencia_paf: dataOuNull(sol.dataVigenciaPAF),
          data_fin_homologacao: dataOuNull(sol.dataFinHomologacao),
          status_paf: sol.statusPAF ?? null,
          cnpj_caixa_escolar: sol.cnpjCaixaEscolar ?? null,
          prazo_estimado_obra: sol.prazoEstimadoObra ?? null,
          prazo_estimado_meses: sol.prazoEstimadoMeses ?? null,
          iss: sol.iss ?? null,
          codigo_endereco: sol.codigoEndereco ?? null,
          forma_ocupacao: sol.formaOcupacao ?? null,
          predio: sol.predio ?? null,
          tombado: sol.tombado ?? null,
          orgao_tombador: sol.orgaoTombador ?? null,
          coabitado: sol.coabitado ?? null,
          tipo_coabitado: sol.tipoCoabitado ?? null,
          ficha_verificada: sol.fichaVerificada ?? false,
          observacoes_ficha: sol.observacoesFicha ?? null,
          empresa_contratada: sol.empresaContratada ?? null,
          cnpj_empresa: sol.cnpjEmpresa ?? null,
          responsavel: sol.responsavel ?? null,
          data_ordem_inicio: dataOuNull(sol.dataOrdemInicio),
          previsao_termino_obra: dataOuNull(sol.previsaoTerminoObra),
          garantia_tipo: sol.garantiaTipo ?? null,
          contrato_data_assinatura: dataOuNull(sol.contratoDataAssinatura),
          contrato_inicio_vigencia: dataOuNull(sol.contratoInicioVigencia),
          contrato_fim_vigencia: dataOuNull(sol.contratoFimVigencia),
          garantia_validade: dataOuNull(sol.garantiaValidade),
          garantia_valor: sol.garantiaValor ?? null,
          garantia_exigida: sol.garantiaExigida ?? null,
          status_contrato_empresa: sol.statusContratoEmpresa ?? null,
          duracao_obra_meses: sol.duracaoObraMeses ?? null,
          status_aprovacao_regional: sol.statusAprovacaoRegional ?? null,
          coordenador_aprovador: sol.coordenadorAprovador ?? null,
          data_aprovacao_regional: dataOuNull(sol.dataAprovacaoRegional),
          justificativa_reprovacao_regional: sol.justificativaReprovacaoRegional ?? null,
          cadastro_obra_confirmado: sol.cadastroObraConfirmado ?? false,
          atribuicao_forcada: sol.atribuicaoForcada ?? false,
          contador_analises: sol.contadorAnalises ?? 0,
          valor_contrato: sol.contratoValorInicial ?? null,
          status_obra: statusObraParaBanco(sol),
          analista_atribuido_id: resolverUsuarioIdPorNome(usuariosSeguranca, sol.analistaAtribuido),
          // Preferência: id explícito escolhido na UI (main); fallback: resolução por nome
          fiscal_obra_atribuido_id: sol.fiscalObraAtribuidoId ?? resolverUsuarioIdPorNome(usuariosSeguranca, sol.fiscalObraAtribuido),
          // SLA da Análise Técnica — ver [[sla-atendimentos]]
          analise_data_entrada_fila: dataOuNull(sol.analiseSla?.dataEntradaFila),
          analise_data_atribuicao: dataOuNull(sol.analiseSla?.dataAtribuicao),
          analise_data_inicio: dataOuNull(sol.analiseSla?.dataInicioAnalise),
          analise_data_conclusao: dataOuNull(sol.analiseSla?.dataConclusao),
          // Campos da aba Conclusão de Obra
          data_conclusao: dataOuNull(sol.dataConclusao),
          laudo_conclusivo_file_name: sol.laudoConclusivoFileName ?? null,
          laudo_conclusivo_file_size: sol.laudoConclusivoFileSize ?? null,
          laudo_conclusivo_uploaded_at: dataOuNull(sol.laudoConclusivoUploadedAt),
          relatorio_fotografico_file_name: sol.relatorioFotograficoFileName ?? null,
          relatorio_fotografico_file_size: sol.relatorioFotograficoFileSize ?? null,
          relatorio_fotografico_uploaded_at: dataOuNull(sol.relatorioFotograficoUploadedAt),
          planilha_medicao_final_file_name: sol.planilhaMedicaoFinalFileName ?? null,
          planilha_medicao_final_file_size: sol.planilhaMedicaoFinalFileSize ?? null,
          planilha_medicao_final_uploaded_at: dataOuNull(sol.planilhaMedicaoFinalUploadedAt),
          // Termo de Aceite Provisório/Definitivo — regra dos 90 dias entre os dois
          termo_aceite_provisorio_data: dataOuNull(sol.termoAceiteProvisorioData),
          termo_aceite_provisorio_file_name: sol.termoAceiteProvisorioFileName ?? null,
          termo_aceite_provisorio_file_size: sol.termoAceiteProvisorioFileSize ?? null,
          termo_aceite_provisorio_uploaded_at: dataOuNull(sol.termoAceiteProvisorioUploadedAt),
          termo_aceite_definitivo_data: dataOuNull(sol.termoAceiteDefinitivoData),
          termo_aceite_definitivo_file_name: sol.termoAceiteDefinitivoFileName ?? null,
          termo_aceite_definitivo_file_size: sol.termoAceiteDefinitivoFileSize ?? null,
          termo_aceite_definitivo_uploaded_at: dataOuNull(sol.termoAceiteDefinitivoUploadedAt),
          updated_at: new Date().toISOString()
        }, { onConflict: 'codigo_sgo' })
        .select('id')
        .single();

    if (error) throw error;
    const dbId = (data as { id: string }).id;

    await sincronizarDocumentosDaSolicitacao(dbId, sol, usuarioId);
    await sincronizarHistoricoEtapas(dbId, sol, usuarioId);
    await sincronizarParcelasDaSolicitacao(dbId, sol);
    return dbId;
  };

  // Persists updates: state React (síncrono) + localStorage (fallback) + Supabase (assíncrono).
  // Só as `alteradas` vão ao banco — nada de regravar a lista inteira a cada edição.
  const atualizarEGuardarSolicitacoes = (novasBrutas: Solicitacao[], alteradas: Solicitacao[]) => {
    // Recalcula score/estrelas/etiquetas a cada criação, atualização ou ajuste de prioridade manual
    const novas = novasBrutas.map(recalcularPrioridade).map(recalcularIEE);
    setSolicitacoes(novas);

    // Fallback localStorage durante transição
    try {
      localStorage.setItem('gesto_solicitacoes', JSON.stringify(novas));
    } catch (err) {
      console.warn('localStorage cheio:', err);
    }

    // Persiste as versões recalculadas (score/IEE atualizados) das alteradas
    const paraPersistir = alteradas
      .map(a => novas.find(s => s.id === a.id))
      .filter((s): s is Solicitacao => !!s);

    (async () => {
      for (const sol of paraPersistir) {
        try {
          const dbId = await persistirSolicitacao(sol);
          if (!sol._dbId) {
            setSolicitacoes(prev => prev.map(s => s.id === sol.id ? { ...s, _dbId: dbId } : s));
          }
        } catch (error: any) {
          console.error('Erro ao persistir solicitação no Supabase:', JSON.stringify(error, null, 2));
          alert(`Falha ao salvar "${sol.nomeEscola}" no banco de dados. As alterações estão salvas apenas neste navegador. Detalhe: ${error?.message ?? error}`);
        }
      }
    })();
  };

  const handleInjetarDemandaTeste = (subTask: string) => {
    const randomId = `SGO-${Math.floor(1000 + Math.random() * 9000)}`;
    let nova: Solicitacao;

    if (subTask === 'cadastro') {
      nova = {
        id: randomId,
        nomeEscola: 'E.E. Cecília Meireles',
        codesc: '304556',
        sre: 'SRE Ouro Preto',
        municipio: 'Ouro Preto',
        valorPlanilha: 280000,
        tipo: 'Reforma de Telhas e Calhas do Bloco Secundário',
        etapaAtual: 'cadastro',
        contadorAnalises: 0,
        dataCriacao: new Date().toISOString().split('T')[0],
        historicoEtapas: [{ etapa: 'cadastro', data: new Date().toISOString().split('T')[0], responsavel: 'Sistema / Atendimento Inicial' }],
        documentos: [
          { id: 'doc_1', nome: 'Plano de Trabalho Autuado', obrigatorio: true, desc: 'Indicação clara do objeto, justificativa e custos.', status: 'pendente' },
          { id: 'doc_2', nome: 'Planilha de Orçamentos SGO', obrigatorio: true, desc: 'Orçamento quantitativo detalhado com bdi.', status: 'pendente' },
          { id: 'doc_3', nome: 'Cronograma Físico-Financeiro', obrigatorio: true, desc: 'Planejamento de evolução temporal.', status: 'pendente' },
          { id: 'doc_4', nome: 'Parecer técnico', obrigatorio: true, desc: 'Parecer descritivo emitido pela equipe.', status: 'pendente' },
          { id: 'doc_5', nome: 'Imposto ISS', obrigatorio: true, desc: 'Comprovante tributário aplicável.', status: 'pendente' }
        ],
        medicoes: [],
        aditivos: []
      };
    } else if (subTask === 'analise') {
      nova = {
        id: randomId,
        nomeEscola: 'E.E. Carlos Drummond',
        codesc: '201948',
        sre: 'SRE Juiz de Fora',
        municipio: 'Juiz de Fora',
        valorPlanilha: 650000,
        tipo: 'Ampliação e Cobertura de Quadra Poliesportiva',
        etapaAtual: 'analise',
        contadorAnalises: 1,
        dataCriacao: new Date().toISOString().split('T')[0],
        historicoEtapas: [{ etapa: 'analise', data: new Date().toISOString().split('T')[0], responsavel: 'Téc. SRE (Envio)' }],
        documentos: [
          { id: 'doc_1', nome: 'Plano de Trabalho Autuado', obrigatorio: true, desc: 'Indicação clara do objeto.', fileName: 'plano_trabalho_Drummond.pdf', fileSize: '1.2 MB', uploadedAt: new Date().toISOString().split('T')[0], status: 'pendente' },
          { id: 'doc_2', nome: 'Planilha de Orçamentos SGO', obrigatorio: true, desc: 'Orçamento quantitativo.', fileName: 'orcamento_Drummond.xlsx', fileSize: '2.5 MB', uploadedAt: new Date().toISOString().split('T')[0], status: 'pendente' },
          { id: 'doc_3', nome: 'Cronograma Físico-Financeiro', obrigatorio: true, desc: 'Planejamento de evolução temporal.', fileName: 'cronograma_Drummond.xlsx', fileSize: '1.1 MB', uploadedAt: new Date().toISOString().split('T')[0], status: 'pendente' },
          { id: 'doc_4', nome: 'Parecer técnico', obrigatorio: true, desc: 'Parecer descritivo.', fileName: 'parecer_Drummond.pdf', fileSize: '1.8 MB', uploadedAt: new Date().toISOString().split('T')[0], status: 'pendente' },
          { id: 'doc_5', nome: 'Imposto ISS', obrigatorio: true, desc: 'Comprovante tributário aplicável.', status: 'pendente' }
        ],
        medicoes: [],
        aditivos: []
      };
    } else if (subTask === 'paf') {
      nova = {
        id: randomId,
        nomeEscola: 'E.E. Guimarães Rosa',
        codesc: '109923',
        sre: 'SRE Cordisburgo',
        municipio: 'Cordisburgo',
        valorPlanilha: 1120000,
        tipo: 'Construção de Novas Salas de Aula e Acessibilidade PNE',
        etapaAtual: 'paf',
        contadorAnalises: 1,
        dataCriacao: new Date().toISOString().split('T')[0],
        historicoEtapas: [{ etapa: 'paf', data: new Date().toISOString().split('T')[0], responsavel: 'Eng. DORE (Aprovação)' }],
        documentos: [
          { id: 'doc_1', nome: 'Plano de Trabalho Autuado', obrigatorio: true, desc: 'Plano autuado.', status: 'aprovado', fileName: 'plano.pdf' },
          { id: 'doc_2', nome: 'Planilha de Orçamentos SGO', obrigatorio: true, desc: 'Planilha de orçamentos.', status: 'aprovado', fileName: 'orcamento.xlsx' },
          { id: 'doc_3', nome: 'Cronograma Físico-Financeiro', obrigatorio: true, desc: 'Cronograma de evolução.', status: 'aprovado', fileName: 'cronograma.xlsx' },
          { id: 'doc_4', nome: 'Parecer técnico', obrigatorio: true, desc: 'Parecer descritivo emitido pela engenharia.', status: 'aprovado', fileName: 'parecer.pdf' }
        ],
        medicoes: [],
        aditivos: []
      };
    } else if (subTask === 'ordem_inicio') {
      nova = {
        id: randomId,
        nomeEscola: 'E.E. Cora Coralina',
        codesc: '302488',
        sre: 'SRE Itabira',
        municipio: 'Itabira',
        valorPlanilha: 380000,
        tipo: 'Reforma Elétrica e Rede Lógica de Alta Tensão',
        etapaAtual: 'ordem_inicio',
        contadorAnalises: 1,
        dataCriacao: new Date().toISOString().split('T')[0],
        historicoEtapas: [{ etapa: 'ordem_inicio', data: new Date().toISOString().split('T')[0], responsavel: 'Gestor Financeiro' }],
        numeroPAF: 'PAF-2026-67522',
        statusPAF: 'Pago e Liberado',
        valorHomologado: 380000,
        documentos: [],
        medicoes: [],
        aditivos: []
      };
    } else { // execucao, aditivos, ajustes, conclusao
      nova = {
        id: randomId,
        nomeEscola: 'E.E. João Guimarães Rosa (Campus Execução)',
        codesc: '315664',
        sre: 'SRE Cordisburgo',
        municipio: 'Cordisburgo',
        valorPlanilha: 450000,
        tipo: 'Execução de Muro de Contenção, Drenagem Pluvial e Alambrado',
        etapaAtual: 'execucao',
        contadorAnalises: 1,
        dataCriacao: new Date().toISOString().split('T')[0],
        historicoEtapas: [{ etapa: 'execucao', data: new Date().toISOString().split('T')[0], responsavel: 'Fiscal de Obras SRE' }],
        numeroPAF: 'PAF-2026-88194',
        statusPAF: 'Pago e Liberado',
        valorHomologado: 450000,
        dataOrdemInicio: '2026-03-10',
        previsaoTerminoObra: '2026-09-10',
        valorHomologadoContratacao: 442000,
        cronogramaFisicoFinanceiroFileName: 'cronograma_ajustado.xlsx',
        documentos: [],
        medicoes: [
          { id: 'm-1', data: '2026-04-15', valor: 90000, porcentagem: 20.35, descricao: 'Fase I: Fundações, terraplanagem concluída e estaques do muro.' }
        ],
        aditivos: [],
        ajustes: []
      };
    }

    const novas = [nova, ...solicitacoes];
    atualizarEGuardarSolicitacoes(novas, [nova]);
    setSelectedSchoolsPorSubtask(prev => ({
      ...prev,
      [subTask]: randomId
    }));
  };

  const handleUpdateSolicitacao = (updated: Solicitacao) => {
    const old = solicitacoes.find(s => s.id === updated.id);
    const novas = solicitacoes.map(s => s.id === updated.id ? updated : s);
    atualizarEGuardarSolicitacoes(novas, [updated]);

    if (old) {
      // 1. Check if step/etapa was transitioned
      if (old.etapaAtual !== updated.etapaAtual) {
        const stepLabels: Record<string, string> = {
          cadastro: 'Cadastro de Demanda SGO',
          analise: 'Análise Técnica (DORE)',
          correcao: 'Correção de Dossiê Técnico',
          paf_autorizacao: 'Autorização do PAF (SAF/PAF)',
          paf: 'Geração de PAF Orçamentário',
          execucao: 'Execução e Fiscalização da Obra',
          ordem_inicio: 'Ordem de Início emitida',
          cancelado: 'Cancelada'
        };
        const de = stepLabels[old.etapaAtual] || old.etapaAtual;
        const para = stepLabels[updated.etapaAtual] || updated.etapaAtual;
        
        const isProgression = ['analise', 'paf_autorizacao', 'paf', 'execucao'].includes(updated.etapaAtual);
        const tipoNotif = isProgression ? 'processo_avanco' : 'processo_retrocesso';
        const tipoLog = isProgression ? 'sucesso' : 'erro';

        criarNotificacao(
          `Trâmite de Processo: ${updated.nomeEscola}`,
          `O status do processo transitou de [${de}] para [${para}].`,
          tipoNotif,
          updated.id,
          updated.nomeEscola
        );

        registrarLog(
          `Transição de Etapa: ${para}`,
          `O processo correspondente migrou da etapa de [${de}] para [${para}] de forma regulamentar.`,
          tipoLog,
          updated.id,
          updated.nomeEscola
        );
      }

      // 2. Check if a new aditivo was added
      const oldAditivosCount = old.aditivos?.length || 0;
      const newAditivosCount = updated.aditivos?.length || 0;
      if (newAditivosCount > oldAditivosCount) {
        const newAdt = updated.aditivos?.[0]; // Usually added at index 0
        if (newAdt) {
          criarNotificacao(
            `Solicitação de Termo Aditivo: ${updated.nomeEscola}`,
            `Um pleito de termo aditivo do tipo [${newAdt.tipo}] no valor de R$ ${(newAdt.valorAditivo || 0).toLocaleString('pt-BR')} foi encaminhado para análise.`,
            'aditivo_pendente',
            updated.id,
            updated.nomeEscola
          );

          registrarLog(
            `Cadastro de Aditivo (${newAdt.tipo})`,
            `Novo pleito de termo aditivo cadastrado no montante financeiro líquido de R$ ${(newAdt.valorAditivo || 0).toLocaleString('pt-BR')}. Justificativa: "${newAdt.justificativa}".`,
            'alerta',
            updated.id,
            updated.nomeEscola
          );
        }
      }

      // 3. Check if an aditivo was approved or rejected
      const oldPendingAdtsIds = (old.aditivos || []).filter(a => a.status === 'Pendente').map(a => a.id);
      const newlyEvaluatedAdts = (updated.aditivos || []).filter(a => !oldPendingAdtsIds.includes(a.id) || a.status !== 'Pendente');
      newlyEvaluatedAdts.forEach(adt => {
        const oldAdtVal = (old.aditivos || []).find(o => o.id === adt.id);
        if (oldAdtVal && oldAdtVal.status !== adt.status) {
          const statusLabel = adt.status === 'Aprovado' ? 'Homologado e Aprovado' : 'Recusado / Indeferido';
          const severity = adt.status === 'Aprovado' ? 'sucesso' : 'erro';
          
          criarNotificacao(
            `Resultado de Termo Aditivo: ${updated.nomeEscola}`,
            `O pleito de aditivo de ${adt.tipo} foi ${statusLabel} pela DORE SGO.`,
            adt.status === 'Aprovado' ? 'processo_avanco' : 'processo_retrocesso',
            updated.id,
            updated.nomeEscola
          );

          registrarLog(
            `Termo Aditivo ${adt.status}`,
            `Decisão proferida sobre o pleito secundário. Despacho Técnico de Engenharia: "${adt.parecerConsolidado || 'Despacho padrão de engenharia registrado'}".`,
            severity,
            updated.id,
            updated.nomeEscola
          );
        }
      });

      // 4. Check if a new ajuste was added
      const oldAjustesCount = old.ajustes?.length || 0;
      const newAjustesCount = updated.ajustes?.length || 0;
      if (newAjustesCount > oldAjustesCount) {
        const newAju = updated.ajustes?.[0]; // index 0 or end as well, in types adjustment can be added at top/bottom
        if (newAju) {
          criarNotificacao(
            `Ajuste de Planilha de Obras: ${updated.nomeEscola}`,
            `Um pedido de alteração de planilha (Ajuste nº ${newAju.numero}) foi encaminhado para a engenharia da DORE.`,
            'ajuste_pendente',
            updated.id,
            updated.nomeEscola
          );

          registrarLog(
            `Cadastro de Ajuste (Nº ${newAju.numero})`,
            `Uma nova planilha modificada contendo acréscimos e supressões de serviços foi submetida para avaliação.`,
            'alerta',
            updated.id,
            updated.nomeEscola
          );
        }
      }

      // 5. Check if an ajuste was approved or rejected
      const oldAnaliseAjuIds = (old.ajustes || []).filter(a => a.status === 'analise_dore').map(a => a.id);
      const newlyEvaluatedAjus = (updated.ajustes || []).filter(a => !oldAnaliseAjuIds.includes(a.id) || a.status !== 'analise_dore');
      newlyEvaluatedAjus.forEach(aju => {
        const oldAjuVal = (old.ajustes || []).find(o => o.id === aju.id);
        if (oldAjuVal && oldAjuVal.status !== aju.status) {
          const statusLabel = aju.status === 'validado' ? 'Homologado e Aprovado' : 'Devolvido para Correção';
          const severity = aju.status === 'validado' ? 'sucesso' : 'erro';

          criarNotificacao(
            `Resultado de Ajuste de Planilha: ${updated.nomeEscola}`,
            `O Ajuste de Planilha de Obras nº ${aju.numero} foi ${statusLabel} pela engenharia da DORE.`,
            aju.status === 'validado' ? 'processo_avanco' : 'processo_retrocesso',
            updated.id,
            updated.nomeEscola
          );

          registrarLog(
            `Ajuste de Planilha ${aju.status === 'validado' ? 'Aprovado' : 'Recusado'}`,
            `Avaliação concluída do ajuste de planilha de serviços. Parecer Conclusivo: "${aju.parecerDore || 'Despacho padrão registrado'}".`,
            severity,
            updated.id,
            updated.nomeEscola
          );
        }
      });

      // 6. Check if a Técnico SRE requested cancellation — notifica o Administrador
      if (!old.solicitacaoCancelamento && updated.solicitacaoCancelamento) {
        criarNotificacao(
          `Solicitação de Cancelamento: ${updated.nomeEscola}`,
          `${updated.solicitacaoCancelamentoPor || 'Téc. SRE'} solicitou o cancelamento do processo. Motivo: "${updated.motivoSolicitacaoCancelamento || ''}".`,
          'alerta',
          updated.id,
          updated.nomeEscola
        );

        registrarLog(
          'Solicitação de Cancelamento de Processo',
          `Cancelamento solicitado por ${updated.solicitacaoCancelamentoPor || 'Téc. SRE'}. Motivo: "${updated.motivoSolicitacaoCancelamento || ''}".`,
          'alerta',
          updated.id,
          updated.nomeEscola
        );
      }
    }
  };

  const handleDeleteSolicitacao = async (id: string) => {
    const sol = solicitacoes.find(s => s.id === id);
    const novas = solicitacoes.filter(s => s.id !== id);

    // Exclusão real no banco (antes, a linha "ressuscitava" no reload)
    if (sol) {
      try {
        let dbId = sol._dbId;
        if (!dbId) {
          const { data } = await supabase
            .from('solicitacoes')
            .select('id')
            .eq('codigo_sgo', sol.id)
            .maybeSingle();
          dbId = (data as { id: string } | null)?.id;
        }
        if (dbId) {
          // Filhas com FK NO ACTION precisam sair antes; documentos/histórico caem por CASCADE
          const tabelasNoAction = [
            'medicoes', 'aditivos', 'ajustes_planilha', 'diarios_obra',
            'restricoes_obra', 'vistorias_obra', 'reequilibrios_financeiros', 'saldos_complementares',
          ];
          for (const tabela of tabelasNoAction) {
            const { error } = await supabase.from(tabela).delete().eq('solicitacao_id', dbId);
            if (error) throw error;
          }
          const { error } = await supabase.from('solicitacoes').delete().eq('id', dbId);
          if (error) throw error;
        }
      } catch (error: any) {
        console.error('Erro ao excluir solicitação no Supabase:', JSON.stringify(error, null, 2));
        alert(`Falha ao excluir "${sol.nomeEscola}" no banco de dados. A exclusão não foi aplicada. Detalhe: ${error?.message ?? error}`);
        return;
      }
    }

    atualizarEGuardarSolicitacoes(novas, []);
  };

  // Lápis de edição em listas/kanban: rascunho (etapaAtual === 'cadastro') sempre volta ao
  // Atendimento Inicial (fluxo guiado completo, com todos os campos e documentos), independente
  // do perfil de quem clicou. O modal de edição rápida só é usado para outras etapas do processo.
  const handleEditarAtendimento = (sol: Solicitacao) => {
    if (sol.etapaAtual === 'cadastro') {
      setAtendimentoEmEdicaoDirect(sol);
      setActiveSubTask('novo_atendimento');
    } else {
      setSolicitacaoEmEdicao(sol);
    }
  };

  const handleSelectSolicitacao = (sol: Solicitacao) => {
    let targetSubTask = 'cadastro';
    const etapa = sol.etapaAtual;
    if (etapa === 'cadastro' || etapa === 'correcao') {
      if (etapa === 'correcao' || (perfilUsuario === 'tecnico_infra' && etapa === 'cadastro')) {
        // Correção sempre vai para o atendimento inicial para edição guiada
        targetSubTask = 'novo_atendimento';
        setAtendimentoEmEdicaoDirect(sol);
        setSolicitacaoEmEdicao(null);
      } else {
        targetSubTask = 'cadastro';
        setSolicitacaoEmEdicao(sol);
      }
    } else if (etapa === 'analise') {
      targetSubTask = 'analise';
    } else if (etapa === 'paf_autorizacao') {
      targetSubTask = 'paf_autorizacao';
    } else if (etapa === 'paf') {
      targetSubTask = 'paf';
    } else if (etapa === 'ordem_inicio' || etapa === 'execucao') {
      targetSubTask = 'execucao';
    }

    setActiveModule('gestao_obras');
    setActiveSubTask(targetSubTask);
    setSelectedSchoolsPorSubtask(prev => ({
      ...prev,
      [targetSubTask]: sol.id
    }));
    setIdSolicitacaoSelecionada(null);
  };

  const handleNovaSolicitacao = (nova: Solicitacao) => {
    const novas = [nova, ...solicitacoes];
    atualizarEGuardarSolicitacoes(novas, [nova]);
  };

  const handleLogin = (perfil: PerfilUsuario, nome: string, usuarioId: string) => {
    setPerfilUsuario(perfil);
    setNomeUsuario(nome);
    setIdUsuarioLogado(usuarioId);
    setLogado(true);
  };

  const handleLogout = () => {
    supabase.auth.signOut();
    setLogado(false);
    setNomeUsuario('');
    setIdUsuarioLogado(null);
    setMostrarMenuNotif(false);
  };

  if (!logado) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const somenteLeitura =
    (perfilUsuario === 'administrativo_dore' && activeSubTask !== 'paf') ||
    (perfilUsuario === 'gestor_paf' && activeSubTask !== 'paf_autorizacao');

  // Find currently open solicitação
  const solicitacaoAberta = solicitacoes.find(s => s.id === idSolicitacaoSelecionada) || null;

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      
      {/* CABEÇALHO OFICIAL DO GESTO - PROFISSIONAL POLISH THEME */}
      <header className="h-16 bg-[#13264d] flex items-center justify-between px-8 shrink-0 shadow-sm border-none print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">SGO</span>
          </div>
          <div>
            <h1 className="text-slate-100 font-semibold text-base sm:text-lg tracking-tight">
              Sistema de Gestão de Obras
            </h1>
          </div>
        </div>

        {/* Informação do Usuário Simulado com Avatar e Cargo */}
        <div className="flex items-center gap-5">
          {/* CENTRAL DE NOTIFICAÇÕES - HEADER FAST VIEW */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setMostrarMenuNotif(!mostrarMenuNotif);
              }}
              className="relative p-2 text-slate-300 hover:text-white hover:bg-blue-900/60 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 border border-slate-500/10"
              title="Notificações do Sistema"
            >
              <Bell className="w-4.5 h-4.5" />
              {notifications.filter(n => !n.lida).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-600 border border-[#13264d] text-[9px] font-black text-white rounded-full min-w-[15px] h-[15px] px-0.5 flex items-center justify-center animate-pulse">
                  {notifications.filter(n => !n.lida).length}
                </span>
              )}
            </button>

            {mostrarMenuNotif && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setMostrarMenuNotif(false);
                  }} 
                />
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                  <div className="px-3.5 py-1.5 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-black text-[#13264d] uppercase tracking-wider font-sans">
                      Notificações Recentes
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const lidas = notifications.map(n => ({ ...n, lida: true }));
                        setNotifications(lidas);
                        localStorage.setItem('sgo_notifications', JSON.stringify(lidas));
                      }}
                      className="text-[9px] text-[#13264d] hover:text-[#18397a] font-bold tracking-tight bg-blue-50/70 hover:bg-blue-50 px-2 py-0.5 rounded transition"
                    >
                      Lidas tudo
                    </button>
                  </div>
                  
                  <div className="max-h-[280px] overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 space-y-1">
                        <Bell className="w-6 h-6 mx-auto text-slate-350" />
                        <p className="text-[10px] font-bold">Sem notificações pendentes.</p>
                      </div>
                    ) : (
                      notifications.slice(0, 4).map(notif => (
                        <div 
                          key={notif.id}
                          className={`p-3 flex gap-2.5 hover:bg-slate-50 transition-colors relative ${!notif.lida ? 'bg-blue-50/[0.12]' : ''}`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                            notif.tipo === 'processo_avanco' ? 'bg-emerald-500' :
                            notif.tipo === 'processo_retrocesso' ? 'bg-rose-500' :
                            notif.tipo === 'aditivo_pendente' ? 'bg-indigo-500' :
                            notif.tipo === 'ajuste_pendente' ? 'bg-amber-500' : 'bg-slate-400'
                          }`} />
                          
                          <div className="flex-1 space-y-0.5">
                            <p className="text-[11px] font-bold text-slate-800 leading-snug font-sans">
                              {notif.titulo}
                            </p>
                            <p className="text-[10px] text-slate-500 leading-normal line-clamp-2">
                              {notif.mensagem}
                            </p>
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[8.5px] text-slate-400 font-mono font-medium">
                                {new Date(notif.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {!notif.lida && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const lidas = notifications.map(n => n.id === notif.id ? { ...n, lida: true } : n);
                                    setNotifications(lidas);
                                    localStorage.setItem('sgo_notifications', JSON.stringify(lidas));
                                  }}
                                  className="text-[9px] text-[#13264d] font-bold tracking-tight hover:underline"
                                >
                                  Lida
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {(perfilUsuario === 'gestor_paf' || (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore')) && (
                    <div className="px-3 pt-2 pb-0.5 border-t border-slate-100 flex justify-center">
                      <button
                        onClick={() => {
                          setActiveModule('central_logs');
                          setActiveSubTask('visao_geral');
                          setMostrarMenuNotif(false);
                        }}
                        className="w-full py-1 text-center text-[10px] font-bold text-[#13264d] hover:bg-slate-50 rounded-lg transition"
                      >
                        Ver Logs do Sistema →
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 p-1.5 select-none">
              <div className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center text-xs text-white font-bold border border-blue-600 shrink-0">
                {nomeUsuario.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
              </div>
              <div className="text-left hidden sm:block font-sans">
                <p className="text-slate-200 leading-none font-medium text-xs">{nomeUsuario}</p>
                <p className="text-slate-500 text-[10px] mt-0.5 uppercase tracking-wider font-semibold">
                  {perfilUsuario === 'admin' && 'Administrador do Sistema'}
                  {perfilUsuario === 'tecnico_infra' && 'Técnico de Infraestrutura (SRE)'}
                  {perfilUsuario === 'coordenador_regional' && 'Coordenador Regional (SRE)'}
                  {perfilUsuario === 'analista_dore' && 'Analista de Engenharia (DORE)'}
                  {perfilUsuario === 'gestor_paf' && 'Subsecretário de Administração'}
                  {perfilUsuario === 'administrativo_dore' && 'Administrativo DORE'}
                  {perfilUsuario === 'diretor_dore' && 'Diretor DORE'}
                </p>
              </div>
            </div>

            <button
              data-testid="botao-sair"
              type="button"
              onClick={handleLogout}
              title="Sair do sistema"
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-400 hover:text-white hover:bg-rose-600/80 rounded-lg transition-all text-xs font-semibold cursor-pointer border border-slate-600/30 hover:border-rose-500"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* ÁREA PRINCIPAL DO WORKSPACE COM ARQUITETURA DUAL NAV */}
      <div className="flex-1 flex flex-row overflow-hidden">
        
        {/* SIDEBAR DE CONTROLADORES DE MODULOS - PRIMARY (SLIM) */}
        <aside className="w-16 sm:w-20 bg-[#13264d] flex flex-col items-center py-6 gap-6 shrink-0 z-10 select-none border-none print:hidden">
          <div className="text-[10px] font-bold text-slate-200 uppercase tracking-wider scale-90 mb-1">
            Módulos
          </div>

          {/* 1. GESTÃO DE OBRAS */}
          <button
            data-testid="modulo-gestao-obras"
            type="button"
            title="Gestão de Obras SGO"
            onClick={() => {
              setActiveModule('gestao_obras');
              setActiveSubTask('visao_geral');
              setIdSolicitacaoSelecionada(null);
            }}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 group relative border cursor-pointer ${
              activeModule === 'gestao_obras'
                ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                : 'bg-[#1c3870] text-slate-100 border-[#26417a]/40 hover:bg-[#1a2f5c] hover:text-white'
            }`}
          >
            <HardHat className="w-5 h-5 flex-shrink-0" />
            <span className="text-[8px] font-bold tracking-tight">Obras</span>
          </button>

          {/* 2. SEGURANÇA — acesso restrito: só Diretor DORE, Administrativo DORE e Admin */}
          {(() => {
            const bloqueado = !(perfilUsuario === 'diretor_dore' || perfilUsuario === 'administrativo_dore' || perfilUsuario === 'admin');
            return (
              <button
                data-testid="modulo-seguranca"
                type="button"
                title={bloqueado ? 'Acesso restrito para este perfil' : 'Segurança & Cadastros'}
                onClick={bloqueado ? undefined : () => { setActiveModule('seguranca'); setActiveSubTask('cadastro_usuario'); setIdSolicitacaoSelecionada(null); }}
                className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 relative border ${
                  bloqueado
                    ? 'opacity-25 cursor-not-allowed bg-[#1c3870] text-slate-100 border-[#26417a]/40'
                    : activeModule === 'seguranca'
                      ? 'bg-rose-600 text-white border-rose-500 shadow-md cursor-pointer'
                      : 'bg-[#1c3870] text-slate-100 border-[#26417a]/40 hover:bg-[#1a2f5c] hover:text-white cursor-pointer'
                }`}
              >
                <Lock className="w-4 h-4 flex-shrink-0" />
                <span className="text-[8px] font-bold tracking-tight">Segurança</span>
              </button>
            );
          })()}

          {/* 3. ORÇAMENTO */}
          {(() => {
            const bloqueado = perfilUsuario === 'administrativo_dore' || perfilUsuario === 'tecnico_infra' || perfilUsuario === 'coordenador_regional' || perfilUsuario === 'analista_dore' || perfilUsuario === 'gestor_paf';
            return (
              <button
                data-testid="modulo-orcamento"
                type="button"
                title={bloqueado ? 'Acesso restrito para este perfil' : 'Orçamentos'}
                onClick={bloqueado ? undefined : () => { setActiveModule('orcamento'); setActiveSubTask('orca_budgets'); setIdSolicitacaoSelecionada(null); }}
                className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 relative border ${
                  bloqueado
                    ? 'opacity-25 cursor-not-allowed bg-[#1c3870] text-slate-100 border-[#26417a]/40'
                    : activeModule === 'orcamento'
                      ? 'bg-amber-600 text-white border-amber-500 shadow-md cursor-pointer'
                      : 'bg-[#1c3870] text-slate-100 border-[#26417a]/40 hover:bg-[#1a2f5c] hover:text-white cursor-pointer'
                }`}
              >
                <Coins className="w-4 h-4 flex-shrink-0" />
                <span className="text-[8px] font-bold tracking-tight">Orçamento</span>
              </button>
            );
          })()}

          {/* 4. IMÓVEIS */}
          {(() => {
            const bloqueado = perfilUsuario === 'tecnico_infra' || perfilUsuario === 'coordenador_regional' || perfilUsuario === 'administrativo_dore' || perfilUsuario === 'analista_dore' || perfilUsuario === 'gestor_paf';
            return (
              <button
                data-testid="modulo-imoveis"
                type="button"
                title={bloqueado ? 'Acesso restrito para este perfil' : 'Patrimônio & Imóveis'}
                onClick={bloqueado ? undefined : () => { setActiveModule('imoveis'); setActiveSubTask('blank_imoveis'); setIdSolicitacaoSelecionada(null); }}
                className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 relative border ${
                  bloqueado
                    ? 'opacity-25 cursor-not-allowed bg-[#1c3870] text-slate-100 border-[#26417a]/40'
                    : activeModule === 'imoveis'
                      ? 'bg-teal-600 text-white border-teal-500 shadow-md cursor-pointer'
                      : 'bg-[#1c3870] text-slate-100 border-[#26417a]/40 hover:bg-[#1a2f5c] hover:text-white cursor-pointer'
                }`}
              >
                <Building className="w-4 h-4 flex-shrink-0" />
                <span className="text-[8px] font-bold tracking-tight">Imóveis</span>
              </button>
            );
          })()}

          {/* 5. ABERTURA DE CHAMADOS */}
          {(() => {
            const bloqueado = perfilUsuario === 'tecnico_infra' || perfilUsuario === 'coordenador_regional' || perfilUsuario === 'administrativo_dore' || perfilUsuario === 'analista_dore' || perfilUsuario === 'gestor_paf';
            return (
              <button
                data-testid="modulo-abertura-chamados"
                type="button"
                title={bloqueado ? 'Acesso restrito para este perfil' : 'Abertura de Chamados'}
                onClick={bloqueado ? undefined : () => { setActiveModule('abertura_chamados'); setActiveSubTask('blank_novo_chamado'); setIdSolicitacaoSelecionada(null); }}
                className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 relative border ${
                  bloqueado
                    ? 'opacity-25 cursor-not-allowed bg-[#1c3870] text-slate-100 border-[#26417a]/40'
                    : activeModule === 'abertura_chamados'
                      ? 'bg-purple-600 text-white border-purple-500 shadow-md cursor-pointer'
                      : 'bg-[#1c3870] text-slate-100 border-[#26417a]/40 hover:bg-[#1a2f5c] hover:text-white cursor-pointer'
                }`}
              >
                <Wrench className="w-4 h-4 flex-shrink-0" />
                <span className="text-[8px] font-bold tracking-tight">Chamados</span>
              </button>
            );
          })()}

          {/* 6. LOG DO SISTEMA — somente gestores */}
          {(() => {
            const bloqueado = !(perfilUsuario === 'gestor_paf' || (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore'));
            return (
              <button
                data-testid="modulo-central-logs"
                type="button"
                title={bloqueado ? 'Acesso restrito para este perfil' : 'Log do Sistema & Auditoria'}
                onClick={bloqueado ? undefined : () => {
                  setActiveModule('central_logs');
                  setActiveSubTask('visao_geral');
                  setIdSolicitacaoSelecionada(null);
                }}
                className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 group relative border ${
                  bloqueado
                    ? 'opacity-25 cursor-not-allowed bg-[#1c3870] text-slate-100 border-[#26417a]/40'
                    : activeModule === 'central_logs'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md cursor-pointer'
                      : 'bg-[#1c3870] text-slate-100 border-[#26417a]/40 hover:bg-[#1a2f5c] hover:text-white cursor-pointer'
                }`}
              >
                <FileClock className="w-4 h-4 flex-shrink-0" />
                <span className="text-[8px] font-bold tracking-tight">Logs</span>
              </button>
            );
          })()}

        </aside>

        {/* SIDEBAR DE SUBDIVISÕES - SECONDARY (COLLAPSIBLE / ADAPTIVE) */}
        <aside className="w-60 bg-white border-r border-slate-200 flex flex-col p-4 shrink-0 text-left overflow-y-auto max-h-[calc(100vh-4rem)] print:hidden">
          {activeModule === 'gestao_obras' && (
            <div className="space-y-4">
              <div className="border-b border-slate-105 pb-3 mb-2">
                <span className="text-[9px] font-extrabold text-[#1c3870] uppercase tracking-widest block font-sans">
                  Módulo Ativo
                </span>
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 mt-0.5 font-sans">
                  <HardHat className="w-4 h-4 text-blue-600 shrink-0" />
                  Gestão de Obras
                </h3>
              </div>

              {/* DASHBOARD DIRECT LINK */}
              <button
                data-testid="menu-visao_geral"
                type="button"
                onClick={() => {
                  setActiveSubTask('visao_geral');
                  setIdSolicitacaoSelecionada(null);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all duration-150 cursor-pointer ${
                  activeSubTask === 'visao_geral'
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <LayoutGrid className={`w-3.5 h-3.5 shrink-0 ${activeSubTask === 'visao_geral' ? 'text-white' : 'text-slate-500'}`} />
                <span className="text-xs font-sans">Dashboard</span>
              </button>

              {/* NAVIGATION TREE GROUPS */}
              <div className="space-y-3">
                
                {/* 1. ATENDIMENTOS */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleCategory('atendimentos')}
                    className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded-md text-left text-[10px] font-black text-slate-500 uppercase tracking-wider font-sans cursor-pointer group"
                  >
                    <span className="flex items-center gap-1.5">
                      <ClipboardList className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      Atendimentos
                    </span>
                    <ChevronDown className={`w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-transform ${collapsedCategories.atendimentos ? '-rotate-90' : ''}`} />
                  </button>

                  {!collapsedCategories.atendimentos && (
                    <div className="pl-3 border-l border-slate-100 ml-2 space-y-0.5 mt-0.5">
                      {[
                        { id: 'cadastro', label: 'Lista de atendimentos', icon: ClipboardList },
                        { id: 'novo_atendimento', label: 'Atendimento Inicial', icon: Plus },
                        { id: 'aprovacao_regional', label: 'Aprovação Regional', icon: CheckCircle }
                      ].map(item => {
                        const Icon = item.icon;
                        const isActive = activeSubTask === item.id;
                        const bloqueado =
                          ((perfilUsuario === 'administrativo_dore' || perfilUsuario === 'gestor_paf') && item.id === 'novo_atendimento') ||
                          (item.id === 'aprovacao_regional' && perfilUsuario !== 'coordenador_regional' && perfilUsuario !== 'admin');
                        return (
                          <button
                            data-testid={`menu-${item.id}`}
                            key={item.id}
                            disabled={bloqueado}
                            onClick={() => {
                              if (bloqueado) return;
                              setActiveSubTask(item.id);
                              setIdSolicitacaoSelecionada(null);
                            }}
                            className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-left pl-1.5 transition-all duration-150 ${
                              bloqueado
                                ? 'text-slate-300 cursor-not-allowed'
                                : isActive
                                  ? 'bg-blue-50 text-blue-850 font-bold border-l-2 border-blue-500 rounded-r-md cursor-pointer'
                                  : 'hover:bg-slate-50/70 text-slate-600 cursor-pointer'
                            }`}
                          >
                            <Icon className={`w-3 h-3 shrink-0 ${bloqueado ? 'text-slate-300' : isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                            <span className="text-xs font-sans flex-1">{item.label}</span>
                            {bloqueado && <Lock className="w-3 h-3 text-slate-300 ml-auto" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. ANÁLISE TÉCNICA */}
                <div className={`space-y-1 ${(perfilUsuario === 'tecnico_infra' || perfilUsuario === 'coordenador_regional') ? 'opacity-50' : ''}`}>
                  <button
                    type="button"
                    onClick={() => perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'coordenador_regional' && toggleCategory('analise')}
                    disabled={perfilUsuario === 'tecnico_infra' || perfilUsuario === 'coordenador_regional'}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left text-[10px] font-black uppercase tracking-wider font-sans group ${
                      (perfilUsuario === 'tecnico_infra' || perfilUsuario === 'coordenador_regional')
                        ? 'text-slate-400 cursor-not-allowed'
                        : 'hover:bg-slate-50 text-slate-500 cursor-pointer'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      Análise Técnica
                    </span>
                    {(perfilUsuario === 'tecnico_infra' || perfilUsuario === 'coordenador_regional')
                      ? <Lock className="w-3 h-3 text-slate-400" />
                      : <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${collapsedCategories.analise ? '-rotate-90' : ''}`} />
                    }
                  </button>

                  {!collapsedCategories.analise && (
                    <div className="pl-3 border-l border-slate-100 ml-2 space-y-0.5 mt-0.5">
                      {[
                        { id: 'analise_atribuicao', label: 'Atribuição', icon: Users },
                        { id: 'analise', label: 'Validação Técnica', icon: FileText },
                        { id: 'analise_contratual', label: 'Validação Contratual', icon: FileCheck }
                      ].map(item => {
                        const Icon = item.icon;
                        const isActive = activeSubTask === item.id;
                        const bloqueado = perfilUsuario === 'tecnico_infra' || perfilUsuario === 'coordenador_regional' || ((perfilUsuario === 'administrativo_dore' || perfilUsuario === 'gestor_paf') && (item.id === 'analise' || item.id === 'analise_contratual'));
                        return (
                          <button
                            data-testid={`menu-${item.id}`}
                            key={item.id}
                            disabled={bloqueado}
                            onClick={() => {
                              if (bloqueado) return;
                              setActiveSubTask(item.id);
                              setIdSolicitacaoSelecionada(null);
                            }}
                            className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-left pl-1.5 ${
                              bloqueado
                                ? 'text-slate-300 cursor-not-allowed'
                                : isActive
                                  ? 'bg-blue-50 text-blue-855 font-bold border-l-2 border-blue-500 rounded-r-md cursor-pointer transition-all duration-150'
                                  : 'hover:bg-slate-50/70 text-slate-600 cursor-pointer transition-all duration-150'
                            }`}
                          >
                            <Icon className={`w-3 h-3 shrink-0 ${bloqueado ? 'text-slate-300' : isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                            <span className="text-xs font-sans flex-1">{item.label}</span>
                            {bloqueado && <Lock className="w-3 h-3 text-slate-300 ml-auto" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. PAF / CONTRATAÇÕES */}
                <div className={`space-y-1 ${(perfilUsuario === 'tecnico_infra' || perfilUsuario === 'coordenador_regional') ? 'opacity-50' : ''}`}>
                  <button
                    type="button"
                    onClick={() => perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'coordenador_regional' && toggleCategory('paf')}
                    disabled={perfilUsuario === 'tecnico_infra' || perfilUsuario === 'coordenador_regional'}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left text-[10px] font-black uppercase tracking-wider font-sans group ${
                      (perfilUsuario === 'tecnico_infra' || perfilUsuario === 'coordenador_regional')
                        ? 'text-slate-400 cursor-not-allowed'
                        : 'hover:bg-slate-50 text-slate-500 cursor-pointer'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 shrink-0" />
                      PAF / Contratações
                    </span>
                    {(perfilUsuario === 'tecnico_infra' || perfilUsuario === 'coordenador_regional')
                      ? <Lock className="w-3 h-3 text-slate-400" />
                      : <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${collapsedCategories.paf ? '-rotate-90' : ''}`} />
                    }
                  </button>

                  {!collapsedCategories.paf && (
                    <div className="pl-3 border-l border-slate-100 ml-2 space-y-0.5 mt-0.5">
                      {[
                        { id: 'paf_acompanhamento', label: 'Acompanhamento de PAF', icon: ClipboardList },
                        { id: 'paf_autorizacao', label: 'Autorizações', icon: CheckCircle },
                        { id: 'paf', label: 'Geração de PAF', icon: Landmark },
                      ].map(item => {
                        const Icon = item.icon;
                        const isActive = activeSubTask === item.id;
                        const bloqueado = perfilUsuario === 'tecnico_infra' || perfilUsuario === 'coordenador_regional' ||
                          (item.id === 'paf_autorizacao' && perfilUsuario !== 'gestor_paf' && perfilUsuario !== 'admin' && perfilUsuario !== 'diretor_dore');
                        return (
                          <button
                            data-testid={`menu-${item.id}`}
                            key={item.id}
                            disabled={bloqueado}
                            onClick={() => {
                              if (bloqueado) return;
                              setActiveSubTask(item.id);
                              setIdSolicitacaoSelecionada(null);
                            }}
                            className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-left pl-1.5 ${
                              bloqueado
                                ? 'text-slate-300 cursor-not-allowed'
                                : isActive
                                  ? 'bg-blue-50 text-blue-855 font-bold border-l-2 border-blue-500 rounded-r-md cursor-pointer transition-all duration-150'
                                  : 'hover:bg-slate-50/70 text-slate-600 cursor-pointer transition-all duration-150'
                            }`}
                          >
                            <Icon className={`w-3 h-3 shrink-0 ${bloqueado ? 'text-slate-300' : isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                            <span className="text-xs font-sans flex-1">{item.label}</span>
                            {bloqueado && <Lock className="w-3 h-3 text-slate-300 ml-auto" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 4. EXECUÇÃO DE OBRA */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleCategory('execucao')}
                    className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded-md text-left text-[10px] font-black text-slate-500 uppercase tracking-wider font-sans cursor-pointer group"
                  >
                    <span className="flex items-center gap-1.5" id="execucao-de-obra-title">
                      <HardHat className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      Execução De Obra
                    </span>
                    <ChevronDown className={`w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-transform ${collapsedCategories.execucao ? '-rotate-90' : ''}`} />
                  </button>

                  {!collapsedCategories.execucao && (
                    <div className="pl-3 border-l border-slate-100 ml-2 space-y-1 mt-1">
                      {/* Itens principais */}
                      {[
                        { id: 'execucao_central',        label: 'Central de Navegação',    func: 'painel geral do fiscal',         icon: Navigation },
                        { id: 'execucao_cadastro',       label: 'Cadastro de Obras',        func: 'cadastro',                       icon: Building2 },
                        { id: 'execucao_contratos',      label: 'Contratos',                func: 'jurídico/financeiro',             icon: ClipboardList },
                        { id: 'execucao_acompanhamento', label: 'Acompanhamento da Obra',   func: 'Dashboard, Diário, Vistorias',   icon: HardHat },
                        { id: 'execucao_medicoes',       label: 'Medições',                 func: 'financeiro técnico',             icon: Layers },
                      ].map(item => {
                        const Icon = item.icon;
                        const isActive = activeSubTask === item.id;
                        return (
                          <button data-testid={`menu-${item.id}`} key={item.id} id={`subtask-${item.id}`}
                            onClick={() => { setActiveSubTask(item.id); setIdSolicitacaoSelecionada(null); }}
                            className={`w-full flex flex-col items-start gap-0.5 py-1.5 px-2 rounded-lg text-left transition-all duration-150 cursor-pointer ${isActive ? 'bg-blue-50 text-blue-800 font-bold border-l-2 border-blue-600 pl-1.5' : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'}`}>
                            <div className="flex items-center gap-1.5 w-full">
                              <Icon className={`w-3 h-3 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                              <span className="text-xs font-sans font-bold leading-tight">{item.label}</span>
                            </div>
                            <span className="text-[9px] font-mono font-medium text-slate-500 uppercase tracking-wider pl-4.5 block">{item.func}</span>
                          </button>
                        );
                      })}

                      {/* Grupo: Ajustes Contratuais */}
                      <div className="pt-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 pb-1 flex items-center gap-1">
                          <Wrench className="w-2.5 h-2.5" /> Ajustes Contratuais
                        </p>
                        <div className="pl-2 border-l border-slate-100 ml-2 space-y-0.5">
                          {[
                            { id: 'execucao_reequilibrio',       label: 'Reequilíbrio Financeiro',          func: 'reequilíbrio econômico',       icon: BarChart2 },
                            { id: 'execucao_saldo_complementar', label: 'Saldo Complementar Distratado',    func: 'contrato distratado',           icon: Coins },
                            { id: 'execucao_aditivos',           label: 'Aditivo',                          func: 'alterações contratuais',        icon: Plus },
                            { id: 'execucao_ajustes',            label: 'Ajuste de Planilha',               func: 'remanejamento orçamentário',    icon: Calculator },
                          ].map(item => {
                            const Icon = item.icon;
                            const isActive = activeSubTask === item.id;
                            return (
                              <button data-testid={`menu-${item.id}`} key={item.id} id={`subtask-${item.id}`}
                                onClick={() => { setActiveSubTask(item.id); setIdSolicitacaoSelecionada(null); }}
                                className={`w-full flex flex-col items-start gap-0.5 py-1.5 px-2 rounded-lg text-left transition-all duration-150 cursor-pointer ${isActive ? 'bg-blue-50 text-blue-800 font-bold border-l-2 border-blue-600 pl-1.5' : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'}`}>
                                <div className="flex items-center gap-1.5 w-full">
                                  <Icon className={`w-3 h-3 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                                  <span className="text-xs font-sans font-bold leading-tight">{item.label}</span>
                                </div>
                                <span className="text-[9px] font-mono font-medium text-slate-500 uppercase tracking-wider pl-4.5 block">{item.func}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Itens finais */}
                      {[
                        { id: 'execucao_documentos', label: 'Documentações',         func: 'GED',                     icon: UploadCloud },
                        { id: 'conclusao',           label: 'Termo de Encerramento', func: 'encerramento da obra',    icon: CheckCircle },
                      ].map(item => {
                        const Icon = item.icon;
                        const isActive = activeSubTask === item.id;
                        return (
                          <button data-testid={`menu-${item.id}`} key={item.id} id={`subtask-${item.id}`}
                            onClick={() => { setActiveSubTask(item.id); setIdSolicitacaoSelecionada(null); }}
                            className={`w-full flex flex-col items-start gap-0.5 py-1.5 px-2 rounded-lg text-left transition-all duration-150 cursor-pointer ${isActive ? 'bg-blue-50 text-blue-800 font-bold border-l-2 border-blue-600 pl-1.5' : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'}`}>
                            <div className="flex items-center gap-1.5 w-full">
                              <Icon className={`w-3 h-3 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                              <span className="text-xs font-sans font-bold leading-tight">{item.label}</span>
                            </div>
                            <span className="text-[9px] font-mono font-medium text-slate-500 uppercase tracking-wider pl-4.5 block">{item.func}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {activeModule === 'seguranca' && (perfilUsuario === 'diretor_dore' || perfilUsuario === 'administrativo_dore' || perfilUsuario === 'admin') && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3 mb-2">
                <span className="text-[9px] font-extrabold text-rose-600 uppercase tracking-widest block font-sans">
                  Módulo Ativo
                </span>
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 mt-0.5 font-sans">
                  <Lock className="w-4 h-4 text-slate-700 shrink-0" />
                  Segurança & Acessos
                </h3>
              </div>

              <div className="space-y-1.5">
                {[
                  { id: 'cadastro_usuario', label: 'Controle de Usuários', desc: 'Cadastro de analistas e fiscais', icon: UserPlus },
                  { id: 'cadastro_empresas', label: 'Cadastro de Empresas', desc: 'Empresas contratadas homologadas', icon: Building },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSubTask === item.id;
                  return (
                    <button
                      data-testid={`menu-${item.id}`}
                      key={item.id}
                      onClick={() => {
                        setActiveSubTask(item.id);
                        setIdSolicitacaoSelecionada(null);
                      }}
                      className={`w-full flex flex-col items-start px-3 py-2 rounded-lg text-left transition-all duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-rose-50 border border-rose-100/50 text-rose-800'
                          : 'hover:bg-slate-50 border border-transparent text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-rose-600' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold font-sans">{item.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block ml-5.5 leading-tight font-sans mt-0.5">
                        {item.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeModule === 'orcamento' && perfilUsuario !== 'administrativo_dore' && perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'coordenador_regional' && perfilUsuario !== 'analista_dore' && perfilUsuario !== 'gestor_paf' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3 mb-2">
                <span className="text-[9px] font-extrabold text-amber-600 uppercase tracking-widest block font-sans">Módulo Ativo</span>
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 mt-0.5 font-sans">
                  <Coins className="w-4 h-4 text-amber-600 shrink-0" />
                  Orçamento
                </h3>
              </div>

              <div className="space-y-3">

                {/* 1. ORÇAMENTOS */}
                <div className="space-y-1">
                  <button type="button" onClick={() => toggleCategory('orca_orcamentos')}
                    className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded-md text-left text-[10px] font-black text-slate-500 uppercase tracking-wider font-sans cursor-pointer group">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      Orçamentos
                    </span>
                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${collapsedCategories.orca_orcamentos ? '-rotate-90' : ''}`} />
                  </button>
                  {!collapsedCategories.orca_orcamentos && (
                    <div className="pl-3 border-l border-slate-100 ml-2 space-y-1 mt-1">
                      {[{ id: 'orca_budgets', label: 'Meus Orçamentos', func: 'gestão de orçamentos', icon: FileText }].map(item => {
                        const Icon = item.icon;
                        const isActive = activeSubTask === item.id;
                        return (
                          <button data-testid={`menu-${item.id}`} key={item.id} onClick={() => { setActiveSubTask(item.id); setIdSolicitacaoSelecionada(null); }}
                            className={`w-full flex flex-col items-start gap-0.5 py-1.5 px-2 rounded-lg text-left transition-all duration-150 cursor-pointer ${isActive ? 'bg-blue-50 text-blue-800 font-bold border-l-2 border-blue-600 pl-1.5' : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'}`}>
                            <div className="flex items-center gap-1.5 w-full">
                              <Icon className={`w-3 h-3 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                              <span className="text-xs font-sans font-bold leading-tight">{item.label}</span>
                            </div>
                            <span className="text-[9px] font-mono font-medium text-slate-400 uppercase tracking-wider pl-4.5 block">{item.func}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. BANCO DE DADOS */}
                <div className="space-y-1">
                  <button type="button" onClick={() => toggleCategory('orca_banco')}
                    className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded-md text-left text-[10px] font-black text-slate-500 uppercase tracking-wider font-sans cursor-pointer group">
                    <span className="flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      Banco de Dados
                    </span>
                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${collapsedCategories.orca_banco ? '-rotate-90' : ''}`} />
                  </button>
                  {!collapsedCategories.orca_banco && (
                    <div className="pl-3 border-l border-slate-100 ml-2 space-y-1 mt-1">
                      {[
                        { id: 'orca_compositions', label: 'Composições', func: 'banco de composições', icon: Layers },
                        { id: 'orca_supplies', label: 'Insumos', func: 'banco de insumos', icon: Package },
                      ].map(item => {
                        const Icon = item.icon;
                        const isActive = activeSubTask === item.id;
                        return (
                          <button data-testid={`menu-${item.id}`} key={item.id} onClick={() => { setActiveSubTask(item.id); setIdSolicitacaoSelecionada(null); }}
                            className={`w-full flex flex-col items-start gap-0.5 py-1.5 px-2 rounded-lg text-left transition-all duration-150 cursor-pointer ${isActive ? 'bg-blue-50 text-blue-800 font-bold border-l-2 border-blue-600 pl-1.5' : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'}`}>
                            <div className="flex items-center gap-1.5 w-full">
                              <Icon className={`w-3 h-3 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                              <span className="text-xs font-sans font-bold leading-tight">{item.label}</span>
                            </div>
                            <span className="text-[9px] font-mono font-medium text-slate-400 uppercase tracking-wider pl-4.5 block">{item.func}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. ANÁLISES */}
                <div className="space-y-1">
                  <button type="button" onClick={() => toggleCategory('orca_analises')}
                    className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded-md text-left text-[10px] font-black text-slate-500 uppercase tracking-wider font-sans cursor-pointer group">
                    <span className="flex items-center gap-1.5">
                      <BarChart2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      Análises
                    </span>
                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${collapsedCategories.orca_analises ? '-rotate-90' : ''}`} />
                  </button>
                  {!collapsedCategories.orca_analises && (
                    <div className="pl-3 border-l border-slate-100 ml-2 space-y-1 mt-1">
                      {[
                        { id: 'orca_reports_abc', label: 'Curva ABC', func: 'curva ABC e Pareto', icon: BarChart2 },
                        { id: 'orca_reports_composicoes', label: 'Banco de Composições', func: 'validação e auditoria', icon: Layers },
                      ].map(item => {
                        const Icon = item.icon;
                        const isActive = activeSubTask === item.id;
                        return (
                          <button data-testid={`menu-${item.id}`} key={item.id} onClick={() => { setActiveSubTask(item.id); setIdSolicitacaoSelecionada(null); }}
                            className={`w-full flex flex-col items-start gap-0.5 py-1.5 px-2 rounded-lg text-left transition-all duration-150 cursor-pointer ${isActive ? 'bg-blue-50 text-blue-800 font-bold border-l-2 border-blue-600 pl-1.5' : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'}`}>
                            <div className="flex items-center gap-1.5 w-full">
                              <Icon className={`w-3 h-3 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                              <span className="text-xs font-sans font-bold leading-tight">{item.label}</span>
                            </div>
                            <span className="text-[9px] font-mono font-medium text-slate-400 uppercase tracking-wider pl-4.5 block">{item.func}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {activeModule === 'imoveis' && perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'coordenador_regional' && perfilUsuario !== 'administrativo_dore' && perfilUsuario !== 'analista_dore' && perfilUsuario !== 'gestor_paf' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3 mb-2">
                <span className="text-[9px] font-extrabold text-teal-600 uppercase tracking-widest block font-sans">
                  Módulo Ativo
                </span>
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 mt-0.5 font-sans">
                  <Building className="w-4 h-4 text-teal-600 shrink-0" />
                  Patrimônio & Imóveis
                </h3>
              </div>

              <div className="space-y-1.5">
                {[
                  { id: 'blank_imoveis',       label: 'Cadastro de Próprios',     desc: 'Registro de imóveis públicos',       icon: Building2 },
                  { id: 'blank_regularizacao', label: 'Regularização Documental', desc: 'Situação fundiária e documentos',      icon: FileText },
                  { id: 'blank_projetos',      label: 'Projetos',                 desc: 'Projetos técnicos atualizados',        icon: FolderOpen },
                  { id: 'blank_vistorias',     label: 'Vistorias & Inspeções',    desc: 'Laudos de integridade predial',        icon: ClipboardList },
                  { id: 'blank_ficha',         label: 'Ficha Consolidada',        desc: 'Prontuário imobiliário completo',      icon: BookOpen }
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSubTask === item.id;
                  return (
                    <button
                      data-testid={`menu-${item.id}`}
                      key={item.id}
                      onClick={() => {
                        setActiveSubTask(item.id);
                        setIdSolicitacaoSelecionada(null);
                      }}
                      className={`w-full flex flex-col items-start px-3 py-2 rounded-lg text-left transition-all duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-teal-50 border border-teal-100/50 text-teal-850 text-teal-800 font-semibold'
                          : 'hover:bg-slate-50 border border-transparent text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold font-sans">{item.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block ml-5.5 leading-tight font-sans mt-0.5">
                        {item.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeModule === 'abertura_chamados' && perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'coordenador_regional' && perfilUsuario !== 'administrativo_dore' && perfilUsuario !== 'analista_dore' && perfilUsuario !== 'gestor_paf' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3 mb-2">
                <span className="text-[9px] font-extrabold text-purple-600 uppercase tracking-widest block font-sans">
                  Módulo Ativo
                </span>
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 mt-0.5 font-sans">
                  <Wrench className="w-4 h-4 text-purple-600 shrink-0" />
                  Suporte & Chamados
                </h3>
              </div>

              <div className="space-y-1.5">
                {[
                  { id: 'blank_novo_chamado', label: 'Solicitar Suporte', desc: 'Abertura de incidentes técnicos', icon: HelpCircle },
                  { id: 'blank_meus_chamados', label: 'Meus Chamados', desc: 'Acompanhamento de tickets', icon: Ticket },
                  { id: 'blank_sla', label: 'SLA & Desempenho', desc: 'Métricas de atendimento de rede', icon: ShieldCheck }
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSubTask === item.id;
                  return (
                    <button
                      data-testid={`menu-${item.id}`}
                      key={item.id}
                      onClick={() => {
                        setActiveSubTask(item.id);
                        setIdSolicitacaoSelecionada(null);
                      }}
                      className={`w-full flex flex-col items-start px-3 py-2 rounded-lg text-left transition-all duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-purple-50 border border-purple-100/50 text-purple-850 text-purple-800 font-semibold'
                          : 'hover:bg-slate-50 border border-transparent text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-purple-600' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold font-sans">{item.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block ml-5.5 leading-tight font-sans mt-0.5">
                        {item.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeModule === 'central_logs' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3 mb-2">
                <span className="text-[9px] font-extrabold text-blue-600 uppercase tracking-widest block font-sans">
                  Controle & Auditoria
                </span>
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 mt-0.5 font-sans">
                  <FileClock className="w-4 h-4 text-blue-600 shrink-0" />
                  Log do Sistema
                </h3>
              </div>
              <button
                data-testid="menu-logs_auditoria"
                onClick={() => { setActiveSubTask('logs_auditoria'); setIdSolicitacaoSelecionada(null); }}
                className="w-full flex flex-col items-start px-3 py-2 rounded-lg text-left bg-blue-50 border border-blue-100 text-blue-800 cursor-default"
              >
                <div className="flex items-center gap-2">
                  <FileClock className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                  <span className="text-xs font-bold font-sans">Logs de Auditoria</span>
                </div>
                <span className="text-[10px] text-slate-400 block ml-5.5 leading-tight font-sans mt-0.5">
                  Rastreabilidade completa de alterações
                </span>
              </button>
            </div>
          )}
        </aside>

        {/* WORKSPACE CENTRAL DE CONTEÚDO */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 sm:p-8 flex flex-col min-w-0">
          
          {activeModule === 'gestao_obras' && activeSubTask === 'paf_acompanhamento' && !idSolicitacaoSelecionada ? (
            <AcompanhamentoPaf
              solicitacoes={solicitacoesVisiveis}
              onSelectSolicitacao={(id) => setIdSolicitacaoSelecionada(id)}
              onNavigateToTab={(tab, schoolId) => {
                setActiveSubTask(tab);
                if (schoolId) {
                  setSelectedSchoolsPorSubtask(prev => ({
                    ...prev,
                    [tab]: schoolId
                  }));
                }
              }}
              perfilUsuario={perfilUsuario}
              onUpdate={handleUpdateSolicitacao}
            />
          ) : activeModule === 'gestao_obras' && activeSubTask === 'paf_autorizacao' && !idSolicitacaoSelecionada ? (
            (() => {
              // Fila unificada da Autorização do PAF: Atendimento Inicial (etapaAtual 'paf_autorizacao')
              // + Reequilíbrio/Saldo Complementar já homologados tecnicamente pela DORE, aguardando a
              // liberação financeira final do mesmo Subsecretário — a extinta tela "Liberação
              // Financeira" foi fundida aqui a pedido do usuário. Ver [[fusao-liberacao-financeira-autorizacao]].
              const solicitacoesAtendimentoInicial = solicitacoesVisiveis.filter(s => s.etapaAtual === 'paf_autorizacao');

              const todasLinhasFila: LinhaAutorizacao[] = [
                ...solicitacoesAtendimentoInicial.map((s): LinhaAutorizacao => ({
                  sol: s,
                  tipo: 'atendimento_inicial',
                  itemId: null,
                  valor: s.valorPlanilha || s.valorHomologado || 0,
                  label: s.tipo || s.tipoObra || 'Atendimento Inicial',
                })),
                ...solicitacoesVisiveis.flatMap((s): LinhaAutorizacao[] =>
                  (s.reequilibrios || [])
                    .filter(r => r.status === 'aguardando_liberacao_financeira')
                    .map((r): LinhaAutorizacao => ({
                      sol: s,
                      tipo: 'reequilibrio',
                      itemId: r.id,
                      valor: r.valorReequilibrado || r.valorOriginal || 0,
                      label: 'Reequilíbrio Financeiro',
                    }))
                ),
                ...solicitacoesVisiveis.flatMap((s): LinhaAutorizacao[] =>
                  (s.saldosComplementares || [])
                    .filter(sc => sc.status === 'aguardando_liberacao_financeira')
                    .map((sc): LinhaAutorizacao => ({
                      sol: s,
                      tipo: 'saldo',
                      itemId: sc.id,
                      valor: sc.valorLiberado || 0,
                      label: 'Saldo Complementar',
                    }))
                ),
              ];

              // Dynamic filter items based on the data
              const uniqueCodesc = Array.from(new Set(todasLinhasFila.map(l => l.sol.codesc).filter(Boolean)));
              const uniqueSre = Array.from(new Set(todasLinhasFila.map(l => l.sol.sre).filter(Boolean)));
              const uniqueMunicipio = Array.from(new Set(todasLinhasFila.map(l => l.sol.municipio).filter(Boolean)));
              const uniqueEscola = Array.from(new Set(todasLinhasFila.map(l => l.sol.nomeEscola).filter(Boolean)));
              const uniqueTipoObra = Array.from(new Set(todasLinhasFila.map(l => l.sol.tipoObra || l.sol.tipo).filter(Boolean)));
              const uniqueTipoAtendimento = Array.from(new Set(todasLinhasFila.map(l => l.sol.tipoAtendimento).filter(Boolean)));
              const uniqueClasseIEE = Array.from(new Set(todasLinhasFila.map(l => l.sol.ieeClasse ?? calcularIEE(l.sol)?.classe).filter((c): c is NonNullable<typeof c> => !!c)));
              const uniqueEtiquetas = Array.from(new Set(todasLinhasFila.flatMap(l => (l.sol.etiquetasPrioridade as CodigoEtiqueta[] | undefined) ?? calcularPrioridade(l.sol).etiquetas)));
              const uniqueTipoProcesso = Array.from(new Set(todasLinhasFila.map(l => l.tipo)));

              // Ranking técnico da fila: quanto maior a pontuação, maior a prioridade sugerida
              // para o subsecretário autorizar primeiro. Ver critérios em calcularPontuacaoAutorizacaoPAF.
              const filteredLinhasFila = todasLinhasFila
                .filter(linha => {
                  const s = linha.sol;
                  if (filterCodesc && s.codesc !== filterCodesc) return false;
                  if (filterSre && s.sre !== filterSre) return false;
                  if (filterMunicipio && s.municipio !== filterMunicipio) return false;
                  if (filterEscola && s.nomeEscola !== filterEscola) return false;
                  if (filterTipoObra && (s.tipoObra || s.tipo) !== filterTipoObra) return false;
                  if (filterTipoAtendimento && s.tipoAtendimento !== filterTipoAtendimento) return false;
                  if (filterClasseIEE && (s.ieeClasse ?? calcularIEE(s)?.classe) !== filterClasseIEE) return false;
                  if (filterTipoProcesso && linha.tipo !== filterTipoProcesso) return false;
                  if (filterEtiqueta) {
                    const etiquetasS = (s.etiquetasPrioridade as CodigoEtiqueta[] | undefined) ?? calcularPrioridade(s).etiquetas;
                    if (!etiquetasS.includes(filterEtiqueta as CodigoEtiqueta)) return false;
                  }
                  return true;
                })
                .map(linha => ({ linha, ranking: calcularPontuacaoAutorizacaoPAF(linha.sol) }))
                .sort((a, b) => b.ranking.pontos - a.ranking.pontos);

              // Autorização do PAF (Etapa 3) é de controle exclusivo do Subsecretário de Administração
              // (gestor_paf) — admin/diretor_dore mantêm o mesmo acesso de override usado no resto do
              // sistema. Blindagem de conteúdo: o menu já bloqueia a navegação para os demais perfis
              // (cinza + cadeado), mas essa checagem cobre o caso de troca de perfil com a tela já aberta.
              const podeAutorizarPAF = perfilUsuario === 'gestor_paf' || perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore';
              if (!podeAutorizarPAF) {
                return (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
                    <Lock className="w-12 h-12 mx-auto text-slate-300" />
                    <h3 className="text-sm font-black text-slate-700">Acesso Restrito</h3>
                    <p className="text-xs max-w-xs mx-auto leading-relaxed">
                      A Autorização do PAF (Etapa 3) é de acesso exclusivo do Subsecretário de Administração.
                    </p>
                  </div>
                );
              }

              const handleAutorizarPAF = (s: Solicitacao) => {
                const updated: Solicitacao = {
                  ...s,
                  etapaAtual: 'paf',
                  historicoEtapas: [
                    ...s.historicoEtapas,
                    { etapa: 'paf', data: new Date().toISOString().split('T')[0], responsavel: 'Gestor (Autorização do PAF)' }
                  ]
                };
                handleUpdateSolicitacao(updated);
              };

              const handleRejeitarPAF = (s: Solicitacao, justificativa: string) => {
                const updated: Solicitacao = {
                  ...s,
                  etapaAtual: 'cadastro',
                  contadorAnalises: (s.contadorAnalises || 0) + 1,
                  parecerConsolidado: justificativa,
                  historicoEtapas: [
                    ...s.historicoEtapas,
                    { etapa: 'cadastro', data: new Date().toISOString().split('T')[0], responsavel: `Gestor (PAF Rejeitado: ${justificativa})` }
                  ]
                };
                handleUpdateSolicitacao(updated);
                setLinhaRejeitando(null);
                setJustificativaRejeicaoPaf('');
              };

              // Liberação financeira final de Reequilíbrio/Saldo Complementar já homologados pela
              // DORE — mesma lógica que vivia na extinta tela "Liberação Financeira", agora inline
              // nesta fila. A obra permanece em 'execucao'; só o item filho muda de status.
              const handleLiberarRecursoFinanceiro = async (linha: LinhaAutorizacao) => {
                if (linha.tipo === 'atendimento_inicial' || !linha.itemId) return;
                const tabela = TABELA_POR_TIPO_LINHA_AUTORIZACAO[linha.tipo];
                const hoje = new Date().toISOString().split('T')[0];
                const { error } = await supabase
                  .from(tabela)
                  .update({ status: 'aprovado', liberado_por: nomeUsuario, data_liberacao_financeira: hoje })
                  .eq('id', linha.itemId);
                if (error) {
                  console.error('Erro ao liberar recurso financeiro no Supabase:', error);
                  alert('Erro ao liberar o recurso financeiro no banco de dados. Tente novamente.');
                  return;
                }
                const s = linha.sol;
                const updated: Solicitacao = {
                  ...s,
                  reequilibrios: linha.tipo === 'reequilibrio'
                    ? (s.reequilibrios || []).map(r => r.id === linha.itemId ? { ...r, status: 'aprovado', liberadoPor: nomeUsuario, dataLiberacaoFinanceira: hoje } : r)
                    : s.reequilibrios,
                  saldosComplementares: linha.tipo === 'saldo'
                    ? (s.saldosComplementares || []).map(sc => sc.id === linha.itemId ? { ...sc, status: 'aprovado', liberadoPor: nomeUsuario, dataLiberacaoFinanceira: hoje } : sc)
                    : s.saldosComplementares,
                  historicoEtapas: [
                    ...s.historicoEtapas,
                    { etapa: s.etapaAtual, data: hoje, responsavel: `Subsecretário (Liberação Financeira: ${TIPO_LINHA_AUTORIZACAO_INFO[linha.tipo].label} Aprovado)` }
                  ]
                };
                handleUpdateSolicitacao(updated);
              };

              const handleReprovarRecursoFinanceiro = async (linha: LinhaAutorizacao, justificativa: string) => {
                if (linha.tipo === 'atendimento_inicial' || !linha.itemId) return;
                const tabela = TABELA_POR_TIPO_LINHA_AUTORIZACAO[linha.tipo];
                const { error } = await supabase
                  .from(tabela)
                  .update({ status: 'reprovado', justificativa_reprovacao_financeira: justificativa })
                  .eq('id', linha.itemId);
                if (error) {
                  console.error('Erro ao reprovar liberação financeira no Supabase:', error);
                  alert('Erro ao reprovar o recurso financeiro no banco de dados. Tente novamente.');
                  return;
                }
                const s = linha.sol;
                const updated: Solicitacao = {
                  ...s,
                  reequilibrios: linha.tipo === 'reequilibrio'
                    ? (s.reequilibrios || []).map(r => r.id === linha.itemId ? { ...r, status: 'reprovado', justificativaReprovacaoFinanceira: justificativa } : r)
                    : s.reequilibrios,
                  saldosComplementares: linha.tipo === 'saldo'
                    ? (s.saldosComplementares || []).map(sc => sc.id === linha.itemId ? { ...sc, status: 'reprovado', justificativaReprovacaoFinanceira: justificativa } : sc)
                    : s.saldosComplementares,
                  historicoEtapas: [
                    ...s.historicoEtapas,
                    { etapa: s.etapaAtual, data: new Date().toISOString().split('T')[0], responsavel: `Subsecretário (Liberação Financeira Reprovada: ${justificativa})` }
                  ]
                };
                handleUpdateSolicitacao(updated);
                setLinhaRejeitando(null);
                setJustificativaRejeicaoPaf('');
              };

              // Autorização em lote — aplica todas as atualizações num único setSolicitacoes.
              // handleAutorizarPAF chama handleUpdateSolicitacao, que lê `solicitacoes` do
              // closure e não usa updater funcional; chamá-la N vezes em sequência faria cada
              // chamada partir do mesmo array desatualizado e só a última sobreviveria.
              const handleAutorizarLote = (selecionadas: Solicitacao[]) => {
                const hoje = new Date().toISOString().split('T')[0];
                const idsSelecionados = new Set(selecionadas.map(s => s.id));
                const atualizadas = solicitacoes
                  .filter(s => idsSelecionados.has(s.id))
                  .map(s => ({
                    ...s,
                    etapaAtual: 'paf' as const,
                    historicoEtapas: [
                      ...s.historicoEtapas,
                      { etapa: 'paf' as const, data: hoje, responsavel: 'Gestor (Autorização do PAF em Lote)' }
                    ]
                  }));
                const novas = solicitacoes.map(s => atualizadas.find(a => a.id === s.id) || s);
                atualizarEGuardarSolicitacoes(novas, atualizadas);
              };

              return (
                <div id="paf-autorizacao-workspace" className="w-full flex-grow flex flex-col space-y-6">
                  {/* Banner superior de dotação de recursos */}
                  <div className="bg-gradient-to-r from-emerald-50/95 to-blue-50/50 border border-emerald-100/90 text-slate-800 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-left font-sans">
                    <div className="space-y-1.5">
                      <span className="px-2 py-0.5 bg-emerald-600 text-white font-extrabold text-[10px] rounded uppercase tracking-wider font-mono">
                        AMBIENTE ASSINATURA PAF-SGO
                      </span>
                      <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-800 flex items-center gap-2">
                        <CheckCircle className="text-emerald-600 w-5 h-5 shrink-0" />
                        3. Autorização do PAF
                      </h2>
                      <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                        Analise e autorize as demandas de intervenções físicas homologadas na Etapa 2 de Análise Técnica. A autorização oficial habilita a geração de limites financeiros e faturamento de dotação orçamentária do PAF.
                      </p>
                    </div>
                  </div>

                  {/* CARDS DE VISÃO GERAL DA FILA — para o Subsecretário ter embasamento antes de entrar nos filtros */}
                  {(() => {
                    const valorTotalFila = todasLinhasFila.reduce((acc, l) => acc + l.valor, 0);

                    const contagemPorTipoAtendimento = todasLinhasFila.reduce((acc, l) => {
                      const tipo = (l.sol.tipoAtendimento || 'Normal').toUpperCase();
                      acc[tipo] = (acc[tipo] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);
                    const tiposOrdenados = Object.entries(contagemPorTipoAtendimento).sort((a, b) => b[1] - a[1]);

                    const contagemPorTipoProcesso = todasLinhasFila.reduce((acc, l) => {
                      acc[l.tipo] = (acc[l.tipo] || 0) + 1;
                      return acc;
                    }, {} as Record<TipoLinhaAutorizacao, number>);

                    const totalPrioritarios = todasLinhasFila.filter(l => {
                      const etiquetas = (l.sol.etiquetasPrioridade as CodigoEtiqueta[] | undefined) ?? calcularPrioridade(l.sol).etiquetas;
                      return etiquetas.includes('EMERGENCIAL') || etiquetas.includes('PRIORIDADE');
                    }).length;

                    const tempoMedioEsperaDias = todasLinhasFila.length > 0
                      ? Math.round(todasLinhasFila.reduce((acc, l) => {
                          const dataRef = l.itemId
                            ? (l.tipo === 'reequilibrio'
                                ? (l.sol.reequilibrios || []).find(r => r.id === l.itemId)?.dataCriacao
                                : (l.sol.saldosComplementares || []).find(sc => sc.id === l.itemId)?.dataCriacao)
                            : (l.sol.historicoEtapas?.find(h => h.etapa === 'paf_autorizacao')?.data || l.sol.dataCriacao);
                          if (!dataRef) return acc;
                          const dias = Math.max(0, Math.floor((Date.now() - new Date(`${dataRef}T00:00:00`).getTime()) / (1000 * 60 * 60 * 24)));
                          return acc + dias;
                        }, 0) / todasLinhasFila.length)
                      : 0;

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                            <ClipboardList className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest block">Processos na Fila</span>
                            <span className="text-xl font-black font-mono text-slate-800 block mt-0.5">{todasLinhasFila.length}</span>
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                            <DollarSign className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest block">Valor Total em Fila</span>
                            <span className="text-sm font-black font-mono text-slate-800 block mt-0.5">
                              {valorTotalFila.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest block">Emergenciais / Prioritários</span>
                            <span className="text-xl font-black font-mono text-slate-800 block mt-0.5">{totalPrioritarios}</span>
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                            <Clock className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest block">Tempo Médio de Espera</span>
                            <span className="text-xl font-black font-mono text-slate-800 block mt-0.5">{tempoMedioEsperaDias} {tempoMedioEsperaDias === 1 ? 'dia' : 'dias'}</span>
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs sm:col-span-2 lg:col-span-2">
                          <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">Por Tipo de Processo</span>
                          <div className="flex flex-wrap gap-2">
                            {(Object.keys(TIPO_LINHA_AUTORIZACAO_INFO) as TipoLinhaAutorizacao[])
                              .filter(tipo => contagemPorTipoProcesso[tipo] > 0)
                              .map(tipo => (
                                <span key={tipo} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-bold border ${TIPO_LINHA_AUTORIZACAO_INFO[tipo].corClassName}`}>
                                  {TIPO_LINHA_AUTORIZACAO_INFO[tipo].label}
                                  <span className="px-1.5 py-0.2 rounded-full bg-slate-700 text-white font-mono text-[9.5px]">{contagemPorTipoProcesso[tipo]}</span>
                                </span>
                              ))}
                            {todasLinhasFila.length === 0 && <span className="text-xs text-slate-400 italic">Nenhum processo na fila.</span>}
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs sm:col-span-2 lg:col-span-2">
                          <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">Por Tipo de Atendimento</span>
                          {tiposOrdenados.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">Nenhum processo na fila.</span>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {tiposOrdenados.map(([tipo, qtd]) => (
                                <span key={tipo} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-slate-50 border border-slate-200 text-slate-700">
                                  {tipo}
                                  <span className="px-1.5 py-0.2 rounded-full bg-slate-700 text-white font-mono text-[9.5px]">{qtd}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* FORM DE FILTROS SEPARADOS EM CODESC, SRE, MUNICIPIO E ESCOLA */}
                  <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-3xs text-left">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Search className="w-4 h-4 text-slate-400" />
                      <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest font-sans">
                        Filtros de Pesquisa Separados
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* CODESC SELECTOR */}
                      <div className="space-y-1 font-sans">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">CODESC</label>
                        <select
                          value={filterCodesc}
                          onChange={(e) => setFilterCodesc(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white font-mono text-slate-700 h-9"
                        >
                          <option value="">Todos os CODESCs ({uniqueCodesc.length})</option>
                          {uniqueCodesc.map(code => (
                            code && <option key={code} value={code}>{code}</option>
                          ))}
                        </select>
                      </div>

                      {/* SRE SELECTOR */}
                      <div className="space-y-1 font-sans">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">SRE</label>
                        <select
                          value={filterSre}
                          onChange={(e) => setFilterSre(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-slate-705 h-9"
                        >
                          <option value="">Todas as SREs ({uniqueSre.length})</option>
                          {uniqueSre.map(s => (
                            s && <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      {/* MUNICIPIO SELECTOR */}
                      <div className="space-y-1 font-sans">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Município</label>
                        <select
                          value={filterMunicipio}
                          onChange={(e) => setFilterMunicipio(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-slate-705 h-9"
                        >
                          <option value="">Todos os Municípios ({uniqueMunicipio.length})</option>
                          {uniqueMunicipio.map(m => (
                            m && <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>

                      {/* ESCOLA SELECTOR */}
                      <div className="space-y-1 font-sans">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Escola</label>
                        <select
                          value={filterEscola}
                          onChange={(e) => setFilterEscola(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-slate-705 h-9"
                        >
                          <option value="">Todas as Escolas ({uniqueEscola.length})</option>
                          {uniqueEscola.map(esc => (
                            esc && <option key={esc} value={esc}>{esc}</option>
                          ))}
                        </select>
                      </div>

                      {/* TIPO DE OBRA SELECTOR */}
                      <div className="space-y-1 font-sans">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Tipo de Obra</label>
                        <select
                          value={filterTipoObra}
                          onChange={(e) => setFilterTipoObra(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-slate-705 h-9"
                        >
                          <option value="">Todos os Tipos ({uniqueTipoObra.length})</option>
                          {uniqueTipoObra.map(t => (
                            t && <option key={t} value={t}>{t.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>

                      {/* TIPO DE ATENDIMENTO SELECTOR */}
                      <div className="space-y-1 font-sans">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Tipo de Atendimento</label>
                        <select
                          value={filterTipoAtendimento}
                          onChange={(e) => setFilterTipoAtendimento(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-slate-705 h-9"
                        >
                          <option value="">Todos os Atendimentos ({uniqueTipoAtendimento.length})</option>
                          {uniqueTipoAtendimento.map(t => (
                            t && <option key={t} value={t}>{t.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>

                      {/* CLASSE IEE SELECTOR */}
                      <div className="space-y-1 font-sans">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Classe (IEE)</label>
                        <select
                          value={filterClasseIEE}
                          onChange={(e) => setFilterClasseIEE(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-slate-705 h-9"
                        >
                          <option value="">Todas as Classes ({uniqueClasseIEE.length})</option>
                          {uniqueClasseIEE.map(c => (
                            <option key={c} value={c}>{CLASSE_IEE_INFO[c].label}</option>
                          ))}
                        </select>
                      </div>

                      {/* ETIQUETA DE PRIORIDADE SELECTOR */}
                      <div className="space-y-1 font-sans">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Prioridade</label>
                        <select
                          value={filterEtiqueta}
                          onChange={(e) => setFilterEtiqueta(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-slate-705 h-9"
                        >
                          <option value="">Todas as Prioridades ({uniqueEtiquetas.length})</option>
                          {uniqueEtiquetas.map(codigo => (
                            <option key={codigo} value={codigo}>{ETIQUETA_LABEL_FILTRO[codigo]}</option>
                          ))}
                        </select>
                      </div>

                      {/* TIPO DE PROCESSO SELECTOR — Atendimento Inicial x Reequilíbrio x Saldo Complementar */}
                      <div className="space-y-1 font-sans">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Tipo de Processo</label>
                        <select
                          value={filterTipoProcesso}
                          onChange={(e) => setFilterTipoProcesso(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-slate-705 h-9"
                        >
                          <option value="">Todos os Tipos ({uniqueTipoProcesso.length})</option>
                          {uniqueTipoProcesso.map(tipo => (
                            <option key={tipo} value={tipo}>{TIPO_LINHA_AUTORIZACAO_INFO[tipo].label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {(filterCodesc || filterSre || filterMunicipio || filterEscola || filterTipoObra || filterTipoAtendimento || filterClasseIEE || filterEtiqueta || filterTipoProcesso) && (
                      <div className="mt-3 flex justify-end font-sans">
                        <button
                          type="button"
                          onClick={() => {
                            setFilterCodesc('');
                            setFilterSre('');
                            setFilterMunicipio('');
                            setFilterEscola('');
                            setFilterTipoObra('');
                            setFilterTipoAtendimento('');
                            setFilterClasseIEE('');
                            setFilterEtiqueta('');
                            setFilterTipoProcesso('');
                          }}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Limpar Filtros e Restaurar
                        </button>
                      </div>
                    )}
                  </div>

                  {/* BARRA DE SELEÇÃO MÚLTIPLA E AUTORIZAÇÃO EM LOTE — só faz sentido pra linhas de
                      Atendimento Inicial (avançam etapaAtual em lote); Reequilíbrio/Saldo têm liberação
                      financeira individual por item, então ficam fora da seleção em lote por ora.
                      Chegar aqui já implica perfil autorizado (podeAutorizarPAF acima retorna cedo). */}
                  {(() => {
                    const linhasAtendimentoInicialFiltradas = filteredLinhasFila
                      .filter(({ linha }) => linha.tipo === 'atendimento_inicial')
                      .map(({ linha }) => linha.sol);
                    if (linhasAtendimentoInicialFiltradas.length === 0) return null;
                    return (
                      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-3xs text-left flex flex-wrap items-center justify-between gap-3 font-sans">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setSelectedAutorizacaoIds(new Set(linhasAtendimentoInicialFiltradas.map(s => s.id)))}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            ☑ Selecionar tudo (Atendimento Inicial)
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedAutorizacaoIds(new Set())}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            ☐ Limpar seleção
                          </button>
                          {selectedAutorizacaoIds.size > 0 && (
                            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 border border-blue-150 font-extrabold rounded-full text-[10px] font-mono">
                              {selectedAutorizacaoIds.size} demanda{selectedAutorizacaoIds.size > 1 ? 's' : ''} selecionada{selectedAutorizacaoIds.size > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        {selectedAutorizacaoIds.size > 0 && (
                          <button
                            type="button"
                            onClick={() => setModalLoteAutorizacaoAberto(true)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-[10.5px] uppercase tracking-wider transition-colors shadow-3xs cursor-pointer"
                          >
                            ✅ Autorizar {selectedAutorizacaoIds.size} demanda{selectedAutorizacaoIds.size > 1 ? 's' : ''} selecionada{selectedAutorizacaoIds.size > 1 ? 's' : ''}
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* TABELA DE AUTORIZAÇÃO */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs text-left">
                    <div className="p-4 border-b border-emerald-100/30 bg-slate-50/50 flex justify-between items-center flex-wrap gap-2 font-sans">
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Demandas em Fase de Homologação (Autorização do PAF)</h4>
                        <p className="text-[10px] text-slate-500 leading-none mt-0.5">Mostrando dotações aguardando dotação do Gestor Financeiro.</p>
                      </div>
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border-emerald-150 border font-extrabold rounded-full text-[10px] font-mono">
                        {filteredLinhasFila.length} aguardando
                      </span>
                    </div>

                    {filteredLinhasFila.length === 0 ? (
                      <div className="p-10 text-center text-slate-400 font-sans space-y-3 max-w-md mx-auto">
                        <div className="w-10 h-10 bg-slate-50 border border-slate-150 rounded-full flex items-center justify-center text-slate-500 mx-auto">
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                        </div>
                        <p className="text-xs font-semibold text-slate-700">Nenhum registro pendente de autorização do PAF nesta seleção.</p>
                        <p className="text-[10px] text-slate-400 font-sans">Todos os processos foram autorizados ou encontram-se em análise.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse font-sans text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-550 font-bold uppercase tracking-wider text-[10px] h-11">
                              <th className="py-3 px-4 w-10"></th>
                              <th className="py-3 px-4 w-24 text-center" title="Ranking técnico sugerido — quanto maior a pontuação, maior a prioridade de autorização">Rank PAF</th>
                              <th className="py-3 px-4 text-center">Tipo</th>
                              <th className="py-3 px-4 text-center">Prioridade</th>
                              <th className="py-3 px-4 text-center">Classe (IEE)</th>
                              <th className="py-3 px-4 w-28">Obra ID</th>
                              <th className="py-3 px-4">Escola</th>
                              <th className="py-3 px-4">SRE</th>
                              <th className="py-3 px-4">Município</th>
                              <th className="py-3 px-4">Tipo de Obra</th>
                              <th className="py-3 px-4">Tipo de atendimento</th>
                              <th className="py-3 px-4 min-w-[280px]">Descrição da Demanda</th>
                              <th className="py-3 px-4 text-right">Valor</th>
                              <th className="py-3 px-4 text-center w-56">Autorizar / Liberar?</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredLinhasFila.map(({ linha, ranking }, index) => {
                              const sol = linha.sol;
                              const valorObra = linha.valor;
                              const criteriosAtivos = ranking.criterios.filter(c => c.pontos > 0);
                              const tituloRanking = criteriosAtivos
                                .map(c => `${c.criterio}: +${c.pontos}`)
                                .join('\n') || 'Sem pontuação adicional';
                              const estrelasCalc = sol.estrelas ?? calcularEstrelas(sol);
                              const prioridadeScoreCalc = sol.prioridadeScore ?? calcularPrioridade(sol).score;
                              const etiquetasCalc: CodigoEtiqueta[] = (sol.etiquetasPrioridade as CodigoEtiqueta[] | undefined) ?? calcularPrioridade(sol).etiquetas;
                              const ieeClasseCalc = sol.ieeClasse ?? calcularIEE(sol)?.classe;
                              return (
                                <tr key={`${sol.id}-${linha.tipo}-${linha.itemId ?? ''}`} className="hover:bg-slate-50/50 transition-colors group">
                                  {/* Checkbox de seleção em lote — só disponível pras linhas de Atendimento Inicial */}
                                  <td className="py-4 px-4 text-center">
                                    {linha.tipo === 'atendimento_inicial' && (
                                      <input
                                        type="checkbox"
                                        checked={selectedAutorizacaoIds.has(sol.id)}
                                        onChange={() => {
                                          setSelectedAutorizacaoIds(prev => {
                                            const next = new Set(prev);
                                            next.has(sol.id) ? next.delete(sol.id) : next.add(sol.id);
                                            return next;
                                          });
                                        }}
                                        className="w-3.5 h-3.5 cursor-pointer accent-emerald-600"
                                      />
                                    )}
                                  </td>
                                  {/* Rank técnico específico da fila do PAF — pontuação e critérios que a compõem */}
                                  <td className="py-4 px-4 text-center" title={tituloRanking}>
                                    <span className="inline-flex flex-col items-center gap-1">
                                      <span className="text-[10px] font-black text-slate-400 font-mono">#{index + 1}</span>
                                      <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-extrabold font-mono">
                                        {ranking.pontos} pts
                                      </span>
                                      {criteriosAtivos.length > 0 && (
                                        <div className="flex flex-col items-center gap-0.5 max-w-[130px]">
                                          {criteriosAtivos.map((c, i) => (
                                            <span key={i} className="text-[8.5px] text-slate-400 leading-tight text-center">
                                              {c.criterio.split(' (')[0]} <span className="font-bold text-indigo-500">+{c.pontos}</span>
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </span>
                                  </td>

                                  {/* Tipo de processo — distingue Atendimento Inicial de Reequilíbrio/Saldo Complementar
                                      já homologados pela DORE, agora reunidos nesta mesma fila. */}
                                  <td className="py-4 px-4 text-center">
                                    <span className={`px-2 py-0.5 border rounded text-[9px] font-black uppercase tracking-wide inline-block ${TIPO_LINHA_AUTORIZACAO_INFO[linha.tipo].corClassName}`}>
                                      {TIPO_LINHA_AUTORIZACAO_INFO[linha.tipo].label}
                                    </span>
                                  </td>

                                  {/* Prioridade geral do processo (estrelas + etiquetas) — mesmo cálculo usado na fila de Atribuição */}
                                  <td className="py-4 px-4 text-center whitespace-nowrap">
                                    <div className="flex flex-col items-center gap-1">
                                      {estrelasCalc > 0 && (
                                        <div className="flex items-center gap-0.5" title={`${estrelasCalc} de 5 estrelas de prioridade`}>
                                          {[1, 2, 3, 4, 5].map(n => (
                                            <span key={n} className={`text-xs leading-none ${n <= estrelasCalc ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                                          ))}
                                        </div>
                                      )}
                                      <div className="flex flex-wrap justify-center gap-1 max-w-[150px]">
                                        {etiquetasCalc.map(codigo => {
                                          const info = getInfoEtiqueta(codigo, sol);
                                          return (
                                            <span key={codigo} className={`${info.corClassName} text-[8.5px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 inline-block`}>
                                              {info.label}
                                            </span>
                                          );
                                        })}
                                      </div>
                                      <span className="text-[8px] text-slate-300 font-mono tracking-wide">score: {prioridadeScoreCalc}</span>
                                    </div>
                                  </td>

                                  {/* Classe IEE — complexidade técnica da obra */}
                                  <td className="py-4 px-4 text-center whitespace-nowrap">
                                    {ieeClasseCalc ? (
                                      <div className="flex flex-col items-center gap-0.5">
                                        <span className={`${CLASSE_IEE_INFO[ieeClasseCalc].corClassName} text-[9px] font-black uppercase tracking-wide rounded px-2 py-1 inline-block`}>
                                          {CLASSE_IEE_INFO[ieeClasseCalc].label}
                                        </span>
                                        <span className="text-[8px] text-slate-300 font-mono tracking-wide">{sol.ieePontos ?? calcularIEE(sol)?.pontos} pts IEE</span>
                                      </div>
                                    ) : (
                                      <span className="text-[9px] text-slate-300 italic">—</span>
                                    )}
                                  </td>
                                  {/* ID da Obra */}
                                  <td className="py-4 px-4 font-mono font-bold text-blue-800">
                                    <button 
                                      onClick={() => setIdSolicitacaoSelecionada(sol.id)}
                                      className="hover:underline focus:outline-hidden cursor-pointer"
                                    >
                                      {sol.id}
                                    </button>
                                    <span className="block text-[9px] text-slate-400 font-normal">C: {sol.codesc}</span>
                                  </td>
                                  
                                  {/* Escola */}
                                  <td className="py-4 px-4">
                                    <button 
                                      onClick={() => setIdSolicitacaoSelecionada(sol.id)}
                                      className="font-bold text-slate-800 text-xs leading-snug hover:text-blue-600 transition-colors pointer-events-auto text-left cursor-pointer"
                                    >
                                      {sol.nomeEscola}
                                    </button>
                                  </td>

                                  {/* SRE */}
                                  <td className="py-4 px-4 text-slate-600">
                                    {sol.sre}
                                  </td>

                                  {/* Município */}
                                  <td className="py-4 px-4 text-slate-600">
                                    {sol.municipio}
                                  </td>

                                  {/* Tipo de Obra */}
                                  <td className="py-4 px-4">
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-150 rounded text-[10px] font-semibold uppercase">
                                      {(sol.tipoObra || sol.tipo || '—').toUpperCase()}
                                    </span>
                                  </td>

                                  {/* Tipo Atendimento */}
                                  <td className="py-4 px-4">
                                    <span className="px-2 py-0.5 bg-teal-50 text-teal-900 border border-teal-150 rounded text-[10px] font-semibold uppercase">
                                      {(sol.tipoAtendimento || 'Atendimento Regular').toUpperCase()}
                                    </span>
                                  </td>

                                  {/* Descrição da Demanda — o que de fato será executado */}
                                  <td className="py-4 px-4 min-w-[280px]">
                                    <p className="text-slate-500 text-[10.5px] leading-snug font-medium line-clamp-3" title={sol.descricaoFolhaRosto || sol.tipo}>
                                      {sol.descricaoFolhaRosto || sol.tipo || '—'}
                                    </p>
                                  </td>

                                  {/* Valor Obra */}
                                  <td className="py-4 px-4 text-right">
                                    <span className="font-mono font-bold text-slate-700 block">
                                      R$ {valorObra.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    {linha.tipo === 'atendimento_inicial' && !!sol.necessidadeAditivoEstimada && (
                                      <span className="text-[9px] text-amber-600 font-semibold block mt-0.5" title="Necessidade de aditivo já estimada no cadastro inicial">
                                        + R$ {sol.necessidadeAditivoEstimada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} previsto em aditivo
                                      </span>
                                    )}
                                  </td>

                                  {/* Botões de Ação — texto varia conforme o tipo: Atendimento Inicial autoriza o PAF
                                      (avança etapaAtual), Reequilíbrio/Saldo libera o recurso financeiro (atualiza o item). */}
                                  <td className="py-4 px-4 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        data-testid={linha.tipo === 'atendimento_inicial' ? `paf-autorizar-${sol.id}` : `paf-liberar-${linha.itemId}`}
                                        onClick={() => setLinhaConfirmando(linha)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-colors shadow-3xs cursor-pointer"
                                      >
                                        {linha.tipo === 'atendimento_inicial' ? 'Autorizar PAF' : 'Liberar Recurso'}
                                      </button>
                                      <button
                                        onClick={() => setLinhaRejeitando(linha)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-colors shadow-3xs cursor-pointer"
                                      >
                                        {linha.tipo === 'atendimento_inicial' ? 'Não' : 'Reprovar'}
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

                  {/* MODAL / BANNER DE JUSTIFICATIVA DE REJEIÇÃO — cobre tanto a devolução do Atendimento
                      Inicial (volta pra 'cadastro') quanto a reprovação da liberação financeira de
                      Reequilíbrio/Saldo (o item vira 'reprovado', a obra permanece em 'execucao'). */}
                  {linhaRejeitando && (() => {
                    const linha = linhaRejeitando;
                    const ehFinanceiro = linha.tipo !== 'atendimento_inicial';
                    return (
                      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xs flex items-center justify-center z-50 p-4 font-sans">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150">
                          <div className="bg-rose-50 border-b border-rose-100 p-4">
                            <h3 className="text-sm font-extrabold text-rose-800 uppercase tracking-wider flex items-center gap-2">
                              {ehFinanceiro ? 'Motivo de Reprovação da Liberação Financeira' : 'Motivo de Não-Autorização'}
                            </h3>
                            <p className="text-xs text-neutral-500 mt-0.5">
                              {TIPO_LINHA_AUTORIZACAO_INFO[linha.tipo].label} — {linha.sol.nomeEscola} ({linha.sol.id})
                            </p>
                          </div>

                          <div className="p-4 space-y-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1">
                                {ehFinanceiro
                                  ? 'Escreva a justificativa para a reprovação da liberação do recurso *'
                                  : 'Escreva a justificativa para o retorno / rejeição do processo *'}
                              </label>
                              <textarea
                                value={justificativaRejeicaoPaf}
                                onChange={(e) => setJustificativaRejeicaoPaf(e.target.value)}
                                placeholder="Digite aqui o parecer descrevendo o porquê de o recurso do PAF não ter sido aprovado..."
                                rows={4}
                                required
                                className="w-full text-xs p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                              />
                            </div>
                          </div>

                          <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-2 text-xs">
                            <button
                              onClick={() => {
                                setLinhaRejeitando(null);
                                setJustificativaRejeicaoPaf('');
                              }}
                              className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer animate-none"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => {
                                if (!justificativaRejeicaoPaf.trim()) {
                                  alert('Por favor, digite a justificativa.');
                                  return;
                                }
                                if (ehFinanceiro) {
                                  handleReprovarRecursoFinanceiro(linha, justificativaRejeicaoPaf);
                                } else {
                                  handleRejeitarPAF(linha.sol, justificativaRejeicaoPaf);
                                }
                              }}
                              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg cursor-pointer"
                            >
                              {ehFinanceiro ? 'Confirmar Reprovação' : 'Confirmar Devolução'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* MODAL DE CONFIRMAÇÃO — Autorização do PAF (Atendimento Inicial) ou Liberação
                      Financeira (Reequilíbrio/Saldo Complementar). */}
                  {linhaConfirmando && (() => {
                    const linha = linhaConfirmando;
                    const ehFinanceiro = linha.tipo !== 'atendimento_inicial';
                    return (
                      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xs flex items-center justify-center z-50 p-4 font-sans">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150">
                          <div className="bg-emerald-50 border-b border-emerald-100 p-4">
                            <h3 className="text-sm font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                              {ehFinanceiro ? '✓ Confirmar Liberação Financeira' : '✓ Confirmar Autorização do PAF'}
                            </h3>
                            <p className="text-xs text-neutral-500 mt-0.5">
                              {TIPO_LINHA_AUTORIZACAO_INFO[linha.tipo].label} — {linha.sol.nomeEscola} ({linha.sol.id})
                            </p>
                          </div>

                          <div className="p-4 space-y-4">
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {ehFinanceiro
                                ? 'Deseja liberar oficialmente o recurso financeiro deste item, já homologado tecnicamente pela DORE, no valor de:'
                                : 'Deseja aprovar e autorizar oficialmente o PAF desta demanda no valor de:'}
                            </p>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                              <span className="text-base font-black text-emerald-700 font-mono">
                                R$ {linha.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 italic leading-normal">
                              {ehFinanceiro
                                ? 'Esta ação registrará a liberação financeira do item e arquivará o parecer do Subsecretário de Administração.'
                                : 'Esta ação registrará o trâmite na planilha oficial de dotações orçamentárias e arquivará o parecer do Gestor Geral.'}
                            </p>
                          </div>

                          <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-2 text-xs">
                            <button
                              onClick={() => setLinhaConfirmando(null)}
                              className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              data-testid={ehFinanceiro ? `paf-liberar-confirmar-${linha.itemId}` : 'paf-autorizacao-confirmar'}
                              onClick={() => {
                                if (ehFinanceiro) {
                                  handleLiberarRecursoFinanceiro(linha);
                                } else {
                                  handleAutorizarPAF(linha.sol);
                                }
                                setLinhaConfirmando(null);
                              }}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg cursor-pointer"
                            >
                              {ehFinanceiro ? 'Liberar Recurso' : 'Autorizar PAF'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* MODAL DE CONFIRMAÇÃO DE AUTORIZAÇÃO EM LOTE */}
                  {modalLoteAutorizacaoAberto && (() => {
                    const selecionadas = solicitacoesAtendimentoInicial.filter(s => selectedAutorizacaoIds.has(s.id));
                    return (
                      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xs flex items-center justify-center z-50 p-4 font-sans">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150">
                          <div className="bg-emerald-50 border-b border-emerald-100 p-4">
                            <h3 className="text-sm font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                              ✓ Autorizar {selecionadas.length} demandas em lote
                            </h3>
                          </div>

                          <div className="p-4 space-y-3">
                            <p className="text-xs text-slate-600 leading-relaxed">
                              As seguintes demandas serão autorizadas oficialmente:
                            </p>
                            <ul className="max-h-60 overflow-y-auto space-y-1.5 text-xs">
                              {selecionadas.map(s => (
                                <li key={s.id} className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                                  <span className="font-bold text-slate-800 truncate">{s.nomeEscola}</span>
                                  <span className="text-[10px] font-mono text-slate-400 shrink-0">{s.id}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-2 text-xs">
                            <button
                              onClick={() => setModalLoteAutorizacaoAberto(false)}
                              className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => {
                                const total = selecionadas.length;
                                handleAutorizarLote(selecionadas);
                                setSelectedAutorizacaoIds(new Set());
                                setModalLoteAutorizacaoAberto(false);
                                setModalLoteSucessoCount(total);
                              }}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg cursor-pointer"
                            >
                              Confirmar Autorização em Lote
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* MODAL DE SUCESSO DA AUTORIZAÇÃO EM LOTE */}
                  {modalLoteSucessoCount !== null && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xs flex items-center justify-center z-50 p-4 font-sans">
                      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full border border-slate-200 overflow-hidden text-center animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-6 space-y-2">
                          <span className="text-3xl block">✅</span>
                          <p className="text-sm font-black text-slate-800">
                            {modalLoteSucessoCount} demanda{modalLoteSucessoCount > 1 ? 's foram autorizadas' : ' foi autorizada'} com sucesso
                          </p>
                        </div>
                        <div className="px-5 py-4 border-t border-slate-100">
                          <button
                            onClick={() => setModalLoteSucessoCount(null)}
                            className="w-full px-4 py-2 text-xs font-black text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition cursor-pointer"
                          >
                            OK
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          ) : activeModule === 'gestao_obras' && activeSubTask !== 'visao_geral' && ['analise', 'paf', 'execucao_abertura', 'execucao', 'aditivos', 'conclusao'].includes(activeSubTask) ? (
            (() => {
              const listFiltered = solicitacoesVisiveis.filter(s => {
                if (activeSubTask === 'analise') return s.etapaAtual === 'analise';
                if (activeSubTask === 'paf') return s.etapaAtual === 'paf';
                if (activeSubTask === 'execucao_abertura') return s.etapaAtual === 'ordem_inicio' || s.etapaAtual === 'execucao';
                if (activeSubTask === 'execucao') return (s.etapaAtual === 'execucao' || s.etapaAtual === 'ordem_inicio') && !!s.numeroPAF;
                if (activeSubTask === 'aditivos') return (s.etapaAtual === 'execucao' || s.etapaAtual === 'ordem_inicio') && !!s.numeroPAF;
                if (activeSubTask === 'conclusao') return (s.etapaAtual === 'execucao' || s.etapaAtual === 'ordem_inicio') && !!s.numeroPAF;
                
                // 9 submodules
                if (['execucao_cadastro', 'execucao_acompanhamento', 'execucao_contratos', 'execucao_fiscalizacao', 'execucao_documentos'].includes(activeSubTask)) {
                  return s.etapaAtual === 'ordem_inicio' || s.etapaAtual === 'execucao';
                }
                if (['execucao_medicoes', 'execucao_aditivos', 'execucao_ajustes'].includes(activeSubTask)) {
                  return (s.etapaAtual === 'execucao' || s.etapaAtual === 'ordem_inicio') && !!s.numeroPAF;
                }
                return false;
              });

              const activeSchoolId = selectedSchoolsPorSubtask[activeSubTask] || (listFiltered.length > 0 ? listFiltered[0].id : '');
              const activeSchool = listFiltered.find(s => s.id === activeSchoolId) || (listFiltered.length > 0 ? listFiltered[0] : null);

              // Predefined sets of available option values for Análise Técnica filters
              const idsDisponiveis = Array.from(new Set(listFiltered.map(s => s.id)));
              const codescsDisponiveis = Array.from(new Set(listFiltered.map(s => s.codesc)));
              const municipiosDisponiveis = Array.from(new Set(listFiltered.map(s => s.municipio)));
              const regionaisDisponiveis = Array.from(new Set(listFiltered.map(s => s.sre)));
              const escolasDisponiveis = Array.from(new Set(listFiltered.map(s => s.nomeEscola)));
              const responsaveisDisponiveis = Array.from(new Set(listFiltered.map(s => s.responsavel || 'Não Informado')));

              const getForcedTab = (subTask: string, sol: Solicitacao | null) => {
                if (!sol) return 'checklist';
                if (subTask === 'cadastro' || subTask === 'analise') return 'checklist';
                if (subTask === 'paf_autorizacao' || subTask === 'paf') return 'paf';
                if (subTask === 'execucao_abertura' || subTask === 'execucao_cadastro' || subTask === 'execucao_contratos') return 'ordem_inicio';
                if (subTask === 'execucao' || subTask === 'execucao_acompanhamento' || subTask === 'execucao_medicoes' || subTask === 'execucao_fiscalizacao') return 'execucao';
                if (subTask === 'aditivos' || subTask === 'execucao_aditivos') return 'aditivos';
                if (subTask === 'execucao_ajustes') return 'ajustes';
                if (subTask === 'conclusao') return 'conclusao';
                return 'checklist';
              };

              const subTaskLabels: { [key: string]: string } = {
                cadastro: 'Lista de Atendimentos',
                analise: 'Validação Técnica',
                paf_acompanhamento: 'Acompanhamento de PAF',
                paf_autorizacao: 'Autorizações',
                paf: 'Geração do PAF',
                execucao_abertura: 'Abertura de Obra',
                execucao: 'Medições',
                aditivos: 'Aditamentos e Alterações',
                conclusao: 'Termo de Conclusão',
                execucao_cadastro: 'Cadastro de Obras',
                execucao_acompanhamento: 'Execução de Obra',
                execucao_medicoes: 'Medições',
                execucao_contratos: 'Contratos',
                execucao_aditivos: 'Aditivos',
                execucao_ajustes: 'Ajustes',
                execucao_fiscalizacao: 'Fiscalização',
                execucao_documentos: 'Documentações'
              };

              const stepConfig = [
                { label: 'Atendimento Inicial', key: 'cadastro', desc: 'Checks e anexos técnicos' },
                { label: 'Análise Técnica', key: 'analise', desc: 'Validação e parecer DORE' },
                { label: 'Autorização PAF', key: 'paf_autorizacao', desc: 'Liberação de dotação' },
                { label: 'Geração PAF', key: 'paf', desc: 'Faturamento de Contrato' },
                { label: 'Ordem de Início', key: 'ordem_inicio', desc: 'Preenchimento e vigência' },
                { label: 'Execução de Obra', key: 'execucao', desc: 'Medições e andamento' }
              ];

              return (
                <div className="w-full flex-grow flex flex-col space-y-6">

                  {/* CABEÇALHO DA FILA E SELETOR DE ATENDIMENTO - LIGHTENED THE COLOR */}
                  {activeSubTask === 'analise' ? (
                    <div id="paf-autorizacao-workspace" className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs text-left text-slate-800 space-y-4">
                      {/* Top Row with Header and Step Queue Info */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <Search className="w-4 h-4 text-blue-600" />
                          <h3 className="text-xs font-black font-sans uppercase tracking-wider text-slate-700">
                            🔍 FILTROS DE PESQUISA (ANÁLISE TÉCNICA)
                          </h3>
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded font-mono">
                          Fila da Etapa: {listFiltered.length} de {solicitacoes.filter(s => s.etapaAtual === 'analise').length} demandas analisáveis
                        </span>
                      </div>

                      {/* Dropdowns and Date Fields Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                        {/* ID DE OBRA */}
                        <div className="flex flex-col space-y-1">
                          <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">ID DE OBRA</label>
                          <select
                            value={filterAnaliseIdText}
                            onChange={(e) => setFilterAnaliseIdText(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-sans font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Todos os IDs</option>
                            {idsDisponiveis.map(val => (
                              <option key={val} value={val}>{val}</option>
                            ))}
                          </select>
                        </div>

                        {/* CODESC */}
                        <div className="flex flex-col space-y-1">
                          <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">CODESC</label>
                          <select
                            value={filterAnaliseCodescText}
                            onChange={(e) => setFilterAnaliseCodescText(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-sans font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Todos os CODESC</option>
                            {codescsDisponiveis.map(val => (
                              <option key={val} value={val}>{val}</option>
                            ))}
                          </select>
                        </div>

                        {/* MUNICÍPIO */}
                        <div className="flex flex-col space-y-1">
                          <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">MUNICÍPIO</label>
                          <select
                            value={filterAnaliseMunicipioText}
                            onChange={(e) => setFilterAnaliseMunicipioText(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-sans font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Todos os Municípios</option>
                            {municipiosDisponiveis.map(val => (
                              <option key={val} value={val}>{val}</option>
                            ))}
                          </select>
                        </div>

                        {/* REGIONAL (SRE) */}
                        <div className="flex flex-col space-y-1">
                          <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">REGIONAL (SRE)</label>
                          <select
                            value={filterAnaliseSreText}
                            onChange={(e) => setFilterAnaliseSreText(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-sans font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Todas as Regionais</option>
                            {regionaisDisponiveis.map(val => (
                              <option key={val} value={val}>{val}</option>
                            ))}
                          </select>
                        </div>

                        {/* ESCOLA */}
                        <div className="flex flex-col space-y-1 flex-1">
                          <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">ESCOLA</label>
                          <select
                            value={filterAnaliseEscolaText}
                            onChange={(e) => setFilterAnaliseEscolaText(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-sans font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Todas as Escolas</option>
                            {escolasDisponiveis.map(val => (
                              <option key={val} value={val}>{val}</option>
                            ))}
                          </select>
                        </div>

                        {/* RESPONSÁVEL */}
                        <div className="flex flex-col space-y-1">
                          <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">RESPONSÁVEL</label>
                          <select
                            value={filterAnaliseResponsavelText}
                            onChange={(e) => setFilterAnaliseResponsavelText(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-sans font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Todos os Responsáveis</option>
                            {responsaveisDisponiveis.map(val => (
                              <option key={val} value={val}>{val}</option>
                            ))}
                          </select>
                        </div>

                        {/* DATA DE CRIAÇÃO (Custom style input picker) */}
                        <div className="flex flex-col space-y-1 col-span-2 sm:col-span-1">
                          <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">DATA DE CRIAÇÃO</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="date"
                              value={filterAnaliseDataInicio}
                              onChange={(e) => setFilterAnaliseDataInicio(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-[10px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <span className="text-slate-400 text-xs">à</span>
                            <input
                              type="date"
                              value={filterAnaliseDataFim}
                              onChange={(e) => setFilterAnaliseDataFim(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-[10px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Row with Select for Atendimento pills */}
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
                        <span className="text-[10px] font-black text-slate-500 tracking-wider uppercase font-mono">
                          SELECIONE PARA ATENDIMENTO:
                        </span>
                        
                        <div className="flex flex-wrap gap-2">
                          {listFiltered
                            .filter(school => {
                              if (filterAnaliseIdText && school.id !== filterAnaliseIdText) return false;
                              if (filterAnaliseCodescText && school.codesc !== filterAnaliseCodescText) return false;
                              if (filterAnaliseMunicipioText && school.municipio !== filterAnaliseMunicipioText) return false;
                              if (filterAnaliseSreText && school.sre !== filterAnaliseSreText) return false;
                              if (filterAnaliseEscolaText && school.nomeEscola !== filterAnaliseEscolaText) return false;
                              if (filterAnaliseResponsavelText && (school.responsavel || 'Não Informado') !== filterAnaliseResponsavelText) return false;
                              return true;
                            })
                            .map(school => {
                              const isSelected = school.id === activeSchoolId;
                              return (
                                <button
                                  key={school.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedSchoolsPorSubtask(prev => ({
                                      ...prev,
                                      [activeSubTask]: school.id
                                    }));
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all shadow-3xs cursor-pointer ${
                                    isSelected
                                      ? 'bg-blue-600 border border-blue-600 text-white font-extrabold shadow-sm'
                                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold'
                                  }`}
                                >
                                  {school.nomeEscola} ({school.id.replace('SOL-2026-', '')})
                                </button>
                              );
                            })}
                        </div>
                      </div>

                    </div>
                  ) : activeSubTask === 'conclusao' ? (
                    /* ── Header estilo ExecucaoSubmodulos para Termo de Encerramento ── */
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-extrabold tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                              Termo de Encerramento
                            </span>
                            <span className="text-xs text-slate-400 font-mono">SGO Ativo</span>
                          </div>
                          <h1 className="text-xl font-bold font-sans tracking-tight text-slate-900">
                            Conclusão e Encerramento de Obra
                          </h1>
                          <p className="text-xs text-slate-500 mt-1">
                            Proceda com as vistorias finais, checklist de pendências e emissão do termo de encerramento da execução.
                          </p>
                        </div>
                        <div className="flex gap-4 self-start md:self-auto shrink-0">
                          <div className="bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/60 font-sans">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Obras para Encerrar</div>
                            <div className="text-base font-black text-slate-900 font-mono">{listFiltered.length} Escola{listFiltered.length !== 1 ? 's' : ''}</div>
                          </div>
                        </div>
                      </div>

                      {/* Obra sob Foco — esquerda / botão — direita */}
                      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs font-sans flex-wrap">
                          {activeSchool ? (
                            <>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Obra sob Foco:</span>
                              <span className="font-black text-slate-800">{activeSchool.nomeEscola}</span>
                              <span className="text-slate-400">•</span>
                              <span className="font-mono text-blue-700 font-bold">{activeSchool.id}</span>
                              <span className="text-slate-400 hidden sm:inline">•</span>
                              <span className="text-slate-500 hidden sm:inline">{activeSchool.municipio} • {activeSchool.sre}</span>
                            </>
                          ) : (
                            <span className="text-slate-400 italic">Nenhuma obra selecionada</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setConclusaoModalAberto(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-[#13264d] hover:bg-[#1a3a6e] text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-sm shrink-0"
                        >
                          <Search className="w-3.5 h-3.5" />
                          Alterar Obra Focada
                          <span className="bg-blue-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{listFiltered.length}</span>
                        </button>
                      </div>

                      {/* MODAL de seleção de obra — idêntico ao ExecucaoSubmodulos */}
                      {conclusaoModalAberto && (() => {
                        const municipios = ['Todos', ...Array.from(new Set(listFiltered.map(s => s.municipio)))];
                        const sres = ['Todos', ...Array.from(new Set(listFiltered.map(s => s.sre)))];
                        const escolas = ['Todos', ...listFiltered.map(s => s.nomeEscola)];
                        const statusOpts = ['Todos', 'Em cadastramento da obra', 'Em processo de contratação', 'Não iniciada', 'Em execução', 'Paralisada', 'Concluída'];

                        const obrasFiltradas = listFiltered.filter(s => {
                          const q = conclusaoModalBusca.toLowerCase();
                          const matchBusca = !conclusaoModalBusca || s.nomeEscola.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.municipio.toLowerCase().includes(q) || s.codesc.includes(q);
                          const matchId = !conclusaoFiltroId || s.id === conclusaoFiltroId;
                          const matchCodesc = conclusaoFiltroCodesc === 'Todos' || s.codesc === conclusaoFiltroCodesc;
                          const matchMun = conclusaoFiltroMunicipio === 'Todos' || s.municipio === conclusaoFiltroMunicipio;
                          const matchSre = conclusaoFiltroSre === 'Todos' || s.sre === conclusaoFiltroSre;
                          const matchEscola = conclusaoFiltroEscola === 'Todos' || s.nomeEscola === conclusaoFiltroEscola;
                          const matchStatus = conclusaoFiltroStatus === 'Todos' || computeStatusObra(s).label === conclusaoFiltroStatus;
                          return matchBusca && matchId && matchCodesc && matchMun && matchSre && matchEscola && matchStatus;
                        });

                        const limparFiltros = () => {
                          setConclusaoFiltroId('');
                          setConclusaoFiltroCodesc('Todos');
                          setConclusaoFiltroMunicipio('Todos');
                          setConclusaoFiltroSre('Todos');
                          setConclusaoFiltroEscola('Todos');
                          setConclusaoFiltroStatus('Todos');
                          setConclusaoModalBusca('');
                        };

                        return (
                          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setConclusaoModalAberto(false)} />
                            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden">
                              {/* Header */}
                              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                                    <Building2 className="w-4 h-4 text-white" />
                                  </div>
                                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">Mudar Escola em Foco</h2>
                                </div>
                                <button onClick={() => setConclusaoModalAberto(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition text-slate-500 cursor-pointer">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="px-5 py-3 overflow-y-auto flex-1 space-y-4">
                                <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
                                  Selecione outra escola aplicando filtros de pesquisa abaixo.
                                </p>

                                {/* Filtros */}
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <Filter className="w-3 h-3 text-blue-500" />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">Filtros de Pesquisa</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2.5">
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">ID de Obra</label>
                                      <select value={conclusaoFiltroId} onChange={e => setConclusaoFiltroId(e.target.value)} className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-white font-sans">
                                        <option value="">Todos</option>
                                        {listFiltered.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                                      </select>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">CODESC</label>
                                      <select value={conclusaoFiltroCodesc} onChange={e => setConclusaoFiltroCodesc(e.target.value)} className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-white font-sans">
                                        {['Todos', ...Array.from(new Set(listFiltered.map(s => s.codesc)))].map(v => <option key={v} value={v}>{v}</option>)}
                                      </select>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Município</label>
                                      <select value={conclusaoFiltroMunicipio} onChange={e => setConclusaoFiltroMunicipio(e.target.value)} className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-white font-sans">
                                        {municipios.map(v => <option key={v} value={v}>{v}</option>)}
                                      </select>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Regional (SRE)</label>
                                      <select value={conclusaoFiltroSre} onChange={e => setConclusaoFiltroSre(e.target.value)} className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-white font-sans">
                                        {sres.map(v => <option key={v} value={v}>{v}</option>)}
                                      </select>
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Escola</label>
                                      <select value={conclusaoFiltroEscola} onChange={e => setConclusaoFiltroEscola(e.target.value)} className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-white font-sans">
                                        {escolas.map(v => <option key={v} value={v}>{v}</option>)}
                                      </select>
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Status</label>
                                      <select value={conclusaoFiltroStatus} onChange={e => setConclusaoFiltroStatus(e.target.value)} className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-white font-sans">
                                        {statusOpts.map(v => <option key={v} value={v}>{v}</option>)}
                                      </select>
                                    </div>
                                  </div>
                                  <button onClick={limparFiltros} className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 font-bold ml-auto cursor-pointer transition">
                                    <RefreshCw className="w-3 h-3" /> Limpar Filtros
                                  </button>
                                </div>

                                {/* Busca rápida */}
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                  <input
                                    type="text"
                                    placeholder="Busca rápida por palavra-chave..."
                                    value={conclusaoModalBusca}
                                    onChange={e => setConclusaoModalBusca(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 font-sans"
                                  />
                                </div>

                                {/* Resultados */}
                                <div className="space-y-2">
                                  {obrasFiltradas.length === 0 ? (
                                    <div className="py-8 text-center text-xs text-slate-400 font-sans">
                                      Nenhuma obra encontrada com os filtros aplicados.
                                    </div>
                                  ) : obrasFiltradas.map(sol => {
                                    const isSelecionada = sol.id === activeSchoolId;
                                    const statusInfo = computeStatusObra(sol);
                                    return (
                                      <button
                                        key={sol.id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedSchoolsPorSubtask(prev => ({ ...prev, [activeSubTask]: sol.id }));
                                          setConclusaoModalAberto(false);
                                        }}
                                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all cursor-pointer ${
                                          isSelecionada
                                            ? 'border-blue-400 bg-blue-50 shadow-sm'
                                            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/70'
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div>
                                            <p className={`text-xs font-black leading-tight ${isSelecionada ? 'text-blue-800' : 'text-slate-800'}`}>{sol.nomeEscola}</p>
                                            <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                                              {sol.municipio} • {sol.sre} • CODESC {sol.codesc}
                                            </p>
                                          </div>
                                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border shrink-0 ${statusInfo.badgeClass}`}>
                                            {statusInfo.label}
                                          </span>
                                        </div>
                                        {isSelecionada && (
                                          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-blue-600 font-bold">
                                            <CheckCircle className="w-3 h-3" /> Em foco
                                          </div>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Footer */}
                              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <span className="text-[10px] text-slate-400 font-sans">
                                  Exibindo {obrasFiltradas.length} {obrasFiltradas.length === 1 ? 'escola' : 'escolas'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setConclusaoModalAberto(false)}
                                  className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 hover:text-slate-800 transition cursor-pointer"
                                >
                                  <LayoutGrid className="w-3 h-3" />
                                  Fechar
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-blue-50/65 to-indigo-50/45 border border-blue-100/90 text-slate-800 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-left">
                      <div className="space-y-1">
                        <span className="px-2 py-0.5 bg-blue-600 text-white font-extrabold text-[10px] rounded uppercase tracking-wider font-mono">
                          AMBIENTE WORKSPACE SGO
                        </span>
                        <h2 className="text-base sm:text-lg font-extrabold font-sans tracking-tight text-slate-855 flex items-center gap-2">
                          <HardHat className="text-blue-600 w-5 h-5 shrink-0" />
                          Ambiente de {subTaskLabels[activeSubTask]}
                        </h2>
                        <p className="text-xs text-slate-600 max-w-xl font-sans font-medium">
                          {activeSubTask === 'cadastro' && 'Visualize o dossiê consolidado de todas as demandas e atendimentos cadastrados.'}
                          {activeSubTask === 'analise' && 'Avalie documentação técnica de engenharia, anexe pareceres técnicos e resolva pendências.'}
                          {activeSubTask === 'paf' && 'Configure códigos de liberação financeira e de faturamento.'}
                          {activeSubTask === 'execucao' && 'Forneça a Ordem de Início, calendarize cronogramas, acompanhe as obras e medições físico-financeiras.'}
                          {activeSubTask === 'aditivos' && 'Gerencie acréscimos, supressões de valor e prorrogações de prazo do contrato.'}
                          {activeSubTask === 'ajustes' && 'Controle os ajustes e remanejamento de saldos da planilha orçamentária.'}
                          {/* 9 execution submodules descriptions */}
                          {activeSubTask === 'execucao_cadastro' && 'Cadastre e visualize o dossiê detalhado das obras em andamento, incluindo contratos, prazos e faturamento.'}
                          {activeSubTask === 'execucao_acompanhamento' && 'Acompanhe a evolução física das obras e o avanço técnico de cada etapa.'}
                          {activeSubTask === 'execucao_medicoes' && 'Gerencie as medições físico-financeiras periódicas, notas fiscais e relatórios técnicos de faturamento.'}
                          {activeSubTask === 'execucao_contratos' && 'Controle contratos associados, dados das empresas contratadas, garantias e vigências contratuais.'}
                          {activeSubTask === 'execucao_aditivos' && 'Gerencie e registre acréscimos ou supressões de valor, bem como prorrogações de vigências do contrato.'}
                          {activeSubTask === 'execucao_ajustes' && 'Controle os ajustes de saldo de planilha orçamentária e remanejamentos técnicos.'}
                          {activeSubTask === 'execucao_fiscalizacao' && 'Monitore vistorias integradas de campo, diário oficial de obras e relatórios fotográficos de controle.'}
                          {activeSubTask === 'execucao_documentos' && 'GED - Gerenciamento Eletrônico de Documentos com upload de certidões, planilhas e ARTs.'}
                        </p>
                      </div>

                      {listFiltered.length > 0 && (
                        <div className="shrink-0 space-y-1.5 md:min-w-[340px] relative">
                          <label className="text-[10px] font-bold text-blue-700 block uppercase font-mono tracking-wider">
                            Selecione a Escola Ativa desta Etapa:
                          </label>

                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-250 text-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans cursor-pointer font-bold shadow-xs text-left pr-8 flex items-center justify-between"
                            >
                              <span className="truncate">
                                {activeSchool
                                  ? `${activeSchool.codesc} - ${activeSchool.nomeEscola} (${activeSchool.sre}) - ${activeSchool.id}`
                                  : 'Selecione uma escola...'}
                              </span>
                              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                            </button>

                            {isSelectorOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-40 cursor-default"
                                  onClick={() => setIsSelectorOpen(false)}
                                />
                                <div className="absolute right-0 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-hidden flex flex-col z-50 animate-fade-in shadow-xl">
                                  <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                                    <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <input
                                      type="text"
                                      placeholder="Escreva para procurar o CODESC..."
                                      value={schoolSearchQuery}
                                      onChange={(e) => setSchoolSearchQuery(e.target.value)}
                                      autoFocus
                                      className="w-full bg-transparent border-none text-xs text-slate-700 focus:outline-none focus:ring-0 font-sans font-semibold placeholder-slate-400"
                                    />
                                    {schoolSearchQuery && (
                                      <button
                                        type="button"
                                        onClick={() => setSchoolSearchQuery('')}
                                        className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                  <div className="overflow-y-auto max-h-48 divide-y divide-slate-105">
                                    {(() => {
                                      const searchLower = schoolSearchQuery.toLowerCase().trim();
                                      const filteredList = listFiltered.filter(s => {
                                        if (!searchLower) return true;
                                        return (
                                          s.codesc.toLowerCase().includes(searchLower) ||
                                          s.nomeEscola.toLowerCase().includes(searchLower) ||
                                          s.sre.toLowerCase().includes(searchLower) ||
                                          s.id.toLowerCase().includes(searchLower)
                                        );
                                      });
                                      if (filteredList.length === 0) {
                                        return (
                                          <div className="p-3 text-xs text-slate-405 text-center font-sans font-medium">
                                            Nenhum CODESC ou escola encontrado
                                          </div>
                                        );
                                      }
                                      return filteredList.map(s => {
                                        const isCurrent = s.id === activeSchoolId;
                                        return (
                                          <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => {
                                              setSelectedSchoolsPorSubtask(prev => ({
                                                ...prev,
                                                [activeSubTask]: s.id
                                              }));
                                              setIsSelectorOpen(false);
                                            }}
                                            className={`w-full text-left px-3 py-2 text-xs transition-colors font-sans flex flex-col gap-0.5 cursor-pointer hover:bg-blue-50 ${
                                              isCurrent ? 'bg-blue-50 font-bold border-l-2 border-blue-600' : 'text-slate-700'
                                            }`}
                                          >
                                            <span className="font-bold text-slate-800">
                                              {s.codesc} - {s.nomeEscola}
                                            </span>
                                            <span className="text-[10px] text-slate-400 flex items-center justify-between">
                                              <span>{s.sre}</span>
                                              <span className="font-mono text-[9px] bg-slate-100 px-1 py-0.2 rounded border border-slate-200/50">
                                                ID: {s.id}
                                              </span>
                                            </span>
                                          </button>
                                        );
                                      });
                                    })()}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>

                          <span className="text-[9px] text-slate-500 block font-mono text-right font-semibold">
                            Fila: {listFiltered.length} {listFiltered.length === 1 ? 'demanda' : 'demandas'} aguardando atendimento
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="w-full flex flex-col space-y-6">
                    {activeSchool ? (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-1">
                      <SolicitacaoDetalhes
                        solicitacao={activeSchool}
                        perfilUsuario={perfilUsuario}
                        onVoltar={() => {}}
                        onUpdate={handleUpdateSolicitacao}
                        forcedTab={getForcedTab(activeSubTask, activeSchool)}
                        hideVoltar={true}
                        hideStepper={true}
                        hideTransitionButtons={activeSubTask !== 'continuar_preenchimento' && activeSubTask !== 'analise'}
                        hideTabs={true}
                        activeSubTask={activeSubTask}
                        usuariosSeguranca={usuariosSeguranca}
                        somenteLeitura={somenteLeitura}
                      />
                    </div>
                  ) : (
                    // FILA VAZIA COM GERADOR DE TESTES
                    <div className="bg-white rounded-xl border border-slate-200 p-10 text-center max-w-xl mx-auto shadow-sm space-y-5 text-left flex flex-col items-center">
                      <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 mx-auto">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <div className="space-y-1.5 text-center">
                        <h3 className="text-sm font-extrabold text-slate-800 font-sans">
                          Fila de Trabalho Concluída! 🎉
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                          Atualmente, não há nenhuma escola na etapa de <strong className="text-slate-700">{subTaskLabels[activeSubTask]}</strong> pendente de ação. Deseja iniciar ou testar os campos com um registro demonstrativo?
                        </p>
                      </div>
                      <button
                        onClick={() => handleInjetarDemandaTeste(activeSubTask)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition-all shadow-xs shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Injetar Escola de Demonstração
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
            })()
          ) : solicitacaoAberta ? (
            <SolicitacaoDetalhes
              solicitacao={solicitacaoAberta}
              perfilUsuario={perfilUsuario}
              onVoltar={() => setIdSolicitacaoSelecionada(null)}
              onUpdate={handleUpdateSolicitacao}
              activeSubTask={activeSubTask}
              usuariosSeguranca={usuariosSeguranca}
              somenteLeitura={somenteLeitura}
            />
          ) : (
            <div className="w-full flex-1 flex flex-col">
              
              {/* VISTAS DE ACORDO COM O MÓDULO ATIVO */}
              {activeModule === 'gestao_obras' && (
                <div className="w-full flex flex-col flex-1">


                  {activeSubTask === 'novo_atendimento' ? (
                    <NovoAtendimentoPanel
                      solicitacoes={solicitacoesVisiveis}
                      onSolicitacaoCriada={handleNovaSolicitacao}
                      onUpdateSolicitacao={handleUpdateSolicitacao}
                      usuariosSeguranca={usuariosSeguranca}
                      onEdit={setSolicitacaoEmEdicao}
                      perfilUsuario={perfilUsuario}
                      sreDoTecnico={sreDoTecnico}
                      atendimentoEmEdicaoDirect={atendimentoEmEdicaoDirect}
                      onLimparEdicaoDirect={() => setAtendimentoEmEdicaoDirect(null)}
                      onFinalizarCriacao={() => setActiveSubTask('cadastro')}
                    />
                  ) : activeSubTask === 'aprovacao_regional' ? (
                    <AprovacaoRegionalPanel
                      solicitacoes={solicitacoesVisiveis}
                      onUpdateSolicitacao={handleUpdateSolicitacao}
                      regionaisDoCoordenador={regionaisDoTecnico}
                      nomeCoordenador={nomeCoordenadorLogado}
                      onVisualizarProcesso={handleEditarAtendimento}
                    />
                  ) : activeSubTask === 'analise_atribuicao' ? (() => {
                    const filaAtivaCount = solicitacoesVisiveis.filter(s => s.etapaAtual === 'analise' || s.etapaAtual === 'correcao').length;
                    const historicoAtribuicaoCount = solicitacoesVisiveis.filter(s =>
                      ['paf_autorizacao', 'paf', 'ordem_inicio', 'execucao', 'cancelado'].includes(s.etapaAtual) &&
                      (s.historicoEtapas || []).some(h => h.etapa === 'analise')
                    ).length;
                    const solHistoricoPreview = historicoAtribuicaoSelecionadoId
                      ? solicitacoesVisiveis.find(s => s.id === historicoAtribuicaoSelecionadoId)
                      : null;

                    if (solHistoricoPreview) {
                      return (
                        <div className="bg-white rounded-xl border border-slate-700/20 shadow-sm p-1 ring-2 ring-slate-600/10">
                          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 rounded-t-lg">
                            <button
                              type="button"
                              onClick={() => setHistoricoAtribuicaoSelecionadoId(null)}
                              className="flex items-center gap-1.5 text-xs font-black text-white uppercase tracking-wide cursor-pointer hover:text-slate-200 transition"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Atribuição
                            </button>
                            <span className="ml-auto text-[10px] text-slate-300 font-mono">{solHistoricoPreview.id} · {solHistoricoPreview.nomeEscola}</span>
                          </div>

                          {(solHistoricoPreview.historicoCorrecoes || []).length > 0 && (
                            <div className="m-4 bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3">
                              <h4 className="text-[10px] font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                                <FileClock className="w-4 h-4" /> Histórico de Rodadas
                              </h4>
                              {(solHistoricoPreview.historicoCorrecoes || []).map((round) => {
                                const ordinal = round.contador === 1 ? '1ª' : round.contador === 2 ? '2ª' : round.contador === 3 ? '3ª' : `${round.contador}ª`;
                                return (
                                  <div key={round.contador} className="rounded-lg border border-rose-200/60 bg-white p-3 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-200 text-rose-800">{ordinal} Devolução</span>
                                      <span className="text-[9px] text-slate-400 font-mono">{round.data}</span>
                                    </div>
                                    {round.motivos.map((m, i) => (
                                      <div key={i} className="flex items-start gap-2 text-xs">
                                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-200 text-rose-800">{m.label}</span>
                                        <p className="text-rose-900 font-medium leading-relaxed">{m.motivo}</p>
                                      </div>
                                    ))}
                                    {round.docsRecusados.length > 0 && (
                                      <div className="space-y-1.5 border-t border-rose-200/60 pt-2">
                                        <span className="text-[9px] font-black uppercase text-rose-700 block">Documentos Recusados</span>
                                        {round.docsRecusados.map((d, i) => (
                                          <div key={i} className="flex items-start gap-2 text-xs">
                                            <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-200 text-rose-800">{d.nome}</span>
                                            <p className="text-rose-900 font-medium leading-relaxed">{d.justificativa}</p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <SolicitacaoDetalhes
                            solicitacao={solHistoricoPreview}
                            perfilUsuario={perfilUsuario}
                            onVoltar={() => setHistoricoAtribuicaoSelecionadoId(null)}
                            onUpdate={() => {}}
                            forcedTab="checklist"
                            hideVoltar={true}
                            hideStepper={true}
                            hideTransitionButtons={true}
                            hideTabs={true}
                            activeSubTask="analise"
                            usuariosSeguranca={usuariosSeguranca}
                            somenteLeitura={true}
                          />
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {/* Abas: Fila Ativa / Histórico */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setAbaAtribuicao('ativa')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${abaAtribuicao === 'ativa' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                          >
                            Fila Ativa ({filaAtivaCount})
                          </button>
                          <button
                            type="button"
                            onClick={() => setAbaAtribuicao('historico')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all flex items-center gap-1.5 ${abaAtribuicao === 'historico' ? 'bg-slate-700 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                          >
                            <FileClock className="w-3.5 h-3.5" /> Histórico ({historicoAtribuicaoCount})
                          </button>
                        </div>

                        {abaAtribuicao === 'historico' ? (
                          <AtribuicaoHistoricoPanel
                            solicitacoes={solicitacoesVisiveis}
                            onAbrirPreview={(sol) => setHistoricoAtribuicaoSelecionadoId(sol.id)}
                          />
                        ) : viewMode === 'lista' ? (
                          <AtribuicaoPanel
                            solicitacoes={solicitacoesVisiveis}
                            onUpdateSolicitacao={handleUpdateSolicitacao}
                            usuariosSeguranca={usuariosSeguranca}
                            atribuicoes={atribuicoesEngenharia}
                            onAssign={(solId, usrId) => {
                              setAtribuicoesEngenharia(prev => ({ ...prev, [solId]: usrId }));
                            }}
                            viewMode={viewMode}
                            onMudarViewMode={(mode) => setViewMode(mode)}
                            perfilUsuario={perfilUsuario}
                            somenteLeitura={somenteLeitura}
                            onNavToAnalise={(sol) => {
                              setActiveSubTask('analise');
                              setSelectedSchoolsPorSubtask(prev => ({ ...prev, analise: sol.id }));
                            }}
                            onNavToAnaliseContratual={(sol, tipo, itemId) => {
                              setActiveSubTask('analise_contratual');
                              setSelectedSchoolsPorSubtask(prev => ({ ...prev, analise_contratual: sol.id }));
                              setItemContratualSelecionado({ tipo, itemId });
                            }}
                          />
                        ) : (
                          <KanbanViews
                            solicitacoes={solicitacoesVisiveis}
                            onSelect={handleSelectSolicitacao}
                            perfilUsuario={perfilUsuario}
                            somenteLeitura={somenteLeitura}
                            onUpdate={handleUpdateSolicitacao}
                            onDelete={handleDeleteSolicitacao}
                            onEdit={handleEditarAtendimento}
                            mode={viewMode === 'kanban_analista' ? 'usuario' : 'status'}
                            viewMode={viewMode}
                            onMudarViewMode={(mode) => setViewMode(mode)}
                            onNovaSolicitacao={() => setAbrirModalCadastro(true)}
                            activeSubTask={activeSubTask}
                            usuariosSeguranca={usuariosSeguranca}
                          />
                        )}
                      </div>
                    );
                  })() : activeSubTask === 'analise_contratual' ? (() => {
                    const solicitacaoAtiva = solicitacoesVisiveis.find(s => s.id === selectedSchoolsPorSubtask.analise_contratual) || null;
                    return (
                      <ValidacaoContratual
                        solicitacao={solicitacaoAtiva}
                        itemSelecionado={itemContratualSelecionado}
                        perfilUsuario={perfilUsuario}
                        usuariosSeguranca={usuariosSeguranca}
                        onUpdate={handleUpdateSolicitacao}
                      />
                    );
                  })() : activeSubTask === 'execucao_central' ? (
                    <CentralNavegacaoObras
                      solicitacoes={solicitacoesVisiveis}
                      perfilUsuario={perfilUsuario}
                      setActiveSubTask={setActiveSubTask}
                    />
                  ) : activeSubTask.startsWith('execucao_') ? (
                    <ExecucaoSubmodulos
                      activeSubTask={activeSubTask}
                      solicitacoes={solicitacoesVisiveis}
                      onUpdate={handleUpdateSolicitacao}
                      perfilUsuario={perfilUsuario}
                      somenteLeitura={somenteLeitura}
                      onSelect={(sol) => handleSelectSolicitacao(sol)}
                      empresasSeguranca={empresasSeguranca}
                      usuariosSeguranca={usuariosSeguranca}
                      setActiveSubTask={setActiveSubTask}
                    />
                  ) : activeSubTask === 'visao_geral' ? (
                    <VisaoGeralDashboard
                      solicitacoes={solicitacoesVisiveis}
                      onSelectSchool={(sol) => handleSelectSolicitacao(sol)}
                      onNavigateToSubTask={(subTask) => setActiveSubTask(subTask)}
                      // Base de Lições Aprendidas é deliberadamente irrestrita por regional — o
                      // propósito é o compartilhamento de experiências entre SREs. Ver [[licoes-aprendidas-estruturadas]].
                      todasSolicitacoesLicoes={solicitacoes}
                    />
                  ) : viewMode === 'lista' ? (
                    <Dashboard
                      solicitacoes={solicitacoesVisiveis.filter(s => {
                        if (activeSubTask === 'cadastro') return true;
                        if (activeSubTask === 'analise') return s.etapaAtual === 'analise';
                        if (activeSubTask === 'paf_autorizacao') return s.etapaAtual === 'paf_autorizacao';
                        if (activeSubTask === 'paf') return s.etapaAtual === 'paf';
                        if (activeSubTask === 'execucao_abertura') return s.etapaAtual === 'ordem_inicio' || s.etapaAtual === 'execucao';
                        if (activeSubTask === 'execucao') return (s.etapaAtual === 'execucao' || s.etapaAtual === 'ordem_inicio') && !!s.numeroPAF;
                        if (activeSubTask === 'aditivos') return (s.etapaAtual === 'execucao' || s.etapaAtual === 'ordem_inicio') && !!s.numeroPAF;
                        if (activeSubTask === 'conclusao') return (s.etapaAtual === 'execucao' || s.etapaAtual === 'ordem_inicio') && !!s.numeroPAF;
                        
                        // 9 submodules filters
                        if (['execucao_cadastro', 'execucao_acompanhamento', 'execucao_contratos', 'execucao_fiscalizacao', 'execucao_documentos'].includes(activeSubTask)) {
                          return s.etapaAtual === 'ordem_inicio' || s.etapaAtual === 'execucao';
                        }
                        if (['execucao_medicoes', 'execucao_aditivos', 'execucao_ajustes'].includes(activeSubTask)) {
                          return (s.etapaAtual === 'execucao' || s.etapaAtual === 'ordem_inicio') && !!s.numeroPAF;
                        }
                        return true;
                      })}
                      onSelect={handleSelectSolicitacao}
                      onNovaSolicitacao={() => setAbrirModalCadastro(true)}
                      perfilUsuario={perfilUsuario}
                      somenteLeitura={somenteLeitura}
                      onDelete={handleDeleteSolicitacao}
                      onUpdate={handleUpdateSolicitacao}
                      onEdit={handleEditarAtendimento}
                      viewMode={viewMode}
                      onMudarViewMode={(mode) => setViewMode(mode)}
                      activeSubTask={activeSubTask}
                      usuariosSeguranca={usuariosSeguranca}
                    />
                  ) : (
                    <KanbanViews
                      usuariosSeguranca={usuariosSeguranca}
                      solicitacoes={solicitacoesVisiveis.filter(s => {
                        if (activeSubTask === 'cadastro') return true;
                        if (activeSubTask === 'analise') return s.etapaAtual === 'analise';
                        if (activeSubTask === 'paf_autorizacao') return s.etapaAtual === 'paf_autorizacao';
                        if (activeSubTask === 'paf') return s.etapaAtual === 'paf';
                        if (activeSubTask === 'execucao_abertura') return s.etapaAtual === 'ordem_inicio' || s.etapaAtual === 'execucao';
                        if (activeSubTask === 'execucao') return (s.etapaAtual === 'execucao' || s.etapaAtual === 'ordem_inicio') && !!s.numeroPAF;
                        if (activeSubTask === 'aditivos') return (s.etapaAtual === 'execucao' || s.etapaAtual === 'ordem_inicio') && !!s.numeroPAF;
                        if (activeSubTask === 'conclusao') return (s.etapaAtual === 'execucao' || s.etapaAtual === 'ordem_inicio') && !!s.numeroPAF;
                        
                        // 9 submodules filters
                        if (['execucao_cadastro', 'execucao_acompanhamento', 'execucao_contratos', 'execucao_fiscalizacao', 'execucao_documentos'].includes(activeSubTask)) {
                          return s.etapaAtual === 'ordem_inicio' || s.etapaAtual === 'execucao';
                        }
                        if (['execucao_medicoes', 'execucao_aditivos', 'execucao_ajustes'].includes(activeSubTask)) {
                          return (s.etapaAtual === 'execucao' || s.etapaAtual === 'ordem_inicio') && !!s.numeroPAF;
                        }
                        return true;
                      })}
                      onSelect={handleSelectSolicitacao}
                      perfilUsuario={perfilUsuario}
                      somenteLeitura={somenteLeitura}
                      onUpdate={handleUpdateSolicitacao}
                      onDelete={handleDeleteSolicitacao}
                      onEdit={handleEditarAtendimento}
                      mode="status"
                      viewMode={viewMode}
                      onMudarViewMode={(mode) => setViewMode(mode)}
                      onNovaSolicitacao={() => setAbrirModalCadastro(true)}
                    />
                  )}
                </div>
              )}

              {activeModule === 'seguranca' && (perfilUsuario === 'diretor_dore' || perfilUsuario === 'administrativo_dore' || perfilUsuario === 'admin') && (
                <div className="w-full flex-1 flex flex-col space-y-6 text-left">
                  
                  {/* SUBTASK CADASTRO DE USUÁRIO */}
                  {activeSubTask === 'cadastro_usuario' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-3xs text-left">
                        <div className="flex items-start justify-between">
                          <div>
                            <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                              <UserPlus className="w-5 h-5 text-rose-600 shrink-0" />
                              Usuários do Sistema (Níveis de Acesso)
                            </h2>
                            <p className="text-xs text-slate-500">
                              Gerencie os usuários e seus perfis de atribuição no GESTO.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowCadastroUsuarioModal(true)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all shrink-0"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Novo Usuário
                          </button>
                        </div>
                      </div>

                      {/* FILTROS DA TABELA */}
                      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-3xs space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Search className="w-3.5 h-3.5 text-rose-500" /> Filtros de Pesquisa
                          </span>
                          {(filtroUsrBusca || filtroUsrCargo !== 'todos' || filtroUsrSituacao !== 'todos' || filtroUsrVinculo !== 'todos') && (
                            <button type="button" onClick={() => { setFiltroUsrBusca(''); setFiltroUsrCargo('todos'); setFiltroUsrSituacao('todos'); setFiltroUsrVinculo('todos'); }} className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer">
                              Limpar Filtros
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                          <div className="md:col-span-2">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Buscar por nome ou e-mail</label>
                            <div className="relative">
                              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input type="text" value={filtroUsrBusca} onChange={(e) => setFiltroUsrBusca(e.target.value)} placeholder="Nome, e-mail..." className="w-full text-xs border border-slate-200 rounded-lg pl-7 pr-3 py-1.5 bg-white text-slate-800 focus:ring-1 focus:ring-rose-400 outline-hidden" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cargo</label>
                            <select value={filtroUsrCargo} onChange={(e) => setFiltroUsrCargo(e.target.value)} className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:ring-1 focus:ring-rose-400 outline-hidden cursor-pointer">
                              <option value="todos">Todos os cargos</option>
                              {['Engenheiro Civil','Arquiteto','Técnico em Edificações','Analista','Coordenador','Diretor','Fiscal','Administrador'].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Situação</label>
                            <select value={filtroUsrSituacao} onChange={(e) => setFiltroUsrSituacao(e.target.value)} className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:ring-1 focus:ring-rose-400 outline-hidden cursor-pointer">
                              <option value="todos">Todas</option>
                              {['Ativo','Férias','Licença','Afastado','Desligado'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vínculo</label>
                            <select value={filtroUsrVinculo} onChange={(e) => setFiltroUsrVinculo(e.target.value)} className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:ring-1 focus:ring-rose-400 outline-hidden cursor-pointer">
                              <option value="todos">Todos</option>
                              <option value="regional">Regional (SRE)</option>
                              <option value="orgao_central">Órgão Central</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* TABELA DE USUÁRIOS */}
                      {(() => {
                        const usuariosFiltrados = usuariosSeguranca.filter(u => {
                          const busca = filtroUsrBusca.toLowerCase();
                          if (busca && !u.nome.toLowerCase().includes(busca) && !u.email.toLowerCase().includes(busca)) return false;
                          if (filtroUsrCargo !== 'todos' && (u as any).cargo !== filtroUsrCargo) return false;
                          if (filtroUsrSituacao !== 'todos' && (u as any).situacaoFuncional !== filtroUsrSituacao) return false;
                          if (filtroUsrVinculo !== 'todos' && (u as any).tipoVinculo !== filtroUsrVinculo) return false;
                          return true;
                        });

                        return (
                          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-3xs">
                            <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                Lista de Usuários ({usuariosFiltrados.length} de {usuariosSeguranca.length})
                              </h3>
                              <button
                                type="button"
                                onClick={() => exportarUsuariosCSV(usuariosFiltrados)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-all shadow-xs"
                                title="Exportar lista filtrada para Excel"
                              >
                                <Database className="w-3 h-3" />
                                Exportar Excel
                              </button>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse text-xs">
                                <thead>
                                  <tr className="border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase bg-slate-50 text-left whitespace-nowrap">
                                    <th className="py-2.5 px-3 w-10"></th>
                                    <th className="py-2.5 px-3">Nome / E-mail</th>
                                    <th className="py-2.5 px-3">Cargo</th>
                                    <th className="py-2.5 px-3">Formação</th>
                                    <th className="py-2.5 px-3">CREA / CAU</th>
                                    <th className="py-2.5 px-3">Ingresso</th>
                                    <th className="py-2.5 px-3">Situação</th>
                                    <th className="py-2.5 px-3">Perfil SGO</th>
                                    <th className="py-2.5 px-3">Vínculo / Local</th>
                                    <th className="py-2.5 px-3">Atualizado em</th>
                                    <th className="py-2.5 px-3 text-center">Ações</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {usuariosFiltrados.length === 0 ? (
                                    <tr>
                                      <td colSpan={11} className="py-10 text-center text-slate-400 text-xs font-medium">
                                        Nenhum usuário encontrado com os filtros aplicados.
                                      </td>
                                    </tr>
                                  ) : usuariosFiltrados.map(u => {
                                    const usr = u as any;
                                    const situacaoColor = usr.situacaoFuncional === 'Ativo' ? 'bg-emerald-100 text-emerald-700' :
                                      usr.situacaoFuncional === 'Férias' ? 'bg-blue-100 text-blue-700' :
                                      usr.situacaoFuncional === 'Licença' ? 'bg-amber-100 text-amber-700' :
                                      usr.situacaoFuncional === 'Afastado' ? 'bg-orange-100 text-orange-700' :
                                      usr.situacaoFuncional === 'Desligado' ? 'bg-rose-100 text-rose-700' :
                                      'bg-slate-100 text-slate-600';
                                    const perfilColor = u.perfil === 'tecnico_infra' ? 'bg-amber-100 text-amber-800' :
                                      u.perfil === 'coordenador_regional' ? 'bg-orange-100 text-orange-800' :
                                      u.perfil === 'analista_dore' ? 'bg-blue-100 text-blue-800' :
                                      u.perfil === 'gestor_paf' ? 'bg-cyan-100 text-cyan-800' :
                                      u.perfil === 'administrativo_dore' ? 'bg-purple-100 text-purple-800' :
                                      u.perfil === 'diretor_dore' ? 'bg-rose-100 text-rose-800' :
                                      'bg-slate-100 text-slate-700';
                                    const creaSituacaoColor = usr.creaSituacao === 'Ativo' ? 'text-emerald-600' : usr.creaSituacao === 'Inativo' ? 'text-rose-600' : 'text-slate-400';

                                    return (
                                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors text-left">
                                        <td className="py-2.5 px-3">
                                          <div className="w-7 h-7 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-[9px] font-black text-rose-700">
                                            {u.nome.split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase()}
                                          </div>
                                        </td>
                                        <td className="py-2.5 px-3">
                                          <p className="font-bold text-slate-800 text-[11px]">{u.nome}</p>
                                          <p className="text-[10px] text-slate-400 font-mono">{u.email}</p>
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-700 font-medium whitespace-nowrap">
                                          {usr.cargo || <span className="text-slate-400 italic">—</span>}
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                                          {usr.formacao || <span className="text-slate-400 italic">—</span>}
                                        </td>
                                        <td className="py-2.5 px-3 whitespace-nowrap">
                                          {usr.creaNum ? (
                                            <div>
                                              <p className="font-mono text-[10px] text-slate-700 font-semibold">{usr.creaNum}</p>
                                              <p className={`text-[9px] font-bold ${creaSituacaoColor}`}>{usr.creaSituacao}</p>
                                            </div>
                                          ) : <span className="text-slate-400 italic text-[10px]">—</span>}
                                        </td>
                                        <td className="py-2.5 px-3 font-mono text-[10px] text-slate-600 whitespace-nowrap">
                                          {usr.dataIngresso || <span className="text-slate-400 italic">—</span>}
                                        </td>
                                        <td className="py-2.5 px-3 whitespace-nowrap">
                                          <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${situacaoColor}`}>
                                            {usr.situacaoFuncional || '—'}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3 whitespace-nowrap">
                                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${perfilColor}`}>
                                            {u.perfil === 'tecnico_infra' ? 'TÉC. INFRA' :
                                             u.perfil === 'coordenador_regional' ? 'COORD. REGIONAL' :
                                             u.perfil === 'analista_dore' ? 'ANALISTA' :
                                             u.perfil === 'gestor_paf' ? 'SUBSEC. ADM' :
                                             u.perfil === 'administrativo_dore' ? 'ADMIN DORE' :
                                             u.perfil === 'diretor_dore' ? 'DIRETOR DORE' :
                                             u.perfil.toUpperCase()}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3 whitespace-nowrap">
                                          <p className="text-[10px] font-semibold text-slate-700">
                                            {usr.tipoVinculo === 'regional' ? '🏫 Regional' : usr.tipoVinculo === 'orgao_central' ? '🏛️ Central' : '—'}
                                          </p>
                                          {u.tipoVinculo === 'regional' && u.regionais && u.regionais.length > 1 ? (
                                            <div className="flex flex-wrap gap-0.5 mt-0.5">
                                              {u.regionais.map(r => (
                                                <span key={r} className="text-[8.5px] bg-rose-50 text-rose-700 border border-rose-100 px-1 py-0.5 rounded font-semibold">{r.replace('SRE ', '')}</span>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="text-[9.5px] text-slate-500">{u.departamento}</p>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                                          {usr.dataUltimaAtualizacao || <span className="text-slate-400 italic">—</span>}
                                        </td>
                                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                          <div className="flex items-center justify-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() => abrirEdicaoUsuario(u)}
                                              className="px-2 py-1 text-[9.5px] font-extrabold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-lg cursor-pointer transition"
                                              title="Editar usuário"
                                            >
                                              Editar
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setResetSenhaUsrId(u.id)}
                                              className="px-2 py-1 text-[9.5px] font-extrabold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-100 rounded-lg cursor-pointer transition"
                                              title="Resetar senha do usuário"
                                            >
                                              Resetar Senha
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setUsuariosSeguranca(usuariosSeguranca.filter(usr2 => usr2.id !== u.id))}
                                              className="text-[13px] leading-none hover:scale-110 active:scale-95 transition-all text-slate-400 hover:text-red-600 cursor-pointer p-1"
                                              title="Remover usuário"
                                            >
                                              🗑️
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}


                  {/* SUBTASK CADASTRO DE EMPRESAS */}
                  {activeSubTask === 'cadastro_empresas' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-3xs text-left">
                        <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                          <Building className="w-5 h-5 text-rose-600 text-rose-600 shrink-0" />
                          Cadastro de Empresas Contratadas Pré-Homologadas (Segurança)
                        </h2>
                        <p className="text-xs text-slate-500 mb-6">
                          Cadastre previamente as construtoras, engenharias e empresas licitantes autorizadas. Estas empresas estarão disponíveis para vinculação imediata nos contratos vigentes de reformas escolares no fluxo SGO.
                        </p>

                        <form onSubmit={handleCadastrarEmpresa} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              Razão Social / Nome Fantasia *
                            </label>
                            <input
                              type="text"
                              required
                              value={empNome}
                              onChange={(e) => setEmpNome(e.target.value)}
                              placeholder="ex: Construtora Mantiqueira Ltda"
                              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              CNPJ da Empresa *
                            </label>
                            <input
                              type="text"
                              required
                              value={empCnpj}
                              onChange={(e) => setEmpCnpj(e.target.value)}
                              placeholder="ex: 00.000.000/0001-00"
                              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              Responsável Técnico (Engenheiro/Arquiteto)
                            </label>
                            <input
                              type="text"
                              value={empResp}
                              onChange={(e) => setEmpResp(e.target.value)}
                              placeholder="ex: Eng. Alberto Albuquerque"
                              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              Situação Cadastral *
                            </label>
                            <select
                              value={empSit}
                              onChange={(e) => setEmpSit(e.target.value)}
                              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden cursor-pointer"
                            >
                              <option value="Regular">Regular (Homologada)</option>
                              <option value="Pendente">Pendente (Falta Análise Fiscal)</option>
                              <option value="Bloqueado">Bloqueado (Inadimplência ou Sanção)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              Telefone de Contato
                            </label>
                            <input
                              type="text"
                              value={empTel}
                              onChange={(e) => setEmpTel(e.target.value)}
                              placeholder="ex: (31) 3244-9088"
                              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              E-mail Corporativo
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="email"
                                value={empMail}
                                onChange={(e) => setEmpMail(e.target.value)}
                                placeholder="ex: contato@empresa.com.br"
                                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden"
                              />
                              <button
                                type="submit"
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center whitespace-nowrap"
                              >
                                Cadastrar
                              </button>
                            </div>
                          </div>
                        </form>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-3xs">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center text-left">
                          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Empresas Cadastradas ({empresasSeguranca.length})
                          </h3>
                        </div>

                        <div className="overflow-x-auto text-left">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase bg-slate-50">
                                <th className="py-2.5 px-4 w-12 text-center text-slate-400">ID</th>
                                <th className="py-2.5 px-4 text-slate-400">Empresa / Razão Social</th>
                                <th className="py-2.5 px-4 text-slate-400">CNPJ</th>
                                <th className="py-2.5 px-4 text-slate-400">Responsável Técnico</th>
                                <th className="py-2.5 px-4 text-slate-400">Contato</th>
                                <th className="py-2.5 px-4 text-center text-slate-400">Situação</th>
                                <th className="py-2.5 px-4 text-center text-slate-400">Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {empresasSeguranca.map(emp => (
                                <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50/20 text-xs">
                                  <td className="py-3 px-4 font-mono font-bold text-slate-500 text-center">{emp.id}</td>
                                  <td className="py-3 px-4 font-bold text-slate-800">🏢 {emp.nome}</td>
                                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px] font-bold">{emp.cnpj}</td>
                                  <td className="py-3 px-4 font-medium text-slate-700">{emp.responsavelTecnico}</td>
                                  <td className="py-3 px-4">
                                    <div className="text-slate-500 text-[11px]">{emp.telefone}</div>
                                    <div className="text-slate-400 text-[10px] font-mono">{emp.email}</div>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10.5px] font-extrabold ${
                                      emp.situacaoCadastral === 'Regular' ? 'bg-emerald-100 text-emerald-800' :
                                      emp.situacaoCadastral === 'Pendente' ? 'bg-amber-100 text-amber-800' :
                                      'bg-rose-100 text-rose-800'
                                    }`}>
                                      {emp.situacaoCadastral}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => abrirEdicaoEmpresa(emp)}
                                        className="px-2 py-1 text-[9.5px] font-extrabold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-lg cursor-pointer transition"
                                        title="Editar empresa"
                                      >
                                        Editar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEmpresasSeguranca(empresasSeguranca.filter(e => e.id !== emp.id))}
                                        className="text-[13px] leading-none hover:scale-110 active:scale-95 transition-all text-slate-400 hover:text-red-600 cursor-pointer p-1"
                                        title="Remover empresa"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {activeModule === 'orcamento' && perfilUsuario !== 'administrativo_dore' && perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'coordenador_regional' && perfilUsuario !== 'analista_dore' && perfilUsuario !== 'gestor_paf' && (
                <OrcamentoModule
                  activeSubTask={activeSubTask}
                  setActiveSubTask={setActiveSubTask}
                  sreDoTecnico={sreDoTecnico}
                  perfilUsuario={perfilUsuario}
                />
              )}

              {activeModule === 'imoveis' && perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'coordenador_regional' && perfilUsuario !== 'administrativo_dore' && perfilUsuario !== 'analista_dore' && perfilUsuario !== 'gestor_paf' && (
                <div className="w-full p-6">
                  <PatrimonioModule
                    activeSubTask={activeSubTask}
                    perfilUsuario={perfilUsuario}
                    somenteLeitura={false}
                    regionaisDoTecnico={regionaisDoTecnico}
                  />
                </div>
              )}

              {activeModule === 'abertura_chamados' && perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'coordenador_regional' && perfilUsuario !== 'administrativo_dore' && perfilUsuario !== 'analista_dore' && perfilUsuario !== 'gestor_paf' && (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center select-none animate-in fade-in duration-200">
                  <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center border border-purple-100 mb-4 animate-bounce">
                    <Wrench className="w-8 h-8 text-purple-600" />
                  </div>
                  <h2 className="text-base font-bold text-slate-800 font-sans">
                    Módulo de Abertura de Chamados (Em Construção)
                  </h2>
                  <p className="text-xs text-slate-500 max-w-lg mt-1.5 font-sans leading-relaxed text-center">
                    Canal unificado para abertura de incidentes, solicitações de manutenção corretiva e vistorias de urgência nas escolas.
                    Permitirá aos gestores das SREs registrar demandas sobre sinistros ou falhas estruturais críticas diretamente à equipe da central.
                  </p>

                  <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full text-left">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-3xs hover:border-purple-200 transition-all">
                      <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 font-bold mb-3 text-xs">
                        🆕
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 mb-1 font-sans">Abertura Rápida</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                        Envio de relatórios fotográficos preliminares e descrição textual do sinistro diretamente no portal de infraestrutura.
                      </p>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-3xs hover:border-purple-200 transition-all">
                      <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-600 font-bold mb-3 text-xs">
                        🧭
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 mb-1 font-sans">Roteamento Inteligente</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                        Distribuição automática ao analista ou engenheiro da SRE responsável de acordo com a jurisdição do imóvel.
                      </p>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-3xs hover:border-purple-200 transition-all">
                      <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 font-bold mb-3 text-xs">
                        ⏳
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 mb-1 font-sans">Controle de SLA</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                        Linha do tempo interativa mostrando prazos de atendimento com alertas em cores baseadas na criticidade da falha.
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 flex gap-2">
                    <span className="px-2.5 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 font-mono">
                      v1.5.0-planned
                    </span>
                    <span className="px-2.5 py-1 bg-purple-100 rounded-full text-[10px] font-bold text-purple-700 font-sans">
                      Suporte & Atendimento DORE
                    </span>
                  </div>
                </div>
              )}

              {activeModule === 'central_logs' && (
                (perfilUsuario === 'gestor_paf' || (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore')) ? (
                  <CentralNotificacoesLogs
                    logs={logs}
                    perfilUsuario={perfilUsuario}
                    onAddSimulatedLog={(action, detail, tipo) => registrarLog(action, detail, tipo)}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-center select-none animate-in fade-in duration-200 space-y-4">
                    <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center border border-rose-100 mb-2">
                      <FileClock className="w-7 h-7 text-rose-400" />
                    </div>
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Acesso Restrito</h3>
                    <p className="text-xs text-slate-400 max-w-xs">
                      O módulo de Log do Sistema é de acesso exclusivo para perfis de Gestor. Solicite ao responsável caso precise visualizar os registros.
                    </p>
                  </div>
                )
              )}

            </div>
          )}

        </main>
      </div>

      {/* RODAPÉ DO PROCESSO */}
      <footer className="bg-[#13264d] border-none py-6 text-xs text-white text-center font-sans font-medium">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p>© 2026 GESTO — Diretoria de Obras da Rede Estadual de Ensino (DORE/MG)</p>
          <p className="text-[10px] text-slate-100/80">Sistema seguro de simulação com persistência local ativa (LocalStorage).</p>
        </div>
      </footer>

      {/* MODAL EDITAR EMPRESA */}
      {showEditarEmpresaModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Building className="w-4 h-4 text-rose-600" />
                Editar Empresa Cadastrada
              </h3>
              <button
                type="button"
                onClick={() => { setShowEditarEmpresaModal(false); setEmpIdEmEdicao(null); setEmpNome(''); setEmpCnpj(''); setEmpResp(''); setEmpSit('Regular'); setEmpTel(''); setEmpMail(''); }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSalvarEdicaoEmpresa} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Razão Social / Nome Fantasia *
                  </label>
                  <input
                    type="text"
                    required
                    value={empNome}
                    onChange={e => setEmpNome(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    CNPJ *
                  </label>
                  <input
                    type="text"
                    required
                    value={empCnpj}
                    onChange={e => setEmpCnpj(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Situação Cadastral *
                  </label>
                  <select
                    value={empSit}
                    onChange={e => setEmpSit(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden cursor-pointer"
                  >
                    <option value="Regular">Regular (Homologada)</option>
                    <option value="Pendente">Pendente (Falta Análise Fiscal)</option>
                    <option value="Bloqueado">Bloqueado (Inadimplência ou Sanção)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Responsável Técnico
                  </label>
                  <input
                    type="text"
                    value={empResp}
                    onChange={e => setEmpResp(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Telefone de Contato
                  </label>
                  <input
                    type="text"
                    value={empTel}
                    onChange={e => setEmpTel(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    E-mail Corporativo
                  </label>
                  <input
                    type="email"
                    value={empMail}
                    onChange={e => setEmpMail(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowEditarEmpresaModal(false); setEmpIdEmEdicao(null); setEmpNome(''); setEmpCnpj(''); setEmpResp(''); setEmpSit('Regular'); setEmpTel(''); setEmpMail(''); }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RESETAR SENHA */}
      {resetSenhaUsrId && (() => {
        const usr = usuariosSeguranca.find(u => u.id === resetSenhaUsrId);
        if (!usr) return null;
        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-500" />
                  Resetar Senha de Acesso
                </h3>
              </div>
              <div className="px-6 py-5 space-y-4">
                <p className="text-xs text-slate-600">
                  Confirme o reset de senha para o usuário:
                </p>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700 shrink-0">
                    {usr.nome.split(' ').slice(0, 2).map((n: string) => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{usr.nome}</p>
                    <p className="text-[10px] text-slate-500">{usr.email}</p>
                  </div>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Senha temporária gerada</p>
                  <p className="font-mono text-sm font-bold text-amber-900 tracking-widest">sgo@2026</p>
                  <p className="text-[10px] text-amber-600 mt-1">O usuário deverá alterar no próximo acesso.</p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetSenhaUsrId(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    registrarLog(
                      'Reset de Senha',
                      `Senha do usuário "${usr.nome}" (${usr.email}) foi redefinida para a senha temporária padrão por ${nomeUsuario}.`,
                      'alerta'
                    );
                    setResetSenhaUsrId(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition cursor-pointer"
                >
                  Confirmar Reset
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL CADASTRO DE USUÁRIO */}
      {showCadastroUsuarioModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60 sticky top-0">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-rose-600" />
                  {usrIdEmEdicao ? 'Editar Cadastro de Usuário' : 'Cadastro de Novo Usuário'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {usrIdEmEdicao ? 'Atualize os dados profissionais e o perfil de atribuição.' : 'Preencha os dados profissionais e o perfil de atribuição.'}
                </p>
              </div>
              <button type="button" onClick={resetFormUsuario} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCadastrarUsuario} className="p-6 space-y-5">

              {/* Seção 1: Identificação */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1.5">Dados de Identificação</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nome Completo *</label>
                    <input type="text" required value={usrNome} onChange={(e) => setUsrNome(e.target.value)} placeholder="Ex: Eng. Roberto Carlos" className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 outline-hidden" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">E-mail Institucional *</label>
                    <input type="email" required value={usrEmail} onChange={(e) => setUsrEmail(e.target.value)} placeholder="Ex: roberto@sre.mg.gov.br" className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 outline-hidden" />
                  </div>
                </div>
              </div>

              {/* Seção 2: Dados Profissionais */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1.5">Dados Profissionais</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cargo *</label>
                    <select value={usrCargo} onChange={(e) => setUsrCargo(e.target.value)} className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 outline-hidden cursor-pointer">
                      <option>Engenheiro Civil</option>
                      <option>Arquiteto</option>
                      <option>Técnico em Edificações</option>
                      <option>Analista</option>
                      <option>Coordenador</option>
                      <option>Diretor</option>
                      <option>Fiscal</option>
                      <option>Administrador</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Formação</label>
                    <select value={usrFormacao} onChange={(e) => setUsrFormacao(e.target.value)} className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 outline-hidden cursor-pointer">
                      <option>Engenharia Civil</option>
                      <option>Arquitetura</option>
                      <option>Técnico em Edificações</option>
                      <option>Administração</option>
                      <option>Outro</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Nº Registro CREA/CAU {FORMACOES_EXIGEM_REGISTRO.includes(usrFormacao) && '*'}
                    </label>
                    <input
                      type="text"
                      required={FORMACOES_EXIGEM_REGISTRO.includes(usrFormacao)}
                      value={usrCreaNum}
                      onChange={(e) => setUsrCreaNum(e.target.value)}
                      placeholder="Ex: CREA 142.532/D"
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Situação do Registro {FORMACOES_EXIGEM_REGISTRO.includes(usrFormacao) && '*'}
                    </label>
                    <select value={usrCreaSituacao} onChange={(e) => setUsrCreaSituacao(e.target.value as 'Ativo' | 'Inativo')} className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 outline-hidden cursor-pointer">
                      <option>Ativo</option>
                      <option>Inativo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Data de Ingresso *</label>
                    <input type="date" required value={usrDataIngresso} onChange={(e) => setUsrDataIngresso(e.target.value)} className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 outline-hidden font-mono" />
                  </div>
                </div>
                {FORMACOES_EXIGEM_REGISTRO.includes(usrFormacao) && (
                  <p className="text-[9px] text-rose-500 -mt-1">Registro profissional obrigatório para esta formação.</p>
                )}

                <div className="max-w-xs">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Situação do Colaborador *</label>
                  <select value={usrSituacaoFuncional} onChange={(e) => setUsrSituacaoFuncional(e.target.value as typeof usrSituacaoFuncional)} className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 outline-hidden cursor-pointer">
                    <option>Ativo</option>
                    <option>Férias</option>
                    <option>Licença</option>
                    <option>Afastado</option>
                    <option>Desligado</option>
                  </select>
                </div>
              </div>

              {/* Seção 3: Perfil de Atribuição */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1.5">Perfil de Atribuição (Role) *</h4>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Perfil do Usuário *</label>
                  <select
                    required
                    value={usrPerfil}
                    onChange={(e) => setUsrPerfil(e.target.value as PerfilUsuario)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 outline-hidden cursor-pointer"
                  >
                    {PERFIS_SELECIONAVEIS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>

                {PERFIS_SELECIONAVEIS.find(p => p.value === usrPerfil)?.regional && (
                  <div className="animate-in slide-in-from-top-1 duration-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Superintendências Regionais *
                        <span className="ml-1.5 text-[9px] font-normal text-slate-400 normal-case">Selecione uma ou mais</span>
                      </label>
                      {usrRegionais.length > 0 && (
                        <span className="text-[10px] text-rose-600 font-bold">{usrRegionais.length} selecionada{usrRegionais.length > 1 ? 's' : ''}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50/50">
                      {['SRE Metropolitana A','SRE Metropolitana B','SRE Metropolitana C','SRE Patos de Minas','SRE Diamantina','SRE Itajubá','SRE Pouso Alegre','SRE Juiz de Fora','SRE Ouro Preto','SRE Montes Claros','SRE Uberaba','SRE Uberlândia','SRE Governador Valadares','SRE Teófilo Otoni','SRE Ipatinga','SRE Coronel Fabriciano','SRE Passos','SRE São João del-Rei','SRE Barbacena'].map(sre => {
                        const checked = usrRegionais.includes(sre);
                        return (
                          <label key={sre} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-[11px] transition-all border ${checked ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>
                            <input type="checkbox" checked={checked}
                              onChange={e => setUsrRegionais(prev => e.target.checked ? [...prev, sre] : prev.filter(r => r !== sre))}
                              className="accent-rose-600 shrink-0" />
                            {sre}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {usrPerfil === 'analista_dore' && (
                  <div className="animate-in slide-in-from-top-1 duration-200 space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Equipe de Especialidade *
                      <span className="ml-1.5 text-[9px] font-normal text-slate-400 normal-case">
                        Define quais processos esse analista pode receber como titular
                      </span>
                    </label>
                    <select
                      required
                      value={usrEquipe}
                      onChange={(e) => setUsrEquipe(e.target.value as EquipeAnalista)}
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 outline-hidden cursor-pointer"
                    >
                      <option value="">-- Selecione a Equipe --</option>
                      <option value="Planejamento">Planejamento (Atendimento Inicial)</option>
                      <option value="Ajuste">Ajuste (Ajuste de Planilha / Reequilíbrio / Saldo Complementar)</option>
                      <option value="Eletrica">Elétrica</option>
                      <option value="Arquitetura">Arquitetura</option>
                      <option value="PSCIP">PSCIP</option>
                    </select>
                    {(usrEquipe === 'Eletrica' || usrEquipe === 'Arquitetura' || usrEquipe === 'PSCIP') && (
                      <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-1">
                        ⚠️ Essa equipe não recebe processos como titular — só pode ser adicionada como auxiliar de validação em processos de Planejamento ou Ajuste.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={resetFormUsuario} className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl cursor-pointer transition">Cancelar</button>
                <button type="submit" className="px-5 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer transition shadow-xs flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" /> {usrIdEmEdicao ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CO-CRIADOR DE SOLICITAÇÃO */}
      {abrirModalCadastro && (
        <NovaSolicitacaoModal
          onClose={() => setAbrirModalCadastro(false)}
          onSave={handleNovaSolicitacao}
          perfilUsuario={perfilUsuario}
          usuariosSeguranca={usuariosSeguranca}
          sreDoTecnico={sreDoTecnico}
        />
      )}

      {/* MODAL DE EDIÇÃO DE ATENDIMENTO */}
      {solicitacaoEmEdicao && (
        <EditarSolicitacaoModal
          solicitacao={solicitacaoEmEdicao}
          onClose={() => setSolicitacaoEmEdicao(null)}
          onSave={(updated) => {
            handleUpdateSolicitacao(updated);
            setSolicitacaoEmEdicao(null);
          }}
        />
      )}

    </div>
  );
}
