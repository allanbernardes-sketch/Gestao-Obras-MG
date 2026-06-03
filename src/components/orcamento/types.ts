/**
 * Orcamento module types for Gestao-Obras-MG
 */

export interface Resource {
  id: string;
  name: string;
  unit: string;
  type: 'Labor' | 'Material' | 'Equipment';
  cost: number;
}

export interface Composition {
  id: string;
  name: string;
  unit: string;
  resources: {
    resourceId: string;
    quantity: number;
  }[];
  totalCost: number;
}

export interface EAPItem {
  id: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  compositionId?: string;
  unitValue: number;
  totalValue: number;
  children?: EAPItem[];
}

export interface BDISettings {
  adminCentral: number;
  seguroRisco: number;
  garantia: number;
  despesasFinanceiras: number;
  lucro: number;
  tributos: { pispasep: number; cofins: number; iss: number; cprb: number };
}

export interface BudgetVersion {
  id: string;
  name: string;
  date: string;
  data: EAPItem[];
}

export interface Budget {
  id: string;
  name: string;
  sre: string;
  municipality: string;
  school: string;
  codesc?: string;
  date: string;
  status: 'Draft' | 'Approved' | 'Closed';
  eap: EAPItem[];
  totalValue: number;
  bdi?: BDISettings;
  versions?: BudgetVersion[];
  createdAt: string;
  updatedAt: string;
}
