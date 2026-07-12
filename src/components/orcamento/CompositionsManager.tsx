/**
 * CompositionsManager - Adapted from OrcaGov for Gestao-Obras-MG
 * No Firebase in original; just fixed mg-* colors and imports.
 */

import { useState, FormEvent } from 'react';
import {
  Search,
  Plus,
  Download,
  Filter,
  ChevronRight,
  ChevronDown,
  Database,
  Info,
  Edit,
  Trash2,
  Import,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Budget } from './types';
import { MOCK_SUPPLIES } from './SuppliesManager';

const cn = (...classes: (string | undefined | false | null)[]) => classes.filter(Boolean).join(' ');

export interface CompositionItem {
  id: string;
  code: string;
  description: string;
  unit: string;
  value: number;
  database: string;
  coefficient?: number;
  children?: CompositionItem[];
}

export const MOCK_COMPOSITIONS: CompositionItem[] = [
  {
    id: '1',
    code: '94974',
    description: 'Concreto usinado bombeado, fck=25MPa',
    unit: 'm3',
    value: 380.50,
    database: 'SINAPI',
    children: [
      { id: '1.1', code: '88309', description: 'Pedreiro com encargos complementares', unit: 'h', value: 25.30, database: 'SINAPI', coefficient: 0.8 },
      { id: '1.2', code: '88316', description: 'Servente com encargos complementares', unit: 'h', value: 18.90, database: 'SINAPI', coefficient: 1.2 },
      { id: '1.3', code: '11145', description: 'Concreto usinado', unit: 'm3', value: 336.30, database: 'SINAPI', coefficient: 1.05 },
    ]
  },
  {
    id: '2',
    code: '87393',
    description: 'Fôrma plana de madeira compensada para pilares',
    unit: 'm2',
    value: 85.20,
    database: 'SINAPI',
    children: [
      { id: '2.1', code: '88309', description: 'Carpinteiro', unit: 'h', value: 25.30, database: 'SINAPI', coefficient: 2.5 },
      { id: '2.2', code: '616', description: 'Madeira compensada', unit: 'm2', value: 35.00, database: 'SINAPI', coefficient: 1.1 },
    ]
  }
];

// Aplica um updater a um item em qualquer nível da árvore (composição de topo ou insumo filho), sem mutar o original.
function updateItemInTree(items: CompositionItem[], id: string, updater: (item: CompositionItem) => CompositionItem): CompositionItem[] {
  return items.map(item => {
    if (item.id === id) return updater(item);
    if (item.children) return { ...item, children: updateItemInTree(item.children, id, updater) };
    return item;
  });
}

// Remove um item de qualquer nível da árvore (composição de topo ou insumo filho).
function removeItemFromTree(items: CompositionItem[], id: string): CompositionItem[] {
  return items
    .filter(item => item.id !== id)
    .map(item => item.children ? { ...item, children: removeItemFromTree(item.children, id) } : item);
}

// Clona uma composição existente (e todos os seus insumos/sub-composições) com ids novos, para poder
// embutí-la como filha de outra composição sem colidir com o id do original em outro ponto da árvore.
function cloneWithFreshIds(item: CompositionItem): CompositionItem {
  return {
    ...item,
    id: `comp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    children: item.children ? item.children.map(cloneWithFreshIds) : undefined
  };
}

interface CompositionFormData {
  code: string;
  description: string;
  unit: string;
  value: string;
  database: string;
  coefficient: string;
}

const EMPTY_FORM: CompositionFormData = { code: '', description: '', unit: '', value: '', database: 'SINAPI', coefficient: '' };

interface Props {
  budgets?: Budget[];
  perfilUsuario?: string;
}

export default function CompositionsManager({ perfilUsuario }: Props) {
  // Importar base de dados e gerenciar (criar/editar/excluir) composições é restrito a Diretor DORE e Admin.
  const podeGerenciar = perfilUsuario === 'diretor_dore' || perfilUsuario === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [compositions, setCompositions] = useState<CompositionItem[]>(MOCK_COMPOSITIONS);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Modal de criação (nova composição de topo, com insumos opcionais) / edição (um único item, composição ou insumo)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingIsChild, setEditingIsChild] = useState(false);
  const [formData, setFormData] = useState<CompositionFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [draftInsumos, setDraftInsumos] = useState<{ supplyId: string; coefficient: string }[]>([]);
  const [selectedSupplyId, setSelectedSupplyId] = useState('');
  const [draftExistingComps, setDraftExistingComps] = useState<{ compId: string; coefficient: string }[]>([]);
  const [selectedExistingCompId, setSelectedExistingCompId] = useState('');

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedIds(newExpanded);
  };

  const openCreateModal = () => {
    setFormData({ ...EMPTY_FORM });
    setFormError('');
    setDraftInsumos([]);
    setSelectedSupplyId('');
    setDraftExistingComps([]);
    setSelectedExistingCompId('');
    setModalMode('create');
  };

  const openEditModal = (item: CompositionItem, isChild: boolean) => {
    setFormData({
      code: item.code,
      description: item.description,
      unit: item.unit,
      value: String(item.value ?? ''),
      database: item.database,
      coefficient: item.coefficient != null ? String(item.coefficient) : ''
    });
    setEditingId(item.id);
    setEditingIsChild(isChild);
    setFormError('');
    setModalMode('edit');
  };

  const closeModal = () => setModalMode(null);

  const addDraftInsumo = () => {
    if (!selectedSupplyId) return;
    if (draftInsumos.some(d => d.supplyId === selectedSupplyId)) return;
    setDraftInsumos(prev => [...prev, { supplyId: selectedSupplyId, coefficient: '1' }]);
    setSelectedSupplyId('');
  };
  const updateDraftInsumoCoefficient = (idx: number, coefficient: string) => {
    setDraftInsumos(prev => prev.map((d, i) => i === idx ? { ...d, coefficient } : d));
  };
  const removeDraftInsumo = (idx: number) => setDraftInsumos(prev => prev.filter((_, i) => i !== idx));

  const addDraftExistingComp = () => {
    if (!selectedExistingCompId) return;
    if (draftExistingComps.some(d => d.compId === selectedExistingCompId)) return;
    setDraftExistingComps(prev => [...prev, { compId: selectedExistingCompId, coefficient: '1' }]);
    setSelectedExistingCompId('');
  };
  const updateDraftExistingCompCoefficient = (idx: number, coefficient: string) => {
    setDraftExistingComps(prev => prev.map((d, i) => i === idx ? { ...d, coefficient } : d));
  };
  const removeDraftExistingComp = (idx: number) => setDraftExistingComps(prev => prev.filter((_, i) => i !== idx));

  const handleSubmitForm = (e: FormEvent) => {
    e.preventDefault();

    if (!podeGerenciar) return;

    if (modalMode === 'create') {
      if (draftInsumos.length === 0 && draftExistingComps.length === 0) {
        setFormError('Adicione pelo menos um insumo ou uma composição existente para criar a composição.');
        return;
      }

      const newComposition: CompositionItem = {
        id: `comp-${Date.now()}`,
        code: formData.code.trim(),
        description: formData.description.trim(),
        unit: formData.unit.trim(),
        value: parseFloat(formData.value) || 0,
        database: 'Própria',
        children: [
          ...draftInsumos
            .map((d): CompositionItem | null => {
              const supply = MOCK_SUPPLIES.find(s => s.id === d.supplyId);
              if (!supply) return null;
              return {
                id: `comp-${Date.now()}-${supply.id}`,
                code: supply.code,
                description: supply.description,
                unit: supply.unit,
                value: supply.value,
                database: supply.database,
                coefficient: parseFloat(d.coefficient) || 1
              };
            })
            .filter((c): c is CompositionItem => !!c),
          ...draftExistingComps
            .map((d): CompositionItem | null => {
              const source = compositions.find(c => c.id === d.compId);
              if (!source) return null;
              return { ...cloneWithFreshIds(source), coefficient: parseFloat(d.coefficient) || 1 };
            })
            .filter((c): c is CompositionItem => !!c)
        ]
      };
      setCompositions(prev => [newComposition, ...prev]);
    } else if (modalMode === 'edit' && editingId) {
      setCompositions(prev => updateItemInTree(prev, editingId, item => ({
        ...item,
        code: formData.code.trim(),
        description: formData.description.trim(),
        unit: formData.unit.trim(),
        value: parseFloat(formData.value) || 0,
        database: formData.database,
        ...(editingIsChild ? { coefficient: parseFloat(formData.coefficient) || 1 } : {})
      })));
    }

    closeModal();
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.')) return;
    setCompositions(prev => removeItemFromTree(prev, id));
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const filtered = compositions.filter(c =>
    c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderComposition = (comp: CompositionItem, level: number = 0) => {
    const hasChildren = comp.children && comp.children.length > 0;
    const isExpanded = expandedIds.has(comp.id);

    return (
      <div key={comp.id} className="border-b border-gray-100 last:border-0">
        <div
          className={cn(
            'flex items-center py-4 px-6 hover:bg-gray-50 transition-colors cursor-pointer group',
            level > 0 && 'bg-gray-50/30'
          )}
          style={{ paddingLeft: `${24 + level * 24}px` }}
          onClick={() => hasChildren && toggleExpand(comp.id)}
        >
          <div className="flex items-center gap-4 flex-1">
            <div className="w-6 flex items-center justify-center">
              {hasChildren ? (
                isExpanded
                  ? <ChevronDown className="h-4 w-4 text-red-600" />
                  : <ChevronRight className="h-4 w-4 text-gray-400" />
              ) : null}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 bg-blue-700/10 text-blue-700 text-[9px] font-black uppercase rounded">
                  {comp.database}
                </span>
                <span className="text-xs font-bold text-gray-500 font-mono tracking-tight">{comp.code}</span>
              </div>
              <span className={cn(
                'text-sm font-bold tracking-tight uppercase',
                level === 0 ? 'text-slate-900' : 'text-gray-600'
              )}>
                {comp.description}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-12">
            <div className="text-right">
              <p className="text-[9px] font-black text-blue-700 uppercase tracking-widest">Índice</p>
              <p className="text-xs font-black text-blue-700">
                {(comp.coefficient || 1).toLocaleString('pt-BR', { minimumFractionDigits: 4 })}
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Unidade</p>
              <p className="text-xs font-bold text-slate-900">{comp.unit}</p>
            </div>
            <div className="text-right min-w-[100px]">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Preço Unitário</p>
              <p className="text-sm font-black text-red-600">
                R$ {comp.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className=" transition-opacity flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); if (podeGerenciar) openEditModal(comp, level > 0); }}
                disabled={!podeGerenciar}
                title={podeGerenciar ? undefined : 'Somente Diretor DORE e Administrador podem editar composições'}
                className="p-2 hover:bg-blue-700/10 rounded-full text-blue-700 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); if (podeGerenciar) handleDelete(comp.id); }}
                disabled={!podeGerenciar}
                title={podeGerenciar ? undefined : 'Somente Diretor DORE e Administrador podem excluir composições'}
                className="p-2 hover:bg-red-600/10 rounded-full text-red-600 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {comp.children!.map(child => renderComposition(child, level + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div id="compositions-manager" className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-end justify-between border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-xl font-black text-[#13264d] font-sans">
            Gerenciador de <span className="text-red-600">Composições</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            Base de dados, composições próprias e importação.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { if (podeGerenciar) setIsImportModalOpen(true); }}
            disabled={!podeGerenciar}
            title={podeGerenciar ? undefined : 'Somente Diretor DORE e Administrador podem importar bases'}
            className="px-5 py-2.5 bg-white border border-gray-200 text-slate-900 text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            <Import className="h-4 w-4 text-red-600" /> Importar Base
          </button>
          <button
            onClick={() => { if (podeGerenciar) openCreateModal(); }}
            disabled={!podeGerenciar}
            title={podeGerenciar ? undefined : 'Somente Diretor DORE e Administrador podem criar composições'}
            className="px-5 py-2.5 bg-red-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-shadow shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-600"
          >
            <Plus className="h-4 w-4" /> Criar Composição
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-6 border-t-4 border-blue-700 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Filter className="h-3 w-3" /> Filtros e Bases
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Origem</p>
                <div className="space-y-1">
                  {['SINAPI', 'SETOP', 'SEINFRA', 'SICRO', 'Próprias'].map(db => (
                    <label key={db} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer group">
                      <input type="checkbox" defaultChecked className="rounded border-gray-300 text-red-600 focus:ring-red-600" />
                      <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest group-hover:text-slate-900">{db}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-700 p-6 rounded shadow-lg text-white">
            <h4 className="text-[10px] font-black uppercase tracking-wider font-sans mb-2 flex items-center gap-2">
              <Info className="h-4 w-4 text-red-600" /> Dica de Uso
            </h4>
            <p className="text-[11px] font-medium leading-relaxed opacity-80">
              Analise os insumos de cada composição clicando na seta lateral. Você pode editar composições existentes ou criar novas a partir do zero.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white p-4 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="PESQUISAR POR CÓDIGO OU DESCRIÇÃO..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-1 focus:ring-red-600 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 px-4 border-l border-gray-200">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total: </span>
              <span className="text-xs font-bold text-slate-900">1.250 Itens</span>
            </div>
          </div>

          <div className="bg-white border-t-8 border-red-600 shadow-xl overflow-hidden">
            {filtered.map(comp => renderComposition(comp))}
          </div>
        </div>
      </div>

      {/* Import Modal */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsImportModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded shadow-2xl w-full max-w-md overflow-hidden border-t-8 border-red-600"
            >
              <div className="p-8">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">
                  Importar <span className="text-red-600">Base de Dados</span>
                </h3>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-8">
                  Selecione o arquivo de base (Excel ou JSON).
                </p>

                <div className="border-2 border-dashed border-gray-200 rounded-lg p-12 flex flex-col items-center justify-center text-center hover:border-red-600/50 transition-colors cursor-pointer group">
                  <div className="p-4 bg-gray-50 rounded-full mb-4 group-hover:scale-110 transition-transform">
                    <Download className="h-8 w-8 text-red-600" />
                  </div>
                  <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Arraste o arquivo aqui</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">ou clique para selecionar</p>
                </div>

                <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-blue-700/5 rounded border border-blue-700/10">
                    <Database className="h-5 w-5 text-blue-700" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest leading-none">Formato Recomendado</p>
                      <p className="text-[9px] text-blue-700 font-medium uppercase tracking-wider mt-1">Padrão SINAPI / SEINFRA (.xlsx)</p>
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex gap-4">
                  <button
                    onClick={() => setIsImportModalOpen(false)}
                    className="flex-1 px-6 py-4 bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-wider font-sans rounded hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button className="flex-1 px-6 py-4 bg-red-600 text-white text-[10px] font-black uppercase tracking-wider font-sans rounded shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all">
                    Iniciar Importação
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Criar / Editar Composição (ou insumo, quando editingIsChild) */}
      <AnimatePresence>
        {modalMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={closeModal}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white rounded shadow-2xl w-full max-w-2xl overflow-hidden border-t-8 border-red-600 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-6 bg-slate-50 border-b border-gray-200 shrink-0">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  {modalMode === 'create' ? (
                    <>Criar <span className="text-red-600">Composição</span></>
                  ) : editingIsChild ? (
                    <>Editar <span className="text-red-600">Insumo</span></>
                  ) : (
                    <>Editar <span className="text-red-600">Composição</span></>
                  )}
                </h3>
                <button onClick={closeModal} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmitForm} className="p-8 space-y-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {modalMode === 'edit' && (
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 font-sans mb-2">Fonte / Base *</label>
                      <select
                        required
                        value={formData.database}
                        onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded font-bold text-sm focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all cursor-pointer"
                      >
                        {['SINAPI', 'SETOP', 'SEINFRA', 'SICRO', 'Própria'].map(db => <option key={db} value={db}>{db}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 font-sans mb-2">Código *</label>
                    <input
                      required
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded font-bold text-sm focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all font-mono"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 font-sans mb-2">Descrição *</label>
                    <input
                      required
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded font-bold text-sm focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 font-sans mb-2">Unidade *</label>
                    <input
                      required
                      type="text"
                      placeholder="Ex: m3, m2, h, un"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded font-bold text-sm focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 font-sans mb-2">Valor Unitário (R$) *</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded font-bold text-sm focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all font-mono"
                    />
                  </div>
                  {modalMode === 'edit' && editingIsChild && (
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 font-sans mb-2">Índice / Coeficiente Técnico *</label>
                      <input
                        required
                        type="number"
                        step="0.0001"
                        min="0"
                        value={formData.coefficient}
                        onChange={(e) => setFormData({ ...formData, coefficient: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded font-bold text-sm focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all font-mono"
                      />
                      <p className="text-[9px] text-gray-400 mt-1">Quantidade deste insumo consumida por unidade da composição-mãe.</p>
                    </div>
                  )}
                </div>

                {modalMode === 'create' && (
                  <div className="border-t border-gray-100 pt-6">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 font-sans mb-3">
                      Insumos Vinculados *
                    </label>

                    <div className="flex items-center gap-2 mb-3">
                      <select
                        value={selectedSupplyId}
                        onChange={(e) => setSelectedSupplyId(e.target.value)}
                        className="flex-1 px-3 py-2.5 bg-slate-50 border border-gray-200 rounded font-bold text-xs focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all cursor-pointer"
                      >
                        <option value="">Selecione um insumo do banco...</option>
                        {MOCK_SUPPLIES
                          .filter(s => !draftInsumos.some(d => d.supplyId === s.id))
                          .map(s => (
                            <option key={s.id} value={s.id}>{s.database} — {s.code} — {s.description} ({s.unit})</option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={addDraftInsumo}
                        disabled={!selectedSupplyId}
                        className="flex items-center gap-1.5 px-3 py-2.5 bg-blue-700/10 text-blue-700 hover:bg-blue-700 hover:text-white rounded text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-700/10 disabled:hover:text-blue-700 shrink-0"
                      >
                        <Plus className="h-3 w-3" /> Adicionar
                      </button>
                    </div>

                    {draftInsumos.length === 0 ? (
                      <p className="text-[10px] text-gray-400 italic">Nenhum insumo vinculado ainda.</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-2 px-3">
                          <span className="col-span-2 text-[8px] font-black text-gray-400 uppercase tracking-widest">Fonte</span>
                          <span className="col-span-1 text-[8px] font-black text-gray-400 uppercase tracking-widest">Código</span>
                          <span className="col-span-5 text-[8px] font-black text-gray-400 uppercase tracking-widest">Descrição</span>
                          <span className="col-span-3 text-[8px] font-black text-gray-400 uppercase tracking-widest">Índice (qtd. por unidade)</span>
                          <span className="col-span-1" />
                        </div>
                        {draftInsumos.map((d, idx) => {
                          const supply = MOCK_SUPPLIES.find(s => s.id === d.supplyId);
                          if (!supply) return null;
                          return (
                            <div key={d.supplyId} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-3 rounded border border-gray-100">
                              <span className="col-span-2 px-2 py-1.5 bg-blue-700/10 text-blue-700 text-[9px] font-black uppercase rounded text-center">
                                {supply.database}
                              </span>
                              <span className="col-span-1 text-[10px] font-bold font-mono text-gray-500">{supply.code}</span>
                              <span className="col-span-5 text-[10px] font-bold text-slate-800 uppercase truncate">{supply.description}</span>
                              <input
                                type="number" step="0.0001" min="0"
                                title="Índice: quantidade deste insumo consumida por unidade da composição"
                                aria-label="Índice"
                                value={d.coefficient}
                                onChange={(e) => updateDraftInsumoCoefficient(idx, e.target.value)}
                                className="col-span-3 px-2 py-2 bg-white border border-gray-200 rounded text-[10px] font-bold font-mono outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => removeDraftInsumo(idx)}
                                className="col-span-1 p-2 text-red-600 hover:bg-red-600/10 rounded transition-colors flex items-center justify-center cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {modalMode === 'create' && (
                  <div className="border-t border-gray-100 pt-6">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 font-sans mb-3">
                      Composições Existentes Vinculadas
                    </label>

                    <div className="flex items-center gap-2 mb-3">
                      <select
                        value={selectedExistingCompId}
                        onChange={(e) => setSelectedExistingCompId(e.target.value)}
                        className="flex-1 px-3 py-2.5 bg-slate-50 border border-gray-200 rounded font-bold text-xs focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all cursor-pointer"
                      >
                        <option value="">Selecione uma composição do banco...</option>
                        {compositions
                          .filter(c => !draftExistingComps.some(d => d.compId === c.id))
                          .map(c => (
                            <option key={c.id} value={c.id}>{c.database} — {c.code} — {c.description}</option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={addDraftExistingComp}
                        disabled={!selectedExistingCompId}
                        className="flex items-center gap-1.5 px-3 py-2.5 bg-blue-700/10 text-blue-700 hover:bg-blue-700 hover:text-white rounded text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-700/10 disabled:hover:text-blue-700 shrink-0"
                      >
                        <Plus className="h-3 w-3" /> Adicionar
                      </button>
                    </div>

                    {draftExistingComps.length === 0 ? (
                      <p className="text-[10px] text-gray-400 italic">Nenhuma composição existente vinculada. Útil para montar uma composição composta a partir de outras já cadastradas.</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-2 px-3">
                          <span className="col-span-2 text-[8px] font-black text-gray-400 uppercase tracking-widest">Fonte</span>
                          <span className="col-span-1 text-[8px] font-black text-gray-400 uppercase tracking-widest">Código</span>
                          <span className="col-span-5 text-[8px] font-black text-gray-400 uppercase tracking-widest">Descrição</span>
                          <span className="col-span-3 text-[8px] font-black text-gray-400 uppercase tracking-widest">Índice (qtd. por unidade)</span>
                          <span className="col-span-1" />
                        </div>
                        {draftExistingComps.map((d, idx) => {
                          const source = compositions.find(c => c.id === d.compId);
                          if (!source) return null;
                          return (
                            <div key={d.compId} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-3 rounded border border-gray-100">
                              <span className="col-span-2 px-2 py-1.5 bg-blue-700/10 text-blue-700 text-[9px] font-black uppercase rounded text-center">
                                {source.database}
                              </span>
                              <span className="col-span-1 text-[10px] font-bold font-mono text-gray-500">{source.code}</span>
                              <span className="col-span-5 text-[10px] font-bold text-slate-800 uppercase truncate">{source.description}</span>
                              <input
                                type="number" step="0.0001" min="0"
                                title="Índice: quantidade desta composição consumida por unidade da composição-mãe"
                                aria-label="Índice"
                                value={d.coefficient}
                                onChange={(e) => updateDraftExistingCompCoefficient(idx, e.target.value)}
                                className="col-span-3 px-2 py-2 bg-white border border-gray-200 rounded text-[10px] font-bold font-mono outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => removeDraftExistingComp(idx)}
                                className="col-span-1 p-2 text-red-600 hover:bg-red-600/10 rounded transition-colors flex items-center justify-center cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {modalMode === 'create' && formError && (
                  <p className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{formError}</p>
                )}

                <div className="flex gap-4 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-6 py-4 bg-slate-100 text-slate-900 text-[10px] font-black uppercase tracking-wider rounded hover:bg-gray-200 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-4 bg-red-600 text-white text-[10px] font-black uppercase tracking-wider rounded shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all active:scale-95 cursor-pointer"
                  >
                    {modalMode === 'create' ? 'Criar Composição' : 'Salvar Alterações'}
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
