import React, { useState } from 'react';
import { 
  CheckCircle, XCircle, FileText, AlertCircle, Sparkles, UploadCloud, Trash2, 
  ChevronRight, Download, Layers, Plus, Database, Check, Edit3, MessageSquare, RefreshCw 
} from 'lucide-react';
import { Solicitacao, DocumentoChecklist, PerfilUsuario, syncChecklistDocs, Aditivo, AjustePlanilha } from '../types';

interface ProcessAnalysisPanelProps {
  solicitacao: Solicitacao;
  perfilUsuario: PerfilUsuario;
  onUpdate: (updated: Solicitacao) => void;
  hideTransitionButtons: boolean;
  isMyAssignment: boolean;
  finalizarAnaliseDore: () => void;
  reviewAllWithIA: () => void;
  solicitarDevolucaoProcesso: () => void;
  handleSimulatedUpload: (docId: string, event: any) => void;
  handleAISmartAnalysis: (docId: string) => void;
  removerDocumento: (docId: string) => void;
}

export default function ProcessAnalysisPanel({
  solicitacao,
  perfilUsuario,
  onUpdate,
  hideTransitionButtons,
  isMyAssignment,
  finalizarAnaliseDore,
  reviewAllWithIA,
  solicitarDevolucaoProcesso,
  handleSimulatedUpload,
  handleAISmartAnalysis,
  removerDocumento
}: ProcessAnalysisPanelProps) {
  const [subTab, setSubTab] = useState<'dados_gerais' | 'checklist'>('dados_gerais');
  const [novoCustomDocNome, setNovoCustomDocNome] = useState('');
  const [opinioesAditivo, setOpinioesAditivo] = useState<{[key: string]: string}>({});
  const [opinioesAjuste, setOpinioesAjuste] = useState<{[key: string]: string}>({});

  // SRE Base Dados match helper (simulated)
  const baseDadosSimulada = [
    { codesc: '145236', escola: 'E.E. Padre Almir', municipio: 'Patos de Minas', sre: 'SRE Patos de Minas' },
    { codesc: '102547', escola: 'E.E. Milton Campos', municipio: 'Belo Horizonte', sre: 'SRE Metropolitana A' },
    { codesc: '128914', escola: 'E.E. Júlia Kubitschek', municipio: 'Diamantina', sre: 'SRE Diamantina' },
    { codesc: '189652', escola: 'E.E. Tiradentes', municipio: 'São João del Rei', sre: 'SRE São João del Rei' },
    { codesc: '154784', escola: 'E.E. Alcindo de Souza', municipio: 'Uberaba', sre: 'SRE Uberaba' }
  ];

  // Identificação Escolar edits
  const handleUpdateEscolar = (key: keyof Solicitacao, val: any) => {
    const updated = {
      ...solicitacao,
      [key]: val,
      validacaoEscolar: 'editado' as const
    };

    // If typing codesc, try to auto-fill
    if (key === 'codesc') {
      const match = baseDadosSimulada.find(item => item.codesc === String(val).trim());
      if (match) {
        updated.nomeEscola = match.escola;
        updated.municipio = match.municipio;
        updated.sre = match.sre;
      }
    }
    onUpdate(updated);
  };

  const homologarAditivo = (adtId: string) => {
    const opinion = opinioesAditivo[adtId] || '';
    if (!opinion.trim()) {
      alert('Por favor, insira o seu Parecer Técnico Conclusivo para homologar o aditivo.');
      return;
    }

    const updatedAditivos = (solicitacao.aditivos || []).map(a => {
      if (a.id === adtId) {
        return {
          ...a,
          status: 'Aprovado' as const,
          parecerConsolidado: opinion,
          data: new Date().toISOString().split('T')[0]
        };
      }
      return a;
    });

    const targetAdt = (solicitacao.aditivos || []).find(a => a.id === adtId);
    const adtValue = targetAdt?.valorAditivo || 0;

    const updated = {
      ...solicitacao,
      valorPlanilha: (solicitacao.valorPlanilha || 0) + adtValue,
      valorHomologadoContratacao: (solicitacao.valorHomologadoContratacao || 0) + adtValue,
      etapaAtual: 'execucao' as const,
      historicoEtapas: [
        ...(solicitacao.historicoEtapas || []),
        {
          etapa: 'execucao' as const,
          data: new Date().toISOString().split('T')[0],
          responsavel: `Analista DORE (${solicitacao.analistaAtribuido || 'Engenheiro DORE'}) - Aditivo Homologado e Aprovado`
        }
      ],
      aditivos: updatedAditivos
    };

    onUpdate(updated);
    alert('Aditivo homologado e aprovado com sucesso! O processo retornou para a etapa de Execução da Obra acompanhado do termo aditivo.');
  };

  const recusarAditivo = (adtId: string) => {
    const opinion = opinioesAditivo[adtId] || '';
    if (!opinion.trim()) {
      alert('Por favor, insira o seu Parecer Técnico informando os motivos da recusa.');
      return;
    }

    const updatedAditivos = (solicitacao.aditivos || []).map(a => {
      if (a.id === adtId) {
        return {
          ...a,
          status: 'Recusado' as const,
          parecerConsolidado: opinion,
          data: new Date().toISOString().split('T')[0]
        };
      }
      return a;
    });

    const updated = {
      ...solicitacao,
      etapaAtual: 'execucao' as const,
      historicoEtapas: [
        ...(solicitacao.historicoEtapas || []),
        {
          etapa: 'execucao' as const,
          data: new Date().toISOString().split('T')[0],
          responsavel: `Analista DORE (${solicitacao.analistaAtribuido || 'Engenheiro DORE'}) - Aditivo Recusado`
        }
      ],
      aditivos: updatedAditivos
    };

    onUpdate(updated);
    alert('Aditivo recusado com sucesso. O processo retornou para a etapa de Execução da Obra com a indicação de recusa.');
  };

  const homologarAjuste = (ajuId: string) => {
    const opinion = opinioesAjuste[ajuId] || '';
    if (!opinion.trim()) {
      alert('Por favor, insira o seu Parecer Técnico Conclusivo para homologar o ajuste de planilha.');
      return;
    }

    const updatedAjustes = (solicitacao.ajustes || []).map(a => {
      if (a.id === ajuId) {
        return {
          ...a,
          status: 'validado' as const,
          parecerDore: opinion,
          dataCriacao: new Date().toISOString().split('T')[0]
        };
      }
      return a;
    });

    const targetAju = (solicitacao.ajustes || []).find(a => a.id === ajuId);
    const ajuValue = targetAju?.diferencaPlanilhas || 0;

    const updated = {
      ...solicitacao,
      valorPlanilha: (solicitacao.valorPlanilha || 0) + ajuValue,
      etapaAtual: 'execucao' as const,
      historicoEtapas: [
        ...(solicitacao.historicoEtapas || []),
        {
          etapa: 'execucao' as const,
          data: new Date().toISOString().split('T')[0],
          responsavel: `Analista DORE (${solicitacao.analistaAtribuido || 'Engenheiro DORE'}) - Ajuste de Planilha Homologado e Aprovado`
        }
      ],
      ajustes: updatedAjustes
    };

    onUpdate(updated);
    alert('Ajuste de Planilha homologado e aprovado com sucesso! O projeto foi atualizado e o processo retornou para Execução.');
  };

  const recusarAjuste = (ajuId: string) => {
    const opinion = opinioesAjuste[ajuId] || '';
    if (!opinion.trim()) {
      alert('Por favor, insira o seu Parecer Técnico informando os motivos da recusa.');
      return;
    }

    const updatedAjustes = (solicitacao.ajustes || []).map(a => {
      if (a.id === ajuId) {
        return {
          ...a,
          status: 'em_elaboracao' as const,
          parecerDore: opinion
        };
      }
      return a;
    });

    const updated = {
      ...solicitacao,
      etapaAtual: 'execucao' as const,
      historicoEtapas: [
        ...(solicitacao.historicoEtapas || []),
        {
          etapa: 'execucao' as const,
          data: new Date().toISOString().split('T')[0],
          responsavel: `Analista DORE (${solicitacao.analistaAtribuido || 'Engenheiro DORE'}) - Ajuste de Planilha Recusado`
        }
      ],
      ajustes: updatedAjustes
    };

    onUpdate(updated);
    alert('Ajuste de Planilha recusado / devolvido para correção com sucesso. O processo retornou para Execução para ajustes.');
  };

  // Classificação Patrimonial edits
  const handleUpdatePatrimonial = (key: keyof Solicitacao, val: any) => {
    let extra = {};
    if (key === 'formaOcupacao') {
      extra = { validacaoFormaOcupacao: 'editado' as const };
    } else if (key === 'predio') {
      extra = { validacaoPredioEscola: 'editado' as const };
    } else if (key === 'tombado' || key === 'orgaoTombador' || key === 'notificacao') {
      extra = { validacaoTombamento: 'editado' as const };
    } else if (key === 'coabitado' || key === 'tipoCoabitado') {
      extra = { validacaoCoabitado: 'editado' as const };
    }

    const updated: Solicitacao = {
      ...solicitacao,
      [key]: val,
      ...extra
    };

    if (key === 'notificacao') {
      updated.documentos = syncChecklistDocs(updated.documentos || [], val, updated.formaAtendimento);
    }

    onUpdate(updated);
  };

  // Detalhamento Técnico edits
  const handleUpdateTecnico = (key: keyof Solicitacao, val: any) => {
    const updated: Solicitacao = {
      ...solicitacao,
      [key]: val,
      validacaoTecnica: 'editado' as const
    };

    if (key === 'formaAtendimento') {
      updated.documentos = syncChecklistDocs(updated.documentos || [], updated.notificacao, val);
    }

    onUpdate(updated);
  };

  // Dotação SGO edits
  const handleUpdateReferencia = (key: keyof Solicitacao, val: any) => {
    onUpdate({
      ...solicitacao,
      [key]: val,
      validacaoReferenciaDotacao: 'editado' as const
    });
  };

  // Formatting currency float helpers (consistent with app BRL parsing)
  const parseBRLToFloat = (value: string): number => {
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue) return 0;
    return parseInt(cleanValue, 10) / 100;
  };

  const handleEditValorPlanilha = (valRaw: string) => {
    const parsed = parseBRLToFloat(valRaw);
    onUpdate({
      ...solicitacao,
      valorPlanilha: parsed,
      validacaoReferenciaDotacao: 'editado' as const
    });
  };

  // Helper to format float to BRL string on inputs
  const formatFloatToBRL = (val: number | undefined): string => {
    if (val === undefined || val === null) return '';
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  // Custom Document addition
  const handleAddCustomOtherDoc = () => {
    if (!novoCustomDocNome.trim()) return;
    const nuevo: DocumentoChecklist = {
      id: `doc_custom_${Date.now()}`,
      nome: novoCustomDocNome.trim(),
      obrigatorio: false,
      desc: 'Documento complementar solicitado ou anexado pelo analista de engenharia.',
      status: 'pendente'
    };
    onUpdate({
      ...solicitacao,
      outrosDocumentos: [...(solicitacao.outrosDocumentos || []), nuevo]
    });
    setNovoCustomDocNome('');
  };

  // Custom Document removal
  const handleRemoveCustomOtherDoc = (docId: string) => {
    onUpdate({
      ...solicitacao,
      outrosDocumentos: (solicitacao.outrosDocumentos || []).filter(d => d.id !== docId)
    });
  };

  // Simulate uploading custom documents in analysis
  const handleSimulatedUploadCustomOther = (docId: string) => {
    onUpdate({
      ...solicitacao,
      outrosDocumentos: (solicitacao.outrosDocumentos || []).map(d => {
        if (d.id === docId) {
          return {
            ...d,
            fileName: `outro_doc_${d.nome.toLowerCase().replace(/\s+/g, '_')}_v1.pdf`,
            fileSize: '650 KB',
            uploadedAt: new Date().toISOString().split('T')[0],
            status: 'pendente' as const
          };
        }
        return d;
      })
    });
  };

  // Update validation status for custom doc
  const handleSetCustomDocValidation = (docId: string, status: 'aprovado' | 'recusado', reason?: string) => {
    onUpdate({
      ...solicitacao,
      outrosDocumentos: (solicitacao.outrosDocumentos || []).map(d => {
        if (d.id === docId) {
          return {
            ...d,
            status,
            justificativa: reason !== undefined ? reason : (status === 'aprovado' ? '' : d.justificativa)
          };
        }
        return d;
      })
    });
  };

  // Set regular doc status to approved/recusador
  const handleSetDocValidation = (docId: string, status: 'aprovado' | 'recusado', reason?: string) => {
    onUpdate({
      ...solicitacao,
      documentos: solicitacao.documentos.map(d => {
        if (d.id === docId) {
          return {
            ...d,
            status,
            justificativa: reason !== undefined ? reason : (status === 'aprovado' ? '' : d.justificativa)
          };
        }
        return d;
      })
    });
  };

  // Check if can finalized/apresentar DORE
  const hasRejections = solicitacao.documentos.some(d => d.status === 'recusado') || 
                        (solicitacao.outrosDocumentos || []).some(d => d.status === 'recusado') ||
                        solicitacao.validacaoEscolar === 'nao_validado' ||
                        solicitacao.validacaoFormaOcupacao === 'nao_validado' ||
                        solicitacao.validacaoPredioEscola === 'nao_validado' ||
                        solicitacao.validacaoTombamento === 'nao_validado' ||
                        solicitacao.validacaoCoabitado === 'nao_validado' ||
                        solicitacao.validacaoTecnica === 'nao_validado' ||
                        solicitacao.validacaoReferenciaDotacao === 'nao_validado';

  const docCount = solicitacao.documentos.length + (solicitacao.outrosDocumentos || []).length;
  const docPendentes = solicitacao.documentos.filter(d => d.status === 'pendente').length + 
                       (solicitacao.outrosDocumentos || []).filter(d => d.status === 'pendente').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header unificado da fotos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight font-sans">
            ANÁLISE DO PROCESSO
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            Avalie a documentação técnica de engenharia, faça validações dos dados gerais de atendimento e emita pareceres individuais ou consolidados.
          </p>
        </div>
        <button
          type="button"
          className="px-4 py-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 font-extrabold text-xs rounded-xl transition shadow-3xs flex items-center gap-1.5 uppercase tracking-wider font-sans cursor-pointer"
        >
          <Layers className="w-4 h-4 text-blue-600 animate-pulse" />
          PAINEL UNIFICADO DE HOMOLOGAÇÃO TÉCNICA
        </button>
      </div>

      {/* Navegador das subabas */}
      <div className="bg-slate-50/50 border border-slate-150 rounded-2xl p-4 flex items-center gap-4 max-w-lg">
        {/* Passo 1: Dados Gerais */}
        <button
          type="button"
          onClick={() => setSubTab('dados_gerais')}
          className="flex items-center gap-2.5 transition-all cursor-pointer font-sans select-none outline-hidden"
        >
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              subTab === 'dados_gerais'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200/70 text-slate-500'
            }`}
          >
            1
          </span>
          <span
            className={`text-xs font-bold transition-all ${
              subTab === 'dados_gerais'
                ? 'text-blue-600'
                : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            Dados Gerais
          </span>
        </button>

        {/* Linha Conectora */}
        <div className="h-[1px] w-10 bg-slate-200 shrink-0" />

        {/* Passo 2: Checklist & Anexos */}
        <button
          type="button"
          onClick={() => setSubTab('checklist')}
          className="flex items-center gap-2.5 transition-all cursor-pointer font-sans select-none outline-hidden"
        >
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              subTab === 'checklist'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200/70 text-slate-500'
            }`}
          >
            2
          </span>
          <span
            className={`text-xs font-bold transition-all ${
              subTab === 'checklist'
                ? 'text-blue-600'
                : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            Checklist & Anexos
          </span>
        </button>
      </div>

      {/* SUBTAB 1: DADOS GERAIS */}
      {subTab === 'dados_gerais' && (
        <div className="space-y-6 animate-in fade-in duration-200 text-left">
          
          {/* PAINEL DE ADITIVOS E AJUSTES DE PLANILHA AGUARDANDO HOMOLOGAÇÃO COORDENADA */}
          {((solicitacao.aditivos || []).some(a => a.status === 'Pendente') || (solicitacao.ajustes || []).some(a => a.status === 'analise_dore')) && (
            <div className="bg-[#f0f9ff]/45 border-2 border-dashed border-sky-350 p-6 rounded-2xl space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-sky-100 pb-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-sky-900 uppercase tracking-wider font-sans flex items-center gap-2">
                    <Layers className="w-5 h-5 text-sky-600 animate-pulse" />
                    Central de Homologação de Aditivos e Ajustes de Planilha (DORE / SGO)
                  </h3>
                  <p className="text-xs text-sky-700 font-medium">
                    Existem pleitos de alteração física ou financeira pendentes de homologação técnico-regulamentar.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-sky-750 bg-sky-50 border border-sky-200 uppercase px-2.5 py-1.5 rounded-lg leading-none">
                  Fila Técnica de Contratos
                </span>
              </div>

              {/* LISTA DE ADITIVOS REQUERIDOS */}
              {solicitacao.aditivos && solicitacao.aditivos.filter(a => a.status === 'Pendente').map(adt => (
                <div key={adt.id} className="bg-white border border-slate-205 rounded-xl shadow-xs overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                        Termo Aditivo Requerido
                      </span>
                      <h4 className="text-xs font-black text-slate-800 mt-1 font-sans">Pleito Adicional Ref: {adt.tipo}</h4>
                    </div>
                    <span className="text-[10.5px] text-slate-500 font-mono font-bold">Solicitação de Aditivo em {adt.data}</span>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Linha de Atributos Críticos */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-slate-50/50 rounded-lg text-xs font-sans">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Tipo de Impacto</span>
                        <strong className="text-slate-750">{adt.tipo}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Acréscimo Financeiro</span>
                        <strong className="text-slate-750">R$ {(adt.valorExtra || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Supressão Financeira</span>
                        <strong className="text-slate-750">R$ {(adt.supressao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Prazo Extra</span>
                        <strong className="text-slate-750">{adt.prazoExtraDias ? `${adt.prazoExtraDias} dias` : 'Não se aplica'}</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-slate-50/50 rounded-lg text-xs font-sans">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Reprogramação Requerida</span>
                        <strong className="text-slate-700">{adt.reprogramacao || 'Não'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Saldo Complementar SGO</span>
                        <strong className="text-slate-700">{adt.saldoComplementar || 'Não'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Valor Líquido do Aditivo</span>
                        <strong className="text-emerald-700 font-bold">R$ {(adt.valorAditivo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Percentual do Contrato</span>
                        <strong className="text-indigo-700 font-bold">{adt.percentualContrato || 0}%</strong>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-450 block text-[9.5px] uppercase font-bold mb-1">Justificativa e Análise de Ocorrência:</span>
                      <p className="text-xs text-slate-705 italic bg-amber-50/25 border border-amber-100 p-3 rounded-lg leading-relaxed">
                        "{adt.justificativa}"
                      </p>
                    </div>

                    {/* Checklist Documental Obrigatório */}
                    <div className="space-y-1.5">
                      <span className="text-slate-450 block text-[9.5px] uppercase font-bold font-sans">Checklist Documental Obrigatório (Pleito de Aditivo):</span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {(adt.checklistDocs || [
                          { item: 'Planilha de Serviços (Excel)', checked: true },
                          { item: 'Relatório Técnico', checked: true },
                          { item: 'Justificativa Técnico', checked: true },
                          { item: 'Relatório Fotográfico', checked: true },
                          { item: 'Planilha de Medições Acumuladas', checked: true },
                        ]).map((chk, idx) => (
                          <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-150 rounded-lg text-[11px] font-medium font-sans">
                            <span className={chk.checked ? 'text-emerald-500' : 'text-slate-300'}>
                              {chk.checked ? '☑' : '☐'}
                            </span>
                            <span className="text-slate-650 truncate" title={chk.item}>{chk.item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Parecer do Analista e Ações */}
                    <div className="border-t border-slate-100 pt-4 space-y-3">
                      <label className="block text-[10.5px] font-semibold text-slate-600 uppercase tracking-wide">
                        Parecer Técnico Conclusivo do Analista DORE *
                      </label>
                      <textarea
                        value={opinioesAditivo[adt.id] || ''}
                        onChange={(e) => setOpinioesAditivo(prev => ({ ...prev, [adt.id]: e.target.value }))}
                        placeholder="Insira as notas de engenharia, fundamentação normativa e despacho deferindo ou indeferindo o termo aditivo contratual..."
                        disabled={!isMyAssignment}
                        className="w-full text-xs p-3 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-sky-500 bg-white leading-relaxed min-h-[90px]"
                      />

                      {isMyAssignment ? (
                        <div className="flex items-center justify-end gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => recusarAditivo(adt.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-lg transition-all cursor-pointer"
                          >
                            <XCircle className="w-4 h-4 text-red-500" />
                            Recusar / Devolver Pleito
                          </button>
                          <button
                            type="button"
                            onClick={() => homologarAditivo(adt.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-650 hover:bg-emerald-700 text-white shadow-3xs text-xs font-bold rounded-lg transition-all cursor-pointer"
                          >
                            <Check className="w-4 h-4 text-white" />
                            Homologar e Aprovar Termo Aditivo
                          </button>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-450 italic mt-1 leading-normal">
                          🔒 Apenas o analista designado para esta obra ({solicitacao.analistaAtribuido || 'Aguardando atribuição'}) pode homologar este aditivo.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* LISTA DE AJUSTES REQUERIDOS */}
              {solicitacao.ajustes && solicitacao.ajustes.filter(a => a.status === 'analise_dore').map(aju => (
                <div key={aju.id} className="bg-white border border-slate-205 rounded-xl shadow-xs overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                        Ajuste de Planilha Requerido
                      </span>
                      <h4 className="text-xs font-black text-slate-800 mt-1 font-sans">Ajuste de Planilha de Obras nº {aju.numero}</h4>
                    </div>
                    <span className="text-[10.5px] text-slate-500 font-mono font-bold">Solicitação de Ajuste em {aju.dataCriacao}</span>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Linha de Atributos Críticos */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-slate-50/50 rounded-lg text-xs font-sans">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Tipo de Ajuste</span>
                        <strong className="text-slate-700 block uppercase font-bold">{aju.tipoAjuste.replace(/_/g, ' ')}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Acréscimo de Itens</span>
                        <strong className="text-slate-700">R$ {(aju.valorAjuste || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Supressões Realizadas</span>
                        <strong className="text-slate-700">R$ {(aju.supressao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Responsável Técnico</span>
                        <strong className="text-slate-700">{aju.responsavelPlanilha}</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-slate-50/50 rounded-lg text-xs font-sans">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Nº de Registro Profissional</span>
                        <strong className="text-slate-700">{aju.registroProfissional || 'CREA MG'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Diferença Financeira</span>
                        <strong className="text-indigo-700 font-bold">R$ {(aju.diferencaPlanilhas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Reprogramação Física</span>
                        <strong className="text-slate-700">{aju.reprogramacao || 'Não'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Saldo Complementar SRE</span>
                        <strong className="text-slate-700">{aju.saldoComplementar || 'Não'}</strong>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-450 block text-[9.5px] uppercase font-bold mb-1">Notas Técnicas do Autor do Pleito:</span>
                      <p className="text-xs text-slate-705 italic bg-amber-50/25 border border-amber-100 p-3 rounded-lg leading-relaxed">
                        "{aju.observacoes}"
                      </p>
                    </div>

                    {/* Checklist Documental Obrigatório */}
                    <div className="space-y-1.5">
                      <span className="text-slate-450 block text-[9.5px] uppercase font-bold font-sans">Checklist Documental Obrigatório (Pleito de Ajuste):</span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {(aju.checklistDocs || [
                          { item: 'Planilha de Serviços (Excel)', checked: true },
                          { item: 'Relatório Técnico', checked: true },
                          { item: 'Justificativa Técnico', checked: true },
                          { item: 'Relatório Fotográfico', checked: true },
                          { item: 'Planilha de Medições Acumuladas', checked: true },
                        ]).map((chk, idx) => (
                          <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-150 rounded-lg text-[11px] font-medium font-sans">
                            <span className={chk.checked ? 'text-emerald-500' : 'text-slate-300'}>
                              {chk.checked ? '☑' : '☐'}
                            </span>
                            <span className="text-slate-650 truncate" title={chk.item}>{chk.item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Parecer do Analista e Ações */}
                    <div className="border-t border-slate-100 pt-4 space-y-3">
                      <label className="block text-[10.5px] font-semibold text-slate-600 uppercase tracking-wide">
                        Parecer Técnico Conclusivo do Analista DORE (Ajustar) *
                      </label>
                      <textarea
                        value={opinioesAjuste[aju.id] || ''}
                        onChange={(e) => setOpinioesAjuste(prev => ({ ...prev, [aju.id]: e.target.value }))}
                        placeholder="Insira as notas de parecer técnico e fundamentação de engenharia para validar esse ajuste de planilha..."
                        disabled={!isMyAssignment}
                        className="w-full text-xs p-3 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-sky-500 bg-white leading-relaxed min-h-[90px]"
                      />

                      {isMyAssignment ? (
                        <div className="flex items-center justify-end gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => recusarAjuste(aju.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-lg transition-all cursor-pointer"
                          >
                            <XCircle className="w-4 h-4 text-red-500" />
                            Recusar / Devolver Ajuste
                          </button>
                          <button
                            type="button"
                            onClick={() => homologarAjuste(aju.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-650 hover:bg-emerald-700 text-white shadow-3xs text-xs font-bold rounded-lg transition-all cursor-pointer"
                          >
                            <Check className="w-4 h-4 text-white" />
                            Homologar e Aprovar Ajuste de Planilha
                          </button>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-450 italic mt-1 leading-normal">
                          🔒 Apenas o analista designado para esta obra ({solicitacao.analistaAtribuido || 'Aguardando atribuição'}) pode homologar este ajuste.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SEÇÃO 1: Identificação Escolar */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Database className="w-4 h-4 text-blue-500" />
                1. Identificação Escolar
              </h4>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${
                solicitacao.validacaoEscolar === 'validado'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : solicitacao.validacaoEscolar === 'nao_validado'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {solicitacao.validacaoEscolar || 'NÃO AVALIADO'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Código CODESC *
                </label>
                <input
                  type="text"
                  value={solicitacao.codesc || ''}
                  onChange={(e) => handleUpdateEscolar('codesc', e.target.value)}
                  disabled={!isMyAssignment}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/15 text-slate-850 font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Nome da Escola Estadual *
                </label>
                <input
                  type="text"
                  value={solicitacao.nomeEscola || ''}
                  onChange={(e) => handleUpdateEscolar('nomeEscola', e.target.value)}
                  disabled={!isMyAssignment}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/15 text-slate-850 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  SRE *
                </label>
                <input
                  type="text"
                  value={solicitacao.sre || ''}
                  onChange={(e) => handleUpdateEscolar('sre', e.target.value)}
                  disabled={!isMyAssignment}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/15 text-slate-850 font-bold"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Município *
                </label>
                <input
                  type="text"
                  value={solicitacao.municipio || ''}
                  onChange={(e) => handleUpdateEscolar('municipio', e.target.value)}
                  disabled={!isMyAssignment}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/15 text-slate-850 font-bold"
                />
              </div>
            </div>

            {/* Ícones de Validação do Auditor */}
            {perfilUsuario === 'analista_dore' && (
              <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center gap-4">
                <span className="text-xs font-bold text-slate-600">
                  Validação Geral da Escola Estadual:
                </span>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={!isMyAssignment}
                    onClick={() => onUpdate({ ...solicitacao, validacaoEscolar: 'validado', motivoNaoValidacaoEscolar: '' })}
                    className={`px-3 py-1.5 flex items-center gap-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      solicitacao.validacaoEscolar === 'validado'
                        ? 'bg-blue-50 border-blue-550 text-blue-700 shadow-3xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${solicitacao.validacaoEscolar === 'validado' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                      {solicitacao.validacaoEscolar === 'validado' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Validado</span>
                  </button>

                  <button
                    type="button"
                    disabled={!isMyAssignment}
                    onClick={() => onUpdate({ ...solicitacao, validacaoEscolar: 'nao_validado' })}
                    className={`px-3 py-1.5 flex items-center gap-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      solicitacao.validacaoEscolar === 'nao_validado'
                        ? 'bg-blue-50 border-blue-550 text-blue-700 shadow-3xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${solicitacao.validacaoEscolar === 'nao_validado' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                      {solicitacao.validacaoEscolar === 'nao_validado' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>Não Validado</span>
                  </button>

                  <button
                    type="button"
                    disabled={!isMyAssignment}
                    onClick={() => onUpdate({ ...solicitacao, validacaoEscolar: 'editado' })}
                    className={`px-3 py-1.5 flex items-center gap-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      solicitacao.validacaoEscolar === 'editado'
                        ? 'bg-blue-50 border-blue-550 text-blue-700 shadow-3xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${solicitacao.validacaoEscolar === 'editado' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                      {solicitacao.validacaoEscolar === 'editado' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <Edit3 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Editado</span>
                  </button>
                </div>
              </div>
            )}
            
            {perfilUsuario === 'analista_dore' && solicitacao.validacaoEscolar === 'nao_validado' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1 animate-in slide-in-from-top-1 mt-2">
                <label className="block text-[10px] font-bold text-red-700 uppercase">Motivo detalhado da Não-Validação *</label>
                <textarea
                  rows={2}
                  disabled={!isMyAssignment}
                  value={solicitacao.motivoNaoValidacaoEscolar || ''}
                  onChange={(e) => onUpdate({ ...solicitacao, motivoNaoValidacaoEscolar: e.target.value })}
                  placeholder="Indique os motivos de infraestrutura ou inconsistências para regularização..."
                  className="w-full text-xs p-2.5 border border-red-200 rounded-lg bg-white focus:outline-hidden"
                />
              </div>
            )}
          </div>

          {/* SEÇÃO 2: Classificação Patrimonial do Imóvel */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-705 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Database className="w-4 h-4 text-blue-500" />
                2. Classificação Patrimonial do Imóvel
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Card 1: Forma de Ocupação */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/55 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Forma de Ocupação *</span>
                  {perfilUsuario === 'analista_dore' && (
                    <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-md border ${
                      solicitacao.validacaoFormaOcupacao === 'validado'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : solicitacao.validacaoFormaOcupacao === 'nao_validado'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {solicitacao.validacaoFormaOcupacao || 'PENDENTE'}
                    </span>
                  )}
                </div>
                <select
                  value={solicitacao.formaOcupacao || 'PRÓPRIO'}
                  onChange={(e) => handleUpdatePatrimonial('formaOcupacao', e.target.value)}
                  disabled={!isMyAssignment}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 font-medium cursor-pointer"
                >
                  <option value="PRÓPRIO">PRÓPRIO</option>
                  <option value="ALUGADO">ALUGADO</option>
                  <option value="CEDIDO">CEDIDO</option>
                  <option value="OUTRO">OUTRO</option>
                </select>

                {perfilUsuario === 'analista_dore' && (
                  <div className="pt-2.5 border-t border-slate-200/50 flex flex-col gap-1.5 text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avaliação do Analista:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={!isMyAssignment}
                        onClick={() => onUpdate({ ...solicitacao, validacaoFormaOcupacao: 'validado' })}
                        className={`flex-1 py-1 px-2 text-[10.5px] font-bold rounded-md border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          solicitacao.validacaoFormaOcupacao === 'validado'
                            ? 'bg-blue-50 border-blue-550 text-blue-700 shadow-3xs'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full border flex items-center justify-center ${solicitacao.validacaoFormaOcupacao === 'validado' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                          {solicitacao.validacaoFormaOcupacao === 'validado' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        <span>Validar</span>
                      </button>

                      <button
                        type="button"
                        disabled={!isMyAssignment}
                        onClick={() => onUpdate({ ...solicitacao, validacaoFormaOcupacao: 'nao_validado' })}
                        className={`flex-1 py-1 px-2 text-[10.5px] font-bold rounded-md border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          solicitacao.validacaoFormaOcupacao === 'nao_validado'
                            ? 'bg-blue-50 border-blue-550 text-blue-700 shadow-3xs'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full border flex items-center justify-center ${solicitacao.validacaoFormaOcupacao === 'nao_validado' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                          {solicitacao.validacaoFormaOcupacao === 'nao_validado' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        <span>Invalidar</span>
                      </button>

                      <button
                        type="button"
                        disabled={!isMyAssignment}
                        onClick={() => onUpdate({ ...solicitacao, validacaoFormaOcupacao: 'editado' })}
                        className={`flex-1 py-1 px-2 text-[10.5px] font-bold rounded-md border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          solicitacao.validacaoFormaOcupacao === 'editado'
                            ? 'bg-blue-50 border-blue-550 text-blue-700 shadow-3xs'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full border flex items-center justify-center ${solicitacao.validacaoFormaOcupacao === 'editado' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                          {solicitacao.validacaoFormaOcupacao === 'editado' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        <span>Editado</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: Prédio Escola */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/55 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Prédio Escola *</span>
                  {perfilUsuario === 'analista_dore' && (
                    <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-md border ${
                      solicitacao.validacaoPredioEscola === 'validado'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : solicitacao.validacaoPredioEscola === 'nao_validado'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {solicitacao.validacaoPredioEscola || 'PENDENTE'}
                    </span>
                  )}
                </div>
                <select
                  value={solicitacao.predio || 'PRINCIPAL'}
                  onChange={(e) => handleUpdatePatrimonial('predio', e.target.value)}
                  disabled={!isMyAssignment}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 font-medium cursor-pointer"
                >
                  <option value="PRINCIPAL">PRINCIPAL</option>
                  <option value="ANEXO">ANEXO</option>
                </select>

                {perfilUsuario === 'analista_dore' && (
                  <div className="pt-2.5 border-t border-slate-200/50 flex flex-col gap-1.5 text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avaliação do Analista:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={!isMyAssignment}
                        onClick={() => onUpdate({ ...solicitacao, validacaoPredioEscola: 'validado' })}
                        className={`flex-1 py-1 px-2 text-[10.5px] font-bold rounded-md border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          solicitacao.validacaoPredioEscola === 'validado'
                            ? 'bg-blue-50 border-blue-550 text-blue-700 shadow-3xs'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full border flex items-center justify-center ${solicitacao.validacaoPredioEscola === 'validado' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                          {solicitacao.validacaoPredioEscola === 'validado' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        <span>Validar</span>
                      </button>

                      <button
                        type="button"
                        disabled={!isMyAssignment}
                        onClick={() => onUpdate({ ...solicitacao, validacaoPredioEscola: 'nao_validado' })}
                        className={`flex-1 py-1 px-2 text-[10.5px] font-bold rounded-md border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          solicitacao.validacaoPredioEscola === 'nao_validado'
                            ? 'bg-blue-50 border-blue-550 text-blue-700 shadow-3xs'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full border flex items-center justify-center ${solicitacao.validacaoPredioEscola === 'nao_validado' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                          {solicitacao.validacaoPredioEscola === 'nao_validado' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        <span>Invalidar</span>
                      </button>

                      <button
                        type="button"
                        disabled={!isMyAssignment}
                        onClick={() => onUpdate({ ...solicitacao, validacaoPredioEscola: 'editado' })}
                        className={`flex-1 py-1 px-2 text-[10.5px] font-bold rounded-md border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          solicitacao.validacaoPredioEscola === 'editado'
                            ? 'bg-blue-50 border-blue-550 text-blue-700 shadow-3xs'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full border flex items-center justify-center ${solicitacao.validacaoPredioEscola === 'editado' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                          {solicitacao.validacaoPredioEscola === 'editado' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        <span>Editado</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 3: Tombamento */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/55 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tombamento *</span>
                  {perfilUsuario === 'analista_dore' && (
                    <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-md border ${
                      solicitacao.validacaoTombamento === 'validado'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : solicitacao.validacaoTombamento === 'nao_validado'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {solicitacao.validacaoTombamento || 'PENDENTE'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Status</label>
                    <select
                      value={solicitacao.tombado || 'NÃO É TOMBADO'}
                      onChange={(e) => handleUpdatePatrimonial('tombado', e.target.value)}
                      disabled={!isMyAssignment}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-800"
                    >
                      <option value="NÃO É TOMBADO">NÃO É TOMBADO</option>
                      <option value="TOMBADO PARCIALMENTE">TOMBADO PARCIALMENTE</option>
                      <option value="TOMBADO TOTALMENTE">TOMBADO TOTALMENTE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Órgão Tombador</label>
                    <select
                      value={solicitacao.orgaoTombador || ''}
                      onChange={(e) => handleUpdatePatrimonial('orgaoTombador', e.target.value)}
                      disabled={!isMyAssignment || solicitacao.tombado === 'NÃO É TOMBADO'}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-800"
                    >
                      <option value="">NÃO APLICÁVEL</option>
                      <option value="MUNICIPAL">MUNICIPAL</option>
                      <option value="ESTADUAL">ESTADUAL</option>
                      <option value="FEDERAL">FEDERAL</option>
                    </select>
                  </div>
                </div>

                {perfilUsuario === 'analista_dore' && (
                  <div className="pt-2.5 border-t border-slate-200/50 flex flex-col gap-1.5 text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avaliação do Analista:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={!isMyAssignment}
                        onClick={() => onUpdate({ ...solicitacao, validacaoTombamento: 'validado' })}
                        className={`flex-1 py-1 px-2 text-[10.5px] font-bold rounded-md border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          solicitacao.validacaoTombamento === 'validado'
                            ? 'bg-blue-50 border-blue-550 text-blue-700 shadow-3xs'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full border flex items-center justify-center ${solicitacao.validacaoTombamento === 'validado' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                          {solicitacao.validacaoTombamento === 'validado' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        <span>Validar</span>
                      </button>

                      <button
                        type="button"
                        disabled={!isMyAssignment}
                        onClick={() => onUpdate({ ...solicitacao, validacaoTombamento: 'nao_validado' })}
                        className={`flex-1 py-1 px-2 text-[10.5px] font-bold rounded-md border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          solicitacao.validacaoTombamento === 'nao_validado'
                            ? 'bg-blue-50 border-blue-550 text-blue-700 shadow-3xs'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full border flex items-center justify-center ${solicitacao.validacaoTombamento === 'nao_validado' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                          {solicitacao.validacaoTombamento === 'nao_validado' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        <span>Invalidar</span>
                      </button>

                      <button
                        type="button"
                        disabled={!isMyAssignment}
                        onClick={() => onUpdate({ ...solicitacao, validacaoTombamento: 'editado' })}
                        className={`flex-1 py-1 px-2 text-[10.5px] font-bold rounded-md border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          solicitacao.validacaoTombamento === 'editado'
                            ? 'bg-blue-50 border-blue-550 text-blue-700 shadow-3xs'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full border flex items-center justify-center ${solicitacao.validacaoTombamento === 'editado' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                          {solicitacao.validacaoTombamento === 'editado' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        <span>Editado</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 4: Imóvel Coabitado? */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/55 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Imóvel Coabitado? *</span>
                  {perfilUsuario === 'analista_dore' && (
                    <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-md border ${
                      solicitacao.validacaoCoabitado === 'validado'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : solicitacao.validacaoCoabitado === 'nao_validado'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {solicitacao.validacaoCoabitado || 'PENDENTE'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Coabitado?</label>
                    <select
                      value={solicitacao.coabitado || 'NÃO'}
                      onChange={(e) => handleUpdatePatrimonial('coabitado', e.target.value)}
                      disabled={!isMyAssignment}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-800"
                    >
                      <option value="NÃO">NÃO</option>
                      <option value="SIM">SIM</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Tipo Coabitação</label>
                    <select
                      value={solicitacao.tipoCoabitado || ''}
                      onChange={(e) => handleUpdatePatrimonial('tipoCoabitado', e.target.value)}
                      disabled={!isMyAssignment || solicitacao.coabitado !== 'SIM'}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-800"
                    >
                      <option value="">NÃO APLICÁVEL</option>
                      <option value="Coabitado com outra escola Estadual">Coabitado com outra escola Estadual</option>
                      <option value="Coabitado com outra escola municipal">Coabitado com outra escola municipal</option>
                      <option value="Coabitado com outro órgão estadual">Coabitado com outro órgão estadual</option>
                    </select>
                  </div>
                </div>

                {perfilUsuario === 'analista_dore' && (
                  <div className="pt-2.5 border-t border-slate-200/50 flex flex-col gap-1.5 text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avaliação do Analista:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={!isMyAssignment}
                        onClick={() => onUpdate({ ...solicitacao, validacaoCoabitado: 'validado' })}
                        className={`flex-1 py-1 px-2 text-[10.5px] font-bold rounded-md border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          solicitacao.validacaoCoabitado === 'validado'
                            ? 'bg-blue-50 border-blue-555 text-blue-700 shadow-3xs'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full border flex items-center justify-center ${solicitacao.validacaoCoabitado === 'validado' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                          {solicitacao.validacaoCoabitado === 'validado' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        <span>Validar</span>
                      </button>

                      <button
                        type="button"
                        disabled={!isMyAssignment}
                        onClick={() => onUpdate({ ...solicitacao, validacaoCoabitado: 'nao_validado' })}
                        className={`flex-1 py-1 px-2 text-[10.5px] font-bold rounded-md border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          solicitacao.validacaoCoabitado === 'nao_validado'
                            ? 'bg-blue-50 border-blue-555 text-blue-700 shadow-3xs'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full border flex items-center justify-center ${solicitacao.validacaoCoabitado === 'nao_validado' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                          {solicitacao.validacaoCoabitado === 'nao_validado' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        <span>Invalidar</span>
                      </button>

                      <button
                        type="button"
                        disabled={!isMyAssignment}
                        onClick={() => onUpdate({ ...solicitacao, validacaoCoabitado: 'editado' })}
                        className={`flex-1 py-1 px-2 text-[10.5px] font-bold rounded-md border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          solicitacao.validacaoCoabitado === 'editado'
                            ? 'bg-blue-50 border-blue-555 text-blue-700 shadow-3xs'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full border flex items-center justify-center ${solicitacao.validacaoCoabitado === 'editado' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                          {solicitacao.validacaoCoabitado === 'editado' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        <span>Editado</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 5: Notificação / Órgão Regulador */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/55 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Há alguma notificação? *</span>
                </div>
                <select
                  value={solicitacao.notificacao || 'Não há notificação'}
                  onChange={(e) => handleUpdatePatrimonial('notificacao', e.target.value)}
                  disabled={!isMyAssignment}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 font-medium cursor-pointer"
                >
                  <option value="Não há notificação">Não há notificação</option>
                  <option value="Ministério Publico">Ministério Publico</option>
                  <option value="Prefeitura">Prefeitura</option>
                  <option value="Defesa Civil">Defesa Civil</option>
                  <option value="TCE">TCE</option>
                </select>
              </div>
            </div>

            {perfilUsuario === 'analista_dore' && (solicitacao.validacaoFormaOcupacao === 'nao_validado' || solicitacao.validacaoPredioEscola === 'nao_validado' || solicitacao.validacaoTombamento === 'nao_validado' || solicitacao.validacaoCoabitado === 'nao_validado') && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1 animate-in slide-in-from-top-1">
                <label className="block text-[10px] font-bold text-red-700 uppercase">Motivo detalhado da Não-Validação Patrimonial *</label>
                <textarea
                  rows={2}
                  disabled={!isMyAssignment}
                  value={solicitacao.motivoNaoValidacaoPatrimonial || ''}
                  onChange={(e) => onUpdate({ ...solicitacao, motivoNaoValidacaoPatrimonial: e.target.value })}
                  placeholder="Informe irregularidade dominial do terreno ou escritura ausente..."
                  className="w-full text-xs p-2.5 border border-red-200 rounded-lg bg-white focus:outline-hidden text-slate-800"
                />
              </div>
            )}
          </div>

          {/* SEÇÃO 3: Detalhamento Técnico e Demanda */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Database className="w-4 h-4 text-blue-500" />
                3. Detalhamento Técnico e Demanda
              </h4>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${
                solicitacao.validacaoTecnica === 'validado'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : solicitacao.validacaoTecnica === 'nao_validado'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {solicitacao.validacaoTecnica || 'NÃO AVALIADO'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Tipo de Obra *
                </label>
                <select
                  value={solicitacao.tipo || 'REFORMA'}
                  onChange={(e) => handleUpdateTecnico('tipo', e.target.value)}
                  disabled={!isMyAssignment}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
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
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Tipo de Atendimento *
                </label>
                <select
                  value={solicitacao.tipoAtendimento || 'NORMAL'}
                  onChange={(e) => handleUpdateTecnico('tipoAtendimento', e.target.value)}
                  disabled={!isMyAssignment}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="NORMAL">NORMAL</option>
                  <option value="EMERGENCIAL">EMERGENCIAL</option>
                  <option value="EMENDA">EMENDA</option>
                  <option value="SOE">SOE</option>
                  <option value="PDDE">PDDE</option>
                </select>
              </div>

              {solicitacao.tipoAtendimento === 'EMENDA' && (
                <div className="sm:col-span-2 grid grid-cols-2 gap-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                  <div>
                    <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">Número PAF *</label>
                    <input
                      type="text"
                      value={solicitacao.numPaf || ''}
                      onChange={(e) => handleUpdateTecnico('numPaf', e.target.value)}
                      disabled={!isMyAssignment}
                      className="w-full px-3 py-1.5 text-xs border border-blue-250 bg-white rounded-md focus:outline-hidden text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">Ano da Emenda *</label>
                    <input
                      type="text"
                      value={solicitacao.anoEmenda || ''}
                      onChange={(e) => handleUpdateTecnico('anoEmenda', e.target.value)}
                      disabled={!isMyAssignment}
                      className="w-full px-3 py-1.5 text-xs border border-blue-250 bg-white rounded-md focus:outline-hidden text-slate-800"
                    />
                  </div>
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Forma de Atendimento *
                </label>
                <select
                  value={solicitacao.formaAtendimento || 'VIA CAIXA ESCOLAR'}
                  onChange={(e) => handleUpdateTecnico('formaAtendimento', e.target.value)}
                  disabled={!isMyAssignment}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white font-extrabold"
                >
                  <option value="VIA CAIXA ESCOLAR">VIA CAIXA ESCOLAR</option>
                  <option value="SEM ÔNUS">SEM ÔNUS</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Descrição Folha do Rosto (Diagnóstico & Metas)
                </label>
                <textarea
                  rows={2}
                  value={solicitacao.descricaoFolhaRosto || ''}
                  onChange={(e) => handleUpdateTecnico('descricaoFolhaRosto', e.target.value)}
                  disabled={!isMyAssignment}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            {/* Ícones de Validação do Auditor */}
            {perfilUsuario === 'analista_dore' && (
              <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center gap-4">
                <span className="text-xs font-bold text-slate-600">
                  Avaliação do Detalhamento Técnico:
                </span>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={!isMyAssignment}
                    onClick={() => onUpdate({ ...solicitacao, validacaoTecnica: 'validado', motivoNaoValidacaoTecnica: '' })}
                    className={`px-3 py-1.5 flex items-center gap-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      solicitacao.validacaoTecnica === 'validado'
                        ? 'bg-blue-50 border-blue-550 text-blue-700 shadow-3xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${solicitacao.validacaoTecnica === 'validado' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                      {solicitacao.validacaoTecnica === 'validado' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Validado</span>
                  </button>

                  <button
                    type="button"
                    disabled={!isMyAssignment}
                    onClick={() => onUpdate({ ...solicitacao, validacaoTecnica: 'nao_validado' })}
                    className={`px-3 py-1.5 flex items-center gap-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      solicitacao.validacaoTecnica === 'nao_validado'
                        ? 'bg-blue-50 border-blue-550 text-blue-700 shadow-3xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${solicitacao.validacaoTecnica === 'nao_validado' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                      {solicitacao.validacaoTecnica === 'nao_validado' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>Não Validado</span>
                  </button>

                  <button
                    type="button"
                    disabled={!isMyAssignment}
                    onClick={() => onUpdate({ ...solicitacao, validacaoTecnica: 'editado' })}
                    className={`px-3 py-1.5 flex items-center gap-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      solicitacao.validacaoTecnica === 'editado'
                        ? 'bg-blue-50 border-blue-550 text-blue-700 shadow-3xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${solicitacao.validacaoTecnica === 'editado' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                      {solicitacao.validacaoTecnica === 'editado' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <Edit3 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Editado</span>
                  </button>
                </div>
              </div>
            )}
            
            {perfilUsuario === 'analista_dore' && solicitacao.validacaoTecnica === 'nao_validado' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1 animate-in slide-in-from-top-1 mt-2">
                <label className="block text-[10px] font-bold text-red-700 uppercase">Motivo detalhado da Não-Validação *</label>
                <textarea
                  rows={2}
                  disabled={!isMyAssignment}
                  value={solicitacao.motivoNaoValidacaoTecnica || ''}
                  onChange={(e) => onUpdate({ ...solicitacao, motivoNaoValidacaoTecnica: e.target.value })}
                  placeholder="Descreva problemas com o escopo físico da reforma do telhado ou ampliações..."
                  className="w-full text-xs p-2.5 border border-red-200 rounded-lg bg-white focus:outline-hidden text-slate-800"
                />
              </div>
            )}
          </div>

          {/* SEÇÃO 4: Informações de Referência e Dotação Orçamentária SGO */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Database className="w-4 h-4 text-blue-500" />
                4. Informações de Referência e Dotação Orçamentária SGO
              </h4>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${
                solicitacao.validacaoReferenciaDotacao === 'validado'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : solicitacao.validacaoReferenciaDotacao === 'nao_validado'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {solicitacao.validacaoReferenciaDotacao || 'NÃO AVALIADO'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Valor Estimativo da Planilha *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formatFloatToBRL(solicitacao.valorPlanilha)}
                    onChange={(e) => handleEditValorPlanilha(e.target.value)}
                    disabled={!isMyAssignment}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Alíquota ISS Estimado *
                </label>
                <input
                  type="text"
                  value={solicitacao.iss || '5%'}
                  onChange={(e) => handleUpdateReferencia('iss', e.target.value)}
                  disabled={!isMyAssignment}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono font-bold text-slate-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Observações Gerais do Processo
                </label>
                <textarea
                  rows={2}
                  value={solicitacao.observacoesFicha || ''}
                  onChange={(e) => handleUpdateReferencia('observacoesFicha', e.target.value)}
                  disabled={!isMyAssignment}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 font-medium"
                />
              </div>
            </div>

            {/* Ícones de Validação do Auditor */}
            {perfilUsuario === 'analista_dore' && (
              <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center gap-4">
                <span className="text-xs font-bold text-slate-600">
                  Avaliação da Dotação Orçamentária SGO:
                </span>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={!isMyAssignment}
                    onClick={() => onUpdate({ ...solicitacao, validacaoReferenciaDotacao: 'validado', motivoNaoValidacaoReferenciaDotacao: '' })}
                    className={`px-3 py-1.5 flex items-center gap-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      solicitacao.validacaoReferenciaDotacao === 'validado'
                        ? 'bg-blue-50 border-blue-550 text-blue-700 shadow-3xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${solicitacao.validacaoReferenciaDotacao === 'validado' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                      {solicitacao.validacaoReferenciaDotacao === 'validado' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Validado</span>
                  </button>

                  <button
                    type="button"
                    disabled={!isMyAssignment}
                    onClick={() => onUpdate({ ...solicitacao, validacaoReferenciaDotacao: 'nao_validado' })}
                    className={`px-3 py-1.5 flex items-center gap-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      solicitacao.validacaoReferenciaDotacao === 'nao_validado'
                        ? 'bg-blue-50 border-blue-550 text-blue-700 shadow-3xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${solicitacao.validacaoReferenciaDotacao === 'nao_validado' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                      {solicitacao.validacaoReferenciaDotacao === 'nao_validado' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>Não Validado</span>
                  </button>

                  <button
                    type="button"
                    disabled={!isMyAssignment}
                    onClick={() => onUpdate({ ...solicitacao, validacaoReferenciaDotacao: 'editado' })}
                    className={`px-3 py-1.5 flex items-center gap-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      solicitacao.validacaoReferenciaDotacao === 'editado'
                        ? 'bg-blue-50 border-blue-550 text-blue-700 shadow-3xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${solicitacao.validacaoReferenciaDotacao === 'editado' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                      {solicitacao.validacaoReferenciaDotacao === 'editado' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <Edit3 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Editado</span>
                  </button>
                </div>
              </div>
            )}
            
            {perfilUsuario === 'analista_dore' && solicitacao.validacaoReferenciaDotacao === 'nao_validado' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1 animate-in slide-in-from-top-1 mt-2">
                <label className="block text-[10px] font-bold text-red-700 uppercase">Motivo detalhado da Não-Validação *</label>
                <textarea
                  rows={2}
                  disabled={!isMyAssignment}
                  value={solicitacao.motivoNaoValidacaoReferenciaDotacao || ''}
                  onChange={(e) => onUpdate({ ...solicitacao, motivoNaoValidacaoReferenciaDotacao: e.target.value })}
                  placeholder="Justifique a não-conformidade orçamentária ou aliquota incompatível..."
                  className="w-full text-xs p-2.5 border border-red-200 rounded-lg bg-white focus:outline-hidden text-slate-800"
                />
              </div>
            )}
          </div>

          {/* Campo de observações agrupadas/consolidado */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-300 space-y-3 font-sans">
            <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs uppercase font-mono">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              Parecer Técnico de Auditoria (Agrupamento dos Dados Gerais)
            </div>
            <textarea
              rows={4}
              value={solicitacao.observacoesAnalistaDadosGerais || ''}
              onChange={(e) => onUpdate({ ...solicitacao, observacoesAnalistaDadosGerais: e.target.value })}
              placeholder="Digite aqui um consolidado ou notas adicionais sobre a regularidade do atendimento de infraestrutura..."
              className="w-full text-xs p-3 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 bg-white leading-relaxed font-sans text-slate-800"
            />
            <p className="text-[10px] text-slate-450">
              💡 As considerações consolidadas acima fazem parte do dossiê final de homologação do atendimento técnico da SRE junto à DORE.
            </p>
          </div>
        </div>
      )}

      {/* SUBTAB 2: CHECKLIST DE ANEXOS E DOCUMENTOS */}
      {subTab === 'checklist' && (
        <div className="space-y-6 animate-in fade-in duration-200 text-left">
          
          {/* PARECER RÁPIDO COM IA SE ATRIBUIDO */}
          {perfilUsuario === 'analista_dore' && isMyAssignment && (
            <div className="flex items-center justify-between p-3.5 bg-indigo-50/70 border border-indigo-150 rounded-xl mb-4 font-sans text-xs">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-5 h-5 text-indigo-650 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <span className="font-extrabold text-indigo-900 text-xs block">Processamento Sincronizado de Auditoria</span>
                  <span>O analista pode rodar a inteligência artificial para validar documentos anexados pelo Técnico da SRE de acordo com regras de engenharia padrão.</span>
                </div>
              </div>
              <button
                type="button"
                onClick={reviewAllWithIA}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-3xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Auditar com IA
              </button>
            </div>
          )}

          {/* 1. DOCUMENTOS OBRIGATÓRIOS */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest font-mono flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              📌 Documentos Obrigatórios ({solicitacao.documentos.filter(d => d.obrigatorio).length})
            </h3>

            <div className="space-y-3">
              {solicitacao.documentos.filter(d => d.obrigatorio).map((doc) => {
                const isUploaded = doc.fileName !== undefined;
                return (
                  <div key={doc.id} className={`p-4 rounded-xl border transition-all ${
                    doc.status === 'recusado' 
                      ? 'border-red-200 bg-red-50/10'
                      : doc.status === 'aprovado'
                        ? 'border-emerald-150 bg-emerald-50/5'
                        : 'border-slate-200 bg-white hover:border-slate-300 shadow-3xs'
                  }`}>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      
                      {/* Left: Info details */}
                      <div className="max-w-xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-extrabold text-slate-800 text-xs font-sans">{doc.nome}</h5>
                          <span className="text-[9px] bg-red-105 border border-red-200 rounded px-1.5 py-0.5 uppercase text-red-700 font-bold tracking-wider font-mono">Imprescindível</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 font-sans">{doc.desc}</p>

                        {/* File element */}
                        {isUploaded ? (
                          <div className="mt-2.5 flex items-center gap-2.5 bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-mono">
                            <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-slate-800 block truncate">{doc.fileName}</span>
                              <span className="text-[10px] text-slate-450 block">Anexado em: {doc.uploadedAt} | {doc.fileSize}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => alert(`Baixando arquivo: ${doc.fileName}`)}
                              className="text-blue-600 hover:text-blue-800 border border-blue-200 hover:bg-blue-50 px-2 py-1 rounded transition text-[10px] uppercase font-bold shrink-0 cursor-pointer"
                            >
                              Baixar
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-450 block mt-2 italic">
                            ⚠️ Aguardando anexo do memorial descritivo ou laudo correspondente.
                          </span>
                        )}

                        {/* Reason selection if recusado */}
                        {doc.status === 'recusado' && (
                          <div className="mt-2.5 p-3 bg-red-50/75 border border-red-200/60 rounded-lg text-xs space-y-1">
                            <span className="font-bold text-red-800 block text-[9.5px] uppercase tracking-wide">Motivo da Recusa (Técnico SRE Deve Corrigir)</span>
                            <p className="text-slate-750">{doc.justificativa || 'Nenhum parecer digitado.'}</p>
                          </div>
                        )}
                      </div>

                      {/* Right: Validation Controls */}
                      {isMyAssignment && (
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button
                              type="button"
                              onClick={() => handleSetDocValidation(doc.id, 'aprovado')}
                              disabled={!isUploaded}
                              className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer ${
                                doc.status === 'aprovado'
                                  ? 'bg-emerald-600 text-white shadow-3xs'
                                  : 'text-slate-600 hover:bg-slate-200'
                              } ${!isUploaded ? 'opacity-40 cursor-not-allowed' : ''}`}
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Validado
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetDocValidation(doc.id, 'recusado')}
                              disabled={!isUploaded}
                              className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer ${
                                doc.status === 'recusado'
                                  ? 'bg-red-600 text-white shadow-3xs'
                                  : 'text-slate-600 hover:bg-slate-200'
                              } ${!isUploaded ? 'opacity-40 cursor-not-allowed' : ''}`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Não Validado
                            </button>
                          </div>

                          {doc.status === 'recusado' && isUploaded && (
                            <textarea
                              rows={1.5}
                              value={doc.justificativa || ''}
                              onChange={(e) => handleSetDocValidation(doc.id, 'recusado', e.target.value)}
                              placeholder="Digite aqui o motivo do erro para correção..."
                              className="w-full text-xs p-2 border border-slate-250 bg-white rounded-lg focus:outline-hidden text-slate-800"
                            />
                          )}

                          {isUploaded && (
                            <button 
                              type="button"
                              onClick={() => handleAISmartAnalysis(doc.id)}
                              className="w-full text-center text-[10px] font-black text-indigo-700 hover:text-indigo-900 bg-indigo-50 border border-indigo-100 rounded-lg py-1 hover:bg-indigo-10 transition-colors cursor-pointer"
                            >
                              Análise Rápida IA
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. DOCUMENTOS OPCIONAIS / NÃO OBRIGATÓRIOS */}
          <div className="space-y-3 pt-4">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest font-mono flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              📂 Documentos Não-Obrigatórios ({solicitacao.documentos.filter(d => !d.obrigatorio).length})
            </h3>

            <div className="space-y-3">
              {solicitacao.documentos.filter(d => !d.obrigatorio).map((doc) => {
                const isUploaded = doc.fileName !== undefined;
                return (
                  <div key={doc.id} className={`p-4 rounded-xl border transition-all ${
                    doc.status === 'recusado' 
                      ? 'border-red-200 bg-red-50/10'
                      : doc.status === 'aprovado'
                        ? 'border-emerald-150 bg-emerald-50/5'
                        : 'border-slate-200 bg-white hover:border-slate-300 shadow-3xs'
                  }`}>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      
                      {/* Left: Info details */}
                      <div className="max-w-xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-extrabold text-slate-800 text-xs font-sans">{doc.nome}</h5>
                          <span className="text-[9px] bg-slate-105 border border-slate-200 rounded px-1.5 py-0.5 uppercase text-slate-600 font-medium tracking-wider font-mono">Opcional</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 font-sans">{doc.desc}</p>

                        {/* File element */}
                        {isUploaded ? (
                          <div className="mt-2.5 flex items-center gap-2.5 bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-mono">
                            <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-slate-800 block truncate">{doc.fileName}</span>
                              <span className="text-[10px] text-slate-450 block">Anexado em: {doc.uploadedAt} | {doc.fileSize}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => alert(`Baixando arquivo: ${doc.fileName}`)}
                              className="text-blue-600 hover:text-blue-800 border border-blue-200 hover:bg-blue-50 px-2 py-1 rounded transition text-[10px] uppercase font-bold shrink-0 cursor-pointer"
                            >
                              Baixar
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-450 block mt-2 italic">
                            ⚠️ Nenhum anexo complementar enviado para este item facultativo.
                          </span>
                        )}

                        {/* Reason selection if recusado */}
                        {doc.status === 'recusado' && (
                          <div className="mt-2.5 p-3 bg-red-50/75 border border-red-200/60 rounded-lg text-xs space-y-1">
                            <span className="font-bold text-red-800 block text-[9.5px] uppercase tracking-wide">Motivo da Recusa</span>
                            <p className="text-slate-750">{doc.justificativa || 'Nenhum parecer digitado.'}</p>
                          </div>
                        )}
                      </div>

                      {/* Right: Validation Controls */}
                      {isMyAssignment && (
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button
                              type="button"
                              onClick={() => handleSetDocValidation(doc.id, 'aprovado')}
                              disabled={!isUploaded}
                              className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer ${
                                doc.status === 'aprovado'
                                  ? 'bg-emerald-600 text-white shadow-3xs'
                                  : 'text-slate-600 hover:bg-slate-200'
                              } ${!isUploaded ? 'opacity-40 cursor-not-allowed' : ''}`}
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Validado
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetDocValidation(doc.id, 'recusado')}
                              disabled={!isUploaded}
                              className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer ${
                                doc.status === 'recusado'
                                  ? 'bg-red-600 text-white shadow-3xs'
                                  : 'text-slate-600 hover:bg-slate-200'
                              } ${!isUploaded ? 'opacity-40 cursor-not-allowed' : ''}`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Não Validado
                            </button>
                          </div>

                          {doc.status === 'recusado' && isUploaded && (
                            <textarea
                              rows={1.5}
                              value={doc.justificativa || ''}
                              onChange={(e) => handleSetDocValidation(doc.id, 'recusado', e.target.value)}
                              placeholder="Digite aqui o motivo do erro para correção..."
                              className="w-full text-xs p-2 border border-slate-250 bg-white rounded-lg focus:outline-hidden text-slate-800"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. OUTROS DOCUMENTOS */}
          <div className="space-y-3 pt-4 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                🔧 Outros Documentos ({(solicitacao.outrosDocumentos || []).length})
              </h3>

              {/* Form to add other custom documents */}
              <div className="flex items-center gap-2 max-w-sm w-full">
                <input 
                  type="text"
                  placeholder="Ex: Auto de vistoria, alvará municipal..."
                  value={novoCustomDocNome}
                  onChange={(e) => setNovoCustomDocNome(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-250 rounded-lg text-xs flex-1 focus:ring-1 focus:ring-blue-500 bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddCustomOtherDoc}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold rounded-lg inline-flex items-center gap-1 transition cursor-pointer shrink-0"
                >
                  <Plus className="w-3 h-3 text-white" />
                  + Adicionar Campo
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {(solicitacao.outrosDocumentos || []).length === 0 ? (
                <div className="p-6 border border-dashed border-slate-250 rounded-xl bg-slate-50 text-center text-xs text-slate-500 font-sans">
                  Nenhum documento customizado complementar adicionado ao dossiê.
                </div>
              ) : (
                (solicitacao.outrosDocumentos || []).map((doc) => {
                  const isUploaded = doc.fileName !== undefined;
                  return (
                    <div key={doc.id} className={`p-4 rounded-xl border transition-all ${
                      doc.status === 'recusado' 
                        ? 'border-red-200 bg-red-50/10'
                        : doc.status === 'aprovado'
                          ? 'border-emerald-150 bg-emerald-50/5'
                          : 'border-slate-200 bg-white hover:border-slate-300 shadow-3xs'
                    }`}>
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        
                        {/* Left Info and upload */}
                        <div className="max-w-xl">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="font-extrabold text-slate-805 text-xs font-sans">{doc.nome}</h5>
                            <span className="text-[9px] bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5 uppercase text-indigo-700 font-bold tracking-wider font-mono">Personalizado</span>
                          </div>
                          
                          {isUploaded ? (
                            <div className="mt-2.5 flex items-center gap-2.5 bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-mono">
                              <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-slate-805 block truncate">{doc.fileName}</span>
                                <span className="text-[10px] text-slate-450 block">Anexado em: {doc.uploadedAt} | {doc.fileSize}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => alert(`Baixando: ${doc.fileName}`)}
                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-blue-200 px-2 py-1 rounded text-[10px] uppercase font-bold cursor-pointer"
                              >
                                Baixar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomOtherDoc(doc.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-[10px] font-mono text-slate-450 italic">
                                ⏳ Aguardando anexo físico...
                              </span>
                              <button
                                type="button"
                                onClick={() => handleSimulatedUploadCustomOther(doc.id)}
                                className="px-2.5 py-1 border border-slate-300 text-slate-700 hover:bg-slate-50 text-[10.5px] font-bold rounded-lg cursor-pointer"
                              >
                                Simular Envio
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomOtherDoc(doc.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition cursor-pointer"
                                title="Excluir campo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {doc.status === 'recusado' && (
                            <div className="mt-2.5 p-3 bg-red-50/75 border border-red-200/60 rounded-lg text-xs space-y-1">
                              <span className="font-bold text-red-0 block text-[9.5px] uppercase tracking-wide">Motivo da Recusa</span>
                              <p className="text-slate-750">{doc.justificativa || 'Nenhum parecer digitado.'}</p>
                            </div>
                          )}
                        </div>

                        {/* Right and Controls */}
                        {isMyAssignment && (
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleSetCustomDocValidation(doc.id, 'aprovado')}
                                disabled={!isUploaded}
                                className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer ${
                                  doc.status === 'aprovado'
                                    ? 'bg-emerald-600 text-white shadow-3xs'
                                    : 'text-slate-600 hover:bg-slate-200'
                                } ${!isUploaded ? 'opacity-40 cursor-not-allowed' : ''}`}
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Validado
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetCustomDocValidation(doc.id, 'recusado')}
                                disabled={!isUploaded}
                                className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer ${
                                  doc.status === 'recusado'
                                    ? 'bg-red-600 text-white shadow-3xs'
                                    : 'text-slate-600 hover:bg-slate-200'
                                } ${!isUploaded ? 'opacity-40 cursor-not-allowed' : ''}`}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Não Validado
                              </button>
                            </div>

                            {doc.status === 'recusado' && isUploaded && (
                              <textarea
                                rows={1.5}
                                value={doc.justificativa || ''}
                                onChange={(e) => handleSetCustomDocValidation(doc.id, 'recusado', e.target.value)}
                                placeholder="Digite aqui o motivo do erro para correção..."
                                className="w-full text-xs p-2 border border-slate-250 bg-white rounded-lg focus:outline-hidden text-slate-800"
                              />
                            )}
                          </div>
                        )}

                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Campo de observações de checklist */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-300 space-y-3 font-sans">
            <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs uppercase font-mono">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              Parecer Técnico de Documentos (Agrupamento de Checklist & Anexos)
            </div>
            <textarea
              rows={4}
              value={solicitacao.observacoesAnalistaChecklist || ''}
              onChange={(e) => onUpdate({ ...solicitacao, observacoesAnalistaChecklist: e.target.value })}
              placeholder="Digite aqui considerações consolidadas sobre os laudos técnicos, divergências no DWG do projeto ou orçamento..."
              className="w-full text-xs p-3 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 bg-white leading-relaxed font-sans text-slate-800"
            />
            <p className="text-[10px] text-slate-450">
              💡 Qualquer apontamento feito de forma individual nos documentos reflete na conformidade total que é cobrada antes da geração oficial do PAF.
            </p>
          </div>
        </div>
      )}

      {/* RODAPÉ DE TRANSIÇÃO E CONTROLE DORE UNIFICADO */}
      <div className="border-t border-slate-250 pt-6 mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-5 rounded-xl border">
        <div className="text-xs text-slate-500 font-sans max-w-lg leading-relaxed">
          <span className="font-extrabold text-slate-700 block uppercase font-mono text-[10px] tracking-wide mb-0.5">ESTADO DA AVALIAÇÃO TÉCNICA DORE</span>
          {docPendentes > 0 ? (
            <span className="text-amber-700 font-extrabold text-[11px] block">
              ⚠️ Existem {docPendentes} arquivos do checklist aguardando auditoria ou tomada de decisão do engenheiro responsável.
            </span>
          ) : (
            <span className="text-emerald-700 font-extrabold text-[11px] block">
              ✓ Todos os {docCount} itens instruídos possuem tomada de parecer do engenheiro atribuído.
            </span>
          )}
          Técnico SRE monta o dossiê básico em conformidade com as diretrizes governamentais → DORE realiza triagem analítica profunda finalizando o PAF.
        </div>

        <div className="sm:text-right shrink-0">
          {/* Botões de Transição em Análise Técnica */}
          {perfilUsuario === 'analista_dore' && isMyAssignment && solicitacao.etapaAtual === 'analise' && !hideTransitionButtons && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={finalizarAnaliseDore}
                className={`px-5 py-2.5 rounded-lg text-xs font-black shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer border ${
                  hasRejections
                    ? 'bg-red-600 border-red-600 hover:bg-red-700 text-white'
                    : 'bg-emerald-600 border-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {hasRejections ? (
                  <>
                    <XCircle className="w-4 h-4 text-white animate-pulse" />
                    Retornar com Pendências
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-white" />
                    Aprovar Processo (Avançar para PAF)
                  </>
                )}
              </button>
            </div>
          )}

          {/* Técnico solicitar devolução se aguardando atribuição */}
          {perfilUsuario === 'tecnico_infra' && solicitacao.etapaAtual === 'analise' && !solicitacao.analistaAtribuido && !hideTransitionButtons && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={solicitarDevolucaoProcesso}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ml-auto"
              >
                <RefreshCw className="w-3.5 h-3.5 text-white animate-spin-reverse" />
                Resgatar Atendimento (Devolver)
              </button>
              <p className="text-[9.5px] text-slate-450 max-w-xs font-sans">
                Como nenhum auditor DORE está analisando, você pode puxar de volta para ajustar dados escolares ou reanexar laudos.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
