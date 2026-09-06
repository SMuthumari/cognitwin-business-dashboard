import type { BusinessDataPoint, Product } from './types';

const PRODUCTS: Product[] = [
  { name: 'Widget Alpha', basePrice: 120, unitCost: 65 },
  { name: 'Widget Beta', basePrice: 85, unitCost: 42 },
  { name: 'Gadget Pro', basePrice: 340, unitCost: 190 },
  { name: 'Gadget Lite', basePrice: 55, unitCost: 28 },
  { name: 'Component X', basePrice: 210, unitCost: 120 },
];

// Deterministic pseudo-random generator for stable demo data
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateBusinessData(months = 12): BusinessDataPoint[] {
  const rand = seeded(42);
  const data: BusinessDataPoint[] = [];
  const today = new Date();

  for (let m = months - 1; m >= 0; m--) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - m, 15);
    const monthStr = monthDate.toISOString().slice(0, 10);

    for (const product of PRODUCTS) {
      // Seasonal trend with upward bias
      const seasonal = 1 + 0.2 * Math.sin((monthDate.getMonth() / 12) * 2 * Math.PI);
      const growth = 1 + (months - m) * 0.015;
      const noise = 0.85 + rand() * 0.3;

      const sales = Math.round(product.basePrice * 15 * seasonal * growth * noise);
      const revenue = Math.round(sales * product.basePrice * (0.95 + rand() * 0.1));
      const expenses = Math.round(sales * product.unitCost * (1.1 + rand() * 0.15));
      const production = Math.round(sales * (1.05 + rand() * 0.1));
      const demand = Math.round(sales * (0.9 + rand() * 0.25));
      const inventory = Math.max(0, Math.round(production * 3 + rand() * 200 - sales * 0.8));
      const cashFlow = revenue - expenses;

      data.push({
        date: monthStr,
        product: product.name,
        sales,
        revenue,
        expenses,
        inventory,
        demand,
        production,
        cashFlow,
      });
    }
  }

  return data;
}

export function parseCSV(text: string): BusinessDataPoint[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows: BusinessDataPoint[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    if (cols.length < headers.length) continue;

    const get = (name: string): string => {
      const idx = headers.indexOf(name);
      return idx >= 0 ? cols[idx] : '';
    };

    rows.push({
      date: get('date'),
      product: get('product') || 'Unknown',
      sales: parseFloat(get('sales')) || 0,
      revenue: parseFloat(get('revenue')) || 0,
      expenses: parseFloat(get('expenses')) || 0,
      inventory: parseFloat(get('inventory')) || 0,
      demand: parseFloat(get('demand')) || 0,
      production: parseFloat(get('production')) || 0,
      cashFlow: parseFloat(get('cashflow')) || 0,
    });
  }

  return rows;
}

export function toCSV(data: BusinessDataPoint[]): string {
  const headers = ['Date', 'Product', 'Sales', 'Revenue', 'Expenses', 'Inventory', 'Demand', 'Production', 'CashFlow'];
  const rows = data.map((d) =>
    [d.date, d.product, d.sales, d.revenue, d.expenses, d.inventory, d.demand, d.production, d.cashFlow].join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export function downloadCSV(data: BusinessDataPoint[], filename: string) {
  const csv = toCSV(data);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
