import { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Briefcase, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Budget } from './types';

const cn = (...classes: (string | undefined | false | null)[]) => classes.filter(Boolean).join(' ');
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Props { budgets: Budget[] }

function AreaSparkline({ data }: { data: { name: string; value: number }[] }) {
  const w = 500, h = 160, pad = 30;
  if (!data.length) return null;
  const maxV = Math.max(...data.map(d => d.value), 1);
  const minV = Math.min(...data.map(d => d.value), 0);
  const range = maxV - minV || 1;
  const xStep = (w - pad * 2) / (data.length - 1);
  const pts = data.map((d, i) => ({
    x: pad + i * xStep,
    y: h - pad - ((d.value - minV) / range) * (h - pad * 2),
  }));
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area = `${pts[0].x},${h - pad} ${polyline} ${pts[pts.length - 1].x},${h - pad}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 200 }}>
      <defs>
        <linearGradient id="orcaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#DC2626" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#DC2626" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map(t => (
        <line key={t} x1={pad} x2={w - pad} y1={pad + t * (h - pad * 2)} y2={pad + t * (h - pad * 2)}
          stroke="#f3f4f6" strokeWidth="1" />
      ))}
      <polygon points={area} fill="url(#orcaGrad)" />
      <polyline points={polyline} fill="none" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#DC2626" />
      ))}
      {data.map((d, i) => (
        <text key={i} x={pts[i].x} y={h - 6} textAnchor="middle" fontSize="10" fill="#9ca3af" fontWeight="bold">{d.name}</text>
      ))}
    </svg>
  );
}

function VBarChart({ data }: { data: { name: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-3 h-40">
      {data.map(d => (
        <div key={d.name} className="flex flex-col items-center gap-1 flex-1">
          <span className="text-[9px] font-black text-slate-700">{fmt(d.value)}</span>
          <div className="w-full bg-red-600 rounded-t transition-all duration-700" style={{ height: `${(d.value / max) * 100}%` }} />
          <span className="text-[9px] font-bold text-gray-400 uppercase text-center leading-tight">{d.name}</span>
        </div>
      ))}
    </div>
  );
}

export default function OrcaDashboard({ budgets }: Props) {
  const stats = useMemo(() => {
    const totalInvested = budgets.reduce((acc, b) => acc + (b.totalValue || 0), 0);
    const activeBudgets = budgets.filter(b => b.status !== 'Closed').length;
    const monthlyData = [
      { name: 'Jan', value: 400 },
      { name: 'Fev', value: 300 },
      { name: 'Mar', value: 600 },
      { name: 'Abr', value: 890 },
      { name: 'Mai', value: totalInvested > 0 ? Math.round(totalInvested / 1000) : 1250 },
    ];
    return { totalBudgets: budgets.length, activeBudgets, totalInvested, monthlyData };
  }, [budgets]);

  const cards = [
    { label: 'TOTAL EM ORÇAMENTOS', value: fmt(stats.totalInvested), icon: DollarSign, color: 'text-red-600', borderColor: 'border-red-600', trend: '+12.5%', up: true },
    { label: 'ORÇAMENTOS ATIVOS', value: stats.activeBudgets, icon: Briefcase, color: 'text-green-600', borderColor: 'border-green-600', trend: `${stats.activeBudgets} ativos`, up: true },
    { label: 'PROCESSOS EM ATRASO', value: '2', icon: AlertCircle, color: 'text-slate-900', borderColor: 'border-slate-900', trend: '-15%', up: false },
    { label: 'TAXA DE APROVAÇÃO', value: `${stats.totalBudgets > 0 ? Math.round((budgets.filter(b => b.status === 'Approved').length / stats.totalBudgets) * 100) : 0}%`, icon: CheckCircle2, color: 'text-red-600', borderColor: 'border-red-600', trend: '+4%', up: true },
  ];

  const top5 = [...budgets].sort((a, b) => b.totalValue - a.totalValue).slice(0, 5)
    .map(b => ({ name: b.name.substring(0, 18), value: b.totalValue }));

  const statusBars = [
    { label: 'Rascunho', value: stats.totalBudgets > 0 ? Math.round((budgets.filter(b => b.status === 'Draft').length / stats.totalBudgets) * 100) : 35, color: 'bg-blue-700' },
    { label: 'Aprovado', value: stats.totalBudgets > 0 ? Math.round((budgets.filter(b => b.status === 'Approved').length / stats.totalBudgets) * 100) : 45, color: 'bg-red-600' },
    { label: 'Encerrado', value: stats.totalBudgets > 0 ? Math.round((budgets.filter(b => b.status === 'Closed').length / stats.totalBudgets) * 100) : 20, color: 'bg-green-600' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-end justify-between border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-xl font-black text-[#13264d] font-sans">
            Dashboard <span className="text-red-600">Orçamentos</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            Portal de planejamento orçamentário e serviços.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2.5 bg-white border border-gray-200 text-slate-900 text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors shadow-sm">
            Exportar PDF
          </button>
          <button className="px-5 py-2.5 bg-red-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-shadow shadow-md">
            Novo Relatório
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className={cn('bg-white p-6 border-t-4 shadow-sm hover:shadow-md transition-shadow', card.borderColor)}>
            <div className="flex justify-between items-start">
              <div className={cn('p-2 rounded-full bg-gray-50', card.color)}>
                <card.icon className="h-6 w-6" />
              </div>
              <span className={cn('text-[10px] font-extrabold uppercase tracking-widest px-2 py-1 rounded flex items-center gap-1',
                card.up ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700')}>
                {card.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {card.trend}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{card.label}</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{card.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Area sparkline */}
        <div className="lg:col-span-2 bg-white p-8 border-t-4 border-blue-700 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-slate-800 font-sans uppercase tracking-wider">Evolução dos Projetos</h3>
            <select className="text-[10px] font-bold uppercase tracking-widest border-gray-200 rounded p-1 outline-none focus:ring-1 focus:ring-red-600">
              <option>Últimos 5 meses</option>
            </select>
          </div>
          <AreaSparkline data={stats.monthlyData} />
        </div>

        {/* Status bars */}
        <div className="bg-white p-8 border-t-4 border-blue-700 shadow-sm flex flex-col">
          <h3 className="text-sm font-black text-slate-800 font-sans uppercase tracking-wider mb-8">Status dos Orçamentos</h3>
          <div className="space-y-8 flex-1">
            {statusBars.map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-[10px] font-extrabold uppercase tracking-widest mb-2.5">
                  <span className="text-gray-500">{item.label}</span>
                  <span className="text-slate-900">{item.value}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${item.value}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                    className={cn('h-full', item.color)} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 p-5 bg-blue-700 rounded shadow-inner relative overflow-hidden">
            <p className="text-[11px] text-white font-bold uppercase tracking-widest leading-relaxed relative z-10">
              "Desenvolvimento e transparência para o futuro de Minas Gerais."
            </p>
          </div>
        </div>
      </div>

      {/* Top 5 budgets bar chart */}
      {top5.length > 0 && (
        <div className="bg-white p-8 border-t-4 border-red-600 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 font-sans uppercase tracking-wider mb-8">Valores por Orçamento (Top 5)</h3>
          <VBarChart data={top5} />
        </div>
      )}
    </div>
  );
}
