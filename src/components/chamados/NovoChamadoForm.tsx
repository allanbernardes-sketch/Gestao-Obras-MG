import React, { useEffect, useState } from 'react';
import {
  Chamado, DocumentoChecklist,
  LOCAL_OCORRENCIA_OPCOES, MOTIVO_SOLICITACAO_OPCOES, ORGAOS_CONTROLE_OPCOES, EMENDA_TIPO_OPCOES,
  CONSEQUENCIAS_OPCOES, TURNOS_OPCOES, FUNCIONAMENTO_OPCOES, DOCUMENTACAO_ANEXADA_TIPOS, montarDocumentosChamado,
} from '../../types';
import { useEscolas, type EnderecoEscola } from '../../hooks/useEscolas';
import { useChamados } from '../../hooks/useChamados';
import { AlertCircle, Send, MapPin, FileWarning, Landmark, AlertTriangle, Users2, ShieldAlert, Paperclip, CheckCircle2 } from 'lucide-react';

interface UsuarioLogado {
  id: string;
  nome: string;
  escolasVinculadas?: { escolaId: string; codesc: string; nome: string }[];
}

interface NovoChamadoFormProps {
  usuario: UsuarioLogado;
  onCriado: () => void;
}

function SecaoTitulo({ numero, titulo, icon: Icon }: { numero: string; titulo: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <h4 className="text-xs font-bold text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-1.5 uppercase tracking-wider font-mono">
      <Icon className="w-4 h-4 text-blue-500 shrink-0" />
      {numero}. {titulo}
    </h4>
  );
}

const inputCls = 'w-full px-3 py-2 text-sm border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-550 transition-all font-sans border-slate-200';
const labelCls = 'block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1';

function ChipCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors select-none ${
      checked ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
    }`}>
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-blue-600" />
      {label}
    </label>
  );
}

export default function NovoChamadoForm({ usuario, onCriado }: NovoChamadoFormProps) {
  const { escolas, buscarEnderecos } = useEscolas();
  const { criar } = useChamados();

  const escolasDoDireto = usuario.escolasVinculadas ?? [];
  const [escolaId, setEscolaId] = useState(escolasDoDireto[0]?.escolaId ?? '');
  const escolaSelecionada = escolas.find(e => e.codesc === escolasDoDireto.find(v => v.escolaId === escolaId)?.codesc);
  const codescSelecionado = escolasDoDireto.find(v => v.escolaId === escolaId)?.codesc ?? '';

  const [enderecos, setEnderecos] = useState<EnderecoEscola[]>([]);
  const [codigoEndereco, setCodigoEndereco] = useState('');
  useEffect(() => {
    let ativo = true;
    if (!codescSelecionado) { setEnderecos([]); return; }
    buscarEnderecos(codescSelecionado).then(res => { if (ativo) setEnderecos(res); });
    return () => { ativo = false; };
  }, [codescSelecionado, buscarEnderecos]);

  const [responsavelCaixaEscolarNome, setResponsavelCaixaEscolarNome] = useState('');
  const [responsavelCaixaEscolarTelefone, setResponsavelCaixaEscolarTelefone] = useState('');
  const [solicitanteMatriculaMasp, setSolicitanteMatriculaMasp] = useState('');

  const [descricaoProblema, setDescricaoProblema] = useState('');
  const [localOcorrencia, setLocalOcorrencia] = useState<string[]>([]);
  const [localOcorrenciaOutro, setLocalOcorrenciaOutro] = useState('');
  const toggleLocal = (l: string) => setLocalOcorrencia(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);

  const [motivoTipo, setMotivoTipo] = useState<Chamado['motivoTipo'] | ''>('');
  const [motivoOrgaoControle, setMotivoOrgaoControle] = useState('');
  const [motivoOrgaoNumeroOficio, setMotivoOrgaoNumeroOficio] = useState('');
  const [motivoOrgaoData, setMotivoOrgaoData] = useState('');
  const [motivoOrgaoPrazoAtendimento, setMotivoOrgaoPrazoAtendimento] = useState('');
  const [motivoEmendaTipo, setMotivoEmendaTipo] = useState<'Parlamentar' | 'Impositiva' | ''>('');

  const [consequencias, setConsequencias] = useState<string[]>([]);
  const [consequenciaOutro, setConsequenciaOutro] = useState('');
  const toggleConsequencia = (c: string) => setConsequencias(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const [qtdAlunosAfetados, setQtdAlunosAfetados] = useState('');
  const [numeroSalasAfetadas, setNumeroSalasAfetadas] = useState('');
  const [turnosAfetados, setTurnosAfetados] = useState<string[]>([]);
  const toggleTurno = (t: string) => setTurnosAfetados(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const [funcionamento, setFuncionamento] = useState<'Normal' | 'Parcial' | 'Suspenso' | ''>('');

  const [riscoImediato, setRiscoImediato] = useState<'' | 'Sim' | 'Não'>('');

  const [emendaNomeParlamentar, setEmendaNomeParlamentar] = useState('');
  const [emendaNumero, setEmendaNumero] = useState('');
  const [emendaValor, setEmendaValor] = useState('');
  const [emendaExercicio, setEmendaExercicio] = useState('');
  const [emendaObjeto, setEmendaObjeto] = useState('');

  const [documentos, setDocumentos] = useState<DocumentoChecklist[]>(montarDocumentosChamado());
  const toggleDocumento = (id: string) => setDocumentos(prev => prev.map(d =>
    d.id === id ? { ...d, status: d.status === 'nao_se_aplica' ? 'pendente' : 'nao_se_aplica' } : d
  ));
  const handleUploadDoc = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeFormatted = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${(file.size / 1024).toFixed(0)} KB`;
    setDocumentos(prev => prev.map(d => d.id === id
      ? { ...d, status: 'aprovado', fileName: file.name, fileType: file.type, fileSize: sizeFormatted, uploadedAt: new Date().toISOString().split('T')[0] }
      : d
    ));
  };

  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [tentouSubmeter, setTentouSubmeter] = useState(false);

  const formValido = !!escolaId && descricaoProblema.trim().length > 0 && localOcorrencia.length > 0 && !!motivoTipo && riscoImediato !== '';

  const resetForm = () => {
    setResponsavelCaixaEscolarNome(''); setResponsavelCaixaEscolarTelefone(''); setSolicitanteMatriculaMasp('');
    setDescricaoProblema(''); setLocalOcorrencia([]); setLocalOcorrenciaOutro('');
    setMotivoTipo(''); setMotivoOrgaoControle(''); setMotivoOrgaoNumeroOficio(''); setMotivoOrgaoData(''); setMotivoOrgaoPrazoAtendimento('');
    setMotivoEmendaTipo(''); setConsequencias([]); setConsequenciaOutro('');
    setQtdAlunosAfetados(''); setNumeroSalasAfetadas(''); setTurnosAfetados([]); setFuncionamento('');
    setRiscoImediato('');
    setEmendaNomeParlamentar(''); setEmendaNumero(''); setEmendaValor(''); setEmendaExercicio(''); setEmendaObjeto('');
    setDocumentos(montarDocumentosChamado());
    setCodigoEndereco('');
    setTentouSubmeter(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTentouSubmeter(true);
    setErro('');
    if (!formValido) {
      setErro('Preencha a escola, a descrição do problema, ao menos um local de ocorrência, o motivo e a situação de risco.');
      return;
    }

    const enderecoSelecionado = enderecos.find(en => en.codigoEndereco === codigoEndereco);

    setEnviando(true);
    try {
      await criar({
        dataSolicitacao: new Date().toISOString().split('T')[0],
        sre: escolaSelecionada?.sre ?? '',
        municipio: escolaSelecionada?.municipio ?? '',
        escolaId,
        escolaNome: escolaSelecionada?.nome ?? '',
        codesc: codescSelecionado,
        codigoEndereco: codigoEndereco || undefined,
        predioDescricao: enderecoSelecionado?.descricao,
        responsavelCaixaEscolarNome: responsavelCaixaEscolarNome || undefined,
        responsavelCaixaEscolarTelefone: responsavelCaixaEscolarTelefone || undefined,
        solicitanteMatriculaMasp: solicitanteMatriculaMasp || undefined,
        descricaoProblema,
        localOcorrencia,
        localOcorrenciaOutro: localOcorrencia.includes('Outro') ? (localOcorrenciaOutro || undefined) : undefined,
        motivoTipo: motivoTipo as Chamado['motivoTipo'],
        motivoOrgaoControle: motivoTipo === 'orgao_controle' ? (motivoOrgaoControle || undefined) : undefined,
        motivoOrgaoNumeroOficio: motivoTipo === 'orgao_controle' ? (motivoOrgaoNumeroOficio || undefined) : undefined,
        motivoOrgaoData: motivoTipo === 'orgao_controle' ? (motivoOrgaoData || undefined) : undefined,
        motivoOrgaoPrazoAtendimento: motivoTipo === 'orgao_controle' ? (motivoOrgaoPrazoAtendimento || undefined) : undefined,
        motivoEmendaTipo: motivoTipo === 'emenda' ? (motivoEmendaTipo || undefined) : undefined,
        consequencias,
        consequenciaOutro: consequencias.includes('Outro') ? (consequenciaOutro || undefined) : undefined,
        qtdAlunosAfetados: qtdAlunosAfetados ? parseInt(qtdAlunosAfetados, 10) : undefined,
        numeroSalasAfetadas: numeroSalasAfetadas ? parseInt(numeroSalasAfetadas, 10) : undefined,
        turnosAfetados,
        funcionamento: funcionamento || undefined,
        riscoImediato: riscoImediato === 'Sim',
        emendaNomeParlamentar: motivoTipo === 'emenda' ? (emendaNomeParlamentar || undefined) : undefined,
        emendaNumero: motivoTipo === 'emenda' ? (emendaNumero || undefined) : undefined,
        emendaValor: motivoTipo === 'emenda' && emendaValor ? parseFloat(emendaValor) : undefined,
        emendaExercicio: motivoTipo === 'emenda' ? (emendaExercicio || undefined) : undefined,
        emendaObjeto: motivoTipo === 'emenda' ? (emendaObjeto || undefined) : undefined,
        documentos,
        status: 'aberto',
        criadoPor: usuario.id,
      }, usuario.nome);

      setSucesso(true);
      resetForm();
      setTimeout(() => { setSucesso(false); onCriado(); }, 1400);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao abrir o chamado. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col space-y-5 text-left p-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-5">
        <h2 className="text-base font-black text-slate-800 uppercase tracking-wider font-sans leading-none">Abrir Chamado</h2>
        <p className="text-xs text-slate-500 mt-1">Solicitação de intervenção física para a unidade escolar.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-6 space-y-6">
        {erro && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}
        {sucesso && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Chamado aberto com sucesso! Encaminhado para a Coordenação Regional.</span>
          </div>
        )}

        {/* 1. Dados da Unidade Escolar */}
        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-4">
          <SecaoTitulo numero="1" titulo="Dados da Unidade Escolar" icon={MapPin} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Escola Estadual *</label>
              {escolasDoDireto.length > 1 ? (
                <select value={escolaId} onChange={e => setEscolaId(e.target.value)} className={`${inputCls} bg-white cursor-pointer`}>
                  {escolasDoDireto.map(ev => <option key={ev.escolaId} value={ev.escolaId}>{ev.nome}</option>)}
                </select>
              ) : (
                <div className="w-full px-3 py-2 text-sm border rounded-lg font-semibold border-emerald-200 bg-emerald-50/30 text-slate-800">
                  {escolasDoDireto[0]?.nome || 'Nenhuma escola vinculada ao seu usuário — contate o administrador.'}
                </div>
              )}
            </div>
            <div>
              <label className={labelCls}>Prédio Principal ou Anexo</label>
              <select
                value={codigoEndereco}
                onChange={e => setCodigoEndereco(e.target.value)}
                disabled={enderecos.length === 0}
                className={`${inputCls} bg-white cursor-pointer disabled:bg-slate-100 disabled:text-slate-400`}
              >
                <option value="">Selecione...</option>
                {enderecos.map(en => <option key={en.codigoEndereco} value={en.codigoEndereco}>{en.descricao}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Campo label="SRE" valor={escolaSelecionada?.sre} />
            <Campo label="Município" valor={escolaSelecionada?.municipio} />
            <Campo label="CODESC" valor={codescSelecionado} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Responsável Caixa Escolar</label>
              <input type="text" value={responsavelCaixaEscolarNome} onChange={e => setResponsavelCaixaEscolarNome(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Telefone Caixa Escolar</label>
              <input type="text" value={responsavelCaixaEscolarTelefone} onChange={e => setResponsavelCaixaEscolarTelefone(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Matrícula/MASP</label>
              <input type="text" value={solicitanteMatriculaMasp} onChange={e => setSolicitanteMatriculaMasp(e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        {/* 2. Caracterização da demanda */}
        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-4">
          <SecaoTitulo numero="2" titulo="Caracterização da Demanda" icon={FileWarning} />
          <div>
            <label className={labelCls}>Descreva objetivamente o problema *</label>
            <textarea
              value={descricaoProblema}
              onChange={e => setDescricaoProblema(e.target.value)}
              rows={4}
              className={`${inputCls} ${tentouSubmeter && !descricaoProblema.trim() ? 'border-red-400 bg-red-50/30' : ''}`}
            />
          </div>
          <div>
            <label className={labelCls}>Onde ocorre? *</label>
            <div className="flex flex-wrap gap-2">
              {LOCAL_OCORRENCIA_OPCOES.map(l => (
                <ChipCheckbox key={l} label={l} checked={localOcorrencia.includes(l)} onChange={() => toggleLocal(l)} />
              ))}
            </div>
            {localOcorrencia.includes('Outro') && (
              <input type="text" placeholder="Especifique..." value={localOcorrenciaOutro} onChange={e => setLocalOcorrenciaOutro(e.target.value)} className={`${inputCls} mt-2`} />
            )}
            {tentouSubmeter && localOcorrencia.length === 0 && (
              <span className="text-[10px] text-red-600 font-semibold block mt-1">Selecione ao menos um local.</span>
            )}
          </div>
        </div>

        {/* 3. Motivo da solicitação */}
        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-4">
          <SecaoTitulo numero="3" titulo="Motivo da Solicitação" icon={Landmark} />
          <div className="flex flex-col gap-1.5">
            {MOTIVO_SOLICITACAO_OPCOES.map(op => (
              <label key={op.value} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="radio" name="motivoTipo" checked={motivoTipo === op.value} onChange={() => setMotivoTipo(op.value)} className="accent-blue-600" />
                {op.label}
              </label>
            ))}
          </div>

          {motivoTipo === 'orgao_controle' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200">
              <div>
                <label className={labelCls}>Órgão</label>
                <select value={motivoOrgaoControle} onChange={e => setMotivoOrgaoControle(e.target.value)} className={`${inputCls} bg-white cursor-pointer`}>
                  <option value="">Selecione...</option>
                  {ORGAOS_CONTROLE_OPCOES.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Número do Ofício / Processo</label>
                <input type="text" value={motivoOrgaoNumeroOficio} onChange={e => setMotivoOrgaoNumeroOficio(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Data</label>
                <input type="date" value={motivoOrgaoData} onChange={e => setMotivoOrgaoData(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Prazo para atendimento</label>
                <input type="text" value={motivoOrgaoPrazoAtendimento} onChange={e => setMotivoOrgaoPrazoAtendimento(e.target.value)} className={inputCls} />
              </div>
            </div>
          )}

          {motivoTipo === 'emenda' && (
            <div className="pt-3 border-t border-slate-200 space-y-4">
              <div>
                <label className={labelCls}>Tipo</label>
                <div className="flex gap-4">
                  {EMENDA_TIPO_OPCOES.map(t => (
                    <label key={t} className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
                      <input type="radio" name="motivoEmendaTipo" checked={motivoEmendaTipo === t} onChange={() => setMotivoEmendaTipo(t)} className="accent-blue-600" />
                      {t}
                    </label>
                  ))}
                </div>
              </div>

              <h5 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">8. Informações da Emenda Parlamentar</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Nome do Parlamentar</label>
                  <input type="text" value={emendaNomeParlamentar} onChange={e => setEmendaNomeParlamentar(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Número da Emenda</label>
                  <input type="text" value={emendaNumero} onChange={e => setEmendaNumero(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Valor</label>
                  <input type="number" step="0.01" value={emendaValor} onChange={e => setEmendaValor(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Exercício</label>
                  <input type="text" value={emendaExercicio} onChange={e => setEmendaExercicio(e.target.value)} className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Objeto</label>
                  <textarea value={emendaObjeto} onChange={e => setEmendaObjeto(e.target.value)} rows={2} className={inputCls} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. Consequências observadas */}
        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-3">
          <SecaoTitulo numero="4" titulo="Consequências Observadas" icon={AlertTriangle} />
          <div className="flex flex-wrap gap-2">
            {CONSEQUENCIAS_OPCOES.map(c => (
              <ChipCheckbox key={c} label={c} checked={consequencias.includes(c)} onChange={() => toggleConsequencia(c)} />
            ))}
          </div>
          {consequencias.includes('Outro') && (
            <input type="text" placeholder="Especifique..." value={consequenciaOutro} onChange={e => setConsequenciaOutro(e.target.value)} className={inputCls} />
          )}
        </div>

        {/* 5. Impacto */}
        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-3">
          <SecaoTitulo numero="5" titulo="Impacto" icon={Users2} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>Quantidade de alunos afetados</label>
              <input type="number" min={0} value={qtdAlunosAfetados} onChange={e => setQtdAlunosAfetados(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Número de salas</label>
              <input type="number" min={0} value={numeroSalasAfetadas} onChange={e => setNumeroSalasAfetadas(e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Turnos afetados</label>
              <div className="flex flex-wrap gap-2">
                {TURNOS_OPCOES.map(t => (
                  <ChipCheckbox key={t} label={t} checked={turnosAfetados.includes(t)} onChange={() => toggleTurno(t)} />
                ))}
              </div>
            </div>
            <div className="col-span-2 sm:col-span-4">
              <label className={labelCls}>Funcionamento</label>
              <div className="flex gap-4">
                {FUNCIONAMENTO_OPCOES.map(f => (
                  <label key={f} className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
                    <input type="radio" name="funcionamento" checked={funcionamento === f} onChange={() => setFuncionamento(f as any)} className="accent-blue-600" />
                    {f}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 6. Situação de Risco */}
        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-3">
          <SecaoTitulo numero="6" titulo="Situação de Risco" icon={ShieldAlert} />
          <label className={labelCls}>Há risco imediato? *</label>
          <div className="flex gap-4">
            {(['Sim', 'Não'] as const).map(v => (
              <label key={v} className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
                <input type="radio" name="riscoImediato" checked={riscoImediato === v} onChange={() => setRiscoImediato(v)} className="accent-blue-600" />
                {v}
              </label>
            ))}
          </div>
          {tentouSubmeter && riscoImediato === '' && (
            <span className="text-[10px] text-red-600 font-semibold block">Informe se há risco imediato.</span>
          )}
        </div>

        {/* 7. Documentação Anexada */}
        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-3">
          <SecaoTitulo numero="7" titulo="Documentação Anexada" icon={Paperclip} />
          <p className="text-[11px] text-slate-400">Marque os documentos que acompanham este chamado e anexe o arquivo correspondente (opcional).</p>
          <div className="space-y-1.5">
            {documentos.map(d => {
              const marcado = d.status !== 'nao_se_aplica';
              return (
                <div key={d.id} className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-xs ${marcado ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100'}`}>
                  <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={marcado} onChange={() => toggleDocumento(d.id)} className="accent-blue-600" />
                    {d.nome}
                  </label>
                  {marcado && (
                    <label className="text-blue-600 font-semibold cursor-pointer shrink-0">
                      {d.fileName || 'Anexar arquivo'}
                      <input type="file" className="hidden" onChange={e => handleUploadDoc(d.id, e)} />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={enviando}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-bold rounded-lg transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
            {enviando ? 'Enviando...' : 'Enviar Chamado'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor?: string }) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className={`w-full px-3 py-2 text-sm border rounded-lg font-semibold ${valor ? 'border-emerald-200 bg-emerald-50/30 text-slate-800' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
        {valor || '—'}
      </div>
    </div>
  );
}
