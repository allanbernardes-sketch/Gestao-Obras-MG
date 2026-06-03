import React, { useState } from 'react';
import { Solicitacao, DocumentoChecklist, EtapaProcesso, syncChecklistDocs } from '../types';
import { X, AlertCircle, FileText, UploadCloud, Trash2, Check, Sparkles, Building, Settings, Landmark, FileSpreadsheet, Layers } from 'lucide-react';

interface EditarSolicitacaoModalProps {
  solicitacao: Solicitacao;
  onClose: () => void;
  onSave: (updated: Solicitacao) => void;
}

export default function EditarSolicitacaoModal({ solicitacao, onClose, onSave }: EditarSolicitacaoModalProps) {
  const [activeTab, setActiveTab] = useState<'dados_escola' | 'dados_atendimento' | 'documentos'>('dados_escola');
  
  // Field States initialized from selected solicitacao
  const [codesc, setCodesc] = useState(solicitacao.codesc || '');
  const [nomeEscola, setNomeEscola] = useState(solicitacao.nomeEscola || '');
  const [municipio, setMunicipio] = useState(solicitacao.municipio || '');
  const [sre, setSre] = useState(solicitacao.sre || '');
  const [formaOcupacao, setFormaOcupacao] = useState(solicitacao.formaOcupacao || 'PRÓPRIO');
  const [predio, setPredio] = useState(solicitacao.predio || 'PRINCIPAL');
  const [tombado, setTombado] = useState(solicitacao.tombado || 'NÃO É TOMBADO');
  const [orgaoTombador, setOrgaoTombador] = useState(solicitacao.orgaoTombador || '');
  const [coabitado, setCoabitado] = useState(solicitacao.coabitado || 'NÃO');
  const [tipoCoabitado, setTipoCoabitado] = useState(solicitacao.tipoCoabitado || '');
  const [notificacao, setNotificacao] = useState(solicitacao.notificacao || 'Não há notificação');
  
  const [tipoObra, setTipoObra] = useState(solicitacao.tipoObra || 'REFORMA');
  const [tipoAtendimento, setTipoAtendimento] = useState(solicitacao.tipoAtendimento || 'NORMAL');
  const [formaAtendimento, setFormaAtendimento] = useState(solicitacao.formaAtendimento || 'VIA CAIXA ESCOLAR');
  const [valorPlanilha, setValorPlanilha] = useState<string>(
    solicitacao.valorPlanilha ? solicitacao.valorPlanilha.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''
  );
  const [iss, setIss] = useState(solicitacao.iss || '5%');
  const [responsavel, setResponsavel] = useState(solicitacao.responsavel || 'Téc. de Infraestrutura');
  const [descricaoFolhaRosto, setDescricaoFolhaRosto] = useState(solicitacao.descricaoFolhaRosto || '');
  const [observacoesFicha, setObservacoesFicha] = useState(solicitacao.observacoesFicha || '');
  const [etapaAtual, setEtapaAtual] = useState<EtapaProcesso>(solicitacao.etapaAtual);

  // Documents state duplicate
  const [documentos, setDocumentos] = useState<DocumentoChecklist[]>(solicitacao.documentos || []);

  const [erro, setErro] = useState('');

  // Sync documents list with changes in notificacao and formaAtendimento when editing
  React.useEffect(() => {
    setDocumentos(prev => {
      const syncedDocs = syncChecklistDocs(prev, notificacao, formaAtendimento);
      const lengthChanged = syncedDocs.length !== prev.length;
      const idsChanged = syncedDocs.some((d, idx) => d.id !== prev[idx]?.id);
      if (lengthChanged || idsChanged) {
        return syncedDocs;
      }
      return prev;
    });
  }, [notificacao, formaAtendimento]);

  // Currency helper formatting
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

  // Document Operations
  const handleSimularUploadDoc = (docId: string, customName: string) => {
    setDocumentos(prev => prev.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          status: 'aprovado' as const,
          fileName: customName,
          fileSize: '1.4 MB',
          uploadedAt: new Date().toISOString().split('T')[0]
        };
      }
      return doc;
    }));
  };

  const handleRealUploadDoc = (docId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocumentos(prev => prev.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          status: 'aprovado' as const,
          fileName: file.name,
          fileSize: file.size > 1024 * 1024 
            ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
            : `${(file.size / 1024).toFixed(0)} KB`,
          uploadedAt: new Date().toISOString().split('T')[0]
        };
      }
      return doc;
    }));
  };

  const handleRemoverDoc = (docId: string) => {
    setDocumentos(prev => prev.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          status: 'pendente' as const,
          fileName: undefined,
          fileSize: undefined,
          uploadedAt: undefined
        };
      }
      return doc;
    }));
  };

  const handleChangeDocStatus = (docId: string, status: 'pendente' | 'aprovado' | 'recusado' | 'nao_se_aplica') => {
    setDocumentos(prev => prev.map(doc => {
      if (doc.id === docId) {
        return { ...doc, status };
      }
      return doc;
    }));
  };

  const handleAnexarTodos = () => {
    const mockFiles = [
      'planilha_orcamento_revisada.xlsx',
      'registro_imovel_matricula.pdf',
      'projeto_reforma_estrutural.dwg',
      'laudo_tecnico_vistoria_dore.pdf',
      'guia_iss_recolhido_pago.pdf'
    ];
    setDocumentos(prev => prev.map((doc, idx) => ({
      ...doc,
      status: 'aprovado' as const,
      fileName: mockFiles[idx] || 'relatorio_tecnico_complementar.pdf',
      fileSize: '1.5 MB',
      uploadedAt: new Date().toISOString().split('T')[0]
    })));
  };

  // Submission handler
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeEscola.trim() || !municipio.trim() || !sre.trim()) {
      setErro('Os campos Nome da Escola, Município e SRE são obrigatórios.');
      return;
    }

    const updatedSolicitacao: Solicitacao = {
      ...solicitacao,
      codesc,
      nomeEscola,
      municipio,
      sre,
      formaOcupacao,
      predio,
      tombado,
      orgaoTombador: tombado !== 'NÃO É TOMBADO' ? (orgaoTombador.toUpperCase() || 'MUNICIPAL') : undefined,
      coabitado: coabitado.toUpperCase(),
      tipoCoabitado: coabitado === 'SIM' ? (tipoCoabitado || 'Coabitado com outra escola Estadual') : undefined,
      tipoObra,
      tipoAtendimento,
      formaAtendimento,
      valorPlanilha: parseBRLToFloat(valorPlanilha),
      iss,
      responsavel,
      descricaoFolhaRosto,
      observacoesFicha,
      etapaAtual,
      notificacao,
      documentos
    };

    onSave(updatedSolicitacao);
  };

  const statusLabels: { [key in EtapaProcesso]: string } = {
    cadastro: 'Atendimento Inicial / Rascunho',
    analise: 'Análise Técnica de Engenharia',
    correcao: 'Correção / Pendência',
    paf_autorizacao: 'Autorização do PAF',
    paf: 'Geração / Homologação PAF',
    ordem_inicio: 'Ordem de Início',
    execucao: 'Execução e Medições',
    cancelado: 'Cancelado / Arquivado'
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto font-sans">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-4xl w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] text-left"
        id="modal-editar-atendimento"
      >
        {/* Header bar */}
        <div className="bg-[#13264d] px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-white/10 rounded-lg">
              <Settings className="w-5 h-5 text-amber-400" />
            </span>
            <div>
              <h3 className="text-sm font-black tracking-wider uppercase">Editar Atendimento</h3>
              <p className="text-[11px] text-slate-100/80 font-medium">Controle Total do Processo: {solicitacao.id}</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 flex shrink-0">
          {[
            { id: 'dados_escola', label: 'Dados Escolares', icon: Building },
            { id: 'dados_atendimento', label: 'Especificação da Obra', icon: Landmark },
            { id: 'documentos', label: 'Checklist & Anexos', icon: FileSpreadsheet }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3.5 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  isActive 
                    ? 'border-blue-600 text-blue-700 font-extrabold' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Container */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {erro && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4.5 h-4.5 shrink-0 text-red-500" />
              <span className="font-semibold">{erro}</span>
            </div>
          )}

          {/* TAB 1: DADOS ESCOLAES/GERAIS */}
          {activeTab === 'dados_escola' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Código CODESC
                  </label>
                  <input
                    type="text"
                    value={codesc}
                    onChange={(e) => setCodesc(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-250 bg-slate-50 text-slate-800 rounded-lg focus:ring-2 focus:ring-blue-550/15 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Nome da Escola Unidade <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nomeEscola}
                    onChange={(e) => setNomeEscola(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-250 bg-white text-slate-800 rounded-lg focus:ring-2 focus:ring-blue-550/15 focus:outline-hidden font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Município <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={municipio}
                    onChange={(e) => setMunicipio(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-250 bg-white text-slate-800 rounded-lg focus:ring-2 focus:ring-blue-550/15 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Superintendência Regional (SRE) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={sre}
                    onChange={(e) => setSre(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-250 bg-white text-slate-800 rounded-lg focus:ring-2 focus:ring-blue-550/15 focus:outline-hidden font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Forma de Ocupação
                  </label>
                  <select
                    value={formaOcupacao}
                    onChange={(e) => setFormaOcupacao(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-250 bg-white text-slate-800 rounded-lg focus:ring-2 focus:ring-blue-550/15 focus:outline-hidden font-medium"
                  >
                    <option value="PRÓPRIO">PRÓPRIO</option>
                    <option value="CESSÃO DE USO">CESSÃO DE USO</option>
                    <option value="LOCADO">LOCADO</option>
                    <option value="OUTRO">OUTRA FORMA DE OCUPAÇÃO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Prédio Afetado
                  </label>
                  <input
                    type="text"
                    value={predio}
                    onChange={(e) => setPredio(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-250 bg-white text-slate-800 rounded-lg focus:ring-2 focus:ring-blue-550/15 focus:outline-hidden"
                    placeholder="Ex: BLOCO PRINCIPAL, COZINHA"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Tombamento
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
                    className="w-full px-3 py-2 text-xs border border-slate-250 bg-white text-slate-800 rounded-lg focus:ring-2 focus:ring-blue-550/15 focus:outline-hidden"
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
                    value={orgaoTombador}
                    onChange={(e) => setOrgaoTombador(e.target.value)}
                    disabled={tombado === 'NÃO É TOMBADO'}
                    className="w-full px-3 py-2 text-xs border border-slate-250 bg-white text-slate-800 rounded-lg focus:ring-2 focus:ring-blue-550/15 focus:outline-hidden disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    {tombado === 'NÃO É TOMBADO' && <option value="">NÃO APLICÁVEL</option>}
                    <option value="MUNICIPAL">MUNICIPAL</option>
                    <option value="ESTADUAL">ESTADUAL</option>
                    <option value="FEDERAL">FEDERAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Imóvel Coabitado?
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
                    className="w-full px-3 py-2 text-xs border border-slate-250 bg-white text-slate-800 rounded-lg focus:ring-2 focus:ring-blue-550/15 focus:outline-hidden"
                  >
                    <option value="NÃO">NÃO</option>
                    <option value="SIM">SIM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Tipo de Coabitação
                  </label>
                  <select
                    value={tipoCoabitado}
                    onChange={(e) => setTipoCoabitado(e.target.value)}
                    disabled={coabitado === 'NÃO'}
                    className="w-full px-3 py-2 text-xs border border-slate-250 bg-white text-slate-800 rounded-lg focus:ring-2 focus:ring-blue-550/15 focus:outline-hidden disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    {coabitado === 'NÃO' && <option value="">NÃO APLICÁVEL</option>}
                    <option value="Coabitado com outra escola Estadual">Coabitado com outra escola Estadual</option>
                    <option value="Coabitado com outra escola municipal">Coabitado com outra escola municipal</option>
                    <option value="Coabitado com outro órgão estadual">Coabitado com outro órgão estadual</option>
                    <option value="Coabitado com outro órgão municipal">Coabitado com outro órgão municipal</option>
                    <option value="Coabitado com instituto federal">Coabitado com instituto federal</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Há alguma notificação?
                  </label>
                  <select
                    value={notificacao || 'Não há notificação'}
                    onChange={(e) => setNotificacao(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-250 bg-white text-slate-800 rounded-lg focus:ring-2 focus:ring-blue-550/15 focus:outline-hidden cursor-pointer"
                  >
                    <option value="Não há notificação">Não há notificação</option>
                    <option value="Ministério Publico">Ministério Publico</option>
                    <option value="Prefeitura">Prefeitura</option>
                    <option value="Defesa Civil">Defesa Civil</option>
                    <option value="TCE">TCE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-slate-400" /> Etapa Atual / Status
                  </label>
                  <select
                    value={etapaAtual}
                    disabled={true}
                    className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-100 text-slate-500 font-bold rounded-lg cursor-not-allowed"
                  >
                    {Object.entries(statusLabels).map(([key, value]) => (
                      <option key={key} value={key}>{value}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1 italic">
                    A Etapa Atual não pode ser alterada manualmente na edição.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ESPECIFICAÇÕES DA OBRA */}
          {activeTab === 'dados_atendimento' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Natureza da Obra
                  </label>
                  <select
                    value={tipoObra}
                    onChange={(e) => setTipoObra(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-250 bg-white text-slate-800 rounded-lg focus:ring-2 focus:ring-blue-550/15 focus:outline-hidden"
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
                    Tipo de Atendimento
                  </label>
                  <select
                    value={tipoAtendimento}
                    onChange={(e) => setTipoAtendimento(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-250 bg-white text-slate-800 rounded-lg focus:ring-2 focus:ring-blue-550/15 focus:outline-hidden"
                  >
                    <option value="NORMAL">NORMAL</option>
                    <option value="EMERGENCIAL">EMERGENCIAL</option>
                    <option value="EMENDA">EMENDA</option>
                    <option value="SOE">SOE</option>
                    <option value="PDDE">PDDE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Via Administrativa de Repasse
                  </label>
                  <select
                    value={formaAtendimento}
                    onChange={(e) => setFormaAtendimento(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-250 bg-white text-slate-800 rounded-lg focus:ring-2 focus:ring-blue-550/15 focus:outline-hidden"
                  >
                    <option value="VIA CAIXA ESCOLAR">VIA CAIXA ESCOLAR</option>
                    <option value="SEM ÔNUS">SEM ÔNUS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Valor Estimado (R$)
                  </label>
                  <input
                    type="text"
                    value={valorPlanilha}
                    onChange={handleValorChange}
                    placeholder="R$ 0,00"
                    className="w-full px-3 py-2 text-xs border border-slate-250 bg-white text-slate-800 rounded-lg focus:ring-2 focus:ring-blue-550/15 focus:outline-hidden font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Alíquota ISS Estimado
                  </label>
                  <input
                    type="text"
                    value={iss}
                    onChange={(e) => setIss(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-250 bg-white text-slate-800 rounded-lg focus:ring-2 focus:ring-blue-550/15 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Técnico Responsável
                  </label>
                  <input
                    type="text"
                    value={responsavel}
                    onChange={(e) => setResponsavel(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-250 bg-white text-slate-800 rounded-lg focus:ring-2 focus:ring-blue-550/15 focus:outline-hidden font-semibold"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Descrição Técnica Geral (Folha de Rosto)
                  </label>
                  <textarea
                    rows={2}
                    value={descricaoFolhaRosto}
                    onChange={(e) => setDescricaoFolhaRosto(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-250 bg-white text-slate-800 rounded-lg focus:ring-2 focus:ring-blue-550/15 focus:shadow-xs focus:outline-hidden font-medium"
                    placeholder="Descreva as patologias, sinistros e soluções físicas necessárias de engenharia..."
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Observações e Notas Internas
                  </label>
                  <textarea
                    rows={2}
                    value={observacoesFicha}
                    onChange={(e) => setObservacoesFicha(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-250 bg-white text-slate-800 rounded-lg focus:ring-2 focus:ring-blue-550/15 focus:shadow-xs focus:outline-hidden"
                    placeholder="Anotações internas acessíveis à engenharia ou DORE..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CHECKLIST & DOCUMENTOS ANEXOS */}
          {activeTab === 'documentos' && (
            <div className="space-y-4 animate-in fade-in duration-150 text-left">
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-150 rounded-xl mb-4">
                <div className="text-left">
                  <p className="text-xs font-extrabold text-blue-900">Gerenciamento Técnico de Anexos</p>
                  <p className="text-[10.5px] text-blue-700">Edite o status de cada peça documental e anexe arquivos simulados ou reais no banco local.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAnexarTodos}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[9.5px] uppercase tracking-wider rounded-lg transition-all"
                >
                  Carregar Todos
                </button>
              </div>

              <div className="space-y-3.5">
                {documentos.map((doc, idx) => {
                  const isUploaded = doc.fileName !== undefined;
                  return (
                    <div 
                      key={doc.id} 
                      className={`p-3.5 rounded-xl border transition-all ${
                        isUploaded 
                          ? 'border-emerald-200 bg-emerald-50/5'
                          : 'border-slate-200 hover:border-slate-350 bg-white shadow-3xs'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-left">
                        {/* Doc Details */}
                        <div className="max-w-xl text-left">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                              Item {idx + 1}
                            </span>
                            <h4 className="font-sans font-extrabold text-slate-800 text-xs">
                              {doc.nome}
                            </h4>
                            {doc.obrigatorio ? (
                              <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">[Obrigatório]</span>
                            ) : (
                              <span className="text-[9px] font-medium text-slate-400 capitalize">Opcional</span>
                            )}
                          </div>
                          
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {doc.desc}
                          </p>

                          {/* Render Uploaded File info */}
                          {isUploaded && (
                            <div className="mt-2 flex items-center gap-1.5 bg-slate-50 border border-slate-150 p-2 rounded-lg text-xs font-mono">
                              <FileText className="w-4.5 h-4.5 text-blue-500 shrink-0" />
                              <div className="min-w-0 flex-1 text-left">
                                <span className="font-bold text-slate-800 block truncate text-[11px]">{doc.fileName}</span>
                                <span className="text-[9.5px] text-slate-400 block">Tamanho: {doc.fileSize} | Anexado em: {doc.uploadedAt}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoverDoc(doc.id)}
                                className="text-red-500 hover:text-red-700 p-1 rounded-sm cursor-pointer"
                                title="Remover anexo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          {/* Status Badge Select */}
                          <select
                            value={doc.status}
                            onChange={(e) => handleChangeDocStatus(doc.id, e.target.value as any)}
                            className="bg-white border border-slate-220 rounded-md text-[10.5px] font-bold py-1 px-1.5 text-slate-700"
                          >
                            <option value="pendente">Pendente</option>
                            <option value="aprovado">Anotado / Aprovado</option>
                            <option value="recusado">Recusado com Glosa</option>
                            <option value="nao_se_aplica">Não se Aplica</option>
                          </select>

                          {/* Quick simulation / trigger */}
                          <input 
                            type="file"
                            id={`edit-file-${doc.id}`}
                            className="hidden"
                            onChange={(e) => handleRealUploadDoc(doc.id, e)}
                          />

                          <button
                            type="button"
                            onClick={() => {
                              const input = document.getElementById(`edit-file-${doc.id}`);
                              if (input) input.click();
                            }}
                            className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-225 text-slate-700 text-[10.5px] font-bold rounded-md flex items-center gap-1.5 shadow-3xs cursor-pointer"
                          >
                            <UploadCloud className="w-3.5 h-3.5 text-slate-550" />
                            <span>{isUploaded ? 'Substituir' : 'Anexar'}</span>
                          </button>

                          {!isUploaded && (
                            <button
                              type="button"
                              onClick={() => handleSimularUploadDoc(doc.id, `doc_analise_rev_${doc.nome.toLowerCase().replace(/\s+/g, '_')}.pdf`)}
                              className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-150 rounded-lg text-[10px] font-bold"
                            >
                              Auto-Simular
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </form>

        {/* Footer actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200/80 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-250 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            Sair sem Salvar
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-1 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Salvar Alterações do Atendimento</span>
          </button>
        </div>
      </div>
    </div>
  );
}
