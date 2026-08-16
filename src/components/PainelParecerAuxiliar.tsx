import React, { useState } from 'react';
import { CheckCircle, XCircle, Users } from 'lucide-react';
import { AuxiliarProcesso } from '../types';
import { EQUIPE_LABEL } from '../utils/auxiliares';

// Painel de auxiliares de validação (Elétrica/Arquitetura/PSCIP) de um processo: mostra o status
// de todo mundo anexado e, se o usuário logado for um dos auxiliares pendentes, abre o formulário
// pra ele registrar o próprio parecer de especialidade. Usado em SolicitacaoDetalhes.tsx (Análise
// Técnica) e ValidacaoContratual.tsx (Ajuste/Reequilíbrio/Saldo). Ver [[equipes-analista-auxiliares]].
interface PainelParecerAuxiliarProps {
  auxiliares: AuxiliarProcesso[];
  nomeUsuarioLogado: string;
  onSalvarParecer: (auxiliarId: string, aprovado: boolean, parecer: string) => void;
  salvandoId?: string | null;
}

export default function PainelParecerAuxiliar({ auxiliares, nomeUsuarioLogado, onSalvarParecer, salvandoId }: PainelParecerAuxiliarProps) {
  const [parecerTexto, setParecerTexto] = useState<{ [id: string]: string }>({});

  if (!auxiliares || auxiliares.length === 0) return null;

  const meuAuxiliar = auxiliares.find(a => a.nome === nomeUsuarioLogado && a.aprovado === undefined);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
        <Users className="w-4 h-4 text-indigo-500" /> Auxiliares de Validação
      </h4>

      <div className="space-y-1.5">
        {auxiliares.map(aux => {
          const tone = aux.aprovado === true ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : aux.aprovado === false ? 'bg-rose-50 border-rose-200 text-rose-700'
            : 'bg-amber-50 border-amber-200 text-amber-700';
          const label = aux.aprovado === true ? 'Aprovado' : aux.aprovado === false ? 'Reprovado' : 'Aguardando parecer';
          return (
            <div key={aux.id} className={`px-3 py-2 rounded-xl border text-xs ${tone}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">{aux.nome} — {EQUIPE_LABEL[aux.equipe]}</span>
                <span className="text-[9.5px] font-black uppercase tracking-wide shrink-0">{label}</span>
              </div>
              {aux.parecer && (
                <p className="mt-1 text-[11px] italic leading-relaxed">{aux.parecer}</p>
              )}
            </div>
          );
        })}
      </div>

      {meuAuxiliar && (
        <div className="border-t border-slate-100 pt-3 space-y-2">
          <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">
            Seu parecer técnico ({EQUIPE_LABEL[meuAuxiliar.equipe]}) *
          </label>
          <textarea
            rows={3}
            value={parecerTexto[meuAuxiliar.id] || ''}
            onChange={(e) => setParecerTexto(prev => ({ ...prev, [meuAuxiliar.id]: e.target.value }))}
            placeholder="Registre a análise técnica da sua especialidade neste processo..."
            className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={salvandoId === meuAuxiliar.id}
              onClick={() => {
                const texto = (parecerTexto[meuAuxiliar.id] || '').trim();
                if (!texto) { alert('Insira o parecer técnico antes de homologar.'); return; }
                onSalvarParecer(meuAuxiliar.id, true, texto);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Aprovar
            </button>
            <button
              type="button"
              disabled={salvandoId === meuAuxiliar.id}
              onClick={() => {
                const texto = (parecerTexto[meuAuxiliar.id] || '').trim();
                if (!texto) { alert('Insira a justificativa antes de reprovar.'); return; }
                onSalvarParecer(meuAuxiliar.id, false, texto);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle className="w-3.5 h-3.5" /> Reprovar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
