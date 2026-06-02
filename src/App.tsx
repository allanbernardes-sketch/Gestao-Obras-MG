/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Solicitacao, PerfilUsuario, EmpresaSeguranca, Notificacao, SistemaLog } from './types';
import { SOLICITACOES_INICIAIS, NOTIFICACOES_INICIAIS, LOGS_INICIAIS } from './initialData';
import Dashboard from './components/Dashboard';
import VisaoGeralDashboard from './components/VisaoGeralDashboard';
import SolicitacaoDetalhes from './components/SolicitacaoDetalhes';
import NovaSolicitacaoModal from './components/NovaSolicitacaoModal';
import EditarSolicitacaoModal from './components/EditarSolicitacaoModal';
import { HardHat, Layers, ShieldCheck, DollarSign, Building2, HelpCircle, ChevronDown, LayoutGrid, Users, Menu, Lock, Coins, MapPin, UserPlus, FileText, ClipboardList, ClipboardCheck, BookOpen, Key, Landmark, CheckCircle, Calculator, Building, UploadCloud, Paperclip, Plus, Search, X, Wrench, Ticket, Bell, FileClock, Navigation } from 'lucide-react';
import KanbanViews from './components/KanbanViews';
import { NovoAtendimentoPanel, AtribuicaoPanel, RelatoriosPanel } from './components/GestaoObrasViews';
import ExecucaoSubmodulos from './components/ExecucaoSubmodulos';
import AcompanhamentoPaf from './components/AcompanhamentoPaf';
import CentralNotificacoesLogs from './components/CentralNotificacoesLogs';
import CentralNavegacaoObras from './components/CentralNavegacaoObras';


export default function App() {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [perfilUsuario, setPerfilUsuario] = useState<PerfilUsuario>('tecnico_infra');
  const [idSolicitacaoSelecionada, setIdSolicitacaoSelecionada] = useState<string | null>(null);
  const [abrirModalCadastro, setAbrirModalCadastro] = useState(false);
  const [solicitacaoEmEdicao, setSolicitacaoEmEdicao] = useState<Solicitacao | null>(null);
  const [atendimentoEmEdicaoDirect, setAtendimentoEmEdicaoDirect] = useState<Solicitacao | null>(null);
  const [mostrarMenuPerfil, setMostrarMenuPerfil] = useState(false);
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
      usuario: perfilUsuario === 'tecnico_infra' ? 'João Paulo' :
               perfilUsuario === 'gestor_dore' ? 'Aline Davino' :
               perfilUsuario === 'analista_dore' ? 'Flavia Borges' :
               perfilUsuario === 'gestor_paf' ? 'Silas Fagundes' :
               perfilUsuario === 'administrativo_dore' ? 'Rui Lages' :
               perfilUsuario === 'fiscal_obra' ? 'Insp. Mariana Souza' : 'Usuário SGO',
      perfil: perfilUsuario === 'tecnico_infra' ? 'Técnico de Infraestrutura SRE' :
              perfilUsuario === 'gestor_dore' ? 'Gestor Atendimento DORE' :
              perfilUsuario === 'analista_dore' ? 'Analista de Engenharia DORE' :
              perfilUsuario === 'gestor_paf' ? 'Gestor Geral (PAF)' :
              perfilUsuario === 'administrativo_dore' ? 'Administrativo DORE' :
              perfilUsuario === 'fiscal_obra' ? 'Fiscalização de Campo' : 'Operador',
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
    { id: 'USR-06', nome: 'Insp. Mariana Souza', email: 'mariana.souza@obras.mg.gov.br', perfil: 'fiscal_obra', departamento: 'Fiscalização de Campo' }
  ]);

  const [enderecosSeguranca, setEnderecosSeguranca] = useState([
    { id: 'END-01', cep: '38700-000', rua: 'Rua Major Gote', numero: '1200', bairro: 'Alto Caiçaras', cidade: 'Patos de Minas', estado: 'MG', escola: 'E.E. Padre Almir Neves' },
    { id: 'END-02', cep: '30120-010', rua: 'Av. Afonso Pena', numero: '4000', bairro: 'Cruzeiro', cidade: 'Belo Horizonte', estado: 'MG', escola: 'E.E. Milton Campos' },
    { id: 'END-03', cep: '39100-000', rua: 'Praça Conselheiro Matta', numero: '82', bairro: 'Centro', cidade: 'Diamantina', estado: 'MG', escola: 'E.E. Juscelino Kubitschek' },
    { id: 'END-04', cep: '37500-050', rua: 'Rua Francisco Masseli', numero: '345', bairro: 'Bonsucesso', cidade: 'Itajubá', estado: 'MG', escola: 'E.E. Wenceslau Braz' },
    { id: 'END-05', cep: '37550-000', rua: 'Av. Vicente Simões', numero: '101', bairro: 'Centro', cidade: 'Pouso Alegre', estado: 'MG', escola: 'E.E. Delfim Moreira' }
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
  const [usrNome, setUsrNome] = useState('');
  const [usrEmail, setUsrEmail] = useState('');
  const [usrPerfil, setUsrPerfil] = useState<PerfilUsuario>('tecnico_infra');
  const [usrDepto, setUsrDepto] = useState('SRE Geral');

  // SEGURANÇA FORM STATES - ADDRESS
  const [endCep, setEndCep] = useState('');
  const [endRua, setEndRua] = useState('');
  const [endNum, setEndNum] = useState('');
  const [endBairro, setEndBairro] = useState('');
  const [endCidade, setEndCidade] = useState('');
  const [endEscola, setEndEscola] = useState('');

  // SEGURANÇA FORM STATES - SCHOOL
  const [escNome, setEscNome] = useState('');
  const [escCodesc, setEscCodesc] = useState('');
  const [escMunicipio, setEscMunicipio] = useState('');
  const [escSre, setEscSre] = useState('SRE Metropolitana A');
  const [escPredio, setEscPredio] = useState('Próprio Estadual');
  const [escAtendimento, setEscAtendimento] = useState('Atendimento Regular');
  const [escOrgao, setEscOrgao] = useState('Exclusivo');

  // SECURITY EVENTS HANDLERS
  const handleCadastrarUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usrNome || !usrEmail) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    const novo = {
      id: `USR-${String(usuariosSeguranca.length + 1).padStart(2, '0')}`,
      nome: usrNome,
      email: usrEmail,
      perfil: usrPerfil,
      departamento: usrDepto
    };
    setUsuariosSeguranca([...usuariosSeguranca, novo]);
    setUsrNome('');
    setUsrEmail('');
    setUsrDepto('SRE Geral');
    alert(`Usuário "${usrNome}" cadastrado com sucesso nas diretivas de Segurança!`);
  };

  const handleCadastrarEndereco = (e: React.FormEvent) => {
    e.preventDefault();
    if (!endCep || !endRua || !endCidade) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    const novo = {
      id: `END-${String(enderecosSeguranca.length + 1).padStart(2, '0')}`,
      cep: endCep,
      rua: endRua,
      numero: endNum || 'S/N',
      bairro: endBairro || 'Centro',
      cidade: endCidade,
      estado: 'MG',
      escola: endEscola || 'Geral'
    };
    setEnderecosSeguranca([...enderecosSeguranca, novo]);
    setEndCep('');
    setEndRua('');
    setEndNum('');
    setEndBairro('');
    setEndCidade('');
    setEndEscola('');
    alert('Endereço cadastrado com sucesso no banco de dados escolar regional!');
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
        { id: 'doc_3', nome: 'Projeto de Engenharia', obrigatorio: true, desc: 'Projetos técnicos estruturais e arquitetônicos nos formatos .pdf e .dwg.', status: 'pendente' },
        { id: 'doc_4', nome: 'Parecer técnico', obrigatorio: true, desc: 'Parecer descritivo emitido pela equipe de engenharia habilitada.', status: 'pendente' },
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

  // Initialize from LocalStorage or the rich pre-defined mock set
  useEffect(() => {
    const saved = localStorage.getItem('gesto_solicitacoes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Solicitacao[];
        
        // Dynamic clean migration of checklists to use current structural constraints
        // preserving user-uploaded filenames, sizes, and statuses
        const migrado = parsed.map(s => {
          const doc1 = s.documentos?.find(d => d.id === 'doc_1');
          const doc2 = s.documentos?.find(d => d.id === 'doc_2' || d.id === 'doc_3'); // migrate or merge
          const doc3 = s.documentos?.find(d => d.id === 'doc_3');
          const doc4 = s.documentos?.find(d => d.id === 'doc_4' || d.id === 'doc_7'); 
          const doc5 = s.documentos?.find(d => d.id === 'doc_5' || d.id === 'doc_6');

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
                fileName: doc2?.id === 'doc_2' ? doc2?.fileName : undefined,
                fileSize: doc2?.id === 'doc_2' ? doc2?.fileSize : undefined,
                uploadedAt: doc2?.id === 'doc_2' ? doc2?.uploadedAt : undefined,
                status: doc2?.id === 'doc_2' ? (doc2?.status || 'pendente') : 'pendente',
                justificativa: doc2?.id === 'doc_2' ? doc2?.justificativa : undefined
              },
              {
                id: 'doc_3',
                nome: 'Projeto de Engenharia',
                obrigatorio: true,
                desc: 'Projetos técnicos estruturais e arquitetônicos nos formatos .pdf e .dwg.',
                fileName: doc3?.fileName,
                fileSize: doc3?.fileSize,
                uploadedAt: doc3?.uploadedAt,
                status: doc3?.status || 'pendente',
                justificativa: doc3?.justificativa
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

        setSolicitacoes(migrado);
        localStorage.setItem('gesto_solicitacoes', JSON.stringify(migrado));
      } catch (e) {
        console.error('Falha ao parsear localStorage, resetando...', e);
        setSolicitacoes(SOLICITACOES_INICIAIS);
      }
    } else {
      setSolicitacoes(SOLICITACOES_INICIAIS);
      localStorage.setItem('gesto_solicitacoes', JSON.stringify(SOLICITACOES_INICIAIS));
    }
  }, []);

  // Autoreset search criteria on subtask change to avoid bleed
  useEffect(() => {
    setSchoolSearchQuery('');
    setIsSelectorOpen(false);
  }, [activeSubTask]);

  // Persists updates to localStorage
  const atualizarEGuardarSolicitacoes = (novas: Solicitacao[]) => {
    setSolicitacoes(novas);
    localStorage.setItem('gesto_solicitacoes', JSON.stringify(novas));
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
      if (perfilUsuario === 'tecnico_infra' && etapa === 'cadastro') {
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
                setMostrarMenuPerfil(false);
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

                  <div className="px-3 pt-2 pb-0.5 border-t border-slate-100 flex justify-center">
                    <button
                      onClick={() => {
                        setActiveModule('central_logs');
                        setActiveSubTask('visao_geral');
                        setMostrarMenuNotif(false);
                      }}
                      className="w-full py-1 text-center text-[10px] font-bold text-[#13264d] hover:bg-slate-50 rounded-lg transition"
                    >
                      Ver Tudo (Logs & Auditoria) →
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <div 
              onClick={() => {
                setMostrarMenuPerfil(!mostrarMenuPerfil);
                setMostrarMenuNotif(false);
              }}
              className="flex items-center gap-2 text-xs cursor-pointer select-none p-1.5 hover:bg-blue-900/60 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center text-xs text-white font-bold border border-blue-600 shrink-0">
                {perfilUsuario === 'tecnico_infra' && 'JP'}
                {perfilUsuario === 'gestor_dore' && 'AD'}
                {perfilUsuario === 'analista_dore' && 'FB'}
                {perfilUsuario === 'gestor_paf' && 'SF'}
                {perfilUsuario === 'administrativo_dore' && 'RL'}
                {perfilUsuario === 'fiscal_obra' && 'MS'}
              </div>
              <div className="text-left hidden sm:block font-sans">
                <p className="text-slate-200 leading-none font-medium flex items-center gap-1">
                  {perfilUsuario === 'tecnico_infra' && 'João Paulo'}
                  {perfilUsuario === 'gestor_dore' && 'Aline Davino'}
                  {perfilUsuario === 'analista_dore' && 'Flavia Borges'}
                  {perfilUsuario === 'gestor_paf' && 'Silas Fagundes'}
                  {perfilUsuario === 'administrativo_dore' && 'Rui Lages'}
                  {perfilUsuario === 'fiscal_obra' && 'Insp. Mariana Souza'}
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </p>
                <p className="text-slate-500 text-[10px] mt-0.5 uppercase tracking-wider font-semibold">
                  {perfilUsuario === 'tecnico_infra' && 'Técnico de Infraestrutura (SRE)'}
                  {perfilUsuario === 'gestor_dore' && 'Gestor Atendimento (DORE)'}
                  {perfilUsuario === 'analista_dore' && 'Analista de Engenharia (DORE)'}
                  {perfilUsuario === 'gestor_paf' && 'Gestor Geral (PAF)'}
                  {perfilUsuario === 'administrativo_dore' && 'Administrativo DORE'}
                  {perfilUsuario === 'fiscal_obra' && 'Fiscalização de Campo'}
                </p>
              </div>
            </div>

            {mostrarMenuPerfil && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setMostrarMenuPerfil(false);
                  }} 
                />
                <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-705 rounded-xl shadow-xl py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                  <div className="px-3 py-1.5 border-b border-slate-800 mb-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">
                      Alternar Usuário Simulado
                    </span>
                  </div>
                  {[
                    { id: 'tecnico_infra', nome: 'João Paulo', cargo: 'Técnico de Infraestrutura SRE', av: 'JP', color: 'bg-amber-600' },
                    { id: 'gestor_dore', nome: 'Aline Davino', cargo: 'Gestor Atendimento DORE', av: 'AD', color: 'bg-indigo-600' },
                    { id: 'analista_dore', nome: 'Flavia Borges', cargo: 'Analista de Engenharia DORE', av: 'FB', color: 'bg-blue-600' },
                    { id: 'gestor_paf', nome: 'Silas Fagundes', cargo: 'Gestor Geral (PAF)', av: 'SF', color: 'bg-cyan-600' },
                    { id: 'administrativo_dore', nome: 'Rui Lages', cargo: 'Administrativo DORE', av: 'RL', color: 'bg-purple-600' },
                    { id: 'fiscal_obra', nome: 'Insp. Mariana Souza', cargo: 'Fiscalização de Campo', av: 'MS', color: 'bg-emerald-600' }
                  ].map((perf) => (
                    <button
                      key={perf.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPerfilUsuario(perf.id as PerfilUsuario);
                        setMostrarMenuPerfil(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-slate-800 transition-colors cursor-pointer ${
                        perfilUsuario === perf.id ? 'bg-slate-850/50' : ''
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full ${perf.color} text-[10px] text-white font-bold flex items-center justify-center`}>
                        {perf.av}
                      </div>
                      <div>
                        <p className={`text-slate-200 leading-none text-xs font-semibold ${perfilUsuario === perf.id ? 'text-blue-400 font-bold' : ''}`}>
                          {perf.nome}
                        </p>
                        <p className="text-slate-500 text-[9px] mt-0.5 uppercase tracking-wider font-semibold">
                          {perf.cargo}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
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
          <button
            type="button"
            title="Segurança & Cadastros"
            onClick={() => {
              setActiveModule('seguranca');
              setActiveSubTask('cadastro_usuario');
              setIdSolicitacaoSelecionada(null);
            }}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 group relative border cursor-pointer ${
              activeModule === 'seguranca'
                ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                : 'bg-[#1c3870] text-slate-100 border-[#26417a]/40 hover:bg-[#1a2f5c] hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span className="text-[8px] font-bold tracking-tight">Segurança</span>
          </button>

          {/* 3. ORÇAMENTO */}
          <button
            type="button"
            title="Orçamentos"
            onClick={() => {
              setActiveModule('orcamento');
              setActiveSubTask('blank');
              setIdSolicitacaoSelecionada(null);
            }}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 group relative border cursor-pointer ${
              activeModule === 'orcamento'
                ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                : 'bg-[#1c3870] text-slate-100 border-[#26417a]/40 hover:bg-[#1a2f5c] hover:text-white'
            }`}
          >
            <Coins className="w-4 h-4 flex-shrink-0" />
            <span className="text-[8px] font-bold tracking-tight">Orçamento</span>
          </button>

          {/* 4. IMÓVEIS */}
          <button
            type="button"
            title="Patrimônio & Imóveis"
            onClick={() => {
              setActiveModule('imoveis');
              setActiveSubTask('blank_imoveis');
              setIdSolicitacaoSelecionada(null);
            }}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 group relative border cursor-pointer ${
              activeModule === 'imoveis'
                ? 'bg-teal-600 text-white border-teal-500 shadow-md'
                : 'bg-[#1c3870] text-slate-100 border-[#26417a]/40 hover:bg-[#1a2f5c] hover:text-white'
            }`}
          >
            <Building className="w-4 h-4 flex-shrink-0" />
            <span className="text-[8px] font-bold tracking-tight">Imóveis</span>
          </button>

          {/* 5. ABERTURA DE CHAMADOS */}
          <button
            type="button"
            title="Abertura de Chamados"
            onClick={() => {
              setActiveModule('abertura_chamados');
              setActiveSubTask('blank_novo_chamado');
              setIdSolicitacaoSelecionada(null);
            }}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 group relative border cursor-pointer ${
              activeModule === 'abertura_chamados'
                ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                : 'bg-[#1c3870] text-slate-100 border-[#26417a]/40 hover:bg-[#1a2f5c] hover:text-white'
            }`}
          >
            <Wrench className="w-4 h-4 flex-shrink-0" />
            <span className="text-[8px] font-bold tracking-tight">Chamados</span>
          </button>

          {/* 6. CENTRAL DE LOGS E NOTIFICAÇÕES */}
          <button
            type="button"
            title="Log do Sistema & Auditoria"
            onClick={() => {
              setActiveModule('central_logs');
              setActiveSubTask('visao_geral');
              setIdSolicitacaoSelecionada(null);
            }}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 group relative border cursor-pointer ${
              activeModule === 'central_logs'
                ? 'bg-blue-620 bg-blue-600 text-white border-blue-500 shadow-md'
                : 'bg-[#1c3870] text-slate-100 border-[#26417a]/40 hover:bg-[#1a2f5c] hover:text-white'
            }`}
          >
            <span className="relative">
              <FileClock className="w-4 h-4 flex-shrink-0" />
              {notifications.filter(n => !n.lida).length > 0 && (
                <span className="absolute -top-1 -right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
              )}
            </span>
            <span className="text-[8px] font-bold tracking-tight">Logs</span>
          </button>

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
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveSubTask(item.id);
                              setIdSolicitacaoSelecionada(null);
                            }}
                            className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-left transition-all duration-150 cursor-pointer ${
                              isActive
                                ? 'bg-blue-50 text-blue-850 font-bold border-l-2 border-blue-500 pl-1.5 rounded-r-md'
                                : 'hover:bg-slate-50/70 text-slate-600 pl-1.5'
                            }`}
                          >
                            <Icon className={`w-3 h-3 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                            <span className="text-xs font-sans">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. ANÁLISE TÉCNICA */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleCategory('analise')}
                    className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded-md text-left text-[10px] font-black text-slate-500 uppercase tracking-wider font-sans cursor-pointer group"
                  >
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      Análise Técnica
                    </span>
                    <ChevronDown className={`w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-transform ${collapsedCategories.analise ? '-rotate-90' : ''}`} />
                  </button>

                  {!collapsedCategories.analise && (
                    <div className="pl-3 border-l border-slate-100 ml-2 space-y-0.5 mt-0.5">
                      {[
                        { id: 'analise_atribuicao', label: 'Atribuição', icon: Users },
                        { id: 'analise', label: 'Atribuição Técnica', icon: FileText }
                      ].map(item => {
                        const Icon = item.icon;
                        const isActive = activeSubTask === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveSubTask(item.id);
                              setIdSolicitacaoSelecionada(null);
                            }}
                            className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-left transition-all duration-150 cursor-pointer ${
                              isActive
                                ? 'bg-blue-50 text-blue-855 font-bold border-l-2 border-blue-500 pl-1.5 rounded-r-md'
                                : 'hover:bg-slate-50/70 text-slate-600 pl-1.5'
                            }`}
                          >
                            <Icon className={`w-3 h-3 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                            <span className="text-xs font-sans">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. PAF / CONTRATAÇÕES */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleCategory('paf')}
                    className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded-md text-left text-[10px] font-black text-slate-500 uppercase tracking-wider font-sans cursor-pointer group"
                  >
                    <span className="flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      PAF / Contratações
                    </span>
                    <ChevronDown className={`w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-transform ${collapsedCategories.paf ? '-rotate-90' : ''}`} />
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
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveSubTask(item.id);
                              setIdSolicitacaoSelecionada(null);
                            }}
                            className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-left transition-all duration-150 cursor-pointer ${
                              isActive
                                ? 'bg-blue-50 text-blue-855 font-bold border-l-2 border-blue-500 pl-1.5 rounded-r-md'
                                : 'hover:bg-slate-50/70 text-slate-600 pl-1.5'
                            }`}
                          >
                            <Icon className={`w-3 h-3 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                            <span className="text-xs font-sans">{item.label}</span>
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
                      {[
                        { id: 'execucao_central', label: 'Central de Navegação', func: 'painel geral do fiscal', icon: Navigation },
                        { id: 'execucao_cadastro', label: 'Cadastro de Obras', func: 'cadastro', icon: Building2 },
                        { id: 'execucao_contratos', label: 'Contratos', func: 'jurídico/financeiro', icon: ClipboardList },
                        { id: 'execucao_acompanhamento', label: 'Acompanhamento da Obra', func: 'Dashboard, Diário, Vistorias', icon: HardHat },
                        { id: 'execucao_medicoes', label: 'Medições', func: 'financeiro técnico', icon: Layers },
                        { id: 'execucao_ajustes', label: 'Ajustes', func: 'alteração contratual', icon: Calculator },
                        { id: 'execucao_aditivos', label: 'Aditivos', func: 'alterações contratuais', icon: Plus },
                        { id: 'execucao_documentos', label: 'Documentações', func: 'GED', icon: UploadCloud }
                      ].map(item => {
                        const Icon = item.icon;
                        const isActive = activeSubTask === item.id;
                        return (
                          <button
                            key={item.id}
                            id={`subtask-${item.id}`}
                            onClick={() => {
                              setActiveSubTask(item.id);
                              setIdSolicitacaoSelecionada(null);
                            }}
                            className={`w-full flex flex-col items-start gap-0.5 py-1.5 px-2 rounded-lg text-left transition-all duration-150 cursor-pointer ${
                              isActive
                                ? 'bg-blue-50 text-blue-800 font-bold border-l-2 border-blue-600 pl-1.5'
                                : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 w-full">
                              <Icon className={`w-3 h-3 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                              <span className="text-xs font-sans font-bold leading-tight">{item.label}</span>
                            </div>
                            <span className="text-[9px] font-mono font-medium text-slate-450 uppercase tracking-wider pl-4.5 block">
                              {item.func}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 6. ENCERRAMENTO */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleCategory('encerramento')}
                    className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded-md text-left text-[10px] font-black text-slate-500 uppercase tracking-wider font-sans cursor-pointer group"
                  >
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      Encerramento
                    </span>
                    <ChevronDown className={`w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-transform ${collapsedCategories.encerramento ? '-rotate-90' : ''}`} />
                  </button>

                  {!collapsedCategories.encerramento && (
                    <div className="pl-3 border-l border-slate-100 ml-2 space-y-0.5 mt-0.5">
                      {[
                        { id: 'conclusao', label: 'Termo de Conclusão', icon: CheckCircle }
                      ].map(item => {
                        const Icon = item.icon;
                        const isActive = activeSubTask === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveSubTask(item.id);
                              setIdSolicitacaoSelecionada(null);
                            }}
                            className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-left transition-all duration-150 cursor-pointer ${
                              isActive
                                ? 'bg-blue-50 text-blue-855 font-bold border-l-2 border-blue-500 pl-1.5 rounded-r-md'
                                : 'hover:bg-slate-50/70 text-slate-600 pl-1.5'
                            }`}
                          >
                            <Icon className={`w-3 h-3 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                            <span className="text-xs font-sans">{item.label}</span>
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

          {activeModule === 'seguranca' && (
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
                  { id: 'cadastro_enderecos', label: 'Cadastro de Endereços', desc: 'Dossiê geográfico de escolas', icon: MapPin },
                  { id: 'cadastro_escolas', label: 'Cadastro de Escolas SGO', desc: 'Instanciar escolas no fluxo', icon: Building2 },
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

          {activeModule === 'orcamento' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3 mb-2">
                <span className="text-[9px] font-extrabold text-amber-600 uppercase tracking-widest block font-sans">
                  Módulo Ativo
                </span>
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 mt-0.5 font-sans">
                  <Coins className="w-4 h-4 text-slate-700 shrink-0" />
                  Orçamentos (PAF)
                </h3>
              </div>
              <div className="text-center p-4 bg-amber-50/50 border border-amber-100 rounded-lg">
                <Coins className="w-8 h-8 text-amber-500 mx-auto mb-2 animate-bounce" />
                <p className="text-[11px] font-semibold text-amber-800 font-sans leading-relaxed text-center w-full">
                  Finanças & Desembolso
                </p>
                <p className="text-[10px] text-slate-500 mt-1 font-sans text-center w-full">
                  Controle orçamentário integral das demandas de obras em breve.
                </p>
              </div>
            </div>
          )}

          {activeModule === 'imoveis' && (
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
                  { id: 'blank_imoveis', label: 'Cadastro de Próprios', desc: 'Registro de imóveis públicos', icon: Building2 },
                  { id: 'blank_vistorias', label: 'Vistorias & Inspeções', desc: 'Relatório de integridade predial', icon: ClipboardList },
                  { id: 'blank_regularizacao', label: 'Regularização Documental', desc: 'Escrituras e títulos', icon: FileText }
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

          {activeModule === 'abertura_chamados' && (
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
                  Logs e Alertas
                </h3>
              </div>

              <div className="space-y-1.5">
                {[
                  { id: 'visao_geral', label: 'Monitor de Alertas', desc: 'Central de notificações e avisos', icon: Bell },
                  { id: 'logs_auditoria', label: 'Logs de Auditoria', desc: 'Rastreabilidade de alterações', icon: FileClock }
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
                          ? 'bg-blue-50 border border-blue-105 text-blue-800 font-semibold'
                          : 'hover:bg-slate-50 border border-transparent text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
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
        </aside>

        {/* WORKSPACE CENTRAL DE CONTEÚDO */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 sm:p-8 flex flex-col min-w-0">
          
          {activeModule === 'gestao_obras' && activeSubTask === 'paf_acompanhamento' && !idSolicitacaoSelecionada ? (
            <AcompanhamentoPaf
              solicitacoes={solicitacoes}
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
              const schoolsInAutorizacao = solicitacoes.filter(s => s.etapaAtual === 'paf_autorizacao');
              
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
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
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
                        <strong className="font-extrabold block text-amber-950">Ação Restrita: Controle Exclusivo do Gestor Geral (PAF)</strong>
                        <span>O seu perfil de simulação atual é <strong>{perfilUsuario.toUpperCase()}</strong>. Para avaliar, autorizar ou rejeitar as dotações orçamentárias do PAF nesta Etapa 3, por favor mude seu perfil para <strong>Silas Fagundes (Gestor Geral (PAF))</strong> no seletor de usuário (canto superior direito).</span>
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
                        <div className="w-10 h-10 bg-slate-50 border border-slate-150 rounded-full flex items-center justify-center text-slate-450 mx-auto">
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
                                      className="font-bold text-slate-800 text-xs leading-snug hover:text-blue-650 transition-colors pointer-events-auto text-left cursor-pointer"
                                    >
                                      {sol.nomeEscola}
                                    </button>
                                  </td>

                                  {/* SRE */}
                                  <td className="py-4 px-4 text-slate-650">
                                    {sol.sre}
                                  </td>

                                  {/* Município */}
                                  <td className="py-4 px-4 text-slate-650">
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
                                    {perfilUsuario === 'gestor_paf' ? (
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
                                          🔒 Apenas Gestor Geral (PAF)
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
                              <label className="block text-xs font-bold text-slate-650 mb-1">
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
                            <p className="text-xs text-slate-650 leading-relaxed">
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
              const listFiltered = solicitacoes.filter(s => {
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
                analise: 'Atribuição Técnica',
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
                          <label className="text-[10px] uppercase font-black text-slate-450 tracking-wider">ID DE OBRA</label>
                          <select
                            value={filterAnaliseIdText}
                            onChange={(e) => setFilterAnaliseIdText(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-sans font-bold text-slate-750 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Todos os IDs</option>
                            {idsDisponiveis.map(val => (
                              <option key={val} value={val}>{val}</option>
                            ))}
                          </select>
                        </div>

                        {/* CODESC */}
                        <div className="flex flex-col space-y-1">
                          <label className="text-[10px] uppercase font-black text-slate-450 tracking-wider">CODESC</label>
                          <select
                            value={filterAnaliseCodescText}
                            onChange={(e) => setFilterAnaliseCodescText(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-sans font-bold text-slate-750 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Todos os CODESC</option>
                            {codescsDisponiveis.map(val => (
                              <option key={val} value={val}>{val}</option>
                            ))}
                          </select>
                        </div>

                        {/* MUNICÍPIO */}
                        <div className="flex flex-col space-y-1">
                          <label className="text-[10px] uppercase font-black text-slate-450 tracking-wider">MUNICÍPIO</label>
                          <select
                            value={filterAnaliseMunicipioText}
                            onChange={(e) => setFilterAnaliseMunicipioText(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-sans font-bold text-slate-750 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Todos os Municípios</option>
                            {municipiosDisponiveis.map(val => (
                              <option key={val} value={val}>{val}</option>
                            ))}
                          </select>
                        </div>

                        {/* REGIONAL (SRE) */}
                        <div className="flex flex-col space-y-1">
                          <label className="text-[10px] uppercase font-black text-slate-450 tracking-wider">REGIONAL (SRE)</label>
                          <select
                            value={filterAnaliseSreText}
                            onChange={(e) => setFilterAnaliseSreText(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-sans font-bold text-slate-750 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Todas as Regionais</option>
                            {regionaisDisponiveis.map(val => (
                              <option key={val} value={val}>{val}</option>
                            ))}
                          </select>
                        </div>

                        {/* ESCOLA */}
                        <div className="flex flex-col space-y-1 flex-1">
                          <label className="text-[10px] uppercase font-black text-slate-450 tracking-wider">ESCOLA</label>
                          <select
                            value={filterAnaliseEscolaText}
                            onChange={(e) => setFilterAnaliseEscolaText(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-sans font-bold text-slate-750 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Todas as Escolas</option>
                            {escolasDisponiveis.map(val => (
                              <option key={val} value={val}>{val}</option>
                            ))}
                          </select>
                        </div>

                        {/* RESPONSÁVEL */}
                        <div className="flex flex-col space-y-1">
                          <label className="text-[10px] uppercase font-black text-slate-450 tracking-wider">RESPONSÁVEL</label>
                          <select
                            value={filterAnaliseResponsavelText}
                            onChange={(e) => setFilterAnaliseResponsavelText(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-sans font-bold text-slate-750 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Todos os Responsáveis</option>
                            {responsaveisDisponiveis.map(val => (
                              <option key={val} value={val}>{val}</option>
                            ))}
                          </select>
                        </div>

                        {/* DATA DE CRIAÇÃO (Custom style input picker) */}
                        <div className="flex flex-col space-y-1 col-span-2 sm:col-span-1">
                          <label className="text-[10px] uppercase font-black text-slate-450 tracking-wider">DATA DE CRIAÇÃO</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="date"
                              value={filterAnaliseDataInicio}
                              onChange={(e) => setFilterAnaliseDataInicio(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-[10px] font-bold text-slate-750 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <span className="text-slate-400 text-xs">à</span>
                            <input
                              type="date"
                              value={filterAnaliseDataFim}
                              onChange={(e) => setFilterAnaliseDataFim(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-[10px] font-bold text-slate-750 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Row with Select for Atendimento pills */}
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
                        <span className="text-[10px] font-black text-slate-450 tracking-wider uppercase font-mono">
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
                          {activeSubTask === 'conclusao' && 'Proceda com as vistorias finais, emissão de termos e encerramento da obra.'}
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
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-250 text-slate-750 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans cursor-pointer font-bold shadow-xs text-left pr-8 flex items-center justify-between"
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
                                {/* Invisible overlay for clicking outside to close */}
                                <div 
                                  className="fixed inset-0 z-40 cursor-default" 
                                  onClick={() => setIsSelectorOpen(false)} 
                                />
                                
                                <div className="absolute right-0 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-hidden flex flex-col z-50 animate-fade-in shadow-xl">
                                  {/* Search input */}
                                  <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                                    <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <input
                                      type="text"
                                      placeholder="Escreva para procurar o CODESC..."
                                      value={schoolSearchQuery}
                                      onChange={(e) => setSchoolSearchQuery(e.target.value)}
                                      autoFocus
                                      className="w-full bg-transparent border-none text-xs text-slate-750 focus:outline-none focus:ring-0 font-sans font-semibold placeholder-slate-400"
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

                                  {/* Filtered results */}
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
                        hideTransitionButtons={activeSubTask !== 'continuar_preenchimento'}
                        hideTabs={true}
                        activeSubTask={activeSubTask}
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
            />
          ) : (
            <div className="w-full flex-1 flex flex-col">
              
              {/* VISTAS DE ACORDO COM O MÓDULO ATIVO */}
              {activeModule === 'gestao_obras' && (
                <div className="w-full flex flex-col flex-1">


                  {activeSubTask === 'novo_atendimento' ? (
                    <NovoAtendimentoPanel
                      solicitacoes={solicitacoes}
                      onSolicitacaoCriada={(nova) => {
                        setSolicitacoes(prev => [nova, ...prev]);
                        setActiveSubTask('cadastro');
                      }}
                      onUpdateSolicitacao={handleUpdateSolicitacao}
                      usuariosSeguranca={usuariosSeguranca}
                      onEdit={setSolicitacaoEmEdicao}
                      perfilUsuario={perfilUsuario}
                      atendimentoEmEdicaoDirect={atendimentoEmEdicaoDirect}
                      onLimparEdicaoDirect={() => setAtendimentoEmEdicaoDirect(null)}
                    />
                  ) : activeSubTask === 'analise_atribuicao' ? (
                    viewMode === 'lista' ? (
                      <AtribuicaoPanel
                        solicitacoes={solicitacoes}
                        onUpdateSolicitacao={handleUpdateSolicitacao}
                        usuariosSeguranca={usuariosSeguranca}
                        atribuicoes={atribuicoesEngenharia}
                        onAssign={(solId, usrId) => {
                          setAtribuicoesEngenharia(prev => ({ ...prev, [solId]: usrId }));
                        }}
                        viewMode={viewMode}
                        onMudarViewMode={(mode) => setViewMode(mode)}
                        perfilUsuario={perfilUsuario}
                      />
                    ) : (
                      <KanbanViews
                        solicitacoes={solicitacoes}
                        onSelect={handleSelectSolicitacao}
                        perfilUsuario={perfilUsuario}
                        onUpdate={handleUpdateSolicitacao}
                        onDelete={handleDeleteSolicitacao}
                        onEdit={setSolicitacaoEmEdicao}
                        mode={viewMode === 'kanban_analista' ? 'usuario' : 'status'}
                        viewMode={viewMode}
                        onMudarViewMode={(mode) => setViewMode(mode)}
                        onNovaSolicitacao={() => setAbrirModalCadastro(true)}
                        activeSubTask={activeSubTask}
                      />
                    )
                  ) : activeSubTask === 'execucao_central' ? (
                    <CentralNavegacaoObras
                      solicitacoes={solicitacoes}
                      perfilUsuario={perfilUsuario}
                      setActiveSubTask={setActiveSubTask}
                    />
                  ) : activeSubTask.startsWith('execucao_') ? (
                    <ExecucaoSubmodulos
                      activeSubTask={activeSubTask}
                      solicitacoes={solicitacoes}
                      onUpdate={handleUpdateSolicitacao}
                      perfilUsuario={perfilUsuario}
                      onSelect={(sol) => handleSelectSolicitacao(sol)}
                      empresasSeguranca={empresasSeguranca}
                      setActiveSubTask={setActiveSubTask}
                    />
                  ) : activeSubTask.startsWith('relat_') ? (
                    <RelatoriosPanel
                      activeReportType={activeSubTask}
                      solicitacoes={solicitacoes}
                    />
                  ) : activeSubTask === 'visao_geral' ? (
                    <VisaoGeralDashboard
                      solicitacoes={solicitacoes}
                      onSelectSchool={(sol) => handleSelectSolicitacao(sol)}
                      onNavigateToSubTask={(subTask) => setActiveSubTask(subTask)}
                    />
                  ) : viewMode === 'lista' ? (
                    <Dashboard
                      solicitacoes={solicitacoes.filter(s => {
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
                      onMudarPerfil={(perf) => setPerfilUsuario(perf)}
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
                    />
                  ) : (
                    <KanbanViews
                      solicitacoes={solicitacoes.filter(s => {
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

              {activeModule === 'seguranca' && (
                <div className="w-full flex-1 flex flex-col space-y-6 text-left">
                  
                  {/* SUBTASK CADASTRO DE USUÁRIO */}
                  {activeSubTask === 'cadastro_usuario' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-3xs text-left">
                        <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                          <UserPlus className="w-5 h-5 text-rose-650 text-rose-600 shrink-0" />
                          Cadastro de Usuário Simulado (Níveis de Acesso)
                        </h2>
                        <p className="text-xs text-slate-500 mb-6">
                          Adicione novas credenciais para simular papéis concorrentes (Técnicos SRE, Analistas DORE, Engenheiros e Fiscais de Obra) nas validações e auditorias do GESTO.
                        </p>

                        <form onSubmit={handleCadastrarUsuario} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              Nome Completo *
                            </label>
                            <input
                              type="text"
                              required
                              value={usrNome}
                              onChange={(e) => setUsrNome(e.target.value)}
                              placeholder="ex: Eng. Roberto Carlos"
                              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              E-mail Institucional *
                            </label>
                            <input
                              type="email"
                              required
                              value={usrEmail}
                              onChange={(e) => setUsrEmail(e.target.value)}
                              placeholder="ex: roberto.carlos@sre.mg.gov.br"
                              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              Perfil de Atribuição (Role) *
                            </label>
                            <select
                              value={usrPerfil}
                              onChange={(e) => setUsrPerfil(e.target.value as PerfilUsuario)}
                              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-505 focus:border-rose-500 outline-hidden cursor-pointer"
                            >
                              <option value="tecnico_infra">Técnico de Infraestrutura (SRE)</option>
                              <option value="gestor_dore">Gestor Atendimento (DORE)</option>
                              <option value="analista_dore">Analista de Engenharia (DORE)</option>
                              <option value="gestor_paf">Gestor Geral Plano (SAF/PAF)</option>
                              <option value="administrativo_dore">Administrativo DORE</option>
                              <option value="fiscal_obra">Fiscal de Obra de Campo</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              Departamento / SRE *
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                required
                                value={usrDepto}
                                onChange={(e) => setUsrDepto(e.target.value)}
                                placeholder="ex: SRE Patos de Minas"
                                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden"
                              />
                              <button
                                type="submit"
                                className="px-4 py-2 bg-rose-650 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center whitespace-nowrap"
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
                            Lista de Usuários no Sistema ({usuariosSeguranca.length})
                          </h3>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase bg-slate-50 text-left">
                                <th className="py-2.5 px-4 w-12">Iniciais</th>
                                <th className="py-2.5 px-4 font-sans">Usuário</th>
                                <th className="py-2.5 px-4 font-sans">E-mail</th>
                                <th className="py-2.5 px-4 font-sans">Perfil / Alçada SGO</th>
                                <th className="py-2.5 px-4 font-sans">SRE / Local</th>
                                <th className="py-2.5 px-4 font-sans text-center">Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {usuariosSeguranca.map(u => (
                                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/20 text-xs text-left">
                                  <td className="py-3 px-4">
                                    <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-extrabold text-slate-600">
                                      {u.nome.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 font-bold text-slate-700">{u.nome}</td>
                                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{u.email}</td>
                                  <td className="py-3 px-4">
                                    <span className={`px-2 py-0.5 rounded text-[10.5px] font-extrabold ${
                                      u.perfil === 'tecnico_infra' ? 'bg-amber-100 text-amber-850' :
                                      u.perfil === 'gestor_dore' ? 'bg-indigo-100 text-indigo-850' :
                                      u.perfil === 'analista_dore' ? 'bg-blue-100 text-blue-850' :
                                      u.perfil === 'gestor_paf' ? 'bg-cyan-100 text-cyan-850' :
                                      u.perfil === 'administrativo_dore' ? 'bg-purple-100 text-purple-850' :
                                      'bg-emerald-100 text-emerald-850'
                                    }`}>
                                      {u.perfil.toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-slate-600 font-medium">{u.departamento}</td>
                                  <td className="py-3 px-4 text-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setUsuariosSeguranca(usuariosSeguranca.filter(usr => usr.id !== u.id));
                                      }}
                                      className="text-[14px] leading-none hover:scale-110 active:scale-95 transition-all text-slate-400 hover:text-red-600 hover:text-red-500 cursor-pointer p-1"
                                      title="Remover usuário"
                                    >
                                      🗑️
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUBTASK CADASTRO DE ENDEREÇOS */}
                  {activeSubTask === 'cadastro_enderecos' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-3xs text-left">
                        <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-rose-650 text-rose-600 shrink-0" />
                          Cadastro de Endereços de Escolas (Dossiê de Infraestrutura)
                        </h2>
                        <p className="text-xs text-slate-500 mb-6">
                          Mapeie os endereços oficiais das escolas estaduais para subsidiar estudos de microplanejamento, regularização de imóvel no checklist e segurança preventiva na contratação física.
                        </p>

                        <form onSubmit={handleCadastrarEndereco} className="grid grid-cols-1 md:grid-cols-6 gap-3">
                          <div className="md:col-span-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              CEP *
                            </label>
                            <input
                              type="text"
                              required
                              value={endCep}
                              onChange={(e) => setEndCep(e.target.value)}
                              placeholder="ex: 38700-000"
                              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              Rua/Avenida *
                            </label>
                            <input
                              type="text"
                              required
                              value={endRua}
                              onChange={(e) => setEndRua(e.target.value)}
                              placeholder="ex: Avenida Afonso Pena"
                              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden"
                            />
                          </div>

                          <div className="md:col-span-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              Número
                            </label>
                            <input
                              type="text"
                              value={endNum}
                              onChange={(e) => setEndNum(e.target.value)}
                              placeholder="ex: 1200 ou S/N"
                              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden"
                            />
                          </div>

                          <div className="md:col-span-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              Bairro
                            </label>
                            <input
                              type="text"
                              value={endBairro}
                              onChange={(e) => setEndBairro(e.target.value)}
                              placeholder="ex: Centro"
                              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden"
                            />
                          </div>

                          <div className="md:col-span-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              Cidade *
                            </label>
                            <input
                              type="text"
                              required
                              value={endCidade}
                              onChange={(e) => setEndCidade(e.target.value)}
                              placeholder="ex: Patos de Minas"
                              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden"
                            />
                          </div>

                          <div className="md:col-span-4">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              Vincular com Escola cadastrada no GESTO SGO
                            </label>
                            <select
                              value={endEscola}
                              onChange={(e) => setEndEscola(e.target.value)}
                              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden cursor-pointer"
                            >
                              <option value="">Geral / Sem vínculo específico</option>
                              {solicitacoes.map(sol => (
                                <option key={sol.id} value={sol.nomeEscola}>{sol.nomeEscola} (CODESC: {sol.codesc})</option>
                              ))}
                            </select>
                          </div>

                          <div className="md:col-span-2 flex items-end">
                            <button
                              type="submit"
                              className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                              Salvar Endereço
                            </button>
                          </div>
                        </form>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-3xs">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 text-left">
                          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Endereços de Unidades Escolares ({enderecosSeguranca.length})
                          </h3>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase bg-slate-50 text-left">
                                <th className="py-2.5 px-4 w-20">ID</th>
                                <th className="py-2.5 px-4">Escola Vinculada SGO</th>
                                <th className="py-2.5 px-4 font-sans">Endereço Completo</th>
                                <th className="py-2.5 px-4 font-sans">Cidade</th>
                                <th className="py-2.5 px-4 font-sans">CEP</th>
                                <th className="py-2.5 px-4 text-center font-sans">Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {enderecosSeguranca.map(e => (
                                <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50/20 text-xs text-left">
                                  <td className="py-3 px-4 font-bold text-slate-600 font-mono text-[10px]">{e.id}</td>
                                  <td className="py-3 px-4 font-bold text-rose-800">🏫 {e.escola}</td>
                                  <td className="py-3 px-4 text-slate-700 font-medium">
                                    {e.rua}, Nº {e.numero}, {e.bairro}
                                  </td>
                                  <td className="py-3 px-4 text-slate-500 font-semibold">{e.cidade} (MG)</td>
                                  <td className="py-3 px-4 text-slate-550 font-mono text-[11px]">{e.cep}</td>
                                  <td className="py-3 px-4 text-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEnderecosSeguranca(enderecosSeguranca.filter(end => end.id !== e.id));
                                      }}
                                      className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer p-1"
                                      title="Remover endereço"
                                    >
                                      🗑️
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUBTASK CADASTRO DE ESCOLAS COMPLETO */}
                  {activeSubTask === 'cadastro_escolas' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-3xs text-left">
                        <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-rose-650 text-rose-600 shrink-0" />
                          Cadastro Oficial de Nova Escola no Sistema SGO
                        </h2>
                        <p className="text-xs text-slate-500 mb-6">
                          Insira as informações técnicas e tributárias de uma nova unidade escolar. Ao cadastrar, uma nova demanda é gerada automaticamente no módulo de <strong className="font-semibold text-blue-600">Gestão de Obras</strong> para dar início imediato ao instrução de documentos obrigatórios.
                        </p>

                        <form onSubmit={handleCadastrarEscolaCompleto} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Nome da Escola *
                              </label>
                              <input
                                type="text"
                                required
                                value={escNome}
                                onChange={(e) => setEscNome(e.target.value)}
                                placeholder="ex: E.E. Padre Almir Neves"
                                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Código CODESC (8 dígitos) *
                              </label>
                              <input
                                type="text"
                                required
                                maxLength={8}
                                value={escCodesc}
                                onChange={(e) => setEscCodesc(e.target.value.replace(/\D/g, ''))}
                                placeholder="ex: 12345678"
                                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden font-mono"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Município *
                              </label>
                              <input
                                type="text"
                                required
                                value={escMunicipio}
                                onChange={(e) => setEscMunicipio(e.target.value)}
                                placeholder="ex: Patos de Minas"
                                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                SRE Vinculada *
                              </label>
                              <select
                                value={escSre}
                                onChange={(e) => setEscSre(e.target.value)}
                                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden cursor-pointer"
                              >
                                <option value="SRE Patos de Minas">SRE Patos de Minas</option>
                                <option value="SRE Metropolitana A">SRE Metropolitana A</option>
                                <option value="SRE Metropolitana B">SRE Metropolitana B</option>
                                <option value="SRE Montes Claros">SRE Montes Claros</option>
                                <option value="SRE Juiz de Fora">SRE Juiz de Fora</option>
                                <option value="SRE Governador Valadares">SRE Governador Valadares</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Tipo de Prédio *
                              </label>
                              <select
                                value={escPredio}
                                onChange={(e) => setEscPredio(e.target.value)}
                                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden cursor-pointer"
                              >
                                <option value="Próprio Estadual">Próprio Estadual</option>
                                <option value="Cedido pelo Município">Cedido pelo Município</option>
                                <option value="Alugado">Alugado</option>
                                <option value="Parceria / Mutirão">Parceria / Mutirão</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Tipo de Atendimento *
                              </label>
                              <select
                                value={escAtendimento}
                                onChange={(e) => setEscAtendimento(e.target.value)}
                                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden cursor-pointer"
                              >
                                <option value="Atendimento Direto">Atendimento Direto</option>
                                <option value="Ensino Integral">Ensino Integral</option>
                                <option value="Ensino Profissionalizante">Ensino Profissionalizante</option>
                                <option value="Educação Especial">Educação Especial</option>
                              </select>
                            </div>

                            <div className="md:col-span-3">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Compartilhamento com Outro Órgão (🎒 Sobre Atendimento) *
                              </label>
                              <input
                                type="text"
                                required
                                value={escOrgao}
                                onChange={(e) => setEscOrgao(e.target.value)}
                                placeholder="ex: Exclusivo Estadual, Compartilhado com Município, etc."
                                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-hidden"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end pt-2">
                            <button
                              type="submit"
                              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                              <Building2 className="w-4 h-4" />
                              <span>Instanciar nova Escola no SGO</span>
                            </button>
                          </div>
                        </form>
                      </div>

                      <div className="bg-rose-50 border border-rose-100 rounded-xl p-5 flex items-start gap-3">
                        <span className="text-xl">💡</span>
                        <div className="text-left">
                          <h4 className="text-xs font-bold text-rose-800 mb-1">
                            Sincronização Ativa de Fluxo Escolar
                          </h4>
                          <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                            Ao instanciar a escola através deste painel de Segurança, ela é imediatamente injetada na <strong className="font-semibold text-blue-600">Gestão de Obras (Visão Geral)</strong>. Isso possibilita que a equipe de engenharia e vistoria administrativa comece o checklist documental instantaneamente.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUBTASK CADASTRO DE EMPRESAS */}
                  {activeSubTask === 'cadastro_empresas' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-3xs text-left">
                        <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                          <Building className="w-5 h-5 text-rose-650 text-rose-650 shrink-0" />
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
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEmpresasSeguranca(empresasSeguranca.filter(e => e.id !== emp.id));
                                      }}
                                      className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer p-1"
                                      title="Remover Empresa"
                                    >
                                      🗑️
                                    </button>
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

              {activeModule === 'orcamento' && (
                <div className="flex-1 flex flex-col items-center justify-center py-16 text-center select-none animate-in fade-in duration-205">
                  <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100 mb-4 animate-bounce">
                    <Coins className="w-8 h-8 text-amber-600" />
                  </div>
                  <h2 className="text-base font-bold text-slate-800 font-sans">
                    Módulo de Planejamento de Orçamentos (Em Construção)
                  </h2>
                  <p className="text-xs text-slate-500 max-w-sm mt-1.5 font-sans leading-relaxed text-center">
                    Este espaço integrará os convênios governamentais e dotações orçamentárias associadas ao Plano de Atendimento Financeiro (PAF). 
                    Nele, analistas de finanças governamentais poderão acompanhar a alocação de créditos de empenho e cronogramas de desembolso financeiro regional.
                  </p>
                  <div className="mt-6 flex gap-2">
                    <span className="px-2.5 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 font-mono">
                      v1.2.0-planned
                    </span>
                    <span className="px-2.5 py-1 bg-amber-100 rounded-full text-[10px] font-bold text-amber-700 font-sans">
                      DORE Financeiro
                    </span>
                  </div>
                </div>
              )}

              {activeModule === 'imoveis' && (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center select-none animate-in fade-in duration-200">
                  <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center border border-teal-100 mb-4 animate-bounce">
                    <Building className="w-8 h-8 text-teal-600" />
                  </div>
                  <h2 className="text-base font-bold text-slate-800 font-sans">
                    Módulo de Patrimônio & Imóveis (Em Construção)
                  </h2>
                  <p className="text-xs text-slate-500 max-w-lg mt-1.5 font-sans leading-relaxed text-center">
                    Espaço reservado para o dossiê imobiliário completo da Rede Estadual de Ensino de Minas Gerais. 
                    Aqui será possível registrar títulos de propriedade, escrituras públicas, certidões de regularização municipal e o mapeamento de áreas disponíveis para novas construções ou ampliações.
                  </p>

                  <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full text-left">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-3xs hover:border-teal-200 transition-all">
                      <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center text-teal-600 font-bold mb-3 text-xs">
                        01
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 mb-1 font-sans">Dossiê e Registro</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                        Armazenamento e checklist de escrituras públicas, certidões e termos de cessão de uso com as prefeituras parceiras.
                      </p>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-3xs hover:border-teal-200 transition-all">
                      <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 font-bold mb-3 text-xs">
                        02
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 mb-1 font-sans">Vistorias Prediais</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                        Fichas de conferência física, laudos de integridade estrutural e acompanhamento preventivo das edificações escolares.
                      </p>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-3xs hover:border-teal-200 transition-all">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-bold mb-3 text-xs">
                        03
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 mb-1 font-sans">Georreferenciamento</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                        Mapeamento geográfico das escolas por SRE e cruzamento com índices de adensamento demográfico regional.
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 flex gap-2">
                    <span className="px-2.5 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 font-mono">
                      v1.4.0-planned
                    </span>
                    <span className="px-2.5 py-1 bg-teal-100 rounded-full text-[10px] font-bold text-teal-700 font-sans">
                      DORE Desenvolvimento
                    </span>
                  </div>
                </div>
              )}

              {activeModule === 'abertura_chamados' && (
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
                <CentralNotificacoesLogs
                  notifications={notifications}
                  logs={logs}
                  solicitacoes={solicitacoes}
                  perfilUsuario={perfilUsuario}
                  onSelectSolicitacao={(id, subTask) => {
                    const sol = solicitacoes.find(s => s.id === id);
                    if (sol) {
                      handleSelectSolicitacao(sol);
                      if (subTask) setActiveSubTask(subTask);
                    }
                  }}
                  onMarkAsRead={(id) => {
                    const updated = notifications.map(n => n.id === id ? { ...n, lida: true } : n);
                    setNotifications(updated);
                    localStorage.setItem('sgo_notifications', JSON.stringify(updated));
                  }}
                  onMarkAllAsRead={() => {
                    const lidas = notifications.map(n => ({ ...n, lida: true }));
                    setNotifications(lidas);
                    localStorage.setItem('sgo_notifications', JSON.stringify(lidas));
                  }}
                  onClearNotifications={() => {
                    setNotifications([]);
                    localStorage.setItem('sgo_notifications', JSON.stringify([]));
                  }}
                  onAddSimulatedLog={(action, detail, tipo) => {
                    registrarLog(action, detail, tipo);
                  }}
                />
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

      {/* MODAL CO-CRIADOR DE SOLICITAÇÃO */}
      {abrirModalCadastro && (
        <NovaSolicitacaoModal
          onClose={() => setAbrirModalCadastro(false)}
          onSave={handleNovaSolicitacao}
          perfilUsuario={perfilUsuario}
          usuariosSeguranca={usuariosSeguranca}
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
