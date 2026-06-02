/**
 * BudgetList - Adapted from OrcaGov for Gestao-Obras-MG
 * Firebase removed; uses props for state management.
 */

import { useState, FormEvent, MouseEvent } from 'react';
import {
  MoreVertical,
  Trash2,
  FileEdit,
  Plus,
  X,
  Search,
  Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Budget } from './types';

const cn = (...classes: (string | undefined | false | null)[]) => classes.filter(Boolean).join(' ');

interface Props {
  budgets: Budget[];
  onSelect: (id: string) => void;
  onCreate: (budget: Budget) => void;
  onUpdate: (id: string, data: Partial<Budget>) => void;
  onDelete: (id: string) => void;
}

export default function BudgetList({ budgets, onSelect, onCreate, onUpdate, onDelete }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [newBudgetData, setNewBudgetData] = useState({
    name: '',
    sre: '',
    municipality: '',
    school: '',
    schoolAddress: '',
    templateId: ''
  });

  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterId, setFilterId] = useState('');
  const [filterNome, setFilterNome] = useState('');
  const [filterMunicipality, setFilterMunicipality] = useState('');
  const [filterSre, setFilterSre] = useState('');
  const [filterSchool, setFilterSchool] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const handleCreateBudget = (e: FormEvent) => {
    e.preventDefault();

    let templateData: Partial<Budget> = {};
    if (newBudgetData.templateId) {
      const source = budgets.find(b => b.id === newBudgetData.templateId);
      if (source) {
        templateData = {
          eap: JSON.parse(JSON.stringify(source.eap)),
          bdi: source.bdi ? { ...source.bdi } : undefined,
          totalValue: source.totalValue
        };
      }
    }

    const now = new Date().toISOString();
    const newBudget: Budget = {
      id: Math.random().toString(36).substr(2, 9),
      name: newBudgetData.name,
      sre: newBudgetData.sre,
      municipality: newBudgetData.municipality,
      school: newBudgetData.school,
      schoolAddress: newBudgetData.schoolAddress,
      date: now.split('T')[0],
      status: 'Draft',
      eap: [],
      totalValue: 0,
      createdAt: now,
      updatedAt: now,
      ...templateData
    };

    onCreate(newBudget);
    setIsModalOpen(false);
    setNewBudgetData({ name: '', sre: '', municipality: '', school: '', schoolAddress: '', templateId: '' });
  };

  const handleUpdateBudget = (e: FormEvent) => {
    e.preventDefault();
    if (!editingBudget) return;
    const { id, ...rest } = editingBudget;
    onUpdate(id, { ...rest, updatedAt: new Date().toISOString() });
    setIsEditModalOpen(false);
    setEditingBudget(null);
  };

  const handleDuplicateBudget = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    setActiveDropdownId(null);
    const source = budgets.find(b => b.id === id);
    if (!source) return;
    const now = new Date().toISOString();
    const copy: Budget = {
      ...JSON.parse(JSON.stringify(source)),
      id: Math.random().toString(36).substr(2, 9),
      name: `${source.name} (CÓPIA)`,
      date: now.split('T')[0],
      createdAt: now,
      updatedAt: now
    };
    onCreate(copy);
  };

  const handleStatusUpdate = (id: string, newStatus: string) => {
    onUpdate(id, { status: newStatus as Budget['status'], updatedAt: new Date().toISOString() });
    setUpdatingStatusId(null);
  };

  const handleDeleteBudget = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    setActiveDropdownId(null);
    setDeletingId(null);
    onDelete(id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Draft': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Closed': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Approved': return 'Aprovado';
      case 'Draft': return 'Rascunho';
      case 'Closed': return 'Encerrado';
      default: return status;
    }
  };

  const filteredBudgets = budgets.filter(b => {
    if (filterId && b.id !== filterId) return false;
    if (filterNome && b.name !== filterNome) return false;
    if (filterMunicipality && b.municipality !== filterMunicipality) return false;
    if (filterSre && b.sre !== filterSre) return false;
    if (filterSchool && b.school !== filterSchool) return false;
    if (filterStatus && b.status !== filterStatus) return false;
    if (filterDateFrom && b.date < filterDateFrom) return false;
    if (filterDateTo && b.date > filterDateTo) return false;
    return true;
  });

  const limparFiltros = () => {
    setFilterId(''); setFilterNome(''); setFilterMunicipality('');
    setFilterSre(''); setFilterSchool(''); setFilterStatus('');
    setFilterDateFrom(''); setFilterDateTo('');
  };

  const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));
  const ids = uniq(budgets.map(b => b.id));
  const nomes = uniq(budgets.map(b => b.name));
  const municipios = uniq(budgets.map(b => b.municipality));
  const sres = uniq(budgets.map(b => b.sre));
  const escolas = uniq(budgets.map(b => b.school));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-xl font-black text-[#13264d] font-sans">
            Meus <span className="text-red-600">Orçamentos</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            Gerencie e acompanhe todos os projetos orçamentários do estado.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-all shadow-md active:scale-95 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          Novo Orçamento
        </button>
      </div>

      {/* Filter panel */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {/* ID de Obra */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">ID de Obra</label>
            <select value={filterId} onChange={e => setFilterId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 transition-all">
              <option value="">Todos os IDs</option>
              {ids.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          {/* Nome do Projeto */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Nome do Projeto</label>
            <select value={filterNome} onChange={e => setFilterNome(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 transition-all">
              <option value="">Todos os Projetos</option>
              {nomes.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          {/* Município */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Município</label>
            <select value={filterMunicipality} onChange={e => setFilterMunicipality(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 transition-all">
              <option value="">Todos os Municípios</option>
              {municipios.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Regional SRE */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Regional (SRE)</label>
            <select value={filterSre} onChange={e => setFilterSre(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 transition-all">
              <option value="">Todas as Regionais (SRE)</option>
              {sres.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          {/* Escola */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Escola</label>
            <select value={filterSchool} onChange={e => setFilterSchool(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 transition-all">
              <option value="">Todas as Escolas</option>
              {escolas.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          {/* Status */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Etapa Atual</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 transition-all">
              <option value="">Todas as etapas</option>
              <option value="Draft">Rascunho</option>
              <option value="Approved">Aprovado</option>
              <option value="Closed">Encerrado</option>
            </select>
          </div>
        </div>

        {/* Date range */}
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Data de Criação</label>
            <div className="flex items-center gap-3">
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 transition-all" />
              <span className="text-gray-400 font-bold text-sm shrink-0">à</span>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 transition-all" />
            </div>
          </div>
          <div className="flex items-center gap-3 pb-0.5">
            <span className="text-[10px] text-gray-400 font-bold">{filteredBudgets.length} resultado{filteredBudgets.length !== 1 ? 's' : ''}</span>
            <button onClick={limparFiltros}
              className="text-[10px] font-black uppercase tracking-wider font-sans text-blue-700 hover:underline flex items-center gap-1">
              <X className="w-3 h-3" /> Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border-t-4 border-blue-700 shadow-sm overflow-hidden text-xs">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-blue-700 text-white uppercase tracking-widest text-[10px] font-bold">
              <th className="text-left px-6 py-4">Projeto / Escola</th>
              <th className="text-left px-6 py-4">SRE</th>
              <th className="text-left px-6 py-4">Município</th>
              <th className="text-left px-6 py-4">Data</th>
              <th className="text-right px-6 py-4">Valor Total</th>
              <th className="text-center px-6 py-4">Status</th>
              <th className="text-right px-6 py-4">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredBudgets.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-20 text-center">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-tight">
                    Nenhum orçamento encontrado.
                  </p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="mt-4 text-red-600 font-black text-[10px] uppercase tracking-widest hover:underline"
                  >
                    + Criar Primeiro Orçamento
                  </button>
                </td>
              </tr>
            ) : filteredBudgets.map((budget, i) => (
              <motion.tr
                key={budget.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="hover:bg-gray-50 transition-colors group cursor-pointer"
                onClick={() => onSelect(budget.id)}
              >
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900 uppercase tracking-tight">{budget.name}</div>
                  <div className="text-[10px] text-red-600 mt-0.5 font-bold uppercase">{budget.school}</div>
                  <div className="text-[9px] text-gray-400 font-medium">GRP: {budget.id.padStart(6, '0')}</div>
                </td>
                <td className="px-6 py-4 text-gray-600 font-bold uppercase text-[10px] tracking-tight">{budget.sre}</td>
                <td className="px-6 py-4 text-gray-600 font-medium">{budget.municipality}</td>
                <td className="px-6 py-4 text-gray-500 font-bold uppercase tracking-tight">
                  {new Date(budget.date).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 text-right font-black text-slate-900">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budget.totalValue)}
                </td>
                <td className="px-6 py-4 text-center">
                  <div onClick={(e) => e.stopPropagation()} className="relative inline-block">
                    {updatingStatusId === budget.id ? (
                      <select
                        autoFocus
                        className="text-[9px] font-black uppercase tracking-widest border rounded px-2 py-1 outline-none focus:ring-2 focus:ring-red-600/50 bg-white"
                        value={budget.status}
                        onBlur={() => setUpdatingStatusId(null)}
                        onChange={(e) => handleStatusUpdate(budget.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="Draft">Rascunho</option>
                        <option value="Approved">Aprovado</option>
                        <option value="Closed">Encerrado</option>
                      </select>
                    ) : (
                      <span
                        onClick={(e) => { e.stopPropagation(); setUpdatingStatusId(budget.id); }}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 border rounded text-[9px] font-black uppercase tracking-widest cursor-pointer hover:opacity-80 transition-all',
                          getStatusColor(budget.status)
                        )}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                        {getStatusLabel(budget.status)}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {deletingId === budget.id ? (
                      <div className="flex items-center gap-1 bg-red-600 text-white rounded px-2 py-1">
                        <span className="text-[8px] font-black uppercase tracking-widest mr-1">Excluir?</span>
                        <button
                          onClick={(e) => handleDeleteBudget(budget.id, e)}
                          className="p-1 hover:bg-white/20 rounded font-bold text-[8px] uppercase tracking-widest"
                        >
                          Sim
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeletingId(null); }}
                          className="p-1 hover:bg-white/20 rounded font-bold text-[8px] uppercase tracking-widest"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          title="Abrir Orçamento"
                          onClick={(e) => { e.stopPropagation(); onSelect(budget.id); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700/10 text-blue-700 hover:bg-blue-700 hover:text-white rounded transition-all font-black text-[9px] uppercase tracking-widest border border-blue-700/20"
                        >
                          <FileEdit className="h-3.5 w-3.5" />
                          <span>Abrir</span>
                        </button>
                        <button
                          title="Editar Metadados"
                          onClick={(e) => { e.stopPropagation(); setEditingBudget(budget); setIsEditModalOpen(true); }}
                          className="p-2 text-gray-400 hover:text-slate-900 hover:bg-gray-100 rounded transition-all"
                        >
                          <Pencil className="h-4 w-4 pointer-events-none" />
                        </button>
                        <button
                          title="Excluir Orçamento"
                          onClick={(e) => { e.stopPropagation(); setDeletingId(budget.id); }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-600/5 rounded transition-all"
                        >
                          <Trash2 className="h-4 w-4 pointer-events-none" />
                        </button>
                        <div className="relative">
                          <button
                            title="Mais Opções"
                            onClick={(e) => { e.stopPropagation(); setActiveDropdownId(activeDropdownId === budget.id ? null : budget.id); }}
                            className="p-2 text-gray-400 hover:text-slate-900 hover:bg-gray-100 rounded transition-all"
                          >
                            <MoreVertical className="h-4 w-4 pointer-events-none" />
                          </button>

                          <AnimatePresence>
                            {activeDropdownId === budget.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-xl z-[100] py-2 overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={(e) => handleDuplicateBudget(budget.id, e)}
                                  className="w-full text-left px-4 py-2 hover:bg-blue-700/5 text-slate-900 flex items-center gap-2 transition-all"
                                >
                                  <Plus className="h-3.5 w-3.5 text-blue-700" />
                                  <span className="font-bold text-[10px] uppercase tracking-widest">Duplicar Orçamento</span>
                                </button>
                                <div className="border-t border-gray-100 my-1"></div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDeletingId(budget.id); setActiveDropdownId(null); }}
                                  className="w-full text-left px-4 py-2 hover:bg-red-600/5 text-red-600 flex items-center gap-2 transition-all"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span className="font-bold text-[10px] uppercase tracking-widest">Excluir Orçamento</span>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingBudget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded shadow-2xl w-full max-w-2xl overflow-hidden border-t-8 border-blue-700"
            >
              <div className="flex items-center justify-between p-6 bg-slate-50 border-b border-gray-200">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  Editar <span className="text-blue-700">Orçamento</span>
                </h3>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleUpdateBudget} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 font-sans mb-2">Nome do Orçamento</label>
                    <input
                      required
                      type="text"
                      value={editingBudget.name}
                      onChange={(e) => setEditingBudget({ ...editingBudget, name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded font-bold text-sm focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 font-sans mb-2">SRE (Superintendência)</label>
                    <select
                      required
                      value={editingBudget.sre}
                      onChange={(e) => setEditingBudget({ ...editingBudget, sre: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded font-bold text-sm focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 outline-none transition-all"
                    >
                      <option value="">Selecione a SRE</option>
                      <option value="SRE Metropolitana A">SRE Metropolitana A</option>
                      <option value="SRE Metropolitana B">SRE Metropolitana B</option>
                      <option value="SRE Metropolitana C">SRE Metropolitana C</option>
                      <option value="SRE Contagem">SRE Contagem</option>
                      <option value="SRE Uberlândia">SRE Uberlândia</option>
                      <option value="SRE Juiz de Fora">SRE Juiz de Fora</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 font-sans mb-2">Município</label>
                    <input
                      required
                      type="text"
                      value={editingBudget.municipality}
                      onChange={(e) => setEditingBudget({ ...editingBudget, municipality: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded font-bold text-sm focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 font-sans mb-2">Escola</label>
                    <input
                      required
                      type="text"
                      value={editingBudget.school}
                      onChange={(e) => setEditingBudget({ ...editingBudget, school: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded font-bold text-sm focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 font-sans mb-2">Endereço</label>
                    <input
                      type="text"
                      value={editingBudget.schoolAddress || ''}
                      onChange={(e) => setEditingBudget({ ...editingBudget, schoolAddress: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded font-bold text-sm focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 px-6 py-4 bg-slate-100 text-slate-900 text-[10px] font-black uppercase tracking-wider rounded hover:bg-gray-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-4 bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider rounded shadow-lg shadow-blue-700/20 hover:bg-blue-800 transition-all active:scale-95"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded shadow-2xl w-full max-w-2xl overflow-hidden border-t-8 border-red-600"
            >
              <div className="flex items-center justify-between p-6 bg-slate-50 border-b border-gray-200">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  Novo <span className="text-red-600">Orçamento</span>
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleCreateBudget} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 font-sans mb-2">
                      Usar Orçamento como Base (Opcional)
                    </label>
                    <select
                      value={newBudgetData.templateId}
                      onChange={(e) => setNewBudgetData({ ...newBudgetData, templateId: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded font-bold text-sm focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all"
                    >
                      <option value="">-- CRIAR DO ZERO (VAZIO) --</option>
                      {budgets.map(b => (
                        <option key={b.id} value={b.id}>{b.name.toUpperCase()} ({b.school})</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 font-sans mb-2">Nome do Orçamento</label>
                    <input
                      required
                      type="text"
                      value={newBudgetData.name}
                      onChange={(e) => setNewBudgetData({ ...newBudgetData, name: e.target.value })}
                      placeholder="Ex: Reforma Geral Bloco A"
                      className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded font-bold text-sm focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 font-sans mb-2">SRE (Superintendência)</label>
                    <select
                      required
                      value={newBudgetData.sre}
                      onChange={(e) => setNewBudgetData({ ...newBudgetData, sre: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded font-bold text-sm focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all"
                    >
                      <option value="">Selecione a SRE</option>
                      <option value="SRE Metropolitana A">SRE Metropolitana A</option>
                      <option value="SRE Metropolitana B">SRE Metropolitana B</option>
                      <option value="SRE Metropolitana C">SRE Metropolitana C</option>
                      <option value="SRE Contagem">SRE Contagem</option>
                      <option value="SRE Uberlândia">SRE Uberlândia</option>
                      <option value="SRE Juiz de Fora">SRE Juiz de Fora</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 font-sans mb-2">Município</label>
                    <input
                      required
                      type="text"
                      value={newBudgetData.municipality}
                      onChange={(e) => setNewBudgetData({ ...newBudgetData, municipality: e.target.value })}
                      placeholder="Ex: Belo Horizonte"
                      className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded font-bold text-sm focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 font-sans mb-2">Escola</label>
                    <input
                      required
                      type="text"
                      value={newBudgetData.school}
                      onChange={(e) => setNewBudgetData({ ...newBudgetData, school: e.target.value })}
                      placeholder="Nome da Escola Estadual"
                      className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded font-bold text-sm focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 font-sans mb-2">Endereço</label>
                    <input
                      type="text"
                      value={newBudgetData.schoolAddress}
                      onChange={(e) => setNewBudgetData({ ...newBudgetData, schoolAddress: e.target.value })}
                      placeholder="Rua, Número, Bairro"
                      className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded font-bold text-sm focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 bg-slate-100 text-slate-900 text-[10px] font-black uppercase tracking-wider rounded hover:bg-gray-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-4 bg-red-600 text-white text-[10px] font-black uppercase tracking-wider rounded shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all active:scale-95"
                  >
                    Criar Orçamento
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
