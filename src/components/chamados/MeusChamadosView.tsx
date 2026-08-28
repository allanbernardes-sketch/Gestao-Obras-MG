import React, { useMemo, useState } from 'react';
import { Chamado, STATUS_CHAMADO_INFO } from '../../types';
import { useChamados } from '../../hooks/useChamados';
import ChamadoDetalhesPanel from './ChamadoDetalhesPanel';
import { Ticket, RefreshCw, Inbox } from 'lucide-react';

interface MeusChamadosViewProps {
  usuario: { id: string; nome: string };
}

const formatarData = (iso?: string) => {
  if (!iso) return '—';
  try { return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR'); } catch { return iso; }
};

export default function MeusChamadosView({ usuario }: MeusChamadosViewProps) {
  const { chamados, carregando, erro, recarregar } = useChamados();
  const [selecionado, setSelecionado] = useState<Chamado | null>(null);

  const meusChamados = useMemo(
    () => chamados.filter(c => c.criadoPor === usuario.id),
    [chamados, usuario.id]
  );

  return (
    <div className="w-full flex-1 flex flex-col space-y-5 text-left p-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-purple-50 border border-purple-100 rounded-xl text-purple-700">
              <Ticket className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-black text-slate-800 uppercase tracking-wider font-sans leading-none">Meus Chamados</h2>
              <p className="text-xs text-slate-500 mt-0.5">Acompanhamento das solicitações abertas pela sua escola.</p>
            </div>
          </div>
          <button onClick={recarregar} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
            <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">{erro}</div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs overflow-hidden">
        {carregando ? (
          <div className="p-10 text-center text-sm text-slate-400">Carregando chamados...</div>
        ) : meusChamados.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center gap-2">
            <Inbox className="w-8 h-8 text-slate-300" />
            <span className="text-sm text-slate-400">Nenhum chamado aberto ainda.</span>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="text-left px-4 py-2.5">Nº</th>
                <th className="text-left px-4 py-2.5">Data</th>
                <th className="text-left px-4 py-2.5">Descrição</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">Prioridade</th>
              </tr>
            </thead>
            <tbody>
              {meusChamados.map(c => {
                const info = STATUS_CHAMADO_INFO[c.status];
                return (
                  <tr key={c.id} onClick={() => setSelecionado(c)} className="border-b border-slate-50 hover:bg-slate-50/70 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">#{String(c.numero).padStart(5, '0')}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{formatarData(c.dataSolicitacao)}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs truncate">{c.descricaoProblema}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${info.badgeClass}`}>{info.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{c.prioridade || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selecionado && (
        <ChamadoDetalhesPanel chamado={selecionado} onClose={() => setSelecionado(null)} />
      )}
    </div>
  );
}
