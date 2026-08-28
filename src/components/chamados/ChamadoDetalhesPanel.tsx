import React from 'react';
import { Chamado, STATUS_CHAMADO_INFO } from '../../types';
import { X, MapPin, FileWarning, AlertTriangle, Users2, ShieldAlert, Paperclip, Landmark, Clock } from 'lucide-react';

interface ChamadoDetalhesPanelProps {
  chamado: Chamado;
  onClose: () => void;
  /** Painel de ações injetado pelo caller (ex: triagem do coordenador) — some quando não passado. */
  acoes?: React.ReactNode;
}

function Campo({ label, valor }: { label: string; valor?: React.ReactNode }) {
  return (
    <div>
      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{label}</span>
      <span className="text-sm text-slate-800 font-semibold">{valor || '—'}</span>
    </div>
  );
}

function SecaoTitulo({ numero, titulo, icon: Icon }: { numero: string; titulo: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <h4 className="text-xs font-bold text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-1.5 uppercase tracking-wider font-mono">
      <Icon className="w-4 h-4 text-blue-500 shrink-0" />
      {numero}. {titulo}
    </h4>
  );
}

const formatarData = (iso?: string) => {
  if (!iso) return '—';
  try {
    return new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('pt-BR');
  } catch { return iso; }
};

const formatarDataHora = (iso?: string) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
};

const formatarBRL = (v?: number) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ChamadoDetalhesPanel({ chamado: c, onClose, acoes }: ChamadoDetalhesPanelProps) {
  const statusInfo = STATUS_CHAMADO_INFO[c.status];
  const docsAnexados = (c.documentos ?? []).filter(d => d.status !== 'nao_se_aplica');

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-3xl w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/75 shrink-0">
          <div>
            <h3 className="font-display text-base sm:text-lg font-bold text-slate-800">
              Chamado #{String(c.numero).padStart(5, '0')}
            </h3>
            <p className="text-xs text-slate-500">{c.escolaNome} — {c.municipio} / {c.sre}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusInfo.badgeClass}`}>
              {statusInfo.label}
            </span>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {c.prioridade && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider">Prioridade:</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 font-bold text-slate-700">{c.prioridade}</span>
            </div>
          )}

          {/* 1. Dados da Unidade Escolar */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-3">
            <SecaoTitulo numero="1" titulo="Dados da Unidade Escolar" icon={MapPin} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Campo label="Data da Solicitação" valor={formatarData(c.dataSolicitacao)} />
              <Campo label="SRE" valor={c.sre} />
              <Campo label="Município" valor={c.municipio} />
              <Campo label="Escola Estadual" valor={c.escolaNome} />
              <Campo label="CODESC" valor={c.codesc} />
              <Campo label="Prédio" valor={c.predioDescricao || c.codigoEndereco} />
              <Campo label="Responsável Caixa Escolar" valor={c.responsavelCaixaEscolarNome} />
              <Campo label="Telefone Caixa Escolar" valor={c.responsavelCaixaEscolarTelefone} />
              <Campo label="Matrícula/MASP" valor={c.solicitanteMatriculaMasp} />
            </div>
          </div>

          {/* 2. Caracterização da demanda */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-3">
            <SecaoTitulo numero="2" titulo="Caracterização da Demanda" icon={FileWarning} />
            <Campo label="Descrição do problema" valor={<span className="font-normal">{c.descricaoProblema}</span>} />
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Onde ocorre</span>
              <div className="flex flex-wrap gap-1.5">
                {c.localOcorrencia.map(l => (
                  <span key={l} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-semibold">{l}</span>
                ))}
                {c.localOcorrenciaOutro && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-semibold">Outro: {c.localOcorrenciaOutro}</span>
                )}
              </div>
            </div>
          </div>

          {/* 3. Motivo da solicitação */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-3">
            <SecaoTitulo numero="3" titulo="Motivo da Solicitação" icon={Landmark} />
            <Campo label="Motivo" valor={
              c.motivoTipo === 'necessidade_escola' ? 'Necessidade identificada pela escola' :
              c.motivoTipo === 'autorizacao_soe' ? 'Autorização da SOE' :
              c.motivoTipo === 'doacao' ? 'Doação' :
              c.motivoTipo === 'orgao_controle' ? 'Determinação/notificação de órgão de controle' :
              c.motivoTipo === 'emenda' ? 'Emenda' : c.motivoTipo
            } />
            {c.motivoTipo === 'orgao_controle' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-slate-100">
                <Campo label="Órgão" valor={c.motivoOrgaoControle} />
                <Campo label="Nº Ofício/Processo" valor={c.motivoOrgaoNumeroOficio} />
                <Campo label="Data" valor={formatarData(c.motivoOrgaoData)} />
                <Campo label="Prazo p/ atendimento" valor={c.motivoOrgaoPrazoAtendimento} />
              </div>
            )}
            {c.motivoTipo === 'emenda' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <Campo label="Tipo de Emenda" valor={c.motivoEmendaTipo} />
                <Campo label="Nome do Parlamentar" valor={c.emendaNomeParlamentar} />
                <Campo label="Número da Emenda" valor={c.emendaNumero} />
                <Campo label="Valor" valor={formatarBRL(c.emendaValor)} />
                <Campo label="Exercício" valor={c.emendaExercicio} />
                <Campo label="Objeto" valor={c.emendaObjeto} />
              </div>
            )}
          </div>

          {/* 4. Consequências */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-3">
            <SecaoTitulo numero="4" titulo="Consequências Observadas" icon={AlertTriangle} />
            <div className="flex flex-wrap gap-1.5">
              {c.consequencias.map(cq => (
                <span key={cq} className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-[11px] font-semibold">{cq}</span>
              ))}
              {c.consequenciaOutro && (
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-[11px] font-semibold">Outro: {c.consequenciaOutro}</span>
              )}
              {c.consequencias.length === 0 && !c.consequenciaOutro && <span className="text-xs text-slate-400">Nenhuma consequência marcada.</span>}
            </div>
          </div>

          {/* 5. Impacto */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-3">
            <SecaoTitulo numero="5" titulo="Impacto" icon={Users2} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Campo label="Alunos afetados" valor={c.qtdAlunosAfetados} />
              <Campo label="Nº de salas" valor={c.numeroSalasAfetadas} />
              <Campo label="Turnos afetados" valor={c.turnosAfetados.join(', ')} />
              <Campo label="Funcionamento" valor={c.funcionamento} />
            </div>
          </div>

          {/* 6. Situação de Risco */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-3">
            <SecaoTitulo numero="6" titulo="Situação de Risco" icon={ShieldAlert} />
            <Campo label="Há risco imediato?" valor={c.riscoImediato == null ? '—' : (c.riscoImediato ? 'Sim' : 'Não')} />
          </div>

          {/* 7. Documentação Anexada */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-3">
            <SecaoTitulo numero="7" titulo="Documentação Anexada" icon={Paperclip} />
            {docsAnexados.length === 0 ? (
              <span className="text-xs text-slate-400">Nenhum documento anexado.</span>
            ) : (
              <ul className="space-y-1.5">
                {docsAnexados.map(d => (
                  <li key={d.id} className="flex items-center justify-between text-xs bg-white border border-slate-200 rounded-lg px-3 py-2">
                    <span className="font-semibold text-slate-700">{d.nome}</span>
                    <span className="text-slate-400">{d.fileName || 'marcado, sem arquivo'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Timeline de status */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-3">
            <SecaoTitulo numero="•" titulo="Andamento" icon={Clock} />
            <ol className="space-y-2.5">
              {c.historico.map((h, i) => {
                const info = STATUS_CHAMADO_INFO[h.status];
                return (
                  <li key={i} className="flex gap-3 text-xs">
                    <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-full border font-bold ${info.badgeClass}`}>{info.label}</span>
                    <div>
                      <div className="text-slate-700 font-semibold">{h.responsavel} — {formatarDataHora(h.data)}</div>
                      {h.observacao && <div className="text-slate-500 mt-0.5">{h.observacao}</div>}
                    </div>
                  </li>
                );
              })}
            </ol>
            {(c.status === 'concluido' || c.status === 'recusado') && (c.parecerCoordenador || c.justificativaRecusa) && (
              <div className="pt-2 border-t border-slate-100 text-xs text-slate-600">
                <span className="font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                  {c.status === 'recusado' ? 'Justificativa da recusa' : 'Parecer do coordenador'}
                </span>
                {c.status === 'recusado' ? c.justificativaRecusa : c.parecerCoordenador}
              </div>
            )}
          </div>

          {acoes}
        </div>
      </div>
    </div>
  );
}
