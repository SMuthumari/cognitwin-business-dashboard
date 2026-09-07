export interface BusinessDataPoint {
  date: string;
  product: string;
  sales: number;
  revenue: number;
  expenses: number;
  inventory: number;
  demand: number;
  production: number;
  cashFlow: number;
}

export interface KpiSummary {
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  avgInventory: number;
  totalCashFlow: number;
  healthScore: number;
  riskLevel: RiskLevel;
  revenueChange: number;
  profitChange: number;
  inventoryChange: number;
  cashFlowChange: number;
}

export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical';

export interface Risk {
  id: string;
  type: 'inventory' | 'expense' | 'cashflow' | 'sales';
  level: RiskLevel;
  title: string;
  description: string;
  metric: string;
  value: number;
  threshold: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ForecastPoint {
  date: string;
  actual: number | null;
  predicted: number;
  lowerBound: number;
  upperBound: number;
}

export interface ForecastResult {
  points: ForecastPoint[];
  metric: string;
  confidence: number;
  trendDirection: 'up' | 'down' | 'stable';
  predictedChange: number;
}

export interface WhatIfInputs {
  demandChange: number;
  expenseChange: number;
  priceChange: number;
}

export interface WhatIfResult {
  projectedRevenue: number;
  projectedExpenses: number;
  projectedProfit: number;
  projectedInventory: number;
  projectedDemand: number;
  projectedRiskLevel: RiskLevel;
  profitDelta: number;
}

export interface Recommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  action: string;
  impact: string;
}

export interface InvoiceItem {
  id: string;
  product: string;
  quantity: number;
  price: number;
  discount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customer: string;
  date: string;
  items: InvoiceItem[];
  taxRate: number;
  notes: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
}

export interface Product {
  name: string;
  basePrice: number;
  unitCost: number;
}
