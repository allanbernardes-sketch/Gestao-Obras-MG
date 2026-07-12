import { useState, useEffect } from 'react';
import { Budget } from './types';
import BudgetList from './BudgetList';
import BudgetDetail from './BudgetDetail';
import CompositionsManager from './CompositionsManager';
import SuppliesManager from './SuppliesManager';
import Reports from './Reports';

const STORAGE_KEY = 'orca_budgets_mg';

interface Props {
  activeSubTask: string;
  setActiveSubTask: (s: string) => void;
  sreDoTecnico?: string;
  perfilUsuario?: string;
}

function loadBudgets(): Budget[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Budget[]) : [];
  } catch { return []; }
}

export default function OrcamentoModule({ activeSubTask, setActiveSubTask, sreDoTecnico, perfilUsuario }: Props) {
  const [budgets, setBudgets] = useState<Budget[]>(loadBudgets);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
  }, [budgets]);

  // Sub-abas com sua própria tela (qualquer outro activeSubTask, incluindo valores não mapeados
  // como o 'blank' inicial ao entrar no módulo, cai na aba de orçamentos — mesmo fallback do switch abaixo).
  const OUTRAS_ABAS = ['orca_compositions', 'orca_supplies', 'orca_reports_abc', 'orca_reports_composicoes'];
  const isAbaOrcamentos = !OUTRAS_ABAS.includes(activeSubTask);

  // When navigating away from budgets tab, clear selection
  useEffect(() => {
    if (!isAbaOrcamentos) setSelectedBudgetId(null);
  }, [isAbaOrcamentos]);

  const handleCreate = (budget: Budget) => setBudgets(prev => [budget, ...prev]);
  const handleUpdate = (id: string, data: Partial<Budget>) => setBudgets(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
  const handleUpdateFull = (updated: Budget) => setBudgets(prev => prev.map(b => b.id === updated.id ? updated : b));
  const handleDelete = (id: string) => { setBudgets(prev => prev.filter(b => b.id !== id)); if (selectedBudgetId === id) setSelectedBudgetId(null); };

  const selectedBudget = budgets.find(b => b.id === selectedBudgetId) || null;

  // BudgetDetail takes over when a budget is selected in the budgets tab
  if (isAbaOrcamentos && selectedBudget) {
    return (
      <BudgetDetail
        budget={selectedBudget}
        onBack={() => setSelectedBudgetId(null)}
        onUpdate={handleUpdateFull}
      />
    );
  }

  switch (activeSubTask) {
    case 'orca_budgets':
      return <BudgetList budgets={budgets} onSelect={setSelectedBudgetId} onCreate={handleCreate} onUpdate={handleUpdate} onDelete={handleDelete} sreDoTecnico={sreDoTecnico} perfilUsuario={perfilUsuario} />;
    case 'orca_compositions':
      return <CompositionsManager budgets={budgets} perfilUsuario={perfilUsuario} />;
    case 'orca_supplies':
      return <SuppliesManager perfilUsuario={perfilUsuario} />;
    case 'orca_reports_abc':
      return <Reports budgets={budgets} reportType="abc" />;
    case 'orca_reports_composicoes':
      return <Reports budgets={budgets} reportType="composicoes" />;
    default:
      return <BudgetList budgets={budgets} onSelect={setSelectedBudgetId} onCreate={handleCreate} onUpdate={handleUpdate} onDelete={handleDelete} sreDoTecnico={sreDoTecnico} perfilUsuario={perfilUsuario} />;
  }
}
