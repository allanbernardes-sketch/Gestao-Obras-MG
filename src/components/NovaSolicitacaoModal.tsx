import React, { useState, useEffect } from 'react';
import { Solicitacao, DocumentoChecklist, syncChecklistDocs } from '../types';
import { CHECKLIST_PADRAO } from '../initialData';
import { useEscolas, type EnderecoEscola } from '../hooks/useEscolas';
import { X, AlertCircle, Database, FileText, CheckCircle2 } from 'lucide-react';

interface NovaSolicitacaoModalProps {
  onClose: () => void;
  onSave: (nova: Solicitacao) => void;
  perfilUsuario?: string;
  usuariosSeguranca?: { id: string; nome: string; perfil: string; depto?: string }[];
  sreDoTecnico?: string;
}

export default function NovaSolicitacaoModal({ onClose, onSave, perfilUsuario, usuariosSeguranca, sreDoTecnico }: NovaSolicitacaoModalProps) {
  const { escolas, buscarEnderecos, carregando: carregandoEscolas } = useEscolas();
  const baseDadosFiltrados = sreDoTecnico
    ? escolas.filter(item => item.sre.toLowerCase() === sreDoTecnico.toLowerCase())
    : escolas;
  const [enderecosDisponiveis, setEnderecosDisponiveis] = useState<EnderecoEscola[]>([]);
  const [codesc, setCodesc] = useState('');
  const [nomeEscola, setNomeEscola] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [sre, setSre] = useState('');

  // Pré-preenche a SRE do técnico ao abrir
  useEffect(() => {
    if (sreDoTecnico) setSre(sreDoTecnico);
  }, [sreDoTecnico]);

  // Busca endereços do CODESC informado
  useEffect(() => {
    let ativo = true;
    if (!codesc.trim()) {
      setEnderecosDisponiveis([]);
      return;
    }
    buscarEnderecos(codesc.trim()).then(res => {
      if (ativo) setEnderecosDisponiveis(res);
    });
    return () => { ativo = false; };
  }, [codesc, buscarEnderecos]);

  // Custom states
  const [codigoEndereco, setCodigoEndereco] = useState('');
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
  const [formaAtendimento, setFormaAtendimento] = useState('VIA CAIXA ESCOLAR');
  // Classificação da Demanda
  const [origemDemanda, setOrigemDemanda] = useState('');
  const [orgaoEmissorNotificacao, setOrgaoEmissorNotificacao] = useState('');
  const [numeroNotificacao, setNumeroNotificacao] = useState('');
  const [dataNotificacao, setDataNotificacao] = useState('');
  const [prazoAtendimentoNotificacao, setPrazoAtendimentoNotificacao] = useState('');
  const [grauPrioridade, setGrauPrioridade] = useState('');
  // Saldo de PAF anterior cancelado
  const [usaSaldoPafAnterior, setUsaSaldoPafAnterior] = useState<'Sim' | 'Não'>('Não');
  const [numeroPafAnteriorCancelado, setNumeroPafAnteriorCancelado] = useState('');
  const [valorSaldoPafAnterior, setValorSaldoPafAnterior] = useState('');
  const [descricaoFolhaRosto, setDescricaoFolhaRosto] = useState('');
  const [valorPlanilha, setValorPlanilha] = useState('');
  const [iss, setIss] = useState('');

  const activeUser = usuariosSeguranca?.find(u => u.perfil === perfilUsuario);
  const responsavel = activeUser ? activeUser.nome : 'João Paulo Penfield';

  const [erro, setErro] = useState('');
  const [codescTouched, setCodescTouched] = useState(false);
  const [tentouSubmeter, setTentouSubmeter] = useState(false);

  const codescNaoEncontrado = codesc.trim().length > 0 && !baseDadosFiltrados.some(item => item.codesc === codesc.trim());
  const fieldErrorClass = 'border-red-400 bg-red-50/30';

  // Handle CODESC change — limpa endereço e dados da escola
  const handleCodescChange = (val: string) => {
    setCodesc(val);
    setCodigoEndereco('');
    setNomeEscola('');
    setMunicipio('');
    if (perfilUsuario !== 'tecnico_infra') setSre('');
  };

  // Handle endereço change — preenche dados da escola pelo CODESC
  const handleEnderecoChange = (val: string, currentCodesc: string) => {
    setCodigoEndereco(val);
    const match = baseDadosFiltrados.find(item => item.codesc === currentCodesc.trim());
    if (match) {
      setNomeEscola(match.nome);
      setMunicipio(match.municipio);
      if (perfilUsuario !== 'tecnico_infra') setSre(match.sre);
    }
  };

  // Safe import button
  const preencherDados = (item: typeof escolas[0]) => {
    setCodesc(item.codesc);
    setNomeEscola(item.nome);
    setMunicipio(item.municipio);
    setSre(item.sre);
    setErro('');
  };

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

  const handleIssChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/\D/g, '');
    setIss(clean);
  };

  const handleIssBlur = () => {
    if (iss && !iss.includes('%')) {
      setIss(`${iss}%`);
    }
  };

  const handleIssFocus = () => {
    if (iss) {
      setIss(iss.replace('%', ''));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTentouSubmeter(true);
    if (
      !nomeEscola.trim() ||
      !codesc.trim() ||
      codescNaoEncontrado ||
      !municipio.trim() ||
      !sre.trim() ||
      !descricaoFolhaRosto.trim() ||
      !valorPlanilha.trim() ||
      !iss.trim() ||
      (formaOcupacao === 'OUTRO' && !outraFormaOcupacao.trim()) ||
      (tipoAtendimento === 'EMENDA' && (!numPaf.trim() || !anoEmenda.trim())) ||
      (origemDemanda === 'Notificação' && (!numeroNotificacao.trim() || !dataNotificacao.trim() || !prazoAtendimentoNotificacao.trim())) ||
      (usaSaldoPafAnterior === 'Sim' && (!numeroPafAnteriorCancelado.trim() || !valorSaldoPafAnterior.trim()))
    ) {
      setErro('Por favor, preencha todos os campos do formulário para criar a nova solicitação.');
      return;
    }

    const baseChecklist: DocumentoChecklist[] = CHECKLIST_PADRAO.map(doc => ({
      ...doc,
      status: 'pendente',
      fileName: undefined,
      fileSize: undefined,
      uploadedAt: undefined,
      justificativa: undefined
    }));

    const checklistReset = syncChecklistDocs(baseChecklist, origemDemanda, formaAtendimento);

    const nova: Solicitacao = {
      id: `SOL-2026-${Math.floor(100 + Math.random() * 900)}`,
      nomeEscola,
      codesc,
      tipo: tipoObra, // Matches standard 'tipo' with the select value
      municipio,
      sre,
      dataCriacao: new Date().toISOString().split('T')[0],
      etapaAtual: 'cadastro',
      historicoEtapas: [
        { etapa: 'cadastro', data: new Date().toISOString().split('T')[0], responsavel: responsavel || 'Téc. de Infraestrutura' }
      ],
      documentos: checklistReset,
      medicoes: [],
      aditivos: [],

      // Extended fields
      codigoEndereco: codigoEndereco.trim() || undefined,
      formaOcupacao: formaOcupacao === 'OUTRO' ? `OUTRO (${outraFormaOcupacao.trim().toUpperCase()})` : formaOcupacao,
      seiMinutaOcupacao: formaOcupacao === 'OUTRO' ? seiMinutaOcupacao.trim() || undefined : undefined,
      predio: predio.toUpperCase(),
      tipoObra,
      tipoAtendimento,
      numPaf: tipoAtendimento === 'EMENDA' ? numPaf.trim().toUpperCase() : undefined,
      anoEmenda: tipoAtendimento === 'EMENDA' ? anoEmenda.trim() : undefined,
      formaAtendimento,
      origemDemanda: origemDemanda || undefined,
      orgaoEmissorNotificacao: origemDemanda === 'Notificação' ? orgaoEmissorNotificacao || undefined : undefined,
      numeroNotificacao: origemDemanda === 'Notificação' ? numeroNotificacao || undefined : undefined,
      dataNotificacao: origemDemanda === 'Notificação' ? dataNotificacao || undefined : undefined,
      prazoAtendimentoNotificacao: origemDemanda === 'Notificação' ? prazoAtendimentoNotificacao || undefined : undefined,
      grauPrioridade: grauPrioridade as any || undefined,
      descricaoFolhaRosto,
      valorPlanilha: valorPlanilha ? parseBRLToFloat(valorPlanilha) : undefined,
      iss,
      responsavel,
      tombado: tombado.toUpperCase(),
      orgaoTombador: tombado !== 'NÃO É TOMBADO' ? (orgaoTombador.toUpperCase() || 'MUNICIPAL') : undefined,
      coabitado: coabitado.toUpperCase(),
      tipoCoabitado: coabitado === 'SIM' ? (tipoCoabitado || 'Coabitado com outra escola Estadual') : undefined,
      usaSaldoPafAnterior,
      numeroPafAnteriorCancelado: usaSaldoPafAnterior === 'Sim' ? numeroPafAnteriorCancelado.trim().toUpperCase() : undefined,
      valorSaldoPafAnterior: usaSaldoPafAnterior === 'Sim' ? parseBRLToFloat(valorSaldoPafAnterior) : undefined,
      necessidadeAditivoEstimada: usaSaldoPafAnterior === 'Sim'
        ? Math.max(0, (parseBRLToFloat(valorPlanilha) ?? 0) - (parseBRLToFloat(valorSaldoPafAnterior) ?? 0))
        : undefined
    };

    onSave(nova);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl border border-slate-205 max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/75 shrink-0">
          <div>
            <h3 className="font-display text-base sm:text-lg font-bold text-slate-800">Nova Solicitação de Atendimento</h3>
            <p className="text-xs text-slate-500">Cadastre uma nova demanda escolar de infraestrutura.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Container (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* SECTION 1: Identificação Escolar */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-4">
            <h4 className="text-xs font-bold text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-1.5 uppercase tracking-wider font-mono">
              <Database className="w-4 h-4 text-blue-500" />
              1. Identificação Escolar
              {carregandoEscolas && <span className="text-[10px] text-slate-400 normal-case font-normal ml-1">(carregando escolas...)</span>}
            </h4>

            {/* Passo 1: CODESC + Código do Endereço lado a lado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Código CODESC *
                </label>
                <input
                  type="text"
                  placeholder="Digite ex: 145236..."
                  value={codesc}
                  onChange={(e) => handleCodescChange(e.target.value)}
                  onBlur={() => setCodescTouched(true)}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-550 transition-all font-sans font-mono font-medium ${
                    (codescTouched && codescNaoEncontrado) || (tentouSubmeter && !codesc.trim())
                      ? fieldErrorClass
                      : 'border-slate-200'
                  }`}
                  required
                />
                {codescTouched && codescNaoEncontrado && (
                  <span className="text-[10px] text-red-600 font-semibold block mt-1">
                    Escola não encontrada para este código. Verifique o CODESC informado.
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Código do Endereço *
                  {!codesc && <span className="text-slate-300 font-normal normal-case ml-1">(selecione o CODESC primeiro)</span>}
                </label>
                <select
                  required
                  disabled={!codesc}
                  value={codigoEndereco}
                  onChange={(e) => handleEnderecoChange(e.target.value, codesc)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-550 bg-white font-mono text-slate-800 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <option value="">Selecione o endereço...</option>
                  {enderecosDisponiveis.map(e => (
                    <option key={e.codigoEndereco} value={e.codigoEndereco}>
                      {e.codigoEndereco} — {e.descricao}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Passo 2: dados preenchidos automaticamente */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nome da Escola</label>
                <div className={`w-full px-3 py-2 text-sm border rounded-lg font-semibold ${nomeEscola ? 'border-emerald-200 bg-emerald-50/30 text-slate-800' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                  {nomeEscola || 'Preenchido automaticamente ao selecionar o endereço'}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Município</label>
                <div className={`w-full px-3 py-2 text-sm border rounded-lg font-semibold ${municipio ? 'border-emerald-200 bg-emerald-50/30 text-slate-800' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                  {municipio || '—'}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Superintendência SRE</label>
                {perfilUsuario === 'tecnico_infra' ? (
                  <div className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-100 text-slate-700 font-semibold flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 uppercase font-sans shrink-0">Sua regional:</span>
                    {sre}
                  </div>
                ) : (
                  <div className={`w-full px-3 py-2 text-sm border rounded-lg font-semibold ${sre ? 'border-emerald-200 bg-emerald-50/30 text-slate-800' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                    {sre || '—'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: Dados de Ocupação */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <h4 className="text-xs font-bold text-slate-700 border-b border-slate-100 pb-2 uppercase tracking-wider font-mono">
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
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-550 bg-white transition-all font-sans cursor-pointer text-slate-705 font-medium"
              >
                <option value="PRÓPRIO">PRÓPRIO</option>
                <option value="ALUGADO">ALUGADO</option>
                <option value="CEDIDO">CEDIDO</option>
                <option value="OUTRO">OUTRO</option>
              </select>
            </div>

            {formaOcupacao === 'OUTRO' && (
              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-250">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Explique a Outra Forma de Ocupação *
                  </label>
                  <input
                    type="text"
                    placeholder="Por favor, explique a forma de ocupação do imóvel..."
                    value={outraFormaOcupacao}
                    onChange={(e) => setOutraFormaOcupacao(e.target.value)}
                    className={`w-full px-3 py-2 text-sm border bg-blue-50/10 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-550 transition-all font-sans outline-hidden ${
                      tentouSubmeter && !outraFormaOcupacao.trim() ? fieldErrorClass : 'border-blue-200'
                    }`}
                    required
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
                    className="w-full px-3 py-2 text-sm border border-blue-200 bg-blue-50/10 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-550 transition-all font-mono outline-hidden"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                O imóvel é tombado pelo patrimônio histórico? *
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
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-550 bg-white transition-all font-sans cursor-pointer text-slate-705 font-medium"
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
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-550 bg-white transition-all font-sans cursor-pointer text-slate-705 font-medium disabled:bg-slate-50 disabled:text-slate-400"
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
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-550 bg-white transition-all font-sans cursor-pointer text-slate-705 font-medium"
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
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-550 bg-white transition-all font-sans cursor-pointer text-slate-705 font-medium disabled:bg-slate-50 disabled:text-slate-400"
              >
                {coabitado === 'NÃO' && <option value="">NÃO APLICÁVEL</option>}
                <option value="Coabitado com outra escola Estadual">Coabitado com outra escola Estadual</option>
                <option value="Coabitado com outra escola municipal">Coabitado com outra escola municipal</option>
                <option value="Coabitado com outro órgão estadual">Coabitado com outro órgão estadual</option>
                <option value="Coabitado com outro órgão municipal">Coabitado com outro órgão municipal</option>
                <option value="Coabitado com instituto federal">Coabitado com instituto federal</option>
              </select>
            </div>

          </div>

          {/* SECTION 3: Tipo de Obra, Atendimento e Origem da Demanda */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-4">
            <h4 className="text-xs font-bold text-slate-700 border-b border-slate-100 pb-2 uppercase tracking-wider font-mono">
              3. Tipo de Obra e Atendimento
            </h4>

            {/* Origem da Demanda — integrada ao bloco de detalhamento */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Origem da Demanda *</label>
              <select value={origemDemanda} onChange={(e) => setOrigemDemanda(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-550 bg-white transition-all font-sans cursor-pointer text-slate-705 font-medium">
                <option value="">Selecione a origem...</option>
                {['Solicitação da Escola', 'Solicitação da SRE', 'Programa Governamental', 'Fiscalização', 'Notificação', 'Determinação Judicial', 'Atendimento Político'].map(op => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
            </div>

            {/* Saldo de PAF anterior cancelado — sempre visível */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Este Atendimento Precisará de liberação financeira? *
                </label>
                <div className="flex gap-4">
                  {(['Não', 'Sim'] as const).map(op => (
                    <label key={op} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="radio"
                        name="usaSaldoPafAnterior"
                        checked={usaSaldoPafAnterior === op}
                        onChange={() => setUsaSaldoPafAnterior(op)}
                        className="rounded-full text-blue-600"
                      />
                      <span>{op}</span>
                    </label>
                  ))}
                </div>
              </div>

              {usaSaldoPafAnterior === 'Sim' && (
                <>
                  <div className="animate-in slide-in-from-top-2 duration-150">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Número do PAF Anterior Cancelado *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 512/G-2025"
                      value={numeroPafAnteriorCancelado}
                      onChange={(e) => setNumeroPafAnteriorCancelado(e.target.value)}
                      className={`w-full px-3 py-2 text-sm border rounded-lg bg-white font-mono ${
                        tentouSubmeter && !numeroPafAnteriorCancelado.trim() ? fieldErrorClass : 'border-slate-200'
                      }`}
                    />
                  </div>
                  <div className="animate-in slide-in-from-top-2 duration-150">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Valor em Conta (Saldo Disponível) (R$) *
                    </label>
                    <input
                      type="text"
                      placeholder="R$ 0,00"
                      value={valorSaldoPafAnterior}
                      onChange={(e) => setValorSaldoPafAnterior(formatBRL(e.target.value))}
                      className={`w-full px-3 py-2 text-sm border rounded-lg bg-white font-mono ${
                        tentouSubmeter && !valorSaldoPafAnterior.trim() ? fieldErrorClass : 'border-slate-200'
                      }`}
                    />
                  </div>
                </>
              )}
            </div>

            {origemDemanda === 'Notificação' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl animate-in slide-in-from-top-2 duration-150">
                <div className="sm:col-span-2 text-[10px] font-black text-amber-800 uppercase tracking-wider">Detalhes da Notificação</div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Órgão Emissor *</label>
                  <select value={orgaoEmissorNotificacao} onChange={(e) => setOrgaoEmissorNotificacao(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white cursor-pointer font-medium text-slate-800">
                    <option value="">Selecione...</option>
                    {['Ministério Público', 'Defesa Civil', 'Corpo de Bombeiros', 'Prefeitura', 'TCE', 'CGE', 'Vigilância Sanitária', 'Outro'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Grau de Prioridade *</label>
                  <select value={grauPrioridade} onChange={(e) => setGrauPrioridade(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white cursor-pointer font-medium text-slate-800">
                    <option value="">Selecione...</option>
                    {['Crítico', 'Alto', 'Médio', 'Baixo'].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Número da Notificação *</label>
                  <input type="text" placeholder="Ex: NOT-2026/001" value={numeroNotificacao} onChange={(e) => setNumeroNotificacao(e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-white ${tentouSubmeter && !numeroNotificacao.trim() ? fieldErrorClass : 'border-slate-200'}`} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Data da Notificação *</label>
                  <input type="date" value={dataNotificacao} onChange={(e) => setDataNotificacao(e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-white ${tentouSubmeter && !dataNotificacao.trim() ? fieldErrorClass : 'border-slate-200'}`} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Prazo para Atendimento *</label>
                  <input type="date" value={prazoAtendimentoNotificacao} onChange={(e) => setPrazoAtendimentoNotificacao(e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-white ${tentouSubmeter && !prazoAtendimentoNotificacao.trim() ? fieldErrorClass : 'border-slate-200'}`} />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                TIPO DE OBRA *
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  'AMPLIAÇÃO', 
                  'REFORMA', 
                  'QUADRA', 
                  'ACESSIBILIDADE', 
                  'CONSTRUÇÃO', 
                  'ENGENHEIRO PARA ELABORAÇÃO DE PROJETO'
                ].map((item) => (
                  <label 
                    key={item} 
                    className={`flex items-start gap-2 p-2 border rounded-lg cursor-pointer transition-colors ${
                      tipoObra === item 
                        ? 'bg-blue-50/70 border-blue-400 text-blue-900 font-semibold' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="tipoObra"
                      checked={tipoObra === item}
                      onChange={() => setTipoObra(item)}
                      className="mt-0.5" 
                    />
                    <span className="leading-tight">{item}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  TIPO DE ATENDIMENTO *
                </label>
                <div className="flex flex-col gap-1.5 border border-slate-200 rounded-lg p-3 bg-white">
                  {['NORMAL', 'EMERGENCIAL', 'EMENDA', 'SOE', 'PDDE', 'ESPECIAL'].map((item) => (
                    <label key={item} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                      <input 
                        type="radio" 
                        name="tipoAtendimento"
                        checked={tipoAtendimento === item}
                        onChange={() => setTipoAtendimento(item)}
                        className="rounded-full text-blue-600"
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  FORMA DE ATENDIMENTO *
                </label>
                <div className="flex flex-col gap-1.5 border border-slate-200 rounded-lg p-3 bg-white">
                  {['VIA CAIXA ESCOLAR', 'SEM ÔNUS'].map((item) => (
                    <label key={item} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                      <input 
                        type="radio" 
                        name="formaAtendimento"
                        checked={formaAtendimento === item}
                        onChange={() => setFormaAtendimento(item)}
                        className="rounded-full text-blue-600"
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {tipoAtendimento === 'EMENDA' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 animate-in slide-in-from-top-2 duration-250">
                <div className="sm:col-span-2">
                  <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block font-sans">
                    Detalhamento da Emenda Parlamentar *
                  </span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Ano da Emenda *
                  </label>
                  <select
                    value={anoEmenda}
                    onChange={(e) => setAnoEmenda(e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-550 bg-white transition-all font-sans cursor-pointer text-slate-705 font-medium ${
                      tentouSubmeter && !anoEmenda.trim() ? fieldErrorClass : 'border-slate-200'
                    }`}
                    required
                  >
                    <option value="">Selecione o ano...</option>
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                    <option value="2022">2022</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Número do PAF *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 512/G-EMENDA"
                    value={numPaf}
                    onChange={(e) => setNumPaf(e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-550 transition-all font-sans font-mono ${
                      tentouSubmeter && !numPaf.trim() ? fieldErrorClass : 'border-slate-200'
                    }`}
                    required
                  />
                </div>
              </div>
            )}

            <div className="mt-4">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                DESCRIÇÃO DA FOLHA DE ROSTO *
              </label>
              <textarea
                placeholder="Insira a descrição detalhada do escopo ou serviços para a folha de rosto..."
                value={descricaoFolhaRosto}
                onChange={(e) => setDescricaoFolhaRosto(e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-550 transition-all font-sans ${
                  tentouSubmeter && !descricaoFolhaRosto.trim() ? fieldErrorClass : 'border-slate-200'
                }`}
                required
              />
            </div>
          </div>

          {/* SECTION 4: Finanças e Escopo Detalhado */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-4">
            <h4 className="text-xs font-bold text-slate-700 border-b border-slate-100 pb-2 uppercase tracking-wider font-mono">
              4. Dados Técnicos e Financeiros da Folha de Rosto
            </h4>

             <div className="grid grid-cols-2 gap-3">
               <div>
                 <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                   VALOR DA PLANILHA (R$) *
                 </label>
                 <input
                   type="text"
                   placeholder="R$ 0,00"
                   value={valorPlanilha}
                   onChange={handleValorChange}
                   className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-550 transition-all font-sans font-mono ${
                     tentouSubmeter && !valorPlanilha.trim() ? fieldErrorClass : 'border-slate-200'
                   }`}
                   required
                 />
               </div>

               <div>
                 <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                   ISS (%) *
                 </label>
                 <input
                   type="text"
                   placeholder="Ex: 5"
                   value={iss}
                   onChange={handleIssChange}
                   onFocus={handleIssFocus}
                   onBlur={handleIssBlur}
                   className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-550 transition-all font-sans font-mono ${
                     tentouSubmeter && !iss.trim() ? fieldErrorClass : 'border-slate-200'
                   }`}
                   required
                 />
               </div>
             </div>

             {usaSaldoPafAnterior === 'Sim' && valorPlanilha.trim() && valorSaldoPafAnterior.trim() && (() => {
               const planilhaFloat = parseBRLToFloat(valorPlanilha) ?? 0;
               const saldoFloat = parseBRLToFloat(valorSaldoPafAnterior) ?? 0;
               const diferenca = planilhaFloat - saldoFloat;
               const precisaAditivo = diferenca > 0;
               return (
                 <div className={`text-xs p-3 rounded-lg border flex items-start gap-2 ${
                   precisaAditivo ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                 }`}>
                   <span className="font-bold shrink-0">{precisaAditivo ? '⚠️' : '✓'}</span>
                   {precisaAditivo ? (
                     <span>
                       Será necessário aditivo estimado de{' '}
                       <strong>{diferenca.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>{' '}
                       (planilha {planilhaFloat.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} excede o saldo disponível de{' '}
                       {saldoFloat.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}).
                     </span>
                   ) : (
                     <span>O saldo do PAF anterior cobre o valor da planilha. Aditivo não necessário.</span>
                   )}
                 </div>
               );
             })()}
          </div>

          <div className="text-xs text-slate-500 bg-blue-50/50 p-3 rounded-lg border border-blue-100 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <span>Tudo pronto! Ao salvar, a demanda entrará na etapa "Atendimento Inicial" necessitando do checklist de documentos técnicos e projetos.</span>
          </div>
        </form>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-55 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer text-slate-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-xs focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
          >
            Criar Solicitação
          </button>
        </div>

      </div>
    </div>
  );
}
