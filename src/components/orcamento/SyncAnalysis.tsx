import { useState } from 'react';
import { Search, AlertTriangle, BarChart3, Zap, Target, FileSearch, ArrowRightLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { Budget } from './types';

const COLORS = ['#C8102E', '#1A365D', '#38A169', '#ED8936', '#4A5568'];

interface Props { budgets: Budget[] }

function DonutChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 60, cx = 80, cy = 80, stroke = 20;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" className="mx-auto">
      {data.map((d, i) => {
        const pct = d.value / total;
        const dash = pct * circ;
        const gap = circ - dash;
        const seg = (
          <circle key={d.name} cx={cx} cy={cy} r={r} fill="none"
            stroke={COLORS[i % COLORS.length]} strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
          />
        );
        offset += dash;
        return seg;
      })}
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" className="text-xs font-black fill-slate-800" fontSize="12" fontWeight="bold">
        {total}%
      </text>
    </svg>
  );
}

function HBarChart({ data }: { data: { name: string; valor: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.valor));
  return (
    <div className="space-y-6 py-4">
      {data.map(d => (
        <div key={d.name}>
          <div className="flex justify-between text-[10px] font-black uppercase mb-1.5">
            <span style={{ color: d.color }}>{d.name}</span>
            <span className="text-slate-700">{d.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
          <div className="h-8 bg-gray-100 rounded overflow-hidden">
            <div className="h-full rounded transition-all duration-700" style={{ width: `${(d.valor / max) * 100}%`, backgroundColor: d.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SyncAnalysis(_props: Props) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  const abcData = [
    { name: 'Estrutura', value: 45 },
    { name: 'Instalações', value: 25 },
    { name: 'Acabamento', value: 15 },
    { name: 'Alvenaria', value: 10 },
    { name: 'Outros', value: 5 },
  ];

  const baseComparisonData = [
    { name: 'SINAPI', valor: 150240, color: '#1A365D' },
    { name: 'SETOP', valor: 158300, color: '#C8102E' },
    { name: 'SEINFRA', valor: 147500, color: '#4A5568' },
  ];

  const runSampleScan = () => {
    setIsScanning(true);
    setScanProgress(0);
    const interval = setInterval(() => {
      setScanProgress(p => {
        if (p >= 100) { clearInterval(interval); setIsScanning(false); return 100; }
        return p + 10;
      });
    }, 200);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex items-end justify-between border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-xl font-black text-[#13264d] font-sans">
            Análises <span className="text-red-600">Síncronas</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            Inteligência orçamentária e auditoria em tempo real.
          </p>
        </div>
        <button onClick={runSampleScan} disabled={isScanning}
          className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg disabled:opacity-50">
          {isScanning ? <Zap className="h-4 w-4 animate-pulse" /> : <Search className="h-4 w-4" />}
          {isScanning ? `Analisando... ${scanProgress}%` : 'Iniciar Auditoria IA'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Curva ABC - Donut */}
        <div className="bg-white p-6 border-t-4 border-blue-700 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-700/5 rounded text-blue-700"><BarChart3 className="h-4 w-4" /></div>
              <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">Curva ABC (Pareto)</h3>
            </div>
            <span className="text-[10px] font-black text-blue-700 bg-blue-700/5 px-2 py-1 rounded">VIVO</span>
          </div>
          <DonutChart data={abcData} />
          <div className="mt-4 space-y-2">
            {abcData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-[10px] font-bold text-gray-500 uppercase">{item.name}</span>
                </div>
                <span className="text-xs font-black text-slate-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Auditor Findings */}
        <div className="lg:col-span-2 bg-white p-6 border-t-4 border-red-600 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-600/5 rounded text-red-600"><Target className="h-4 w-4" /></div>
              <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">Descobertas da Auditoria (IA)</h3>
            </div>
            {isScanning && <div className="text-[10px] font-black text-red-600 animate-pulse">PROCESSANDO...</div>}
          </div>
          <div className="flex-1 space-y-4">
            <div className="p-4 bg-orange-50 border-l-4 border-orange-500 flex gap-4">
              <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
              <div>
                <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest">Alerta de Inconsistência</p>
                <p className="text-sm font-medium text-slate-900 mt-1 leading-snug">
                  O orçamento "Reforma E.E. Abraão" não contém o item de <span className="font-black">Limpeza Final de Obra</span>.
                </p>
                <button className="mt-2 text-[10px] font-black uppercase text-orange-600 hover:underline">Corrigir Agora</button>
              </div>
            </div>
            <div className="p-4 bg-blue-50 border-l-4 border-blue-700 flex gap-4">
              <ArrowRightLeft className="h-5 w-5 text-blue-700 shrink-0" />
              <div>
                <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Otimização de Base</p>
                <p className="text-sm font-medium text-slate-900 mt-1 leading-snug">
                  7 composições de "Pintura" possuem valor <span className="font-black">12% menor</span> na base <span className="italic font-black">SETOP</span> comparado ao SINAPI atual.
                </p>
                <button className="mt-2 text-[10px] font-black uppercase text-blue-700 hover:underline">Ver Comparativo</button>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-l-4 border-gray-400 flex gap-4 opacity-60">
              <FileSearch className="h-5 w-5 text-gray-500 shrink-0" />
              <div>
                <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Análise de BDI</p>
                <p className="text-sm font-medium text-slate-900 mt-1 leading-snug">
                  O BDI aplicado (23%) está dentro da margem aceitável pelo <span className="font-black">TCU</span> para esta tipologia de obra.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Multi-base Comparison */}
        <div className="bg-white p-8 border-t-4 border-blue-700 shadow-sm">
          <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs mb-8">
            Comparativo Multi-Base (R$ Total)
          </h3>
          <HBarChart data={baseComparisonData} />
        </div>

        {/* Real-time Log */}
        <div className="bg-slate-900 p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 -mr-32 -mt-32 rounded-full transition-transform group-hover:scale-110" />
          <h3 className="font-black text-white uppercase tracking-widest text-xs mb-8 relative z-10 flex items-center gap-2">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-ping" />
            Atividade Síncrona (LOG)
          </h3>
          <div className="space-y-6 relative z-10">
            {[
              { user: 'ALLAN DAMASCENO', action: 'Atualizou quantitativos', project: 'REFORMA E.E. ABRAÃO', time: 'Há 2 min' },
              { user: 'MARIA SILVA', action: 'Criou novo orçamento', project: 'AMPLIAÇÃO BLOCO B', time: 'Há 15 min' },
              { user: 'IA AUDITOR', action: 'Sistema detectou redução de 5% no aço', project: 'COMPARAÇÃO SETOP', time: 'Há 1 hora' },
            ].map((activity, i) => (
              <div key={i} className="flex items-start gap-4 border-l border-white/10 pl-4 py-1">
                <div className="flex-1">
                  <p className="text-[10px] font-black text-red-600 uppercase">{activity.user}</p>
                  <p className="text-sm font-bold text-gray-300 mt-0.5">{activity.action}</p>
                  <p className="text-[9px] font-medium text-gray-500 uppercase mt-1 tracking-wider">{activity.project}</p>
                </div>
                <span className="text-[10px] font-black text-gray-600 uppercase whitespace-nowrap">{activity.time}</span>
              </div>
            ))}
          </div>
          <div className="mt-12 p-4 bg-white/5 border border-white/10 rounded">
            <p className="text-[10px] font-black text-white uppercase tracking-widest text-center">3 usuários colaborando simultaneamente</p>
          </div>
        </div>
      </div>

      <motion.div className="hidden" />
    </div>
  );
}
