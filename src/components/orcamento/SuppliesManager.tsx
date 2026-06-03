/**
 * SuppliesManager - Adapted from OrcaGov for Gestao-Obras-MG
 * No Firebase in original; just fixed mg-* colors and imports.
 */

import { useState } from 'react';
import {
  Search,
  Plus,
  Download,
  Filter,
  Database,
  Info,
  Edit,
  Trash2,
  Import,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Supply {
  id: string;
  code: string;
  description: string;
  unit: string;
  value: number;
  database: string;
  category: string;
}

const MOCK_SUPPLIES: Supply[] = [
  { id: '1', code: '11145', description: 'Concreto usinado fck=25MPa', unit: 'm3', value: 336.30, database: 'SINAPI', category: 'Material' },
  { id: '2', code: '88309', description: 'Pedreiro com encargos complementares', unit: 'h', value: 25.30, database: 'SINAPI', category: 'Mão de Obra' },
  { id: '3', code: '88316', description: 'Servente com encargos complementares', unit: 'h', value: 18.90, database: 'SINAPI', category: 'Mão de Obra' },
  { id: '4', code: '616', description: 'Madeira compensada plastificada 10mm', unit: 'm2', value: 35.00, database: 'SINAPI', category: 'Material' },
];

export default function SuppliesManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [supplies] = useState<Supply[]>(MOCK_SUPPLIES);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const filtered = supplies.filter(s =>
    s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderSupply = (supply: Supply) => (
    <div key={supply.id} className="border-b border-gray-100 last:border-0">
      <div className="flex items-center py-4 px-6 hover:bg-gray-50 transition-colors group">
        <div className="flex items-center gap-4 flex-1">
          <div className="p-2 bg-gray-50 rounded group-hover:bg-red-600/10 transition-colors">
            <Package className="h-4 w-4 text-gray-400 group-hover:text-red-600" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 bg-blue-700/10 text-blue-700 text-[9px] font-black uppercase rounded">
                {supply.database}
              </span>
              <span className="text-xs font-bold text-gray-400 font-mono tracking-tight">{supply.code}</span>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-l border-gray-200 pl-2">
                {supply.category}
              </span>
            </div>
            <span className="text-sm font-bold tracking-tight uppercase text-slate-900">
              {supply.description}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-12">
          <div className="text-right hidden sm:block">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Unidade</p>
            <p className="text-xs font-bold text-slate-900">{supply.unit}</p>
          </div>
          <div className="text-right min-w-[100px]">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Preço Unitário</p>
            <p className="text-sm font-black text-red-600">
              R$ {supply.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className=" transition-opacity flex items-center gap-2">
            <button className="p-2 hover:bg-blue-700/10 rounded-full text-blue-700 transition-colors">
              <Edit className="h-4 w-4" />
            </button>
            <button className="p-2 hover:bg-red-600/10 rounded-full text-red-600 transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div id="supplies-manager" className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-end justify-between border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-xl font-black text-[#13264d] font-sans">
            Gerenciador de <span className="text-red-600">Insumos</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            Base de materiais, mão de obra e equipamentos.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-5 py-2.5 bg-white border border-gray-200 text-slate-900 text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2"
          >
            <Import className="h-4 w-4 text-red-600" /> Importar Base
          </button>
          <button className="px-5 py-2.5 bg-red-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-shadow shadow-md flex items-center gap-2">
            <Plus className="h-4 w-4" /> Criar Insumo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-6 border-t-4 border-blue-700 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Filter className="h-3 w-3" /> Filtros e Categorias
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Categoria</p>
                <div className="space-y-1">
                  {['Material', 'Mão de Obra', 'Equipamento', 'Serviço', 'Outros'].map(cat => (
                    <label key={cat} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer group">
                      <input type="checkbox" defaultChecked className="rounded border-gray-300 text-red-600 focus:ring-red-600" />
                      <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest group-hover:text-slate-900">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2 border-t border-gray-100 pt-4">
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
              <Info className="h-4 w-4 text-red-600" /> Gestão de Insumos
            </h4>
            <p className="text-[11px] font-medium leading-relaxed opacity-80">
              Mantenha sua base de insumos atualizada para garantir a precisão dos orçamentos. Importe tabelas oficiais ou cadastre seus próprios custos de mercado.
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
                placeholder="PESQUISAR INSUMO POR CÓDIGO OU DESCRIÇÃO..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-1 focus:ring-red-600 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 px-4 border-l border-gray-200">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total: </span>
              <span className="text-xs font-bold text-slate-900">5.420 Insumos</span>
            </div>
          </div>

          <div className="bg-white border-t-8 border-red-600 shadow-xl overflow-hidden">
            {filtered.map(supply => renderSupply(supply))}
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
                  Importar <span className="text-red-600">Insumos</span>
                </h3>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-8">
                  Selecione o arquivo de insumos para importação.
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
                      <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest leading-none">Formatos Suportados</p>
                      <p className="text-[9px] text-blue-700 font-medium uppercase tracking-wider mt-1">Excel (.xlsx, .csv), JSON, XML</p>
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
                    Processar Arquivo
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
