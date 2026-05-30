import React, { useState } from 'react';
import { Solicitacao, DocumentoChecklist, syncChecklistDocs } from '../types';
import { CHECKLIST_PADRAO } from '../initialData';
import { X, AlertCircle, Database, FileText, CheckCircle2 } from 'lucide-react';

interface NovaSolicitacaoModalProps {
  onClose: () => void;
  onSave: (nova: Solicitacao) => void;
  perfilUsuario?: string;
  usuariosSeguranca?: { id: string; nome: string; perfil: string; depto?: string }[];
}

const baseDados = [
  { codesc: '1902', sre: 'SRE METROPOLITANA B', municipio: 'BELO HORIZONTE', escola: 'EE PROFESSORA MARIA BELMIRA TRINDADE' },
  { codesc: '106470', sre: 'SRE OURO PRETO', municipio: 'OURO PRETO', escola: 'EE DOM VELLOSO' },
  { codesc: '205', sre: 'SRE METROPOLITANA C', municipio: 'BELO HORIZONTE', escola: 'EE PROFESSORA FRANCISCA MALHEIROS' },
  { codesc: '1821', sre: 'SRE METROPOLITANA A', municipio: 'BELO HORIZONTE', escola: 'EE PROFESSORA MARIA AMÉLIA GUIMARÃES' },
  { codesc: '1104', sre: 'SRE METROPOLITANA B', municipio: 'BELO HORIZONTE', escola: 'EE PROFESSOR FRANCISCO BRANT' }
];

export default function NovaSolicitacaoModal({ onClose, onSave, perfilUsuario, usuariosSeguranca }: NovaSolicitacaoModalProps) {
  const [codesc, setCodesc] = useState('');
  const [nomeEscola, setNomeEscola] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [sre, setSre] = useState('');
  
  // Custom states
  const [formaOcupacao, setFormaOcupacao] = useState('PRÓPRIO');
  const [outraFormaOcupacao, setOutraFormaOcupacao] = useState('');
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
  const [notificacao, setNotificacao] = useState('Não há notificação');
  const [descricaoFolhaRosto, setDescricaoFolhaRosto] = useState('');
  const [valorPlanilha, setValorPlanilha] = useState('');
  const [iss, setIss] = useState('');
  
  const activeUser = usuariosSeguranca?.find(u => u.perfil === perfilUsuario);
  const responsavel = activeUser ? activeUser.nome : 'João Paulo Penfield';

  const [erro, setErro] = useState('');

  // Handle CODESC change and auto-fill
  const handleCodescChange = (val: string) => {
    setCodesc(val);
    const match = baseDados.find(item => item.codesc === val.trim());
    if (match) {
      setNomeEscola(match.escola);
      setMunicipio(match.municipio);
      setSre(match.sre);
    }
  };

  // Safe import button
  const preencherDados = (item: typeof baseDados[0]) => {
    setCodesc(item.codesc);
    setNomeEscola(item.escola);
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
    if (
      !nomeEscola.trim() ||
      !codesc.trim() ||
      !municipio.trim() ||
      !sre.trim() ||
      !descricaoFolhaRosto.trim() ||
      !valorPlanilha.trim() ||
      !iss.trim() ||
      (formaOcupacao === 'OUTRO' && !outraFormaOcupacao.trim()) ||
      (tipoAtendimento === 'EMENDA' && (!numPaf.trim() || !anoEmenda.trim()))
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

    const checklistReset = syncChecklistDocs(baseChecklist, notificacao, formaAtendimento);

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
      formaOcupacao: formaOcupacao === 'OUTRO' ? `OUTRO (${outraFormaOcupacao.trim().toUpperCase()})` : formaOcupacao,
      predio: predio.toUpperCase(),
      tipoObra,
      tipoAtendimento,
      numPaf: tipoAtendimento === 'EMENDA' ? numPaf.trim().toUpperCase() : undefined,
      anoEmenda: tipoAtendimento === 'EMENDA' ? anoEmenda.trim() : undefined,
      formaAtendimento,
      notificacao,
      descricaoFolhaRosto,
      valorPlanilha: valorPlanilha ? parseBRLToFloat(valorPlanilha) : undefined,
      iss,
      responsavel,
      tombado: tombado.toUpperCase(),
      orgaoTombador: tombado !== 'NÃO É TOMBADO' ? (orgaoTombador.toUpperCase() || 'MUNICIPAL') : undefined,
      coabitado: coabitado.toUpperCase(),
      tipoCoabitado: coabitado === 'SIM' ? (tipoCoabitado || 'Coabitado com outra escola Estadual') : undefined
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
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">
                  Código CODESC *
                </label>
                <input
                  type="text"
                  placeholder="Digite ex: 1902..."
                  value={codesc}
                  onChange={(e) => handleCodescChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-550 transition-all font-sans font-medium"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">
                  Nome da Escola *
                </label>
                <input
                  type="text"
                  placeholder="Preenchido automaticamente ao achar CODESC"
                  value={nomeEscola}
                  onChange={(e) => setNomeEscola(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-550 transition-all font-sans"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">
                  Município *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Belo Horizonte"
                  value={municipio}
                  onChange={(e) => setMunicipio(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-550 transition-all font-sans"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">
                  Superintendência SRE *
                </label>
                <input
                  type="text"
                  placeholder="Ex: SRE METROPOLITANA A"
                  value={sre}
                  onChange={(e) => setSre(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-550 transition-all font-sans"
                  required
                />
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
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
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

            <div>
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
                Prédio *
              </label>
              <select
                value={predio}
                onChange={(e) => setPredio(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-550 bg-white transition-all font-sans cursor-pointer text-slate-705 font-medium"
              >
                <option value="PRINCIPAL">PRINCIPAL</option>
                <option value="ANEXO">ANEXO</option>
              </select>
            </div>

            {formaOcupacao === 'OUTRO' && (
              <div className="sm:col-span-2 animate-in slide-in-from-top-2 duration-250">
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">
                  Explique a Outra Forma de Ocupação *
                </label>
                <input
                  type="text"
                  placeholder="Por favor, explique a forma de ocupação do imóvel..."
                  value={outraFormaOcupacao}
                  onChange={(e) => setOutraFormaOcupacao(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-blue-200 bg-blue-50/10 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-550 transition-all font-sans outline-hidden"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
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
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
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
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
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
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">
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
                <option value="Coabitado com outra municipal">Coabitado com outra municipal</option>
                <option value="Coabitado com instituto federal">Coabitado com instituto federal</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5 font-sans">
                Há alguma notificação? *
              </label>
              <select
                value={notificacao || 'Não há notificação'}
                onChange={(e) => setNotificacao(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-550 bg-white transition-all font-sans cursor-pointer text-slate-705 font-medium"
              >
                <option value="Não há notificação">Não há notificação</option>
                <option value="Ministério Publico">Ministério Publico</option>
                <option value="Prefeitura">Prefeitura</option>
                <option value="Defesa Civil">Defesa Civil</option>
                <option value="TCE">TCE</option>
              </select>
            </div>
          </div>

          {/* SECTION 3: Classificação da Demanda */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-4">
            <h4 className="text-xs font-bold text-slate-700 border-b border-slate-100 pb-2 uppercase tracking-wider font-mono">
              3. Tipo de Obra e Atendimento
            </h4>

            <div>
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-2">
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
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-2">
                  TIPO DE ATENDIMENTO *
                </label>
                <div className="flex flex-col gap-1.5 border border-slate-200 rounded-lg p-3 bg-white">
                  {['NORMAL', 'EMERGENCIAL', 'EMENDA', 'SOE', 'PDDE'].map((item) => (
                    <label key={item} className="flex items-center gap-2 text-xs text-slate-650 cursor-pointer">
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
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-2">
                  FORMA DE ATENDIMENTO *
                </label>
                <div className="flex flex-col gap-1.5 border border-slate-200 rounded-lg p-3 bg-white">
                  {['VIA CAIXA ESCOLAR', 'SEM ÔNUS'].map((item) => (
                    <label key={item} className="flex items-center gap-2 text-xs text-slate-650 cursor-pointer">
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
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">
                    Ano da Emenda *
                  </label>
                  <select
                    value={anoEmenda}
                    onChange={(e) => setAnoEmenda(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-550 bg-white transition-all font-sans cursor-pointer text-slate-705 font-medium"
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
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">
                    Número do PAF *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 512/G-EMENDA"
                    value={numPaf}
                    onChange={(e) => setNumPaf(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-550 transition-all font-sans font-mono"
                    required
                  />
                </div>
              </div>
            )}

            <div className="mt-4">
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">
                DESCRIÇÃO DA FOLHA DE ROSTO *
              </label>
              <textarea
                placeholder="Insira a descrição detalhada do escopo ou serviços para a folha de rosto..."
                value={descricaoFolhaRosto}
                onChange={(e) => setDescricaoFolhaRosto(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-550 transition-all font-sans"
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
                 <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">
                   VALOR DA PLANILHA (R$) *
                 </label>
                 <input
                   type="text"
                   placeholder="R$ 0,00"
                   value={valorPlanilha}
                   onChange={handleValorChange}
                   className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-550 transition-all font-sans font-mono"
                   required
                 />
               </div>
 
               <div>
                 <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">
                   ISS (%) *
                 </label>
                 <input
                   type="text"
                   placeholder="Ex: 5"
                   value={iss}
                   onChange={handleIssChange}
                   onFocus={handleIssFocus}
                   onBlur={handleIssBlur}
                   className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-550 transition-all font-sans font-mono"
                   required
                 />
               </div>
             </div>
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
            className="px-4 py-2 border border-slate-200 text-slate-650 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer text-slate-700"
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
