import React, { useState, useRef, useEffect } from 'react';
import { Solicitacao, EtapaProcesso, PerfilUsuario, DocumentoChecklist, UsuarioSistema, ParcelaPAF, montarChecklistGED } from '../types';
import { CHECKLIST_PADRAO } from '../initialData';
import { supabase } from '../lib/supabase';
import { gerarParecerIA } from './GeradorParecerIA';
import ProcessAnalysisPanel from './ProcessAnalysisPanel';
import { SECOES_DADOS_GERAIS, SECAO_LABEL, getStatusSecoes, capturarSnapshotTecnico } from '../utils/validacaoTecnica';
import { ETAPA_LABEL, processoAindaModificavel, getEtapasAnteriores } from '../utils/etapas';
import { calcularSlaCorrente, STATUS_SLA_INFO, formatarDuracaoHoras } from '../utils/sla';
import { podeHomologarComAuxiliares, auxiliaresPendentes } from '../utils/auxiliares';
import PainelParecerAuxiliar from './PainelParecerAuxiliar';
import {
  ArrowLeft, Calendar, FileText, CheckCircle, XCircle, AlertCircle, AlertTriangle, TrendingUp,
  UploadCloud, Sparkles, DollarSign, Building, Plus, Trash2,
  ChevronRight, RefreshCw, Layers, Shield, FileCheck, HardHat, Info, UserCheck, User, History, Paperclip, Play,
  Download, Undo2, Ban, Lock
} from 'lucide-react';

const cnpjCaixaEscolarMap: Record<string, string> = {
  '304556': '18.283.476/0001-22',
  '201948': '23.456.789/0001-01',
  '109923': '34.567.890/0001-12',
  '302488': '45.678.901/0001-23',
  '315664': '56.789.012/0001-34',
  '145236': '12.283.476/0001-55',
  '102547': '01.234.567/0001-78',
  '128914': '32.145.678/0001-90',
  '189652': '65.432.190/0001-44',
  '154784': '76.543.210/0001-67',
};

const JUSTIFICATIVA_RECUSA_PADRAO = 'Ajuste ou complementação de documento técnica pendente.';

const getValorScore = (valor: number): { score: number; label: string } => {
  if (valor > 2000000) return { score: 5, label: 'Acima de R$ 2.000.000 (Peso 5)' };
  if (valor >= 1000000) return { score: 4, label: 'R$ 1.000.000 a R$ 2.000.000 (Peso 4)' };
  if (valor >= 500000) return { score: 3, label: 'R$ 500.000 a R$ 1.000.000 (Peso 3)' };
  if (valor >= 100000) return { score: 2, label: 'R$ 100.000 a R$ 500.000 (Peso 2)' };
  return { score: 1, label: 'Até R$ 100.000 (Peso 1)' };
};

const getTipoObraScore = (tipo: string): { score: number; label: string } => {
  const normalized = tipo.toLowerCase();
  if (normalized.includes('constru_') || normalized.includes('construc') || normalized.includes('construç')) {
    return { score: 5, label: 'Construção (Peso 5)' };
  }
  if (normalized.includes('amplia') || normalized.includes('quadra')) {
    return { score: 4, label: 'Ampliação / Quadra (Peso 4)' };
  }
  if (normalized.includes('reform')) {
    return { score: 3, label: 'Reforma (Peso 3)' };
  }
  if (normalized.includes('acessi') || normalized.includes('pne')) {
    return { score: 2, label: 'Acessibilidade (Peso 2)' };
  }
  if (normalized.includes('projet') || normalized.includes('estud')) {
    return { score: 1, label: 'Projeto (Peso 1)' };
  }
  return { score: 3, label: 'Reforma/Outros (Peso 3)' };
};

const getDuracaoScore = (meses: number): { score: number; label: string } => {
  if (meses > 12) return { score: 5, label: 'Acima de 12 meses (Peso 5)' };
  if (meses >= 9) return { score: 4, label: '9 a 12 meses (Peso 4)' };
  if (meses >= 6) return { score: 3, label: '6 a 9 meses (Peso 3)' };
  if (meses >= 3) return { score: 2, label: '3 a 6 meses (Peso 2)' };
  return { score: 1, label: 'Até 3 meses (Peso 1)' };
};

const calcularDuracaoMeses = (inicioStr?: string, fimStr?: string): number => {
  if (!inicioStr || !fimStr) return 0;
  try {
    const inicio = new Date(inicioStr + 'T00:00:00');
    const fim = new Date(fimStr + 'T00:00:00');
    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) return 0;
    
    const diffYears = fim.getFullYear() - inicio.getFullYear();
    const diffMonths = fim.getMonth() - inicio.getMonth();
    const diffDays = fim.getDate() - inicio.getDate();
    
    let totalMonths = diffYears * 12 + diffMonths;
    if (diffDays > 15) {
      totalMonths += 1;
    } else if (diffDays < -15) {
      totalMonths -= 1;
    }
    return Math.max(1, totalMonths);
  } catch (e) {
    return 0;
  }
};

const calcularComplexidade = (valor: number, tipo: string, meses: number) => {
  const vInfo = getValorScore(valor);
  const tInfo = getTipoObraScore(tipo);
  const dInfo = getDuracaoScore(meses);

  const pontuacao = (vInfo.score * 0.75) + (tInfo.score * 0.15) + (dInfo.score * 0.10);

  let classe: 'I' | 'II' | 'III' | 'IV' = 'I';
  let classificacao = 'Baixa Complexidade';
  let colorClass = 'text-green-600 bg-green-50 border-green-250';

  if (pontuacao >= 4.2) {
    classe = 'IV';
    classificacao = 'Muito Alta Complexidade';
    colorClass = 'text-rose-600 bg-rose-50 border-rose-250';
  } else if (pontuacao >= 3.2) {
    classe = 'III';
    classificacao = 'Alta Complexidade';
    colorClass = 'text-orange-600 bg-orange-50 border-orange-250';
  } else if (pontuacao >= 2.0) {
    classe = 'II';
    classificacao = 'Média Complexidade';
    colorClass = 'text-amber-600 bg-amber-50 border-amber-250';
  }

  return {
    pontuacao: Number(pontuacao.toFixed(2)),
    classe,
    classificacao,
    colorClass,
    vInfo,
    tInfo,
    dInfo
  };
};

interface SolicitacaoDetalhesProps {
  solicitacao: Solicitacao;
  perfilUsuario: PerfilUsuario;
  onVoltar: () => void;
  onUpdate: (updated: Solicitacao) => void;
  forcedTab?: string;
  hideVoltar?: boolean;
  hideStepper?: boolean;
  hideTransitionButtons?: boolean;
  hideTabs?: boolean;
  activeSubTask?: string;
  usuariosSeguranca?: UsuarioSistema[];
  somenteLeitura?: boolean;
}

export default function SolicitacaoDetalhes({
  solicitacao,
  perfilUsuario,
  onVoltar,
  onUpdate,
  forcedTab,
  hideVoltar = false,
  hideStepper = false,
  hideTransitionButtons = false,
  hideTabs = false,
  activeSubTask,
  usuariosSeguranca = [],
  somenteLeitura = false
}: SolicitacaoDetalhesProps) {
  const analistas = usuariosSeguranca.filter(u => u.perfil === 'analista_dore' || u.perfil === 'admin' || u.perfil === 'diretor_dore');
  const fiscais = usuariosSeguranca.filter(u => u.perfil === 'tecnico_infra' || u.perfil === 'tecnico_infra');
  const currentUserNome = usuariosSeguranca.find(u => u.perfil === perfilUsuario)?.nome || '';
  // Navigation internal view
  const [activeTab, setActiveTab ] = useState<'checklist' | 'paf' | 'ordem_inicio' | 'execucao' | 'ajustes' | 'aditivos' | 'conclusao'>('checklist');
  const [mostrarModalEnviado, setMostrarModalEnviado] = useState(false);
  const [tentouEnviarDore, setTentouEnviarDore] = useState(false);

  // Retorno de Etapa (somente Administrador)
  const [retornoEtapaModalAberto, setRetornoEtapaModalAberto] = useState(false);
  const [etapaDestinoRetorno, setEtapaDestinoRetorno] = useState<EtapaProcesso | ''>('');
  const [motivoRetornoEtapa, setMotivoRetornoEtapa] = useState('');

  // Cancelamento de Processo
  const [solicitarCancelamentoModalAberto, setSolicitarCancelamentoModalAberto] = useState(false);
  const [motivoSolicitarCancelamento, setMotivoSolicitarCancelamento] = useState('');
  const [cancelarProcessoModalAberto, setCancelarProcessoModalAberto] = useState(false);
  const [justificativaCancelamentoFinal, setJustificativaCancelamentoFinal] = useState('');

  // Devolução da Planilha Orçamentária (doc_1) — exige justificativa + arquivo com as marcações do analista
  const [devolucaoModalDocId, setDevolucaoModalDocId] = useState<string | null>(null);
  const [devolucaoJustificativa, setDevolucaoJustificativa] = useState('');
  const [devolucaoArquivo, setDevolucaoArquivo] = useState<{ fileName: string; fileSize: string; fileContent: string; fileType?: string } | null>(null);

  React.useEffect(() => {
    if (forcedTab) {
      setActiveTab(forcedTab as any);
    }
  }, [forcedTab, solicitacao.id]);
  // somenteLeitura sempre vence — usado pela consulta histórica somente-leitura (Atribuição) para
  // garantir que nenhum botão de validação/aprovação fique habilitado, independente de quem está logado.
  const isMyAssignment = !somenteLeitura && (
    perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore' ||
    (perfilUsuario === 'analista_dore' &&
      !!solicitacao.analistaAtribuido &&
      (currentUserNome ? solicitacao.analistaAtribuido === currentUserNome : true))
  );

  // RETORNO DE ETAPA (somente Administrador) — utils/etapas.ts define o limite e as etapas elegíveis.
  const etapasAnterioresDisponiveis = getEtapasAnteriores(solicitacao.etapaAtual);

  const handleAbrirRetornoEtapa = () => {
    setEtapaDestinoRetorno(etapasAnterioresDisponiveis[etapasAnterioresDisponiveis.length - 1] || '');
    setMotivoRetornoEtapa('');
    setRetornoEtapaModalAberto(true);
  };

  const handleConfirmarRetornoEtapa = () => {
    if (!etapaDestinoRetorno || !motivoRetornoEtapa.trim()) return;
    const hoje = new Date();
    const etapaOrigem = solicitacao.etapaAtual;
    const nomeAdmin = currentUserNome || 'Administrador';

    onUpdate({
      ...solicitacao,
      etapaAtual: etapaDestinoRetorno,
      retornosAdministrativos: [
        ...(solicitacao.retornosAdministrativos || []),
        {
          etapaOrigem,
          etapaDestino: etapaDestinoRetorno,
          motivo: motivoRetornoEtapa.trim(),
          usuario: nomeAdmin,
          timestamp: hoje.toISOString()
        }
      ],
      historicoEtapas: [
        ...solicitacao.historicoEtapas,
        { etapa: etapaDestinoRetorno, data: hoje.toISOString().split('T')[0], responsavel: `${nomeAdmin} (Retorno Administrativo)` }
      ]
    });
    setRetornoEtapaModalAberto(false);
  };

  // CANCELAMENTO DE PROCESSO
  const handleAbrirSolicitarCancelamento = () => {
    setMotivoSolicitarCancelamento('');
    setSolicitarCancelamentoModalAberto(true);
  };

  const handleConfirmarSolicitarCancelamento = () => {
    if (!motivoSolicitarCancelamento.trim()) return;
    const hoje = new Date();
    onUpdate({
      ...solicitacao,
      solicitacaoCancelamento: true,
      motivoSolicitacaoCancelamento: motivoSolicitarCancelamento.trim(),
      solicitacaoCancelamentoPor: currentUserNome || 'Téc. Infraestrutura (SRE)',
      solicitacaoCancelamentoData: hoje.toISOString()
    });
    setSolicitarCancelamentoModalAberto(false);
  };

  const handleRetirarSolicitacaoCancelamento = () => {
    onUpdate({
      ...solicitacao,
      solicitacaoCancelamento: false,
      motivoSolicitacaoCancelamento: undefined,
      solicitacaoCancelamentoPor: undefined,
      solicitacaoCancelamentoData: undefined
    });
  };

  const handleAbrirCancelarProcesso = () => {
    setJustificativaCancelamentoFinal('');
    setCancelarProcessoModalAberto(true);
  };

  const handleConfirmarCancelamentoFinal = () => {
    if (!justificativaCancelamentoFinal.trim()) return;
    const hoje = new Date();
    const nomeAdmin = currentUserNome || 'Administrador';
    onUpdate({
      ...solicitacao,
      etapaAtual: 'cancelado',
      motivoCancelamento: justificativaCancelamentoFinal.trim(),
      canceladoPor: nomeAdmin,
      canceladoEm: hoje.toISOString(),
      solicitacaoCancelamento: false,
      historicoEtapas: [
        ...solicitacao.historicoEtapas,
        { etapa: 'cancelado', data: hoje.toISOString().split('T')[0], responsavel: `${nomeAdmin} (Cancelamento Executado)` }
      ]
    });
    setCancelarProcessoModalAberto(false);
  };

  const handleNegarSolicitacaoCancelamento = () => {
    onUpdate({
      ...solicitacao,
      solicitacaoCancelamento: false
    });
    setCancelarProcessoModalAberto(false);
  };

  const handleDownloadDocument = (fileName: string, label: string) => {
    const textContent = `--- Governo do Estado de Minas Gerais ---
Secretaria de Estado de Educação (SEE-MG)

DOCUMENTO: ${label}
ARQUIVO ORIGEM: ${fileName}
DATA DE CONSULTA: ${new Date().toLocaleDateString('pt-BR')}

Este é um arquivo auxiliar gerado dinamicamente para simulação do processo físico-financeiro de obras e faturamento de dotação do PAF e SGO. Todas as validações foram formalizadas eletronicamente via fluxo de trabalho.

----------------------------------------
Plataforma e-SGO - SEE-MG`;
    
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Baixa o conteúdo real do documento do checklist (anexado via FileReader no upload); cai no simulado se for um doc antigo sem conteúdo salvo
  const handleDownloadDoc = (doc: DocumentoChecklist) => {
    if (!doc.fileContent) {
      handleDownloadDocument(doc.fileName || 'documento', doc.nome);
      return;
    }
    const link = document.createElement('a');
    link.href = doc.fileContent;
    link.setAttribute('download', doc.fileName || 'documento');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // States for file uploads simulation
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  
  // State for rejecting document (modal / input trigger)
  const [justificativaFields, setJustificativaFields] = useState<{ [key: string]: string }>({});

  // General execution state
  const [empresaInput, setEmpresaInput] = useState(solicitacao.empresaContratada || '');
  const [cnpjInput, setCnpjInput] = useState(solicitacao.cnpjEmpresa || '');
  const [statusContratoInput, setStatusContratoInput] = useState(solicitacao.statusContratoEmpresa || 'Ativa');
  const [statusObraInput, setStatusObraInput] = useState(solicitacao.statusObra || 'Não Iniciada');

  // Replacement company state (Distrato)
  const [novoEmpresaNome, setNovoEmpresaNome] = useState('');
  const [novoEmpresaCnpj, setNovoEmpresaCnpj] = useState('');
  const [mostrandoNovaEmpresa, setMostrandoNovaEmpresa] = useState(false);

  // States for Distrato and Paralysation details
  const [justificativaDistratoInput, setJustificativaDistratoInput] = useState(solicitacao.justificativaDistrato || 'Planilha de orçamento defasada');
  const [dataDistratoInput, setDataDistratoInput] = useState(solicitacao.dataDistrato || '');
  const [documentoDistratoFileName, setDocumentoDistratoFileName] = useState(solicitacao.documentoDistratoFileName || '');
  const [documentoDistratoFileSize, setDocumentoDistratoFileSize] = useState(solicitacao.documentoDistratoFileSize || '');
  const [documentoDistratoUploadedAt, setDocumentoDistratoUploadedAt] = useState(solicitacao.documentoDistratoUploadedAt || '');

  const [dataParalizacaoInput, setDataParalizacaoInput] = useState(solicitacao.dataParalizacao || '');
  const [justificativaParalizacaoInput, setJustificativaParalizacaoInput] = useState(solicitacao.justificativaParalizacao || 'Aguardando diretor da cx escolar realizar notificação empresa');

  // State for Fiscal assigned in Ordem de Início
  const [fiscalObraAtribuidoInput, setFiscalObraAtribuidoInput] = useState(solicitacao.cadastroObraConfirmado ? (solicitacao.fiscalObraAtribuido || '') : '');

  // File Input Ref for Distrato document
  const distratoInputRef = useRef<HTMLInputElement | null>(null);

  // Aditivos Process states
  const [selectedAditivoId, setSelectedAditivoId] = useState<string | null>(null);
  const [novoAditivoNumero, setNovoAditivoNumero] = useState('');
  const [aditivoDocName, setAditivoDocName] = useState('');
  const [aditivoAnalista, setAditivoAnalista] = useState('');


  // Upload real de documento — lê o conteúdo do arquivo (base64) via FileReader para permitir download posterior pelo analista
  const handleSimulatedUpload = (docId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const targetDoc = solicitacao.documentos.find(d => d.id === docId);
    if (targetDoc?.status === 'aprovado') {
      alert('Este documento já foi validado e aprovado anteriormente pela DORE. Não é permitido substituir um arquivo aprovado.');
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    const sizeFormatted = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    const reader = new FileReader();
    reader.onload = (ev) => {
      const fileContent = ev.target?.result as string;
      const updatedDocs = solicitacao.documentos.map(doc => {
        if (doc.id === docId) {
          return {
            ...doc,
            fileName: file.name,
            fileSize: sizeFormatted,
            fileContent,
            fileType: file.type || undefined,
            uploadedAt: new Date().toISOString().split('T')[0],
            status: 'pendente' as const, // resets to pending check
            justificativa: undefined
          };
        }
        return doc;
      });

      onUpdate({
        ...solicitacao,
        documentos: updatedDocs
      });
    };
    reader.readAsDataURL(file);
  };

  const handleTriggerUpload = (docId: string) => {
    const targetDoc = solicitacao.documentos.find(d => d.id === docId);
    if (targetDoc?.status === 'aprovado') {
      alert('Este documento já foi validado e aprovado anteriormente pela DORE. Ele não pode ser substituído.');
      return;
    }
    fileInputRefs.current[docId]?.click();
  };

  // Devolução da Planilha Orçamentária: justificativa + arquivo com as marcações do analista são obrigatórios
  const abrirModalDevolucao = (docId: string) => {
    setDevolucaoModalDocId(docId);
    setDevolucaoJustificativa('');
    setDevolucaoArquivo(null);
  };

  const cancelarDevolucao = () => {
    setDevolucaoModalDocId(null);
    setDevolucaoJustificativa('');
    setDevolucaoArquivo(null);
  };

  const handleDevolucaoArquivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeFormatted = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    const reader = new FileReader();
    reader.onload = (ev) => {
      const fileContent = ev.target?.result as string;
      setDevolucaoArquivo({ fileName: file.name, fileSize: sizeFormatted, fileContent, fileType: file.type || undefined });
    };
    reader.readAsDataURL(file);
  };

  const confirmarDevolucao = () => {
    const justificativa = devolucaoJustificativa.trim();
    if (!devolucaoModalDocId || !devolucaoArquivo || !justificativa || justificativa === JUSTIFICATIVA_RECUSA_PADRAO) return;
    const docId = devolucaoModalDocId;
    const updatedDocs = solicitacao.documentos.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          status: 'recusado' as const,
          justificativa,
          arquivoDevolucaoFileName: devolucaoArquivo.fileName,
          arquivoDevolucaoFileSize: devolucaoArquivo.fileSize,
          arquivoDevolucaoFileContent: devolucaoArquivo.fileContent,
          arquivoDevolucaoFileType: devolucaoArquivo.fileType,
          arquivoDevolucaoUploadedAt: new Date().toISOString().split('T')[0],
        };
      }
      return doc;
    });
    onUpdate({ ...solicitacao, documentos: updatedDocs });
    cancelarDevolucao();
  };

  const handleDownloadArquivoDevolucao = (doc: DocumentoChecklist) => {
    if (!doc.arquivoDevolucaoFileContent) return;
    const link = document.createElement('a');
    link.href = doc.arquivoDevolucaoFileContent;
    link.setAttribute('download', doc.arquivoDevolucaoFileName || 'devolucao.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const removerDocumento = (docId: string) => {
    const targetDoc = solicitacao.documentos.find(d => d.id === docId);
    if (targetDoc?.status === 'aprovado') {
      alert('Este documento já foi validado e aprovado anteriormente pela DORE. Ele não pode ser removido.');
      return;
    }

    const updatedDocs = solicitacao.documentos.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          fileName: undefined,
          fileSize: undefined,
          uploadedAt: undefined,
          status: 'pendente' as const,
          justificativa: undefined
        };
      }
      return doc;
    });

    onUpdate({
      ...solicitacao,
      documentos: updatedDocs
    });
  };

  // Helper to bundle all document reviews together into a single cohesive technical statement
  const gerarParecerConsolidadoTudo = (updatedDocs: DocumentoChecklist[], count: number) => {
    const analisesValidas = updatedDocs
      .map((d, index) => {
        let estStatus = 'PENDENTE DE AVALIAÇÃO';
        if (d.status === 'aprovado') estStatus = '✓ APROVADO / VALIDADO';
        if (d.status === 'recusado') estStatus = '❌ REJEITADO / PENDENTE';
        if (d.status === 'nao_se_aplica') estStatus = 'ℹ️ NÃO SE APLICA';
        
        const textoAnalise = d.justificativa ? d.justificativa.trim() : 'Nenhuma observação técnica cadastrada.';
        return `• [Documento ${index + 1}] ${d.nome}\n  Status técnico: ${estStatus}\n  Parecer individual: "${textoAnalise}"`;
      })
      .join('\n\n');

    const totalPendencias = updatedDocs.filter(d => d.status === 'recusado').length;
    const dataHoraAnalise = new Date().toLocaleString('pt-BR');

    return `PARECER TÉCNICO CONSOLIDADO DE ENGENHARIA (DORE)
--------------------------------------------------
ID Solicitação: ${solicitacao.id}
Escola: ${solicitacao.nomeEscola} (CODESC: ${solicitacao.codesc})
Analista Responsável: Eng. André Silva (Analista de Engenharia DORE)
Data/Hora de Emissão: ${dataHoraAnalise}
Entradas/Rodadas de Análise acumuladas: ${count} ciclos
Total de Itens com Pendência Técnica: ${totalPendencias} item(ns)

DETALHAMENTO DA AVALIAÇÃO DO CHECKLIST DOCUMENTAL:
${analisesValidas}

--------------------------------------------------
CONCLUSÃO TÉCNICA CONSOLIDADA:
${totalPendencias > 0 
  ? `REPROVADO / COM REQUISITOS DE AJUSTE. O dossier possui ${totalPendencias} item(ns) inadequado(s). O técnico da SRE deve providenciar as correções e submeter novamente.`
  : `APROVADO TOTALMENTE. Toda a documentação técnica foi verificada e validada em conformidade técnica de engenharia da DORE. Liberado para a etapa de Geração e Homologação de PAF.`
}`;
  };

  // Engineer document decision
  const setDocumentStatus = (docId: string, status: 'aprovado' | 'recusado' | 'nao_se_aplica', justificativa?: string) => {
    const updatedDocs = solicitacao.documentos.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          status,
          justificativa: justificativa !== undefined ? justificativa : (doc.justificativa || (status === 'aprovado' ? 'Documento verificado e validado em conformidade.' : status === 'recusado' ? 'Ajuste ou complementação de documento técnica pendente.' : 'Dispensado.'))
        };
      }
      return doc;
    });

    onUpdate({
      ...solicitacao,
      documentos: updatedDocs
    });
  };

  // AI analysis click
  const handleAISmartAnalysis = (docId: string) => {
    const doc = solicitacao.documentos.find(d => d.id === docId);
    if (!doc || !doc.fileName) return;

    const { statusRecomendado, justificativa } = gerarParecerIA(doc, solicitacao.nomeEscola);
    setJustificativaFields(prev => ({ ...prev, [docId]: justificativa }));
    setDocumentStatus(docId, statusRecomendado, justificativa);
  };

  // Bulk simulated DORE review - helps demonstrate app quickly!
  const reviewAllWithIA = () => {
    const updatedDocs = solicitacao.documentos.map(doc => {
      if (!doc.fileName) {
        // can't review an empty doc
        return doc;
      }
      const { statusRecomendado, justificativa } = gerarParecerIA(doc, solicitacao.nomeEscola);
      return {
        ...doc,
        status: statusRecomendado,
        justificativa: justificativa || (statusRecomendado === 'aprovado' ? 'Documento em conformidade e validado.' : 'Necessita detalhar ou complementar pendência.')
      };
    });

    onUpdate({
      ...solicitacao,
      documentos: updatedDocs
    });
  };

  // TECHNICAL TRANSITIONS
  const canSendToDore = () => {
    // Check if all mandatory documents have been uploaded
    const mandatory = solicitacao.documentos.filter(d => d.obrigatorio);
    return mandatory.every(d => d.fileName !== undefined);
  };

  const enviarParaDore = () => {
    if (!canSendToDore()) {
      setTentouEnviarDore(true);
      return;
    }

    // Considera a primeira que receber (starts at 1) e incrementa a cada encaminhamento de reanálise
    const currentCount = solicitacao.contadorAnalises || 0;
    const nextCount = currentCount === 0 ? 1 : currentCount + 1;

    onUpdate({
      ...solicitacao,
      etapaAtual: 'analise',
      analistaAtribuido: undefined,
      contadorAnalises: nextCount,
      valoresOriginaisTecnico: capturarSnapshotTecnico(solicitacao),
      historicoEtapas: [
        ...solicitacao.historicoEtapas,
        { etapa: 'analise', data: new Date().toISOString().split('T')[0], responsavel: 'Téc. Infraestrutura (Envio)' }
      ]
    });
    setTentouEnviarDore(false);
    setMostrarModalEnviado(true);
  };

  const solicitarDevolucaoProcesso = () => {
    if (solicitacao.etapaAtual !== 'analise') {
      alert('Apenas solicitações em etapa de análise podem ser devolvidas.');
      return;
    }
    if (solicitacao.analistaAtribuido) {
      alert('Não é possível solicitar a devolução pois um analista de engenharia já foi atribuído ao projeto.');
      return;
    }

    onUpdate({
      ...solicitacao,
      etapaAtual: 'cadastro',
      historicoEtapas: [
        ...solicitacao.historicoEtapas,
        { 
          etapa: 'cadastro', 
          data: new Date().toISOString().split('T')[0], 
          responsavel: 'Téc. Infraestrutura (Devolução Solicitada)' 
        }
      ]
    });
    alert('Processo devolvido com sucesso à etapa de atendimento inicial para correções de envio!');
  };

  // Grava o parecer de um auxiliar de validação (Elétrica/Arquitetura/PSCIP) no Atendimento
  // Inicial. Ver [[equipes-analista-auxiliares]].
  const [salvandoAuxiliarId, setSalvandoAuxiliarId] = useState<string | null>(null);
  const handleSalvarParecerAuxiliar = async (auxiliarId: string, aprovado: boolean, parecer: string) => {
    setSalvandoAuxiliarId(auxiliarId);
    const dataParecer = new Date().toISOString();
    const { error } = await supabase
      .from('processo_auxiliares')
      .update({ aprovado, parecer, data_parecer: dataParecer })
      .eq('id', auxiliarId);
    setSalvandoAuxiliarId(null);
    if (error) { console.error(error); alert('Erro ao gravar o parecer do auxiliar no banco de dados.'); return; }

    onUpdate({
      ...solicitacao,
      auxiliares: (solicitacao.auxiliares || []).map(a => a.id === auxiliarId ? { ...a, aprovado, parecer, dataParecer } : a),
    });
  };

  const finalizarAnaliseDore = () => {
    const planilhaOrcamentaria = solicitacao.documentos.find(d => d.id === 'doc_1');
    if (planilhaOrcamentaria?.status === 'recusado' && !planilhaOrcamentaria.arquivoDevolucaoFileName) {
      alert('Anexe o arquivo de devolução da Planilha Orçamentária antes de encaminhar');
      return;
    }

    // Determine if there are absolute rejections on uploaded/mandatory files
    const hasRejections = solicitacao.documentos.some(d => d.status === 'recusado');

    // Auxiliares de validação (Elétrica/Arquitetura/PSCIP) precisam ter dado parecer de aprovação
    // antes do analista titular poder aprovar o processo. Ver [[equipes-analista-auxiliares]].
    if (!hasRejections && !podeHomologarComAuxiliares(solicitacao.auxiliares)) {
      alert(`Ainda há auxiliar(es) de validação pendente(s) de parecer: ${auxiliaresPendentes(solicitacao.auxiliares).map(a => a.nome).join(', ')}.`);
      return;
    }

    const currentCount = solicitacao.contadorAnalises || 1;

    // Contando quando o engenheiro não validar e voltar para o técnico
    const nextCount = hasRejections ? currentCount + 1 : currentCount;
    const parecerTudo = gerarParecerConsolidadoTudo(solicitacao.documentos, currentCount);

    if (hasRejections) {
      // Goes back to correction (cadastro)
      onUpdate({
        ...solicitacao,
        etapaAtual: 'cadastro',
        contadorAnalises: nextCount,
        parecerConsolidado: parecerTudo,
        // Conclusão do checkpoint de SLA — devolvido pro técnico também encerra o relógio de
        // análise deste ciclo. Ver [[sla-atendimentos]].
        analiseSla: { ...solicitacao.analiseSla, dataConclusao: new Date().toISOString() },
        historicoEtapas: [
          ...solicitacao.historicoEtapas,
          { etapa: 'cadastro', data: new Date().toISOString().split('T')[0], responsavel: 'Eng. DORE (Retorno por Pendências)' }
        ]
      });
      alert('Processo retornado para o Técnico de Infraestrutura com o parecer consolidado anexado.');
    } else {
      // All approved! Move to PAF Autorização
      onUpdate({
        ...solicitacao,
        etapaAtual: 'paf_autorizacao',
        parecerConsolidado: parecerTudo,
        analiseSla: { ...solicitacao.analiseSla, dataConclusao: new Date().toISOString() },
        historicoEtapas: [
          ...solicitacao.historicoEtapas,
          { etapa: 'paf_autorizacao', data: new Date().toISOString().split('T')[0], responsavel: 'Eng. DORE (Aprovação Técnica)' }
        ]
      });
      setActiveTab('paf');
    }
  };

  // APROVAÇÃO / REPROVAÇÃO FINAL DO PROCESSO (botões globais da tela de atribuição técnica)
  const enviarAprovacaoFinal = () => {
    if (!podeHomologarComAuxiliares(solicitacao.auxiliares)) {
      alert(`Ainda há auxiliar(es) de validação pendente(s) de parecer: ${auxiliaresPendentes(solicitacao.auxiliares).map(a => a.nome).join(', ')}.`);
      return;
    }
    const parecerTudo = gerarParecerConsolidadoTudo(solicitacao.documentos, solicitacao.contadorAnalises || 1);
    onUpdate({
      ...solicitacao,
      etapaAtual: 'paf_autorizacao',
      parecerConsolidado: parecerTudo,
      analiseSla: { ...solicitacao.analiseSla, dataConclusao: new Date().toISOString() },
      historicoEtapas: [
        ...solicitacao.historicoEtapas,
        { etapa: 'paf_autorizacao', data: new Date().toISOString().split('T')[0], responsavel: `${currentUserNome || perfilUsuario} (Aprovação Final)` }
      ]
    });
  };

  const enviarReprovacaoFinal = async () => {
    const contador = (solicitacao.historicoCorrecoes?.length || 0) + 1;
    const hoje = new Date().toISOString().split('T')[0];
    const statusSecoes = getStatusSecoes(solicitacao);
    const motivosAtivos = SECOES_DADOS_GERAIS
      .filter(secao => statusSecoes[secao]?.status === 'nao_validado')
      .map(secao => ({ label: SECAO_LABEL[secao], campo: secao, motivo: statusSecoes[secao]?.motivo || '' }));
    const docsRecusados = (solicitacao.documentos || [])
      .filter(d => d.status === 'recusado' && d.justificativa)
      .map(d => ({ nome: d.nome, id: d.id, justificativa: d.justificativa || '' }));
    const novaEntrada = { contador, data: hoje, motivos: motivosAtivos, docsRecusados };
    onUpdate({
      ...solicitacao,
      etapaAtual: 'correcao',
      historicoCorrecoes: [...(solicitacao.historicoCorrecoes || []), novaEntrada],
      historicoEtapas: [
        ...solicitacao.historicoEtapas,
        { etapa: 'correcao', data: hoje, responsavel: `${currentUserNome || perfilUsuario} (Reprovação)` }
      ]
    });

    // Gravação assíncrona do histórico de correções no Supabase
    try {
      let dbId = solicitacao._dbId;
      if (!dbId) {
        const { data: solRow, error: solError } = await supabase
          .from('solicitacoes')
          .select('id')
          .eq('codigo_sgo', solicitacao.id)
          .single();
        if (solError || !solRow) {
          console.error('Não foi possível localizar o uuid da solicitação para gravar o histórico de correções:', solError);
          return;
        }
        dbId = solRow.id;
      }

      const { data: userData } = await supabase.auth.getUser();

      const { data: correcaoRow, error: correcaoError } = await supabase
        .from('solicitacao_historico_correcoes')
        .insert({ solicitacao_id: dbId, usuario_id: userData.user?.id ?? null })
        .select('id')
        .single();

      if (correcaoError || !correcaoRow) {
        console.error('Erro ao gravar solicitacao_historico_correcoes:', correcaoError);
        return;
      }

      const correcaoId = correcaoRow.id;

      if (motivosAtivos.length > 0) {
        const { error: motivosError } = await supabase
          .from('historico_correcao_motivos')
          .insert(motivosAtivos.map(motivo => ({
            correcao_id: correcaoId,
            motivo: `${motivo.motivo} (${motivo.label})`,
          })));
        if (motivosError) console.error('Erro ao gravar historico_correcao_motivos:', motivosError);
      }

      if (docsRecusados.length > 0) {
        const { error: docsError } = await supabase
          .from('historico_correcao_docs_recusados')
          .insert(docsRecusados.map(doc => ({
            correcao_id: correcaoId,
            nome_doc: `${doc.nome}: ${doc.justificativa}`,
          })));
        if (docsError) console.error('Erro ao gravar historico_correcao_docs_recusados:', docsError);
      }
    } catch (err) {
      console.error('Falha ao gravar histórico de correções no Supabase:', err);
    }
  };

  // PAF PROCESSORS
  const [numPAFInput, setNumPAFInput] = useState(solicitacao.numeroPAF || '');

  const getCalculatedVigencia = (creationDate: string) => {
    if (!creationDate) return '';
    const parts = creationDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      return `${year + 5}-${parts[1]}-${parts[2]}`;
    }
    return '';
  };

  const initialDataCreation = solicitacao.dataHomologacao || new Date().toISOString().split('T')[0];
  const [dataPAFInput, setDataPAFInput] = useState(initialDataCreation);
  const [dataVigenciaPAFInput, setDataVigenciaPAFInput] = useState(solicitacao.dataVigenciaPAF || getCalculatedVigencia(initialDataCreation));

  // Novo Bloco: Financeiro
  const [dataFinHomologacaoInput, setDataFinHomologacaoInput] = useState(solicitacao.dataFinHomologacao || solicitacao.dataHomologacao || new Date().toISOString().split('T')[0]);
  const [parcelasPAFInput, setParcelasPAFInput] = useState<ParcelaPAF[]>(solicitacao.parcelasPAF || []);

  const cnpjCaixaAuto = cnpjCaixaEscolarMap[solicitacao.codesc || ''] || solicitacao.cnpjCaixaEscolar || '';
  const valorPAFBase = solicitacao.valorPlanilha || solicitacao.valorHomologado || 0;
  const totalPagoPAF = parcelasPAFInput.reduce((s, p) => s + (p.valor || 0), 0);
  const pagoPAFDerived = valorPAFBase > 0 && totalPagoPAF >= valorPAFBase;
  const statusPAFDerived: Solicitacao['statusPAF'] = totalPagoPAF === 0
    ? 'Aguardando Pagamento'
    : pagoPAFDerived ? 'Pago e Liberado' : 'Pago Parcialmente';

  const salvarPAF = (e: React.FormEvent) => {
    e.preventDefault();
    if (!numPAFInput) {
      alert('Por favor insira o número do PAF.');
      return;
    }

    onUpdate({
      ...solicitacao,
      valorHomologado: solicitacao.valorHomologado || solicitacao.valorPlanilha || 0,
      numeroPAF: numPAFInput,
      dataHomologacao: dataPAFInput,
      dataVigenciaPAF: dataVigenciaPAFInput,
      dataFinHomologacao: dataFinHomologacaoInput,
      statusPAF: statusPAFDerived,
      parcelasPAF: parcelasPAFInput,
      cnpjCaixaEscolar: cnpjCaixaAuto || undefined,
      statusObra: solicitacao.statusObra || 'Não Iniciada'
    });
  };

  const homologarEAvancarOrdemInicio = () => {
    if (perfilUsuario !== 'administrativo_dore') {
      alert('Apenas o perfil Administrativo DORE (Rui Lages) pode homologar e liberar para Ordem de Início.');
      return;
    }
    const finalNumeroPAF = numPAFInput || solicitacao.numeroPAF;
    if (!finalNumeroPAF) {
      alert('Por favor preencha o número do PAF antes de homologar.');
      return;
    }

    onUpdate({
      ...solicitacao,
      valorHomologado: solicitacao.valorHomologado || solicitacao.valorPlanilha || 0,
      numeroPAF: finalNumeroPAF,
      dataHomologacao: dataPAFInput,
      dataVigenciaPAF: dataVigenciaPAFInput,
      dataFinHomologacao: dataFinHomologacaoInput,
      statusPAF: statusPAFDerived,
      parcelasPAF: parcelasPAFInput,
      cnpjCaixaEscolar: cnpjCaixaAuto || undefined,
      etapaAtual: 'ordem_inicio',
      // Limpa campos do cadastro de obras para chegarem em branco
      cadastroObraConfirmado: false,
      fiscalObraAtribuido: undefined,
      fiscalObraAtribuidoId: undefined,
      dataOrdemInicio: undefined,
      previsaoTerminoObra: undefined,
      duracaoObraMeses: undefined,
      valorHomologadoContratacao: undefined,
      classeObra: undefined,
      pontuacaoComplexidade: undefined,
      historicoEtapas: [
        ...solicitacao.historicoEtapas,
        { etapa: 'ordem_inicio', data: new Date().toISOString().split('T')[0], responsavel: 'Administrativo DORE (Rui Lages - Homologado e Avançado)' }
      ]
    });
    setActiveTab('execucao');
    alert('Informações salvas, PAF homologado e liberado para emissão de Ordem de Início com sucesso!');
  };

  const avancarDiretoParaExecucao = () => {
    if (perfilUsuario !== 'administrativo_dore') {
      alert('Apenas o perfil Administrativo DORE (Rui Lages) pode homologar e liberar para Execução.');
      return;
    }
    const finalNumeroPAF = numPAFInput || solicitacao.numeroPAF;
    if (!finalNumeroPAF) {
      alert('Por favor preencha o número do PAF antes de homologar.');
      return;
    }

    onUpdate({
      ...solicitacao,
      valorHomologado: solicitacao.valorHomologado || solicitacao.valorPlanilha || 0,
      numeroPAF: finalNumeroPAF,
      dataHomologacao: dataPAFInput,
      dataVigenciaPAF: dataVigenciaPAFInput,
      dataFinHomologacao: dataFinHomologacaoInput,
      statusPAF: statusPAFDerived,
      parcelasPAF: parcelasPAFInput,
      cnpjCaixaEscolar: cnpjCaixaAuto || undefined,
      etapaAtual: 'execucao',
      statusObra: 'Em Andamento',
      dataOrdemInicio: solicitacao.dataOrdemInicio || new Date().toISOString().split('T')[0],
      previsaoTerminoObra: solicitacao.previsaoTerminoObra || new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0], // 6 meses
      valorHomologadoContratacao: solicitacao.valorHomologadoContratacao || solicitacao.valorPlanilha || solicitacao.valorHomologado || 0,
      cronogramaFisicoFinanceiroFileName: solicitacao.cronogramaFisicoFinanceiroFileName || 'cronograma_final_paf.pdf',
      cronogramaFisicoFinanceiroFileSize: solicitacao.cronogramaFisicoFinanceiroFileSize || '1.2 MB',
      cronogramaFisicoFinanceiroUploadedAt: solicitacao.cronogramaFisicoFinanceiroUploadedAt || new Date().toLocaleString('pt-BR'),
      historicoEtapas: [
        ...solicitacao.historicoEtapas,
        { 
          etapa: 'execucao', 
          data: new Date().toISOString().split('T')[0], 
          responsavel: 'Administrativo DORE (Rui Lages - Homologado e Avançado Direto)' 
        }
      ]
    });
    setActiveTab('execucao');
    alert('Processo homologado, salvo e enviado diretamente para Execução de Obra com sucesso!');
  };

  // ORDEM DE INÍCIO PROCESSORS
  const cronogramaInputRef = useRef<HTMLInputElement | null>(null);
  const [dataOrdemInicioInput, setDataOrdemInicioInput] = useState(solicitacao.cadastroObraConfirmado ? (solicitacao.dataOrdemInicio || '') : '');
  const [previsaoTerminoInput, setPrevisaoTerminoInput] = useState(solicitacao.cadastroObraConfirmado ? (solicitacao.previsaoTerminoObra || '') : '');
  const [valorHomologadoContratacaoInput, setValorHomologadoContratacaoInput] = useState(solicitacao.cadastroObraConfirmado ? (solicitacao.valorHomologadoContratacao?.toString() || '') : '');
  const [tipoObraInput, setTipoObraInput] = useState(solicitacao.tipoObra || solicitacao.tipo || 'Reforma');

  // CONCLUSÃO DE OBRA STATES & REFS
  const laudoConclusivoInputRef = useRef<HTMLInputElement | null>(null);
  const relatorioFotograficoInputRef = useRef<HTMLInputElement | null>(null);
  const planilhaMedicaoFinalInputRef = useRef<HTMLInputElement | null>(null);
  const termoAceiteProvisorioInputRef = useRef<HTMLInputElement | null>(null);
  const termoAceiteDefinitivoInputRef = useRef<HTMLInputElement | null>(null);

  const [dataConclusaoInput, setDataConclusaoInput] = useState(solicitacao.dataConclusao || '');
  const [laudoConclusivoFileName, setLaudoConclusivoFileName] = useState(solicitacao.laudoConclusivoFileName || '');
  const [laudoConclusivoFileSize, setLaudoConclusivoFileSize] = useState(solicitacao.laudoConclusivoFileSize || '');
  const [laudoConclusivoUploadedAt, setLaudoConclusivoUploadedAt] = useState(solicitacao.laudoConclusivoUploadedAt || '');

  const [relatorioFotograficoFileName, setRelatorioFotograficoFileName] = useState(solicitacao.relatorioFotograficoFileName || '');
  const [relatorioFotograficoFileSize, setRelatorioFotograficoFileSize] = useState(solicitacao.relatorioFotograficoFileSize || '');
  const [relatorioFotograficoUploadedAt, setRelatorioFotograficoUploadedAt] = useState(solicitacao.relatorioFotograficoUploadedAt || '');

  const [planilhaMedicaoFinalFileName, setPlanilhaMedicaoFinalFileName] = useState(solicitacao.planilhaMedicaoFinalFileName || '');
  const [planilhaMedicaoFinalFileSize, setPlanilhaMedicaoFinalFileSize] = useState(solicitacao.planilhaMedicaoFinalFileSize || '');
  const [planilhaMedicaoFinalUploadedAt, setPlanilhaMedicaoFinalUploadedAt] = useState(solicitacao.planilhaMedicaoFinalUploadedAt || '');

  const [termoAceiteProvisorioDataInput, setTermoAceiteProvisorioDataInput] = useState(solicitacao.termoAceiteProvisorioData || '');
  const [termoAceiteProvisorioFileName, setTermoAceiteProvisorioFileName] = useState(solicitacao.termoAceiteProvisorioFileName || '');
  const [termoAceiteProvisorioFileSize, setTermoAceiteProvisorioFileSize] = useState(solicitacao.termoAceiteProvisorioFileSize || '');
  const [termoAceiteProvisorioUploadedAt, setTermoAceiteProvisorioUploadedAt] = useState(solicitacao.termoAceiteProvisorioUploadedAt || '');

  const [termoAceiteDefinitivoDataInput, setTermoAceiteDefinitivoDataInput] = useState(solicitacao.termoAceiteDefinitivoData || '');
  const [termoAceiteDefinitivoFileName, setTermoAceiteDefinitivoFileName] = useState(solicitacao.termoAceiteDefinitivoFileName || '');
  const [termoAceiteDefinitivoFileSize, setTermoAceiteDefinitivoFileSize] = useState(solicitacao.termoAceiteDefinitivoFileSize || '');
  const [termoAceiteDefinitivoUploadedAt, setTermoAceiteDefinitivoUploadedAt] = useState(solicitacao.termoAceiteDefinitivoUploadedAt || '');

  // Regra dos 90 dias: o Termo de Aceite Definitivo só pode ser emitido após 90 dias corridos
  // da data do Termo de Aceite Provisório (não a data de upload do arquivo)
  const diasDesdeTermoProvisorio = termoAceiteProvisorioDataInput
    ? Math.floor((Date.now() - new Date(`${termoAceiteProvisorioDataInput}T00:00:00`).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const dataLimiteTermoDefinitivo = termoAceiteProvisorioDataInput
    ? (() => {
        const d = new Date(`${termoAceiteProvisorioDataInput}T00:00:00`);
        d.setDate(d.getDate() + 90);
        return d;
      })()
    : null;
  const checkTermoAceiteProvisorio = !!termoAceiteProvisorioFileName && !!termoAceiteProvisorioDataInput;
  const prazo90DiasTermoProvisorioCumprido = checkTermoAceiteProvisorio && (diasDesdeTermoProvisorio ?? 0) >= 90;
  const checkTermoAceiteDefinitivo = prazo90DiasTermoProvisorioCumprido && !!termoAceiteDefinitivoFileName;

  // Documentos obrigatórios da GED (Execução → Documentações, ex.: ART, Projetos) — anexados
  // pelo fiscal na aba GED; bloqueiam a Conclusão de Obra enquanto pendentes.
  const documentosGEDConclusao = montarChecklistGED(solicitacao.documentosGED);
  const documentosGEDPendentes = documentosGEDConclusao.filter(d => d.obrigatorio && !d.fileName);
  const checkDocumentosGED = documentosGEDPendentes.length === 0;

  const parsedValor = valorHomologadoContratacaoInput ? parseFloat(valorHomologadoContratacaoInput) : 0;
  const parsedMeses = calcularDuracaoMeses(dataOrdemInicioInput, previsaoTerminoInput);
  const ordemInicioInvalida = !!(
    solicitacao.contratoDataAssinatura &&
    dataOrdemInicioInput &&
    dataOrdemInicioInput < solicitacao.contratoDataAssinatura
  );
  const complexidadeCalculada = calcularComplexidade(parsedValor, tipoObraInput, parsedMeses);

  // Keep state in sync with parent updates
  useEffect(() => {
    // Só preenche campos do cadastro de obra se o fiscal já confirmou o cadastro oficialmente
    if (solicitacao.cadastroObraConfirmado) {
      setDataOrdemInicioInput(solicitacao.dataOrdemInicio || '');
      setPrevisaoTerminoInput(solicitacao.previsaoTerminoObra || '');
      setValorHomologadoContratacaoInput(solicitacao.valorHomologadoContratacao?.toString() || '');
      setFiscalObraAtribuidoInput(solicitacao.fiscalObraAtribuido || '');
    } else {
      setDataOrdemInicioInput('');
      setPrevisaoTerminoInput('');
      setValorHomologadoContratacaoInput('');
      setFiscalObraAtribuidoInput('');
    }
    setTipoObraInput(solicitacao.tipoObra || solicitacao.tipo || 'Reforma');

    setEmpresaInput(solicitacao.empresaContratada || '');
    setCnpjInput(solicitacao.cnpjEmpresa || '');
    setStatusContratoInput(solicitacao.statusContratoEmpresa || 'Ativa');
    setStatusObraInput(solicitacao.statusObra || 'Não Iniciada');

    setJustificativaDistratoInput(solicitacao.justificativaDistrato || 'Planilha de orçamento defasada');
    setDataDistratoInput(solicitacao.dataDistrato || '');
    setDocumentoDistratoFileName(solicitacao.documentoDistratoFileName || '');
    setDocumentoDistratoFileSize(solicitacao.documentoDistratoFileSize || '');
    setDocumentoDistratoUploadedAt(solicitacao.documentoDistratoUploadedAt || '');

    setDataParalizacaoInput(solicitacao.dataParalizacao || '');
    setJustificativaParalizacaoInput(solicitacao.justificativaParalizacao || 'Aguardando diretor da cx escolar realizar notificação empresa');

    // Conclusão de obra states syncing
    setDataConclusaoInput(solicitacao.dataConclusao || '');
    setLaudoConclusivoFileName(solicitacao.laudoConclusivoFileName || '');
    setLaudoConclusivoFileSize(solicitacao.laudoConclusivoFileSize || '');
    setLaudoConclusivoUploadedAt(solicitacao.laudoConclusivoUploadedAt || '');

    setRelatorioFotograficoFileName(solicitacao.relatorioFotograficoFileName || '');
    setRelatorioFotograficoFileSize(solicitacao.relatorioFotograficoFileSize || '');
    setRelatorioFotograficoUploadedAt(solicitacao.relatorioFotograficoUploadedAt || '');

    setPlanilhaMedicaoFinalFileName(solicitacao.planilhaMedicaoFinalFileName || '');
    setPlanilhaMedicaoFinalFileSize(solicitacao.planilhaMedicaoFinalFileSize || '');
    setPlanilhaMedicaoFinalUploadedAt(solicitacao.planilhaMedicaoFinalUploadedAt || '');

    setTermoAceiteProvisorioDataInput(solicitacao.termoAceiteProvisorioData || '');
    setTermoAceiteProvisorioFileName(solicitacao.termoAceiteProvisorioFileName || '');
    setTermoAceiteProvisorioFileSize(solicitacao.termoAceiteProvisorioFileSize || '');
    setTermoAceiteProvisorioUploadedAt(solicitacao.termoAceiteProvisorioUploadedAt || '');

    setTermoAceiteDefinitivoDataInput(solicitacao.termoAceiteDefinitivoData || '');
    setTermoAceiteDefinitivoFileName(solicitacao.termoAceiteDefinitivoFileName || '');
    setTermoAceiteDefinitivoFileSize(solicitacao.termoAceiteDefinitivoFileSize || '');
    setTermoAceiteDefinitivoUploadedAt(solicitacao.termoAceiteDefinitivoUploadedAt || '');

    // Sync PAF related fields
    setNumPAFInput(solicitacao.numeroPAF || '');
    const initialDataCreation = solicitacao.dataHomologacao || new Date().toISOString().split('T')[0];
    setDataPAFInput(solicitacao.dataHomologacao || initialDataCreation);
    setDataVigenciaPAFInput(solicitacao.dataVigenciaPAF || getCalculatedVigencia(solicitacao.dataHomologacao || initialDataCreation));
    setDataFinHomologacaoInput(solicitacao.dataFinHomologacao || solicitacao.dataHomologacao || new Date().toISOString().split('T')[0]);
    setParcelasPAFInput(solicitacao.parcelasPAF || []);
  }, [
    solicitacao.id,
    solicitacao.cadastroObraConfirmado,
    solicitacao.numeroPAF,
    solicitacao.dataHomologacao,
    solicitacao.dataVigenciaPAF,
    solicitacao.dataFinHomologacao,
    solicitacao.parcelasPAF,
    solicitacao.statusPAF,
    solicitacao.dataOrdemInicio,
    solicitacao.previsaoTerminoObra,
    solicitacao.valorHomologadoContratacao,
    solicitacao.tipoObra,
    solicitacao.tipo,
    solicitacao.fiscalObraAtribuido,
    solicitacao.empresaContratada,
    solicitacao.cnpjEmpresa,
    solicitacao.statusContratoEmpresa,
    solicitacao.statusObra,
    solicitacao.justificativaDistrato,
    solicitacao.dataDistrato,
    solicitacao.documentoDistratoFileName,
    solicitacao.dataParalizacao,
    solicitacao.justificativaParalizacao,
    solicitacao.dataConclusao,
    solicitacao.laudoConclusivoFileName,
    solicitacao.relatorioFotograficoFileName,
    solicitacao.planilhaMedicaoFinalFileName,
    solicitacao.termoAceiteProvisorioData,
    solicitacao.termoAceiteProvisorioFileName,
    solicitacao.termoAceiteDefinitivoData,
    solicitacao.termoAceiteDefinitivoFileName
  ]);

  const handleCronogramaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeFormatted = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    onUpdate({
      ...solicitacao,
      cronogramaFisicoFinanceiroFileName: file.name,
      cronogramaFisicoFinanceiroFileSize: sizeFormatted,
      cronogramaFisicoFinanceiroUploadedAt: new Date().toISOString().split('T')[0]
    });
    alert('Cronograma Físico-Financeiro anexado com sucesso!');
  };

  const removerCronograma = () => {
    onUpdate({
      ...solicitacao,
      cronogramaFisicoFinanceiroFileName: undefined,
      cronogramaFisicoFinanceiroFileSize: undefined,
      cronogramaFisicoFinanceiroUploadedAt: undefined
    });
  };

  const salvarOrdemInicio = (e: React.FormEvent) => {
    e.preventDefault();
    if (ordemInicioInvalida) {
      alert(
        `A Data de Ordem de Início não pode ser anterior à Data de Assinatura do Contrato.\n\n` +
        `Assinatura do contrato: ${new Date(solicitacao.contratoDataAssinatura + 'T12:00:00').toLocaleDateString('pt-BR')}\n` +
        `Data informada: ${new Date(dataOrdemInicioInput + 'T12:00:00').toLocaleDateString('pt-BR')}`
      );
      return;
    }
    const valor = valorHomologadoContratacaoInput ? parseFloat(valorHomologadoContratacaoInput) : 0;
    const meses = calcularDuracaoMeses(dataOrdemInicioInput, previsaoTerminoInput);
    const comp = calcularComplexidade(valor, tipoObraInput, meses);

    onUpdate({
      ...solicitacao,
      dataOrdemInicio: dataOrdemInicioInput,
      previsaoTerminoObra: previsaoTerminoInput,
      valorHomologadoContratacao: valor ? valor : undefined,
      tipoObra: tipoObraInput,
      duracaoObraMeses: meses,
      classeObra: comp.classe,
      pontuacaoComplexidade: comp.pontuacao,
      fiscalObraAtribuido: fiscalObraAtribuidoInput,
      fiscalObraAtribuidoId: fiscais.find(u => u.nome === fiscalObraAtribuidoInput)?.id,
      cadastroObraConfirmado: true
    });
    alert('Dados da Ordem de Início salvos com sucesso!');
  };

  const emitirOrdemEIniciarObra = () => {
    if (!solicitacao.dataOrdemInicio || !solicitacao.previsaoTerminoObra || !solicitacao.valorHomologadoContratacao || !solicitacao.cronogramaFisicoFinanceiroFileName) {
      alert('Por favor registre a Data de Início, Previsão de Término, Valor Homologado de Contratação e anexe o Cronograma Físico-Financeiro antes de iniciar a obra.');
      return;
    }

    onUpdate({
      ...solicitacao,
      etapaAtual: 'execucao',
      statusObra: 'Em Andamento',
      fiscalObraAtribuido: fiscalObraAtribuidoInput,
      fiscalObraAtribuidoId: fiscais.find(u => u.nome === fiscalObraAtribuidoInput)?.id,
      historicoEtapas: [
        ...solicitacao.historicoEtapas,
        { 
          etapa: 'execucao', 
          data: new Date().toISOString().split('T')[0], 
          responsavel: `Fiscal de Obra (Emissão Ordem de Início e Liberação)` 
        }
      ]
    });
    setActiveTab('execucao');
    alert('Ordem de Início emitida com sucesso! O processo avançou para a etapa de Execução Física de Obra.');
  };

  // Ajustes de planilha agora são criados e avaliados em Execução › Ajustes
  // (ExecucaoSubmodulos.tsx, com escrita real no Supabase); a aba "ajustes" abaixo é somente leitura.

  // EXECUTION PROCESSORS
  const assumirNovaEmpresa = (nome: string, cnpj: string) => {
    if (!nome || !cnpj) {
      alert('Por favor, informe o nome e o CNPJ da nova empresa.');
      return;
    }

    // Calcular avanço físico anterior da empresa que acabou de ser distratada
    const currentCnpj = solicitacao.cnpjEmpresa || '';
    const medicoesDaEmpresaAntiga = solicitacao.medicoes.filter(
      m => m.empresaCnpj === currentCnpj
    );
    const avancoOld = medicoesDaEmpresaAntiga.reduce((acc, m) => acc + m.porcentagem, 0);

    const antigaEmpresa = {
      id: `emp-${Math.floor(1000 + Math.random() * 9000)}`,
      nome: solicitacao.empresaContratada || 'Empresa Anterior',
      cnpj: currentCnpj || '00.000.000/0001-00',
      avancoFisicoOriginal: avancoOld,
      
      // Save old Ordem de Início info of this empresa!
      dataOrdemInicio: solicitacao.dataOrdemInicio,
      previsaoTerminoObra: solicitacao.previsaoTerminoObra,
      valorHomologadoContratacao: solicitacao.valorHomologadoContratacao,
      cronogramaFisicoFinanceiroFileName: solicitacao.cronogramaFisicoFinanceiroFileName,
      cronogramaFisicoFinanceiroFileSize: solicitacao.cronogramaFisicoFinanceiroFileSize,
      cronogramaFisicoFinanceiroUploadedAt: solicitacao.cronogramaFisicoFinanceiroUploadedAt,
      fiscalObraAtribuido: solicitacao.fiscalObraAtribuido,
      duracaoObraMeses: solicitacao.duracaoObraMeses,
      classeObra: solicitacao.classeObra,
      pontuacaoComplexidade: solicitacao.pontuacaoComplexidade,

      // Save Distrato details of this old empresa!
      justificativaDistrato: justificativaDistratoInput,
      dataDistrato: dataDistratoInput,
      documentoDistratoFileName: documentoDistratoFileName,
      documentoDistratoFileSize: documentoDistratoFileSize,
      documentoDistratoUploadedAt: documentoDistratoUploadedAt,
    };

    const updatedEmpresasAnteriores = solicitacao.empresasAnteriores || [];

    onUpdate({
      ...solicitacao,
      empresaContratada: nome,
      cnpjEmpresa: cnpj,
      statusContratoEmpresa: 'Ativa',
      empresasAnteriores: [...updatedEmpresasAnteriores, antigaEmpresa],
      
      // Clears/opens space for new Ordem de Início for the new company
      dataOrdemInicio: undefined,
      previsaoTerminoObra: undefined,
      valorHomologadoContratacao: undefined,
      cronogramaFisicoFinanceiroFileName: undefined,
      cronogramaFisicoFinanceiroFileSize: undefined,
      cronogramaFisicoFinanceiroUploadedAt: undefined,
      fiscalObraAtribuido: undefined,
      fiscalObraAtribuidoId: undefined,
      duracaoObraMeses: undefined,
      classeObra: undefined,
      pontuacaoComplexidade: undefined,

      // Clear distrato fields from active record too
      justificativaDistrato: undefined,
      dataDistrato: undefined,
      documentoDistratoFileName: undefined,
      documentoDistratoFileSize: undefined,
      documentoDistratoUploadedAt: undefined,

      etapaAtual: 'ordem_inicio'
    });

    setEmpresaInput(nome);
    setCnpjInput(cnpj);
    setStatusContratoInput('Ativa');
    
    // Clear Ordem de Início input states too so they are empty for the succession!
    setDataOrdemInicioInput('');
    setPrevisaoTerminoInput('');
    setValorHomologadoContratacaoInput('');
    setFiscalObraAtribuidoInput('');

    // Clear Distrato inputs
    setJustificativaDistratoInput('Planilha de orçamento defasada');
    setDataDistratoInput('');
    setDocumentoDistratoFileName('');
    setDocumentoDistratoFileSize('');
    setDocumentoDistratoUploadedAt('');

    setNovoEmpresaNome('');
    setNovoEmpresaCnpj('');
    setMostrandoNovaEmpresa(false);
    alert('Empresa substituída com sucesso! Histórico preservado e espaço liberado para uma nova Ordem de Início.');
  };

  const salvarDadosGeraisObra = () => {
    if (statusContratoInput === 'Distratada') {
      if (!justificativaDistratoInput) {
        alert('Por favor, informe a justificativa do distrato.');
        return;
      }
      if (!dataDistratoInput) {
        alert('Por favor, informe a data do distrato.');
        return;
      }
      if (!documentoDistratoFileName) {
        alert('Por favor, anexe o documento do distrato.');
        return;
      }
    }

    if (statusObraInput === 'Paralisada') {
      if (!dataParalizacaoInput) {
        alert('Por favor, informe a data de paralisação.');
        return;
      }
      if (!justificativaParalizacaoInput) {
        alert('Por favor, selecione a justificativa da paralisação.');
        return;
      }
    }

    onUpdate({
      ...solicitacao,
      empresaContratada: empresaInput,
      cnpjEmpresa: cnpjInput,
      statusContratoEmpresa: statusContratoInput as any,
      statusObra: statusObraInput as any,

      // Save distrato fields
      justificativaDistrato: statusContratoInput === 'Distratada' ? justificativaDistratoInput : undefined,
      dataDistrato: statusContratoInput === 'Distratada' ? dataDistratoInput : undefined,
      documentoDistratoFileName: statusContratoInput === 'Distratada' ? documentoDistratoFileName : undefined,
      documentoDistratoFileSize: statusContratoInput === 'Distratada' ? documentoDistratoFileSize : undefined,
      documentoDistratoUploadedAt: statusContratoInput === 'Distratada' ? documentoDistratoUploadedAt : undefined,

      // Save paralisada fields
      dataParalizacao: statusObraInput === 'Paralisada' ? dataParalizacaoInput : undefined,
      justificativaParalizacao: statusObraInput === 'Paralisada' ? justificativaParalizacaoInput : undefined
    });
    alert('Dados gerais salvos com sucesso!');
  };

  const salvarConclusaoObra = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataConclusaoInput) {
      alert("Por favor, preencha a data de conclusão.");
      return;
    }
    if (!laudoConclusivoFileName) {
      alert("Por favor, anexe o Laudo Conclusivo.");
      return;
    }
    if (!relatorioFotograficoFileName) {
      alert("Por favor, anexe o Relatório Fotográfico.");
      return;
    }
    if (!planilhaMedicaoFinalFileName) {
      alert("Por favor, anexe a Planilha de Medição Acumulada Final.");
      return;
    }
    if ((solicitacao.licoesAprendidas || []).length === 0) {
      alert("Registre pelo menos 1 lição aprendida na aba \"Lições Aprendidas\" de Acompanhamento da Obra antes de encerrar.");
      return;
    }
    if (!checkTermoAceiteProvisorio) {
      alert("Por favor, informe a data e anexe o Termo de Aceite Provisório.");
      return;
    }
    if (!prazo90DiasTermoProvisorioCumprido) {
      alert(`Ainda não decorreram 90 dias da data do Termo de Aceite Provisório (${new Date(termoAceiteProvisorioDataInput + 'T00:00:00').toLocaleDateString('pt-BR')}). O Termo de Aceite Definitivo só pode ser emitido a partir de ${dataLimiteTermoDefinitivo?.toLocaleDateString('pt-BR')}.`);
      return;
    }
    if (!termoAceiteDefinitivoFileName) {
      alert("Por favor, anexe o Termo de Aceite Definitivo.");
      return;
    }
    if (!checkDocumentosGED) {
      alert(`Anexe os documentos obrigatórios pendentes na aba "Documentações (GED)" de Execução: ${documentosGEDPendentes.map(d => d.nome).join(', ')}.`);
      return;
    }

    onUpdate({
      ...solicitacao,
      statusObra: 'Concluída',
      dataConclusao: dataConclusaoInput,
      laudoConclusivoFileName,
      laudoConclusivoFileSize,
      laudoConclusivoUploadedAt,
      relatorioFotograficoFileName,
      relatorioFotograficoFileSize,
      relatorioFotograficoUploadedAt,
      planilhaMedicaoFinalFileName,
      planilhaMedicaoFinalFileSize,
      planilhaMedicaoFinalUploadedAt,
      termoAceiteProvisorioData: termoAceiteProvisorioDataInput,
      termoAceiteProvisorioFileName,
      termoAceiteProvisorioFileSize,
      termoAceiteProvisorioUploadedAt,
      termoAceiteDefinitivoData: termoAceiteDefinitivoDataInput,
      termoAceiteDefinitivoFileName,
      termoAceiteDefinitivoFileSize,
      termoAceiteDefinitivoUploadedAt
    });

    alert("Conclusão de Obra salva e protocolada com sucesso! O status da obra foi atualizado para 'Concluída'.");
  };

  // Calculations for dashboard inside Details
  const totalMedido = solicitacao.medicoes.reduce((acc, m) => acc + m.valor, 0);
  const totalAditivosAprovados = solicitacao.aditivos
    .filter(a => a.status === 'Aprovado' && a.valorExtra)
    .reduce((acc, a) => acc + (a.valorExtra || 0), 0);

  const valorContratoAtual = (solicitacao.valorHomologado || 0) + totalAditivosAprovados;
  const porcentagemMedidaFinanceira = valorContratoAtual > 0 
    ? Math.min(100, Math.round((totalMedido / valorContratoAtual) * 100)) 
    : 0;

  const progressoEmpresaAtual = solicitacao.medicoes
    .filter(m => m.empresaCnpj === (solicitacao.cnpjEmpresa || ''))
    .reduce((acc, m) => acc + m.porcentagem, 0);

  const progressoTotalObra = (solicitacao.empresasAnteriores || []).reduce((acc, emp) => acc + emp.avancoFisicoOriginal, 0) + progressoEmpresaAtual;

  // Render variables corresponding to step indicators
  const stepConfig: { label: string; key: EtapaProcesso; desc: string }[] = [
    { label: 'Atendimento Inicial', key: 'cadastro', desc: 'Anexos obrigatórios pelo técnico' },
    { label: 'Análise DORE', key: 'analise', desc: 'Análise técnica e aprovação ministerial' },
    { label: 'Geração PAF', key: 'paf', desc: 'Atribuição de verba e número de PAF' },
    { label: 'Ordem de Início', key: 'ordem_inicio', desc: 'Preenchimento de datas e cronograma' },
    { label: 'Execução & Medições', key: 'execucao', desc: 'Contratação, medições e aditivos' }
  ];

  return (
    <div className="space-y-6">
      {/* Botão de Retorno e Resumo da Escola - PROFESSIONAL POLISH */}
      {activeSubTask !== 'conclusao' && <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-start gap-4">
          {!hideVoltar && (
            <button 
              onClick={onVoltar}
              className="mt-1 p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors bg-white shadow-xs cursor-pointer"
              title="Voltar ao Painel"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200/50">
                Ref: {solicitacao.id}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                {solicitacao.tipo}
              </span>
              {solicitacao.contadorAnalises && solicitacao.contadorAnalises > 0 && (
                <>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md font-bold text-[10px] flex items-center gap-1 font-sans shadow-xs">
                    <RefreshCw className="w-3 h-3 text-indigo-500 animate-spin" />
                    {solicitacao.contadorAnalises}ª Entrada/Ciclo de Análise
                  </span>
                </>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-slate-800 mt-1">
              {solicitacao.nomeEscola}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-sans">
              CODESC: <span className="font-mono font-medium text-slate-700">{solicitacao.codesc}</span> | {solicitacao.municipio} — {solicitacao.sre}
            </p>
          </div>
        </div>

        {/* Status Atual do Processo Base */}
        <div className="flex flex-col items-start sm:items-end justify-center shrink-0">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Etapa do Processo:</span>
          <div className="flex items-center gap-2 mt-1">
            {solicitacao.etapaAtual === 'cadastro' && (
              <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-250 rounded-full font-semibold text-xs flex items-center gap-1.5 animate-pulse animate-duration-1000">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Atendimento Inicial
              </span>
            )}
            {solicitacao.etapaAtual === 'analise' && (
              <span className="px-3 py-1 bg-indigo-50 text-indigo-850 border border-indigo-250 rounded-full font-semibold text-xs flex items-center gap-1.5 animate-pulse animate-duration-1000">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                Em Análise (DORE)
              </span>
            )}
            {solicitacao.etapaAtual === 'paf_autorizacao' && (
              <span className="px-3 py-1 bg-amber-50 text-amber-850 border border-amber-250 rounded-full font-semibold text-xs flex items-center gap-1.5 animate-pulse animate-duration-1000">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Autorização do PAF
              </span>
            )}
            {solicitacao.etapaAtual === 'paf' && (
              <span className="px-3 py-1 bg-cyan-50 text-cyan-800 border border-cyan-200 rounded-full font-semibold text-xs flex items-center gap-1.5 animate-pulse animate-duration-1000">
                <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                Geração de PAF
              </span>
            )}
            {solicitacao.etapaAtual === 'execucao' && (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-semibold text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Obra em Execução
              </span>
            )}
            {solicitacao.etapaAtual === 'cancelado' && (
              <span className="px-3 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded-full font-bold text-xs flex items-center gap-1.5">
                <Ban className="w-3.5 h-3.5" />
                Cancelado
              </span>
            )}
          </div>

          {/* Badge de Solicitação de Cancelamento — independente da etapa, processo continua normalmente */}
          {solicitacao.solicitacaoCancelamento && (
            <span className="mt-1.5 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-bold text-[10.5px] flex items-center gap-1.5 animate-pulse" title={solicitacao.motivoSolicitacaoCancelamento}>
              <AlertTriangle className="w-3.5 h-3.5" />
              Cancelamento Solicitado
            </span>
          )}

          {/* Ações administrativas — Retorno de Etapa (admin) e Cancelamento (admin/técnico) */}
          {!somenteLeitura && (
          <div className="flex items-center gap-2 mt-2 flex-wrap justify-end">
            {(perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore') && processoAindaModificavel(solicitacao) && etapasAnterioresDisponiveis.length > 0 && (
              <button
                type="button"
                onClick={handleAbrirRetornoEtapa}
                className="px-2.5 py-1 text-[10.5px] font-bold text-slate-500 hover:text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1 cursor-pointer transition"
                title="Retornar este processo para uma etapa anterior"
              >
                <Undo2 className="w-3 h-3" /> Retornar Etapa
              </button>
            )}
            {(perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore') && processoAindaModificavel(solicitacao) && solicitacao.etapaAtual !== 'cancelado' && (
              <button
                data-testid="botao-cancelar-processo"
                type="button"
                onClick={handleAbrirCancelarProcesso}
                className="px-2.5 py-1 text-[10.5px] font-bold text-rose-700 hover:text-rose-800 border border-rose-200 hover:bg-rose-50 rounded-lg flex items-center gap-1 cursor-pointer transition"
              >
                <Ban className="w-3 h-3" /> Cancelar Processo
              </button>
            )}
            {perfilUsuario === 'tecnico_infra' && processoAindaModificavel(solicitacao) && (
              solicitacao.solicitacaoCancelamento ? (
                <button
                  type="button"
                  onClick={handleRetirarSolicitacaoCancelamento}
                  className="px-2.5 py-1 text-[10.5px] font-bold text-slate-500 hover:text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1 cursor-pointer transition"
                >
                  <Undo2 className="w-3 h-3" /> Retirar Solicitação de Cancelamento
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAbrirSolicitarCancelamento}
                  className="px-2.5 py-1 text-[10.5px] font-bold text-rose-600 hover:text-rose-700 border border-rose-200 hover:bg-rose-50 rounded-lg flex items-center gap-1 cursor-pointer transition"
                >
                  <Ban className="w-3 h-3" /> Solicitar Cancelamento
                </button>
              )
            )}
          </div>
          )}
        </div>
      </div>}

      {/* HISTÓRICO ADMINISTRATIVO — Retornos de Etapa executados por Administrador */}
      {(solicitacao.retornosAdministrativos || []).length > 0 && (
        <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-4 space-y-2">
          <h4 className="text-[10px] font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
            <Undo2 className="w-3.5 h-3.5" /> Histórico Administrativo
          </h4>
          {(solicitacao.retornosAdministrativos || []).map((r, i) => (
            <div key={i} className="text-xs text-rose-900 bg-white border border-rose-200 rounded-lg p-2.5">
              <p className="font-bold flex items-center gap-1.5">
                <Undo2 className="w-3.5 h-3.5 text-rose-600" />
                Retorno Administrativo — {r.usuario} retornou de [{ETAPA_LABEL[r.etapaOrigem]}] para [{ETAPA_LABEL[r.etapaDestino]}]
              </p>
              <p className="mt-1 text-rose-800">Motivo: {r.motivo}</p>
              <p className="mt-1 text-[10px] text-rose-400 font-mono">{new Date(r.timestamp).toLocaleString('pt-BR')}</p>
            </div>
          ))}
        </div>
      )}

      {/* STEPPER SUPERIOR - INDICANDO ETAPA DO PROCESSO (PROFESSIONAL POLISH) */}
      {!hideStepper && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-5xl mx-auto gap-4 md:gap-0">
            {stepConfig.map((step, idx) => {
              const stepOrder: EtapaProcesso[] = ['cadastro', 'analise', 'paf', 'ordem_inicio', 'execucao'];
              const curIdx = stepOrder.indexOf(solicitacao.etapaAtual);
              const stepIdx = stepOrder.indexOf(step.key);
              
              const isCompleted = stepIdx < curIdx;
              const isActive = stepIdx === curIdx;
              const isFuture = stepIdx > curIdx;

              return (
                <React.Fragment key={step.key}>
                  <div className="flex items-center text-left">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 border-2 transition-all duration-300 ${
                      isCompleted 
                        ? 'bg-blue-100 border-blue-600 text-blue-600' 
                        : isActive 
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm ring-4 ring-blue-500/10' 
                          : 'bg-white border-slate-200 text-slate-400'
                    }`}>
                      {isCompleted ? '✓' : idx + 1}
                    </div>
                    <div className="ml-3">
                      <span className={`block text-xs font-bold uppercase tracking-wider ${
                        isActive || isCompleted ? 'text-blue-600' : 'text-slate-500'
                      }`}>
                        {step.label.split(' & ')[0].split(' ')[0]} {/* simplified like Solicitor list */}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-medium leading-none mt-1">{step.desc.split(' ')[0]} {step.desc.split(' ')[1] || ''}</span>
                    </div>
                  </div>
                  {idx < stepConfig.length - 1 && (
                    <div className={`hidden md:block flex-1 h-[2px] mx-4 transition-all duration-300 ${
                      stepIdx < curIdx ? 'bg-blue-600' : 'bg-slate-200'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* ATRIBUIÇÃO DE ANALISTA DA DORE (Admin/Diretor DORE) */}
      {(perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore') && solicitacao.etapaAtual === 'analise' && (
        <div className="bg-indigo-50/70 border border-indigo-200/85 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Encaminhar para Analista DORE</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Os checklists encaminhados pelas SREs chegam aqui para validação. Decida qual analista da DORE será responsável por validar esta demanda.
              </p>
              {solicitacao.analistaAtribuido ? (
                <p className="text-xs text-indigo-800 font-semibold mt-1">
                  Atribuído atualmente para: <span className="underline">{solicitacao.analistaAtribuido}</span>
                </p>
              ) : (
                <p className="text-xs text-amber-700 font-semibold mt-1">
                  ⚠️ Nenhuma atribuição definida. Selecione um responsável de engenharia abaixo para iniciar a validação.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 select-none">
            <select
              data-testid="botao-encaminhar-analista"
              value={solicitacao.analistaAtribuido || ''}
              onChange={(e) => {
                const val = e.target.value;
                const updated = { ...solicitacao, analistaAtribuido: val || undefined };
                onUpdate(updated);
              }}
              className="px-3 py-2 text-xs border border-indigo-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700 font-sans min-w-[200px] cursor-pointer"
            >
              <option value="">-- Selecione o Analista --</option>
              {(analistas.length > 0 ? analistas : usuariosSeguranca).map(u => (
                <option key={u.id} value={u.nome}>{u.nome}</option>
              ))}
            </select>
            {solicitacao.analistaAtribuido && (
              <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg font-bold">
                Definido!
              </span>
            )}
          </div>
        </div>
      )}

      {/* FICHA TÉCNICA DA DEMANDA (CODESC E EXTENSÕES) */}
      {activeSubTask === 'conclusao' && (
        <div className="bg-white rounded-xl border border-emerald-200/70 p-5 shadow-xs">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2 mb-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <HardHat className="w-4 h-4 text-emerald-600" />
              Resumo da Obra — Encerramento
            </h2>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
              solicitacao.statusObra === 'Concluída'
                ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {solicitacao.statusObra || 'Em Andamento'}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-xs font-sans">
            <div>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-1">ID / PAF</span>
              <span className="text-slate-800 font-mono font-bold">{solicitacao.id}</span>
              {solicitacao.numeroPAF && <span className="text-[10px] text-slate-500 block font-mono">PAF {solicitacao.numeroPAF}</span>}
            </div>
            <div>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-1">CODESC</span>
              <span className="text-slate-800 font-semibold">{solicitacao.codesc}</span>
            </div>
            <div className="md:col-span-2">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-1">Escola</span>
              <span className="text-slate-800 font-semibold leading-tight block">{solicitacao.nomeEscola}</span>
              <span className="text-[10px] text-slate-500">{solicitacao.municipio} · {solicitacao.sre}</span>
            </div>
            <div>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-1">Tipo de Obra</span>
              <span className="text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded text-[11px] font-semibold inline-block">
                {solicitacao.tipoObra || solicitacao.tipo}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-1">Progresso Físico</span>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, progressoTotalObra)}%` }} />
                </div>
                <span className="font-bold text-slate-700 font-mono text-[11px]">{progressoTotalObra}%</span>
              </div>
            </div>
            {solicitacao.empresaContratada && (
              <div className="md:col-span-2">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-1">Empresa Contratada</span>
                <span className="text-slate-800 font-semibold block">{solicitacao.empresaContratada}</span>
                {solicitacao.cnpjEmpresa && <span className="text-[10px] text-slate-500 font-mono">{solicitacao.cnpjEmpresa}</span>}
              </div>
            )}
            <div>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-1">Valor do Contrato</span>
              <span className="text-emerald-700 font-bold font-mono">
                R$ {valorContratoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-1">Total Medido</span>
              <span className="text-slate-800 font-bold font-mono">
                R$ {totalMedido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {solicitacao.dataOrdemInicio && (
              <div>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-1">Início / Previsão</span>
                <span className="text-slate-700 font-semibold block">{new Date(solicitacao.dataOrdemInicio + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                {solicitacao.previsaoTerminoObra && (
                  <span className="text-[10px] text-slate-500">até {new Date(solicitacao.previsaoTerminoObra + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTask !== 'analise' && activeSubTask !== 'conclusao' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-5">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-500" />
            Ficha de Informações da Solicitação
          </h2>
          <span className="text-[10px] font-mono font-semibold text-neutral-400">
            Enviada pelo Técnico da SRE
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 text-xs font-sans">
          <div>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-1">Prédio</span>
            <span className="text-slate-800 text-sm font-medium">{solicitacao.predio || 'Principal'}</span>
          </div>

          <div>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-1">Tipo de Obra</span>
            <span className="text-slate-800 text-sm font-semibold text-indigo-700 bg-indigo-50/50 px-1.5 py-0.5 rounded border border-indigo-100 inline-block">
              {solicitacao.tipoObra || solicitacao.tipo || 'Não informado'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-1">Forma de Ocupação</span>
            <span className="text-slate-800 text-sm font-medium">{solicitacao.formaOcupacao || 'PRÓPRIO'}</span>
          </div>

          <div>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-1">Forma Atendimento</span>
            <span className="text-slate-800 text-sm font-medium">{solicitacao.formaAtendimento || 'VIA CAIXA ESCOLAR'}</span>
          </div>

          <div>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-1">Tipo de Atendimento</span>
            <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${
              solicitacao.tipoAtendimento === 'EMERGENCIAL' 
                ? 'bg-amber-50 text-amber-900 border border-amber-200/50' 
                : solicitacao.tipoAtendimento === 'EMENDA'
                ? 'bg-indigo-100/70 text-indigo-900 border border-indigo-200'
                : solicitacao.tipoAtendimento === 'SOE'
                ? 'bg-teal-50 text-teal-900 border border-teal-200/50'
                : solicitacao.tipoAtendimento === 'PDDE'
                ? 'bg-pink-50 text-pink-900 border border-pink-200/50'
                : 'text-slate-700 bg-slate-100'
            }`}>
              {solicitacao.tipoAtendimento || 'NORMAL'}
            </span>
          </div>

          {solicitacao.tipoAtendimento === 'EMENDA' && (
            <div className="sm:col-span-2 bg-indigo-50/50 border border-indigo-100/80 p-3 rounded-lg">
              <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-widest block mb-2">Dados da Emenda Parlamentar</span>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block uppercase font-medium text-[9px] tracking-wide mb-0.5">Número do PAF</span>
                  <strong className="text-slate-800 font-mono text-sm">{solicitacao.numPaf || 'NÃO CONFIGURADO'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase font-medium text-[9px] tracking-wide mb-0.5">Ano da Emenda</span>
                  <strong className="text-slate-800 font-mono text-sm">{solicitacao.anoEmenda || 'NÃO CONFIGURADO'}</strong>
                </div>
              </div>
            </div>
          )}

          <div>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-1">Valor Estimado Planilha</span>
            <span className="text-slate-950 font-mono text-sm font-semibold">
              {solicitacao.valorPlanilha ? `R$ ${solicitacao.valorPlanilha.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não informado'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-1">ISS Retido</span>
            <span className="text-slate-800 text-sm font-medium">{solicitacao.iss || 'Não informado'}</span>
          </div>

          <div>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-1">Imóvel Tombado</span>
            <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-xs font-medium ${
              solicitacao.tombado && solicitacao.tombado !== 'NÃO É TOMBADO'
                ? 'bg-purple-100/70 text-purple-900 border border-purple-200' 
                : 'text-slate-700 bg-slate-100'
            }`}>
              <span>{solicitacao.tombado || 'NÃO INFORMADO'}</span>
              {solicitacao.orgaoTombador && (
                <span className="text-[10px] opacity-75 font-bold uppercase bg-purple-200/50 px-1 rounded">
                  {solicitacao.orgaoTombador}
                </span>
              )}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-1">Imóvel Coabitado</span>
            <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-xs font-medium ${
              solicitacao.coabitado === 'SIM'
                ? 'bg-blue-100/70 text-blue-900 border border-blue-200' 
                : 'text-slate-700 bg-slate-100'
            }`}>
              <span>{solicitacao.coabitado || 'NÃO'}</span>
              {solicitacao.coabitado === 'SIM' && solicitacao.tipoCoabitado && (
                <span className="text-[10px] opacity-75 font-bold uppercase bg-blue-200/50 px-1 rounded">
                  {solicitacao.tipoCoabitado}
                </span>
              )}
            </span>
          </div>

          {solicitacao.origemDemanda && solicitacao.origemDemanda !== 'Não há notificação' && (
            <div className="col-span-2">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-1">Notificação / Órgão Regulador</span>
              <span className="text-amber-800 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-xs leading-normal block">
                🚨 {solicitacao.origemDemanda}
              </span>
            </div>
          )}

          <div>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-1">Responsável Técnico</span>
            <span className="text-slate-800 text-sm font-semibold block">{solicitacao.responsavel || 'Não cadastrado'}</span>
          </div>
        </div>

        {/* Descrição Folha de Rosto */}
        {solicitacao.descricaoFolhaRosto && (
          <div className="pt-4 border-t border-slate-100">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-1.5">Descrição Técnica do Escopo</span>
            <p className="text-slate-600 text-xs leading-relaxed font-sans max-w-5xl bg-slate-50 p-3 rounded-lg border border-slate-100">{solicitacao.descricaoFolhaRosto}</p>
          </div>
        )}
        </div>
      )}

      {/* ABAS DO WORKSPACE INTERNO - PROFESSIONAL POLISH */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {!hideTabs && (
          <div className="flex border-b border-slate-200 bg-slate-50/75 overflow-x-auto">
            <button
              onClick={() => setActiveTab('checklist')}
              className={`px-5 py-3.5 border-b-2 text-xs font-bold tracking-wider uppercase shrink-0 transition-all cursor-pointer ${
                activeTab === 'checklist' 
                  ? 'border-blue-600 text-blue-600 bg-white' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              Check list documental
            </button>
            
            <button
              onClick={() => setActiveTab('paf')}
              disabled={solicitacao.etapaAtual === 'cadastro' || solicitacao.etapaAtual === 'analise'}
              className={`px-5 py-3.5 border-b-2 text-xs font-bold tracking-wider uppercase shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                solicitacao.etapaAtual === 'cadastro' || solicitacao.etapaAtual === 'analise'
                  ? 'opacity-40 cursor-not-allowed text-slate-400'
                  : activeTab === 'paf'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              {solicitacao.etapaAtual === 'cadastro' || solicitacao.etapaAtual === 'analise' ? '🔒' : ''} Ficha PAF (Homologação)
            </button>

            <button
              onClick={() => setActiveTab('execucao')}
              disabled={solicitacao.etapaAtual === 'cadastro' || solicitacao.etapaAtual === 'analise' || solicitacao.etapaAtual === 'paf_autorizacao' || solicitacao.etapaAtual === 'paf'}
              className={`px-5 py-3.5 border-b-2 text-xs font-bold tracking-wider uppercase shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                solicitacao.etapaAtual === 'cadastro' || solicitacao.etapaAtual === 'analise' || solicitacao.etapaAtual === 'paf_autorizacao' || solicitacao.etapaAtual === 'paf'
                  ? 'opacity-40 cursor-not-allowed text-slate-400'
                  : activeTab === 'execucao'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              {solicitacao.etapaAtual === 'cadastro' || solicitacao.etapaAtual === 'analise' || solicitacao.etapaAtual === 'paf_autorizacao' || solicitacao.etapaAtual === 'paf' ? '🔒' : ''} Execução & Medições da Obra
            </button>

            <button
              onClick={() => setActiveTab('ajustes')}
              disabled={solicitacao.etapaAtual !== 'execucao'}
              className={`px-5 py-3.5 border-b-2 text-xs font-bold tracking-wider uppercase shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                solicitacao.etapaAtual !== 'execucao'
                  ? 'opacity-40 cursor-not-allowed text-slate-400'
                  : activeTab === 'ajustes'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              {solicitacao.etapaAtual !== 'execucao' ? '🔒' : ''} Ajustes de Planilha
            </button>

            <button
              onClick={() => setActiveTab('aditivos')}
              disabled={solicitacao.etapaAtual !== 'execucao'}
              className={`px-5 py-3.5 border-b-2 text-xs font-bold tracking-wider uppercase shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                solicitacao.etapaAtual !== 'execucao'
                  ? 'opacity-40 cursor-not-allowed text-slate-400'
                  : activeTab === 'aditivos'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              {solicitacao.etapaAtual !== 'execucao' ? '🔒' : ''} Aditivos do Contrato
            </button>

            <button
              onClick={() => setActiveTab('conclusao')}
              disabled={solicitacao.etapaAtual !== 'execucao'}
              className={`px-5 py-3.5 border-b-2 text-xs font-bold tracking-wider uppercase shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                solicitacao.etapaAtual !== 'execucao'
                  ? 'opacity-40 cursor-not-allowed text-slate-400'
                  : activeTab === 'conclusao'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              {solicitacao.etapaAtual !== 'execucao' ? '🔒' : ''} Conclusão de Obra
            </button>
          </div>
        )}

        {/* CONTEÚDO DA ABA 1: CHECKLIST DE DOCUMENTOS */}
        {activeTab === 'checklist' && activeSubTask === 'analise' && (
          <ProcessAnalysisPanel
            solicitacao={solicitacao}
            perfilUsuario={perfilUsuario}
            onUpdate={onUpdate}
            hideTransitionButtons={hideTransitionButtons}
            isMyAssignment={isMyAssignment}
            finalizarAnaliseDore={finalizarAnaliseDore}
            reviewAllWithIA={reviewAllWithIA}
            solicitarDevolucaoProcesso={solicitarDevolucaoProcesso}
            handleSimulatedUpload={handleSimulatedUpload}
            handleAISmartAnalysis={handleAISmartAnalysis}
            removerDocumento={removerDocumento}
            enviarAprovacaoFinal={enviarAprovacaoFinal}
            enviarReprovacaoFinal={enviarReprovacaoFinal}
            somenteLeitura={somenteLeitura}
          />
        )}

        {/* CONTEÚDO DA ABA 1: CHECKLIST DE DOCUMENTOS */}
        {activeTab === 'checklist' && activeSubTask !== 'analise' && (
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100 mb-6">
              <div>
                <h2 className="font-display text-lg font-bold text-neutral-800">
                  Check list documental
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Análise, validação e retornos para correção imediata dos relatórios de engenharia.
                </p>
              </div>

              {/* Action buttons corresponding to Role Permissions */}
              <div className="flex items-center gap-2">
                {/* Simulated Quick Action block for Engineer to approve/evaluate quickly */}
                {(perfilUsuario === 'analista_dore' || (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore')) && isMyAssignment && solicitacao.etapaAtual === 'analise' && (
                  <>
                    <button
                      onClick={reviewAllWithIA}
                      className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Avalia automaticamente documentos anexados simulando critérios de engenharia."
                    >
                      <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                      Parecer Rápido com IA
                    </button>

                    <button
                      data-testid="botao-aprovar-processo"
                      onClick={finalizarAnaliseDore}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer border ${
                        solicitacao.documentos.some(d => d.status === 'recusado')
                          ? 'bg-red-600 border-red-600 hover:bg-red-700 text-white'
                          : 'bg-emerald-600 border-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {solicitacao.documentos.some(d => d.status === 'recusado') ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 text-white" />
                          Retornar com Pendências
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-white" />
                          Aprovar Processo (Avançar para PAF)
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* BANNER DE ATRIBUIÇÃO PARA O ANALISTA DORE */}
            {(perfilUsuario === 'analista_dore' || (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore')) && (
              <div className="mb-6 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3 font-sans bg-white shadow-xs border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 border border-slate-200/50">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                      Atribuição da Demanda (DORE)
                      {solicitacao.etapaAtual === 'analise' && (() => {
                        const resultado = calcularSlaCorrente(solicitacao.analiseSla || {});
                        const info = STATUS_SLA_INFO[resultado.status];
                        const checkpointLabel = resultado.checkpoint === 'atribuicao' ? 'p/ atribuir' : resultado.checkpoint === 'inicio' ? 'p/ iniciar' : 'p/ concluir';
                        return (
                          <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 ${info.corBadge}`} title={`SLA ${checkpointLabel}: ${formatarDuracaoHoras(resultado.horasRestantes)} ${resultado.horasRestantes >= 0 ? 'restantes' : 'de atraso'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${info.corPonto}`} />
                            SLA {info.label}
                          </span>
                        );
                      })()}
                    </p>
                    <p className="text-slate-500 text-[10.5px]">
                      {solicitacao.analistaAtribuido
                        ? `Responsável técnico: ${solicitacao.analistaAtribuido}`
                        : '⚠️ Ninguém atribuído. Esta demanda precisa ser encaminhada por um Gestor DORE.'}
                    </p>
                  </div>
                </div>
                <div>
                  {isMyAssignment ? (
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-150 text-emerald-805 border border-emerald-250 font-bold px-2.5 py-1 rounded-full text-[10.5px]">
                        ✓ Atribuído a você
                      </span>
                      {solicitacao.etapaAtual === 'analise' && !solicitacao.analiseSla?.dataInicioAnalise && (
                        <button
                          onClick={() => onUpdate({
                            ...solicitacao,
                            analiseSla: { ...solicitacao.analiseSla, dataInicioAnalise: new Date().toISOString() },
                          })}
                          className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1"
                          title="Registra o início formal da análise, começando a contar o SLA de conclusão"
                        >
                          <Play className="w-3 h-3" />
                          Iniciar Análise
                        </button>
                      )}
                      {solicitacao.etapaAtual === 'analise' && (
                        <button
                          data-testid="botao-aprovar-processo"
                          onClick={finalizarAnaliseDore}
                          className={`px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 border border-emerald-500`}
                          title="Aprovar e Avançar para Autorização do PAF"
                        >
                          <CheckCircle className="w-3 h-3 text-white" />
                          Aprovar Análise DORE
                        </button>
                      )}
                    </div>
                  ) : solicitacao.analistaAtribuido ? (
                    <span className="bg-amber-50 text-amber-800 border border-amber-200 font-medium px-2.5 py-1 rounded-full text-[10.5px]">
                      🔒 Somente Leitura (Responsabilidade de {solicitacao.analistaAtribuido})
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        onUpdate({
                          ...solicitacao,
                          analistaAtribuido: 'Flavia Borges'
                        });
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer"
                      title="Atribuir demanda a mim mesmo para iniciar análise técnica"
                    >
                      Atribuir a mim e Analisar
                    </button>
                  )}
                </div>
              </div>
            )}

            {(solicitacao.auxiliares || []).length > 0 && solicitacao.etapaAtual === 'analise' && (
              <div className="mb-6">
                <PainelParecerAuxiliar
                  auxiliares={solicitacao.auxiliares || []}
                  nomeUsuarioLogado={currentUserNome}
                  salvandoId={salvandoAuxiliarId}
                  onSalvarParecer={handleSalvarParecerAuxiliar}
                />
              </div>
            )}

            {/* Beautiful display of the custom-aggregated consolidated technical opinion */}
            {solicitacao.parecerConsolidado && (
              <div id="card-parecer-consolidado" className="mb-6 bg-slate-50 border border-slate-300 rounded-xl overflow-hidden shadow-xs font-sans">
                <div className="bg-slate-800 text-slate-100 px-4 py-3 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-400" />
                    Parecer Técnico Consolidado (DORE)
                  </span>
                  {solicitacao.contadorAnalises && solicitacao.contadorAnalises > 0 && (
                    <span className="text-[10.5px] bg-blue-600/50 border border-blue-500 text-blue-200 px-2.5 py-0.5 rounded-full font-bold">
                      {solicitacao.contadorAnalises}º Ciclo de Avaliação
                    </span>
                  )}
                </div>
                <div className="p-4 bg-white border-b border-slate-200">
                  <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto bg-slate-50/50 border border-slate-200/80 p-4 rounded-xl select-text">
                    {solicitacao.parecerConsolidado}
                  </pre>
                  <p className="text-[10.5px] text-slate-500 mt-3 font-medium flex items-center gap-1">
                    <span>💡 Este parecer técnico é automaticamente compilado com base nas avaliações e observações individuais cadastradas pelo Analista de Engenharia da DORE para cada documento.</span>
                  </p>
                </div>
              </div>
            )}

            {/* Warning if there are Rejected Docs */}
            {solicitacao.documentos.some(d => d.status === 'recusado') && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold block text-sm">Pendências de Engenharia Identificadas</span>
                    <span>O dossier atual possui pendências apontadas pelo engenheiro da DORE. O técnico de infraestrutura deve providenciar a substituição dos arquivos recusados e re-enviar para reanálise assim que as correções forem anexadas.</span>
                    <div className="bg-white/80 p-2.5 rounded-lg border border-red-100 mt-2 font-mono text-neutral-700 scale-[0.98] origin-left">
                      <span className="font-bold text-red-700 text-[10px] uppercase block mb-1">Itens a Corrigir:</span>
                      {solicitacao.documentos.filter(d => d.status === 'recusado').map(d => (
                        <div key={d.id} className="mb-1 last:mb-0">
                          • <strong className="text-neutral-800 font-sans">{d.nome}</strong>: {d.justificativa}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Checklist Items Table/Flex */}
            <div className="space-y-4">
              {solicitacao.documentos.map((doc, idx) => {
                const isUploaded = doc.fileName !== undefined;
                const uploadRefId = `${doc.id}-input`;
                const faltandoObrigatorio = tentouEnviarDore && doc.obrigatorio && !isUploaded;

                return (
                  <div
                    data-testid={`doc-${doc.id}`}
                    key={doc.id}
                    className={`p-4 rounded-xl border transition-all ${
                      faltandoObrigatorio
                        ? 'border-red-400 bg-red-50/40'
                        : doc.status === 'recusado'
                          ? 'border-red-200 bg-red-50/15'
                          : doc.status === 'aprovado'
                            ? 'border-emerald-100 bg-emerald-50/5'
                            : 'border-neutral-200 hover:border-neutral-300 bg-white'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Info & Description */}
                      <div className="max-w-xl">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                            doc.status === 'aprovado' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : doc.status === 'recusado'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : doc.status === 'nao_se_aplica'
                                  ? 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                                  : 'bg-neutral-50 text-neutral-600 border border-neutral-100'
                          }`}>
                            Item {idx + 1}
                          </span>
                          <h4 className="font-display font-bold text-neutral-800 text-sm">
                            {doc.nome}
                          </h4>
                          {doc.obrigatorio ? (
                            <span className="text-[10px] font-bold text-red-500 uppercase">Obrigatório</span>
                          ) : (
                            <span className="text-[10px] font-medium text-neutral-400 capitalize">Opcional</span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                          {doc.desc}
                        </p>

                        {/* File details if uploaded */}
                        {isUploaded ? (
                          <div className="mt-3 flex items-center gap-3 bg-neutral-50 border border-neutral-200/60 p-2.5 rounded-lg text-xs">
                            <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <span className="font-mono font-medium text-neutral-800 block truncate">{doc.fileName}</span>
                              <span className="text-[10px] text-neutral-400 font-mono">Tamanho: {doc.fileSize} | Anexado em: {doc.uploadedAt}</span>
                            </div>
                            
                            {/* Download Action */}
                            <button
                              type="button"
                              onClick={() => handleDownloadDoc(doc)}
                              className="text-blue-600 hover:text-blue-850 p-1.5 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer inline-flex items-center gap-1 font-extrabold text-[10.5px] uppercase tracking-wider border border-blue-200"
                              title="Baixar Documento"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Baixar</span>
                            </button>

                            {/* Delete Uploaded Doc - Available only for technical profiles during edit states */}
                            {(perfilUsuario === 'tecnico_infra') && (solicitacao.etapaAtual === 'cadastro') && doc.status !== 'aprovado' && (
                              <button 
                                onClick={() => removerDocumento(doc.id)}
                                className="text-red-500 hover:text-red-705 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                title="Remover Arquivo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className={`text-[11px] italic block mt-2 font-mono ${
                            faltandoObrigatorio ? 'text-red-600 font-bold not-italic' : 'text-neutral-400'
                          }`}>
                            ⚠️ Nenhum documento anexado ainda.
                          </span>
                        )}

                        {/* Justification / Notes details shown if NOT currently in active review mode by this engineer */}
                        {doc.justificativa && (solicitacao.etapaAtual !== 'analise' || perfilUsuario !== 'analista_dore' || !isMyAssignment) && (
                          <div className={`mt-3 p-3 rounded-xl border text-xs font-sans ${
                            doc.status === 'recusado' 
                              ? 'bg-red-50/50 border-red-200 text-red-850'
                              : doc.status === 'aprovado'
                                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-850'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}>
                            <span className="font-bold flex items-center gap-1 text-[9.5px] uppercase tracking-wider">
                              {doc.status === 'recusado' ? '❌ Pendência Técnica Identificada' : doc.status === 'aprovado' ? '✅ Nota de Validação do Analista' : 'ℹ️ Observação de Análise'}:
                            </span>
                            <p className="mt-1 font-sans leading-relaxed">{doc.justificativa}</p>
                            {doc.id === 'doc_1' && doc.status === 'recusado' && doc.arquivoDevolucaoFileName && (
                              <button
                                type="button"
                                onClick={() => handleDownloadArquivoDevolucao(doc)}
                                className="mt-2.5 inline-flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-red-700 hover:text-red-850 border border-red-300 bg-white hover:bg-red-50 rounded-lg px-2.5 py-1.5 cursor-pointer transition-colors"
                              >
                                📥 Baixar arquivo com marcações do analista
                              </button>
                            )}
                          </div>
                        )}

                        {/* 2. OPEN TEXT AREA FOR ACTIVE ANALYST REVIEW - CAMPO DE TEXTO ABERTO DE ANÁLISE EM TEMPO REAL */}
                        {(perfilUsuario === 'analista_dore' || (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore')) && isMyAssignment && solicitacao.etapaAtual === 'analise' && (
                          <div className="mt-4 space-y-2 p-3.5 border border-slate-200 rounded-xl bg-slate-50 shadow-inner">
                            <div className="flex items-center justify-between">
                              <label htmlFor={`analise-doc-${doc.id}`} className="text-[11px] font-bold text-slate-755 flex items-center gap-1.5 font-sans">
                                <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                                Parecer de Análise Física / Documental do Analista:
                              </label>
                              <span className="text-[9.5px] text-slate-400 font-mono">Salva no modelo automaticamente</span>
                            </div>
                            <textarea
                              id={`analise-doc-${doc.id}`}
                              value={doc.justificativa || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                const updatedDocs = solicitacao.documentos.map(d => {
                                  if (d.id === doc.id) {
                                    return { ...d, justificativa: val };
                                  }
                                  return d;
                                });
                                onUpdate({ ...solicitacao, documentos: updatedDocs });
                              }}
                              placeholder="Digite aqui as considerações, conformidades encontradas ou as justificativas detalhadas para correções..."
                              className="w-full text-xs p-2.5 border border-slate-250 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 font-sans text-slate-800 focus:outline-hidden leading-relaxed"
                              rows={2.5}
                            />
                          </div>
                        )}
                      </div>

                      {/* Right: Actions depending on Profile Role */}
                      <div className="shrink-0 flex items-center gap-3">
                        
                        {/* 1. TECNICO DE INFRAESTRUTURA ACTIONS */}
                        {perfilUsuario === 'tecnico_infra' && (
                          <div className="flex items-center gap-2">
                            {solicitacao.etapaAtual === 'cadastro' ? (
                              doc.status === 'aprovado' ? (
                                <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 font-sans shadow-xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  🔒 Validado (Imutável)
                                </span>
                              ) : (
                                <div>
                                  <input
                                    data-testid={`doc-${doc.id}-anexar`}
                                    type="file"
                                    id={uploadRefId}
                                    ref={el => { fileInputRefs.current[doc.id] = el }}
                                    onChange={(e) => handleSimulatedUpload(doc.id, e)}
                                    className="hidden"
                                  />
                                  <button
                                    onClick={() => handleTriggerUpload(doc.id)}
                                    className={`px-3 py-1.5 border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                                      isUploaded 
                                        ? 'bg-neutral-50 text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                                        : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                                    }`}
                                  >
                                    <UploadCloud className="w-3.5 h-3.5" />
                                    {isUploaded ? 'Substituir Código' : 'Anexar Documento'}
                                  </button>
                                </div>
                              )
                            ) : (
                              <span className="text-xs text-neutral-400 border border-neutral-100 px-2 py-1 rounded bg-neutral-50/50 font-mono">
                                Apenas Leitura (Enviado)
                              </span>
                            )}
                          </div>
                        )}

                        {/* 2. ENGENHEIRO DORE ACTIONS */}
                        {(perfilUsuario === 'analista_dore' || (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore')) && isMyAssignment && (
                          <div className="flex flex-col items-end gap-2">
                            {solicitacao.etapaAtual === 'analise' ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-1 bg-neutral-100 p-1.5 rounded-xl border border-neutral-200">
                                  <button
                                    onClick={() => setDocumentStatus(doc.id, 'aprovado')}
                                    disabled={!isUploaded}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                      doc.status === 'aprovado'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'text-neutral-600 hover:bg-neutral-200'
                                    } ${!isUploaded ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    title="Aprovar Documento"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Aprovar
                                  </button>

                                  <button
                                    data-testid={`doc-${doc.id}-recusar`}
                                    onClick={() => doc.id === 'doc_1' ? abrirModalDevolucao(doc.id) : setDocumentStatus(doc.id, 'recusado')}
                                    disabled={!isUploaded}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                      doc.status === 'recusado'
                                        ? 'bg-red-600 text-white shadow-xs'
                                        : 'text-neutral-600 hover:bg-neutral-200'
                                    } ${!isUploaded ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    title="Recusar Documento"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    Recusar
                                  </button>

                                  <button
                                    onClick={() => setDocumentStatus(doc.id, 'nao_se_aplica')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                      doc.status === 'nao_se_aplica'
                                        ? 'bg-neutral-600 text-white shadow-xs'
                                        : 'text-neutral-600 hover:bg-neutral-200'
                                    }`}
                                    title="Não Se Aplica"
                                  >
                                    Não se Aplica
                                  </button>
                                </div>

                                {isUploaded && (
                                  <button 
                                    onClick={() => handleAISmartAnalysis(doc.id)}
                                    className="w-full text-center text-[10px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center justify-center gap-1 bg-indigo-50 border border-indigo-100 rounded-lg py-1.5 transition-colors cursor-pointer"
                                  >
                                    <Sparkles className="w-3 h-3 animate-bounce" />
                                    Gerar Análise IA
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs">
                                {doc.status === 'aprovado' && <span className="text-emerald-700 font-bold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Validado</span>}
                                {doc.status === 'recusado' && <span className="text-red-700 font-bold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Recusado</span>}
                                {doc.status === 'nao_se_aplica' && <span className="text-neutral-500 font-bold">N/A</span>}
                                {doc.status === 'pendente' && <span className="text-neutral-400 font-mono italic">Pendente de Ação</span>}
                              </div>
                            )}
                          </div>
                        )}

                        {/* OTHER USER ROLES PREVIEWS */}
                        {((perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'analista_dore') || (perfilUsuario === 'analista_dore' && !isMyAssignment)) && (
                          <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-neutral-500">
                            Status: <span className={`uppercase font-bold ${
                              doc.status === 'aprovado' ? 'text-emerald-600' : doc.status === 'recusado' ? 'text-red-500' : 'text-neutral-400'
                            }`}>{doc.status}</span>
                          </div>
                        )}

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* BARRA DE BOTÕES DE TRANSIÇÃO DO CHECKLIST */}
            <div className="border-t border-neutral-100 pt-6 mt-6 flex justify-between items-center bg-neutral-50/50 p-4 rounded-xl border">
              <div className="text-xs text-neutral-500 max-w-md">
                <span className="font-bold text-neutral-600 block">Etapas consecutivas:</span>
                Técnico anexa documentos obrigatórios → Engenheiro valida ou aponta erros → Aprovados completam e abrem o envio do PAF.
              </div>

              <div>
                {/* 1. Técnico enviando para Engenharia */}
                {perfilUsuario === 'tecnico_infra' && solicitacao.etapaAtual === 'cadastro' && !hideTransitionButtons && (
                  <div className="text-right">
                    {tentouEnviarDore && !canSendToDore() && (
                      <span className="text-xs text-red-600 font-semibold block mb-2">
                        ⚠️ Aguardando anexo dos {solicitacao.documentos.filter(d => d.obrigatorio && !d.fileName).length} docs obrigatórios restantes (destacados em vermelho acima).
                      </span>
                    )}
                    <button
                      onClick={enviarParaDore}
                      className="px-5 py-2.5 rounded-lg text-sm font-semibold shadow-xs transition-all flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                    >
                      Enviar documentação para atendimento DORE
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* 1b. Técnico solicitando devolução se já enviado e antes de atribuição */}
                {perfilUsuario === 'tecnico_infra' && solicitacao.etapaAtual === 'analise' && !solicitacao.analistaAtribuido && !hideTransitionButtons && (
                  <div className="text-right space-y-1.5">
                    <span className="text-xs text-amber-600 block font-medium">
                      ⚠️ O processo está na DORE aguardando atribuição de analista.
                    </span>
                    <button
                      type="button"
                      onClick={solicitarDevolucaoProcesso}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-white" />
                      Solicitar Devolução do Processo (Resgatar)
                    </button>
                    <p className="text-[10px] text-neutral-400 max-w-sm ml-auto">
                      Caso tenha esquecido algum documento ou enviado errado, você pode resgatar a ficha cadastral para correção enquanto nenhum analista iniciou os trabalhos.
                    </p>
                  </div>
                )}

                {/* 2. Engenheiro DORE finalizando análise */}
                {(perfilUsuario === 'analista_dore' || (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore')) && isMyAssignment && solicitacao.etapaAtual === 'analise' && !hideTransitionButtons && (
                  <div className="text-right">
                    {solicitacao.documentos.some(d => d.status === 'pendente' && d.fileName) && (
                      <span className="text-xs text-amber-600 font-semibold block mb-2">
                        💡 Recomenda-se definir parecer em todos os documentos anexados.
                      </span>
                    )}
                    
                    <button
                      data-testid="botao-aprovar-processo"
                      onClick={finalizarAnaliseDore}
                      className={`px-5 py-2.5 rounded-lg text-sm font-semibold shadow-xs transition-all flex items-center gap-2 ml-auto ${
                        solicitacao.documentos.some(d => d.status === 'recusado')
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {solicitacao.documentos.some(d => d.status === 'recusado') ? (
                        <>
                          <RefreshCw className="w-4 h-4 text-white animate-spin-reverse" />
                          Retornar com Pendências para Técnico
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 text-white" />
                          Aprovar Processo (Avançar para Autorização do PAF)
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Ajuda visual caso não seja analista_dore ou não esteja atribuído */}
                {solicitacao.etapaAtual === 'analise' && (!isMyAssignment || perfilUsuario !== 'analista_dore') && (
                  <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 text-xs">
                    <p className="font-bold flex items-center gap-1.5 font-sans">
                      <Info className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                      Como aprovar e avançar este processo para a etapa de Autorização do PAF?
                    </p>
                    <p className="mt-1 leading-relaxed">
                      Para visualizar os botões de aprovação de análise do processo, altere o seu perfil para <strong className="underline">Analista de Engenharia (DORE)</strong> no painel de perfis da barra lateral esquerda e certifique-se de que a demanda está atribuída para <strong className="underline">Flavia Borges</strong> ou <strong className="underline">Eng. André Silva</strong> (ou clique no botão "Atribuir a mim e Analisar" no topo do checklist).
                    </p>
                  </div>
                )}

                {/* Info block for others */}
                {solicitacao.etapaAtual !== 'cadastro' && solicitacao.etapaAtual !== 'analise' && (
                  <span className="text-xs text-emerald-600 border border-emerald-200 bg-emerald-50 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 font-sans">
                    <CheckCircle className="w-4 h-4" /> Checklist Técnico Validado e Aprovado pelo Analista DORE!
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA 2: PAF FICHA DE HOMOLOGAÇÃO */}
        {activeTab === 'paf' && (
          <div className="p-6">
            <div className="pb-4 border-b border-neutral-100 mb-6 font-sans">
              <h2 className="font-display text-lg font-bold text-neutral-800">
                Plano de Atendimento Financeiro (PAF)
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Instrua o número oficial do PAF e acompanhe o fluxo de geração e pagamento do recurso para início imediato da execução financeira.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Form Info */}
              <div className="lg:col-span-2 space-y-6">
                <form onSubmit={salvarPAF} className="space-y-6">
                  {/* Bloco 1: Acompanhamento do PAF */}
                  <div className="bg-neutral-50 p-6 rounded-xl border border-neutral-200 space-y-4 text-left font-sans">
                    <h3 className="font-display font-bold text-sm text-neutral-700 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-neutral-200/60">
                      <FileCheck className="w-4 h-4 text-neutral-500" />
                      Editar Ficha de Acompanhamento do PAF
                    </h3>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-600 mb-1 uppercase tracking-wider">
                          Número Oficial do PAF *
                        </label>
                        <input
                          data-testid="paf-numero"
                          type="text"
                          placeholder="Ex: PAF-3320-2026"
                          value={numPAFInput}
                          onChange={(e) => setNumPAFInput(e.target.value)}
                          disabled={perfilUsuario !== 'administrativo_dore'}
                          className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                          required
                        />
                        <p className="text-[10px] text-neutral-400 mt-1">Código único de registro do plano financeiro.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-600 mb-1 uppercase tracking-wider">
                          Data de Criação do PAF
                        </label>
                        <input
                          type="date"
                          value={dataPAFInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDataPAFInput(val);
                            setDataVigenciaPAFInput(getCalculatedVigencia(val));
                          }}
                          disabled={perfilUsuario !== 'administrativo_dore'}
                          className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white font-mono text-neutral-800"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-neutral-600 mb-1 uppercase tracking-wider flex items-center gap-1">
                          Data de Vigência <span className="text-[10px] text-blue-600 font-extrabold lowercase font-sans">(automático)</span>
                        </label>
                        <input
                          type="date"
                          value={dataVigenciaPAFInput}
                          disabled={true}
                          title="Vigência automática calculada em 5 anos com base na criação do PAF"
                          className="w-full px-3 py-2 text-sm border border-neutral-200 bg-neutral-100 rounded-lg font-mono text-neutral-500 cursor-not-allowed select-none"
                        />
                        <p className="text-[10px] text-blue-600 font-bold mt-1">🔒 Calculado automaticamente (Ano da Criação + 5).</p>
                      </div>
                    </div>
                  </div>

                  {/* Bloco 2: Financeiro */}
                  <div className="bg-neutral-50 p-6 rounded-xl border border-neutral-200 space-y-4 text-left font-sans">
                    <h3 className="font-display font-bold text-sm text-neutral-700 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-neutral-200/60">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Financeiro
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-600 mb-1 uppercase tracking-wider">
                          Data de Validação pelo DAFI
                        </label>
                        <input
                          type="date"
                          value={dataFinHomologacaoInput}
                          onChange={(e) => setDataFinHomologacaoInput(e.target.value)}
                          disabled={perfilUsuario !== 'administrativo_dore'}
                          className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white font-mono text-neutral-800 disabled:bg-neutral-100 disabled:text-neutral-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-neutral-600 mb-1 uppercase tracking-wider">
                          CNPJ da Caixa Escolar
                        </label>
                        <input
                          type="text"
                          value={cnpjCaixaAuto}
                          readOnly
                          placeholder="—"
                          className="w-full px-3 py-2 text-sm border border-neutral-200 bg-neutral-100 rounded-lg font-mono text-neutral-600 cursor-default select-none"
                        />
                        <p className="text-[10px] text-blue-600 font-bold mt-1">
                          {cnpjCaixaAuto ? '🔒 Preenchido automaticamente pelo CODESC.' : 'CODESC não encontrado na base.'}
                        </p>
                      </div>
                    </div>

                    {/* Registro de Pagamentos */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                          Registro de Pagamentos
                        </label>
                        {perfilUsuario === 'administrativo_dore' && (
                          <button
                            type="button"
                            onClick={() => setParcelasPAFInput(prev => [...prev, { id: `p_${Date.now()}`, valor: 0, dataPagamento: '', ordemPagamento: '' }])}
                            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition cursor-pointer border border-blue-200"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Adicionar Pagamento
                          </button>
                        )}
                      </div>

                      {parcelasPAFInput.length === 0 ? (
                        <p className="text-xs text-neutral-400 italic py-2">Nenhum pagamento registrado.</p>
                      ) : (
                        <div className="space-y-2">
                          {parcelasPAFInput.map((parcela, idx) => (
                            <div key={parcela.id} className="grid grid-cols-12 gap-2 items-center bg-white border border-neutral-200 rounded-lg px-3 py-2">
                              <span className="col-span-1 text-[10px] font-black text-neutral-400 uppercase">{idx + 1}ª</span>
                              <div className="col-span-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={parcela.valor || ''}
                                  onChange={(e) => setParcelasPAFInput(prev => prev.map(p => p.id === parcela.id ? { ...p, valor: parseFloat(e.target.value) || 0 } : p))}
                                  disabled={perfilUsuario !== 'administrativo_dore'}
                                  placeholder="Valor (R$)"
                                  className="w-full px-2 py-1.5 text-xs border border-neutral-300 rounded font-mono text-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-neutral-50 disabled:text-neutral-400"
                                />
                              </div>
                              <div className="col-span-3">
                                <input
                                  type="date"
                                  value={parcela.dataPagamento}
                                  onChange={(e) => setParcelasPAFInput(prev => prev.map(p => p.id === parcela.id ? { ...p, dataPagamento: e.target.value } : p))}
                                  disabled={perfilUsuario !== 'administrativo_dore'}
                                  className="w-full px-2 py-1.5 text-xs border border-neutral-300 rounded font-mono text-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-neutral-50 disabled:text-neutral-400"
                                />
                              </div>
                              <div className="col-span-4">
                                <input
                                  type="text"
                                  value={parcela.ordemPagamento || ''}
                                  onChange={(e) => setParcelasPAFInput(prev => prev.map(p => p.id === parcela.id ? { ...p, ordemPagamento: e.target.value } : p))}
                                  disabled={perfilUsuario !== 'administrativo_dore'}
                                  placeholder="Nº Ordem de Pagamento (opcional)"
                                  className="w-full px-2 py-1.5 text-xs border border-neutral-300 rounded font-mono text-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-neutral-50 disabled:text-neutral-400"
                                />
                              </div>
                              {perfilUsuario === 'administrativo_dore' && (
                                <button
                                  type="button"
                                  onClick={() => setParcelasPAFInput(prev => prev.filter(p => p.id !== parcela.id))}
                                  className="col-span-1 flex justify-center text-neutral-400 hover:text-rose-500 transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Resumo de pagamento */}
                      {valorPAFBase > 0 && (
                        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-neutral-200 text-xs text-neutral-600">
                          <span>
                            Valor PAF: <strong className="font-mono text-neutral-800">R$ {valorPAFBase.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                          </span>
                          <span>
                            Total Pago: <strong className={`font-mono ${pagoPAFDerived ? 'text-emerald-700' : totalPagoPAF > 0 ? 'text-amber-700' : 'text-neutral-500'}`}>
                              R$ {totalPagoPAF.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </strong>
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            statusPAFDerived === 'Pago e Liberado'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : statusPAFDerived === 'Pago Parcialmente'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {statusPAFDerived}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {perfilUsuario === 'administrativo_dore' && (
                    <div className="pt-4 flex flex-col sm:flex-row justify-end items-center gap-3 border-t border-slate-150">
                      <button
                        type="submit"
                        className="w-full sm:w-auto px-4 py-2 bg-slate-50 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        Salvar Provisório (Manter na Etapa 4)
                      </button>
                      <button
                        data-testid="botao-oficializar-paf"
                        type="button"
                        onClick={homologarEAvancarOrdemInicio}
                        className="w-full sm:w-auto px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-black transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider font-sans"
                      >
                        ⚡ Oficializar, Gerar PAF e Enviar para Execução (Liberar Obra)
                      </button>
                    </div>
                  )}
                </form>

                {/* Workflow Status Info */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 space-y-2">
                  <span className="font-bold block text-sm flex items-center gap-1">
                    <Info className="w-4 h-4 shrink-0" />
                    Validação do Processo e Liberação Orçamentária
                  </span>
                  <span>Quando todos os documentos técnicos são validados e o orçamento é homologado pela DORE, o processo ganha uma dotação orçamentária oficial (Número PAF) e segue em definitivo para a contratação da Construtora e Fiscalização regular das Medições de Obra.</span>
                </div>
              </div>

              {/* Right Column: Information Sidebar */}
              <div className="space-y-4">
                <div className="p-5 bg-white border border-neutral-200 rounded-xl space-y-4">
                  <h4 className="font-display font-medium text-xs text-neutral-400 uppercase tracking-widest">Acompanhamento do PAF</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="block text-xs text-neutral-500">Status do PAF</span>
                      <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-bold font-sans border ${
                        solicitacao.statusPAF === 'Pago e Liberado'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : solicitacao.statusPAF === 'Pago Parcialmente'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : solicitacao.statusPAF === 'Aguardando Pagamento'
                              ? 'bg-orange-50 text-orange-800 border-orange-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {solicitacao.statusPAF || 'Aguardando Geração'}
                      </span>
                    </div>

                    <div>
                      <span className="block text-xs text-neutral-500">Número de PAF Registrado</span>
                      <span className="text-sm font-semibold font-mono text-neutral-700">
                        {solicitacao.numeroPAF || 'Não registrado'}
                      </span>
                    </div>

                    <div>
                      <span className="block text-xs text-neutral-500">Data de Criação do PAF</span>
                      <span className="text-xs text-neutral-600 font-mono">
                        {solicitacao.dataHomologacao || 'Não cadastrada'}
                      </span>
                    </div>

                    <div>
                      <span className="block text-xs text-neutral-500">Data de Vigência</span>
                      <span className="text-xs text-neutral-600 font-mono">
                        {solicitacao.dataVigenciaPAF || 'Não cadastrada'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTÕES DE TRANSIÇÃO DO PAF */}
            {!hideTransitionButtons && (
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 -mx-6 -mb-6 mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg rounded-b-xl z-20">
                <div className="text-[11px] text-slate-500 font-sans max-w-sm">
                  {solicitacao.etapaAtual === 'paf' ? (
                    <span className="font-semibold text-blue-600 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      Instrua as informações do PAF para liberar as ações de engenharia de obra.
                    </span>
                  ) : (
                    <span className="font-semibold text-emerald-600 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      Status do PAF processado e homologado pelo Administrativo DORE!
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {solicitacao.etapaAtual === 'paf' ? (
                    <>
                      <button
                        data-testid="botao-homologar-ordem-inicio"
                        type="button"
                        onClick={perfilUsuario === 'administrativo_dore' ? homologarEAvancarOrdemInicio : undefined}
                        disabled={perfilUsuario !== 'administrativo_dore' || !numPAFInput}
                        className={`px-4 py-2 rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 ${
                          perfilUsuario === 'administrativo_dore' && numPAFInput
                            ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer hover:shadow-md'
                            : 'bg-slate-100 text-slate-500 cursor-not-allowed border border-slate-200'
                        }`}
                        title="Envia para a etapa de Ordem de Início convencional da fiscalização"
                      >
                        <Calendar className="w-3.5 h-3.5 text-slate-500 group-hover:text-white" />
                        Homologar e Liberar Ordem de Início
                      </button>

                      <button
                        type="button"
                        onClick={perfilUsuario === 'administrativo_dore' ? avancarDiretoParaExecucao : undefined}
                        disabled={perfilUsuario !== 'administrativo_dore' || !numPAFInput}
                        className={`px-4 py-2 rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 ${
                          perfilUsuario === 'administrativo_dore' && numPAFInput
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer hover:shadow-md'
                            : 'bg-slate-100 text-slate-500 cursor-not-allowed border border-slate-200'
                        }`}
                        title="Atalho: Avança diretamente para a Execução Física de Obra (Em Andamento)"
                      >
                        <Play className="w-3.5 h-3.5 text-slate-500 group-hover:text-white" />
                        Homologar e Iniciar Execução (Direto)
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-blue-600 border border-blue-200 bg-blue-50/75 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 font-sans shadow-xs">
                      <CheckCircle className="w-4 h-4 animate-pulse text-blue-600" /> Recurso PAF homologado e liberado para execução física da obra!
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONTEÚDO DA ABA 3: EXECUÇÃO DA OBRA */}
        {activeTab === 'execucao' && (
          <div className="p-6">
            <div className="pb-4 border-b border-neutral-100 mb-6 font-sans">
              <h2 className="font-display text-lg font-bold text-neutral-800 flex items-center gap-2">
                <HardHat className="w-5 h-5 text-neutral-600" />
                Andamento da Execução e Medições Periódicas
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Acompanhe as medições físicas validadas em campo pela fiscalização oficial e solicitações de aditivos de recursos de engenharia.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left & Middle Column */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* 0. SEÇÃO DE ORDEM DE INÍCIO - PRIMEIRA COISA A SER PREENCHIDA DENTRO DA EXECUÇÃO */}
                <div className="bg-slate-50/70 p-5 rounded-xl border border-blue-100 shadow-3xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/80 gap-2">
                    <div>
                      <h3 className="font-display font-black text-sm text-neutral-800 flex items-center gap-2">
                        <Calendar className="w-4.5 h-4.5 text-blue-600" />
                        Abertura de Obra: Ordem de Início (OI) e Complexidade
                      </h3>
                      <p className="text-[11px] text-neutral-500 font-sans mt-0.5">
                        Registre os dados de início da vigência de engenharia e anexe o Cronograma Físico-Financeiro.
                      </p>
                    </div>
                    {solicitacao.etapaAtual !== 'ordem_inicio' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-extrabold rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 uppercase tracking-widest">
                        <CheckCircle className="w-3 h-3 text-emerald-600" /> OI Emitida
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-extrabold rounded-lg bg-amber-50 border border-amber-200 text-amber-800 uppercase tracking-widest animate-pulse">
                        Aguardando OI
                      </span>
                    )}
                  </div>

                  <form onSubmit={salvarOrdemInicio} className="space-y-4 font-sans">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-600 mb-1 uppercase tracking-wider">
                          Data da Ordem de Início *
                        </label>
                        <input
                          data-testid="ordem-inicio-data"
                          type="date"
                          value={dataOrdemInicioInput}
                          onChange={(e) => setDataOrdemInicioInput(e.target.value)}
                          disabled={perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'gestor_paf'}
                          required
                          className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white font-mono text-neutral-700"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-neutral-600 mb-1 uppercase tracking-wider">
                          Previsão de Término da Obra *
                        </label>
                        <input
                          data-testid="ordem-inicio-previsao"
                          type="date"
                          value={previsaoTerminoInput}
                          onChange={(e) => setPrevisaoTerminoInput(e.target.value)}
                          disabled={perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'gestor_paf'}
                          required
                          className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white font-mono text-neutral-700"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-600 mb-1 uppercase tracking-wider">
                          Valor Homologado na Contratação *
                        </label>
                        <div className="relative rounded-lg shadow-sm">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <span className="text-neutral-500 text-xs">R$</span>
                          </div>
                          <input
                            data-testid="ordem-inicio-valor"
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            value={valorHomologadoContratacaoInput}
                            onChange={(e) => setValorHomologadoContratacaoInput(e.target.value)}
                            disabled={perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'gestor_paf'}
                            required
                            className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white font-mono text-neutral-700"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-neutral-600 mb-1 uppercase tracking-wider">
                          Tipo de Obra Ponderado *
                        </label>
                        <select
                          value={tipoObraInput}
                          onChange={(e) => setTipoObraInput(e.target.value)}
                          disabled={perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'gestor_paf'}
                          required
                          className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-neutral-700"
                        >
                          <option value="Construção">Construção (Classe IV - Peso 5)</option>
                          <option value="Ampliação / Quadra">Ampliação / Quadra (Classe III - Peso 4)</option>
                          <option value="Reforma">Reforma (Classe II/III - Peso 3)</option>
                          <option value="Acessibilidade">Acessibilidade (Classe I/II - Peso 2)</option>
                          <option value="Projeto">Projeto (Classe I - Peso 1)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-600 mb-1 uppercase tracking-wider">
                          Fiscal de Obra Atribuído *
                        </label>
                        <input
                          type="text"
                          placeholder="Digite o nome do engenheiro fiscal responsável pela obra"
                          value={fiscalObraAtribuidoInput}
                          onChange={(e) => setFiscalObraAtribuidoInput(e.target.value)}
                          disabled={perfilUsuario !== 'coordenador_regional' && perfilUsuario !== 'gestor_paf'}
                          required
                          className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-neutral-700"
                        />
                      </div>
                    </div>

                    {/* COMPLEXIDADE REAL-TIME */}
                    <div className="p-4 bg-white/70 border border-slate-205 rounded-xl space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-2 gap-1.5">
                        <h4 className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-blue-600" /> Enquadramento de Complexidade da Obra
                        </h4>
                        <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${complexidadeCalculada.colorClass}`}>
                          Classe {complexidadeCalculada.classe} • {complexidadeCalculada.classificacao}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-[10px] text-neutral-500 font-sans">
                        <div>
                          <span className="block text-neutral-400 font-bold uppercase">Soma Ponderada</span>
                          <span className="font-extrabold text-blue-700 font-mono block mt-0.5">{complexidadeCalculada.pontuacao} / 5.00</span>
                        </div>
                        <div>
                          <span className="block text-neutral-400 font-bold uppercase">Durabilidade</span>
                          <span className="font-bold text-neutral-800 block mt-0.5">{parsedMeses} meses</span>
                        </div>
                        <div>
                          <span className="block text-neutral-400 font-bold uppercase">Classe Alocada</span>
                          <span className="font-bold text-neutral-800 block mt-0.5">Classe {complexidadeCalculada.classe}</span>
                        </div>
                      </div>
                    </div>

                    {/* FILE CRONOGRAMA */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                        Cronograma Físico-Financeiro Executivo *
                      </label>
                      {solicitacao.cronogramaFisicoFinanceiroFileName ? (
                        <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                            <div className="truncate">
                              <span className="block text-xs font-bold text-neutral-800 truncate break-all">{solicitacao.cronogramaFisicoFinanceiroFileName}</span>
                              <span className="text-[9px] text-neutral-400 font-mono block mt-0.5">
                                {solicitacao.cronogramaFisicoFinanceiroFileSize} • {solicitacao.cronogramaFisicoFinanceiroUploadedAt}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleDownloadDocument(solicitacao.cronogramaFisicoFinanceiroFileName!, "Cronograma Físico-Financeiro Executivo")}
                              className="text-blue-600 hover:text-blue-800 text-xs font-bold px-2 py-1 hover:bg-blue-50 rounded transition-all cursor-pointer flex items-center gap-1 shrink-0"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Baixar
                            </button>
                            {(perfilUsuario === 'tecnico_infra' || (perfilUsuario === 'gestor_paf' || (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore'))) && (
                              <button
                                type="button"
                                onClick={removerCronograma}
                                className="px-2 py-1 text-[10px] text-rose-600 hover:bg-rose-50 rounded-md font-bold transition-colors cursor-pointer"
                              >
                                Remover
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div 
                          onClick={() => {
                            if (perfilUsuario === 'tecnico_infra' || (perfilUsuario === 'gestor_paf' || (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore'))) {
                              cronogramaInputRef.current?.click();
                            }
                          }}
                          className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                            perfilUsuario === 'tecnico_infra' || (perfilUsuario === 'gestor_paf' || (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore'))
                              ? 'border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50/50 cursor-pointer'
                              : 'border-neutral-200 bg-neutral-50/25 cursor-not-allowed'
                          }`}
                        >
                          <UploadCloud className="w-6 h-6 text-neutral-400 mx-auto mb-1" />
                          <span className="block text-xs font-bold text-neutral-700">Anexar cronograma físico-financeiro</span>
                          <span className="text-[9px] text-neutral-400 block mt-0.5">Formatos: .pdf, .xls, .xlsx (Máx: 10MB)</span>
                          <input
                            data-testid="ordem-inicio-cronograma"
                            ref={cronogramaInputRef}
                            type="file"
                            accept=".pdf,.xls,.xlsx"
                            onChange={handleCronogramaUpload}
                            className="hidden"
                            disabled={perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'gestor_paf'}
                          />
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex justify-end gap-2.5">
                      {(perfilUsuario === 'tecnico_infra' || (perfilUsuario === 'gestor_paf' || (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore'))) && (
                        <button
                          data-testid="ordem-inicio-salvar"
                          type="submit"
                          className="px-3.5 py-1.5 border border-blue-600 hover:bg-blue-50 text-blue-600 rounded-lg text-xs font-extrabold cursor-pointer transition-colors"
                        >
                          Salvar Dados O.I.
                        </button>
                      )}

                      {solicitacao.etapaAtual === 'ordem_inicio' && (perfilUsuario === 'tecnico_infra' || (perfilUsuario === 'gestor_paf' || (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore'))) && (
                        <button
                          data-testid="botao-emitir-ordem-inicio"
                          type="button"
                          onClick={emitirOrdemEIniciarObra}
                          disabled={!solicitacao.dataOrdemInicio || !solicitacao.previsaoTerminoObra || !solicitacao.valorHomologadoContratacao || !solicitacao.cronogramaFisicoFinanceiroFileName}
                          className={`px-4 py-1.5 rounded-lg text-xs font-black shadow-xs transition-all flex items-center gap-1.5 ${
                            solicitacao.dataOrdemInicio && solicitacao.previsaoTerminoObra && solicitacao.valorHomologadoContratacao && solicitacao.cronogramaFisicoFinanceiroFileName
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs'
                              : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                          }`}
                        >
                          <Play className="w-3 h-3 shrink-0" /> Emitir Ordem de Início e Liberar Obra
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* 1. SEÇÃO DE INFORMAÇÕES DA CONTRATADA COM CNPJ E STATUS DISTRATADA */}
                <div className="bg-neutral-50 p-5 rounded-xl border border-neutral-200 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-neutral-200">
                    <h3 className="font-display font-bold text-sm text-neutral-800">
                      Dados Gerais do Contrato Cooperativo
                    </h3>
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                      statusContratoInput === 'Ativa'
                        ? 'bg-emerald-50 border-emerald-250 text-emerald-800'
                        : 'bg-red-50 border-red-200 text-red-750'
                    }`}>
                      Contrato: {statusContratoInput}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 mb-1 uppercase tracking-wider">
                        Empresa Contratada Vencedora
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-neutral-400">
                          <Building className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          placeholder="Ex: Construtora Triângulo Ltda"
                          value={empresaInput}
                          onChange={(e) => setEmpresaInput(e.target.value)}
                          disabled={perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'gestor_paf'}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden bg-white hover:border-neutral-400 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 mb-1 uppercase tracking-wider">
                        CNPJ da Empresa
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 12.345.678/0001-90"
                        value={cnpjInput}
                        onChange={(e) => setCnpjInput(e.target.value)}
                        disabled={perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'gestor_paf'}
                        className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden bg-white hover:border-neutral-400 transition-colors font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 mb-1 uppercase tracking-wider">
                        Status do Contrato Contratual
                      </label>
                      <select
                        value={statusContratoInput}
                        onChange={(e) => setStatusContratoInput(e.target.value as any)}
                        disabled={perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'gestor_paf'}
                        className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden bg-white font-sans text-neutral-700"
                      >
                        <option value="Ativa">Ativa (Mão de obra ativa)</option>
                        <option value="Distratada">Distratada (Contrato rescindido)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 mb-1 uppercase tracking-wider">
                        Status da Execução Física da Obra
                      </label>
                      <select
                        value={statusObraInput}
                        onChange={(e) => setStatusObraInput(e.target.value as any)}
                        disabled={perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'gestor_paf'}
                        className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden bg-white font-sans text-neutral-700"
                      >
                        <option value="Não Iniciada">Não Iniciada</option>
                        <option value="Em Andamento">Em Andamento</option>
                        <option value="Paralisada">Paralisada</option>
                        <option value="Concluída">Concluída</option>
                      </select>
                    </div>
                  </div>

                  {/* FORMULÁRIO CONDICIONAL DE DISTRATO */}
                  {statusContratoInput === 'Distratada' && (
                    <div className="p-4 bg-red-50/60 rounded-lg border border-red-200 space-y-4 text-xs font-sans">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <h4 className="font-bold text-xs uppercase tracking-wider text-red-800">
                          Informações Mandatórias do Distrato Contratual
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-neutral-700 mb-1 uppercase tracking-wider">
                            Justificativa do Distrato *
                          </label>
                          <select
                            value={justificativaDistratoInput}
                            onChange={(e) => setJustificativaDistratoInput(e.target.value)}
                            disabled={perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'gestor_paf'}
                            className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-hidden bg-white text-neutral-700"
                          >
                            <option value="Planilha de orçamento defasada">Planilha de orçamento defasada</option>
                            <option value="Pendências de projeto">Pendências de projeto</option>
                            <option value="Necessidade de readequação técnica">Necessidade de readequação técnica</option>
                            <option value="Falta ou contingenciamento de recursos">Falta ou contingenciamento de recursos</option>
                            <option value="Pendências administrativas">Pendências administrativas</option>
                            <option value="Pendências jurídicas">Pendências jurídicas</option>
                            <option value="Licenciamento/autorizações">Licenciamento/autorizações</option>
                            <option value="Baixo desempenho da empresa contratada">Baixo desempenho da empresa contratada</option>
                            <option value="Abandono de obra pela empresa contratada">Abandono de obra pela empresa contratada</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-neutral-700 mb-1 uppercase tracking-wider">
                            Data do Distrato *
                          </label>
                          <input
                            type="date"
                            value={dataDistratoInput}
                            onChange={(e) => setDataDistratoInput(e.target.value)}
                            disabled={perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'gestor_paf'}
                            className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-hidden bg-white text-neutral-700 font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                          Anexar Documento do Distrato (Termo de Rescisão / Diário Oficial)*
                        </label>
                        
                        {documentoDistratoFileName ? (
                          <div className="p-3 bg-white border border-neutral-300 rounded-lg flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-2 bg-red-100 text-red-700 rounded-md shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="truncate">
                                <span className="block text-xs font-bold text-neutral-800 break-all">{documentoDistratoFileName}</span>
                                <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">
                                  Tamanho: {documentoDistratoFileSize} • Enviado em: {new Date().toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            </div>
                            {(perfilUsuario === 'tecnico_infra' || (perfilUsuario === 'gestor_paf' || (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore'))) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDocumentoDistratoFileName('');
                                  setDocumentoDistratoFileSize('');
                                  setDocumentoDistratoUploadedAt('');
                                }}
                                className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 hover:bg-red-50 rounded transition-all cursor-pointer shrink-0"
                              >
                                Remover
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                              ref={distratoInputRef}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const sizeFormatted = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
                                setDocumentoDistratoFileName(file.name);
                                setDocumentoDistratoFileSize(sizeFormatted);
                                setDocumentoDistratoUploadedAt(new Date().toISOString().split('T')[0]);
                              }}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => distratoInputRef.current?.click()}
                              disabled={perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'gestor_paf'}
                              className="px-3 py-1.5 border border-dashed border-red-300 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                            >
                              <Paperclip className="w-3.5 h-3.5 text-neutral-500" />
                              Selecionar Arquivo
                            </button>
                            <span className="text-[10px] text-neutral-400">
                              Aceita PDF, DOCX, ou Imagens do distrato assinado.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* FORMULÁRIO CONDICIONAL DE PARALISAÇÃO */}
                  {statusObraInput === 'Paralisada' && (
                    <div className="p-4 bg-amber-50/60 rounded-lg border border-amber-200 mt-4 space-y-4 text-xs font-sans">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <h4 className="font-bold text-xs uppercase tracking-wider text-amber-800">
                          Informações de Paralisação Temporária
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-neutral-700 mb-1 uppercase tracking-wider">
                            Justificativa da Paralisação *
                          </label>
                          <select
                            value={justificativaParalizacaoInput}
                            onChange={(e) => setJustificativaParalizacaoInput(e.target.value)}
                            disabled={perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'gestor_paf'}
                            className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-hidden bg-white text-neutral-700"
                          >
                            <option value="Aguardando diretor da cx escolar realizar notificação empresa">
                              Aguardando diretor da cx escolar realizar notificação empresa
                            </option>
                            <option value="Condições climáticas">Condições climáticas</option>
                            <option value="aguardando distrato">aguardando distrato</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-neutral-700 mb-1 uppercase tracking-wider">
                            Data da Paralisação *
                          </label>
                          <input
                            type="date"
                            value={dataParalizacaoInput}
                            onChange={(e) => setDataParalizacaoInput(e.target.value)}
                            disabled={perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'gestor_paf'}
                            className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-hidden bg-white text-neutral-700 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-SECTION: PHYSICAL PROGRESS PER COMPANY AND OVERALL SUMMARY */}
                  <div className="p-4 bg-white rounded-lg border border-neutral-200 space-y-3">
                    <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wide flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-neutral-500" />
                      Painel de Avanço Físico (Empresa vs. Obra)
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                      <div className="space-y-1">
                        <span className="text-neutral-500 block font-medium">Evolução Física desta Contratada ({solicitacao.empresaContratada || 'Vazio'}):</span>
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-neutral-150 rounded-full h-2 overflow-hidden">
                            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min(100, progressoEmpresaAtual)}%` }} />
                          </div>
                          <span className="font-bold shrink-0 text-blue-700">{progressoEmpresaAtual}%</span>
                        </div>
                      </div>

                      <div className="space-y-1 font-sans">
                        <span className="text-neutral-500 block font-medium">Evolução Física Geral Integrada da Obra:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-neutral-150 rounded-full h-2 overflow-hidden">
                            <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${Math.min(100, progressoTotalObra)}%` }} />
                          </div>
                          <span className="font-extrabold text-emerald-700 shrink-0">{progressoTotalObra}%</span>
                        </div>
                      </div>
                    </div>

                    {solicitacao.empresasAnteriores && solicitacao.empresasAnteriores.length > 0 && (
                      <div className="pt-2.5 border-t border-neutral-100 space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">Histórico de Construtoras Anteriores (Medições Preservadas)</span>
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                          {solicitacao.empresasAnteriores.map((emp) => (
                            <div key={emp.id} className="flex justify-between text-[11px] bg-neutral-50 p-2 rounded border border-neutral-150 font-sans">
                              <span className="text-neutral-600"><strong>{emp.nome}</strong> (CNPJ: {emp.cnpj})</span>
                              <span className="font-mono font-bold text-neutral-700">Avanço Congelado: {emp.avancoFisicoOriginal}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* REGISTRAR NOVA EMPRESA (IF STATUS IS DISTRATADA) */}
                  {statusContratoInput === 'Distratada' && (
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-250 space-y-3 font-sans">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-amber-800">Contrato Rescindido / Distratado</p>
                          <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                            Para dar continuidade aos serviços mantendo o histórico físico já executado, cadastre abaixo os dados da nova empresa que assumirá a obra a partir da estaca zero.
                          </p>
                        </div>
                      </div>

                      {!mostrandoNovaEmpresa ? (
                        <button
                          type="button"
                          onClick={() => setMostrandoNovaEmpresa(true)}
                          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
                        >
                          Atribuir Nova Construtora / Assumir Obra
                        </button>
                      ) : (
                        <div className="bg-white p-4 rounded-lg border border-amber-200 space-y-3 shadow-xs">
                          <h4 className="text-xs font-bold text-neutral-800">Nova Construtora Cooperadora</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-neutral-500 mb-1 uppercase">Nome da Empresa Sucessora</label>
                              <input
                                type="text"
                                placeholder="Ex: Nova Aliança Obras S/A"
                                value={novoEmpresaNome}
                                onChange={(e) => setNovoEmpresaNome(e.target.value)}
                                className="w-full text-xs p-2 border border-neutral-300 rounded focus:border-blue-500 focus:outline-hidden font-sans"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-neutral-500 mb-1 uppercase">CNPJ Comercial</label>
                              <input
                                type="text"
                                placeholder="Ex: 99.888.777/0001-66"
                                value={novoEmpresaCnpj}
                                onChange={(e) => setNovoEmpresaCnpj(e.target.value)}
                                className="w-full text-xs p-2 border border-neutral-300 rounded font-mono focus:border-blue-500 focus:outline-hidden"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => setMostrandoNovaEmpresa(false)}
                              className="px-2.5 py-1.5 border border-neutral-300 text-neutral-600 rounded hover:bg-neutral-50 cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => assumirNovaEmpresa(novoEmpresaNome, novoEmpresaCnpj)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded cursor-pointer"
                            >
                              Confirmar Assunção da Obra
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {(perfilUsuario === 'tecnico_infra' || (perfilUsuario === 'gestor_paf' || (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore'))) && (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={salvarDadosGeraisObra}
                        className="px-4 py-2 border border-blue-600 text-blue-600 bg-white hover:bg-blue-50 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Salvar Dados Gerais
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. SEÇÃO DE MEDIÇÕES DA OBRA */}
                <div className="bg-white p-5 rounded-xl border border-neutral-200/90 space-y-4 relative overflow-hidden">
                  {solicitacao.etapaAtual === 'ordem_inicio' && (
                    <div className="absolute inset-0 bg-slate-50/85 backdrop-blur-3xs flex flex-col items-center justify-center text-center p-6 z-10 font-sans">
                      <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-2 border border-amber-150">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">Medições Bloqueadas</h4>
                      <p className="text-xs text-neutral-500 max-w-sm mt-1 leading-relaxed">
                        Preencha e devedoramente emita a <strong>Ordem de Início da Obra</strong> acima para liberar o registro de medições físicas.
                      </p>
                    </div>
                  )}
                  <div className="flex justify-between items-center flex-wrap gap-2 pb-2 border-b border-neutral-100">
                    <div>
                      <h3 className="font-display font-bold text-sm text-neutral-700">Cronograma de Medições Realizadas</h3>
                      <p className="text-[11px] text-neutral-400">Medições mensais avaliadas pelo fiscal. Lançamentos e exclusões são feitos em Execução › Medições.</p>
                    </div>
                  </div>

                  {/* List of measurements — somente leitura; o lançamento vive em ExecucaoSubmodulos/SubMedicoes */}
                  {solicitacao.medicoes.length === 0 ? (
                    <div className="text-center py-6 text-neutral-400 text-xs italic">
                      Nenhuma medição cadastrada. Lance a primeira medição realizada.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {solicitacao.medicoes.map((med, idx) => (
                        <div key={med.id} className="p-4 bg-white rounded-xl border border-neutral-200 shadow-sm flex flex-col space-y-3 text-xs">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap font-sans">
                                <span className="font-bold text-neutral-800 text-sm">Medição #{idx + 1}</span>
                                <span className="text-neutral-300">•</span>
                                <span className="font-mono text-neutral-500 font-medium">{med.data}</span>
                                <span className="text-neutral-300">•</span>
                                <span className="bg-emerald-50 text-emerald-800 border border-emerald-150 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  {med.porcentagem}% nesta medição
                                </span>

                                {/* Displaying per-company attribution */}
                                <span className="bg-blue-50 text-blue-800 border border-blue-150 px-2 py-0.5 rounded-full text-[10px] font-mono">
                                  Empresa: {med.empresaNome || 'Geral'}
                                </span>
                              </div>
                              <p className="text-neutral-600 font-sans leading-relaxed mt-1">{med.descricao}</p>
                            </div>

                            <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                              <span className="font-mono font-extrabold text-neutral-900 text-base">
                                R$ {med.valor.toLocaleString('pt-BR')}
                              </span>
                            </div>
                          </div>

                          {/* ATTACHMENT COMPONENT — documentos anexados via Execução › Medições */}
                          {(med.relatorioFiscalizacaoFileName || med.boletimMedicaoFileName) && (
                            <div className="pt-3 border-t border-neutral-100 flex flex-col md:flex-row gap-4">
                              {med.relatorioFiscalizacaoFileName && (
                                <div className="space-y-1 max-w-xs">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Relatório de Fiscalização</span>
                                  <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 p-2 rounded-lg text-xs leading-none font-sans">
                                    <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span className="font-medium text-neutral-700 block truncate" title={med.relatorioFiscalizacaoFileName}>{med.relatorioFiscalizacaoFileName}</span>
                                  </div>
                                </div>
                              )}

                              {med.boletimMedicaoFileName && (
                                <div className="space-y-1 max-w-xs">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Boletim de Medição</span>
                                  <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 p-2 rounded-lg text-xs leading-none font-sans">
                                    <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span className="font-medium text-neutral-700 block truncate" title={med.boletimMedicaoFileName}>{med.boletimMedicaoFileName}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. SEÇÃO DE HISTÓRICO DE AJUSTES DA PLANILHA */}
                <div className="bg-white p-5 rounded-xl border border-neutral-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                    <div>
                      <h3 className="font-display font-bold text-sm text-neutral-800">Histórico de Ajustes de Planilha</h3>
                      <p className="text-[11px] text-neutral-400">Solicitações de adequação de meta, quantitativos e tabela de serviços.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('ajustes')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Módulo de Ajustes (Ações)
                    </button>
                  </div>

                  {!solicitacao.ajustes || solicitacao.ajustes.length === 0 ? (
                    <div className="text-center py-6 text-neutral-400 text-xs italic bg-neutral-50 rounded-lg border border-neutral-150">
                      Nenhum ajuste de planilha orçamentária ou adequação de meta registrado para esta obra.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {solicitacao.ajustes.map((aju) => (
                        <div key={aju.id} className="p-4 bg-slate-50 rounded-lg border border-slate-250 space-y-3 text-xs font-sans">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-1 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[10px] bg-slate-200 text-slate-705 px-1.5 py-0.5 rounded font-bold">Ajuste #{aju.numero}</span>
                              <span className="font-bold text-slate-800 mr-1">
                                {aju.tipoAjuste === 'sem_alteracao_meta' && 'Ajuste sem alteração de meta'}
                                {aju.tipoAjuste === 'com_alteracao_meta' && 'Ajuste com alteração/acréscimo de meta'}
                                {aju.tipoAjuste === 'com_alteracao_meta_projeto' && 'Ajuste com alteração/acréscimo de meta e com alteração de projeto'}
                                {aju.tipoAjuste === 'sem_alteracao_meta_com_projeto' && 'Ajuste sem alteração/acréscimo de meta e com alteração de projeto'}
                              </span>

                              {/* Status Badges */}
                              {aju.status === 'validado' ? (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  ✓ VALIDADO DORE
                                </span>
                              ) : aju.status === 'analise_dore' ? (
                                <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                                  ⏳ EM ANÁLISE DORE
                                </span>
                              ) : (
                                <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  ✎ EM ELABORAÇÃO
                                </span>
                              )}

                              {aju.analistaAtribuido && (
                                <span className="bg-neutral-100 text-neutral-600 border border-neutral-200 px-1.5 py-0.5 rounded text-[9px] font-mono leading-none">
                                  Resp: {aju.analistaAtribuido}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono font-medium">{aju.dataCriacao}</span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-white p-2 rounded border border-slate-200">
                              <span className="text-[9px] font-bold text-neutral-400 uppercase block">Valor do Ajuste</span>
                              <span className="font-mono font-extrabold text-neutral-800 mt-0.5 block">R$ {aju.valorAjuste.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="bg-white p-2 rounded border border-slate-200">
                              <span className="text-[9px] font-bold text-neutral-400 uppercase block">Diferença Contrato</span>
                              <span className="font-mono font-bold text-neutral-855 mt-0.5 block">R$ {aju.diferencaPlanilhas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="bg-white p-2 rounded border border-slate-200">
                              <span className="text-[9px] font-bold text-neutral-400 uppercase block">Desconto / Avanço</span>
                              <span className="font-bold text-neutral-80s mt-0.5 block">{aju.desconto}% desc. | {aju.avancoFisico}% avanço</span>
                            </div>
                            <div className="bg-white p-2 rounded border border-slate-200">
                              <span className="text-[9px] font-bold text-neutral-400 uppercase block">Referência</span>
                              <span className="font-semibold text-blue-700 mt-0.5 block uppercase text-[10px] truncate">
                                {aju.ajusteReferente === 'atendimento_inicial' ? 'Atendimento Inicial' : 'Saldo Nova Cotação'}
                              </span>
                            </div>

                            {/* Spreadsheet attachment file info */}
                            {aju.planilhaAjusteFileName && (
                              <div className="col-span-2 md:col-span-4 bg-emerald-50/40 border border-emerald-150 p-2 rounded-lg flex items-center justify-between gap-2 mt-1">
                                <div className="flex items-center gap-2 truncate">
                                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <div className="truncate text-left">
                                    <span className="font-bold text-slate-800 text-[11px] block truncate">{aju.planilhaAjusteFileName}</span>
                                    <span className="text-[9px] text-slate-400 font-mono block">Tamanho: {aju.planilhaAjusteFileSize} • Enviado em {aju.planilhaAjusteUploadedAt}</span>
                                  </div>
                                </div>
                                <span className="bg-emerald-105 text-emerald-800 font-extrabold text-[9px] px-2 py-0.5 rounded border border-emerald-200 shrink-0 select-none">
                                  OBRIGATÓRIO
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] bg-slate-100/75 p-2.5 rounded border border-slate-200/60 text-slate-705">
                            <div>
                              <span className="font-semibold text-slate-500">Responsável pela Elaboração: </span>
                              <strong>{aju.responsavelPlanilha}</strong> <span className="text-slate-500 text-[10px]">({aju.registroProfissional})</span>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-500">Valor Contrato Atualizado: </span>
                              <strong className="font-mono text-neutral-850">R$ {aju.valorContrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                            </div>
                          </div>

                          {aju.observacoes && (
                            <div className="p-2.5 bg-yellow-50 text-slate-600 rounded border border-yellow-200 text-[11px] leading-relaxed">
                              <strong className="text-yellow-850 block mb-0.5 font-bold uppercase text-[9px]">Nova Meta Proposta:</strong>
                              <p className="italic">"{aju.observacoes}"</p>
                            </div>
                          )}

                          {aju.parecerDore && (
                            <div className="p-3 bg-emerald-50 text-emerald-950 rounded-lg border border-emerald-205 text-xs mt-1 font-sans space-y-1">
                              <strong className="text-emerald-800 text-[10px] uppercase font-bold tracking-wider block">Parecer Consolidado do Engenheiro DORE:</strong>
                              <p className="italic">"{aju.parecerDore}"</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. SEÇÃO DE ADITIVOS INCORPORADOS AO CONTRATO */}
                <div className="bg-white p-5 rounded-xl border border-neutral-200 space-y-4">
                  <div>
                    <h3 className="font-display font-bold text-sm text-neutral-800">Histórico de Aditivos do Contrato</h3>
                    <p className="text-[11px] text-neutral-400">Todos os acréscimos de valor ou prazo. Novos aditivos devem ser solicitados e avaliados na aba dedicada <strong className="text-blue-600">"Aditivos do Contrato"</strong>.</p>
                  </div>

                  {solicitacao.aditivos.length === 0 ? (
                    <div className="text-center py-6 text-neutral-400 text-xs italic bg-neutral-50 rounded-lg border border-neutral-100">
                      Nenhum aditivo orçamentário ou de prazo registrado neste contrato de obra.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {solicitacao.aditivos.map((adt) => (
                        <div key={adt.id} className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-sans">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[10px] bg-neutral-200 text-neutral-600 px-1 py-0.5 rounded">ID: {adt.id}</span>
                              <strong className="text-neutral-700">Aditivo de {adt.tipo}</strong>
                              <span className="text-neutral-300">•</span>
                              <span className="text-[10px] text-neutral-500">{adt.data}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                adt.status === 'Aprovado' 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-250' 
                                  : adt.status === 'Recusado'
                                    ? 'bg-red-100 text-red-800 border border-red-200'
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}>{adt.status}</span>
                            </div>
                            <p className="text-neutral-500">{adt.justificativa}</p>
                            
                            <div className="text-[10px] text-neutral-400 flex gap-3 font-mono">
                              {adt.valorExtra !== undefined && adt.valorExtra > 0 && <span className="text-emerald-700 font-bold">Acréscimo: + R$ {adt.valorExtra.toLocaleString('pt-BR')}</span>}
                              {adt.prazoExtraDias !== undefined && adt.prazoExtraDias > 0 && <span className="text-blue-700 font-bold">Prorrogação: + {adt.prazoExtraDias} dias</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column Summary Sidebar */}
              <div className="space-y-4">
                {/* 1. PAINEL FINANCEIRO DE EXECUÇÃO */}
                <div className="p-5 bg-white border border-neutral-200 rounded-xl space-y-4">
                  <h4 className="font-display font-medium text-xs text-neutral-400 uppercase tracking-widest">
                    Quadro Orçamentário da Obra
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <span className="block text-xs text-neutral-500">Orçamento Base (Homologado)</span>
                      <span className="text-md font-bold font-mono text-neutral-800">
                        R$ {solicitacao.valorHomologado?.toLocaleString('pt-BR') || '0,00'}
                      </span>
                    </div>

                    <div>
                      <span className="block text-xs text-neutral-500">Aditivos Acumulados (Aprovados)</span>
                      <span className="text-sm font-semibold font-mono text-blue-600">
                        + R$ {totalAditivosAprovados.toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-neutral-100">
                      <span className="block text-xs text-neutral-500">Valor do Contrato Atualizado</span>
                      <span className="text-lg font-extrabold font-mono text-neutral-900">
                        R$ {valorContratoAtual.toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-neutral-100">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="text-neutral-500">Total Liquidado (Medições)</span>
                        <span className="font-semibold font-mono text-neutral-800">{porcentagemMedidaFinanceira}%</span>
                      </div>
                      
                      <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${porcentagemMedidaFinanceira}%` }}
                        />
                      </div>
                      
                      <span className="text-[10px] text-neutral-400 block mt-1 text-right font-mono">
                        R$ {totalMedido.toLocaleString('pt-BR')} medidos
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ajustes' && (
          <div className="p-6 space-y-6 animate-fadeIn font-sans bg-neutral-50/50 block">
            {/* CABEÇALHO DO MÓDULO */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-blue-50/50 border border-blue-100 p-5 rounded-xl gap-4">
              <div>
                <h2 className="text-sm font-bold text-neutral-800 flex items-center gap-1.5 uppercase tracking-wide">
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                  Ajustes de Planilha
                </h2>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Ajustes são criados e avaliados em Execução › Ajustes — aqui é somente leitura.
                </p>
              </div>
            </div>

            {/* HISTÓRICO DE AJUSTES (somente leitura) */}
            <div className="bg-white p-5 rounded-xl border border-neutral-200 space-y-4">
              <div>
                <h3 className="font-display font-black text-xs text-neutral-800 uppercase tracking-widest">
                  Histórico e Tramitação de Solicitações de Ajuste
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">Acompanhe a análise técnica e os pareceres homologados pela DORE.</p>
              </div>

              {!solicitacao.ajustes || solicitacao.ajustes.length === 0 ? (
                <div className="text-center py-8 text-neutral-400 text-xs italic bg-neutral-50 rounded-lg border border-neutral-150">
                  Nenhum ajuste de planilha orçamentária cadastrado ainda para esta obra.
                </div>
              ) : (
                <div className="space-y-6">
                  {solicitacao.ajustes.map((aju) => (
                    <div key={aju.id} className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-4 text-xs font-sans">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-slate-200 gap-1 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] bg-slate-200 text-slate-705 px-2 py-0.5 rounded font-black">
                            SOLICITAÇÃO #{aju.numero}
                          </span>
                          <span className="font-bold text-slate-800">
                            {aju.tipoAjuste === 'sem_alteracao_meta' && 'Ajuste sem alteração de meta'}
                            {aju.tipoAjuste === 'com_alteracao_meta' && 'Ajuste com alteração/acréscimo de meta'}
                            {aju.tipoAjuste === 'com_alteracao_meta_projeto' && 'Ajuste com alteração/acréscimo de meta e com alteração de projeto'}
                            {aju.tipoAjuste === 'sem_alteracao_meta_com_projeto' && 'Ajuste sem alteração/acréscimo de meta e com alteração de projeto'}
                            {aju.tipoAjuste === 'ajuste_sem_meta_com_projeto' && 'Ajuste sem meta e com alteração de projeto'}
                          </span>

                          {/* Status workflow indicator badge */}
                          {aju.status === 'validado' ? (
                            <span className="bg-emerald-100 text-emerald-850 hover:bg-emerald-200 border border-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-black">
                              ✓ VALIDADO & HOMOLOGADO
                            </span>
                          ) : aju.status === 'analise_dore' ? (
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                              ⏳ EM ANÁLISE TÉCNICA DORE
                            </span>
                          ) : (
                            <span className="bg-red-100 text-red-900 border border-red-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              ✎ RECUSADO / EM REVISÃO
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono font-bold">Protocolado em {aju.dataCriacao}</span>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                          <span className="text-[9px] font-black text-neutral-450 uppercase block">Valor Proposto</span>
                          <span className="font-mono font-black text-neutral-900 mt-1 block">
                            R$ {aju.valorAjuste.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                          <span className="text-[9px] font-black text-neutral-450 uppercase block">Diferença Contrato</span>
                          <span className="font-mono font-bold text-neutral-800 mt-1 block text-red-700">
                            R$ {aju.diferencaPlanilhas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                          <span className="text-[9px] font-black text-neutral-450 uppercase block">Critério Técnico</span>
                          <span className="font-bold text-slate-800 mt-1 block capitalize">
                            {aju.desconto}% Desc. | {aju.avancoFisico}% Avanço
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                          <span className="text-[9px] font-black text-neutral-450 uppercase block font-sans">Enquadramento</span>
                          <span className="font-semibold text-blue-700 mt-1 block uppercase text-[10px] truncate">
                            {aju.ajusteReferente === 'atendimento_inicial' ? '✓ Atendimento Inicial' : '✓ Saldo Nova Cotação'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] bg-slate-100 p-3 rounded-lg border border-slate-200 text-slate-705">
                        <div>
                          <span className="font-semibold text-slate-500">Elaborador da Planilha: </span>
                          <strong className="text-neutral-800">{aju.responsavelPlanilha}</strong> <span className="text-slate-400 font-mono">({aju.registroProfissional})</span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-500">Valor do Contrato de Obra: </span>
                          <strong className="font-mono text-neutral-900">R$ {aju.valorContrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                        </div>
                      </div>

                      {aju.observacoes && (
                        <div className="p-3 bg-yellow-50/55 text-slate-700 rounded-lg border border-yellow-200 leading-relaxed text-xs">
                          <strong className="text-yellow-850 block mb-1 font-bold uppercase text-[9px] tracking-wide">Justificativa / Observações:</strong>
                          <p className="italic">"{aju.observacoes}"</p>
                        </div>
                      )}

                      {aju.status !== 'analise_dore' && aju.parecerDore && (
                        <div className="p-3 bg-neutral-100/85 rounded-lg border border-neutral-150 text-xs">
                          <span className="font-semibold text-neutral-700 block text-[9.5px] uppercase tracking-wide">Parecer da DORE:</span>
                          <p className="text-neutral-600 italic mt-0.5">{aju.parecerDore}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

                {activeTab === 'aditivos' && (
          <div className="space-y-6 animate-fadeIn font-sans">
            <div className="flex justify-between items-center bg-blue-50 border border-blue-100 p-4 rounded-xl">
              <div>
                <h2 className="text-sm font-bold text-neutral-800 flex items-center gap-1.5">
                  <Layers className="w-5 h-5 text-blue-600 animate-pulse" />
                  Módulo Integrado de Solicitação de Termos Aditivos
                </h2>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Gerenciamento oficial de ampliação orçamentária ou dilatação de prazos do projeto cooperador de engenharia estrutural.
                </p>
              </div>
              <span className="text-xs bg-white text-blue-750 font-extrabold px-3 py-1 rounded-lg border border-blue-200">
                Total Aditados: R$ {totalAditivosAprovados.toLocaleString('pt-BR')}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Side: Creation and Audit lists */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Aditivos são criados e avaliados em Execução › Aditivos (SubAditivos) — aqui é somente leitura */}
                <div className="space-y-4">
                  <h3 className="font-bold text-xs text-neutral-400 uppercase tracking-widest">
                    Pedidos de Aditivos
                  </h3>

                  {solicitacao.aditivos.length === 0 ? (
                    <div className="p-8 text-center text-neutral-400 bg-white border border-neutral-200 rounded-xl italic text-xs">
                      Não há nenhuma solicitação de aditivo ativa ou cadastrada para esta obra.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {solicitacao.aditivos.map((adt) => (
                        <div key={adt.id} className="bg-white p-5 rounded-xl border border-neutral-200 space-y-4 shadow-3xs">
                          {/* Header of Aditivo Request Card */}
                          <div className="flex justify-between items-start border-b border-neutral-100 pb-3 flex-wrap gap-2 text-xs">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-[9px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded-sm">Aditivo nº {adt.numeroAditivo || '—'}</span>
                                <h4 className="font-extrabold text-neutral-800 text-sm">Aditivo de {adt.tipo}</h4>
                                <span className="text-neutral-350">•</span>
                                <span className="text-neutral-500">{adt.data}</span>
                              </div>
                              <p className="text-[11px] text-neutral-400 mt-0.5 font-mono">
                                Impactos: {adt.valorExtra ? `+ R$ ${adt.valorExtra.toLocaleString('pt-BR')}` : ''} {adt.prazoExtraDias ? ` • + ${adt.prazoExtraDias} dias` : ''}
                              </p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                              adt.status === 'Aprovado'
                                ? 'bg-emerald-50 border-emerald-250 text-emerald-800'
                                : adt.status === 'Recusado'
                                  ? 'bg-red-50 border-red-200 text-red-700'
                                  : 'bg-amber-50 border-amber-200 text-amber-700'
                            }`}>
                              Processo: {adt.status}
                            </span>
                          </div>

                          {/* Justification details */}
                          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-150">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Motivos / Justificativas do Pedido</span>
                            <p className="text-neutral-600 text-xs leading-relaxed mt-1">{adt.justificativa}</p>
                          </div>

                          {/* Consolidating display if decided */}
                          {adt.status !== 'Pendente' && adt.parecerConsolidado && (
                            <div className="p-3 bg-neutral-100/85 rounded-lg border border-neutral-150 text-xs">
                              <span className="font-semibold text-neutral-700 block text-[9.5px] uppercase tracking-wide">Parecer de Homologação Consolidado:</span>
                              <p className="text-neutral-600 italic mt-0.5">{adt.parecerConsolidado}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Right Side: Financial balance */}
              <div className="space-y-4">
                <div className="p-5 bg-white border border-neutral-200 rounded-xl space-y-4">
                  <h4 className="font-display font-medium text-xs text-neutral-400 uppercase tracking-widest">
                    Impacto Contratual Atualizado
                  </h4>

                  <div className="space-y-4 text-xs font-sans">
                    <div>
                      <span className="block text-neutral-500">Valor Orçado Original</span>
                      <span className="text-sm font-semibold font-mono text-neutral-800">
                        R$ {solicitacao.valorHomologado?.toLocaleString('pt-BR') || '0,00'}
                      </span>
                    </div>

                    <div>
                      <span className="block text-neutral-500">Acréscimos Reajustados (Aditivos)</span>
                      <span className="text-base font-bold font-mono text-blue-600">
                        + R$ {totalAditivosAprovados.toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <div className="border-t border-neutral-100 pt-3">
                      <span className="block text-neutral-500 font-bold">Valor Global do Contrato Aditado</span>
                      <span className="text-lg font-extrabold font-mono text-neutral-900">
                        R$ {valorContratoAtual.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl text-[11px] text-neutral-700 space-y-2 font-sans">
                  <span className="font-bold block text-blue-900 text-xs">Regras do Processo PAF:</span>
                  <p>1. O <strong>Fiscal da Obra</strong> propõe o termo aditivo apresentando a planilha revisada.</p>
                  <p>2. Os analistas credenciados da DORE verificam a consistência de cada peça técnica carregada.</p>
                  <p>3. Somente após a homologação e aprovação, o novo valor global é liberado e incorporado ao saldo físico/financeiro para novas medições da obra.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA 7: CONCLUSÃO DE OBRA */}
        {activeTab === 'conclusao' && (() => {
          // ── Checklist automático baseado nos dados do sistema ──
          const checkContratoEncerrado = !!solicitacao.empresaContratada && !!solicitacao.contratoDataAssinatura;

          const checkMedicoesAprovadas = solicitacao.medicoes.length > 0 && progressoTotalObra >= 100;

          const docsObrigatoriosPendentes = solicitacao.documentos.filter(
            d => d.obrigatorio && (d.status === 'pendente' || d.status === 'recusado')
          );
          const checkFiscalizacaoOk = docsObrigatoriosPendentes.length === 0;

          const aditivosPendentes = solicitacao.aditivos.filter(a => a.status === 'Pendente');
          const checkAditivosConcluidos = aditivosPendentes.length === 0;

          const ajustesPendentes = (solicitacao.ajustes || []).filter(a => a.status !== 'validado');
          const checkAjustesConcluidos = ajustesPendentes.length === 0;

          const checkOutrosProcessos = !!solicitacao.numeroPAF && solicitacao.statusPAF === 'Pago e Liberado';

          const checkLicoesAprendidas = (solicitacao.licoesAprendidas || []).length > 0;

          const todosItensOk = checkContratoEncerrado && checkMedicoesAprovadas && checkFiscalizacaoOk && checkAditivosConcluidos && checkAjustesConcluidos && checkOutrosProcessos && checkLicoesAprendidas && checkTermoAceiteProvisorio && checkTermoAceiteDefinitivo && checkDocumentosGED;

          const ChecklistItem = ({ ok, label, desc }: { ok: boolean; label: string; desc: string }) => (
            <div className={`flex items-start gap-3 p-3 rounded-lg border ${ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <span className={`shrink-0 mt-0.5 text-base font-bold ${ok ? 'text-emerald-600' : 'text-red-500'}`}>{ok ? '✔' : '✘'}</span>
              <div className="min-w-0 flex-1">
                <span className={`text-xs font-bold block ${ok ? 'text-emerald-800' : 'text-red-800'}`}>{label}</span>
                <span className={`text-[10.5px] leading-tight block mt-0.5 ${ok ? 'text-emerald-600' : 'text-red-500'}`}>{desc}</span>
              </div>
              <span className={`shrink-0 self-center text-[10px] font-bold px-1.5 py-0.5 rounded border ${ok ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-red-100 text-red-700 border-red-300'}`}>
                {ok ? 'OK' : 'PENDENTE'}
              </span>
            </div>
          );

          return (
          <form onSubmit={salvarConclusaoObra} className="space-y-6 animate-fadeIn font-sans text-left">

            {/* CHECKLIST AUTOMÁTICO DE PENDÊNCIAS */}
            <div className="bg-white p-5 rounded-xl border border-neutral-200 space-y-3">
              <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-500" />
                  Checklist de Pendências da Obra
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${todosItensOk ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {todosItensOk ? 'TUDO LIBERADO' : 'PENDÊNCIAS ABERTAS'}
                </span>
              </div>
              <div className="space-y-2">
                <ChecklistItem
                  ok={checkContratoEncerrado}
                  label="Contrato encerrado"
                  desc={checkContratoEncerrado
                    ? `${solicitacao.empresaContratada} — contrato de ${new Date(solicitacao.contratoDataAssinatura! + 'T00:00:00').toLocaleDateString('pt-BR')}${solicitacao.contratoFimVigencia ? ` até ${new Date(solicitacao.contratoFimVigencia + 'T00:00:00').toLocaleDateString('pt-BR')}` : ''}`
                    : 'Nenhum contrato registrado para esta obra. Registre a empresa e os dados contratuais.'}
                />
                <ChecklistItem
                  ok={checkMedicoesAprovadas}
                  label="Medições aprovadas"
                  desc={checkMedicoesAprovadas
                    ? `${solicitacao.medicoes.length} medição(ões) — progresso físico: ${progressoTotalObra}% concluído.`
                    : `Progresso físico: ${progressoTotalObra}% (necessário 100%). ${solicitacao.medicoes.length === 0 ? 'Nenhuma medição registrada.' : `${solicitacao.medicoes.length} medição(ões) registrada(s).`}`}
                />
                <ChecklistItem
                  ok={checkFiscalizacaoOk}
                  label="Pendências de fiscalização"
                  desc={checkFiscalizacaoOk
                    ? 'Todos os documentos obrigatórios aprovados ou dispensados.'
                    : `${docsObrigatoriosPendentes.length} documento(s) obrigatório(s) ainda pendente(s) ou recusado(s): ${docsObrigatoriosPendentes.map(d => d.nome).join(', ')}.`}
                />
                <ChecklistItem
                  ok={checkAditivosConcluidos}
                  label="Aditivos concluídos"
                  desc={checkAditivosConcluidos
                    ? (solicitacao.aditivos.length === 0 ? 'Sem aditivos registrados.' : `${solicitacao.aditivos.length} aditivo(s) — todos com status final (Aprovado/Recusado).`)
                    : `${aditivosPendentes.length} aditivo(s) ainda com status Pendente. Finalize-os antes de encerrar.`}
                />
                <ChecklistItem
                  ok={checkAjustesConcluidos}
                  label="Ajustes concluídos"
                  desc={checkAjustesConcluidos
                    ? ((solicitacao.ajustes || []).length === 0 ? 'Sem ajustes de planilha registrados.' : `${(solicitacao.ajustes || []).length} ajuste(s) — todos validados.`)
                    : `${ajustesPendentes.length} ajuste(s) de planilha ainda não validado(s) pela DORE.`}
                />
                <ChecklistItem
                  ok={checkOutrosProcessos}
                  label="Outros processos"
                  desc={checkOutrosProcessos
                    ? `PAF ${solicitacao.numeroPAF} — pago e liberado.`
                    : !solicitacao.numeroPAF ? 'PAF não gerado para esta obra.' : `PAF ${solicitacao.numeroPAF} — status: ${solicitacao.statusPAF || 'não informado'}. Aguardando pagamento e liberação.`}
                />
                <ChecklistItem
                  ok={checkLicoesAprendidas}
                  label="Lições aprendidas"
                  desc={checkLicoesAprendidas
                    ? `${(solicitacao.licoesAprendidas || []).length} lição(ões) aprendida(s) registrada(s) pelo engenheiro.`
                    : 'Nenhuma lição aprendida registrada. Registre pelo menos 1 na aba "Lições Aprendidas" de Acompanhamento da Obra.'}
                />
                <ChecklistItem
                  ok={checkTermoAceiteProvisorio}
                  label="Termo de Aceite Provisório"
                  desc={checkTermoAceiteProvisorio
                    ? `Termo emitido em ${new Date(termoAceiteProvisorioDataInput + 'T00:00:00').toLocaleDateString('pt-BR')}.`
                    : 'Termo de Aceite Provisório ainda não registrado. Informe a data de emissão e anexe o arquivo.'}
                />
                <ChecklistItem
                  ok={checkTermoAceiteDefinitivo}
                  label="Termo de Aceite Definitivo (90 dias do provisório)"
                  desc={
                    !checkTermoAceiteProvisorio
                      ? 'Aguardando o registro do Termo de Aceite Provisório.'
                      : !prazo90DiasTermoProvisorioCumprido
                        ? `Aguardando o prazo de 90 dias corridos do Termo Provisório — faltam ${90 - (diasDesdeTermoProvisorio ?? 0)} dia(s), liberado em ${dataLimiteTermoDefinitivo?.toLocaleDateString('pt-BR')}.`
                        : checkTermoAceiteDefinitivo
                          ? `Termo emitido em ${new Date(termoAceiteDefinitivoDataInput + 'T00:00:00').toLocaleDateString('pt-BR')}.`
                          : 'Prazo de 90 dias cumprido — anexe o Termo de Aceite Definitivo.'
                  }
                />
                <ChecklistItem
                  ok={checkDocumentosGED}
                  label="Documentos obrigatórios da execução (GED)"
                  desc={checkDocumentosGED
                    ? `${documentosGEDConclusao.length} documento(s) obrigatório(s) anexado(s).`
                    : `Pendente(s): ${documentosGEDPendentes.map(d => d.nome).join(', ')}. Anexe na aba "Documentações (GED)" em Execução.`}
                />
              </div>
              {!todosItensOk && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 font-medium mt-2">
                  Resolva todas as pendências acima antes de protocolar o encerramento da obra.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Side: Form Inputs and Upload Card */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-5 rounded-xl border border-neutral-200 space-y-4">
                  <div className="flex justify-between items-center border-b border-neutral-100 pb-2">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-500">Dados do Termo de Conclusão</h3>
                    <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Fiscalização</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">
                        Data Efetiva de Conclusão da Obra *
                      </label>
                      <input
                        type="date"
                        required
                        disabled={perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'gestor_paf'}
                        value={dataConclusaoInput}
                        onChange={(e) => setDataConclusaoInput(e.target.value)}
                        className="w-full text-xs p-2.5 border border-neutral-300 rounded-lg focus:outline-hidden bg-white disabled:opacity-60"
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-150 w-full text-[11px] text-neutral-500 font-sans">
                        ⚠️ <strong className="font-semibold text-neutral-700">Atenção:</strong> Ao formalizar o encerramento, o status do empreendimento será consolidado definitivamente como <strong className="text-emerald-700">Concluída</strong>.
                      </div>
                    </div>
                  </div>

                  {/* DOCUMENT UPLOADERS CHECKLIST FOR COMPLETION */}
                  <div className="space-y-4 pt-2">
                    <h4 className="font-bold text-xs text-neutral-700 uppercase tracking-wide border-b border-neutral-100 pb-1.5 flex items-center gap-1.5">
                      <Paperclip className="w-4 h-4 text-neutral-500" />
                      Documentos de Conclusão Obrigatórios
                    </h4>

                    {/* 1. LAUDO CONCLUSIVO */}
                    <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-lg space-y-2">
                      <div className="flex justify-between items-start flex-wrap gap-2 text-xs">
                        <div>
                          <span className="font-bold text-neutral-800 text-xs block">1. Laudo Conclusivo da Obra *</span>
                          <span className="text-[10.5px] text-neutral-500 block leading-tight mt-0.5">
                            Laudo descritivo assinado pelo engenheiro responsável certificando que todos os termos do escopo foram concluídos.
                          </span>
                        </div>
                      </div>

                      {laudoConclusivoFileName ? (
                        <div className="p-3 bg-white border border-neutral-200 rounded-lg flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-md shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <span className="block text-xs font-bold text-neutral-800 break-all">{laudoConclusivoFileName}</span>
                              <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">
                                Tamanho: {laudoConclusivoFileSize} • Enviado em: {laudoConclusivoUploadedAt ? new Date(laudoConclusivoUploadedAt + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informado'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleDownloadDocument(laudoConclusivoFileName, "Laudo Conclusivo Final")}
                              className="text-blue-600 hover:text-blue-800 text-xs font-bold px-2 py-1 hover:bg-blue-50 rounded transition-all cursor-pointer flex items-center gap-1 shrink-0"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Baixar
                            </button>
                            {(perfilUsuario === 'tecnico_infra' || (perfilUsuario === 'gestor_paf' || (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore'))) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setLaudoConclusivoFileName('');
                                  setLaudoConclusivoFileSize('');
                                  setLaudoConclusivoUploadedAt('');
                                }}
                                className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 hover:bg-red-50 rounded transition-all cursor-pointer shrink-0"
                              >
                                Remover
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            ref={laudoConclusivoInputRef}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const sizeFormatted = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
                              setLaudoConclusivoFileName(file.name);
                              setLaudoConclusivoFileSize(sizeFormatted);
                              setLaudoConclusivoUploadedAt(new Date().toISOString().split('T')[0]);
                            }}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => laudoConclusivoInputRef.current?.click()}
                            disabled={perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'gestor_paf'}
                            className="px-3.5 py-2 border border-dashed border-slate-350 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                          >
                            <UploadCloud className="w-4 h-3.5 text-neutral-500 animate-bounce" />
                            Selecionar Laudo Conclusivo
                          </button>
                          <span className="text-[10px] text-neutral-400 font-sans">
                            Aceita PDF, DOCX ou DOC.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 2. RELATÓRIO FOTOGRÁFICO DE CONCLUSÃO */}
                    <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-lg space-y-2">
                      <div className="flex justify-between items-start flex-wrap gap-2 text-xs">
                        <div>
                          <span className="font-bold text-neutral-800 text-xs block">2. Relatório Fotográfico Final *</span>
                          <span className="text-[10.5px] text-neutral-500 block leading-tight mt-0.5">
                            Relatório em PDF com fotografias legendadas demonstrando o "Antes" e o "Depois" dos espaços reformados de forma visível.
                          </span>
                        </div>
                      </div>

                      {relatorioFotograficoFileName ? (
                        <div className="p-3 bg-white border border-neutral-200 rounded-lg flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-md shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <span className="block text-xs font-bold text-neutral-800 break-all">{relatorioFotograficoFileName}</span>
                              <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">
                                Tamanho: {relatorioFotograficoFileSize} • Enviado em: {relatorioFotograficoUploadedAt ? new Date(relatorioFotograficoUploadedAt + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informado'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleDownloadDocument(relatorioFotograficoFileName, "Relatório Fotográfico Final")}
                              className="text-blue-600 hover:text-blue-800 text-xs font-bold px-2 py-1 hover:bg-blue-50 rounded transition-all cursor-pointer flex items-center gap-1 shrink-0"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Baixar
                            </button>
                            {(perfilUsuario === 'tecnico_infra' || (perfilUsuario === 'gestor_paf' || (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore'))) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRelatorioFotograficoFileName('');
                                  setRelatorioFotograficoFileSize('');
                                  setRelatorioFotograficoUploadedAt('');
                                }}
                                className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 hover:bg-red-50 rounded transition-all cursor-pointer shrink-0"
                              >
                                Remover
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            ref={relatorioFotograficoInputRef}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const sizeFormatted = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
                              setRelatorioFotograficoFileName(file.name);
                              setRelatorioFotograficoFileSize(sizeFormatted);
                              setRelatorioFotograficoUploadedAt(new Date().toISOString().split('T')[0]);
                            }}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => relatorioFotograficoInputRef.current?.click()}
                            disabled={perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'gestor_paf'}
                            className="px-3.5 py-2 border border-dashed border-slate-350 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                          >
                            <UploadCloud className="w-4 h-3.5 text-neutral-500 animate-bounce" />
                            Selecionar Relatório Fotográfico
                          </button>
                          <span className="text-[10px] text-neutral-400 font-sans">
                            Aceita PDF de alta resolução com imagens legendadas.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 3. PLANILHA DE MEDIÇÃO ACUMULADA FINAL */}
                    <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-lg space-y-2">
                      <div className="flex justify-between items-start flex-wrap gap-2 text-xs">
                        <div>
                          <span className="font-bold text-neutral-800 text-xs block">3. Planilha de Medição Acumulada Final *</span>
                          <span className="text-[10.5px] text-neutral-500 block leading-tight mt-0.5">
                            Planilha eletrônica demonstrativa das medições periódicas consolidadas, totalizando 100% de avanço físico executado.
                          </span>
                        </div>
                      </div>

                      {planilhaMedicaoFinalFileName ? (
                        <div className="p-3 bg-white border border-neutral-200 rounded-lg flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-md shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <span className="block text-xs font-bold text-neutral-800 break-all">{planilhaMedicaoFinalFileName}</span>
                              <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">
                                Tamanho: {planilhaMedicaoFinalFileSize} • Enviado em: {planilhaMedicaoFinalUploadedAt ? new Date(planilhaMedicaoFinalUploadedAt + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informado'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleDownloadDocument(planilhaMedicaoFinalFileName, "Planilha de Medição Final")}
                              className="text-blue-600 hover:text-blue-800 text-xs font-bold px-2 py-1 hover:bg-blue-50 rounded transition-all cursor-pointer flex items-center gap-1 shrink-0"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Baixar
                            </button>
                            {(perfilUsuario === 'tecnico_infra' || (perfilUsuario === 'gestor_paf' || (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore'))) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPlanilhaMedicaoFinalFileName('');
                                  setPlanilhaMedicaoFinalFileSize('');
                                  setPlanilhaMedicaoFinalUploadedAt('');
                                }}
                                className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 hover:bg-red-50 rounded transition-all cursor-pointer shrink-0"
                              >
                                Remover
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <input
                            type="file"
                            accept=".xlsx,.xls,.pdf"
                            ref={planilhaMedicaoFinalInputRef}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const sizeFormatted = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
                              setPlanilhaMedicaoFinalFileName(file.name);
                              setPlanilhaMedicaoFinalFileSize(sizeFormatted);
                              setPlanilhaMedicaoFinalUploadedAt(new Date().toISOString().split('T')[0]);
                            }}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => planilhaMedicaoFinalInputRef.current?.click()}
                            disabled={perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'gestor_paf'}
                            className="px-3.5 py-2 border border-dashed border-slate-350 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                          >
                            <UploadCloud className="w-4 h-3.5 text-neutral-500 animate-bounce" />
                            Selecionar Planilha de Medição Final
                          </button>
                          <span className="text-[10px] text-neutral-400 font-sans">
                            Aceita arquivos do Excel (.xlsx, .xls) ou PDF correspondente.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 4. TERMO DE ACEITE PROVISÓRIO */}
                    <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-lg space-y-3">
                      <div className="flex justify-between items-start flex-wrap gap-2 text-xs">
                        <div>
                          <span className="font-bold text-neutral-800 text-xs block">4. Termo de Aceite Provisório *</span>
                          <span className="text-[10.5px] text-neutral-500 block leading-tight mt-0.5">
                            Termo assinado que registra o aceite provisório da obra. A data informada abaixo é o marco inicial dos 90 dias corridos exigidos para o Termo de Aceite Definitivo.
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                          Data de Emissão do Termo Provisório *
                        </label>
                        <input
                          type="date"
                          required
                          disabled={perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'gestor_paf'}
                          value={termoAceiteProvisorioDataInput}
                          onChange={(e) => setTermoAceiteProvisorioDataInput(e.target.value)}
                          className="w-full sm:w-56 text-xs p-2.5 border border-neutral-300 rounded-lg focus:outline-hidden bg-white disabled:opacity-60"
                        />
                      </div>

                      {termoAceiteProvisorioFileName ? (
                        <div className="p-3 bg-white border border-neutral-200 rounded-lg flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-md shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <span className="block text-xs font-bold text-neutral-800 break-all">{termoAceiteProvisorioFileName}</span>
                              <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">
                                Tamanho: {termoAceiteProvisorioFileSize} • Enviado em: {termoAceiteProvisorioUploadedAt ? new Date(termoAceiteProvisorioUploadedAt + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informado'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleDownloadDocument(termoAceiteProvisorioFileName, "Termo de Aceite Provisório")}
                              className="text-blue-600 hover:text-blue-800 text-xs font-bold px-2 py-1 hover:bg-blue-50 rounded transition-all cursor-pointer flex items-center gap-1 shrink-0"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Baixar
                            </button>
                            {(perfilUsuario === 'tecnico_infra' || (perfilUsuario === 'gestor_paf' || (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore'))) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTermoAceiteProvisorioFileName('');
                                  setTermoAceiteProvisorioFileSize('');
                                  setTermoAceiteProvisorioUploadedAt('');
                                }}
                                className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 hover:bg-red-50 rounded transition-all cursor-pointer shrink-0"
                              >
                                Remover
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            ref={termoAceiteProvisorioInputRef}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const sizeFormatted = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
                              setTermoAceiteProvisorioFileName(file.name);
                              setTermoAceiteProvisorioFileSize(sizeFormatted);
                              setTermoAceiteProvisorioUploadedAt(new Date().toISOString().split('T')[0]);
                            }}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => termoAceiteProvisorioInputRef.current?.click()}
                            disabled={perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'gestor_paf'}
                            className="px-3.5 py-2 border border-dashed border-slate-350 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                          >
                            <UploadCloud className="w-4 h-3.5 text-neutral-500 animate-bounce" />
                            Selecionar Termo de Aceite Provisório
                          </button>
                          <span className="text-[10px] text-neutral-400 font-sans">
                            Aceita PDF, DOCX ou DOC.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 5. TERMO DE ACEITE DEFINITIVO */}
                    <div className={`p-4 border rounded-lg space-y-3 ${prazo90DiasTermoProvisorioCumprido ? 'bg-slate-50/50 border-slate-200' : 'bg-neutral-100/60 border-neutral-200'}`}>
                      <div className="flex justify-between items-start flex-wrap gap-2 text-xs">
                        <div>
                          <span className="font-bold text-neutral-800 text-xs block">5. Termo de Aceite Definitivo *</span>
                          <span className="text-[10.5px] text-neutral-500 block leading-tight mt-0.5">
                            Termo assinado que formaliza o aceite definitivo da obra. Só pode ser emitido após 90 dias corridos da data do Termo de Aceite Provisório.
                          </span>
                        </div>
                      </div>

                      {!prazo90DiasTermoProvisorioCumprido && (
                        <p className="text-[10.5px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 font-medium flex items-center gap-1.5">
                          <Lock className="w-3 h-3 shrink-0" />
                          {!checkTermoAceiteProvisorio
                            ? 'Registre primeiro o Termo de Aceite Provisório acima.'
                            : `Liberado em ${dataLimiteTermoDefinitivo?.toLocaleDateString('pt-BR')} — faltam ${90 - (diasDesdeTermoProvisorio ?? 0)} dia(s).`}
                        </p>
                      )}

                      <div>
                        <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                          Data de Emissão do Termo Definitivo *
                        </label>
                        <input
                          type="date"
                          required
                          disabled={!prazo90DiasTermoProvisorioCumprido || (perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'gestor_paf')}
                          min={dataLimiteTermoDefinitivo ? dataLimiteTermoDefinitivo.toISOString().split('T')[0] : undefined}
                          value={termoAceiteDefinitivoDataInput}
                          onChange={(e) => setTermoAceiteDefinitivoDataInput(e.target.value)}
                          className="w-full sm:w-56 text-xs p-2.5 border border-neutral-300 rounded-lg focus:outline-hidden bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>

                      {termoAceiteDefinitivoFileName ? (
                        <div className="p-3 bg-white border border-neutral-200 rounded-lg flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-md shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <span className="block text-xs font-bold text-neutral-800 break-all">{termoAceiteDefinitivoFileName}</span>
                              <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">
                                Tamanho: {termoAceiteDefinitivoFileSize} • Enviado em: {termoAceiteDefinitivoUploadedAt ? new Date(termoAceiteDefinitivoUploadedAt + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informado'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleDownloadDocument(termoAceiteDefinitivoFileName, "Termo de Aceite Definitivo")}
                              className="text-blue-600 hover:text-blue-800 text-xs font-bold px-2 py-1 hover:bg-blue-50 rounded transition-all cursor-pointer flex items-center gap-1 shrink-0"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Baixar
                            </button>
                            {(perfilUsuario === 'tecnico_infra' || (perfilUsuario === 'gestor_paf' || (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore'))) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTermoAceiteDefinitivoFileName('');
                                  setTermoAceiteDefinitivoFileSize('');
                                  setTermoAceiteDefinitivoUploadedAt('');
                                }}
                                className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 hover:bg-red-50 rounded transition-all cursor-pointer shrink-0"
                              >
                                Remover
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            ref={termoAceiteDefinitivoInputRef}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const sizeFormatted = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
                              setTermoAceiteDefinitivoFileName(file.name);
                              setTermoAceiteDefinitivoFileSize(sizeFormatted);
                              setTermoAceiteDefinitivoUploadedAt(new Date().toISOString().split('T')[0]);
                            }}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => termoAceiteDefinitivoInputRef.current?.click()}
                            disabled={!prazo90DiasTermoProvisorioCumprido || (perfilUsuario !== 'tecnico_infra' && perfilUsuario !== 'gestor_paf')}
                            className="px-3.5 py-2 border border-dashed border-slate-350 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                          >
                            <UploadCloud className="w-4 h-3.5 text-neutral-500 animate-bounce" />
                            Selecionar Termo de Aceite Definitivo
                          </button>
                          <span className="text-[10px] text-neutral-400 font-sans">
                            Aceita PDF, DOCX ou DOC.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {(perfilUsuario === 'tecnico_infra' || (perfilUsuario === 'gestor_paf' || (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore'))) && (
                    <div className="flex flex-col gap-2 pt-3 border-t border-neutral-100">
                      {!todosItensOk && (
                        <p className="text-[10.5px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 font-medium text-right">
                          O botão será liberado após resolver todas as pendências do checklist.
                        </p>
                      )}
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={!todosItensOk}
                          title={!todosItensOk ? 'Resolva todas as pendências do checklist antes de concluir.' : 'Protocolar conclusão e alterar status da obra para Concluída'}
                          className={`px-6 py-2.5 text-white text-xs font-extrabold rounded-lg transition shadow-sm flex items-center gap-2 tracking-wide ${todosItensOk ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer' : 'bg-slate-300 cursor-not-allowed opacity-50'}`}
                        >
                          <CheckCircle className="w-4 h-4" />
                          Concluir Obra
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side Info Panel */}
              <div className="space-y-4">
                <div className="p-5 bg-white border border-neutral-200 rounded-xl space-y-4">
                  <h4 className="font-display font-medium text-xs text-neutral-400 uppercase tracking-widest">
                    Informações Relevantes
                  </h4>

                  <div className="space-y-4 text-xs font-sans">
                    <div>
                      <span className="block text-neutral-400">Escola Afetada</span>
                      <span className="text-sm font-semibold text-neutral-800 leading-tight block mt-0.5">
                        {solicitacao.nomeEscola}
                      </span>
                    </div>

                    <div>
                      <span className="block text-neutral-400">Total Medido Acumulado</span>
                      <span className="text-base font-bold font-mono text-emerald-600">
                        R$ {totalMedido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div>
                      <span className="block text-neutral-400">Valor Aditado da Obra</span>
                      <span className="text-sm font-bold font-mono text-neutral-750">
                        R$ {valorContratoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div>
                      <span className="block text-neutral-400">A evolução geral da obra é de:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-neutral-100 h-2.5 rounded-full overflow-hidden border border-neutral-200">
                          <div 
                            className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(100, progressoTotalObra)}%` }}
                          />
                        </div>
                        <span className="font-bold text-neutral-800 font-mono text-xs shrink-0">
                          {progressoTotalObra}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] text-neutral-700 space-y-2 font-sans">
                  <span className="font-bold block text-emerald-900 text-xs">Instruções de Fiscalização:</span>
                  <p>1. Verifique rigorosamente se o total acumulado das medições financeiras corresponde ao teto reajustado do contrato.</p>
                  <p>2. O <strong>Laudo Conclusivo</strong> deve atestar a aceitação definitiva do empreendimento sem ressalvas.</p>
                  <p>3. Envie fotos nítidas que facilitem o processo de auditoria de obras e prestação de contas governamentais.</p>
                  <p>4. O <strong>Termo de Aceite Definitivo</strong> só pode ser emitido 90 dias corridos após a data do <strong>Termo de Aceite Provisório</strong>.</p>
                </div>
              </div>
            </div>
          </form>
          );
        })()}
      </div>

      {mostrarModalEnviado && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl border border-slate-205 max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5">
              <h3 className="font-display font-bold text-neutral-800 text-base mb-2">Solicitação Encaminhada</h3>
              <p className="text-sm text-neutral-600">
                A solicitação foi encaminhada à DORE com sucesso. Aguarde a atribuição de um analista.
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50/75 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => {
                  setMostrarModalEnviado(false);
                  setActiveTab('checklist');
                }}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Retornar Etapa (somente Administrador) */}
      {retornoEtapaModalAberto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl border border-slate-205 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 space-y-4">
              <h3 className="font-display font-bold text-neutral-800 text-base flex items-center gap-2">
                <Undo2 className="w-4.5 h-4.5 text-rose-600" /> Retornar Etapa
              </h3>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Retornar para qual etapa? *
                </label>
                <select
                  value={etapaDestinoRetorno}
                  onChange={(e) => setEtapaDestinoRetorno(e.target.value as EtapaProcesso)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 font-bold"
                >
                  {etapasAnterioresDisponiveis.map(etapa => (
                    <option key={etapa} value={etapa}>{ETAPA_LABEL[etapa]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Motivo do retorno *
                </label>
                <textarea
                  rows={3}
                  value={motivoRetornoEtapa}
                  onChange={(e) => setMotivoRetornoEtapa(e.target.value)}
                  placeholder="Justifique o motivo do retorno administrativo..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50/75 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setRetornoEtapaModalAberto(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarRetornoEtapa}
                disabled={!etapaDestinoRetorno || !motivoRetornoEtapa.trim()}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Confirmar Retorno
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Solicitar Cancelamento (Técnico SRE) */}
      {solicitarCancelamentoModalAberto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl border border-slate-205 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 space-y-4">
              <h3 className="font-display font-bold text-neutral-800 text-base flex items-center gap-2">
                <Ban className="w-4.5 h-4.5 text-rose-600" /> Solicitar Cancelamento
              </h3>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Motivo da solicitação de cancelamento *
                </label>
                <textarea
                  rows={3}
                  value={motivoSolicitarCancelamento}
                  onChange={(e) => setMotivoSolicitarCancelamento(e.target.value)}
                  placeholder="Descreva o motivo da solicitação de cancelamento..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50/75 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setSolicitarCancelamentoModalAberto(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarSolicitarCancelamento}
                disabled={!motivoSolicitarCancelamento.trim()}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Confirmar Solicitação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Cancelar Processo (Administrador) */}
      {cancelarProcessoModalAberto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl border border-slate-205 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 space-y-4">
              <h3 className="font-display font-bold text-neutral-800 text-base flex items-center gap-2">
                <Ban className="w-4.5 h-4.5 text-rose-600" /> Cancelar Processo
              </h3>
              {solicitacao.solicitacaoCancelamento && solicitacao.motivoSolicitacaoCancelamento && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <span className="font-bold block mb-0.5">Motivo da solicitação do Técnico ({solicitacao.solicitacaoCancelamentoPor}):</span>
                  {solicitacao.motivoSolicitacaoCancelamento}
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Justificativa do cancelamento *
                </label>
                <textarea
                  rows={3}
                  value={justificativaCancelamentoFinal}
                  onChange={(e) => setJustificativaCancelamentoFinal(e.target.value)}
                  placeholder="Justifique o cancelamento definitivo do processo..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Esta ação é irreversível. O processo será arquivado como Cancelado.
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50/75 border-t border-slate-100 flex justify-end gap-2 flex-wrap">
              <button
                onClick={() => setCancelarProcessoModalAberto(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                Voltar
              </button>
              {solicitacao.solicitacaoCancelamento && (
                <button
                  onClick={handleNegarSolicitacaoCancelamento}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-amber-700 border border-amber-200 hover:bg-amber-50 cursor-pointer"
                >
                  Negar Solicitação
                </button>
              )}
              <button
                data-testid="botao-confirmar-cancelamento"
                onClick={handleConfirmarCancelamentoFinal}
                disabled={!justificativaCancelamentoFinal.trim()}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Devolução da Planilha Orçamentária (doc_1) — justificativa + arquivo obrigatórios */}
      {devolucaoModalDocId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl border border-slate-205 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 space-y-4">
              <h3 className="font-display font-bold text-neutral-800 text-base flex items-center gap-2">
                <XCircle className="w-4.5 h-4.5 text-red-600" /> Devolver Planilha Orçamentária
              </h3>
              <p className="text-xs text-slate-500 -mt-2">
                A devolução deste documento exige justificativa e o arquivo com as marcações do analista.
              </p>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Justificativa da devolução *
                </label>
                <textarea
                  rows={3}
                  value={devolucaoJustificativa}
                  onChange={(e) => setDevolucaoJustificativa(e.target.value)}
                  placeholder="Descreva o que precisa ser corrigido na planilha orçamentária..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Arquivo de devolução (.xlsx/.xls) *
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleDevolucaoArquivoChange}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-200 file:text-xs file:font-bold file:bg-slate-50 hover:file:bg-slate-100 cursor-pointer"
                />
                {devolucaoArquivo && (
                  <div className="mt-2 flex items-center gap-2 bg-slate-50 border border-slate-200/70 px-2.5 py-1.5 rounded-lg text-[11px]">
                    <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="font-mono text-slate-700 truncate flex-1">{devolucaoArquivo.fileName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{devolucaoArquivo.fileSize}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50/75 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelarDevolucao}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarDevolucao}
                disabled={!devolucaoArquivo || !devolucaoJustificativa.trim() || devolucaoJustificativa.trim() === JUSTIFICATIVA_RECUSA_PADRAO}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Confirmar Devolução
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
