import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  ClipboardList, 
  Users, 
  FileText, 
  Coins, 
  CheckCircle, 
  Layers, 
  ShieldCheck, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Building, 
  Download, 
  Search, 
  AlertCircle,
  MapPin,
  X,
  Database,
  ArrowRight,
  Sparkles,
  RefreshCw,
  ArrowLeft,
  Trash2,
  UploadCloud,
  Eye,
  FileClock,
  XCircle,
  Paperclip,
  Lock
} from 'lucide-react';
import { Solicitacao, EtapaProcesso, DocumentoChecklist, SecaoDadosGerais, syncChecklistDocs, AjustePlanilha, ReequilibrioItem, SaldoComplementarItem, AuxiliarProcesso } from '../types';
import { supabase } from '../lib/supabase';
import { CHECKLIST_PADRAO } from '../initialData';
import { calcularPrioridade, calcularEstrelas, getInfoEtiqueta, compararPorPrioridade, CodigoEtiqueta } from '../utils/prioridade';
import { calcularIEE, CLASSE_IEE_INFO, getPontosIEEDisponiveis } from '../utils/iee';
import { getStatusSecao, getStatusSecoes, tecnicoCorrigiuSecao, capturarSnapshotTecnico } from '../utils/validacaoTecnica';
import { useEscolas, type EnderecoEscola } from '../hooks/useEscolas';
import { calcularSlaCorrente, STATUS_SLA_INFO, formatarDuracaoHoras } from '../utils/sla';
import { EQUIPE_LABEL } from '../utils/auxiliares';

// Tipo de processo aceito pela tabela processo_auxiliares — usado tanto pra atribuir auxiliares
// quanto pra registrar o parecer deles. Ver [[equipes-analista-auxiliares]].
type TipoItemAuxiliar = 'analise' | 'ajuste' | 'reequilibrio' | 'saldo';

// Controle compacto de auxiliares (Elétrica/Arquitetura/PSCIP) de um processo — usado tanto na
// fila de Atribuição (designar) quanto nas telas de validação (acompanhar parecer).
function AuxiliaresControl({
  auxiliares,
  candidatos,
  onAdicionar,
  onRemover,
  somenteLeitura = false,
}: {
  auxiliares: AuxiliarProcesso[];
  candidatos: { id: string; nome: string; equipeAnalise?: string }[];
  onAdicionar: (usuario: { id: string; nome: string; equipe: 'Eletrica' | 'Arquitetura' | 'PSCIP' }) => void;
  onRemover: (auxiliarId: string) => void;
  somenteLeitura?: boolean;
}) {
  const [selecionado, setSelecionado] = useState('');
  const jaAdicionados = new Set(auxiliares.map(a => a.usuarioId).filter(Boolean));
  const disponiveis = candidatos.filter(c => !jaAdicionados.has(c.id));

  return (
    <div className="space-y-1 mt-1">
      {auxiliares.map(aux => {
        const corBadge = aux.aprovado === true ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
          : aux.aprovado === false ? 'bg-rose-100 text-rose-700 border-rose-200'
          : 'bg-amber-100 text-amber-700 border-amber-200';
        const labelStatus = aux.aprovado === true ? 'Aprovado' : aux.aprovado === false ? 'Reprovado' : 'Pendente';
        return (
          <div key={aux.id} className={`flex items-center justify-between gap-1 text-[9.5px] font-bold px-2 py-1 rounded-lg border ${corBadge}`}>
            <span className="truncate">{aux.nome} — {EQUIPE_LABEL[aux.equipe]}: {labelStatus}</span>
            {!somenteLeitura && (
              <button type="button" onClick={() => onRemover(aux.id)} title="Remover auxiliar" className="shrink-0 cursor-pointer hover:opacity-70">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}
      {!somenteLeitura && disponiveis.length > 0 && (
        <select
          value={selecionado}
          onChange={(e) => {
            const usr = disponiveis.find(u => u.id === e.target.value);
            if (usr && (usr.equipeAnalise === 'Eletrica' || usr.equipeAnalise === 'Arquitetura' || usr.equipeAnalise === 'PSCIP')) {
              onAdicionar({ id: usr.id, nome: usr.nome, equipe: usr.equipeAnalise });
            }
            setSelecionado('');
          }}
          className="w-full text-[9.5px] px-2 py-1 border border-dashed border-slate-300 rounded-lg bg-white text-slate-500 cursor-pointer"
        >
          <option value="">+ Adicionar auxiliar (Elétrica/Arquitetura/PSCIP)</option>
          {disponiveis.map(c => {
            const equipeLabel = c.equipeAnalise === 'Arquitetura' ? 'Arquitetura' : c.equipeAnalise === 'PSCIP' ? 'PSCIP' : 'Elétrica';
            return <option key={c.id} value={c.id}>{c.nome} ({equipeLabel})</option>;
          })}
        </select>
      )}
    </div>
  );
}


// Extensões aceitas para anexos do checklist (documentos técnicos, plantas e comprovantes escaneados)
const EXTENSOES_ANEXO_ACEITAS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.dwg', '.dxf', '.jpg', '.jpeg', '.png'];

// Exigência específica de formato por item do checklist padrão (documentos não listados aqui aceitam a lista geral acima)
const EXTENSOES_POR_DOCUMENTO: Record<string, string[]> = {
  doc_1: ['.xlsx'],          // Planilha Orçamentária
  doc_2: ['.pdf'],           // Registro do imóvel
  doc_3_pdf: ['.pdf'],       // Projeto de Engenharia (PDF)
  doc_3_dwg: ['.dwg'],       // Projeto de Engenharia (DWG)
  doc_4: ['.pdf'],           // Parecer técnico
  doc_ata: ['.pdf'],         // Ata do Colegiado
  doc_foto: ['.pdf'],        // Relatório fotográfico
  doc_5: ['.pdf'],           // Imposto ISS
};

function extensoesAceitasParaDoc(docId: string): string[] {
  return EXTENSOES_POR_DOCUMENTO[docId] || EXTENSOES_ANEXO_ACEITAS;
}

function extensaoAceita(fileName: string, extensoesPermitidas: string[] = EXTENSOES_ANEXO_ACEITAS): boolean {
  const nomeNormalizado = fileName.toLowerCase();
  return extensoesPermitidas.some(ext => nomeNormalizado.endsWith(ext));
}

// Códigos de endereço únicos por edificação (CODESC pode se repetir para principal + anexos)
export const enderecosDados = [
  { codigoEndereco: 'END-001', codesc: '145236', descricao: 'Prédio Principal' },
  { codigoEndereco: 'END-002', codesc: '145236', descricao: 'Anexo I' },
  { codigoEndereco: 'END-003', codesc: '145298', descricao: 'Prédio Principal' },
  { codigoEndereco: 'END-004', codesc: '145312', descricao: 'Prédio Principal' },
  { codigoEndereco: 'END-005', codesc: '145312', descricao: 'Anexo I' },
  { codigoEndereco: 'END-006', codesc: '145401', descricao: 'Prédio Principal' },
  { codigoEndereco: 'END-007', codesc: '145489', descricao: 'Prédio Principal' },
  { codigoEndereco: 'END-008', codesc: '145524', descricao: 'Prédio Principal' },
  { codigoEndereco: 'END-009', codesc: '145524', descricao: 'Anexo I' },
  { codigoEndereco: 'END-010', codesc: '145603', descricao: 'Prédio Principal' },
  { codigoEndereco: 'END-011', codesc: '145678', descricao: 'Prédio Principal' },
  { codigoEndereco: 'END-012', codesc: '1821',   descricao: 'Prédio Principal' },
  { codigoEndereco: 'END-013', codesc: '1821',   descricao: 'Anexo I' },
  { codigoEndereco: 'END-014', codesc: '102547', descricao: 'Prédio Principal' },
  { codigoEndereco: 'END-015', codesc: '103210', descricao: 'Prédio Principal' },
  { codigoEndereco: 'END-016', codesc: '103456', descricao: 'Prédio Principal' },
  { codigoEndereco: 'END-017', codesc: '103456', descricao: 'Anexo I' },
  { codigoEndereco: 'END-018', codesc: '1902',   descricao: 'Prédio Principal' },
  { codigoEndereco: 'END-019', codesc: '1104',   descricao: 'Prédio Principal' },
  { codigoEndereco: 'END-020', codesc: '104112', descricao: 'Prédio Principal' },
  { codigoEndereco: 'END-021', codesc: '104112', descricao: 'Anexo I' },
  { codigoEndereco: 'END-022', codesc: '205',    descricao: 'Prédio Principal' },
  { codigoEndereco: 'END-023', codesc: '201334', descricao: 'Prédio Principal' },
  { codigoEndereco: 'END-024', codesc: '106470', descricao: 'Prédio Principal' },
  { codigoEndereco: 'END-025', codesc: '106537', descricao: 'Prédio Principal' },
  { codigoEndereco: 'END-026', codesc: '304958', descricao: 'Prédio Principal' },
  { codigoEndereco: 'END-027', codesc: '304958', descricao: 'Anexo I' },
  { codigoEndereco: 'END-028', codesc: '305012', descricao: 'Prédio Principal' },
  { codigoEndereco: 'END-029', codesc: '205847', descricao: 'Prédio Principal' },
  { codigoEndereco: 'END-030', codesc: '205901', descricao: 'Prédio Principal' },
  { codigoEndereco: 'END-031', codesc: '405912', descricao: 'Prédio Principal' },
  { codigoEndereco: 'END-032', codesc: '405988', descricao: 'Prédio Principal' },
  { codigoEndereco: 'END-033', codesc: '501234', descricao: 'Prédio Principal' },
  { codigoEndereco: 'END-034', codesc: '501234', descricao: 'Anexo I' },
  { codigoEndereco: 'END-035', codesc: '501301', descricao: 'Prédio Principal' },
];

// ==========================================
// 1. FORMULÁRIO DE NOVO ATENDIMENTO E TELA INTERMEDIÁRIA
// ==========================================
interface NovoAtendimentoPanelProps {
  solicitacoes: Solicitacao[];
  onSolicitacaoCriada: (nova: Solicitacao) => void;
  onUpdateSolicitacao: (updated: Solicitacao) => void;
  usuariosSeguranca: { id: string; nome: string; perfil: string; depto?: string }[];
  onEdit?: (sol: Solicitacao) => void;
  perfilUsuario?: string;
  sreDoTecnico?: string;
  atendimentoEmEdicaoDirect?: Solicitacao | null;
  onLimparEdicaoDirect?: () => void;
  onFinalizarCriacao?: () => void;
}

export function NovoAtendimentoPanel({
  solicitacoes,
  onSolicitacaoCriada,
  onUpdateSolicitacao,
  usuariosSeguranca,
  onEdit,
  perfilUsuario,
  sreDoTecnico,
  atendimentoEmEdicaoDirect,
  onLimparEdicaoDirect,
  onFinalizarCriacao
}: NovoAtendimentoPanelProps) {
  const { escolas, enderecos, buscarEnderecos, carregando: carregandoEscolas } = useEscolas();

  // Filtra o banco de escolas pela SRE do técnico (se aplicável)
  // Memoizado: escolas/enderecos podem ter milhares de registros (base estadual) e esses
  // filtros não podem rodar de novo a cada tecla digitada em qualquer campo do formulário.
  const baseDadosFiltrados = useMemo(() => (
    sreDoTecnico
      ? escolas.filter(item => item.sre.toLowerCase() === sreDoTecnico.toLowerCase())
      : escolas
  ), [escolas, sreDoTecnico]);

  // Endereços restritos às escolas visíveis para o técnico (mesma regra de SRE acima)
  const enderecosFiltrados = useMemo(() => (
    sreDoTecnico
      ? enderecos.filter(e => baseDadosFiltrados.some(item => item.codesc === e.codesc))
      : enderecos
  ), [enderecos, baseDadosFiltrados, sreDoTecnico]);

  // Pré-preenche a SRE ao montar o componente para tecnico_infra
  useEffect(() => {
    if (sreDoTecnico) setSre(sreDoTecnico);
  }, [sreDoTecnico]);

  // Navigation: 'form' | 'checklist' | 'intermediaria'
  const [currentView, setCurrentView] = useState<'form' | 'checklist' | 'intermediaria'>('form');

  // Create / Register Form States
  const [codesc, setCodesc] = useState('');
  const [nomeEscola, setNomeEscola] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [sre, setSre] = useState('');
  const [codigoEndereco, setCodigoEndereco] = useState('');
  const [enderecosEdit, setEnderecosEdit] = useState<EnderecoEscola[]>([]);
  const [formaOcupacao, setFormaOcupacao] = useState('PRÓPRIO');
  const [outraFormaOcupacao, setOutraFormaOcupacao] = useState('');
  const [seiMinutaOcupacao, setSeiMinutaOcupacao] = useState('');
  const [predio, setPredio] = useState('PRINCIPAL');
  const [tombado, setTombado] = useState('NÃO É TOMBADO');
  const [orgaoTombador, setOrgaoTombador] = useState('');
  const [coabitado, setCoabitado] = useState('NÃO');
  const [tipoCoabitado, setTipoCoabitado] = useState('');
  const [tipoObra, setTipoObra] = useState('REFORMA');
  const [tipoAtendimento, setTipoAtendimento] = useState('NORMAL');
  const [numPaf, setNumPaf] = useState('');
  const [anoEmenda, setAnoEmenda] = useState('');
  const [tipoEmenda, setTipoEmenda] = useState<'Impositiva' | 'Parceria Por Escolas Melhores' | 'Federal' | ''>('');
  const [numeroIndicacaoEmenda, setNumeroIndicacaoEmenda] = useState('');
  const [formaAtendimento, setFormaAtendimento] = useState('VIA CAIXA ESCOLAR');
  // Classificação da Demanda
  const [origemDemanda, setOrigemDemanda] = useState('');
  const [orgaoEmissorNotificacao, setOrgaoEmissorNotificacao] = useState('');
  const [numeroNotificacao, setNumeroNotificacao] = useState('');
  const [dataNotificacao, setDataNotificacao] = useState('');
  const [prazoAtendimentoNotificacao, setPrazoAtendimentoNotificacao] = useState('');
  const [grauPrioridade, setGrauPrioridade] = useState('');
  const [descricaoFolhaRosto, setDescricaoFolhaRosto] = useState('');
  const [valorPlanilha, setValorPlanilha] = useState('');
  const [prazoEstimadoMeses, setPrazoEstimadoMeses] = useState('');
  const [iss, setIss] = useState('');
  // Saldo de PAF anterior cancelado
  const [usaSaldoPafAnterior, setUsaSaldoPafAnterior] = useState<'Sim' | 'Não'>('Não');
  const [numeroPafAnteriorCancelado, setNumeroPafAnteriorCancelado] = useState('');
  const [valorSaldoPafAnterior, setValorSaldoPafAnterior] = useState('');
  // Validação visual de campos obrigatórios
  const [tentouFinalizar, setTentouFinalizar] = useState(false);
  // Modal de confirmação de envio à DORE
  const [mostrarModalEnviado, setMostrarModalEnviado] = useState(false);
  // true quando o modal foi disparado por uma criação nova (finalizada, não rascunho) — nesse
  // caso, ao fechar o modal, o usuário deve voltar para a lista de atendimentos (fora deste painel)
  const [modalEnviadoPorCriacao, setModalEnviadoPorCriacao] = useState(false);
  const [modalEnviadoTexto, setModalEnviadoTexto] = useState('');

  const activeUser = usuariosSeguranca?.find(u => u.perfil === perfilUsuario);
  const responsavel = activeUser ? activeUser.nome : 'João Paulo Penfield';
  
  const [observacoesFicha, setObservacoesFicha] = useState('');
  const [erro, setErro] = useState('');

  // Checklist state for new registration in Step 2
  const [documentosChecklist, setDocumentosChecklist] = useState<DocumentoChecklist[]>(() => 
    CHECKLIST_PADRAO.map((doc, idx) => ({
      ...doc,
      id: `doc_${idx + 1}_${Math.floor(100+Math.random()*900)}`,
      status: 'pendente',
      fileName: undefined,
      fileSize: undefined,
      uploadedAt: undefined,
      justificativa: undefined
    }))
  );
  const [outrosDocumentosChecklist, setOutrosDocumentosChecklist] = useState<DocumentoChecklist[]>([]);
  const [novoCustomDocNome, setNovoCustomDocNome] = useState('');
  
  // Search & Filter state inside Intermediate screen
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAtendimentoForEdit, setSelectedAtendimentoForEdit] = useState<Solicitacao | null>(null);
  const [recentCreatedId, setRecentCreatedId] = useState<string | null>(null);

  // Rascunho (etapaAtual === 'cadastro') aberto pelo lápis/linha da lista: continua no MESMO
  // wizard de 2 passos usado para criar um atendimento novo (não o formulário resumido de
  // correção). Guarda o registro original para preservar campos não editáveis no wizard
  // (id, dataCriacao, historicoEtapas etc.) na hora de salvar.
  const [solicitacaoBaseEdicao, setSolicitacaoBaseEdicao] = useState<Solicitacao | null>(null);

  // Synchronize with direct editing requested from the parent dashboard
  React.useEffect(() => {
    if (!atendimentoEmEdicaoDirect) {
      setSelectedAtendimentoForEdit(null);
      setSolicitacaoBaseEdicao(null);
      return;
    }

    if (atendimentoEmEdicaoDirect.etapaAtual === 'cadastro') {
      // Rascunho: reabre o wizard completo de criação, pré-preenchido com os dados salvos.
      const sol = atendimentoEmEdicaoDirect;
      setSelectedAtendimentoForEdit(null);
      setSolicitacaoBaseEdicao(sol);

      setCodesc(sol.codesc || '');
      setNomeEscola(sol.nomeEscola || '');
      setMunicipio(sol.municipio || '');
      setSre(sol.sre || '');
      setCodigoEndereco(sol.codigoEndereco || '');

      const outroMatch = /^OUTRO \((.*)\)$/.exec(sol.formaOcupacao || '');
      setFormaOcupacao(outroMatch ? 'OUTRO' : (sol.formaOcupacao || 'PRÓPRIO'));
      setOutraFormaOcupacao(outroMatch ? outroMatch[1] : '');
      setSeiMinutaOcupacao(sol.seiMinutaOcupacao || '');

      setPredio(sol.predio || 'PRINCIPAL');
      setTombado(sol.tombado || 'NÃO É TOMBADO');
      setOrgaoTombador(sol.orgaoTombador || '');
      setCoabitado(sol.coabitado || 'NÃO');
      setTipoCoabitado(sol.tipoCoabitado || '');
      setTipoObra(sol.tipoObra || sol.tipo || 'REFORMA');
      setTipoAtendimento(sol.tipoAtendimento || 'NORMAL');
      setNumPaf(sol.numPaf || '');
      setAnoEmenda(sol.anoEmenda || '');
      setTipoEmenda(sol.tipoEmenda || '');
      setNumeroIndicacaoEmenda(sol.numeroIndicacaoEmenda || '');
      setFormaAtendimento(sol.formaAtendimento || 'VIA CAIXA ESCOLAR');
      setOrigemDemanda(sol.origemDemanda || '');
      setOrgaoEmissorNotificacao(sol.orgaoEmissorNotificacao || '');
      setNumeroNotificacao(sol.numeroNotificacao || '');
      setDataNotificacao(sol.dataNotificacao || '');
      setPrazoAtendimentoNotificacao(sol.prazoAtendimentoNotificacao || '');
      setGrauPrioridade(sol.grauPrioridade || '');
      setDescricaoFolhaRosto(sol.descricaoFolhaRosto || '');
      setValorPlanilha(sol.valorPlanilha ? sol.valorPlanilha.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '');
      setPrazoEstimadoMeses(sol.prazoEstimadoMeses ? String(sol.prazoEstimadoMeses) : '');
      setIss(sol.iss || '');
      setObservacoesFicha(sol.observacoesFicha || '');
      setUsaSaldoPafAnterior(sol.usaSaldoPafAnterior || 'Não');
      setNumeroPafAnteriorCancelado(sol.numeroPafAnteriorCancelado || '');
      setValorSaldoPafAnterior(sol.valorSaldoPafAnterior ? sol.valorSaldoPafAnterior.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '');

      setDocumentosChecklist(sol.documentos && sol.documentos.length > 0
        ? sol.documentos
        : CHECKLIST_PADRAO.map((doc, idx) => ({
            ...doc,
            id: `doc_${idx + 1}_${Math.floor(100 + Math.random() * 900)}`,
            status: 'pendente',
            fileName: undefined,
            fileSize: undefined,
            uploadedAt: undefined,
            justificativa: undefined
          })));
      setOutrosDocumentosChecklist(sol.outrosDocumentos || []);

      setTentouFinalizar(false);
      setErro('');
      setCurrentView('form');
    } else {
      // Correção (etapaAtual === 'correcao'): mantém o formulário resumido existente,
      // com o histórico de devoluções e campos bloqueados pela validação do analista.
      setSolicitacaoBaseEdicao(null);
      setSelectedAtendimentoForEdit(atendimentoEmEdicaoDirect);
    }
  }, [atendimentoEmEdicaoDirect]);

  // Busca endereços do CODESC do atendimento em edição/correção
  React.useEffect(() => {
    let ativo = true;
    const codescEdit = selectedAtendimentoForEdit?.codesc;
    if (!codescEdit) {
      setEnderecosEdit([]);
      return;
    }
    buscarEnderecos(codescEdit).then(res => {
      if (ativo) setEnderecosEdit(res);
    });
    return () => { ativo = false; };
  }, [selectedAtendimentoForEdit?.codesc, buscarEnderecos]);

  // Synchronize documentosChecklist with origemDemanda and formaAtendimento during creation
  React.useEffect(() => {
    setDocumentosChecklist(prev => {
      return syncChecklistDocs(prev, origemDemanda, formaAtendimento);
    });
  }, [origemDemanda, formaAtendimento]);

  // Synchronize inline loaded/edited solicitation documents with fields
  React.useEffect(() => {
    if (selectedAtendimentoForEdit) {
      const syncedDocs = syncChecklistDocs(
        selectedAtendimentoForEdit.documentos || [],
        selectedAtendimentoForEdit.origemDemanda,
        selectedAtendimentoForEdit.formaAtendimento
      );
      const lengthChanged = syncedDocs.length !== (selectedAtendimentoForEdit.documentos || []).length;
      const idsChanged = syncedDocs.some((d, idx) => d.id !== selectedAtendimentoForEdit.documentos?.[idx]?.id);
      if (lengthChanged || idsChanged) {
        setSelectedAtendimentoForEdit({
          ...selectedAtendimentoForEdit,
          documentos: syncedDocs
        });
      }
    }
  }, [selectedAtendimentoForEdit?.origemDemanda, selectedAtendimentoForEdit?.formaAtendimento]);
  
  // Format BRL string helpers
  const formatBRL = (value: string): string => {
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue) return '';
    const cents = parseInt(cleanValue, 10);
    const reais = cents / 100;
    return reais.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    });
  };

  const parseBRLToFloat = (value: string): number | undefined => {
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue) return undefined;
    return parseInt(cleanValue, 10) / 100;
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatBRL(e.target.value);
    setValorPlanilha(formatted);
  };

  const handleValorSaldoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValorSaldoPafAnterior(formatBRL(e.target.value));
  };

  const necessidadeAditivoCalc = usaSaldoPafAnterior === 'Sim'
    ? Math.max(0, (parseBRLToFloat(valorPlanilha) ?? 0) - (parseBRLToFloat(valorSaldoPafAnterior) ?? 0))
    : 0;

  // Preenche município/SRE a partir de uma escola já resolvida (mantém a regra de SRE fixa para o técnico de infra)
  const aplicarEscola = (match: typeof escolas[0] | undefined) => {
    setMunicipio(match?.municipio || '');
    if (perfilUsuario !== 'tecnico_infra') setSre(match?.sre || '');
  };

  // Busca por CODESC: preenche escola, município e SRE
  // Busca dentro de escolasNoFiltro (já restrita à SRE/Município escolhidos) para não
  // pegar por engano outra escola de mesmo CODESC/nome fora do filtro atual.
  const selecionarPorCodesc = (val: string) => {
    setCodesc(val);
    setCodigoEndereco('');
    const match = escolasNoFiltro.find(item => item.codesc === val) || baseDadosFiltrados.find(item => item.codesc === val);
    setNomeEscola(match?.nome || '');
    aplicarEscola(match);
  };

  // Busca por Nome da Escola: preenche CODESC, município e SRE
  // Nomes de escola podem se repetir entre municípios diferentes — priorizar o match
  // dentro do filtro de SRE/Município já escolhido evita pegar a escola errada.
  const selecionarPorNomeEscola = (val: string) => {
    setNomeEscola(val);
    setCodigoEndereco('');
    const match = escolasNoFiltro.find(item => item.nome === val) || baseDadosFiltrados.find(item => item.nome === val);
    setCodesc(match?.codesc || '');
    aplicarEscola(match);
  };

  // Busca por Código do Endereço: resolve a escola dona do prédio e preenche CODESC, nome, município e SRE
  const selecionarPorCodigoEndereco = (val: string) => {
    setCodigoEndereco(val);
    const enderecoMatch = enderecosFiltrados.find(e => e.codigoEndereco === val);
    const escolaMatch = enderecoMatch ? baseDadosFiltrados.find(item => item.codesc === enderecoMatch.codesc) : undefined;
    setCodesc(enderecoMatch?.codesc || '');
    setNomeEscola(escolaMatch?.nome || '');
    aplicarEscola(escolaMatch);
  };

  // Busca por Superintendência (SRE): filtro de topo da hierarquia — limpa os níveis abaixo (município, escola, endereço)
  const selecionarPorSre = (val: string) => {
    setSre(val);
    setMunicipio('');
    setCodesc('');
    setNomeEscola('');
    setCodigoEndereco('');
  };

  // Busca por Município: filtra escola/endereço abaixo e resolve a SRE dona do município acima (município pertence a uma única SRE)
  const selecionarPorMunicipio = (val: string) => {
    setMunicipio(val);
    setCodesc('');
    setNomeEscola('');
    setCodigoEndereco('');
    if (perfilUsuario !== 'tecnico_infra') {
      const match = baseDadosFiltrados.find(item => item.municipio === val);
      setSre(match?.sre || '');
    }
  };

  // Opções de SRE e Município disponíveis, respeitando o nível já escolhido acima na hierarquia (SRE > Município > Escola > Endereço)
  // Também memoizado pelo mesmo motivo acima — evita refazer esses derivados a cada tecla digitada em campos não relacionados (ex: descrição da folha de rosto).
  const sresDisponiveis = useMemo(
    () => [...new Set(baseDadosFiltrados.map(item => item.sre))].sort(),
    [baseDadosFiltrados]
  );
  const municipiosDisponiveis = useMemo(() => [...new Set(
    (sre ? baseDadosFiltrados.filter(item => item.sre === sre) : baseDadosFiltrados).map(item => item.municipio)
  )].sort(), [baseDadosFiltrados, sre]);

  // Escolas visíveis nos seletores de CODESC/Nome, restritas à SRE e ao Município já escolhidos
  const escolasNoFiltro = useMemo(() => baseDadosFiltrados.filter(item =>
    (!sre || item.sre === sre) && (!municipio || item.municipio === municipio)
  ), [baseDadosFiltrados, sre, municipio]);

  // Lista de endereços disponível: restrita ao CODESC já escolhido (cascata), ou às escolas do filtro de SRE/Município (com o nome da escola dona do prédio) para permitir a busca pelo próprio endereço
  // Ordenada numericamente pelo código do endereço, do menor para o maior.
  const enderecosParaSelecao = useMemo(() => (codesc
    ? enderecosFiltrados.filter(e => e.codesc === codesc)
    : enderecosFiltrados.filter(e => escolasNoFiltro.some(item => item.codesc === e.codesc))
  ).map(e => ({ ...e, nomeEscola: baseDadosFiltrados.find(item => item.codesc === e.codesc)?.nome }))
   .sort((a, b) => {
     const na = Number(a.codigoEndereco);
     const nb = Number(b.codigoEndereco);
     return !Number.isNaN(na) && !Number.isNaN(nb) ? na - nb : a.codigoEndereco.localeCompare(b.codigoEndereco);
   }),
  [codesc, enderecosFiltrados, escolasNoFiltro, baseDadosFiltrados]);

  // Step 1: Navigates to Step 2 Checklist
  const handleProsseguirParaChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !nomeEscola.trim() ||
      !codesc.trim() ||
      !municipio.trim() ||
      !sre.trim() ||
      !descricaoFolhaRosto.trim() ||
      (formaOcupacao === 'OUTRO' && !outraFormaOcupacao.trim()) ||
      (tipoAtendimento === 'EMENDA' && (!numPaf.trim() || !anoEmenda.trim() || !tipoEmenda || !numeroIndicacaoEmenda.trim()))
    ) {
      setErro('Por favor, preencha todos os campos obrigatórios do formulário.');
      return;
    }
    setErro('');
    setCurrentView('checklist');
  };

  // Handle native file upload in creation step 2 — lê o conteúdo real do arquivo (base64) para permitir download posterior
  const handleRealUploadChecklist = (docId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const extensoesPermitidas = extensoesAceitasParaDoc(docId);
    if (!extensaoAceita(file.name, extensoesPermitidas)) {
      alert(`Formato de arquivo não permitido para este documento. Extensões aceitas: ${extensoesPermitidas.join(', ')}`);
      e.target.value = '';
      return;
    }
    const fileSize = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${(file.size / 1024).toFixed(0)} KB`;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const fileContent = ev.target?.result as string;
      setDocumentosChecklist(prev => prev.map(doc => {
        if (doc.id === docId) {
          return {
            ...doc,
            status: 'pendente' as const,
            fileName: file.name,
            fileSize,
            fileContent,
            fileType: file.type || undefined,
            uploadedAt: new Date().toISOString().split('T')[0]
          };
        }
        return doc;
      }));
    };
    reader.readAsDataURL(file);
  };

  // Simulates uploading document in step 2 (from quick simulation)
  const handleSimularUploadDocChecklist = (docId: string, customName: string) => {
    setDocumentosChecklist(prev => prev.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          status: 'pendente' as const,
          fileName: customName,
          fileSize: '1.2 MB',
          uploadedAt: new Date().toISOString().split('T')[0]
        };
      }
      return doc;
    }));
  };

  // Remove uploaded document in step 2
  const handleRemoverDocChecklist = (docId: string) => {
    setDocumentosChecklist(prev => prev.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          status: 'pendente' as const,
          fileName: undefined,
          fileSize: undefined,
          fileContent: undefined,
          fileType: undefined,
          uploadedAt: undefined
        };
      }
      return doc;
    }));
  };

  // Custom step 2 document creators and upload flow helpers
  const handleAddCustomDocStep2 = () => {
    if (!novoCustomDocNome.trim()) return;
    const nuevo: DocumentoChecklist = {
      id: `doc_custom_${Date.now()}`,
      nome: novoCustomDocNome.trim(),
      obrigatorio: true,
      desc: 'Documento complementar indicado pelo Técnico de Infraestrutura.',
      status: 'pendente'
    };
    setOutrosDocumentosChecklist(prev => [...prev, nuevo]);
    setNovoCustomDocNome('');
  };

  const handleSimularUploadCustomDocStep2 = (docId: string) => {
    setOutrosDocumentosChecklist(prev => prev.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          status: 'pendente' as const,
          fileName: `outro_doc_${doc.nome.toLowerCase().replace(/\s+/g, '_')}_v1.pdf`,
          fileSize: '750 KB',
          uploadedAt: new Date().toISOString().split('T')[0]
        };
      }
      return doc;
    }));
  };

  const handleRealUploadCustomDocStep2 = (docId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!extensaoAceita(file.name)) {
      alert(`Formato de arquivo não permitido. Extensões aceitas: ${EXTENSOES_ANEXO_ACEITAS.join(', ')}`);
      e.target.value = '';
      return;
    }
    const fileSize = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${(file.size / 1024).toFixed(0)} KB`;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const fileContent = ev.target?.result as string;
      setOutrosDocumentosChecklist(prev => prev.map(doc => {
        if (doc.id === docId) {
          return {
            ...doc,
            status: 'pendente' as const,
            fileName: file.name,
            fileSize,
            fileContent,
            fileType: file.type || undefined,
            uploadedAt: new Date().toISOString().split('T')[0]
          };
        }
        return doc;
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoverCustomDocStep2 = (docId: string) => {
    setOutrosDocumentosChecklist(prev => prev.filter(doc => doc.id !== docId));
  };

  // Save either as 'cadastro' (draft) or 'analise' (finalize)
  // Campos do wizard comuns a criação e atualização (Extended fields + documentos)
  const construirCamposFormulario = () => ({
    codigoEndereco: codigoEndereco.trim() || undefined,
    formaOcupacao: formaOcupacao === 'OUTRO' ? `OUTRO (${outraFormaOcupacao.trim().toUpperCase()})` : formaOcupacao,
    seiMinutaOcupacao: formaOcupacao === 'OUTRO' ? seiMinutaOcupacao.trim() || undefined : undefined,
    predio: predio.toUpperCase(),
    tipoObra,
    tipoAtendimento,
    numPaf: tipoAtendimento === 'EMENDA' ? numPaf.trim().toUpperCase() : undefined,
    anoEmenda: tipoAtendimento === 'EMENDA' ? anoEmenda.trim() : undefined,
    tipoEmenda: tipoAtendimento === 'EMENDA' ? (tipoEmenda || undefined) : undefined,
    numeroIndicacaoEmenda: tipoAtendimento === 'EMENDA' ? numeroIndicacaoEmenda.trim() || undefined : undefined,
    formaAtendimento,
    origemDemanda: origemDemanda || undefined,
    orgaoEmissorNotificacao: origemDemanda === 'Notificação' ? orgaoEmissorNotificacao || undefined : undefined,
    numeroNotificacao: origemDemanda === 'Notificação' ? numeroNotificacao || undefined : undefined,
    dataNotificacao: origemDemanda === 'Notificação' ? dataNotificacao || undefined : undefined,
    prazoAtendimentoNotificacao: origemDemanda === 'Notificação' ? prazoAtendimentoNotificacao || undefined : undefined,
    grauPrioridade: grauPrioridade as any || undefined,
    descricaoFolhaRosto,
    valorPlanilha: valorPlanilha ? parseBRLToFloat(valorPlanilha) : 0,
    prazoEstimadoMeses: prazoEstimadoMeses ? parseInt(prazoEstimadoMeses, 10) : undefined,
    iss: iss ? (iss.includes('%') ? iss : `${iss}%`) : '5%',
    responsavel,
    tombado: tombado.toUpperCase(),
    orgaoTombador: tombado !== 'NÃO É TOMBADO' ? (orgaoTombador.toUpperCase() || 'MUNICIPAL') : undefined,
    coabitado: coabitado.toUpperCase(),
    tipoCoabitado: coabitado === 'SIM' ? (tipoCoabitado || 'Coabitado com outra escola Estadual') : undefined,
    observacoesFicha: observacoesFicha,
    usaSaldoPafAnterior,
    numeroPafAnteriorCancelado: usaSaldoPafAnterior === 'Sim' ? numeroPafAnteriorCancelado.trim().toUpperCase() || undefined : undefined,
    valorSaldoPafAnterior: usaSaldoPafAnterior === 'Sim' ? parseBRLToFloat(valorSaldoPafAnterior) : undefined,
    necessidadeAditivoEstimada: usaSaldoPafAnterior === 'Sim' ? necessidadeAditivoCalc : undefined
  });

  const handleFinalizarEGravar = (isDraft: boolean) => {
    const hoje = new Date().toISOString().split('T')[0];

    // Rascunho aberto pelo lápis/linha da lista: atualiza o registro existente em vez de
    // criar um novo, preservando id, dataCriacao e o histórico de etapas já percorrido.
    if (solicitacaoBaseEdicao) {
      const atualizada: Solicitacao = {
        ...solicitacaoBaseEdicao,
        nomeEscola,
        codesc,
        tipo: tipoObra,
        municipio,
        sre,
        statusAprovacaoRegional: !isDraft ? 'pendente' : solicitacaoBaseEdicao.statusAprovacaoRegional,
        justificativaReprovacaoRegional: !isDraft ? undefined : solicitacaoBaseEdicao.justificativaReprovacaoRegional,
        historicoEtapas: [
          ...solicitacaoBaseEdicao.historicoEtapas,
          ...(!isDraft ? [{ etapa: 'cadastro' as EtapaProcesso, data: hoje, responsavel: `${responsavel || 'Téc. de Infraestrutura'} (enviado para aprovação do coordenador regional)` }] : [])
        ],
        documentos: documentosChecklist,
        outrosDocumentos: outrosDocumentosChecklist,
        ...construirCamposFormulario()
      };

      onUpdateSolicitacao(atualizada);
      if (onLimparEdicaoDirect) onLimparEdicaoDirect();
      setSolicitacaoBaseEdicao(null);
      setErro('');
      setModalEnviadoTexto(!isDraft
        ? 'O atendimento foi atualizado e encaminhado para aprovação do coordenador regional. Após aprovado, seguirá para a DORE.'
        : 'Rascunho atualizado com sucesso.');
      setModalEnviadoPorCriacao(false);
      setMostrarModalEnviado(true);
      resetToForm();
      return;
    }

    // Envio (não-rascunho) não vai mais direto para 'analise' — fica em 'cadastro' aguardando
    // aprovação do coordenador regional (statusAprovacaoRegional), que é quem libera para a DORE.
    const novaId = `SOL-2026-${Math.floor(100 + Math.random() * 900)}`;
    const nova: Solicitacao = {
      id: novaId,
      nomeEscola,
      codesc,
      tipo: tipoObra,
      municipio,
      sre,
      dataCriacao: hoje,
      etapaAtual: 'cadastro',
      statusAprovacaoRegional: !isDraft ? 'pendente' : undefined,
      historicoEtapas: [
        { etapa: 'cadastro' as EtapaProcesso, data: hoje, responsavel: responsavel || 'Téc. de Infraestrutura' },
        ...(!isDraft ? [{ etapa: 'cadastro' as EtapaProcesso, data: hoje, responsavel: `${responsavel || 'Téc. de Infraestrutura'} (enviado para aprovação do coordenador regional)` }] : [])
      ],
      documentos: documentosChecklist,
      outrosDocumentos: outrosDocumentosChecklist,
      medicoes: [],
      aditivos: [],
      ajustes: [],
      ...construirCamposFormulario()
    };

    onSolicitacaoCriada(nova);
    setRecentCreatedId(novaId);
    setSearchQuery('');
    setErro('');
    if (!isDraft) {
      setModalEnviadoTexto('O atendimento foi registrado e encaminhado para aprovação do coordenador regional. Após aprovado, seguirá para a DORE.');
      setModalEnviadoPorCriacao(true);
      setMostrarModalEnviado(true);
    } else {
      setCurrentView('intermediaria');
    }
  };

  // Switch back to form to create another
  const resetToForm = () => {
    setCodesc('');
    setNomeEscola('');
    setMunicipio('');
    setSre('');
    setFormaOcupacao('PRÓPRIO');
    setOutraFormaOcupacao('');
    setPredio('PRINCIPAL');
    setTombado('NÃO É TOMBADO');
    setTipoObra('REFORMA');
    setTipoAtendimento('NORMAL');
    setNumPaf('');
    setAnoEmenda('');
    setTipoEmenda('');
    setNumeroIndicacaoEmenda('');
    setFormaAtendimento('VIA CAIXA ESCOLAR');
    setDescricaoFolhaRosto('');
    setValorPlanilha('');
    setPrazoEstimadoMeses('');
    setIss('');
    setObservacoesFicha('');
    setErro('');
    setUsaSaldoPafAnterior('Não');
    setNumeroPafAnteriorCancelado('');
    setValorSaldoPafAnterior('');
    setTentouFinalizar(false);
    setSelectedAtendimentoForEdit(null);
    setSolicitacaoBaseEdicao(null);
    if (onLimparEdicaoDirect) onLimparEdicaoDirect();
    setOutrosDocumentosChecklist([]);
    setNovoCustomDocNome('');
    setDocumentosChecklist(
      CHECKLIST_PADRAO.map((doc, idx) => ({
        ...doc,
        id: `doc_${idx + 1}_${Math.floor(100+Math.random()*900)}`,
        status: 'pendente',
        fileName: undefined,
        fileSize: undefined,
        uploadedAt: undefined,
        justificativa: undefined
      }))
    );
    setCurrentView('form');
  };

  // Filter Atendimentos
  const atendimentosFiltrados = solicitacoes.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      item.id.toLowerCase().includes(q) ||
      item.nomeEscola.toLowerCase().includes(q) ||
      item.municipio.toLowerCase().includes(q) ||
      item.sre.toLowerCase().includes(q) ||
      (item.tipoObra || '').toLowerCase().includes(q) ||
      (item.responsavel || '').toLowerCase().includes(q)
    );
  });

  // Load a solicitation for editing/editing in place
  const selectForEdit = (sol: Solicitacao) => {
    setTentouFinalizar(false);
    setSelectedAtendimentoForEdit(sol);
  };

  // Handler for in-place edit update
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAtendimentoForEdit) return;

    onUpdateSolicitacao(selectedAtendimentoForEdit);
    setSelectedAtendimentoForEdit(null);
  };

  const handleUploadDocReal = (docId: string, file: File) => {
    if (!selectedAtendimentoForEdit) return;
    const fileSize = file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(0)} KB`
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const fileContent = ev.target?.result as string;
      setSelectedAtendimentoForEdit(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          documentos: prev.documentos.map(doc => {
            if (doc.id === docId) {
              return {
                ...doc,
                status: 'pendente' as const,
                fileName: file.name,
                uploadedAt: new Date().toISOString().split('T')[0],
                fileSize,
                fileContent,
                fileType: file.type || undefined
              };
            }
            return doc;
          })
        };
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full text-left space-y-6">
      {/* 1. SEGUNDO CASO: FORMULÁRIO DE CADASTRO ATIVO (PASSO 1) */}
      {currentView === 'form' && !selectedAtendimentoForEdit && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-3xs max-w-4xl mx-auto w-full text-left animate-in fade-in duration-200">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2 font-sans">
              <Plus className="w-5 h-5 text-blue-600" />
              Abertura de Demanda / Novo Atendimento de Infraestrutura (GESTO)
            </h2>
          </div>

          {/* Wizard step breadcrumbs */}
          <div className="flex items-center justify-center gap-4 py-3 mb-6 bg-slate-50 border border-slate-200/60 rounded-xl max-w-md mx-auto">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs">1</span>
              <span className="text-xs font-bold text-blue-700">Dados Gerais</span>
            </div>
            <div className="w-12 h-0.5 bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 font-extrabold flex items-center justify-center text-xs">2</span>
              <span className="text-xs font-bold text-slate-400">Checklist & Anexos</span>
            </div>
          </div>

          <form onSubmit={handleProsseguirParaChecklist} className="space-y-6">
            {erro && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            {/* SEÇÃO 1: Identificação Escolar */}
            <div className="bg-slate-50/55 p-4 rounded-xl border border-slate-200/60 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                  <Database className="w-4 h-4 text-blue-500" />
                  1. Identificação Escolar
                </h4>
                {carregandoEscolas && (
                  <div className="text-[10px] text-slate-400 font-sans">
                    Carregando escolas...
                  </div>
                )}
              </div>

              {/* Passo 1: filtro hierárquico — SRE > Município. Restringe as opções de escola/endereço abaixo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Superintendência Regional (SRE) *
                  </label>
                  {perfilUsuario === 'tecnico_infra' ? (
                    <div className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-100 text-slate-700 font-semibold flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 uppercase font-sans shrink-0">Sua regional:</span>
                      {sre}
                    </div>
                  ) : (
                    <select
                      required
                      value={sre}
                      onChange={(e) => selecionarPorSre(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 bg-white font-semibold text-slate-800 cursor-pointer"
                    >
                      <option value="">Selecione a SRE...</option>
                      {sresDisponiveis.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Município *
                  </label>
                  <select
                    required
                    value={municipio}
                    onChange={(e) => selecionarPorMunicipio(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 bg-white font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="">Selecione o município...</option>
                    {municipiosDisponiveis.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Passo 2: busca bidirecional — CODESC, Nome da Escola ou Código do Endereço, restrita à SRE/Município do Passo 1. Qualquer um dos três preenche os demais automaticamente */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Código CODESC *
                  </label>
                  <select
                    required
                    value={codesc}
                    onChange={(e) => selecionarPorCodesc(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 bg-white font-mono font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="">Selecione o CODESC...</option>
                    {escolasNoFiltro.map(item => (
                      <option key={item.codesc} value={item.codesc}>{item.codesc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Nome da Escola Estadual *
                  </label>
                  <select
                    data-testid="atendimento-busca-escola"
                    required
                    value={nomeEscola}
                    onChange={(e) => selecionarPorNomeEscola(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 bg-white font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="">Selecione a escola...</option>
                    {escolasNoFiltro.map(item => (
                      <option data-testid={`atendimento-opcao-escola-${item.codesc}`} key={item.codesc} value={item.nome}>{item.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Código do Endereço
                  </label>
                  <select
                    value={codigoEndereco}
                    onChange={(e) => selecionarPorCodigoEndereco(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 bg-white font-mono text-slate-800 cursor-pointer"
                  >
                    <option value="">Selecione o endereço...</option>
                    {enderecosParaSelecao.map(e => (
                      <option key={`${e.codesc}-${e.codigoEndereco}`} value={e.codigoEndereco}>
                        {e.codigoEndereco} — {e.descricao}{!codesc && e.nomeEscola ? ` · ${e.nomeEscola}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

            </div>

            {/* SEÇÃO 2: Classificação Patrimonial do Imóvel */}
            <div className="bg-slate-50/55 p-4 rounded-xl border border-slate-200/60 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3 border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                  2. Classificação Patrimonial do Imóvel
                </h4>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Forma de Ocupação *
                </label>
                <select
                  value={formaOcupacao}
                  onChange={(e) => setFormaOcupacao(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 bg-white cursor-pointer font-bold text-slate-800"
                >
                  <option value="PRÓPRIO">PRÓPRIO</option>
                  <option value="ALUGADO">ALUGADO</option>
                  <option value="CEDIDO">CEDIDO</option>
                  <option value="OUTRO">OUTRO</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Tombamento *
                </label>
                <select
                  value={tombado}
                  onChange={(e) => {
                    setTombado(e.target.value);
                    if (e.target.value === 'NÃO É TOMBADO') {
                      setOrgaoTombador('');
                    } else if (!orgaoTombador) {
                      setOrgaoTombador('MUNICIPAL');
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 bg-white cursor-pointer font-bold text-slate-800"
                >
                  <option value="NÃO É TOMBADO">NÃO É TOMBADO</option>
                  <option value="TOMBADO PARCIALMENTE">TOMBADO PARCIALMENTE</option>
                  <option value="TOMBADO TOTALMENTE">TOMBADO TOTALMENTE</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Órgão Tombador *
                </label>
                <select
                  value={orgaoTombador}
                  onChange={(e) => setOrgaoTombador(e.target.value)}
                  disabled={tombado === 'NÃO É TOMBADO'}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 bg-white cursor-pointer font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-150"
                >
                  {tombado === 'NÃO É TOMBADO' && <option value="">NÃO APLICÁVEL</option>}
                  <option value="MUNICIPAL">MUNICIPAL</option>
                  <option value="ESTADUAL">ESTADUAL</option>
                  <option value="FEDERAL">FEDERAL</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Imóvel Coabitado? *
                </label>
                <select
                  value={coabitado}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCoabitado(val);
                    if (val === 'NÃO') {
                      setTipoCoabitado('');
                    } else if (!tipoCoabitado) {
                      setTipoCoabitado('Coabitado com outra escola Estadual');
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 bg-white cursor-pointer font-bold text-slate-800"
                >
                  <option value="NÃO">NÃO</option>
                  <option value="SIM">SIM</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Tipo de Coabitação *
                </label>
                <select
                  value={tipoCoabitado}
                  onChange={(e) => setTipoCoabitado(e.target.value)}
                  disabled={coabitado === 'NÃO'}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 bg-white cursor-pointer font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-150"
                >
                  {coabitado === 'NÃO' && <option value="">NÃO APLICÁVEL</option>}
                  <option value="Coabitado com outra escola Estadual">Coabitado com outra escola Estadual</option>
                  <option value="Coabitado com outra escola municipal">Coabitado com outra escola municipal</option>
                  <option value="Coabitado com outro órgão estadual">Coabitado com outro órgão estadual</option>
                  <option value="Coabitado com outro órgão municipal">Coabitado com outro órgão municipal</option>
                  <option value="Coabitado com instituto federal">Coabitado com instituto federal</option>
                </select>
              </div>

              {formaOcupacao === 'OUTRO' && (
                <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-150">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Especifique a Outra Forma de Ocupação *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Especifique..."
                      value={outraFormaOcupacao}
                      onChange={(e) => setOutraFormaOcupacao(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      SEI da Minuta *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 1234.01.0012345/2026-00"
                      value={seiMinutaOcupacao}
                      onChange={(e) => setSeiMinutaOcupacao(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 font-mono"
                    />
                  </div>
                </div>
              )}

            </div>

            {/* SEÇÃO 3: Detalhamento Técnico e Demanda */}
            <div className="bg-slate-50/55 p-4 rounded-xl border border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                  3. Detalhamento Técnico e Demanda
                </h4>
              </div>

              {/* Origem da Demanda */}
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Origem da Demanda *</label>
                <select value={origemDemanda} onChange={(e) => setOrigemDemanda(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 bg-white text-slate-800 font-bold cursor-pointer">
                  <option value="">Selecione a origem...</option>
                  {['Solicitação da Escola', 'Solicitação da SRE', 'Programa Governamental', 'Fiscalização', 'Notificação', 'Determinação Judicial', 'Atendimento Político'].map(op => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </div>

              {/* Sub-campos de Notificação */}
              {origemDemanda === 'Notificação' && (
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl animate-in slide-in-from-top-2 duration-150">
                  <div className="sm:col-span-2 text-[10px] font-black text-amber-800 uppercase tracking-wider">Detalhes da Notificação</div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Órgão Emissor *</label>
                    <select value={orgaoEmissorNotificacao} onChange={(e) => setOrgaoEmissorNotificacao(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white cursor-pointer font-bold text-slate-800">
                      <option value="">Selecione...</option>
                      {['Ministério Público', 'Defesa Civil', 'Corpo de Bombeiros', 'Prefeitura', 'TCE', 'CGE', 'Vigilância Sanitária', 'Outro'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Grau de Prioridade *</label>
                    <select value={grauPrioridade} onChange={(e) => setGrauPrioridade(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white cursor-pointer font-bold text-slate-800">
                      <option value="">Selecione...</option>
                      {['Crítico', 'Alto', 'Médio', 'Baixo'].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Número da Notificação *</label>
                    <input type="text" required placeholder="Ex: NOT-2026/001" value={numeroNotificacao} onChange={(e) => setNumeroNotificacao(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Data da Notificação *</label>
                    <input type="date" required value={dataNotificacao} onChange={(e) => setDataNotificacao(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Prazo para Atendimento *</label>
                    <input type="date" required value={prazoAtendimentoNotificacao} onChange={(e) => setPrazoAtendimentoNotificacao(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white" />
                  </div>
                </div>
              )}

              {/* Saldo de PAF Anterior Cancelado */}
              <div className="sm:col-span-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-indigo-800 uppercase tracking-wider mb-1.5">
                    Este Atendimento Precisará de liberação financeira? *
                  </label>
                  <select
                    value={usaSaldoPafAnterior}
                    onChange={(e) => setUsaSaldoPafAnterior(e.target.value as 'Sim' | 'Não')}
                    className="w-full px-3 py-2 text-xs border border-indigo-200 rounded-lg bg-white cursor-pointer font-bold text-slate-800"
                  >
                    <option value="Não">Não</option>
                    <option value="Sim">Sim</option>
                  </select>
                </div>
                {usaSaldoPafAnterior === 'Sim' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-150">
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-800 uppercase tracking-wider mb-1">
                        Número do PAF Anterior Cancelado *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: PAF-1234/2025"
                        value={numeroPafAnteriorCancelado}
                        onChange={(e) => setNumeroPafAnteriorCancelado(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-indigo-200 bg-white rounded-md focus:outline-hidden text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-800 uppercase tracking-wider mb-1">
                        Saldo Disponível *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="R$ 0,00"
                        value={valorSaldoPafAnterior}
                        onChange={handleValorSaldoChange}
                        className="w-full px-3 py-1.5 text-xs border border-indigo-200 bg-white rounded-md focus:outline-hidden text-slate-800 font-mono font-extrabold"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Tipo de Obra *
                </label>
                <select
                  value={tipoObra}
                  onChange={(e) => setTipoObra(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 bg-white text-slate-800 font-bold"
                >
                  <option value="AMPLIAÇÃO">AMPLIAÇÃO</option>
                  <option value="REFORMA">REFORMA</option>
                  <option value="QUADRA">QUADRA</option>
                  <option value="ACESSIBILIDADE">ACESSIBILIDADE</option>
                  <option value="CONSTRUÇÃO">CONSTRUÇÃO</option>
                  <option value="ENGENHEIRO PARA ELABORAÇÃO DE PROJETO">ENGENHEIRO PARA ELABORAÇÃO DE PROJETO</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Tipo de Atendimento *
                </label>
                <select
                  value={tipoAtendimento}
                  onChange={(e) => setTipoAtendimento(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 bg-white text-slate-800 font-bold"
                >
                  <option value="NORMAL">NORMAL</option>
                  <option value="EMERGENCIAL">EMERGENCIAL</option>
                  <option value="EMENDA">EMENDA</option>
                  <option value="SOE">SOE</option>
                  <option value="PDDE">PDDE</option>
                </select>
              </div>

              {tipoAtendimento === 'EMENDA' && (
                <div className="sm:col-span-2 grid grid-cols-2 gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100 animate-in slide-in-from-top-2">
                  <div>
                    <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">
                      Número PAF *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: PAF-1234/2026"
                      value={numPaf}
                      onChange={(e) => setNumPaf(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-blue-200 bg-white rounded-md focus:outline-hidden text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">
                      Ano da Emenda *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 2026"
                      value={anoEmenda}
                      onChange={(e) => setAnoEmenda(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-blue-200 bg-white rounded-md focus:outline-hidden text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">
                      Qual é o Tipo de Emenda? *
                    </label>
                    <select
                      required
                      value={tipoEmenda}
                      onChange={(e) => setTipoEmenda(e.target.value as 'Impositiva' | 'Parceria Por Escolas Melhores' | 'Federal')}
                      className="w-full px-3 py-1.5 text-xs border border-blue-200 bg-white rounded-md focus:outline-hidden text-slate-800 font-bold cursor-pointer"
                    >
                      <option value="">Selecione...</option>
                      <option value="Impositiva">Impositiva</option>
                      <option value="Parceria Por Escolas Melhores">Parceria Por Escolas Melhores</option>
                      <option value="Federal">Federal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">
                      Nº de Indicação *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 1234/2026"
                      value={numeroIndicacaoEmenda}
                      onChange={(e) => setNumeroIndicacaoEmenda(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-blue-200 bg-white rounded-md focus:outline-hidden text-slate-800"
                    />
                  </div>
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Forma de Atendimento *
                </label>
                <select
                  value={formaAtendimento}
                  onChange={(e) => setFormaAtendimento(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 bg-white text-slate-800 font-bold"
                >
                  <option value="VIA CAIXA ESCOLAR">VIA CAIXA ESCOLAR</option>
                  <option value="SEM ÔNUS">SEM ÔNUS</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Descrição Folha de Rosto (Sinopse e Diagnóstico Emergencial) *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Descreva a folha de rosto do atendimento escolhendo focos de sinistro, intempéries ou risco"
                  value={descricaoFolhaRosto}
                  onChange={(e) => setDescricaoFolhaRosto(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
            </div>

            {/* SEÇÃO 4: Valores Planejados e Faturamento */}
            <div className="bg-slate-50/55 p-4 rounded-xl border border-slate-200/60 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3 border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                  4. Informações de Referência e Dotação Orçamentária SGO
                </h4>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Valor da Planilha *
                </label>
                <input
                  type="text"
                  required
                  placeholder="R$ 0,00"
                  value={valorPlanilha}
                  onChange={handleValorChange}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 text-slate-800 font-mono font-extrabold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Prazo Estimado da Obra *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min={1}
                    step={1}
                    placeholder="Ex: 6"
                    value={prazoEstimadoMeses}
                    onChange={(e) => setPrazoEstimadoMeses(e.target.value)}
                    className="w-full px-3 py-2 pr-14 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 text-slate-800 font-mono font-extrabold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">meses</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Alíquota ISS *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 5%"
                  value={iss}
                  onChange={(e) => setIss(e.target.value.replace(/-/g, ''))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 text-slate-800"
                />
              </div>

              {usaSaldoPafAnterior === 'Sim' && (
                <div className="sm:col-span-3">
                  {necessidadeAditivoCalc > 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-semibold flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        ⚠️ O saldo do PAF anterior ({valorSaldoPafAnterior || 'R$ 0,00'}) é insuficiente para cobrir o valor da planilha. Será necessário um aditivo estimado de{' '}
                        <strong>{necessidadeAditivoCalc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>.
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-semibold flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>✓ O saldo do PAF anterior é suficiente para cobrir o valor da planilha. Não será necessário aditivo.</span>
                    </div>
                  )}
                </div>
              )}

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Observações Gerais do Processo
                </label>
                <textarea
                  rows={2}
                  placeholder="Quaisquer dados extras que facilitem a triagem pelo analista técnico..."
                  value={observacoesFicha}
                  onChange={(e) => setObservacoesFicha(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
            </div>

            {/* Ações */}
            <div className="flex justify-end items-center pt-4 border-t border-slate-100">
              <button
                data-testid="atendimento-passo-seguinte"
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Prosseguir para Anexos</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 2: CHECKLIST E ANEXO DE LAUDOS E DOCUMENTOS */}
      {currentView === 'checklist' && !selectedAtendimentoForEdit && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-3xs max-w-4xl mx-auto w-full text-left animate-in fade-in duration-200">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2 font-sans">
              <UploadCloud className="w-5 h-5 text-blue-600" />
              Checklist Documental - Atendimento {nomeEscola || 'Nova Unidade'}
            </h2>
            <p className="text-xs text-slate-500 mt-1.5 font-sans leading-relaxed">
              Para formalizar o preenchimento, anexe os laudos, planilhas e projetos pertinentes. A aprovação final de liberação do atendimento exige que todos os documentos marcados como <strong className="text-red-500 uppercase text-[10px]">Obrigatório</strong> estejam anexados.
            </p>
          </div>

          {/* Stepper indicators */}
          <div className="flex items-center justify-center gap-4 py-3 mb-6 bg-slate-50 border border-slate-200/60 rounded-xl max-w-md mx-auto">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-extrabold flex items-center justify-center text-xs">✓</span>
              <span className="text-xs font-bold text-slate-500">Dados Gerais</span>
            </div>
            <div className="w-12 h-0.5 bg-emerald-200"></div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs">2</span>
              <span className="text-xs font-bold text-blue-700">Checklist & Anexos</span>
            </div>
          </div>

          {/* List of checklist documents inside step 2 (Categorized) */}
          <div className="space-y-6">
            
            {/* 1. DOCUMENTOS OBRIGATÓRIOS */}
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest font-mono flex items-center gap-1.5 border-b border-slate-150 pb-2 text-left">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                📌 Documentos Obrigatórios ({documentosChecklist.filter(d => d.obrigatorio).length})
              </h3>

              <div className="space-y-3">
                {documentosChecklist.filter(d => d.obrigatorio).map((doc) => {
                  const isUploaded = doc.fileName !== undefined;
                  const faltando = tentouFinalizar && !isUploaded;
                  return (
                    <div
                      key={doc.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isUploaded
                          ? 'border-emerald-200 bg-emerald-50/5'
                          : faltando
                            ? 'border-red-400 bg-red-50/40'
                            : 'border-slate-200 hover:border-slate-300 bg-white shadow-3xs'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="max-w-xl text-left">
                          <div className="flex items-center gap-2">
                            <h4 className="font-sans font-extrabold text-slate-800 text-sm">
                              {doc.nome}
                            </h4>
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-wide">Obrigatório</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 font-sans">
                            {doc.desc}
                          </p>

                          {/* File item if uploaded */}
                          {isUploaded && (
                            <div className="mt-2.5 flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-mono">
                              <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-slate-800 block truncate">{doc.fileName}</span>
                                <span className="text-[10px] text-slate-400">Tamanho: {doc.fileSize} | Anexado em: {doc.uploadedAt}</span>
                              </div>
                              
                              <button
                                type="button"
                                onClick={() => handleRemoverDocChecklist(doc.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition cursor-pointer"
                                title="Remover arquivo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Right side controls */}
                        <div className="flex justify-end items-center gap-2 shrink-0">
                          <input
                            type="file"
                            id={`file-input-checklist-${doc.id}`}
                            accept={extensoesAceitasParaDoc(doc.id).join(',')}
                            className="hidden"
                            onChange={(e) => handleRealUploadChecklist(doc.id, e)}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const fileInput = document.getElementById(`file-input-checklist-${doc.id}`);
                              if (fileInput) fileInput.click();
                            }}
                            className="px-3.5 py-1.5 border border-slate-220 text-slate-700 font-extrabold text-xs rounded-lg hover:bg-slate-50 shrink-0 transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
                          >
                            <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                            <span>{isUploaded ? 'Substituir' : 'Anexar'}</span>
                          </button>

                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. OUTROS DOCUMENTOS */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 pb-2 text-left">
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  🔧 Outros Documentos ({outrosDocumentosChecklist.length})
                </h3>

                {/* Form to add other custom documents */}
                <div className="flex items-center gap-2 max-w-sm w-full">
                  <input 
                    type="text"
                    placeholder="Adicione um laudo técnico extra se desejar..."
                    value={novoCustomDocNome}
                    onChange={(e) => setNovoCustomDocNome(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-250 rounded-lg text-xs flex-1 focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomDocStep2}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold rounded-lg inline-flex items-center gap-1 transition cursor-pointer shrink-0"
                  >
                    <Plus className="w-3 h-3 text-white" />
                    + Adicionar Campo
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {outrosDocumentosChecklist.length === 0 ? (
                  <div className="p-6 border border-dashed border-slate-250 rounded-xl bg-slate-50/50 text-center text-xs text-slate-400 font-sans">
                    Nenhum documento customizado complementar adicionado ao atendimento. Use o adicionador no topo da seção para criar campos sob demanda.
                  </div>
                ) : (
                  outrosDocumentosChecklist.map((doc) => {
                    const isUploaded = doc.fileName !== undefined;
                    const faltando = tentouFinalizar && !isUploaded;
                    return (
                      <div
                        key={doc.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isUploaded
                            ? 'border-emerald-200 bg-emerald-50/5'
                            : faltando
                              ? 'border-red-400 bg-red-50/40'
                              : 'border-slate-200 hover:border-slate-300 bg-white shadow-3xs'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="max-w-xl text-left">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-sans font-extrabold text-slate-800 text-sm">
                                {doc.nome}
                              </h4>
                              <span className="text-[10px] bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5 uppercase text-indigo-750 font-bold tracking-wider font-mono">Personalizado</span>
                              <span className="text-[10px] font-black text-red-500 uppercase tracking-wide">Obrigatório</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 font-sans">
                              {doc.desc}
                            </p>

                            {/* File item if uploaded */}
                            {isUploaded && (
                              <div className="mt-2.5 flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-mono">
                                <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="font-bold text-slate-800 block truncate">{doc.fileName}</span>
                                  <span className="text-[10px] text-slate-500 font-medium">Tamanho: {doc.fileSize} | Anexado em: {doc.uploadedAt}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right side controls */}
                          <div className="flex justify-end items-center gap-2 shrink-0">
                            <input
                              type="file"
                              id={`file-input-checklist-${doc.id}`}
                              accept={EXTENSOES_ANEXO_ACEITAS.join(',')}
                              className="hidden"
                              onChange={(e) => handleRealUploadCustomDocStep2(doc.id, e)}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const fileInput = document.getElementById(`file-input-checklist-${doc.id}`);
                                if (fileInput) fileInput.click();
                              }}
                              className="px-3.5 py-1.5 border border-slate-220 text-slate-700 font-extrabold text-xs rounded-lg hover:bg-slate-50 shrink-0 transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
                            >
                              <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                              <span>{isUploaded ? 'Substituir' : 'Anexar'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoverCustomDocStep2(doc.id)}
                              title="Excluir campo"
                              className="px-3 py-1.5 border border-red-200 text-red-600 bg-red-50/60 hover:bg-red-100 hover:text-red-700 hover:border-red-300 rounded-lg text-xs font-bold shrink-0 transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Excluir</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Stepper Actions block at the bottom */}
          <div className="pt-4 border-t border-slate-150 mt-6 space-y-3">
            {tentouFinalizar && [...documentosChecklist, ...outrosDocumentosChecklist].some(d => d.obrigatorio && !d.fileName) && (
              <div className="text-[11px] text-red-600 font-bold flex items-center justify-end gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Anexe todos os documentos obrigatórios destacados em vermelho para continuar.
              </div>
            )}
            <div className="flex justify-between items-center animate-none">
              <button
                data-testid="atendimento-passo-anterior"
                type="button"
                onClick={() => { setTentouFinalizar(false); setCurrentView('form'); }}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar aos Dados Gerais</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleFinalizarEGravar(true)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Salvar como Rascunho
                </button>

                <button
                  data-testid="atendimento-salvar"
                  type="button"
                  onClick={() => {
                    setTentouFinalizar(true);
                    const missingMandatory = [...documentosChecklist, ...outrosDocumentosChecklist].filter(d => d.obrigatorio && !d.fileName);
                    if (missingMandatory.length > 0) {
                      return;
                    }
                    handleFinalizarEGravar(false);
                  }}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-lg shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Finalizar e Registrar Atendimento</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TERCEIRO CASO (QUANDO SELEÇÃO DE EDIÇÃO ESTÁ ATIVA) */}
      {selectedAtendimentoForEdit && (() => {
        const sol = selectedAtendimentoForEdit;
        const isCorrecao = sol.etapaAtual === 'correcao';

        // Retorna true quando a seção foi validada pelo analista (campo bloqueado para edição)
        const vLocked = (secao: SecaoDadosGerais) => isCorrecao && getStatusSecao(sol, secao).status === 'validado';

        // Ao técnico corrigir um campo de seção NÃO_VALIDADA, a seção volta a PENDENTE (aguardando reanálise)
        const markEditado = (secao: SecaoDadosGerais) => isCorrecao ? tecnicoCorrigiuSecao(sol, secao) : {};

        const historicoCorrecoes = sol.historicoCorrecoes || [];
        const ultimaDevolucao = historicoCorrecoes.length > 0
          ? historicoCorrecoes[historicoCorrecoes.length - 1]
          : null;

        const docsRecusados = isCorrecao
          ? (sol.documentos || []).filter(d => d.status === 'recusado' && d.justificativa)
          : [];

        return (
        <div className={`rounded-xl border-2 p-6 shadow-3xs max-w-4xl mx-auto w-full text-left animate-in fade-in duration-200 ${isCorrecao ? 'bg-rose-50/30 border-rose-300' : 'bg-white border-dashed border-amber-300'}`}>
          <div className={`border-b pb-4 mb-6 flex items-center justify-between ${isCorrecao ? 'border-rose-200' : 'border-amber-200'}`}>
            <div>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md tracking-wider uppercase font-mono ${isCorrecao ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                {isCorrecao ? 'Correção Exigida pela DORE' : 'Modo de Edição / Continuação de Preenchimento'}
              </span>
              <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5 font-sans mt-1">
                {isCorrecao ? <AlertCircle className="w-5 h-5 text-rose-500" /> : <Sparkles className="w-5 h-5 text-amber-500" />}
                {isCorrecao ? `Correção do Processo: ${sol.id}` : `Configurar Processo Ativo: ${sol.id}`}
              </h2>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                {isCorrecao
                  ? 'Corrija apenas os itens apontados pelo analista. Campos validados estão bloqueados para edição.'
                  : 'Altere ou complemente as informações de checklist, valores, patrimônio e relatórios.'}
              </p>
            </div>
            <button
              onClick={() => setSelectedAtendimentoForEdit(null)}
              className="p-1 px-3 border border-slate-250 hover:bg-slate-50 text-slate-500 hover:text-slate-800 text-xs rounded-md shadow-3xs flex items-center gap-1 font-semibold cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Cancelar
            </button>
          </div>

          {/* Aviso de reprovação do Coordenador Regional */}
          {!isCorrecao && sol.statusAprovacaoRegional === 'reprovado' && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 space-y-1.5">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-red-800 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Reprovado pelo Coordenador Regional
              </h4>
              <p className="text-xs text-red-700">{sol.justificativaReprovacaoRegional || 'Nenhuma justificativa informada.'}</p>
              <p className="text-[10px] text-red-500">Corrija o necessário e clique em "Finalizar e Encaminhar para Aprovação Regional" para reenviar.</p>
            </div>
          )}

          {/* Painel histórico de devoluções */}
          {isCorrecao && historicoCorrecoes.length > 0 && (
            <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Parecer do Analista DORE — Histórico de Devoluções
              </h4>
              {historicoCorrecoes.map((round) => {
                const ordinal = round.contador === 1 ? '1ª' : round.contador === 2 ? '2ª' : round.contador === 3 ? '3ª' : `${round.contador}ª`;
                const isUltima = round.contador === historicoCorrecoes.length;
                return (
                  <div key={round.contador} className={`rounded-lg border p-3 space-y-2 ${isUltima ? 'border-rose-300 bg-white' : 'border-rose-200/60 bg-rose-50/40'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${isUltima ? 'bg-rose-600 text-white' : 'bg-rose-200 text-rose-800'}`}>
                        {ordinal} Devolução
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">{round.data}</span>
                      {isUltima && <span className="text-[9px] text-rose-600 font-bold">(atual — corrija estes itens)</span>}
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

          <form onSubmit={handleSaveEdit} className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3 font-bold text-xs text-slate-700 uppercase tracking-wider font-mono border-b border-slate-100 pb-1 flex items-center justify-between">
                <span>Informações Gerais da Solicitação</span>
                <span className="text-[10px] text-slate-400 font-mono lower">Criado em: {selectedAtendimentoForEdit.dataCriacao}</span>
              </div>

              {/* Comentários da última análise — todos os motivos de não validação dos Dados Gerais */}
              {isCorrecao && ultimaDevolucao && ultimaDevolucao.motivos.length > 0 && (
                <div className="sm:col-span-3 bg-rose-50 border border-rose-200 rounded-lg p-3 space-y-2">
                  <p className="text-[9px] font-black uppercase text-rose-700 tracking-wider flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Comentários do Analista — {ultimaDevolucao.contador === 1 ? '1ª' : ultimaDevolucao.contador === 2 ? '2ª' : ultimaDevolucao.contador === 3 ? '3ª' : `${ultimaDevolucao.contador}ª`} Devolução
                  </p>
                  {ultimaDevolucao.motivos.map((m, i) => (
                    <div key={i} className="flex items-start gap-2 text-[10px]">
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-200 text-rose-800">{m.label}</span>
                      <p className="text-rose-900 font-medium leading-relaxed">{m.motivo}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* CODESC / Escola / Município / SRE — seção identificacao_escolar */}
              {isCorrecao && vLocked('identificacao_escolar') && (
                <div className="sm:col-span-3 flex items-center gap-2 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 font-bold">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" /> Identificação Escolar validada pelo analista — campo bloqueado.
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Código CODESC</label>
                <select
                  disabled={vLocked('identificacao_escolar')}
                  value={sol.codesc || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const match = baseDadosFiltrados.find(item => item.codesc === val);
                    setSelectedAtendimentoForEdit({ ...sol, codesc: val, codigoEndereco: '', ...(match ? { nomeEscola: match.nome, municipio: match.municipio, sre: match.sre } : {}), ...markEditado('identificacao_escolar') });
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <option value="">Selecione o CODESC...</option>
                  {baseDadosFiltrados.map(item => (
                    <option key={item.codesc} value={item.codesc}>{item.codesc}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Escola Estadual</label>
                <select
                  disabled={vLocked('identificacao_escolar')}
                  value={sol.nomeEscola || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const match = baseDadosFiltrados.find(item => item.nome === val);
                    setSelectedAtendimentoForEdit({ ...sol, nomeEscola: val, codigoEndereco: '', ...(match ? { codesc: match.codesc, municipio: match.municipio, sre: match.sre } : {}), ...markEditado('identificacao_escolar') });
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <option value="">Selecione a escola...</option>
                  {baseDadosFiltrados.map(item => (
                    <option key={item.codesc} value={item.nome}>{item.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Município</label>
                <select
                  disabled={vLocked('identificacao_escolar')}
                  value={sol.municipio || ''}
                  onChange={(e) => setSelectedAtendimentoForEdit({ ...sol, municipio: e.target.value, ...markEditado('identificacao_escolar') })}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <option value="">Selecione o município...</option>
                  {[...new Set(baseDadosFiltrados.map(item => item.municipio))].sort().map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Superintendência SRE</label>
                <select
                  disabled={vLocked('identificacao_escolar')}
                  value={sol.sre || ''}
                  onChange={(e) => setSelectedAtendimentoForEdit({ ...sol, sre: e.target.value, ...markEditado('identificacao_escolar') })}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <option value="">Selecione a SRE...</option>
                  {[...new Set(baseDadosFiltrados.map(item => item.sre))].sort().map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Código do Endereço
                  {isCorrecao && vLocked('identificacao_escolar') && <span className="text-emerald-600 normal-case font-medium ml-1">(validado)</span>}
                </label>
                <select
                  disabled={vLocked('identificacao_escolar')}
                  value={sol.codigoEndereco || ''}
                  onChange={(e) => setSelectedAtendimentoForEdit({ ...sol, codigoEndereco: e.target.value, ...markEditado('identificacao_escolar') })}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 font-mono cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <option value="">Selecione o endereço...</option>
                  {enderecosEdit.map(e => (
                    <option key={`${e.codesc}-${e.codigoEndereco}`} value={e.codigoEndereco}>
                      {e.codigoEndereco} — {e.descricao}
                    </option>
                  ))}
                </select>
                <p className="text-[9px] text-slate-400 mt-0.5">Identifica unicamente cada edificação (principal ou anexo)</p>
              </div>

              {/* Prédio — seção classificacao_patrimonial */}
              {isCorrecao && vLocked('classificacao_patrimonial') && (
                <div className="flex items-center gap-2 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 font-bold">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" /> Prédio validado — bloqueado.
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Prédio Escola</label>
                <select
                  disabled={vLocked('classificacao_patrimonial')}
                  value={sol.predio || 'PRINCIPAL'}
                  onChange={(e) => setSelectedAtendimentoForEdit({ ...sol, predio: e.target.value, ...markEditado('classificacao_patrimonial') })}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <option value="PRINCIPAL">PRINCIPAL</option>
                  <option value="ANEXO">ANEXO</option>
                </select>
              </div>

              {/* Tipo Obra / Tipo Atendimento / Valor / ISS — seção detalhamento_tecnico */}
              {isCorrecao && vLocked('detalhamento_tecnico') && (
                <div className="sm:col-span-3 flex items-center gap-2 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 font-bold">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" /> Detalhamento Técnico validado — campos bloqueados.
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo de Obra</label>
                <select
                  disabled={vLocked('detalhamento_tecnico')}
                  value={sol.tipoObra || 'REFORMA'}
                  onChange={(e) => setSelectedAtendimentoForEdit({ ...sol, tipoObra: e.target.value, tipo: e.target.value, ...markEditado('detalhamento_tecnico') })}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <option value="AMPLIAÇÃO">AMPLIAÇÃO</option>
                  <option value="REFORMA">REFORMA</option>
                  <option value="QUADRA">QUADRA</option>
                  <option value="ACESSIBILIDADE">ACESSIBILIDADE</option>
                  <option value="CONSTRUÇÃO">CONSTRUÇÃO</option>
                  <option value="ENGENHEIRO PARA ELABORAÇÃO DE PROJETO">ENGENHEIRO PARA ELABORAÇÃO DE PROJETO</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo Atendimento</label>
                <select
                  disabled={vLocked('detalhamento_tecnico')}
                  value={sol.tipoAtendimento || 'NORMAL'}
                  onChange={(e) => setSelectedAtendimentoForEdit({ ...sol, tipoAtendimento: e.target.value, ...markEditado('detalhamento_tecnico') })}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <option value="NORMAL">NORMAL</option>
                  <option value="EMERGENCIAL">EMERGENCIAL</option>
                  <option value="EMENDA">EMENDA</option>
                  <option value="SOE">SOE</option>
                  <option value="PDDE">PDDE</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Valor Estimado (R$)</label>
                <input
                  type="number"
                  disabled={vLocked('detalhamento_tecnico')}
                  value={sol.valorPlanilha || 0}
                  onChange={(e) => setSelectedAtendimentoForEdit({ ...sol, valorPlanilha: parseFloat(e.target.value) || 0, ...markEditado('detalhamento_tecnico') })}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 font-mono font-bold disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                />
              </div>

              {/* ISS — seção referencia_dotacao */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Alíquota ISS {isCorrecao && vLocked('referencia_dotacao') && <span className="text-emerald-600 normal-case font-medium ml-1">(validado)</span>}
                </label>
                <input
                  type="text"
                  disabled={vLocked('referencia_dotacao')}
                  value={sol.iss || '5%'}
                  onChange={(e) => setSelectedAtendimentoForEdit({ ...sol, iss: e.target.value, ...markEditado('referencia_dotacao') })}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                />
              </div>

              {/* Tombamento — seção classificacao_patrimonial */}
              {isCorrecao && vLocked('classificacao_patrimonial') && (
                <div className="flex items-center gap-2 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 font-bold">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" /> Tombamento validado — bloqueado.
                </div>
              )}
               <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tombamento</label>
                <select
                  disabled={vLocked('classificacao_patrimonial')}
                  value={sol.tombado || 'NÃO É TOMBADO'}
                  onChange={(e) => {
                    const nextTombado = e.target.value;
                    const nextOrgao = nextTombado === 'NÃO É TOMBADO' ? '' : (sol.orgaoTombador || 'MUNICIPAL');
                    setSelectedAtendimentoForEdit({ ...sol, tombado: nextTombado, orgaoTombador: nextOrgao, ...markEditado('classificacao_patrimonial') });
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 font-medium"
                >
                  <option value="NÃO É TOMBADO">NÃO É TOMBADO</option>
                  <option value="TOMBADO PARCIALMENTE">TOMBADO PARCIALMENTE</option>
                  <option value="TOMBADO TOTALMENTE">TOMBADO TOTALMENTE</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Órgão Tombador
                </label>
                <select
                  disabled={vLocked('classificacao_patrimonial') || (sol.tombado || 'NÃO É TOMBADO') === 'NÃO É TOMBADO'}
                  value={sol.orgaoTombador || ''}
                  onChange={(e) => setSelectedAtendimentoForEdit({ ...sol, orgaoTombador: e.target.value, ...markEditado('classificacao_patrimonial') })}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 font-medium disabled:bg-slate-50 disabled:text-slate-400"
                >
                  {(sol.tombado || 'NÃO É TOMBADO') === 'NÃO É TOMBADO' && <option value="">NÃO APLICÁVEL</option>}
                  <option value="MUNICIPAL">MUNICIPAL</option>
                  <option value="ESTADUAL">ESTADUAL</option>
                  <option value="FEDERAL">FEDERAL</option>
                </select>
              </div>

              {/* Coabitado — seção classificacao_patrimonial */}
              {isCorrecao && vLocked('classificacao_patrimonial') && (
                <div className="flex items-center gap-2 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 font-bold">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" /> Coabitação validada — bloqueado.
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Imóvel Coabitado?</label>
                <select
                  disabled={vLocked('classificacao_patrimonial')}
                  value={sol.coabitado || 'NÃO'}
                  onChange={(e) => {
                    const nextCoabitado = e.target.value;
                    const nextTipo = nextCoabitado === 'NÃO' ? '' : (sol.tipoCoabitado || 'Coabitado com outra escola Estadual');
                    setSelectedAtendimentoForEdit({ ...sol, coabitado: nextCoabitado, tipoCoabitado: nextTipo, ...markEditado('classificacao_patrimonial') });
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <option value="NÃO">NÃO</option>
                  <option value="SIM">SIM</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo de Coabitação</label>
                <select
                  disabled={vLocked('classificacao_patrimonial') || (sol.coabitado || 'NÃO') === 'NÃO'}
                  value={sol.tipoCoabitado || ''}
                  onChange={(e) => setSelectedAtendimentoForEdit({ ...sol, tipoCoabitado: e.target.value, ...markEditado('classificacao_patrimonial') })}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 font-medium disabled:bg-slate-50 disabled:text-slate-400"
                >
                  {(sol.coabitado || 'NÃO') === 'NÃO' && <option value="">NÃO APLICÁVEL</option>}
                  <option value="Coabitado com outra escola Estadual">Coabitado com outra escola Estadual</option>
                  <option value="Coabitado com outra escola municipal">Coabitado com outra escola municipal</option>
                  <option value="Coabitado com outro órgão estadual">Coabitado com outro órgão estadual</option>
                  <option value="Coabitado com outro órgão municipal">Coabitado com outro órgão municipal</option>
                  <option value="Coabitado com instituto federal">Coabitado com instituto federal</option>
                </select>
              </div>

              {/* Classificação da Demanda — modo edição inline */}
              <div className="sm:col-span-3 space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1.5">Origem da Demanda</p>
                <select disabled={vLocked('detalhamento_tecnico')} value={sol.origemDemanda || ''}
                  onChange={(e) => setSelectedAtendimentoForEdit({ ...sol, origemDemanda: e.target.value, ...markEditado('detalhamento_tecnico') })}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 font-medium cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed">
                  <option value="">Selecione a origem...</option>
                  {['Solicitação da Escola', 'Solicitação da SRE', 'Programa Governamental', 'Fiscalização', 'Notificação', 'Determinação Judicial', 'Atendimento Político'].map(op => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
                {sol.origemDemanda === 'Notificação' && (
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-amber-200 bg-amber-50/50 rounded-lg p-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Órgão Emissor</label>
                      <select disabled={vLocked('detalhamento_tecnico')} value={sol.orgaoEmissorNotificacao || ''} onChange={(e) => setSelectedAtendimentoForEdit({ ...sol, orgaoEmissorNotificacao: e.target.value, ...markEditado('detalhamento_tecnico') })}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white disabled:bg-slate-100 disabled:cursor-not-allowed">
                        <option value="">Selecione...</option>
                        {['Ministério Público', 'Defesa Civil', 'Corpo de Bombeiros', 'Prefeitura', 'TCE', 'CGE', 'Vigilância Sanitária', 'Outro'].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Grau de Prioridade</label>
                      <select disabled={vLocked('detalhamento_tecnico')} value={sol.grauPrioridade || ''} onChange={(e) => setSelectedAtendimentoForEdit({ ...sol, grauPrioridade: e.target.value as any, ...markEditado('detalhamento_tecnico') })}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white disabled:bg-slate-100 disabled:cursor-not-allowed">
                        <option value="">Selecione...</option>
                        {['Crítico', 'Alto', 'Médio', 'Baixo'].map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Número da Notificação</label>
                      <input type="text" disabled={vLocked('detalhamento_tecnico')} value={sol.numeroNotificacao || ''} onChange={(e) => setSelectedAtendimentoForEdit({ ...sol, numeroNotificacao: e.target.value, ...markEditado('detalhamento_tecnico') })}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white disabled:bg-slate-100 disabled:cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Data da Notificação</label>
                      <input type="date" disabled={vLocked('detalhamento_tecnico')} value={sol.dataNotificacao || ''} onChange={(e) => setSelectedAtendimentoForEdit({ ...sol, dataNotificacao: e.target.value, ...markEditado('detalhamento_tecnico') })}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white disabled:bg-slate-100 disabled:cursor-not-allowed" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Prazo para Atendimento</label>
                      <input type="date" disabled={vLocked('detalhamento_tecnico')} value={sol.prazoAtendimentoNotificacao || ''} onChange={(e) => setSelectedAtendimentoForEdit({ ...sol, prazoAtendimentoNotificacao: e.target.value, ...markEditado('detalhamento_tecnico') })}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white disabled:bg-slate-100 disabled:cursor-not-allowed" />
                    </div>
                  </div>
                )}
              </div>


              {/* Descrição folha de rosto — parte da seção detalhamento_tecnico */}
              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Descrição Folha de Rosto *
                  {isCorrecao && vLocked('detalhamento_tecnico') && <span className="text-emerald-600 normal-case font-medium ml-1">(validada)</span>}
                </label>
                <textarea
                  rows={2}
                  required
                  disabled={vLocked('detalhamento_tecnico')}
                  value={sol.descricaoFolhaRosto || ''}
                  onChange={(e) => setSelectedAtendimentoForEdit({ ...sol, descricaoFolhaRosto: e.target.value.toUpperCase(), ...markEditado('detalhamento_tecnico') })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Observações Gerais da Ficha
                </label>
                <textarea
                  rows={2}
                  value={sol.observacoesFicha || ''}
                  onChange={(e) => setSelectedAtendimentoForEdit({ ...sol, observacoesFicha: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-250 rounded bg-white text-slate-800"
                />
              </div>
            </div>

            {/* SEÇÃO EXTRA: CONTINUAR PREENCHENDO (Checklist Documental Ativo) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono border-b border-slate-100 pb-2 mb-3">
                Continuação da Instrução: Checklist de Documentos Exigidos
              </h4>
              <p className="text-[11px] text-slate-500 mb-3">
                Determine se os pareceres, projetos e planilhas exigidas estão pendentes e anexe os arquivos necessários para a validação técnica.
              </p>

              <div className="space-y-2.5">
                {sol.documentos.map((doc) => {
                  const faltando = tentouFinalizar && doc.obrigatorio && !doc.fileName;
                  return (
                  <div key={doc.id} className={`bg-white p-3 border rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs ${
                    faltando
                      ? 'border-red-400 bg-red-50/40'
                      : (isCorrecao && doc.status === 'recusado' && doc.justificativa ? 'border-rose-300' : 'border-slate-200')
                  }`}>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{doc.nome}</span>
                        {doc.obrigatorio ? (
                          <span className="text-[9px] font-bold uppercase py-0.5 px-1 bg-red-50 border border-red-100 text-red-700 rounded">Obrigatório</span>
                        ) : (
                          <span className="text-[9px] font-bold uppercase py-0.5 px-1 bg-slate-100 text-slate-500 rounded">Opcional</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal">{doc.desc}</p>
                      {doc.fileName && (
                        <p className="text-[10px] font-mono text-emerald-600 flex items-center gap-1 mt-1 font-bold">
                          <span>📎 {doc.fileName}</span>
                          <span className="text-slate-400 font-medium">({doc.fileSize} - Enviado em {doc.uploadedAt})</span>
                        </p>
                      )}
                      {isCorrecao && doc.status === 'recusado' && doc.justificativa && (
                        <div className="flex items-start gap-1.5 mt-1.5 bg-rose-50 border border-rose-200 rounded px-2 py-1.5">
                          <AlertCircle className="w-3 h-3 shrink-0 text-rose-500 mt-0.5" />
                          <p className="text-[10px] text-rose-800 font-medium leading-relaxed"><strong>Analista:</strong> {doc.justificativa}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {isCorrecao && doc.status === 'aprovado' ? (
                        <span
                          title="Documento já validado pelo analista — não pode ser substituído"
                          className="px-2 py-1 bg-slate-100 text-slate-400 border border-slate-200 rounded text-[11px] font-extrabold cursor-not-allowed flex items-center gap-1"
                        >
                          <Lock className="w-3 h-3" />
                          Substituir Documento
                        </span>
                      ) : (
                        <label className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-150 rounded text-[11px] font-extrabold hover:bg-blue-100 cursor-pointer transition-colors">
                          {doc.fileName ? 'Substituir Documento' : 'Anexar Documento'}
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadDocReal(doc.id, file);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

            {/* Ações */}
            {tentouFinalizar && sol.documentos.some(d => d.obrigatorio && !d.fileName) && (
              <div className="text-[11px] text-red-600 font-bold flex items-center justify-end gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Anexe todos os documentos obrigatórios destacados em vermelho para continuar.
              </div>
            )}
            <div className="flex justify-between items-center pt-4 border-t border-slate-200/60 mt-6 md:flex-row flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setTentouFinalizar(false);
                  setSelectedAtendimentoForEdit(null);
                  if (onLimparEdicaoDirect) onLimparEdicaoDirect();
                }}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar à Lista Visual</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!sol) return;
                    const updated = {
                      ...sol,
                      etapaAtual: isCorrecao ? 'correcao' as const : 'cadastro' as const,
                      statusAprovacaoRegional: isCorrecao ? sol.statusAprovacaoRegional : undefined,
                      justificativaReprovacaoRegional: isCorrecao ? sol.justificativaReprovacaoRegional : undefined
                    };
                    onUpdateSolicitacao(updated);
                    setSelectedAtendimentoForEdit(null);
                    if (onLimparEdicaoDirect) onLimparEdicaoDirect();
                    alert('Alterações salvas com sucesso!');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-755 hover:text-slate-900 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Salvar como Rascunho
                </button>

                <button
                  data-testid="atendimento-editar-enviar"
                  type="button"
                  onClick={() => {
                    if (!sol) return;
                    setTentouFinalizar(true);
                    const missingMandatory = sol.documentos.filter(d => d.obrigatorio && !d.fileName);
                    if (missingMandatory.length > 0) {
                      return;
                    }

                    // Reenvio pós-correção da DORE (isCorrecao) vai direto para 'analise', como já era.
                    // Primeira submissão (ou reenvio após reprovação do coordenador) fica em 'cadastro'
                    // aguardando aprovação do coordenador regional antes de seguir para a DORE.
                    const updated = isCorrecao
                      ? {
                          ...sol,
                          etapaAtual: 'analise' as const,
                          analistaAtribuido: sol.analistaAtribuido,
                          // Recaptura o snapshot com os valores já corrigidos pelo técnico —
                          // se não recapturar aqui, o diff de 'editado' continuaria comparando
                          // contra a submissão original (pré-correção), gerando falsos positivos
                          valoresOriginaisTecnico: capturarSnapshotTecnico(sol),
                          historicoEtapas: [
                            ...sol.historicoEtapas,
                            {
                              etapa: 'analise' as const,
                              data: new Date().toISOString().split('T')[0],
                              responsavel: sol.responsavel || 'Téc. de Infraestrutura'
                            }
                          ]
                        }
                      : {
                          ...sol,
                          etapaAtual: 'cadastro' as const,
                          statusAprovacaoRegional: 'pendente' as const,
                          justificativaReprovacaoRegional: undefined,
                          historicoEtapas: [
                            ...sol.historicoEtapas,
                            {
                              etapa: 'cadastro' as const,
                              data: new Date().toISOString().split('T')[0],
                              responsavel: `${sol.responsavel || 'Téc. de Infraestrutura'} (enviado para aprovação do coordenador regional)`
                            }
                          ]
                        };
                    onUpdateSolicitacao(updated);
                    setSelectedAtendimentoForEdit(null);
                    setTentouFinalizar(false);
                    if (onLimparEdicaoDirect) onLimparEdicaoDirect();
                    setModalEnviadoTexto(isCorrecao
                      ? 'As correções foram enviadas para revalidação pela DORE com sucesso.'
                      : 'O atendimento foi encaminhado para aprovação do coordenador regional. Após aprovado, seguirá para a DORE.');
                    setMostrarModalEnviado(true);
                  }}
                  className={`px-5 py-2 font-extrabold text-xs rounded-lg shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer text-white ${isCorrecao ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{isCorrecao ? 'Enviar Correções para Revalidação DORE' : 'Finalizar e Encaminhar para Aprovação Regional'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
        );
      })()}

      {/* 3. TELA INTERMEDIÁRIA COMPLETA: LISTA VISUAL INTERCALÁVEL */}
      {currentView === 'intermediaria' && !selectedAtendimentoForEdit && (
        <div className="space-y-6 max-w-5xl mx-auto w-full animate-in fade-in duration-250">
          
          {/* Sucess hero widget */}
          {recentCreatedId && (
            <div className="bg-emerald-50 border border-emerald-250 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-3">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-emerald-500/10 rounded-full mt-0.5 shrink-0">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 font-sans">
                    Atendimento de Infraestrutura Criado com Sucesso!
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    O processo de código <strong className="font-mono text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded text-[11px]">{recentCreatedId}</strong> foi estabelecido de forma auto-persistida no banco de dados local.
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Você pode filtrá-lo na lista abaixo por escola ou código para complementar a sua ficha técnica, anexar os laudos exigidos e as fotos de sinistros.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const found = solicitacoes.find(s => s.id === recentCreatedId);
                    if (found) selectForEdit(found);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 text-white font-extrabold text-xs rounded-lg hover:bg-emerald-700 shadow-3xs cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Continuar Preenchendo Agora
                </button>

                <button
                  type="button"
                  onClick={resetToForm}
                  className="p-2 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 text-xs rounded-lg shadow-3xs flex items-center gap-1 font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Criar Outro
                </button>
              </div>
            </div>
          )}

          {/* Search, Filter & Quick actions dashboard header */}
          <div className="bg-white border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2 font-sans">
                <Layers className="w-5 h-5 text-blue-600" />
                Painel Visual de Atendimentos Criados
              </h2>
              <p className="text-xs text-slate-550 mt-1 leading-relaxed">
                Abaixo estão listados todos os atendimentos cadastrados. Filtre em tempo real, visualize seus fluxos contratuais e clique para editar ou continuar preenchendo a documentação e anexos técnicos.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={resetToForm}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Criar Atendimento
              </button>
            </div>
          </div>

          {/* Search bar widget */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-3 flex items-center pl-0.5 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar por escola, município, dotação, ID do processo ou analista..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-205 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/15 focus:outline-hidden text-slate-800 font-medium"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2.5 rounded-lg font-bold"
              >
                Limpar
              </button>
            )}
          </div>

          {/* THE HIGHLY POLISHED TABLE VIEW */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-3xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-slate-250 text-slate-500 font-extrabold uppercase tracking-wider text-[10px] h-[52px]">
                    <th className="py-3 px-4 font-sans text-left">OBRA ID</th>
                    <th className="py-2.5 px-4 font-sans text-left">ESCOLA / LOCALIZAÇÃO</th>
                    <th className="py-2.5 px-4 font-sans text-left">TIPO / DEMANDA</th>
                    <th className="py-2.5 px-4 font-sans text-left text-center">TIPO ATENDIMENTO</th>
                    <th className="py-2.5 px-4 font-sans text-left">DESCRIÇÃO</th>
                    <th className="py-2.5 px-4 font-sans text-left">VALOR PLANILHA</th>
                    <th className="py-2.5 px-4 font-sans text-left">DATA CRIAÇÃO</th>
                    <th className="py-2.5 px-4 font-sans text-left">RESPONSÁVEL (ENCAMINHOU)</th>
                    <th className="py-2.5 px-4 font-sans text-left">ANALISTA DESIGNADO</th>
                    <th className="py-2.5 px-4 font-sans text-center">CHECKLIST DOCS</th>
                    <th className="py-2.5 px-4 font-sans text-center">ETAPA ATUAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {atendimentosFiltrados.map((item) => {
                    const totalDocs = item.documentos ? item.documentos.length : 8;
                    const docsAprovados = item.documentos ? item.documentos.filter(d => d.status === 'aprovado').length : 0;
                    
                    const isRecent = item.id === recentCreatedId;

                    // Helpers for specific Image 1 visual matchers
                    const getTipoBadgeText = (sol: Solicitacao) => {
                      return (sol.tipoObra || sol.tipo || 'REFORMA').toUpperCase();
                    };

                    const getEtapaVisuals = (etapa: string, statusAprovacaoRegional?: string) => {
                      switch (etapa) {
                        case 'cadastro':
                          if (statusAprovacaoRegional === 'pendente') {
                            return {
                              label: 'Aguardando Aprovação Regional',
                              className: 'border border-orange-300 text-orange-700 bg-orange-50/20 text-[10px] font-bold uppercase tracking-wide rounded px-2.5 py-1 whitespace-nowrap'
                            };
                          }
                          if (statusAprovacaoRegional === 'reprovado') {
                            return {
                              label: 'Reprovado pelo Coordenador',
                              className: 'border border-red-300 text-red-700 bg-red-50/20 text-[10px] font-bold uppercase tracking-wide rounded px-2.5 py-1 whitespace-nowrap'
                            };
                          }
                          return {
                            label: 'Atendimento Inicial',
                            className: 'border border-amber-300 text-amber-700 bg-amber-50/20 text-[10px] font-bold uppercase tracking-wide rounded px-2.5 py-1 whitespace-nowrap'
                          };
                        case 'ordem_inicio':
                          return {
                            label: 'Ordem de Início',
                            className: 'border border-blue-300 text-blue-700 bg-blue-50/20 text-[10px] font-bold uppercase tracking-wide rounded px-2.5 py-1 whitespace-nowrap'
                          };
                        case 'analise':
                          return {
                            label: 'Análise de Engenharia',
                            className: 'border border-indigo-300 text-indigo-700 bg-indigo-50/20 text-[10px] font-bold uppercase tracking-wide rounded px-2.5 py-1 whitespace-nowrap'
                          };
                        default:
                          return {
                            label: etapa === 'paf_autorizacao' ? 'Autorização PAF' : etapa.toUpperCase().replace('_', ' '),
                            className: 'border border-slate-300 text-slate-700 bg-slate-50/20 text-[10px] font-bold uppercase tracking-wide rounded px-2.5 py-1 whitespace-nowrap'
                          };
                      };
                    };

                    const idParts = (item.id || '').split('-');
                    const etapaVisual = getEtapaVisuals(item.etapaAtual, item.statusAprovacaoRegional);

                    return (
                      <tr
                        key={item.id}
                        onClick={() => selectForEdit(item)}
                        className={`hover:bg-slate-50/80 transition-all group cursor-pointer ${
                          isRecent ? 'bg-emerald-50/10' : ''
                        }`}
                        title="Clique na linha para Editar / Preencher"
                      >
                        {/* 1. OBRA ID (Stacked format of Image 1) */}
                        <td className="py-4 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {idParts.length === 3 ? (
                            <div className="leading-tight font-extrabold text-[#334155] text-[11px] font-sans">
                              {idParts[0]}-<br />
                              {idParts[1]}-<br />
                              <span className="text-slate-900 font-black">{idParts[2]}</span>
                            </div>
                          ) : (
                            <span className="font-extrabold text-slate-900 text-[11px] font-sans">{item.id}</span>
                          )}
                        </td>

                        {/* 2. ESCOLA / LOCALIZAÇÃO */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-0.5 max-w-[280px]">
                            <span className="font-extrabold text-slate-900 text-[11px] uppercase block leading-snug">
                              {item.nomeEscola}
                            </span>
                            <div className="text-[9.5px] text-slate-400 font-semibold uppercase flex items-center gap-0.5">
                              <MapPin className="w-3 h-3 text-slate-350 shrink-0" />
                              <span>{(item.municipio || '').toUpperCase()} — {(item.sre || '').toUpperCase()}</span>
                            </div>
                            <div className="text-[9.5px] text-slate-400 font-semibold uppercase mt-0.5">
                              CODESC: <span className="font-extrabold text-slate-600 font-mono">{item.codesc || '1982'}</span> — Prédio: <span className="font-extrabold text-slate-600">{item.predio || 'PRINCIPAL'}</span>
                            </div>
                          </div>
                        </td>

                        {/* 3. TIPO / DEMANDA */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="border border-indigo-200 text-indigo-700 bg-indigo-50/25 px-3 py-1 rounded text-[9.5px] font-bold uppercase tracking-[0.05em]">
                            {getTipoBadgeText(item)}
                          </span>
                        </td>

                        {/* 4. TIPO ATENDIMENTO */}
                        <td className="py-4 px-3 whitespace-nowrap text-center">
                          <span className="border border-emerald-400 text-emerald-800 bg-emerald-50/20 px-3 py-1 rounded text-[9.5px] font-bold uppercase tracking-[0.05em]">
                            {(item.tipoAtendimento || 'NORMAL').toUpperCase()}
                          </span>
                        </td>

                        {/* 5. DESCRIÇÃO */}
                        <td className="py-4 px-4 max-w-[220px]">
                          <p className="text-slate-500 text-[10.5px] leading-snug font-medium line-clamp-2" title={item.descricaoFolhaRosto || item.tipo}>
                            {item.descricaoFolhaRosto || item.tipo || 'teste'}
                          </p>
                        </td>

                        {/* 6. VALOR PLANILHA */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="text-[11.5px] font-black text-slate-800 font-mono">
                            R$ {(item.valorPlanilha || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* 7. DATA CRIAÇÃO */}
                        <td className="py-4 px-4 whitespace-nowrap text-slate-400 font-mono text-[10.5px]">
                          {item.dataCriacao || '2026-05-27'}
                        </td>

                        {/* 8. RESPONSÁVEL (ENCAMINHOU) */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-slate-500 text-[10.5px] font-medium font-sans">
                            <span className="text-slate-350 font-bold tracking-tight">||</span>
                            <span>{item.responsavel || 'Téc. João Paulo (SRE)'}</span>
                          </div>
                        </td>

                        {/* 9. ANALISTA DESIGNADO */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {item.analistaAtribuido ? (
                            <span className="px-2.5 py-1 text-[9.5px] font-bold text-blue-700 bg-blue-50/20 border border-blue-200 rounded-md inline-flex items-center gap-1">
                              {item.analistaAtribuido}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1.5 text-[9.5px] font-bold text-amber-600 bg-amber-50/20 border border-amber-200 rounded-md inline-flex items-center gap-1.5 leading-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              Não Atribuído
                            </span>
                          )}
                        </td>

                        {/* 10. CHECKLIST DOCS */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-extrabold text-[11px] text-[#334155] leading-none mb-0.5">{docsAprovados} / {totalDocs}</span>
                            <span className="text-[9px] text-slate-400 font-semibold tracking-wide uppercase">Alocado</span>
                          </div>
                        </td>

                        {/* 11. ETAPA ATUAL */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span
                            className={etapaVisual.className}
                            title={item.statusAprovacaoRegional === 'reprovado' ? (item.justificativaReprovacaoRegional || 'Sem justificativa informada.') : undefined}
                          >
                            {etapaVisual.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {atendimentosFiltrados.length === 0 && (
                <div className="bg-slate-50 border-t border-slate-200 py-12 text-center text-slate-400">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <h5 className="font-bold text-slate-700 text-xs">Nenhum atendimento encontrado</h5>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                    Tente alterar seus parâmetros de filtro ou clique em "Criar Atendimento" para criar um novo registro.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de envio à DORE */}
      {mostrarModalEnviado && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-800 mb-1.5">Solicitação Encaminhada</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-5">{modalEnviadoTexto}</p>
            <button
              type="button"
              onClick={() => {
                setMostrarModalEnviado(false);
                if (modalEnviadoPorCriacao && onFinalizarCriacao) {
                  onFinalizarCriacao();
                } else {
                  setCurrentView('intermediaria');
                }
              }}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-lg shadow-md transition cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// ==========================================
// 2. PAINEL DE ATRIBUIÇÃO TÉCNICA
// ==========================================
interface AtribuicaoPanelProps {
  solicitacoes: Solicitacao[];
  onUpdateSolicitacao: (updated: Solicitacao) => void;
  usuariosSeguranca: { id: string; nome: string; perfil: string; depto?: string; equipeAnalise?: string }[];
  atribuicoes: { [solicitacaoId: string]: string };
  onAssign: (solId: string, usrId: string) => void;
  viewMode?: 'lista' | 'kanban_status' | 'kanban_analista';
  onMudarViewMode?: (mode: 'lista' | 'kanban_status' | 'kanban_analista') => void;
  perfilUsuario?: string;
  onNavToAnalise?: (sol: Solicitacao) => void;
  onNavToAnaliseContratual?: (sol: Solicitacao, tipo: 'aditivo' | 'ajuste', itemId: string) => void;
  somenteLeitura?: boolean;
}

export function AtribuicaoPanel({
  solicitacoes,
  onUpdateSolicitacao,
  usuariosSeguranca,
  atribuicoes,
  onAssign,
  viewMode,
  onMudarViewMode,
  perfilUsuario = 'analista_dore',
  onNavToAnalise,
  onNavToAnaliseContratual,
  somenteLeitura = false
}: AtribuicaoPanelProps) {
  const [feedbackMsg, setFeedbackMsg] = useState<{ [solId: string]: string }>({});

  // Estados dos Filtros
  const [filtroId, setFiltroId] = useState('');
  const [filtroCodesc, setFiltroCodesc] = useState('');
  const [filtroMunicipio, setFiltroMunicipio] = useState('todos');
  const [filtroSre, setFiltroSre] = useState('todos');
  const [filtroEscola, setFiltroEscola] = useState('');
  const [filtroResponsavel, setFiltroResponsavel] = useState('todos');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroAtribuicao, setFiltroAtribuicao] = useState<'todos' | 'minhas'>('todos');
  // Classificação da fila: Atendimento Inicial (análise/correção) ou, para obras já em Execução,
  // qual pendência trouxe o processo de volta à fila (Aditivo, Ajuste ou Saldo Complementar).
  const [filtroClassificacao, setFiltroClassificacao] = useState<'todos' | 'atendimento_inicial' | 'aditivo' | 'ajuste' | 'reequilibrio' | 'saldo'>('todos');

  // Validação de processos é atribuível a analistas do órgão central, além de admin/diretor_dore
  // (que também podem validar qualquer solicitação) — técnicos regionais da SRE não entram nessa lista
  const analistasSgo = usuariosSeguranca.filter(
    u => u.perfil === 'analista_dore' || u.perfil === 'admin' || u.perfil === 'diretor_dore'
  );
  // Atendimento Inicial (Análise Técnica) só pode ser atribuído a analistas da equipe Planejamento;
  // Ajuste/Reequilíbrio/Saldo Complementar só à equipe Ajuste. admin/diretor_dore continuam com
  // acesso irrestrito (override), como em todo o resto do sistema. Ver [[equipes-analista-auxiliares]].
  const analistasPlanejamento = analistasSgo.filter(
    u => u.perfil === 'admin' || u.perfil === 'diretor_dore' || u.equipeAnalise === 'Planejamento'
  );
  const analistasAjusteEquipe = analistasSgo.filter(
    u => u.perfil === 'admin' || u.perfil === 'diretor_dore' || u.equipeAnalise === 'Ajuste'
  );

  // Um analista só pode se autoatribuir um processo — não pode trocar a atribuição para outro analista
  const isAnalista = perfilUsuario === 'analista_dore';
  const meuNomeAnalista = isAnalista ? (usuariosSeguranca.find(u => u.perfil === perfilUsuario)?.nome || '') : '';

  // Valores Únicos para os selects
  const idsUnicos = Array.from(new Set(solicitacoes.map(s => s.id).filter(Boolean))).sort();
  const codescsUnicos = Array.from(new Set(solicitacoes.map(s => s.codesc).filter(Boolean))).sort();
  const municipiosUnicos = Array.from(new Set(solicitacoes.map(s => s.municipio).filter(Boolean))).sort();
  const sresUnicas = Array.from(new Set(solicitacoes.map(s => s.sre).filter(Boolean))).sort();
  const escolasUnicas = Array.from(new Set(solicitacoes.map(s => s.nomeEscola).filter(Boolean))).sort();
  const responsaveisUnicos = Array.from(new Set(solicitacoes.map(s => s.responsavel).filter(Boolean))).sort();

  const filtrosAtivosCount =
    (filtroId ? 1 : 0) +
    (filtroEscola ? 1 : 0) +
    (filtroMunicipio !== 'todos' ? 1 : 0) +
    (filtroResponsavel !== 'todos' ? 1 : 0) +
    (filtroDataInicio ? 1 : 0) +
    (filtroDataFim ? 1 : 0) +
    (filtroCodesc ? 1 : 0) +
    (filtroSre !== 'todos' ? 1 : 0) +
    (filtroClassificacao !== 'todos' ? 1 : 0);

  const limparTodosFiltros = () => {
    setFiltroId('');
    setFiltroEscola('');
    setFiltroMunicipio('todos');
    setFiltroResponsavel('todos');
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setFiltroCodesc('');
    setFiltroSre('todos');
    setFiltroClassificacao('todos');
  };

  const solicitacoesFiltradas = solicitacoes.filter(sol => {
    // Fila Ativa: Aguardando Atribuição / Em Análise DORE (analise) + Em Correção pela SRE (correcao)
    // + obras em Execução com aditivo, ajuste de planilha ou saldo complementar pendente de análise da DORE.
    // Processos em etapas futuras (paf_autorizacao em diante) ou cancelados vivem na aba Histórico.
    const temAditivoPendente = (sol.aditivos || []).some(a => a.status === 'Pendente');
    const temAjustePendente = (sol.ajustes || []).some(a => a.status === 'analise_dore');
    const temReequilibrioPendente = (sol.reequilibrios || []).some(r => r.status === 'aguardando_analista' || r.status === 'em_analise');
    const temSaldoPendente = (sol.saldosComplementares || []).some(s => s.status === 'aguardando_analista' || s.status === 'em_analise');
    const emExecucaoComPendencia = sol.etapaAtual === 'execucao' && (temAditivoPendente || temAjustePendente || temReequilibrioPendente || temSaldoPendente);
    if (sol.etapaAtual !== 'analise' && sol.etapaAtual !== 'correcao' && !emExecucaoComPendencia) return false;

    // 9. Classificação: Atendimento Inicial (análise/correção) ou o tipo de pendência que trouxe
    // a obra em Execução de volta à fila (Aditivo, Ajuste, Reequilíbrio ou Saldo Complementar).
    if (filtroClassificacao !== 'todos') {
      const isAtendimentoInicial = sol.etapaAtual === 'analise' || sol.etapaAtual === 'correcao';
      if (filtroClassificacao === 'atendimento_inicial' && !isAtendimentoInicial) return false;
      if (filtroClassificacao === 'aditivo' && !temAditivoPendente) return false;
      if (filtroClassificacao === 'ajuste' && !temAjustePendente) return false;
      if (filtroClassificacao === 'reequilibrio' && !temReequilibrioPendente) return false;
      if (filtroClassificacao === 'saldo' && !temSaldoPendente) return false;
    }

    // 1. ID de Obra
    if (filtroId && sol.id !== filtroId) return false;

    // 2. CODESC
    if (filtroCodesc && sol.codesc !== filtroCodesc) return false;

    // 3. Municipio
    if (filtroMunicipio !== 'todos' && sol.municipio !== filtroMunicipio) return false;

    // 4. SRE
    if (filtroSre !== 'todos' && sol.sre !== filtroSre) return false;

    // 5. Escola
    if (filtroEscola && sol.nomeEscola !== filtroEscola) return false;

    // 6. Responsável
    if (filtroResponsavel !== 'todos' && sol.responsavel !== filtroResponsavel) return false;

    // 7. Data de criacao
    if (filtroDataInicio && sol.dataCriacao && sol.dataCriacao < filtroDataInicio) return false;
    if (filtroDataFim && sol.dataCriacao && sol.dataCriacao > filtroDataFim) return false;

    // 8. Atribuição focada
    if ((perfilUsuario === 'analista_dore' || (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore')) && filtroAtribuicao === 'minhas') {
      const myNome = usuariosSeguranca?.find((u: any) => u.perfil === perfilUsuario)?.nome || '';
      const isMyAssign = !!sol.analistaAtribuido && (myNome ? sol.analistaAtribuido === myNome : !!sol.analistaAtribuido);
      if (!isMyAssign) return false;
    }

    return true;
  }).sort(compararPorPrioridade);

  const handleAssignAnalyst = (sol: Solicitacao, usrId: string) => {
    // Save locally
    onAssign(sol.id, usrId);

    if (!usrId) {
      const updated: Solicitacao = {
        ...sol,
        analistaAtribuido: undefined,
        historicoEtapas: [
          ...sol.historicoEtapas,
          { 
            etapa: sol.etapaAtual, 
            data: new Date().toISOString().split('T')[0], 
            responsavel: `Gestor DORE (Atribuição Removida)` 
          }
        ]
      };
      
      onUpdateSolicitacao(updated);

      // Flash feedback
      setFeedbackMsg(prev => ({ ...prev, [sol.id]: 'Atribuição removida!' }));
      setTimeout(() => {
        setFeedbackMsg(prev => ({ ...prev, [sol.id]: '' }));
      }, 2000);
      return;
    }

    // Also update main global object
    const selectedUser = analistasSgo.find(u => u.id === usrId);
    if (selectedUser) {
      // Validação de capacidade IEE (Parte 4) — Admin/Gestor podem forçar acima da capacidade.
      const pontosObra = sol.ieePontos ?? calcularIEE(sol)?.pontos ?? 0;
      const pontosDisponiveis = getPontosIEEDisponiveis(selectedUser.nome, solicitacoes.filter(s => s.id !== sol.id));
      let forcada = false;
      if (pontosObra > pontosDisponiveis) {
        const podeForcar = (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore') || perfilUsuario === 'gestor_paf';
        const mensagem = `Analista sem capacidade disponível para esta obra (${pontosDisponiveis} pontos disponíveis, obra requer ${pontosObra} pontos).`;
        if (!podeForcar) {
          alert(mensagem);
          return;
        }
        if (!window.confirm(`${mensagem}\n\nDeseja forçar a atribuição mesmo assim?`)) {
          return;
        }
        forcada = true;
      }

      const updated: Solicitacao = {
        ...sol,
        analistaAtribuido: selectedUser.nome,
        atribuicaoForcada: forcada,
        // Início do relógio do checkpoint "atribuição → início" — só na primeira atribuição.
        // Ver [[sla-atendimentos]].
        analiseSla: { ...sol.analiseSla, dataAtribuicao: sol.analiseSla?.dataAtribuicao ?? new Date().toISOString() },
        aditivos: (sol.aditivos || []).map(a =>
          a.status === 'Pendente' && !a.analistaAtribuido 
            ? { ...a, analistaAtribuido: selectedUser.nome } 
            : a
        ),
        ajustes: (sol.ajustes || []).map(a => 
          a.status === 'analise_dore' && !a.analistaAtribuido 
            ? { ...a, analistaAtribuido: selectedUser.nome } 
            : a
        ),
        historicoEtapas: [
          ...sol.historicoEtapas,
          { 
            etapa: sol.etapaAtual, 
            data: new Date().toISOString().split('T')[0], 
            responsavel: `Gestor DORE (Analista ${selectedUser.nome} Atribuído)` 
          }
        ]
      };
      
      onUpdateSolicitacao(updated);

      // Flash feedback
      setFeedbackMsg(prev => ({ ...prev, [sol.id]: 'Atribuído com sucesso!' }));
      setTimeout(() => {
        setFeedbackMsg(prev => ({ ...prev, [sol.id]: '' }));
      }, 2000);
    }
  };

  // Atribui (ou remove) o analista de um aditivo/ajuste/reequilíbrio/saldo complementar específico —
  // independente do analista da solicitação principal, usado nas linhas de obras em Execução com pendência.
  const handleAssignAnalystItem = async (sol: Solicitacao, tipo: 'aditivo' | 'ajuste' | 'reequilibrio' | 'saldo', itemId: string, usrId: string) => {
    const selectedUser = usrId ? analistasSgo.find(u => u.id === usrId) : undefined;
    const nomeAnalista = selectedUser?.nome;
    const feedbackKey = `${sol.id}_${tipo}_${itemId}`;
    const tipoLabel = tipo === 'aditivo' ? 'Aditivo' : tipo === 'ajuste' ? 'Ajuste' : tipo === 'reequilibrio' ? 'Reequilíbrio' : 'Saldo Complementar';

    // Ajuste/Reequilíbrio/Saldo (não Aditivo, que fica fora do escopo de SLA por ora) — grava o
    // analista e, na primeira atribuição, o início do relógio de SLA deste checkpoint no banco.
    // Ver [[sla-atendimentos]].
    if (tipo === 'ajuste' || tipo === 'reequilibrio' || tipo === 'saldo') {
      const itemAtual = tipo === 'ajuste'
        ? (sol.ajustes || []).find(a => a.id === itemId)
        : tipo === 'reequilibrio'
          ? (sol.reequilibrios || []).find(r => r.id === itemId)
          : (sol.saldosComplementares || []).find(s => s.id === itemId);
      const payload: Record<string, unknown> = {
        analista_nome: nomeAnalista ?? null,
        ...(tipo !== 'saldo' ? { analista_id: usrId || null } : {}),
      };
      if (nomeAnalista && !itemAtual?.dataAtribuicao) {
        payload.data_atribuicao = new Date().toISOString();
      }
      const { error } = await supabase.from(TABELA_POR_TIPO_PENDENCIA[tipo]).update(payload).eq('id', itemId);
      if (error) {
        console.error('Erro ao gravar atribuição de analista no Supabase:', error);
        alert('Erro ao gravar a atribuição no banco de dados. Tente novamente.');
        return;
      }
    }

    const dataAtribuicaoNova = new Date().toISOString();
    const updated: Solicitacao = {
      ...sol,
      aditivos: tipo === 'aditivo'
        ? (sol.aditivos || []).map(a => a.id === itemId ? { ...a, analistaAtribuido: nomeAnalista } : a)
        : sol.aditivos,
      ajustes: tipo === 'ajuste'
        ? (sol.ajustes || []).map(a => a.id === itemId ? { ...a, analistaAtribuido: nomeAnalista, dataAtribuicao: nomeAnalista ? (a.dataAtribuicao ?? dataAtribuicaoNova) : a.dataAtribuicao } : a)
        : sol.ajustes,
      reequilibrios: tipo === 'reequilibrio'
        ? (sol.reequilibrios || []).map(r => r.id === itemId ? { ...r, analistaAtribuido: nomeAnalista, dataAtribuicao: nomeAnalista ? (r.dataAtribuicao ?? dataAtribuicaoNova) : r.dataAtribuicao } : r)
        : sol.reequilibrios,
      saldosComplementares: tipo === 'saldo'
        ? (sol.saldosComplementares || []).map(s => s.id === itemId ? { ...s, analistaAtribuido: nomeAnalista, dataAtribuicao: nomeAnalista ? (s.dataAtribuicao ?? dataAtribuicaoNova) : s.dataAtribuicao } : s)
        : sol.saldosComplementares,
      historicoEtapas: [
        ...sol.historicoEtapas,
        {
          etapa: sol.etapaAtual,
          data: new Date().toISOString().split('T')[0],
          responsavel: nomeAnalista
            ? `Gestor DORE (Analista ${nomeAnalista} Atribuído ao ${tipoLabel} ${itemId})`
            : `Gestor DORE (Atribuição Removida do ${tipoLabel} ${itemId})`
        }
      ]
    };

    onUpdateSolicitacao(updated);

    setFeedbackMsg(prev => ({ ...prev, [feedbackKey]: nomeAnalista ? 'Atribuído com sucesso!' : 'Atribuição removida!' }));
    setTimeout(() => {
      setFeedbackMsg(prev => ({ ...prev, [feedbackKey]: '' }));
    }, 2000);
  };

  // Candidatos a auxiliar: qualquer analista das equipes Elétrica/Arquitetura/PSCIP.
  const candidatosAuxiliares = usuariosSeguranca.filter(
    u => u.perfil === 'analista_dore' && (u.equipeAnalise === 'Eletrica' || u.equipeAnalise === 'Arquitetura' || u.equipeAnalise === 'PSCIP')
  );

  // Anexa um auxiliar de validação (Elétrica/Arquitetura/PSCIP) a um processo — ver [[equipes-analista-auxiliares]].
  const handleAdicionarAuxiliar = async (
    sol: Solicitacao,
    tipo: TipoItemAuxiliar,
    itemId: string | null,
    usuario: { id: string; nome: string; equipe: 'Eletrica' | 'Arquitetura' | 'PSCIP' }
  ) => {
    const { data: row, error } = await supabase
      .from('processo_auxiliares')
      .insert({
        solicitacao_id: sol._dbId ?? null,
        tipo_item: tipo,
        item_id: itemId,
        usuario_id: usuario.id,
        nome: usuario.nome,
        equipe: usuario.equipe,
      })
      .select('id')
      .single();

    if (error || !row) {
      console.error('Erro ao adicionar auxiliar no Supabase:', error);
      alert('Erro ao adicionar o auxiliar no banco de dados. Tente novamente.');
      return;
    }

    const novoAux: AuxiliarProcesso = { id: row.id, nome: usuario.nome, usuarioId: usuario.id, equipe: usuario.equipe };
    const anexar = (lista: AuxiliarProcesso[] | undefined) => [...(lista || []), novoAux];

    onUpdateSolicitacao({
      ...sol,
      auxiliares: tipo === 'analise' ? anexar(sol.auxiliares) : sol.auxiliares,
      ajustes: tipo === 'ajuste' ? (sol.ajustes || []).map(a => a.id === itemId ? { ...a, auxiliares: anexar(a.auxiliares) } : a) : sol.ajustes,
      reequilibrios: tipo === 'reequilibrio' ? (sol.reequilibrios || []).map(r => r.id === itemId ? { ...r, auxiliares: anexar(r.auxiliares) } : r) : sol.reequilibrios,
      saldosComplementares: tipo === 'saldo' ? (sol.saldosComplementares || []).map(s => s.id === itemId ? { ...s, auxiliares: anexar(s.auxiliares) } : s) : sol.saldosComplementares,
    });
  };

  const handleRemoverAuxiliar = async (
    sol: Solicitacao,
    tipo: TipoItemAuxiliar,
    itemId: string | null,
    auxiliarId: string
  ) => {
    const { error } = await supabase.from('processo_auxiliares').delete().eq('id', auxiliarId);
    if (error) {
      console.error('Erro ao remover auxiliar no Supabase:', error);
      alert('Erro ao remover o auxiliar no banco de dados. Tente novamente.');
      return;
    }

    const remover = (lista: AuxiliarProcesso[] | undefined) => (lista || []).filter(a => a.id !== auxiliarId);

    onUpdateSolicitacao({
      ...sol,
      auxiliares: tipo === 'analise' ? remover(sol.auxiliares) : sol.auxiliares,
      ajustes: tipo === 'ajuste' ? (sol.ajustes || []).map(a => a.id === itemId ? { ...a, auxiliares: remover(a.auxiliares) } : a) : sol.ajustes,
      reequilibrios: tipo === 'reequilibrio' ? (sol.reequilibrios || []).map(r => r.id === itemId ? { ...r, auxiliares: remover(r.auxiliares) } : r) : sol.reequilibrios,
      saldosComplementares: tipo === 'saldo' ? (sol.saldosComplementares || []).map(s => s.id === itemId ? { ...s, auxiliares: remover(s.auxiliares) } : s) : sol.saldosComplementares,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-3xs text-left animate-in fade-in duration-200">
      <div className="border-b border-slate-100 pb-4 mb-5">
        <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2 font-sans">
          <Users className="w-5 h-5 text-blue-600" />
          Validação Técnica
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-sans">
          Distribua as demandas por analistas técnicos, fiscais de campo ou engenheiros DORE credenciados para vistorias físicas e pareceres normativos de engenharia.
        </p>
      </div>

      {/* SEÇÃO DOS FILTROS DE PESQUISA */}
      <div className="bg-[#f8fafc] rounded-xl border border-slate-200 overflow-hidden mb-6">
        {/* Barra de Filtros / Título */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-sans font-bold text-sm">Filtros de Pesquisa</span>
            {filtrosAtivosCount > 0 && (
              <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {filtrosAtivosCount}
              </span>
            )}
          </div>

          {viewMode && onMudarViewMode && (
            <div className="shrink-0 flex items-center gap-2.5">
              <div className="text-right hidden sm:flex flex-col items-end">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">Tipo de Exibição</span>
                <span className="text-[9.5px] text-slate-500 font-bold leading-none mt-0.5">Mudar o modo de visualizar os processos</span>
              </div>
              <select
                value={viewMode}
                onChange={(e) => onMudarViewMode(e.target.value as any)}
                className="px-3.5 py-2 text-xs border border-slate-200 bg-white rounded-lg text-slate-700 font-bold focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer shadow-3xs"
              >
                <option value="lista">📋 Lista de Atribuição</option>
                <option value="kanban_status">📊 Kanban por Status</option>
                <option value="kanban_analista">👥 Kanban por Analista</option>
              </select>
            </div>
          )}
        </div>

        {/* Grade de Filtros */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9 gap-3.5 bg-slate-50/50">
          {/* 1. ID de Obra */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ID de Obra</label>
            <select
              value={filtroId}
              onChange={(e) => setFiltroId(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg py-2 px-2.5 bg-white text-slate-700 font-bold cursor-pointer"
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
              className="w-full text-xs border border-slate-200 rounded-lg py-2 px-2.5 bg-white text-slate-700 font-bold cursor-pointer"
            >
              <option value="">Todos os CODESC</option>
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
              className="w-full text-xs border border-slate-200 rounded-lg py-2 px-2.5 bg-white text-slate-700 font-bold cursor-pointer"
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
              className="w-full text-xs border border-slate-200 rounded-lg py-2 px-2.5 bg-white text-slate-700 font-bold cursor-pointer"
            >
              <option value="todos">Todas as Regionais</option>
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
              className="w-full text-xs border border-slate-200 rounded-lg py-2 px-2.5 bg-white text-slate-700 font-bold cursor-pointer"
            >
              <option value="">Todas as Escolas</option>
              {escolasUnicas.map(esc => (
                <option key={esc} value={esc}>{esc}</option>
              ))}
            </select>
          </div>

          {/* 6. Classificação */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Classificação</label>
            <select
              value={filtroClassificacao}
              onChange={(e) => setFiltroClassificacao(e.target.value as typeof filtroClassificacao)}
              className="w-full text-xs border border-slate-200 rounded-lg py-2 px-2.5 bg-white text-slate-700 font-bold cursor-pointer"
            >
              <option value="todos">Todas as Classificações</option>
              <option value="atendimento_inicial">Atendimento Inicial</option>
              <option value="aditivo">Aditivo</option>
              <option value="ajuste">Ajuste</option>
              <option value="reequilibrio">Reequilíbrio</option>
              <option value="saldo">Saldo</option>
            </select>
          </div>

          {/* 7. Responsável */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Responsável</label>
            <select
              value={filtroResponsavel}
              onChange={(e) => setFiltroResponsavel(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg py-2 px-2.5 bg-white text-slate-700 font-bold cursor-pointer"
            >
              <option value="todos">Todos os Responsáveis</option>
              {responsaveisUnicos.map(resp => (
                <option key={resp} value={resp}>{resp}</option>
              ))}
            </select>
          </div>

          {/* 8. Data de Criação */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Data de Criação</label>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
                className="w-full text-[10px] border border-slate-200 rounded-lg py-1 px-1.5 bg-white text-slate-700 font-semibold cursor-pointer text-center"
                title="Data Inicial"
              />
              <span className="text-[10px] text-slate-400 font-bold px-0.5 shrink-0">à</span>
              <input
                type="date"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
                className="w-full text-[10px] border border-slate-200 rounded-lg py-1 px-1.5 bg-white text-slate-700 font-semibold cursor-pointer text-center"
                title="Data Final"
              />
            </div>
          </div>
        </div>

        {/* Rodapé dos Filtros se tiver algum ativo */}
        {filtrosAtivosCount > 0 && (
          <div className="col-span-1 flex flex-col sm:flex-row justify-between items-center gap-2 p-3 border-t border-slate-200 bg-[#f8fafc]">
            <span className="text-[11px] text-blue-700 font-sans font-semibold bg-blue-50 px-2 py-0.5 rounded-md">
              Mostrando {solicitacoesFiltradas.length} de {solicitacoes.length} atendimentos filtrados
            </span>
            <button
              type="button"
              onClick={limparTodosFiltros}
              className="px-3 py-1 text-xs font-bold text-red-600 bg-red-50 border border-red-250 rounded-md hover:bg-red-100 hover:text-red-700 transition flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 text-red-500" />
              <span>Limpar Filtros</span>
            </button>
          </div>
        )}
      </div>

      {/* VISÃO FOCADA POR ATRIBUIÇÃO DE ANALISTAS - MOVED AS REQUESTED */}
      <div className="bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-medium mb-6">
        <span className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-extrabold text-slate-700 font-sans text-xs uppercase tracking-wide">Visão focada por atribuição de analistas:</span>
        </span>
        {(perfilUsuario === 'analista_dore' || (perfilUsuario === 'admin' || perfilUsuario === 'diretor_dore')) && (
          <div className="flex bg-slate-200/50 p-0.5 rounded-lg border border-slate-250 select-none shrink-0">
            <button
              type="button"
              onClick={() => setFiltroAtribuicao('minhas')}
              className={`px-3 py-1.5 text-[11px] font-extrabold rounded-md transition-all cursor-pointer ${
                filtroAtribuicao === 'minhas'
                  ? 'bg-blue-600 text-white shadow-3xs'
                  : 'text-slate-605 hover:text-slate-900 bg-transparent font-bold'
              }`}
            >
              Minhas Demandas Designadas
            </button>
            <button
              type="button"
              onClick={() => setFiltroAtribuicao('todos')}
              className={`px-3 py-1.5 text-[11px] font-extrabold rounded-md transition-all cursor-pointer ${
                filtroAtribuicao === 'todos'
                  ? 'bg-blue-600 text-white shadow-3xs'
                  : 'text-slate-605 hover:text-slate-900 bg-transparent font-bold'
              }`}
            >
              Todas as Demandas
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse font-sans text-xs">
          <thead>
            <tr className="bg-[#f8fafc] border-b border-slate-250 text-slate-500 font-extrabold uppercase tracking-wider text-[10px] h-[52px]">
              <th className="py-3 px-4 font-sans text-left">OBRA ID</th>
              <th className="py-2.5 px-4 font-sans text-center">PRIORIDADE</th>
              <th className="py-2.5 px-4 font-sans text-center">CLASSE (IEE)</th>
              <th className="py-2.5 px-4 font-sans text-left">ESCOLA / LOCALIZAÇÃO</th>
              <th className="py-2.5 px-4 font-sans text-left">TIPO / DEMANDA</th>
              <th className="py-2.5 px-4 font-sans text-left text-center">TIPO ATENDIMENTO</th>
              <th className="py-2.5 px-4 font-sans text-left text-center">CLASSIFICAÇÃO</th>
              <th className="py-2.5 px-4 font-sans text-left">DESCRIÇÃO</th>
              <th className="py-2.5 px-4 font-sans text-left">VALOR PLANILHA</th>
              <th className="py-2.5 px-4 font-sans text-left">DATA CRIAÇÃO</th>
              <th className="py-2.5 px-4 font-sans text-left">RESPONSÁVEL (ENCAMINHOU)</th>
              <th className="py-2.5 px-4 font-sans text-left">ANALISTA DESIGNADO</th>
              <th className="py-2.5 px-4 font-sans text-center">SLA</th>
              <th className="py-2.5 px-4 font-sans text-center">CHECKLIST DOCS</th>
              <th className="py-2.5 px-4 font-sans text-center">ETAPA ATUAL</th>
              <th className="py-2.5 px-4 font-sans text-center">AÇÕES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {solicitacoesFiltradas.map(sol => {
              const currentAssignId = Object.keys(atribuicoes).find(k => k === sol.id)
                ? atribuicoes[sol.id]
                : analistasSgo.find(u => u.nome === sol.analistaAtribuido)?.id || '';

              // Obra em execução entra na Fila Ativa por ter aditivo/ajuste pendente de validação DORE —
              // "Abrir" deve levar direto ao item pendente na Validação Contratual, não à Validação Técnica
              // (que só lista etapaAtual === 'analise' e nunca mostraria essa obra).
              const primeiroAditivoPendente = (sol.aditivos || []).find(a => a.status === 'Pendente');
              const primeiroAjustePendente = (sol.ajustes || []).find(a => a.status === 'analise_dore');

              const totalDocs = sol.documentos ? sol.documentos.length : 8;
              const docsAprovados = sol.documentos ? sol.documentos.filter(d => d.status === 'aprovado').length : 0;
              
              const isRecent = false;

              const getTipoBadgeText = (s: Solicitacao) => {
                return (s.tipoObra || s.tipo || 'REFORMA').toUpperCase();
              };

              const getEtapaVisuals = (etapa: string) => {
                switch (etapa) {
                  case 'cadastro':
                    return {
                      label: 'Atendimento Inicial',
                      className: 'border border-amber-300 text-amber-700 bg-amber-50/20 text-[10px] font-bold uppercase tracking-wide rounded px-2.5 py-1 whitespace-nowrap'
                    };
                  case 'ordem_inicio':
                    return {
                      label: 'Ordem de Início',
                      className: 'border border-blue-300 text-blue-700 bg-blue-50/20 text-[10px] font-bold uppercase tracking-wide rounded px-2.5 py-1 whitespace-nowrap'
                    };
                  case 'analise':
                    return {
                      label: 'Análise de Engenharia',
                      className: 'border border-indigo-300 text-indigo-700 bg-indigo-50/20 text-[10px] font-bold uppercase tracking-wide rounded px-2.5 py-1 whitespace-nowrap'
                    };
                  case 'execucao':
                    return {
                      label: 'Em Execução',
                      className: 'border border-emerald-300 text-emerald-700 bg-emerald-50/20 text-[10px] font-bold uppercase tracking-wide rounded px-2.5 py-1 whitespace-nowrap'
                    };
                  default:
                    return {
                      label: etapa === 'paf_autorizacao' ? 'Autorização PAF' : etapa.toUpperCase().replace('_', ' '),
                      className: 'border border-slate-300 text-slate-700 bg-slate-50/20 text-[10px] font-bold uppercase tracking-wide rounded px-2.5 py-1 whitespace-nowrap'
                    };
                }
              };

              const idParts = (sol.id || '').split('-');
              const etapaVisual = getEtapaVisuals(sol.etapaAtual);
              const prioridadeScoreCalc = sol.prioridadeScore ?? calcularPrioridade(sol).score;
              const etiquetasCalc: CodigoEtiqueta[] = sol.etiquetasPrioridade as CodigoEtiqueta[] | undefined ?? calcularPrioridade(sol).etiquetas;
              const estrelasCalc = sol.estrelas ?? calcularEstrelas(sol);
              const ieeClasseCalc = sol.ieeClasse ?? calcularIEE(sol)?.classe;

              return (
                <tr
                  key={sol.id}
                  className={`hover:bg-blue-50/40 transition-all group ${
                    isRecent ? 'bg-emerald-50/10' : ''
                  }`}
                >
                  {/* 1. OBRA ID */}
                  <td className="py-4 px-4 font-mono text-slate-500 whitespace-nowrap">
                    {idParts.length === 3 ? (
                      <div className="leading-tight font-extrabold text-[#334155] text-[11px] font-sans">
                        {idParts[0]}-<br />
                        {idParts[1]}-<br />
                        <span className="text-slate-900 font-black">{idParts[2]}</span>
                      </div>
                    ) : (
                      <span className="font-extrabold text-slate-900 text-[11px] font-sans">{sol.id}</span>
                    )}
                  </td>

                  {/* PRIORIDADE */}
                  <td className="py-4 px-4 text-center whitespace-nowrap">
                    <div className="flex flex-col items-center gap-1">
                      {estrelasCalc > 0 && (
                        <div className="flex items-center gap-0.5" title={`${estrelasCalc} de 5 estrelas de prioridade`}>
                          {[1, 2, 3, 4, 5].map(n => (
                            <span key={n} className={`text-xs leading-none ${n <= estrelasCalc ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap justify-center gap-1 max-w-[160px]">
                        {etiquetasCalc.map(codigo => {
                          const info = getInfoEtiqueta(codigo, sol);
                          return (
                            <span key={codigo} className={`${info.corClassName} text-[9px] font-bold uppercase tracking-wide rounded px-2 py-1 inline-block`}>
                              {info.label}
                            </span>
                          );
                        })}
                      </div>
                      <span className="text-[8px] text-slate-300 font-mono tracking-wide">score: {prioridadeScoreCalc}</span>
                    </div>
                  </td>

                  {/* CLASSE (IEE) — complexidade da obra, lógica independente da prioridade */}
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

                  {/* 2. ESCOLA / LOCALIZAÇÃO */}
                  <td className="py-4 px-4">
                    <div className="flex flex-col gap-0.5 max-w-[280px]">
                      <span className="font-extrabold text-slate-900 text-[11px] uppercase block leading-snug">
                        {sol.nomeEscola}
                      </span>
                      {sol.solicitacaoCancelamento && (
                        <span className="self-start px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[8.5px] font-bold uppercase flex items-center gap-1" title={sol.motivoSolicitacaoCancelamento}>
                          ⚠ Cancelamento Solicitado
                        </span>
                      )}
                      <div className="text-[9.5px] text-slate-400 font-semibold uppercase flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 text-slate-350 shrink-0" />
                        <span>{(sol.municipio || '').toUpperCase()} — {(sol.sre || '').toUpperCase()}</span>
                      </div>
                      <div className="text-[9.5px] text-slate-400 font-semibold uppercase mt-0.5">
                        CODESC: <span className="font-extrabold text-slate-600 font-mono">{sol.codesc || '1982'}</span> — Prédio: <span className="font-extrabold text-slate-600">{sol.predio || 'PRINCIPAL'}</span>
                      </div>
                    </div>
                  </td>

                  {/* 3. TIPO / DEMANDA */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className="border border-indigo-200 text-indigo-700 bg-indigo-50/25 px-3 py-1 rounded text-[9.5px] font-bold uppercase tracking-[0.05em]">
                      {getTipoBadgeText(sol)}
                    </span>
                  </td>

                  {/* 4. TIPO ATENDIMENTO */}
                  <td className="py-4 px-3 whitespace-nowrap text-center">
                    <span className="border border-emerald-400 text-emerald-800 bg-emerald-50/20 px-3 py-1 rounded text-[9.5px] font-bold uppercase tracking-[0.05em]">
                      {(sol.tipoAtendimento || 'NORMAL').toUpperCase()}
                    </span>
                  </td>

                  {/* CLASSIFICAÇÃO */}
                  <td className="py-4 px-3 whitespace-nowrap text-center">
                    {(() => {
                      const hasAditivo = sol.aditivos && sol.aditivos.some(a => a.status === 'Pendente');
                      const hasAjuste = sol.ajustes && sol.ajustes.some(a => a.status === 'analise_dore');
                      const hasReequilibrio = sol.reequilibrios && sol.reequilibrios.some(r => r.status === 'aguardando_analista' || r.status === 'em_analise');
                      const hasSaldo = sol.saldosComplementares && sol.saldosComplementares.some(s => s.status === 'aguardando_analista' || s.status === 'em_analise');
                      if (hasAditivo || hasAjuste || hasReequilibrio || hasSaldo) {
                        return (
                          <div className="flex flex-col items-center gap-1">
                            {hasAditivo && (
                              <span className="border border-rose-300 text-rose-700 bg-rose-50/30 px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-[0.05em] whitespace-nowrap">
                                ⚠️ Aditivo pendente
                              </span>
                            )}
                            {hasAjuste && (
                              <span className="border border-violet-300 text-violet-700 bg-violet-50/30 px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-[0.05em] whitespace-nowrap">
                                ⚠️ Ajuste pendente
                              </span>
                            )}
                            {hasReequilibrio && (
                              <span className="border border-purple-300 text-purple-700 bg-purple-50/30 px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-[0.05em] whitespace-nowrap">
                                ⚠️ Reequilíbrio pendente
                              </span>
                            )}
                            {hasSaldo && (
                              <span className="border border-teal-300 text-teal-700 bg-teal-50/30 px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-[0.05em] whitespace-nowrap">
                                ⚠️ Saldo pendente
                              </span>
                            )}
                          </div>
                        );
                      }
                      return (
                        <span className="border border-blue-300 text-blue-700 bg-blue-50/30 px-3 py-1.5 rounded text-[9.5px] font-bold uppercase tracking-[0.05em]">
                          Atendimento Inicial
                        </span>
                      );
                    })()}
                  </td>

                  {/* 5. DESCRIÇÃO */}
                  <td className="py-4 px-4 max-w-[220px]">
                    <p className="text-slate-500 text-[10.5px] leading-snug font-medium line-clamp-2" title={sol.descricaoFolhaRosto || sol.tipo}>
                      {sol.descricaoFolhaRosto || sol.tipo || 'teste'}
                    </p>
                  </td>

                  {/* 6. VALOR PLANILHA */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className="text-[11.5px] font-black text-slate-800 font-mono">
                      R$ {(sol.valorPlanilha || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </td>

                  {/* 7. DATA CRIAÇÃO */}
                  <td className="py-4 px-4 whitespace-nowrap text-slate-400 font-mono text-[10.5px]">
                    {sol.dataCriacao || '2026-05-27'}
                  </td>

                  {/* 8. RESPONSÁVEL (ENCAMINHOU) */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-slate-500 text-[10.5px] font-medium font-sans">
                      <span className="text-slate-350 font-bold tracking-tight">||</span>
                      <span>{sol.responsavel || 'Téc. João Paulo (SRE)'}</span>
                    </div>
                  </td>

                  {/* 9. ANALISTA DESIGNADO */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="flex flex-col gap-2 max-w-[220px]">
                      {sol.etapaAtual === 'execucao' ? (
                        // Obra em Execução com pendência: cada aditivo/ajuste tem seu próprio analista,
                        // independente do analista da solicitação principal (que aqui nem se aplica).
                        <>
                          {(sol.aditivos || []).filter(a => a.status === 'Pendente').map(adt => {
                            const currentItemAssignId = analistasSgo.find(u => u.nome === adt.analistaAtribuido)?.id || '';
                            const atribuidoOutroAnalista = isAnalista && !!adt.analistaAtribuido && adt.analistaAtribuido !== meuNomeAnalista;
                            const opcoesAnalistas = isAnalista
                              ? analistasSgo.filter(usr => usr.nome === meuNomeAnalista)
                              : analistasSgo;
                            const feedbackKey = `${sol.id}_aditivo_${adt.id}`;
                            return (
                              <div key={adt.id} className="space-y-0.5">
                                <span className="text-[9px] font-bold text-rose-600 uppercase tracking-wide block">Aditivo Nº {adt.numeroAditivo || adt.id}</span>
                                <select
                                  value={currentItemAssignId}
                                  onChange={(e) => !somenteLeitura && !atribuidoOutroAnalista && handleAssignAnalystItem(sol, 'aditivo', adt.id, e.target.value)}
                                  disabled={somenteLeitura || atribuidoOutroAnalista}
                                  className={`text-xs px-3 py-2 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border font-extrabold transition-all duration-150 w-full ${(somenteLeitura || atribuidoOutroAnalista) ? 'cursor-default opacity-60' : 'cursor-pointer'} ${
                                    adt.analistaAtribuido ? 'border-blue-500 text-blue-700 shadow-3xs' : 'border-slate-300 text-slate-500 font-medium'
                                  }`}
                                >
                                  <option value="" className="text-slate-500 font-bold bg-white text-center py-2">-- Não Atribuído --</option>
                                  {opcoesAnalistas.map(usr => {
                                    const formattedLabel = usr.perfil === 'tecnico_infra' ? `${usr.nome} (Fiscal)` : `${usr.nome} (DORE)`;
                                    return (
                                      <option key={usr.id} value={usr.id} className="text-slate-800 bg-white font-bold py-2">
                                        {formattedLabel}
                                      </option>
                                    );
                                  })}
                                </select>
                                {feedbackMsg[feedbackKey] && (
                                  <span className="text-[9px] font-bold text-blue-600 block animate-pulse text-center">
                                    {feedbackMsg[feedbackKey]}
                                  </span>
                                )}
                              </div>
                            );
                          })}

                          {(sol.ajustes || []).filter(a => a.status === 'analise_dore').map(aju => {
                            const currentItemAssignId = analistasSgo.find(u => u.nome === aju.analistaAtribuido)?.id || '';
                            const atribuidoOutroAnalista = isAnalista && !!aju.analistaAtribuido && aju.analistaAtribuido !== meuNomeAnalista;
                            const opcoesAnalistas = isAnalista
                              ? analistasAjusteEquipe.filter(usr => usr.nome === meuNomeAnalista)
                              : analistasAjusteEquipe;
                            const feedbackKey = `${sol.id}_ajuste_${aju.id}`;
                            return (
                              <div key={aju.id} className="space-y-0.5">
                                <span className="text-[9px] font-bold text-violet-600 uppercase tracking-wide block">Ajuste Nº {aju.numero}</span>
                                <select
                                  value={currentItemAssignId}
                                  onChange={(e) => !somenteLeitura && !atribuidoOutroAnalista && handleAssignAnalystItem(sol, 'ajuste', aju.id, e.target.value)}
                                  disabled={somenteLeitura || atribuidoOutroAnalista}
                                  className={`text-xs px-3 py-2 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border font-extrabold transition-all duration-150 w-full ${(somenteLeitura || atribuidoOutroAnalista) ? 'cursor-default opacity-60' : 'cursor-pointer'} ${
                                    aju.analistaAtribuido ? 'border-blue-500 text-blue-700 shadow-3xs' : 'border-slate-300 text-slate-500 font-medium'
                                  }`}
                                >
                                  <option value="" className="text-slate-500 font-bold bg-white text-center py-2">-- Não Atribuído --</option>
                                  {opcoesAnalistas.map(usr => {
                                    const formattedLabel = usr.perfil === 'tecnico_infra' ? `${usr.nome} (Fiscal)` : `${usr.nome} (DORE)`;
                                    return (
                                      <option key={usr.id} value={usr.id} className="text-slate-800 bg-white font-bold py-2">
                                        {formattedLabel}
                                      </option>
                                    );
                                  })}
                                </select>
                                {feedbackMsg[feedbackKey] && (
                                  <span className="text-[9px] font-bold text-blue-600 block animate-pulse text-center">
                                    {feedbackMsg[feedbackKey]}
                                  </span>
                                )}
                                <AuxiliaresControl
                                  auxiliares={aju.auxiliares || []}
                                  candidatos={candidatosAuxiliares}
                                  somenteLeitura={somenteLeitura}
                                  onAdicionar={(usr) => handleAdicionarAuxiliar(sol, 'ajuste', aju.id, usr)}
                                  onRemover={(auxId) => handleRemoverAuxiliar(sol, 'ajuste', aju.id, auxId)}
                                />
                              </div>
                            );
                          })}

                          {(sol.reequilibrios || []).filter(r => r.status === 'aguardando_analista' || r.status === 'em_analise').map(req => {
                            const currentItemAssignId = analistasSgo.find(u => u.nome === req.analistaAtribuido)?.id || '';
                            const atribuidoOutroAnalista = isAnalista && !!req.analistaAtribuido && req.analistaAtribuido !== meuNomeAnalista;
                            const opcoesAnalistas = isAnalista
                              ? analistasAjusteEquipe.filter(usr => usr.nome === meuNomeAnalista)
                              : analistasAjusteEquipe;
                            const feedbackKey = `${sol.id}_reequilibrio_${req.id}`;
                            return (
                              <div key={req.id} className="space-y-0.5">
                                <span className="text-[9px] font-bold text-purple-600 uppercase tracking-wide block">Reequilíbrio {req.id}</span>
                                <select
                                  value={currentItemAssignId}
                                  onChange={(e) => !somenteLeitura && !atribuidoOutroAnalista && handleAssignAnalystItem(sol, 'reequilibrio', req.id, e.target.value)}
                                  disabled={somenteLeitura || atribuidoOutroAnalista}
                                  className={`text-xs px-3 py-2 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border font-extrabold transition-all duration-150 w-full ${(somenteLeitura || atribuidoOutroAnalista) ? 'cursor-default opacity-60' : 'cursor-pointer'} ${
                                    req.analistaAtribuido ? 'border-blue-500 text-blue-700 shadow-3xs' : 'border-slate-300 text-slate-500 font-medium'
                                  }`}
                                >
                                  <option value="" className="text-slate-500 font-bold bg-white text-center py-2">-- Não Atribuído --</option>
                                  {opcoesAnalistas.map(usr => {
                                    const formattedLabel = usr.perfil === 'tecnico_infra' ? `${usr.nome} (Fiscal)` : `${usr.nome} (DORE)`;
                                    return (
                                      <option key={usr.id} value={usr.id} className="text-slate-800 bg-white font-bold py-2">
                                        {formattedLabel}
                                      </option>
                                    );
                                  })}
                                </select>
                                {feedbackMsg[feedbackKey] && (
                                  <span className="text-[9px] font-bold text-blue-600 block animate-pulse text-center">
                                    {feedbackMsg[feedbackKey]}
                                  </span>
                                )}
                                <AuxiliaresControl
                                  auxiliares={req.auxiliares || []}
                                  candidatos={candidatosAuxiliares}
                                  somenteLeitura={somenteLeitura}
                                  onAdicionar={(usr) => handleAdicionarAuxiliar(sol, 'reequilibrio', req.id, usr)}
                                  onRemover={(auxId) => handleRemoverAuxiliar(sol, 'reequilibrio', req.id, auxId)}
                                />
                              </div>
                            );
                          })}

                          {(sol.saldosComplementares || []).filter(s => s.status === 'aguardando_analista' || s.status === 'em_analise').map(sal => {
                            const currentItemAssignId = analistasSgo.find(u => u.nome === sal.analistaAtribuido)?.id || '';
                            const atribuidoOutroAnalista = isAnalista && !!sal.analistaAtribuido && sal.analistaAtribuido !== meuNomeAnalista;
                            const opcoesAnalistas = isAnalista
                              ? analistasAjusteEquipe.filter(usr => usr.nome === meuNomeAnalista)
                              : analistasAjusteEquipe;
                            const feedbackKey = `${sol.id}_saldo_${sal.id}`;
                            return (
                              <div key={sal.id} className="space-y-0.5">
                                <span className="text-[9px] font-bold text-teal-600 uppercase tracking-wide block">Saldo Complementar {sal.id}</span>
                                <select
                                  value={currentItemAssignId}
                                  onChange={(e) => !somenteLeitura && !atribuidoOutroAnalista && handleAssignAnalystItem(sol, 'saldo', sal.id, e.target.value)}
                                  disabled={somenteLeitura || atribuidoOutroAnalista}
                                  className={`text-xs px-3 py-2 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border font-extrabold transition-all duration-150 w-full ${(somenteLeitura || atribuidoOutroAnalista) ? 'cursor-default opacity-60' : 'cursor-pointer'} ${
                                    sal.analistaAtribuido ? 'border-blue-500 text-blue-700 shadow-3xs' : 'border-slate-300 text-slate-500 font-medium'
                                  }`}
                                >
                                  <option value="" className="text-slate-500 font-bold bg-white text-center py-2">-- Não Atribuído --</option>
                                  {opcoesAnalistas.map(usr => {
                                    const formattedLabel = usr.perfil === 'tecnico_infra' ? `${usr.nome} (Fiscal)` : `${usr.nome} (DORE)`;
                                    return (
                                      <option key={usr.id} value={usr.id} className="text-slate-800 bg-white font-bold py-2">
                                        {formattedLabel}
                                      </option>
                                    );
                                  })}
                                </select>
                                {feedbackMsg[feedbackKey] && (
                                  <span className="text-[9px] font-bold text-blue-600 block animate-pulse text-center">
                                    {feedbackMsg[feedbackKey]}
                                  </span>
                                )}
                                <AuxiliaresControl
                                  auxiliares={sal.auxiliares || []}
                                  candidatos={candidatosAuxiliares}
                                  somenteLeitura={somenteLeitura}
                                  onAdicionar={(usr) => handleAdicionarAuxiliar(sol, 'saldo', sal.id, usr)}
                                  onRemover={(auxId) => handleRemoverAuxiliar(sol, 'saldo', sal.id, auxId)}
                                />
                              </div>
                            );
                          })}
                        </>
                      ) : (
                        <>
                          {(() => {
                            // Analista só pode se autoatribuir — não pode trocar a atribuição para outro analista nem mexer em processo já atribuído a colega
                            const atribuidoOutroAnalista = isAnalista && !!sol.analistaAtribuido && sol.analistaAtribuido !== meuNomeAnalista;
                            const opcoesAnalistas = isAnalista
                              ? analistasPlanejamento.filter(usr => usr.nome === meuNomeAnalista)
                              : analistasPlanejamento;
                            return (
                              <select
                                data-testid="atribuicao-selecionar-analista"
                                value={currentAssignId}
                                onChange={(e) => !somenteLeitura && !atribuidoOutroAnalista && handleAssignAnalyst(sol, e.target.value)}
                                disabled={somenteLeitura || atribuidoOutroAnalista}
                                className={`text-xs px-3 py-2 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border font-extrabold transition-all duration-150 w-full min-w-[210px] ${(somenteLeitura || atribuidoOutroAnalista) ? 'cursor-default opacity-60' : 'cursor-pointer'} ${
                                  sol.analistaAtribuido
                                    ? 'border-blue-500 text-blue-700 shadow-3xs'
                                    : 'border-slate-300 text-slate-500 font-medium'
                                }`}
                              >
                                <option value="" className="text-slate-500 font-bold bg-white text-center py-2">
                                  -- Não Atribuído --
                                </option>
                                {opcoesAnalistas.map(usr => {
                                  const formattedLabel = usr.perfil === 'tecnico_infra'
                                    ? `${usr.nome} (Fiscal)`
                                    : `${usr.nome} (DORE)`;
                                  return (
                                    <option key={usr.id} value={usr.id} className="text-slate-800 bg-white font-bold py-2">
                                      {formattedLabel}
                                    </option>
                                  );
                                })}
                              </select>
                            );
                          })()}

                          {feedbackMsg[sol.id] && (
                            <span className="text-[9px] font-bold text-blue-600 block animate-pulse text-center">
                              {feedbackMsg[sol.id]}
                            </span>
                          )}
                          <AuxiliaresControl
                            auxiliares={sol.auxiliares || []}
                            candidatos={candidatosAuxiliares}
                            somenteLeitura={somenteLeitura}
                            onAdicionar={(usr) => handleAdicionarAuxiliar(sol, 'analise', null, usr)}
                            onRemover={(auxId) => handleRemoverAuxiliar(sol, 'analise', null, auxId)}
                          />
                        </>
                      )}
                    </div>
                  </td>

                  {/* SLA — checkpoint corrente (atribuição/início/conclusão) de cada pendência. Ver [[sla-atendimentos]]. */}
                  <td className="py-4 px-4 text-center whitespace-nowrap">
                    <div className="flex flex-col items-center gap-1">
                      {sol.etapaAtual === 'execucao' ? (
                        [
                          ...(sol.ajustes || []).filter(a => a.status === 'analise_dore'),
                          ...(sol.reequilibrios || []).filter(r => r.status === 'aguardando_analista' || r.status === 'em_analise'),
                          ...(sol.saldosComplementares || []).filter(s => s.status === 'aguardando_analista' || s.status === 'em_analise'),
                        ].map((item, idx) => {
                          const resultado = calcularSlaCorrente(item);
                          const info = STATUS_SLA_INFO[resultado.status];
                          return (
                            <span key={idx} className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 ${info.corBadge}`} title={formatarDuracaoHoras(resultado.horasRestantes)}>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${info.corPonto}`} />
                              {info.label}
                            </span>
                          );
                        })
                      ) : (sol.etapaAtual === 'analise' || sol.etapaAtual === 'correcao') ? (() => {
                        const resultado = calcularSlaCorrente(sol.analiseSla || {});
                        const info = STATUS_SLA_INFO[resultado.status];
                        return (
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 ${info.corBadge}`} title={formatarDuracaoHoras(resultado.horasRestantes)}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${info.corPonto}`} />
                            {info.label}
                          </span>
                        );
                      })() : (
                        <span className="text-[9px] text-slate-300 italic">—</span>
                      )}
                    </div>
                  </td>

                  {/* 10. CHECKLIST DOCS */}
                  <td className="py-4 px-4 text-center whitespace-nowrap">
                    <div className="inline-flex flex-col items-center">
                      <span className="font-extrabold text-[11px] text-[#334155] leading-none mb-0.5">{docsAprovados} / {totalDocs}</span>
                      <span className="text-[9px] text-slate-400 font-semibold tracking-wide uppercase">Alocado</span>
                    </div>
                  </td>

                  {/* 11. ETAPA ATUAL */}
                  <td className="py-4 px-4 text-center whitespace-nowrap">
                    <span className={etapaVisual.className}>
                      {etapaVisual.label}
                    </span>
                  </td>

                  {/* AÇÕES */}
                  <td className="py-4 px-4 text-center whitespace-nowrap">
                    <button
                      onClick={() => {
                        if (primeiroAditivoPendente) {
                          onNavToAnaliseContratual?.(sol, 'aditivo', primeiroAditivoPendente.id);
                        } else if (primeiroAjustePendente) {
                          onNavToAnaliseContratual?.(sol, 'ajuste', primeiroAjustePendente.id);
                        } else {
                          onNavToAnalise?.(sol);
                        }
                      }}
                      title={primeiroAditivoPendente || primeiroAjustePendente ? 'Abrir processo na Validação Contratual' : 'Abrir processo na Validação Técnica'}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:bg-indigo-50 rounded px-2.5 py-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> Abrir
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {solicitacoesFiltradas.length === 0 && (
          <div className="bg-slate-50 border-t border-slate-150 py-12 text-center text-slate-400">
            <AlertCircle className="w-8 h-8 text-slate-350 mx-auto mb-2" />
            <h5 className="font-bold text-slate-700 text-xs">Nenhum atendimento correspondente encontrado</h5>
            <p className="text-[11px] text-slate-505 mt-1 max-w-xs mx-auto">
              Experimente alterar os filtros (ID de Obra, CODESC, SRE, etc.) ou clique em "Limpar Filtros" acima.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 1B. PAINEL DE APROVAÇÃO REGIONAL (Coordenador Regional)
// ==========================================
// Gate leve sobre o estágio 'cadastro' (statusAprovacaoRegional) — o atendimento só segue
// para 'analise' (fila da DORE) depois que o coordenador da SRE aprova.
//
// O mesmo painel também reúne, numa segunda aba, os Ajustes de Planilha, Reequilíbrios
// Financeiros e Saldos Complementares abertos pelo fiscal em obras já em Execução — eles nascem
// com status 'aguardando_coordenador' e só entram na fila de Atribuição da DORE depois que o
// coordenador aprova aqui. Ver [[gate-coordenador-execucao]].
type TipoPendenciaExecucao = 'ajuste' | 'reequilibrio' | 'saldo';
interface PendenciaExecucao {
  sol: Solicitacao;
  tipo: TipoPendenciaExecucao;
  itemId: string;
  label: string;
  valor?: number;
  dataCriacao: string;
}

const TABELA_POR_TIPO_PENDENCIA: Record<TipoPendenciaExecucao, string> = {
  ajuste: 'ajustes_planilha',
  reequilibrio: 'reequilibrios_financeiros',
  saldo: 'saldos_complementares',
};

interface AprovacaoRegionalPanelProps {
  solicitacoes: Solicitacao[];
  onUpdateSolicitacao: (updated: Solicitacao) => void;
  regionaisDoCoordenador?: string[];
  nomeCoordenador?: string;
  // Leva para os dados completos do atendimento na tela de Atendimento Inicial (mesma
  // navegação usada no lápis de edição do restante do app — ver handleEditarAtendimento em App.tsx)
  onVisualizarProcesso?: (sol: Solicitacao) => void;
}

export function AprovacaoRegionalPanel({
  solicitacoes,
  onUpdateSolicitacao,
  regionaisDoCoordenador = [],
  nomeCoordenador = 'Coordenador Regional',
  onVisualizarProcesso
}: AprovacaoRegionalPanelProps) {
  const [mostrarModalAprovado, setMostrarModalAprovado] = useState(false);
  const [modalAprovadoTexto, setModalAprovadoTexto] = useState('');
  // Modal de reprovação: solicitação selecionada + justificativa digitada no próprio modal
  const [solReprovando, setSolReprovando] = useState<Solicitacao | null>(null);
  const [justificativaReprovar, setJustificativaReprovar] = useState('');
  const [erroReprovar, setErroReprovar] = useState('');

  // Aba: Atendimentos Iniciais (cadastro) x Ajuste/Reequilíbrio/Saldo Complementar de obras em Execução
  const [abaAprovacao, setAbaAprovacao] = useState<'atendimentos' | 'execucao'>('atendimentos');
  const [salvandoPendenciaId, setSalvandoPendenciaId] = useState<string | null>(null);
  const [pendenciaReprovando, setPendenciaReprovando] = useState<PendenciaExecucao | null>(null);
  const [justificativaReprovarPendencia, setJustificativaReprovarPendencia] = useState('');
  const [erroReprovarPendencia, setErroReprovarPendencia] = useState('');

  const pendentes = solicitacoes
    .filter(s => s.etapaAtual === 'cadastro' && s.statusAprovacaoRegional === 'pendente')
    .filter(s => !regionaisDoCoordenador.length || regionaisDoCoordenador.some(sre => (s.sre || '').toLowerCase() === sre.toLowerCase()))
    .sort(compararPorPrioridade);

  // Ajustes de Planilha, Reequilíbrios Financeiros e Saldos Complementares abertos pelo fiscal da
  // obra durante a Execução, aguardando aprovação do coordenador regional antes de entrarem na fila
  // de Atribuição da DORE. Ver [[gate-coordenador-execucao]].
  const solicitacoesDaRegional = solicitacoes.filter(s =>
    !regionaisDoCoordenador.length || regionaisDoCoordenador.some(sre => (s.sre || '').toLowerCase() === sre.toLowerCase())
  );
  const pendenciasExecucao: PendenciaExecucao[] = solicitacoesDaRegional.flatMap(sol => [
    ...(sol.ajustes || [])
      .filter(a => a.status === 'aguardando_coordenador')
      .map(a => ({ sol, tipo: 'ajuste' as const, itemId: a.id, label: `Ajuste Nº ${a.numero}`, valor: a.valorAjuste, dataCriacao: a.dataCriacao })),
    ...(sol.reequilibrios || [])
      .filter(r => r.status === 'aguardando_coordenador')
      .map(r => ({ sol, tipo: 'reequilibrio' as const, itemId: r.id, label: `Reequilíbrio ${r.id}`, valor: r.valorReequilibrado, dataCriacao: r.dataCriacao })),
    ...(sol.saldosComplementares || [])
      .filter(s => s.status === 'aguardando_coordenador')
      .map(s => ({ sol, tipo: 'saldo' as const, itemId: s.id, label: `Saldo Complementar ${s.id}`, valor: s.saldoEmConta, dataCriacao: s.dataCriacao })),
  ]);

  const handleAprovar = (sol: Solicitacao) => {
    const hoje = new Date().toISOString().split('T')[0];
    onUpdateSolicitacao({
      ...sol,
      etapaAtual: 'analise',
      statusAprovacaoRegional: 'aprovado',
      coordenadorAprovador: nomeCoordenador,
      dataAprovacaoRegional: hoje,
      // Snapshot dos campos de Dados Gerais no momento em que chegam à DORE — usado por
      // aplicarEdicaoSecao para detectar automaticamente o status 'editado' quando o
      // analista altera um valor (ver src/utils/validacaoTecnica.ts)
      valoresOriginaisTecnico: capturarSnapshotTecnico(sol),
      // Início do relógio de SLA da Análise Técnica — ver [[sla-atendimentos]]
      analiseSla: { ...sol.analiseSla, dataEntradaFila: new Date().toISOString() },
      historicoEtapas: [
        ...sol.historicoEtapas,
        { etapa: 'analise', data: hoje, responsavel: `${nomeCoordenador} (Aprovação Regional)` }
      ]
    });
    setModalAprovadoTexto(`O atendimento ${sol.id} (${sol.nomeEscola}) foi aprovado e encaminhado para a análise técnica da DORE.`);
    setMostrarModalAprovado(true);
  };

  const handleConfirmarReprovar = () => {
    if (!solReprovando) return;
    const justificativa = justificativaReprovar.trim();
    if (!justificativa) {
      setErroReprovar('Informe a justificativa da reprovação.');
      return;
    }
    const hoje = new Date().toISOString().split('T')[0];
    onUpdateSolicitacao({
      ...solReprovando,
      statusAprovacaoRegional: 'reprovado',
      justificativaReprovacaoRegional: justificativa,
      historicoEtapas: [
        ...solReprovando.historicoEtapas,
        { etapa: 'cadastro', data: hoje, responsavel: `${nomeCoordenador} (Reprovação Regional)` }
      ]
    });
    setSolReprovando(null);
    setJustificativaReprovar('');
    setErroReprovar('');
  };

  // Aprova um Ajuste/Reequilíbrio/Saldo Complementar de obra em Execução: grava a decisão no banco
  // e libera o item para a fila de Atribuição da DORE (status 'pendente' no banco).
  const handleAprovarPendenciaExecucao = async (pendencia: PendenciaExecucao) => {
    const { sol, tipo, itemId } = pendencia;
    const hoje = new Date().toISOString().split('T')[0];
    const agora = new Date().toISOString();
    setSalvandoPendenciaId(itemId);

    // Início do relógio de SLA deste item — ver [[sla-atendimentos]]
    const { error } = await supabase
      .from(TABELA_POR_TIPO_PENDENCIA[tipo])
      .update({ status: 'pendente', coordenador_aprovador: nomeCoordenador, data_aprovacao_coordenador: hoje, data_entrada_fila: agora })
      .eq('id', itemId);

    setSalvandoPendenciaId(null);
    if (error) {
      console.error('Erro ao aprovar pendência no Supabase:', error);
      alert('Erro ao aprovar a solicitação no banco de dados. Tente novamente.');
      return;
    }

    const statusLiberado = tipo === 'ajuste' ? 'analise_dore' : 'aguardando_analista';
    onUpdateSolicitacao({
      ...sol,
      ajustes: tipo === 'ajuste'
        ? (sol.ajustes || []).map(a => a.id === itemId ? { ...a, status: statusLiberado as AjustePlanilha['status'], coordenadorAprovador: nomeCoordenador, dataAprovacaoCoordenador: hoje, dataEntradaFila: agora } : a)
        : sol.ajustes,
      reequilibrios: tipo === 'reequilibrio'
        ? (sol.reequilibrios || []).map(r => r.id === itemId ? { ...r, status: statusLiberado as ReequilibrioItem['status'], coordenadorAprovador: nomeCoordenador, dataAprovacaoCoordenador: hoje, dataEntradaFila: agora } : r)
        : sol.reequilibrios,
      saldosComplementares: tipo === 'saldo'
        ? (sol.saldosComplementares || []).map(s => s.id === itemId ? { ...s, status: statusLiberado as SaldoComplementarItem['status'], coordenadorAprovador: nomeCoordenador, dataAprovacaoCoordenador: hoje, dataEntradaFila: agora } : s)
        : sol.saldosComplementares,
      historicoEtapas: [
        ...sol.historicoEtapas,
        { etapa: sol.etapaAtual, data: hoje, responsavel: `${nomeCoordenador} (Aprovação de ${pendencia.label})` }
      ]
    });
  };

  const handleConfirmarReprovarPendencia = async () => {
    if (!pendenciaReprovando) return;
    const justificativa = justificativaReprovarPendencia.trim();
    if (!justificativa) {
      setErroReprovarPendencia('Informe a justificativa da reprovação.');
      return;
    }
    const { sol, tipo, itemId } = pendenciaReprovando;
    const hoje = new Date().toISOString().split('T')[0];
    setSalvandoPendenciaId(itemId);

    const { error } = await supabase
      .from(TABELA_POR_TIPO_PENDENCIA[tipo])
      .update({ status: 'recusado', coordenador_aprovador: nomeCoordenador, data_aprovacao_coordenador: hoje, justificativa_reprovacao_coordenador: justificativa })
      .eq('id', itemId);

    setSalvandoPendenciaId(null);
    if (error) {
      console.error('Erro ao reprovar pendência no Supabase:', error);
      alert('Erro ao reprovar a solicitação no banco de dados. Tente novamente.');
      return;
    }

    const statusReprovado = tipo === 'ajuste' ? 'em_elaboracao' : 'reprovado';
    onUpdateSolicitacao({
      ...sol,
      ajustes: tipo === 'ajuste'
        ? (sol.ajustes || []).map(a => a.id === itemId ? { ...a, status: statusReprovado as AjustePlanilha['status'], coordenadorAprovador: nomeCoordenador, dataAprovacaoCoordenador: hoje, justificativaReprovacaoCoordenador: justificativa } : a)
        : sol.ajustes,
      reequilibrios: tipo === 'reequilibrio'
        ? (sol.reequilibrios || []).map(r => r.id === itemId ? { ...r, status: statusReprovado as ReequilibrioItem['status'], coordenadorAprovador: nomeCoordenador, dataAprovacaoCoordenador: hoje, justificativaReprovacaoCoordenador: justificativa } : r)
        : sol.reequilibrios,
      saldosComplementares: tipo === 'saldo'
        ? (sol.saldosComplementares || []).map(s => s.id === itemId ? { ...s, status: statusReprovado as SaldoComplementarItem['status'], coordenadorAprovador: nomeCoordenador, dataAprovacaoCoordenador: hoje, justificativaReprovacaoCoordenador: justificativa } : s)
        : sol.saldosComplementares,
      historicoEtapas: [
        ...sol.historicoEtapas,
        { etapa: sol.etapaAtual, data: hoje, responsavel: `${nomeCoordenador} (Reprovação de ${pendenciaReprovando.label})` }
      ]
    });
    setPendenciaReprovando(null);
    setJustificativaReprovarPendencia('');
    setErroReprovarPendencia('');
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto w-full animate-in fade-in duration-200">
      <div className="border-b border-slate-100 pb-3">
        <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2 font-sans">
          <CheckCircle className="w-5 h-5 text-blue-600" />
          Aprovação Regional
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Atendimentos e solicitações da sua regional aguardando aprovação antes de seguirem para a DORE.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setAbaAprovacao('atendimentos')}
          className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${abaAprovacao === 'atendimentos' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
        >
          Atendimentos Iniciais ({pendentes.length})
        </button>
        <button
          type="button"
          onClick={() => setAbaAprovacao('execucao')}
          className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${abaAprovacao === 'execucao' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
        >
          Ajuste / Reequilíbrio / Saldo ({pendenciasExecucao.length})
        </button>
      </div>

      {abaAprovacao === 'execucao' ? (
        pendenciasExecucao.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-250 rounded-xl py-14 text-center">
            <CheckCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h5 className="font-bold text-slate-700 text-xs">Nenhuma solicitação aguardando aprovação</h5>
            <p className="text-[11px] text-slate-500 mt-1">Assim que um fiscal da sua regional enviar um Ajuste, Reequilíbrio ou Saldo Complementar, ele aparecerá aqui.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendenciasExecucao.map(pendencia => {
              const { sol, tipo, itemId, label, valor, dataCriacao } = pendencia;
              const IconeTipo = tipo === 'ajuste' ? FileText : tipo === 'reequilibrio' ? TrendingUp : Coins;
              const corTipo = tipo === 'ajuste' ? 'text-violet-600 bg-violet-50/30 border-violet-200' : tipo === 'reequilibrio' ? 'text-purple-600 bg-purple-50/30 border-purple-200' : 'text-teal-600 bg-teal-50/30 border-teal-200';
              return (
                <div key={`${tipo}_${itemId}`} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-3xs hover:shadow-sm transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center ${corTipo}`}>
                        <IconeTipo className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono text-slate-400 font-bold">{sol.id}</span>
                          <span className={`text-[9px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 border ${corTipo}`}>{label}</span>
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-800 truncate">{sol.nomeEscola}</h4>
                        <p className="text-xs text-slate-500">{sol.municipio} · {sol.sre}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={salvandoPendenciaId === itemId}
                        onClick={() => {
                          setPendenciaReprovando(pendencia);
                          setJustificativaReprovarPendencia('');
                          setErroReprovarPendencia('');
                        }}
                        className="px-3 py-2 border border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reprovar
                      </button>
                      <button
                        type="button"
                        disabled={salvandoPendenciaId === itemId}
                        onClick={() => handleAprovarPendenciaExecucao(pendencia)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs hover:shadow-sm inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> {salvandoPendenciaId === itemId ? 'Aprovando…' : 'Aprovar'}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-3 border-t border-slate-100">
                    <span className="text-xs font-bold font-mono text-slate-700">
                      {valor ? `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 whitespace-nowrap">Enviado em {dataCriacao}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : pendentes.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-250 rounded-xl py-14 text-center">
          <CheckCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h5 className="font-bold text-slate-700 text-xs">Nenhum atendimento aguardando aprovação</h5>
          <p className="text-[11px] text-slate-500 mt-1">Assim que um técnico da sua regional enviar um atendimento, ele aparecerá aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendentes.map(sol => {
            const prioridadeScoreCalc = sol.prioridadeScore ?? calcularPrioridade(sol).score;
            const etiquetasCalc: CodigoEtiqueta[] = (sol.etiquetasPrioridade as CodigoEtiqueta[] | undefined) ?? calcularPrioridade(sol).etiquetas;
            const estrelasCalc = sol.estrelas ?? calcularEstrelas(sol);
            const docsObrigatorios = (sol.documentos || []).filter(d => d.obrigatorio);
            const docsAnexados = docsObrigatorios.filter(d => d.fileName);
            const docsCompletos = docsObrigatorios.length > 0 && docsAnexados.length === docsObrigatorios.length;
            const enviadoPor = sol.historicoEtapas?.[0]?.responsavel;

            return (
              <div key={sol.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-3xs hover:shadow-sm transition-shadow">
                {/* Identificação + prioridade e, ao lado, as ações — movidas para o topo do card */}
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {estrelasCalc > 0 && (
                      <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5" title={`${estrelasCalc} de 5 estrelas de prioridade`}>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(n => (
                            <span key={n} className={`text-xs leading-none ${n <= estrelasCalc ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                          ))}
                        </div>
                        <span className="text-[8px] text-slate-300 font-mono">score {prioridadeScoreCalc}</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono text-slate-400 font-bold">{sol.id}</span>
                        {etiquetasCalc.map(codigo => {
                          const info = getInfoEtiqueta(codigo, sol);
                          return (
                            <span key={codigo} className={`${info.corClassName} text-[9px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 inline-block`}>
                              {info.label}
                            </span>
                          );
                        })}
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-800 truncate">{sol.nomeEscola}</h4>
                      <p className="text-xs text-slate-500">{sol.municipio} · {sol.sre}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onVisualizarProcesso && (
                      <button
                        data-testid="aprovacao-regional-visualizar"
                        type="button"
                        onClick={() => onVisualizarProcesso(sol)}
                        title="Ver o processo completo no Atendimento Inicial"
                        className="px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" /> Visualizar
                      </button>
                    )}
                    <button
                      data-testid="aprovacao-regional-reprovar"
                      type="button"
                      onClick={() => {
                        setSolReprovando(sol);
                        setJustificativaReprovar('');
                        setErroReprovar('');
                      }}
                      className="px-3 py-2 border border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reprovar
                    </button>
                    <button
                      data-testid="aprovacao-regional-aprovar"
                      type="button"
                      onClick={() => handleAprovar(sol)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs hover:shadow-sm inline-flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                    </button>
                  </div>
                </div>

                {/* Informações complementares para ajudar na decisão de aprovação */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Tipo de Atendimento</span>
                    <span className="text-xs font-bold text-slate-700">{sol.tipoAtendimento || 'Normal'}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Tipo de Obra</span>
                    <span className="text-xs font-bold text-slate-700 truncate block">{sol.tipoObra || sol.tipo || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Valor da Planilha</span>
                    <span className="text-xs font-bold font-mono text-slate-700">
                      {sol.valorPlanilha ? `R$ ${sol.valorPlanilha.toLocaleString('pt-BR')}` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Documentos</span>
                    <span className={`text-xs font-bold inline-flex items-center gap-1 ${docsCompletos ? 'text-emerald-600' : 'text-amber-600'}`}>
                      <Paperclip className="w-3 h-3" /> {docsAnexados.length}/{docsObrigatorios.length} anexados
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-1">
                  <p className="text-xs text-slate-600">{sol.descricaoFolhaRosto}</p>
                  <div className="flex items-center gap-3 shrink-0 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                    {enviadoPor && <span>Por: {enviadoPor}</span>}
                    <span>Enviado em {sol.dataCriacao}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mostrarModalAprovado && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-800 mb-1.5">Solicitação Encaminhada</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-5">{modalAprovadoTexto}</p>
            <button
              type="button"
              onClick={() => setMostrarModalAprovado(false)}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-lg shadow-md transition cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Reprovar Atendimento (justificativa coletada aqui, não mais externa na linha) */}
      {solReprovando && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-1.5">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">Reprovar Atendimento</h3>
                <p className="text-[11px] text-slate-500">{solReprovando.id} — {solReprovando.nomeEscola}</p>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Justificativa da Reprovação *
              </label>
              <textarea
                data-testid="aprovacao-regional-justificativa"
                rows={4}
                autoFocus
                value={justificativaReprovar}
                onChange={(e) => {
                  setJustificativaReprovar(e.target.value);
                  if (erroReprovar) setErroReprovar('');
                }}
                placeholder="Descreva o motivo da reprovação deste atendimento..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500/10 focus:border-red-500 bg-white text-slate-800"
              />
              {erroReprovar && (
                <p className="text-[10px] text-red-600 font-bold mt-1">{erroReprovar}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => {
                  setSolReprovando(null);
                  setJustificativaReprovar('');
                  setErroReprovar('');
                }}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer transition"
              >
                Cancelar
              </button>
              <button
                data-testid="aprovacao-regional-confirmar-reprovar"
                type="button"
                onClick={handleConfirmarReprovar}
                className="px-4 py-2 rounded-lg text-xs font-extrabold text-white bg-red-600 hover:bg-red-700 shadow-md cursor-pointer transition"
              >
                Confirmar Reprovação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Reprovar Ajuste/Reequilíbrio/Saldo Complementar de obra em Execução */}
      {pendenciaReprovando && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-1.5">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">Reprovar {pendenciaReprovando.label}</h3>
                <p className="text-[11px] text-slate-500">{pendenciaReprovando.sol.id} — {pendenciaReprovando.sol.nomeEscola}</p>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Justificativa da Reprovação *
              </label>
              <textarea
                rows={4}
                autoFocus
                value={justificativaReprovarPendencia}
                onChange={(e) => {
                  setJustificativaReprovarPendencia(e.target.value);
                  if (erroReprovarPendencia) setErroReprovarPendencia('');
                }}
                placeholder="Descreva o motivo da reprovação desta solicitação..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500/10 focus:border-red-500 bg-white text-slate-800"
              />
              {erroReprovarPendencia && (
                <p className="text-[10px] text-red-600 font-bold mt-1">{erroReprovarPendencia}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => {
                  setPendenciaReprovando(null);
                  setJustificativaReprovarPendencia('');
                  setErroReprovarPendencia('');
                }}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvandoPendenciaId === pendenciaReprovando.itemId}
                onClick={handleConfirmarReprovarPendencia}
                className="px-4 py-2 rounded-lg text-xs font-extrabold text-white bg-red-600 hover:bg-red-700 shadow-md cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar Reprovação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 2B. PAINEL DE HISTÓRICO DA ATRIBUIÇÃO
// ==========================================
// Processos que já passaram pela Análise Técnica e estão em etapas futuras ou encerrados.
// Devolvidos para correção (etapaAtual === 'correcao') ficam na Fila Ativa, não aqui.
const ETAPA_HISTORICO_BUCKETS = ['paf_autorizacao', 'paf', 'ordem_inicio', 'execucao', 'cancelado'] as const;

function pertenceAoHistoricoAtribuicao(sol: Solicitacao): boolean {
  return (ETAPA_HISTORICO_BUCKETS as readonly string[]).includes(sol.etapaAtual)
    && (sol.historicoEtapas || []).some(h => h.etapa === 'analise');
}

type ResultadoHistorico = 'Aprovado' | 'Aprovado com Ressalva' | 'Cancelado';

// "Aprovado com Ressalva" = aprovado, mas o analista precisou editar algum campo enviado pelo
// técnico (status 'editado' em alguma seção) ao invés de validar como veio — heurística baseada
// no único sinal de "ajuste durante a análise" disponível no modelo hoje (statusSecoes).
function getResultadoHistorico(sol: Solicitacao): ResultadoHistorico {
  if (sol.etapaAtual === 'cancelado') return 'Cancelado';
  const teveRessalva = Object.values(getStatusSecoes(sol)).some(s => s.status === 'editado');
  return teveRessalva ? 'Aprovado com Ressalva' : 'Aprovado';
}

type EtapaHistoricoBucket = 'paf' | 'cadastro_obras' | 'concluido' | 'cancelado';

// Geração de PAF = paf_autorizacao + paf; Cadastro de Obras = ordem_inicio; Concluído = execucao
// (ver decisão registrada em src/utils/etapas.ts: Ordem de Início marca o "cadastro de obras").
function getEtapaHistoricoBucket(sol: Solicitacao): EtapaHistoricoBucket {
  if (sol.etapaAtual === 'cancelado') return 'cancelado';
  if (sol.etapaAtual === 'paf_autorizacao' || sol.etapaAtual === 'paf') return 'paf';
  if (sol.etapaAtual === 'ordem_inicio') return 'cadastro_obras';
  return 'concluido';
}

const ETAPA_HISTORICO_LABEL: Record<EtapaHistoricoBucket, string> = {
  paf: 'Geração de PAF',
  cadastro_obras: 'Cadastro de Obras',
  concluido: 'Concluído',
  cancelado: 'Cancelado'
};

// Data em que o processo deixou a Análise Técnica pela última vez de forma definitiva —
// é a entrada de historicoEtapas imediatamente após a última entrada 'analise'.
function getDataAnaliseDefinitiva(sol: Solicitacao): string | null {
  const etapas = sol.historicoEtapas || [];
  const idxUltimaAnalise = etapas.map(h => h.etapa).lastIndexOf('analise');
  if (idxUltimaAnalise === -1) return null;
  return etapas[idxUltimaAnalise + 1]?.data || null;
}

interface AtribuicaoHistoricoPanelProps {
  solicitacoes: Solicitacao[];
  onAbrirPreview: (sol: Solicitacao) => void;
}

export function AtribuicaoHistoricoPanel({ solicitacoes, onAbrirPreview }: AtribuicaoHistoricoPanelProps) {
  const [filtroId, setFiltroId] = useState('');
  const [filtroCodesc, setFiltroCodesc] = useState('');
  const [filtroMunicipio, setFiltroMunicipio] = useState('todos');
  const [filtroSre, setFiltroSre] = useState('todos');
  const [filtroEscola, setFiltroEscola] = useState('todos');
  const [filtroResponsavel, setFiltroResponsavel] = useState('todos');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | ResultadoHistorico>('todos');
  const [filtroEtapa, setFiltroEtapa] = useState<'todas' | EtapaHistoricoBucket>('todas');

  const historico = solicitacoes.filter(pertenceAoHistoricoAtribuicao);

  const idsUnicos = Array.from(new Set(historico.map(s => s.id))).sort();
  const codescsUnicos = Array.from(new Set(historico.map(s => s.codesc))).sort();
  const municipiosUnicos = Array.from(new Set(historico.map(s => s.municipio))).sort();
  const sresUnicas = Array.from(new Set(historico.map(s => s.sre))).sort();
  const escolasUnicas = Array.from(new Set(historico.map(s => s.nomeEscola))).sort();
  const responsaveisUnicos = Array.from(new Set(historico.map(s => s.analistaAtribuido).filter((v): v is string => !!v))).sort();

  const historicoFiltrado = historico.filter(sol => {
    if (filtroId && sol.id !== filtroId) return false;
    if (filtroCodesc && sol.codesc !== filtroCodesc) return false;
    if (filtroMunicipio !== 'todos' && sol.municipio !== filtroMunicipio) return false;
    if (filtroSre !== 'todos' && sol.sre !== filtroSre) return false;
    if (filtroEscola !== 'todos' && sol.nomeEscola !== filtroEscola) return false;
    if (filtroResponsavel !== 'todos' && sol.analistaAtribuido !== filtroResponsavel) return false;

    const dataAnalise = getDataAnaliseDefinitiva(sol);
    if (filtroDataInicio && (!dataAnalise || dataAnalise < filtroDataInicio)) return false;
    if (filtroDataFim && (!dataAnalise || dataAnalise > filtroDataFim)) return false;

    if (filtroStatus !== 'todos' && getResultadoHistorico(sol) !== filtroStatus) return false;
    if (filtroEtapa !== 'todas' && getEtapaHistoricoBucket(sol) !== filtroEtapa) return false;

    return true;
  }).sort((a, b) => (getDataAnaliseDefinitiva(b) || '').localeCompare(getDataAnaliseDefinitiva(a) || ''));

  const limparFiltros = () => {
    setFiltroId('');
    setFiltroCodesc('');
    setFiltroMunicipio('todos');
    setFiltroSre('todos');
    setFiltroEscola('todos');
    setFiltroResponsavel('todos');
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setFiltroStatus('todos');
    setFiltroEtapa('todas');
  };

  const resultadoBadge = (resultado: ResultadoHistorico) => {
    switch (resultado) {
      case 'Aprovado': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Aprovado com Ressalva': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Cancelado': return 'bg-rose-100 text-rose-800 border-rose-300';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Filtros */}
      <div className="p-4 border-b border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black font-sans uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <FileClock className="w-4 h-4 text-slate-500" /> Filtros do Histórico
          </h3>
          <button type="button" onClick={limparFiltros} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer">
            Limpar Filtros
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">ID da Obra</label>
            <select value={filtroId} onChange={(e) => setFiltroId(e.target.value)} className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 cursor-pointer">
              <option value="">Todos</option>
              {idsUnicos.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">CODESC</label>
            <select value={filtroCodesc} onChange={(e) => setFiltroCodesc(e.target.value)} className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 cursor-pointer">
              <option value="">Todos</option>
              {codescsUnicos.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Município</label>
            <select value={filtroMunicipio} onChange={(e) => setFiltroMunicipio(e.target.value)} className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 cursor-pointer">
              <option value="todos">Todos</option>
              {municipiosUnicos.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Regional (SRE)</label>
            <select value={filtroSre} onChange={(e) => setFiltroSre(e.target.value)} className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 cursor-pointer">
              <option value="todos">Todas</option>
              {sresUnicas.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Escola</label>
            <select value={filtroEscola} onChange={(e) => setFiltroEscola(e.target.value)} className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 cursor-pointer">
              <option value="todos">Todas</option>
              {escolasUnicas.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Responsável</label>
            <select value={filtroResponsavel} onChange={(e) => setFiltroResponsavel(e.target.value)} className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 cursor-pointer">
              <option value="todos">Todos</option>
              {responsaveisUnicos.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="flex flex-col space-y-1 col-span-2">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Data de Análise</label>
            <div className="flex items-center gap-1">
              <input type="date" value={filtroDataInicio} onChange={(e) => setFiltroDataInicio(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-[10px] font-bold text-slate-700" />
              <span className="text-slate-400 text-xs">à</span>
              <input type="date" value={filtroDataFim} onChange={(e) => setFiltroDataFim(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-[10px] font-bold text-slate-700" />
            </div>
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Status</label>
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as typeof filtroStatus)} className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 cursor-pointer">
              <option value="todos">Todos</option>
              <option value="Aprovado">Aprovado</option>
              <option value="Aprovado com Ressalva">Aprovado com Ressalva</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Etapa Atual</label>
            <select value={filtroEtapa} onChange={(e) => setFiltroEtapa(e.target.value as typeof filtroEtapa)} className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 cursor-pointer">
              <option value="todas">Todas</option>
              <option value="paf">Geração de PAF</option>
              <option value="cadastro_obras">Cadastro de Obras</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse font-sans text-xs">
          <thead>
            <tr className="bg-[#f8fafc] border-b border-slate-250 text-slate-500 font-extrabold uppercase tracking-wider text-[10px] h-[44px]">
              <th className="py-2.5 px-4">Obra ID</th>
              <th className="py-2.5 px-4">Escola / Localização</th>
              <th className="py-2.5 px-4">Tipo / Demanda</th>
              <th className="py-2.5 px-4 text-center">Classe (IEE)</th>
              <th className="py-2.5 px-4">Analista</th>
              <th className="py-2.5 px-4">Data de Análise</th>
              <th className="py-2.5 px-4 text-center">Resultado</th>
              <th className="py-2.5 px-4 text-center">Etapa Atual</th>
              <th className="py-2.5 px-4 text-center">Rodadas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {historicoFiltrado.map(sol => {
              const resultado = getResultadoHistorico(sol);
              const etapaBucket = getEtapaHistoricoBucket(sol);
              const dataAnalise = getDataAnaliseDefinitiva(sol);
              const ieeClasse = sol.ieeClasse ?? calcularIEE(sol)?.classe;
              const rodadas = (sol.historicoCorrecoes || []).length;
              return (
                <tr
                  key={sol.id}
                  onClick={() => onAbrirPreview(sol)}
                  className="hover:bg-blue-50/40 transition-all cursor-pointer"
                  title="Abrir dossiê em modo somente leitura"
                >
                  <td className="py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">{sol.id}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-800 text-[11px] uppercase leading-snug">{sol.nomeEscola}</div>
                    <div className="text-[10px] text-slate-400">{sol.sre} — CODESC {sol.codesc}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-[11px] font-bold text-slate-700">{sol.tipoObra || sol.tipo}</div>
                    <div className="text-[10px] text-slate-400">{sol.tipoAtendimento || 'NORMAL'}</div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {ieeClasse ? (
                      <span className={`${CLASSE_IEE_INFO[ieeClasse].corClassName} text-[9px] font-black uppercase tracking-wide rounded px-2 py-1 inline-block`}>
                        {CLASSE_IEE_INFO[ieeClasse].label}
                      </span>
                    ) : <span className="text-slate-300 italic">—</span>}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-600">{sol.analistaAtribuido || '—'}</td>
                  <td className="py-3 px-4 font-mono text-[10.5px] text-slate-500">
                    {dataAnalise ? new Date(dataAnalise).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`${resultadoBadge(resultado)} text-[9px] font-black uppercase tracking-wide rounded px-2 py-1 border inline-block`}>
                      {resultado}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-[9px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-600 uppercase">
                      {ETAPA_HISTORICO_LABEL[etapaBucket]}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-600">{rodadas}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {historicoFiltrado.length === 0 && (
          <div className="bg-slate-50 border-t border-slate-150 py-12 text-center text-slate-400">
            <FileClock className="w-8 h-8 text-slate-350 mx-auto mb-2" />
            <h5 className="font-bold text-slate-700 text-xs">Nenhum processo encontrado no histórico</h5>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
              Experimente alterar os filtros acima ou aguarde processos concluírem a Análise Técnica.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

