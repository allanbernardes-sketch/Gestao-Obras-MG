/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Solicitacao, PerfilUsuario, EmpresaSeguranca, Notificacao, SistemaLog, computeStatusObra } from './types';
import { recalcularPrioridade } from './utils/prioridade';
import { recalcularIEE } from './utils/iee';
import { SOLICITACOES_INICIAIS, NOTIFICACOES_INICIAIS, LOGS_INICIAIS } from './initialData';
import Dashboard from './components/Dashboard';
import VisaoGeralDashboard from './components/VisaoGeralDashboard';
import SolicitacaoDetalhes from './components/SolicitacaoDetalhes';
import NovaSolicitacaoModal from './components/NovaSolicitacaoModal';
import EditarSolicitacaoModal from './components/EditarSolicitacaoModal';
import { HardHat, Layers, ShieldCheck, Building2, HelpCircle, ChevronDown, LayoutGrid, Users, Lock, Coins, UserPlus, FileText, ClipboardList, BookOpen, Key, Landmark, CheckCircle, Calculator, Building, UploadCloud, Plus, Search, X, Wrench, Ticket, Bell, FileClock, Navigation, Package, BarChart2, Database, FolderOpen, RefreshCw, Filter, LogOut, ArrowLeft } from 'lucide-react';
import LoginScreen from './components/LoginScreen';
import KanbanViews from './components/KanbanViews';
import { NovoAtendimentoPanel, AtribuicaoPanel, AtribuicaoHistoricoPanel, RelatoriosPanel } from './components/GestaoObrasViews';
import ExecucaoSubmodulos from './components/ExecucaoSubmodulos';
import AcompanhamentoPaf from './components/AcompanhamentoPaf';
import CentralNotificacoesLogs from './components/CentralNotificacoesLogs';
import CentralNavegacaoObras from './components/CentralNavegacaoObras';
import OrcamentoModule from './components/orcamento/OrcamentoModule';
import PatrimonioModule from './components/patrimonio/PatrimonioModule';
import { supabase } from './lib/supabase';

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

export default function App() {
  const [logado, setLogado] = useState(false);
  const [nomeUsuario, setNomeUsuario] = useState('');
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
              perfilUsuario === 'gestor_dore' ? 'Gestor Atendimento DORE' :
              perfilUsuario === 'analista_dore' ? 'Analista de Engenharia DORE' :
              perfilUsuario === 'gestor_paf' ? 'Subsecretário de Administração' :
              perfilUsuario === 'administrativo_dore' ? 'Administrativo DORE' : 'Operador',
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

  const criarNotificacao = (titulo: string, mensagem: string, tipo: 'processo_avanco' | 'processo_retrocesso' | 'aditivo_pendente' | 'ajuste_pendente' | 'sistema' | 'alerta', solicitacaoId?: string, escola?: string) => {
    const novaNotif: Notificacao = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      titulo,
      mensagem,
      dataHora: new Date().toISOString(),
      lida: false,
      tipo,
      solicitacaoId,
      escola
    };
    const novasNotifs = [novaNotif, ...notifications];
    setNotifications(novasNotifs);
    localStorage.setItem('sgo_notifications', JSON.stringify(novasNotifs));
  };

  // NEW DUAL NAV ARCHITECTURE STATES
  const [activeModule, setActiveModule] = useState<'seguranca' | 'orcamento' | 'gestao_obras' | 'imoveis' | 'abertura_chamados' | 'central_logs'>('gestao_obras');
  const [activeSubTask, setActiveSubTask] = useState<string>('visao_geral');
  const [selectedSchoolsPorSubtask, setSelectedSchoolsPorSubtask] = useState<{ [subtask: string]: string }>({});
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


  // REJECTION STATE FOR "3. AUTORIZAÇÃO DO PAF"
  const [rejectingSchoolId, setRejectingSchoolId] = useState<string | null>(null);
  const [rejectionJustification, setRejectionJustification] = useState('');
  const [confirmingSolId, setConfirmingSolId] = useState<string | null>(null);

  // REGISTROS DE SEGURANÇA (INTERACTIVE STATE MODEL)
  const [usuariosSeguranca, setUsuariosSeguranca] = useState([
    { id: 'USR-01', nome: 'João Paulo Penfield', email: 'joao.paulo@sre.mg.gov.br', perfil: 'tecnico_infra', departamento: 'SRE Patos de Minas' },
    { id: 'USR-02', nome: 'Aline Davino', email: 'aline.davino@educacao.mg.gov.br', perfil: 'gestor_dore', departamento: 'DORE Atendimento' },
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
    relatorios: false,
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
  const [usrTipoVinculo, setUsrTipoVinculo] = useState<'regional' | 'orgao_central'>('regional');
  const [usrEquipeCentral, setUsrEquipeCentral] = useState('Planejamento');
  const [usrRegionais, setUsrRegionais] = useState<string[]>(['SRE Metropolitana A']);

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
    setUsrTipoVinculo('regional');
    setUsrEquipeCentral('Planejamento');
    setUsrRegionais(['SRE Metropolitana A']);
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
    setUsrTipoVinculo(u.tipoVinculo || 'regional');
    setUsrEquipeCentral(u.equipeCentral || 'Planejamento');
    setUsrRegionais(u.tipoVinculo === 'regional'
      ? (u.regionais?.length ? u.regionais : (u.departamento ? [u.departamento] : ['SRE Metropolitana A']))
      : ['SRE Metropolitana A']);
    setShowCadastroUsuarioModal(true);
  };

  const exportarUsuariosCSV = (usuarios: any[]) => {
    const perfilLabel = (perfil: string) => {
      switch (perfil) {
        case 'tecnico_infra': return 'Técnico de Infraestrutura (SRE)';
        case 'gestor_dore': return 'Gestor Atendimento (DORE)';
        case 'analista_dore': return 'Analista de Engenharia (DORE)';
        case 'gestor_paf': return 'Subsecretário de Administração';
        case 'administrativo_dore': return 'Administrativo DORE';
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

  const handleCadastrarUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usrNome || !usrEmail) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const perfil: PerfilUsuario = usrTipoVinculo === 'regional'
      ? 'tecnico_infra'
      : usrEquipeCentral === 'Planejamento' ? 'analista_dore'
      : usrEquipeCentral === 'Administrativo' ? 'administrativo_dore'
      : 'gestor_dore';

    const departamento = usrTipoVinculo === 'regional'
      ? (usrRegionais[0] || '')
      : `DORE - ${usrEquipeCentral}`;

    const dadosAtualizados = {
      nome: usrNome,
      email: usrEmail,
      perfil,
      departamento,
      regionais: usrTipoVinculo === 'regional' ? usrRegionais : undefined,
      cargo: usrCargo,
      formacao: usrFormacao,
      creaNum: usrCreaNum || undefined,
      creaSituacao: usrCreaSituacao,
      dataIngresso: usrDataIngresso || undefined,
      situacaoFuncional: usrSituacaoFuncional,
      dataUltimaAtualizacao: new Date().toISOString().split('T')[0],
      tipoVinculo: usrTipoVinculo,
      equipeCentral: usrTipoVinculo === 'orgao_central' ? usrEquipeCentral : undefined
    };

    if (usrIdEmEdicao) {
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
        { id: 'doc_5', nome: 'Imposto ISS', obrigatorio: false, desc: 'Guia ou comprovante de recolhimento tributário aplicável.', status: 'pendente' }
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
    setEmpResp(emp.responsavelTecnico);
    setEmpSit(emp.situacaoCadastral);
    setEmpTel(emp.telefone);
    setEmpMail(emp.email);
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

  // Controle de acesso regional: tecnico_infra só vê dados das suas SREs
  const regionaisDoTecnico: string[] = perfilUsuario === 'tecnico_infra'
    ? (() => {
        const u = usuariosSeguranca.find(u => u.perfil === 'tecnico_infra');
        if (!u) return [];
        return u.regionais?.length ? u.regionais : (u.departamento ? [u.departamento] : []);
      })()
    : [];

  const sreDoTecnico = regionaisDoTecnico[0] || '';

  // Nome do técnico logado (para permitir acesso a obras onde é fiscal, mesmo fora da sua SRE)
  const nomeTecnicoLogado = perfilUsuario === 'tecnico_infra'
    ? (usuariosSeguranca.find(u => u.perfil === 'tecnico_infra')?.nome || '')
    : '';

  const solicitacoesVisiveis = regionaisDoTecnico.length
    ? solicitacoes.filter(s =>
        regionaisDoTecnico.some(sre => s.sre?.toLowerCase() === sre.toLowerCase()) ||
        (nomeTecnicoLogado && s.fiscalObraAtribuido === nomeTecnicoLogado)
      )
    : solicitacoes;

  // Initialize from Supabase, falling back to LocalStorage or the rich pre-defined mock set
  useEffect(() => {
    async function carregarSolicitacoes() {
      try {
        const { data, error } = await supabase
          .from('solicitacoes')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          // Arrays aninhados (documentos, medições, aditivos, ajustes, histórico) ainda
          // não são persistidos no Supabase nesta etapa — iniciam vazios por enquanto.
          const doSupabase: Solicitacao[] = data.map((row: any) => ({
            id: row.codigo_sgo,
            nomeEscola: row.nome_escola,
            codesc: row.codesc,
            tipo: row.tipo ?? '',
            municipio: row.municipio ?? '',
            sre: row.sre ?? '',
            dataCriacao: row.created_at ? String(row.created_at).split('T')[0] : '',
            etapaAtual: row.etapa_atual,
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
            emendaImpositiva: row.emenda_impositiva ?? undefined,
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
            statusObra: statusObraDoBanco(row.status_obra),
            statusSecoes: {
              identificacao_escolar: { status: row.status_identificacao_escolar, motivo: row.motivo_identificacao_escolar ?? undefined },
              classificacao_patrimonial: { status: row.status_classificacao_patrimonial, motivo: row.motivo_classificacao_patrimonial ?? undefined },
              detalhamento_tecnico: { status: row.status_detalhamento_tecnico, motivo: row.motivo_detalhamento_tecnico ?? undefined },
              referencia_dotacao: { status: row.status_referencia_dotacao, motivo: row.motivo_referencia_dotacao ?? undefined },
            },
          }));
          setSolicitacoes(doSupabase);
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

        // Dynamic clean migration of checklists to use current structural constraints
        // preserving user-uploaded filenames, sizes, and statuses
        const migrado = parsed.map(s => {
          const doc1    = s.documentos?.find(d => d.id === 'doc_1');
          const doc2    = s.documentos?.find(d => d.id === 'doc_2');
          const doc3pdf = s.documentos?.find(d => d.id === 'doc_3_pdf' || d.id === 'doc_3');
          const doc3dwg = s.documentos?.find(d => d.id === 'doc_3_dwg');
          const doc4    = s.documentos?.find(d => d.id === 'doc_4' || d.id === 'doc_7');
          const docAta  = s.documentos?.find(d => d.id === 'doc_ata');
          const docFoto = s.documentos?.find(d => d.id === 'doc_foto');
          const doc5    = s.documentos?.find(d => d.id === 'doc_5' || d.id === 'doc_6');

          return {
            ...s,
            documentos: [
              {
                id: 'doc_1',
                nome: 'Planilha Orçamentária',
                obrigatorio: true,
                desc: 'Anexar nos formatos .pdf e .xlsx.',
                fileName: doc1?.fileName,
                fileSize: doc1?.fileSize,
                uploadedAt: doc1?.uploadedAt,
                status: doc1?.status || 'pendente',
                justificativa: doc1?.justificativa
              },
              {
                id: 'doc_2',
                nome: 'Registro do imóvel',
                obrigatorio: true,
                desc: 'Título de propriedade ou certidão de registro correspondente.',
                fileName: doc2?.fileName,
                fileSize: doc2?.fileSize,
                uploadedAt: doc2?.uploadedAt,
                status: doc2?.status || 'pendente',
                justificativa: doc2?.justificativa
              },
              {
                id: 'doc_3_pdf',
                nome: 'Projeto de Engenharia (PDF)',
                obrigatorio: true,
                desc: 'Projeto técnico estrutural e arquitetônico no formato .pdf.',
                fileName: doc3pdf?.fileName,
                fileSize: doc3pdf?.fileSize,
                uploadedAt: doc3pdf?.uploadedAt,
                status: doc3pdf?.status || 'pendente',
                justificativa: doc3pdf?.justificativa
              },
              {
                id: 'doc_3_dwg',
                nome: 'Projeto de Engenharia (DWG)',
                obrigatorio: true,
                desc: 'Projeto técnico estrutural e arquitetônico no formato .dwg (AutoCAD).',
                fileName: doc3dwg?.fileName,
                fileSize: doc3dwg?.fileSize,
                uploadedAt: doc3dwg?.uploadedAt,
                status: doc3dwg?.status || 'pendente',
                justificativa: doc3dwg?.justificativa
              },
              {
                id: 'doc_4',
                nome: 'Parecer técnico',
                obrigatorio: true,
                desc: 'Parecer descritivo emitido pela equipe de engenharia habilitada.',
                fileName: doc4?.id === 'doc_4' ? doc4?.fileName : undefined,
                fileSize: doc4?.id === 'doc_4' ? doc4?.fileSize : undefined,
                uploadedAt: doc4?.id === 'doc_4' ? doc4?.uploadedAt : undefined,
                status: doc4?.id === 'doc_4' ? (doc4?.status || 'pendente') : 'pendente',
                justificativa: doc4?.id === 'doc_4' ? doc4?.justificativa : undefined
              },
              {
                id: 'doc_ata',
                nome: 'Ata do Colegiado',
                obrigatorio: true,
                desc: 'Ata de reunião do colegiado escolar aprovando a demanda de intervenção.',
                fileName: docAta?.fileName,
                fileSize: docAta?.fileSize,
                uploadedAt: docAta?.uploadedAt,
                status: docAta?.status || 'pendente',
                justificativa: docAta?.justificativa
              },
              {
                id: 'doc_foto',
                nome: 'Relatório fotográfico',
                obrigatorio: true,
                desc: 'Relatório com fotos nítidas dos locais que necessitam de reforma/intervenção, com legendas explicativas.',
                fileName: docFoto?.fileName,
                fileSize: docFoto?.fileSize,
                uploadedAt: docFoto?.uploadedAt,
                status: docFoto?.status || 'pendente',
                justificativa: docFoto?.justificativa
              },
              {
                id: 'doc_5',
                nome: 'Imposto ISS',
                obrigatorio: false,
                desc: 'Guia ou comprovante de recolhimento tributário aplicável.',
                fileName: doc5?.id === 'doc_5' ? doc5?.fileName : undefined,
                fileSize: doc5?.id === 'doc_5' ? doc5?.fileSize : undefined,
                uploadedAt: doc5?.id === 'doc_5' ? doc5?.uploadedAt : undefined,
                status: doc5?.id === 'doc_5' ? (doc5?.status || 'pendente') : 'pendente',
                justificativa: doc5?.id === 'doc_5' ? doc5?.justificativa : undefined
              }
            ]
          };
        });

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

    carregarSolicitacoes();
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
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Persists updates: state React (síncrono) + localStorage (fallback) + Supabase (assíncrono)
  const atualizarEGuardarSolicitacoes = (novasBrutas: Solicitacao[]) => {
    // Recalcula score/estrelas/etiquetas a cada criação, atualização ou ajuste de prioridade manual
    const novas = novasBrutas.map(recalcularPrioridade).map(recalcularIEE);
    setSolicitacoes(novas);

    // Fallback localStorage durante transição
    try {
      localStorage.setItem('gesto_solicitacoes', JSON.stringify(novas));
    } catch (err) {
      console.warn('localStorage cheio:', err);
    }

    // Escrita assíncrona no Supabase
    novas.forEach(async (sol) => {
      const { error } = await supabase
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
          emenda_impositiva: sol.emendaImpositiva ?? null,
          descricao_folha_rosto: sol.descricaoFolhaRosto ?? null,
          valor_planilha: sol.valorPlanilha ?? null,
          valor_homologado: sol.valorHomologado ?? null,
          numero_paf: sol.numeroPAF ?? null,
          data_homologacao: sol.dataHomologacao ?? null,
          data_vigencia_paf: sol.dataVigenciaPAF ?? null,
          data_fin_homologacao: sol.dataFinHomologacao ?? null,
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
          data_ordem_inicio: sol.dataOrdemInicio ?? null,
          previsao_termino_obra: sol.previsaoTerminoObra ?? null,
          garantia_tipo: sol.garantiaTipo ?? null,
          cadastro_obra_confirmado: sol.cadastroObraConfirmado ?? false,
          atribuicao_forcada: sol.atribuicaoForcada ?? false,
          contador_analises: sol.contadorAnalises ?? 0,
          valor_contrato: sol.contratoValorInicial ?? null,
          status_obra: statusObraParaBanco(sol),
          analista_atribuido_id: null,
          fiscal_obra_atribuido_id: null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'codigo_sgo' });

      if (error) {
        console.error('Erro Supabase completo:', JSON.stringify(error, null, 2));
        console.error('Código:', error.code);
        console.error('Mensagem:', error.message);
        console.error('Detalhes:', error.details);
        console.error('Hint:', error.hint);
      }
    });
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
          { id: 'doc_5', nome: 'Imposto ISS', obrigatorio: false, desc: 'Comprovante tributário aplicável.', status: 'pendente' }
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
          { id: 'doc_5', nome: 'Imposto ISS', obrigatorio: false, desc: 'Comprovante tributário aplicável.', status: 'pendente' }
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
    atualizarEGuardarSolicitacoes(novas);
    setSelectedSchoolsPorSubtask(prev => ({
      ...prev,
      [subTask]: randomId
    }));
  };

  const handleUpdateSolicitacao = (updated: Solicitacao) => {
    const old = solicitacoes.find(s => s.id === updated.id);
    const novas = solicitacoes.map(s => s.id === updated.id ? updated : s);
    atualizarEGuardarSolicitacoes(novas);

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

  const handleDeleteSolicitacao = (id: string) => {
    const novas = solicitacoes.filter(s => s.id !== id);
    atualizarEGuardarSolicitacoes(novas);
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
    atualizarEGuardarSolicitacoes(novas);
  };

  const handleLogin = (perfil: PerfilUsuario, nome: string) => {
    setPerfilUsuario(perfil);
    setNomeUsuario(nome);
    setLogado(true);
  };

  const handleLogout = () => {
    supabase.auth.signOut();
    setLogado(false);
    setNomeUsuario('');
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
      <header className="h-16 bg-[#13264d] flex items-center justify-between px-8 shrink-0 shadow-sm border-none">
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

                  {(perfilUsuario === 'gestor_dore' || perfilUsuario === 'gestor_paf' || perfilUsuario === 'admin') && (
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
                  {perfilUsuario === 'gestor_dore' && 'Gestor Atendimento (DORE)'}
                  {perfilUsuario === 'analista_dore' && 'Analista de Engenharia (DORE)'}
                  {perfilUsuario === 'gestor_paf' && 'Subsecretário de Administração'}
                  {perfilUsuario === 'administrativo_dore' && 'Administrativo DORE'}
                </p>
              </div>
            </div>

            <button
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
        <aside className="w-16 sm:w-20 bg-[#13264d] flex flex-col items-center py-6 gap-6 shrink-0 z-10 select-none border-none">
          <div className="text-[10px] font-bold text-slate-200 uppercase tracking-wider scale-90 mb-1">
            Módulos
          </div>

          {/* 1. GESTÃO DE OBRAS */}
          <button
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

          {/* 2. SEGURANÇA */}
          {(() => {
            const bloqueado = perfilUsuario === 'administrativo_dore' || perfilUsuario === 'tecnico_infra' || perfilUsuario === 'analista_dore' || perfilUsuario === 'gestor_paf';
            return (
              <button
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
            const bloqueado = perfilUsuario === 'administrativo_dore' || perfilUsuario === 'tecnico_infra' || perfilUsuario === 'analista_dore' || perfilUsuario === 'gestor_paf';
            return (
              <button
                type="button"
                title={bloqueado ? 'Acesso restrito para este perfil' : 'Orçamentos'}
                onClick={bloqueado ? undefined : () => { setActiveModule('orcamento'); setActiveSubTask('blank'); setIdSolicitacaoSelecionada(null); }}
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
            const bloqueado = perfilUsuario === 'tecnico_infra' || perfilUsuario === 'administrativo_dore' || perfilUsuario === 'analista_dore' || perfilUsuario === 'gestor_paf';
            return (
              <button
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
            const bloqueado = perfilUsuario === 'tecnico_infra' || perfilUsuario === 'administrativo_dore' || perfilUsuario === 'analista_dore' || perfilUsuario === 'gestor_paf';
            return (
              <button
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
            const bloqueado = !(perfilUsuario === 'gestor_dore' || perfilUsuario === 'gestor_paf' || perfilUsuario === 'admin');
            return (
              <button
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

          <div className="mt-auto border-t border-slate-550/35 pt-4 w-10 flex flex-col items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="SGO Online" />
          </div>
        </aside>

        {/* SIDEBAR DE SUBDIVISÕES - SECONDARY (COLLAPSIBLE / ADAPTIVE) */}
        <aside className="w-60 bg-white border-r border-slate-200 flex flex-col p-4 shrink-0 text-left overflow-y-auto max-h-[calc(100vh-4rem)]">
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
                        { id: 'novo_atendimento', label: 'Atendimento Inicial', icon: Plus }
                      ].map(item => {
                        const Icon = item.icon;
                        const isActive = activeSubTask === item.id;
                        const bloqueado = (perfilUsuario === 'administrativo_dore' || perfilUsuario === 'gestor_paf') && item.id === 'novo_atendimento';
                        return (
                          <button
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
                <div className={`space-y-1 ${perfilUsuario === 'tecnico_infra' ? 'opacity-50' : ''}`}>
                  <button
                    type="button"
                    onClick={() => perfilUsuario !== 'tecnico_infra' && toggleCategory('analise')}
                    disabled={perfilUsuario === 'tecnico_infra'}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left text-[10px] font-black uppercase tracking-wider font-sans group ${
                      perfilUsuario === 'tecnico_infra'
                        ? 'text-slate-400 cursor-not-allowed'
                        : 'hover:bg-slate-50 text-slate-500 cursor-pointer'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      Análise Técnica
                    </span>
                    {perfilUsuario === 'tecnico_infra'
                      ? <Lock className="w-3 h-3 text-slate-400" />
                      : <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${collapsedCategories.analise ? '-rotate-90' : ''}`} />
                    }
                  </button>

                  {!collapsedCategories.analise && (
                    <div className="pl-3 border-l border-slate-100 ml-2 space-y-0.5 mt-0.5">
                      {[
                        { id: 'analise_atribuicao', label: 'Atribuição', icon: Users },
                        { id: 'analise', label: 'Validação Técnica', icon: FileText }
                      ].map(item => {
                        const Icon = item.icon;
                        const isActive = activeSubTask === item.id;
                        const bloqueado = perfilUsuario === 'tecnico_infra' || ((perfilUsuario === 'administrativo_dore' || perfilUsuario === 'gestor_paf') && item.id === 'analise');
                        return (
                          <button
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
                <div className={`space-y-1 ${perfilUsuario === 'tecnico_infra' ? 'opacity-50' : ''}`}>
                  <button
                    type="button"
                    onClick={() => perfilUsuario !== 'tecnico_infra' && toggleCategory('paf')}
                    disabled={perfilUsuario === 'tecnico_infra'}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left text-[10px] font-black uppercase tracking-wider font-sans group ${
                      perfilUsuario === 'tecnico_infra'
                        ? 'text-slate-400 cursor-not-allowed'
                        : 'hover:bg-slate-50 text-slate-500 cursor-pointer'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 shrink-0" />
                      PAF / Contratações
                    </span>
                    {perfilUsuario === 'tecnico_infra'
                      ? <Lock className="w-3 h-3 text-slate-400" />
                      : <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${collapsedCategories.paf ? '-rotate-90' : ''}`} />
                    }
                  </button>

                  {!collapsedCategories.paf && (
                    <div className="pl-3 border-l border-slate-100 ml-2 space-y-0.5 mt-0.5">
                      {[
                        { id: 'paf_acompanhamento', label: 'Acompanhamento de PAF', icon: ClipboardList },
                        { id: 'paf_autorizacao', label: 'Autorizações', icon: CheckCircle },
                        { id: 'paf', label: 'Geração de PAF', icon: Landmark }
                      ].map(item => {
                        const Icon = item.icon;
                        const isActive = activeSubTask === item.id;
                        const bloqueado = perfilUsuario === 'tecnico_infra' || (perfilUsuario === 'administrativo_dore' && item.id === 'paf_autorizacao');
                        return (
                          <button
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
                          <button key={item.id} id={`subtask-${item.id}`}
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
                              <button key={item.id} id={`subtask-${item.id}`}
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
                          <button key={item.id} id={`subtask-${item.id}`}
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

                {/* 7. RELATÓRIOS */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleCategory('relatorios')}
                    className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded-md text-left text-[10px] font-black text-slate-500 uppercase tracking-wider font-sans cursor-pointer group"
                  >
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      Relatórios
                    </span>
                    <ChevronDown className={`w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-transform ${collapsedCategories.relatorios ? '-rotate-90' : ''}`} />
                  </button>

                  {!collapsedCategories.relatorios && (
                    <div className="pl-3 border-l border-slate-100 ml-2 space-y-0.5 mt-0.5">
                      {[
                        { id: 'relat_gerencial', label: 'Relatórios gerenciais' },
                        { id: 'relat_financeiro', label: 'Relatórios financeiros' },
                        { id: 'relat_regional', label: 'Relatórios por regional' },
                        { id: 'relat_escola', label: 'Relatórios por escola' },
                        { id: 'relat_medicoes', label: 'Relatórios de medições' }
                      ].map(item => {
                        const isActive = activeSubTask === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveSubTask(item.id);
                              setIdSolicitacaoSelecionada(null);
                            }}
                            className={`w-full flex items-center px-2 py-1 text-left transition-all duration-150 cursor-pointer text-xs rounded-md ${
                              isActive
                                ? 'bg-blue-50 text-blue-855 font-bold border-l-2 border-blue-500 pl-1.5'
                                : 'hover:bg-slate-50/70 text-slate-600 pl-1.5'
                            }`}
                          >
                            <span className="font-sans">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {activeModule === 'seguranca' && perfilUsuario !== 'administrativo_dore' && perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'analista_dore' && perfilUsuario !== 'gestor_paf' && (
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

          {activeModule === 'orcamento' && perfilUsuario !== 'administrativo_dore' && perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'analista_dore' && perfilUsuario !== 'gestor_paf' && (
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
                          <button key={item.id} onClick={() => { setActiveSubTask(item.id); setIdSolicitacaoSelecionada(null); }}
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
                          <button key={item.id} onClick={() => { setActiveSubTask(item.id); setIdSolicitacaoSelecionada(null); }}
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
                        { id: 'orca_reports', label: 'Relatórios', func: 'curva ABC e Pareto', icon: BarChart2 },
                      ].map(item => {
                        const Icon = item.icon;
                        const isActive = activeSubTask === item.id;
                        return (
                          <button key={item.id} onClick={() => { setActiveSubTask(item.id); setIdSolicitacaoSelecionada(null); }}
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

          {activeModule === 'imoveis' && perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'administrativo_dore' && perfilUsuario !== 'analista_dore' && perfilUsuario !== 'gestor_paf' && (
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

          {activeModule === 'abertura_chamados' && perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'administrativo_dore' && perfilUsuario !== 'analista_dore' && perfilUsuario !== 'gestor_paf' && (
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
            />
          ) : activeModule === 'gestao_obras' && activeSubTask === 'paf_autorizacao' && !idSolicitacaoSelecionada ? (
            (() => {
              const schoolsInAutorizacao = solicitacoesVisiveis.filter(s => s.etapaAtual === 'paf_autorizacao');
              
              // Dynamic filter items based on the data
              const uniqueCodesc = Array.from(new Set(schoolsInAutorizacao.map(s => s.codesc).filter(Boolean)));
              const uniqueSre = Array.from(new Set(schoolsInAutorizacao.map(s => s.sre).filter(Boolean)));
              const uniqueMunicipio = Array.from(new Set(schoolsInAutorizacao.map(s => s.municipio).filter(Boolean)));
              const uniqueEscola = Array.from(new Set(schoolsInAutorizacao.map(s => s.nomeEscola).filter(Boolean)));

              const filteredSchoolsInAutorizacao = schoolsInAutorizacao.filter(s => {
                if (filterCodesc && s.codesc !== filterCodesc) return false;
                if (filterSre && s.sre !== filterSre) return false;
                if (filterMunicipio && s.municipio !== filterMunicipio) return false;
                if (filterEscola && s.nomeEscola !== filterEscola) return false;
                return true;
              });

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
                setRejectingSchoolId(null);
                setRejectionJustification('');
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
                    </div>

                    {(filterCodesc || filterSre || filterMunicipio || filterEscola) && (
                      <div className="mt-3 flex justify-end font-sans">
                        <button
                          type="button"
                          onClick={() => {
                            setFilterCodesc('');
                            setFilterSre('');
                            setFilterMunicipio('');
                            setFilterEscola('');
                          }}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Limpar Filtros e Restaurar
                        </button>
                      </div>
                    )}
                  </div>

                  {perfilUsuario !== 'gestor_paf' && (
                    <div className="p-4 bg-amber-50 border border-amber-205 text-neutral-900 rounded-xl text-xs space-y-1.5 text-left font-sans flex items-start gap-2.5">
                      <span className="text-base select-none leading-none mt-0.5">⚠️</span>
                      <div className="space-y-0.5">
                        <strong className="font-extrabold block text-amber-950">Ação Restrita: Controle Exclusivo do Subsecretário de Administração</strong>
                        <span>O seu perfil atual é <strong>{perfilUsuario.toUpperCase()}</strong>. Para avaliar, autorizar ou rejeitar as dotações orçamentárias do PAF nesta Etapa 3, por favor mude seu perfil para <strong>Silas Fagundes (Subsecretário de Administração)</strong> no seletor de usuário (canto superior direito).</span>
                      </div>
                    </div>
                  )}

                  {/* TABELA DE AUTORIZAÇÃO */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs text-left">
                    <div className="p-4 border-b border-emerald-100/30 bg-slate-50/50 flex justify-between items-center flex-wrap gap-2 font-sans">
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Demandas em Fase de Homologação (Autorização do PAF)</h4>
                        <p className="text-[10px] text-slate-500 leading-none mt-0.5">Mostrando dotações aguardando dotação do Gestor Financeiro.</p>
                      </div>
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border-emerald-150 border font-extrabold rounded-full text-[10px] font-mono">
                        {filteredSchoolsInAutorizacao.length} aguardando
                      </span>
                    </div>

                    {filteredSchoolsInAutorizacao.length === 0 ? (
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
                              <th className="py-3 px-4 w-28">Obra ID</th>
                              <th className="py-3 px-4">Escola</th>
                              <th className="py-3 px-4">SRE</th>
                              <th className="py-3 px-4">Município</th>
                              <th className="py-3 px-4">Tipo de Obra</th>
                              <th className="py-3 px-4">Tipo de atendimento</th>
                              <th className="py-3 px-4 text-right">Valor</th>
                              <th className="py-3 px-4 text-center w-56">Autorizar PAF?</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredSchoolsInAutorizacao.map((sol) => {
                              const valorObra = sol.valorPlanilha || sol.valorHomologado || 0;
                              return (
                                <tr key={sol.id} className="hover:bg-slate-50/50 transition-colors group">
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
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-150 rounded text-[10px] font-semibold">
                                      {sol.tipoObra || sol.tipo}
                                    </span>
                                  </td>

                                  {/* Tipo Atendimento */}
                                  <td className="py-4 px-4">
                                    <span className="px-2 py-0.5 bg-teal-50 text-teal-900 border border-teal-150 rounded text-[10px] font-semibold">
                                      {sol.tipoAtendimento || 'Atendimento Regular'}
                                    </span>
                                  </td>

                                  {/* Valor Obra */}
                                  <td className="py-4 px-4 text-right font-mono font-bold text-slate-700">
                                    R$ {valorObra.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>

                                  {/* Botões de Ação */}
                                  <td className="py-4 px-4 text-center">
                                    {(perfilUsuario === 'gestor_paf' || perfilUsuario === 'admin') ? (
                                      <div className="flex items-center justify-center gap-1.5">
                                        <button
                                          onClick={() => setConfirmingSolId(sol.id)}
                                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-colors shadow-3xs cursor-pointer"
                                        >
                                          Autorizar PAF
                                        </button>
                                        <button
                                          onClick={() => setRejectingSchoolId(sol.id)}
                                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-colors shadow-3xs cursor-pointer"
                                        >
                                          Não
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="text-center font-sans">
                                        <span className="text-[10px] font-extrabold text-slate-400 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 inline-flex items-center gap-1 select-none" title="Apenas o Gestor Geral Silas Fagundes possui dotação oficial para autorizar PAF nesta Etapa 3.">
                                          🔒 Apenas Subsecretário de Administração
                                        </span>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* MODAL / BANNER DE JUSTIFICATIVA DE REJEIÇÃO */}
                  {rejectingSchoolId && (() => {
                    const activeRejecting = solicitacoes.find(s => s.id === rejectingSchoolId);
                    if (!activeRejecting) return null;
                    return (
                      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xs flex items-center justify-center z-50 p-4 font-sans">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150">
                          <div className="bg-rose-50 border-b border-rose-100 p-4">
                            <h3 className="text-sm font-extrabold text-rose-800 uppercase tracking-wider flex items-center gap-2">
                              Motivo de Não-Autorização
                            </h3>
                            <p className="text-xs text-neutral-500 mt-0.5">Demanda: {activeRejecting.nomeEscola} ({activeRejecting.id})</p>
                          </div>
                          
                          <div className="p-4 space-y-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1">
                                Escreva a justificativa para o retorno / rejeição do processo *
                              </label>
                              <textarea
                                value={rejectionJustification}
                                onChange={(e) => setRejectionJustification(e.target.value)}
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
                                setRejectingSchoolId(null);
                                setRejectionJustification('');
                              }}
                              className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer animate-none"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => {
                                if (!rejectionJustification.trim()) {
                                  alert('Por favor, digite a justificativa.');
                                  return;
                                }
                                handleRejeitarPAF(activeRejecting, rejectionJustification);
                              }}
                              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg cursor-pointer"
                            >
                              Confirmar Devolução
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* MODAL DE CONFIRMAÇÃO DE AUTORIZAÇÃO PAF */}
                  {confirmingSolId && (() => {
                    const activeConfirming = solicitacoes.find(s => s.id === confirmingSolId);
                    if (!activeConfirming) return null;
                    const valorObra = activeConfirming.valorPlanilha || activeConfirming.valorHomologado || 0;
                    return (
                      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xs flex items-center justify-center z-50 p-4 font-sans">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150">
                          <div className="bg-emerald-50 border-b border-emerald-100 p-4">
                            <h3 className="text-sm font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                              ✓ Confirmar Autorização do PAF
                            </h3>
                            <p className="text-xs text-neutral-500 mt-0.5">Demanda: {activeConfirming.nomeEscola} ({activeConfirming.id})</p>
                          </div>
                          
                          <div className="p-4 space-y-4">
                            <p className="text-xs text-slate-600 leading-relaxed">
                              Deseja aprovar e autorizar oficialmente o PAF desta demanda no valor de:
                            </p>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                              <span className="text-base font-black text-emerald-700 font-mono">
                                R$ {valorObra.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 italic leading-normal">
                              Esta ação registrará o trâmite na planilha oficial de dotações orçamentárias e arquivará o parecer do Gestor Geral.
                            </p>
                          </div>

                          <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-2 text-xs">
                            <button
                              onClick={() => setConfirmingSolId(null)}
                              className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => {
                                handleAutorizarPAF(activeConfirming);
                                setConfirmingSolId(null);
                              }}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg cursor-pointer"
                            >
                              Autorizar PAF
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
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
                      onSolicitacaoCriada={(nova) => {
                        handleNovaSolicitacao(nova);
                        setActiveSubTask('cadastro');
                      }}
                      onUpdateSolicitacao={handleUpdateSolicitacao}
                      usuariosSeguranca={usuariosSeguranca}
                      onEdit={setSolicitacaoEmEdicao}
                      perfilUsuario={perfilUsuario}
                      sreDoTecnico={sreDoTecnico}
                      atendimentoEmEdicaoDirect={atendimentoEmEdicaoDirect}
                      onLimparEdicaoDirect={() => setAtendimentoEmEdicaoDirect(null)}
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
                          />
                        ) : (
                          <KanbanViews
                            solicitacoes={solicitacoesVisiveis}
                            onSelect={handleSelectSolicitacao}
                            perfilUsuario={perfilUsuario}
                            somenteLeitura={somenteLeitura}
                            onUpdate={handleUpdateSolicitacao}
                            onDelete={handleDeleteSolicitacao}
                            onEdit={setSolicitacaoEmEdicao}
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
                  ) : activeSubTask.startsWith('relat_') ? (
                    <RelatoriosPanel
                      activeReportType={activeSubTask}
                      solicitacoes={solicitacoesVisiveis}
                    />
                  ) : activeSubTask === 'visao_geral' ? (
                    <VisaoGeralDashboard
                      solicitacoes={solicitacoesVisiveis}
                      onSelectSchool={(sol) => handleSelectSolicitacao(sol)}
                      onNavigateToSubTask={(subTask) => setActiveSubTask(subTask)}
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
                      onEdit={(sol) => {
                        if (perfilUsuario === 'tecnico_infra' && sol.etapaAtual === 'cadastro') {
                          setAtendimentoEmEdicaoDirect(sol);
                          setActiveSubTask('novo_atendimento');
                        } else {
                          setSolicitacaoEmEdicao(sol);
                        }
                      }}
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
                      onEdit={setSolicitacaoEmEdicao}
                      mode="status"
                      viewMode={viewMode}
                      onMudarViewMode={(mode) => setViewMode(mode)}
                      onNovaSolicitacao={() => setAbrirModalCadastro(true)}
                    />
                  )}
                </div>
              )}

              {activeModule === 'seguranca' && perfilUsuario !== 'administrativo_dore' && perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'analista_dore' && perfilUsuario !== 'gestor_paf' && (
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
                                      u.perfil === 'gestor_dore' ? 'bg-indigo-100 text-indigo-800' :
                                      u.perfil === 'analista_dore' ? 'bg-blue-100 text-blue-800' :
                                      u.perfil === 'gestor_paf' ? 'bg-cyan-100 text-cyan-800' :
                                      u.perfil === 'administrativo_dore' ? 'bg-purple-100 text-purple-800' :
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
                                             u.perfil === 'gestor_dore' ? 'GESTOR DORE' :
                                             u.perfil === 'analista_dore' ? 'ANALISTA' :
                                             u.perfil === 'gestor_paf' ? 'SUBSEC. ADM' :
                                             u.perfil === 'administrativo_dore' ? 'ADMIN DORE' :
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

              {activeModule === 'orcamento' && perfilUsuario !== 'administrativo_dore' && perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'analista_dore' && perfilUsuario !== 'gestor_paf' && (
                <OrcamentoModule
                  activeSubTask={activeSubTask}
                  setActiveSubTask={setActiveSubTask}
                  sreDoTecnico={sreDoTecnico}
                  perfilUsuario={perfilUsuario}
                />
              )}

              {activeModule === 'imoveis' && perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'administrativo_dore' && perfilUsuario !== 'analista_dore' && perfilUsuario !== 'gestor_paf' && (
                <div className="w-full p-6">
                  <PatrimonioModule
                    activeSubTask={activeSubTask}
                    perfilUsuario={perfilUsuario}
                    somenteLeitura={perfilUsuario === 'administrativo_dore'}
                    regionaisDoTecnico={regionaisDoTecnico}
                  />
                </div>
              )}

              {activeModule === 'abertura_chamados' && perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'administrativo_dore' && perfilUsuario !== 'analista_dore' && perfilUsuario !== 'gestor_paf' && (
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
                (perfilUsuario === 'gestor_dore' || perfilUsuario === 'admin') || (perfilUsuario === 'gestor_paf' || perfilUsuario === 'admin') ? (
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
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nº Registro CREA/CAU</label>
                    <input type="text" value={usrCreaNum} onChange={(e) => setUsrCreaNum(e.target.value)} placeholder="Ex: CREA 142.532/D" className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 outline-hidden" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Situação do Registro</label>
                    <select value={usrCreaSituacao} onChange={(e) => setUsrCreaSituacao(e.target.value as 'Ativo' | 'Inativo')} className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 outline-hidden cursor-pointer">
                      <option>Ativo</option>
                      <option>Inativo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Data de Ingresso</label>
                    <input type="date" value={usrDataIngresso} onChange={(e) => setUsrDataIngresso(e.target.value)} className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 outline-hidden font-mono" />
                  </div>
                </div>

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

                <div className="flex gap-4">
                  {(['regional', 'orgao_central'] as const).map(tipo => (
                    <label key={tipo} className={`flex-1 flex items-center gap-2.5 p-3 border rounded-xl cursor-pointer transition-all text-xs font-semibold ${usrTipoVinculo === tipo ? 'bg-rose-50 border-rose-400 text-rose-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      <input type="radio" name="tipoVinculo" value={tipo} checked={usrTipoVinculo === tipo} onChange={() => setUsrTipoVinculo(tipo)} className="accent-rose-600" />
                      {tipo === 'regional' ? '🏫 Regional (SRE)' : '🏛️ Órgão Central'}
                    </label>
                  ))}
                </div>

                {usrTipoVinculo === 'regional' && (
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

                {usrTipoVinculo === 'orgao_central' && (
                  <div className="animate-in slide-in-from-top-1 duration-200">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Equipe / Setor *</label>
                    <select value={usrEquipeCentral} onChange={(e) => setUsrEquipeCentral(e.target.value)} className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 outline-hidden cursor-pointer">
                      <option value="Planejamento">Equipe de Planejamento</option>
                      <option value="Ajuste">Equipe de Ajuste</option>
                      <option value="Administrativo">Equipe Administrativa</option>
                    </select>
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
