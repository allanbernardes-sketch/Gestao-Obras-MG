import { useState, useMemo } from 'react';
import { TrendingDown, PieChart, Download, CheckCircle, AlertTriangle, Package } from 'lucide-react';
import { Budget } from './types';
import { MOCK_COMPOSITIONS, CompositionItem } from './CompositionsManager';
import { MOCK_SUPPLIES } from './SuppliesManager';

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

// Fontes/bases de preço reconhecidas — usadas para identificar a origem de uma composição a partir
// do prefixo salvo em EAPNode.description (ex: "SINAPI-94974 Concreto usinado..."), já que o EAP do
// orçamento (BudgetDetail) não guarda a fonte como campo estruturado separado.
const FONTES_CONHECIDAS = ['SINAPI', 'SETOP', 'SEINFRA', 'SICRO'];

interface ComposicaoUsageEntry {
  id: string;
  eapCode: string;
  eapPath: string;
  source: string;
  compCode: string;
  description: string;
  unit: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
  bankMatch: CompositionItem | null;
}

function parseComposicaoDescricao(desc: string): { source: string; compCode: string; description: string } {
  const match = (desc || '').match(/^([A-Z]+)-(\S+)\s+(.*)$/);
  if (match && FONTES_CONHECIDAS.includes(match[1])) {
    return { source: match[1], compCode: match[2], description: match[3] };
  }
  return { source: 'PRÓPRIA', compCode: '', description: desc || '' };
}

// Classifica um insumo da composição analítica (Material / Mão de Obra / Equipamento / ...) cruzando
// com o Banco de Insumos pelo código; sem correspondência, cai numa heurística simples pela unidade
// (unidade 'h' quase sempre indica mão de obra) — a base de insumos ainda é pequena neste protótipo.
function classificarCategoriaInsumo(item: CompositionItem): string {
  const supply = MOCK_SUPPLIES.find(s => s.code === item.code);
  if (supply) return supply.category;
  if ((item.unit || '').trim().toLowerCase() === 'h') return 'Mão de Obra';
  return 'Material';
}

interface MaterialConsolidado {
  code: string;
  description: string;
  unit: string;
  unitValue: number;
  totalQuantity: number;
  totalValue: number;
}

// Expande recursivamente uma composição analítica (do Banco de Composições) até os insumos-material,
// acumulando o coeficiente técnico a cada nível e multiplicando pela quantidade do serviço no orçamento.
// Mão de obra/equipamento/serviços auxiliares são descartados, exceto quando decompostos em sub-itens
// que cheguem a materiais (aí descemos neles em busca de materiais, em vez de simplesmente ignorá-los).
function expandirComposicaoEmMateriais(
  compItem: CompositionItem,
  coeficienteAcumulado: number,
  quantidadeServico: number,
  out: MaterialConsolidado[]
) {
  (compItem.children || []).forEach(child => {
    const coeficienteFilho = coeficienteAcumulado * (child.coefficient || 1);
    const categoria = classificarCategoriaInsumo(child);
    const temFilhos = !!child.children && child.children.length > 0;

    if (categoria === 'Material') {
      const quantidade = quantidadeServico * coeficienteFilho;
      out.push({
        code: child.code,
        description: child.description,
        unit: child.unit,
        unitValue: child.value,
        totalQuantity: quantidade,
        totalValue: quantidade * child.value
      });
    }

    if (temFilhos) {
      expandirComposicaoEmMateriais(child, coeficienteFilho, quantidadeServico, out);
    }
  });
}

// Ordena por valor decrescente e classifica em A/B/C de forma sequencial (ver nota em classifyABC abaixo).
function classifyABC(items: ABCEntry[]) {
  const total = items.reduce((acc, curr) => acc + curr.value, 0);
  const sorted = [...items].sort((a, b) => b.value - a.value);
  let cumulative = 0;
  // Classificação sequencial (não reavalia cada item isoladamente contra os limiares): a classe
  // corrente só avança para a próxima DEPOIS que o item é classificado, então o item que faz o
  // acumulado cruzar 80% (ou 95%) permanece na classe atual, mesmo que seu próprio percentual
  // acumulado já ultrapasse o limiar seguinte — evita que um item dominante "pule" direto para C.
  let currentClass: 'A' | 'B' | 'C' = 'A';
  return sorted.map(item => {
    cumulative += item.value;
    const percentage = total > 0 ? (item.value / total) * 100 : 0;
    const cumulativePercentage = total > 0 ? (cumulative / total) * 100 : 0;

    const category = currentClass;
    if (currentClass === 'A' && cumulativePercentage >= 80) {
      currentClass = 'B';
    } else if (currentClass === 'B' && cumulativePercentage >= 95) {
      currentClass = 'C';
    }

    return { ...item, percentage, cumulativePercentage, category };
  });
}

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

type ReportType = 'abc' | 'composicoes';

interface Props { budgets: Budget[]; reportType: ReportType }

export default function Reports({ budgets, reportType }: Props) {
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>(budgets[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'global' | 'servico' | 'material'>('global');
  const [expandedComp, setExpandedComp] = useState<Set<string>>(new Set());

  const selectedBudget = useMemo(() => budgets.find(b => b.id === selectedBudgetId), [budgets, selectedBudgetId]);

  const toggleExpandComp = (id: string) => {
    setExpandedComp(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const abcData = useMemo(() => {
    // ABC Materiais usa uma base completamente diferente das outras duas abas: em vez da lista sintética
    // de itens da planilha (nível de composição/serviço), expande cada composição de serviço do orçamento
    // na sua estrutura analítica (Banco de Composições) e consolida só os insumos classificados como Material.
    if (activeTab === 'material') {
      const materiaisPorCodigo = new Map<string, MaterialConsolidado>();

      if (selectedBudget?.eap?.length) {
        const walkEap = (nodes: Budget['eap']) => {
          nodes.forEach((node: any) => {
            if (node.type === 'COMPOSICAO') {
              const { compCode } = parseComposicaoDescricao(node.description);
              const bankMatch = compCode ? MOCK_COMPOSITIONS.find(c => c.code === compCode) : null;
              if (bankMatch) {
                const materiaisDoServico: MaterialConsolidado[] = [];
                expandirComposicaoEmMateriais(bankMatch, 1, node.quantity || 0, materiaisDoServico);
                materiaisDoServico.forEach(m => {
                  const existente = materiaisPorCodigo.get(m.code);
                  if (existente) {
                    existente.totalQuantity += m.totalQuantity;
                    existente.totalValue += m.totalValue;
                  } else {
                    materiaisPorCodigo.set(m.code, { ...m });
                  }
                });
              }
            }
            if (node.children) walkEap(node.children);
          });
        };
        walkEap(selectedBudget.eap);
      }

      let materialItems: ABCEntry[] = Array.from(materiaisPorCodigo.values()).map(m => ({
        code: m.code,
        description: m.description,
        value: m.totalValue,
        type: 'MATERIAL' as const
      }));

      // Sem orçamento selecionado (ou nenhuma composição reconhecida no banco), cai nos dados de exemplo.
      if (materialItems.length === 0) {
        materialItems = MOCK_DATA.filter(d => d.type === 'MATERIAL' || d.type === 'MÃO DE OBRA');
      }

      return classifyABC(materialItems);
    }

    // ABC Global / ABC Serviços: nível sintético (composição/serviço) da planilha, como antes.
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

    return classifyABC(filtered);
  }, [activeTab, selectedBudget]);

  const totalValue = abcData.reduce((a, b) => a + b.value, 0);
  const classCount = { A: abcData.filter(d => d.category === 'A').length, B: abcData.filter(d => d.category === 'B').length, C: abcData.filter(d => d.category === 'C').length };

  // Todas as composições (type === 'COMPOSICAO') efetivamente utilizadas na EAP do orçamento selecionado,
  // cruzadas com o Banco de Composições para trazer o detalhamento de insumos e permitir a validação.
  const composicoesUsadas = useMemo<ComposicaoUsageEntry[]>(() => {
    if (!selectedBudget?.eap?.length) return [];
    const entries: ComposicaoUsageEntry[] = [];
    const walk = (nodes: Budget['eap'], pathLabels: string[]) => {
      nodes.forEach((node: any) => {
        if (node.type === 'COMPOSICAO') {
          const { source, compCode, description } = parseComposicaoDescricao(node.description);
          const bankMatch = compCode ? MOCK_COMPOSITIONS.find(c => c.code === compCode) || null : null;
          entries.push({
            id: node.id,
            eapCode: node.code,
            eapPath: pathLabels.join(' › '),
            source,
            compCode: compCode || node.code,
            description,
            unit: node.unit || '--',
            quantity: node.quantity || 0,
            unitValue: node.unitValue || 0,
            totalValue: node.totalValue || 0,
            bankMatch
          });
        }
        if (node.children?.length) walk(node.children, [...pathLabels, node.description || node.code]);
      });
    };
    walk(selectedBudget.eap, []);
    return entries;
  }, [selectedBudget]);

  const totalComposicoesValor = composicoesUsadas.reduce((s, c) => s + c.totalValue, 0);
  const composicoesValidadas = composicoesUsadas.filter(c => !!c.bankMatch).length;
  const composicoesNaoLocalizadas = composicoesUsadas.length - composicoesValidadas;

  const composicoesPorFonte = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    composicoesUsadas.forEach(c => {
      if (!map[c.source]) map[c.source] = { count: 0, value: 0 };
      map[c.source].count += 1;
      map[c.source].value += c.totalValue;
    });
    return Object.entries(map)
      .map(([source, v]) => ({ source, ...v }))
      .sort((a, b) => b.value - a.value);
  }, [composicoesUsadas]);

  return (
    <div className="p-6 space-y-6 w-full animate-in fade-in duration-500">
      {/* Header + seletor + botão em linha */}
      <div className="flex flex-col md:flex-row md:items-end gap-4 border-b border-gray-200 pb-5 print:hidden">
        <div>
          <h1 className="text-xl font-black text-[#13264d] font-sans">
            {reportType === 'abc' ? (
              <>Análise de <span className="text-red-600">Curva ABC</span></>
            ) : (
              <>Banco de <span className="text-red-600">Composições</span> do Orçamento</>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            {reportType === 'abc'
              ? 'Identifique os itens de maior impacto financeiro no seu orçamento.'
              : 'Apresentação, validação e detalhamento técnico de todas as composições utilizadas — para análise de engenharia, fiscalização e auditoria.'}
          </p>
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 font-sans mb-1.5">Selecione o Orçamento</label>
          <select value={selectedBudgetId} onChange={e => setSelectedBudgetId(e.target.value)}
            className="w-full px-4 py-2 bg-white border border-gray-200 rounded font-bold text-sm focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all">
            {budgets.length === 0 && <option value="">Nenhum orçamento disponível</option>}
            {budgets.map(b => <option key={b.id} value={b.id}>{(b.name || 'SEM NOME').toUpperCase()} ({b.school || ''})</option>)}
          </select>
        </div>
        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 bg-blue-700 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-800 transition-shadow shadow-md flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Download className="h-4 w-4" /> Exportar PDF
        </button>
      </div>

      {/* Cabeçalho exclusivo para a versão impressa (o bloco acima some no print) */}
      <div className="hidden print:block">
        <h1 className="text-xl font-black text-slate-900 uppercase">
          {reportType === 'abc' ? 'Análise de Curva ABC' : 'Relatório de Banco de Composições do Orçamento'}
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          {selectedBudget ? `${selectedBudget.name} — ${selectedBudget.school} (${selectedBudget.sre})` : 'Nenhum orçamento selecionado'}
        </p>
      </div>

      {reportType === 'abc' ? (
        <>
          {/* Abas + resumo ABC em linha */}
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 print:hidden">
            {/* Tab buttons — 3 cols */}
            <div className="lg:col-span-3 grid grid-cols-3 gap-3">
              {[
                { id: 'global', label: 'ABC Global', icon: PieChart, color: 'border-red-600' },
                { id: 'servico', label: 'ABC Serviços', icon: TrendingDown, color: 'border-green-600' },
                { id: 'material', label: 'ABC Materiais', icon: TrendingDown, color: 'border-orange-500' },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn('p-4 bg-white border-b-4 transition-all text-left shadow-sm hover:shadow-md', activeTab === tab.id ? tab.color : 'border-transparent opacity-60')}>
                  <tab.icon className={cn('h-5 w-5 mb-2', activeTab === tab.id ? 'text-slate-900' : 'text-gray-400')} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 block">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* ABC Class summary — 3 cols */}
            <div className="lg:col-span-3 grid grid-cols-3 gap-3">
            {[
              { cat: 'A', label: 'Classe A — 80%', count: classCount.A, color: 'border-red-600 text-red-600', bg: 'bg-red-50' },
              { cat: 'B', label: 'Classe B — 15%', count: classCount.B, color: 'border-blue-700 text-blue-700', bg: 'bg-blue-50' },
              { cat: 'C', label: 'Classe C — 5%', count: classCount.C, color: 'border-gray-400 text-gray-500', bg: 'bg-gray-50' },
            ].map(c => (
              <div key={c.cat} className={cn('p-4 border-l-4 rounded-r-xl', c.color, c.bg)}>
                <p className="text-[10px] font-black uppercase tracking-wider font-sans opacity-70">{c.label}</p>
                <p className="text-2xl font-black mt-1">{c.count} itens</p>
              </div>
            ))}
            </div>{/* fecha grid cols 3 do resumo */}
          </div>{/* fecha grid lg:col-span-6 */}

          {/* Bar visualization + Table lado a lado em telas largas */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Bar visualization */}
          <div className="bg-white p-6 border border-gray-200 shadow-sm space-y-4 print:hidden">
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
          <div className="bg-white border-t-8 border-slate-900 shadow-xl overflow-hidden flex flex-col">
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
            <div className="p-5 bg-slate-50/30 flex items-center justify-between mt-auto">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resumo ABC</p>
                <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight mt-0.5">
                  Itens: <span className="text-red-600">{abcData.length}</span>
                </h4>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Custo Total</p>
                <p className="text-base font-black text-slate-800 font-sans">
                  R$ {totalValue.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </div>

          </div>{/* fecha grid xl:grid-cols-2 */}
        </>
      ) : (
        <div className="space-y-6">
          {/* Resumo de auditoria */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white border-l-4 border-slate-900 shadow-sm print:break-inside-avoid">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Composições Utilizadas</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{composicoesUsadas.length}</p>
            </div>
            <div className="p-4 bg-white border-l-4 border-blue-700 shadow-sm print:break-inside-avoid">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor Total das Composições</p>
              <p className="text-lg font-black text-blue-700 mt-1">R$ {totalComposicoesValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="p-4 bg-white border-l-4 border-green-600 shadow-sm print:break-inside-avoid">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-600" /> Validadas no Banco
              </p>
              <p className="text-2xl font-black text-green-600 mt-1">{composicoesValidadas}</p>
            </div>
            <div className={cn('p-4 bg-white border-l-4 shadow-sm print:break-inside-avoid', composicoesNaoLocalizadas > 0 ? 'border-amber-500' : 'border-gray-200')}>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-500" /> Não Localizadas
              </p>
              <p className={cn('text-2xl font-black mt-1', composicoesNaoLocalizadas > 0 ? 'text-amber-600' : 'text-gray-300')}>{composicoesNaoLocalizadas}</p>
            </div>
          </div>

          {/* Distribuição por fonte / base de preços */}
          {composicoesPorFonte.length > 0 && (
            <div className="bg-white p-5 border border-gray-200 shadow-sm print:break-inside-avoid">
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-3">Distribuição por Fonte / Base de Preços</h3>
              <div className="space-y-2">
                {composicoesPorFonte.map(f => {
                  const pct = totalComposicoesValor > 0 ? (f.value / totalComposicoesValor) * 100 : 0;
                  return (
                    <div key={f.source} className="flex items-center gap-3">
                      <span className="w-20 text-[9px] font-black text-gray-500 uppercase tracking-wider shrink-0">{f.source}</span>
                      <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                        <div className="h-full bg-blue-700 rounded" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-20 text-[9px] font-bold text-gray-500 shrink-0 text-right">{f.count} item{f.count !== 1 ? 's' : ''}</span>
                      <span className="w-32 text-[9px] font-black text-right text-slate-900 shrink-0">R$ {f.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lista detalhada e validada das composições */}
          <div className="bg-white border-t-8 border-red-600 shadow-xl overflow-hidden">
            <div className="flex items-center gap-2 py-4 px-6 bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
              <div className="w-20 shrink-0">Fonte</div>
              <div className="w-24 shrink-0">Código</div>
              <div className="flex-1">Composição / Localização na EAP</div>
              <div className="w-14 text-center shrink-0">Und.</div>
              <div className="w-20 text-right shrink-0">Qtd.</div>
              <div className="w-28 text-right shrink-0">Vlr. Unit.</div>
              <div className="w-32 text-right shrink-0">Vlr. Total</div>
              <div className="w-28 text-center shrink-0">Situação</div>
            </div>

            {composicoesUsadas.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-xs font-bold uppercase tracking-wider">
                Nenhuma composição utilizada neste orçamento.
              </div>
            ) : composicoesUsadas.map(comp => {
              const isExpanded = expandedComp.has(comp.id);
              return (
                <div key={comp.id} className="border-b border-gray-100 last:border-0 print:break-inside-avoid">
                  <div
                    className={cn('flex items-center gap-2 py-3.5 px-6 hover:bg-gray-50 transition-colors', comp.bankMatch && 'cursor-pointer')}
                    onClick={() => comp.bankMatch && toggleExpandComp(comp.id)}
                  >
                    <div className="w-20 shrink-0">
                      <span className={cn('px-1.5 py-0.5 text-[9px] font-black uppercase rounded', comp.source === 'PRÓPRIA' ? 'bg-purple-700/10 text-purple-700' : 'bg-blue-700/10 text-blue-700')}>
                        {comp.source}
                      </span>
                    </div>
                    <div className="w-24 shrink-0 text-xs font-mono font-bold text-gray-500">{comp.compCode}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 uppercase tracking-tight truncate">{comp.description}</p>
                      <p className="text-[9px] text-gray-400 font-mono mt-0.5 truncate">
                        EAP {comp.eapCode}{comp.eapPath ? ` — ${comp.eapPath}` : ''}
                      </p>
                    </div>
                    <div className="w-14 shrink-0 text-center text-[10px] font-bold text-gray-500">{comp.unit}</div>
                    <div className="w-20 shrink-0 text-right text-xs font-bold text-gray-700">{comp.quantity.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    <div className="w-28 shrink-0 text-right text-xs font-bold text-gray-700">R$ {comp.unitValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    <div className="w-32 shrink-0 text-right text-sm font-black text-slate-900">R$ {comp.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    <div className="w-28 shrink-0 text-center">
                      {comp.bankMatch ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black text-green-600 uppercase">
                          <CheckCircle className="h-3 w-3 shrink-0" />
                          <span className="print:hidden">{isExpanded ? 'Ocultar' : 'Ver Insumos'}</span>
                          <span className="hidden print:inline">Validada</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-600 uppercase" title="Composição não localizada no banco — sem detalhamento de insumos disponível">
                          <AlertTriangle className="h-3 w-3 shrink-0" /> Não Localizada
                        </span>
                      )}
                    </div>
                  </div>

                  {comp.bankMatch && (
                    <div className={cn(
                      'bg-slate-50/60 px-6 py-4 pl-24 border-t border-gray-100 print:pl-6 print:block',
                      isExpanded ? 'block' : 'hidden'
                    )}>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Package className="h-3 w-3" /> Insumos Vinculados (índice por unidade de {comp.unit})
                      </p>
                      <div className="space-y-1.5">
                        {(comp.bankMatch!.children || []).map(res => {
                          const custoUnitario = (res.coefficient || 1) * res.value;
                          const custoNoOrcamento = custoUnitario * comp.quantity;
                          return (
                            <div key={res.id} className="flex items-center gap-3 text-[10px] bg-white px-3 py-2 rounded border border-gray-100">
                              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 font-black uppercase rounded text-[8px] shrink-0">{res.database}</span>
                              <span className="w-20 font-mono text-gray-400 shrink-0">{res.code}</span>
                              <span className="flex-1 font-bold text-slate-700 uppercase truncate">{res.description}</span>
                              <span className="w-14 text-center text-gray-500 shrink-0">{res.unit}</span>
                              <span className="w-24 text-right font-bold text-blue-700 shrink-0">Índice {(res.coefficient || 1).toLocaleString('pt-BR', { minimumFractionDigits: 4 })}</span>
                              <span className="w-24 text-right text-gray-600 shrink-0">R$ {res.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              <span className="w-28 text-right font-black text-slate-900 shrink-0">R$ {custoNoOrcamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                          );
                        })}
                        {(!comp.bankMatch!.children || comp.bankMatch!.children.length === 0) && (
                          <p className="text-[10px] text-gray-400 italic">Composição localizada no banco, mas sem insumos detalhados cadastrados.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="p-5 bg-slate-50/30 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resumo do Relatório</p>
                <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight mt-0.5">
                  Composições: <span className="text-red-600">{composicoesUsadas.length}</span>
                </h4>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Valor Total das Composições</p>
                <p className="text-base font-black text-slate-800 font-sans">
                  R$ {totalComposicoesValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
