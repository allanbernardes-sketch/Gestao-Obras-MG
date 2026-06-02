import { useState, useMemo } from 'react';
import { TrendingDown, PieChart, Download } from 'lucide-react';
import { Budget } from './types';

const cn = (...classes: (string | undefined | false | null)[]) => classes.filter(Boolean).join(' ');

interface ABCEntry {
  code: string;
  description: string;
  value: number;
  type: 'SERVICO' | 'MATERIAL' | 'EQUIPAMENTO' | 'MÃO DE OBRA';
}

const MOCK_DATA: ABCEntry[] = [
  { code: '94974', description: 'Concreto Usinado Bombeado fck=25MPa', value: 450000, type: 'SERVICO' },
  { code: '87393', description: 'Fôrma plana de madeira compensada', value: 185000, type: 'SERVICO' },
  { code: '92419', description: 'Armação de pilares/vigas aço CA-50', value: 125000, type: 'MATERIAL' },
  { code: '11145', description: 'Concreto usinado', value: 95000, type: 'MATERIAL' },
  { code: '88309', description: 'Pedreiro com encargos', value: 85000, type: 'MÃO DE OBRA' },
  { code: '88316', description: 'Servente com encargos', value: 65000, type: 'MÃO DE OBRA' },
  { code: 'SIC-100', description: 'Cabeamento estruturado Cat6', value: 45000, type: 'SERVICO' },
  { code: 'SEI-055', description: 'Piso cerâmico 40x40', value: 35000, type: 'MATERIAL' },
  { code: 'SET-001', description: 'Escavação manual solo 1a', value: 25000, type: 'SERVICO' },
  { code: 'EQU-001', description: 'Andaimes metálicos (locação)', value: 15600, type: 'EQUIPAMENTO' },
];

interface Props { budgets: Budget[] }

function ABCBars({ data }: { data: (ABCEntry & { percentage: number; cumulativePercentage: number; category: 'A' | 'B' | 'C' })[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map(item => (
        <div key={item.code} className="flex items-center gap-3">
          <span className="w-16 text-[9px] font-mono text-gray-400 shrink-0">{item.code}</span>
          <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden relative">
            <div className="h-full rounded transition-all duration-500"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: item.category === 'A' ? '#DC2626' : item.category === 'B' ? '#1D4ED8' : '#6B7280'
              }}
            />
          </div>
          <span className="w-20 text-[9px] font-black text-right text-slate-700 shrink-0">
            {item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' })}
          </span>
          <span className="w-14 text-[9px] font-black text-right text-red-600 shrink-0">
            {item.cumulativePercentage.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Reports({ budgets }: Props) {
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>(budgets[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'global' | 'servico' | 'material'>('global');

  const selectedBudget = useMemo(() => budgets.find(b => b.id === selectedBudgetId), [budgets, selectedBudgetId]);

  const abcData = useMemo(() => {
    let sourceData = MOCK_DATA;

    if (selectedBudget?.eap?.length) {
      const items: ABCEntry[] = [];
      const flatten = (nodes: Budget['eap']) => {
        nodes.forEach((node: any) => {
          if (node.type === 'COMPOSICAO' || node.type === 'INSUMO') {
            items.push({ code: node.code, description: node.description, value: node.totalValue || 0, type: node.type === 'INSUMO' ? 'MATERIAL' : 'SERVICO' });
          }
          if (node.children) flatten(node.children);
        });
      };
      flatten(selectedBudget.eap);
      if (items.length > 0) sourceData = items;
    }

    let filtered = [...sourceData];
    if (activeTab === 'servico') filtered = filtered.filter(d => d.type === 'SERVICO');
    if (activeTab === 'material') filtered = filtered.filter(d => d.type === 'MATERIAL' || d.type === 'MÃO DE OBRA');

    const total = filtered.reduce((acc, curr) => acc + curr.value, 0);
    const sorted = [...filtered].sort((a, b) => b.value - a.value);
    let cumulative = 0;
    return sorted.map(item => {
      cumulative += item.value;
      const percentage = total > 0 ? (item.value / total) * 100 : 0;
      const cumulativePercentage = total > 0 ? (cumulative / total) * 100 : 0;
      const category: 'A' | 'B' | 'C' = cumulativePercentage <= 80 ? 'A' : cumulativePercentage <= 95 ? 'B' : 'C';
      return { ...item, percentage, cumulativePercentage, category };
    });
  }, [activeTab, selectedBudget]);

  const totalValue = abcData.reduce((a, b) => a + b.value, 0);
  const classCount = { A: abcData.filter(d => d.category === 'A').length, B: abcData.filter(d => d.category === 'B').length, C: abcData.filter(d => d.category === 'C').length };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-end justify-between border-b border-gray-200 pb-6">
        <div className="flex-1">
          <h1 className="text-xl font-black text-[#13264d] font-sans">
            Análise de <span className="text-red-600">Curva ABC</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            Identifique os itens de maior impacto financeiro no seu orçamento.
          </p>
          <div className="mt-4 max-w-md">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 font-sans mb-2">Selecione o Orçamento</label>
            <select value={selectedBudgetId} onChange={e => setSelectedBudgetId(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-gray-200 rounded font-bold text-sm focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all">
              {budgets.length === 0 && <option value="">Nenhum orçamento disponível</option>}
              {budgets.map(b => <option key={b.id} value={b.id}>{(b.name || 'SEM NOME').toUpperCase()} ({b.school || ''})</option>)}
            </select>
          </div>
        </div>
        <button className="px-5 py-2.5 bg-blue-700 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-800 transition-shadow shadow-md flex items-center gap-2">
          <Download className="h-4 w-4" /> Exportar PDF
        </button>
      </div>

      {/* Tab buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { id: 'global', label: 'ABC Global', icon: PieChart, color: 'border-red-600' },
          { id: 'servico', label: 'ABC de Serviços', icon: TrendingDown, color: 'border-green-600' },
          { id: 'material', label: 'ABC de Materiais', icon: TrendingDown, color: 'border-orange-500' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={cn('p-6 bg-white border-b-4 transition-all text-left shadow-sm hover:shadow-md', activeTab === tab.id ? tab.color : 'border-transparent opacity-60')}>
            <tab.icon className={cn('h-6 w-6 mb-3', activeTab === tab.id ? 'text-slate-900' : 'text-gray-400')} />
            <span className="text-xs font-black uppercase tracking-widest text-slate-900">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ABC Class summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { cat: 'A', label: 'Classe A — 80% do custo', count: classCount.A, color: 'border-red-600 text-red-600', bg: 'bg-red-50' },
          { cat: 'B', label: 'Classe B — 15% do custo', count: classCount.B, color: 'border-blue-700 text-blue-700', bg: 'bg-blue-50' },
          { cat: 'C', label: 'Classe C — 5% do custo', count: classCount.C, color: 'border-gray-400 text-gray-500', bg: 'bg-gray-50' },
        ].map(c => (
          <div key={c.cat} className={cn('p-4 border-l-4 rounded-r-xl', c.color, c.bg)}>
            <p className="text-[10px] font-black uppercase tracking-wider font-sans opacity-70">{c.label}</p>
            <p className="text-3xl font-black mt-1">{c.count} itens</p>
          </div>
        ))}
      </div>

      {/* Bar visualization */}
      <div className="bg-white p-8 border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
            Pareto — {activeTab.toUpperCase()}
          </h3>
          <div className="flex gap-4 text-[10px] font-bold text-gray-500 uppercase">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-600 inline-block" /> Classe A</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-700 inline-block" /> Classe B</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-500 inline-block" /> Classe C</span>
          </div>
        </div>
        <ABCBars data={abcData} />
      </div>

      {/* Table */}
      <div className="bg-white border-t-8 border-slate-900 shadow-xl overflow-hidden">
        <div className="flex items-center gap-2 py-4 px-6 bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
          <div className="w-20">Class.</div>
          <div className="w-24">Código</div>
          <div className="flex-1">Descrição do Item</div>
          <div className="w-32 text-right">Valor (R$)</div>
          <div className="w-24 text-right">% Parcial</div>
          <div className="w-24 text-right">% Acum.</div>
        </div>
        {abcData.map(item => (
          <div key={item.code} className="flex items-center gap-2 py-4 px-6 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
            <div className="w-20">
              <span className={cn('px-3 py-1 rounded text-[10px] font-black uppercase',
                item.category === 'A' ? 'bg-red-600/10 text-red-600' : item.category === 'B' ? 'bg-blue-700/10 text-blue-700' : 'bg-gray-100 text-gray-500')}>
                {item.category}
              </span>
            </div>
            <div className="w-24 text-xs font-mono font-bold text-gray-400">{item.code}</div>
            <div className="flex-1 text-sm font-bold text-slate-900 uppercase tracking-tight">{item.description}</div>
            <div className="w-32 text-right text-sm font-black text-slate-900">R$ {item.value.toLocaleString('pt-BR')}</div>
            <div className="w-24 text-right text-xs font-bold text-gray-500">{item.percentage.toFixed(2)}%</div>
            <div className="w-24 text-right text-xs font-black text-red-600">{item.cumulativePercentage.toFixed(2)}%</div>
          </div>
        ))}
        <div className="p-8 bg-slate-50/30 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resumo ABC</p>
            <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mt-1">
              Total de Itens: <span className="text-red-600">{abcData.length}</span>
            </h4>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Custo Total</p>
            <p className="text-lg font-black text-slate-800 font-sans">
              R$ {totalValue.toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
