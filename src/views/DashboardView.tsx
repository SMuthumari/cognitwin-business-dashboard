import { useMemo } from 'react';
import { DollarSign, TrendingDown, TrendingUp, Package, Wallet, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { BusinessDataPoint } from '@/lib/types';
import { computeKPIs, aggregateByDate, aggregateByProduct } from '@/lib/analytics';
import { LineChart, BarChart, DonutChart } from '@/components/Charts';

const formatCurrency = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
};

const formatNumber = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
};

export function DashboardView({ data }: { data: BusinessDataPoint[] }) {
  const kpis = useMemo(() => computeKPIs(data), [data]);
  const monthly = useMemo(() => aggregateByDate(data), [data]);
  const byProduct = useMemo(() => aggregateByProduct(data), [data]);

  const revenueData = monthly.map((d) => ({ label: d.date.slice(0, 7), value: d.revenue }));
  const profitData = monthly.map((d) => ({ label: d.date.slice(0, 7), value: d.revenue - d.expenses }));
  const cashFlowData = monthly.map((d) => ({ label: d.date.slice(0, 7), value: d.cashFlow }));

  const productRevenue = byProduct
    .map((d) => ({ label: d.product, value: d.revenue, color: '#3b82f6' }))
    .sort((a, b) => b.value - a.value);

  const expenseBreakdown = [
    { label: 'Production', value: byProduct.reduce((s, d) => s + d.expenses * 0.6, 0), color: '#ef4444' },
    { label: 'Operations', value: byProduct.reduce((s, d) => s + d.expenses * 0.25, 0), color: '#f59e0b' },
    { label: 'Overhead', value: byProduct.reduce((s, d) => s + d.expenses * 0.15, 0), color: '#8b5cf6' },
  ];

  const cards = [
    { label: 'Total Revenue', value: formatCurrency(kpis.totalRevenue), icon: DollarSign, change: kpis.revenueChange, color: 'cyan' },
    { label: 'Total Expenses', value: formatCurrency(kpis.totalExpenses), icon: TrendingDown, change: null, color: 'red' },
    { label: 'Net Profit', value: formatCurrency(kpis.totalProfit), icon: TrendingUp, change: kpis.profitChange, color: 'emerald' },
    { label: 'Avg Inventory', value: formatNumber(kpis.avgInventory), icon: Package, change: kpis.inventoryChange, color: 'blue' },
    { label: 'Cash Flow', value: formatCurrency(kpis.totalCashFlow), icon: Wallet, change: kpis.cashFlowChange, color: 'amber' },
    { label: 'Health Score', value: `${kpis.healthScore}/100`, icon: Activity, change: null, color: 'violet' },
  ];

  const colorMap: Record<string, string> = {
    cyan: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 text-cyan-400',
    red: 'from-red-500/10 to-red-500/5 border-red-500/20 text-red-400',
    emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    blue: 'from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-400',
    amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-400',
    violet: 'from-violet-500/10 to-violet-500/5 border-violet-500/20 text-violet-400',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`bg-gradient-to-br ${colorMap[card.color]} border rounded-xl p-4 backdrop-blur-sm`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-5 h-5" />
                {card.change !== null && (
                  <span className={`flex items-center text-[10px] font-medium ${card.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {card.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(card.change).toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="text-xl font-bold text-white">{card.value}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{card.label}</div>
            </div>
          );
        })}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-200">Revenue & Profit Trend</h3>
            <span className="text-xs text-slate-500">{monthly.length} months</span>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-cyan-400 mb-1">Revenue</p>
              <LineChart data={revenueData} color="#06b6d4" height={160} formatValue={formatCurrency} />
            </div>
            <div>
              <p className="text-xs text-emerald-400 mb-1">Profit</p>
              <LineChart data={profitData} color="#10b981" height={140} formatValue={formatCurrency} />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="font-semibold text-slate-200 mb-4">Expense Breakdown</h3>
          <DonutChart
            data={expenseBreakdown}
            centerValue={formatCurrency(kpis.totalExpenses)}
            centerLabel="Total"
          />
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="font-semibold text-slate-200 mb-4">Revenue by Product</h3>
          <BarChart data={productRevenue} formatValue={formatCurrency} horizontal height={200} />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="font-semibold text-slate-200 mb-4">Cash Flow Trend</h3>
          <LineChart data={cashFlowData} color="#f59e0b" height={200} formatValue={formatCurrency} />
        </div>
      </div>

      {/* Data table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="font-semibold text-slate-200 mb-4">Monthly Business Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-800">
                <th className="pb-2 pr-4 font-medium">Month</th>
                <th className="pb-2 pr-4 font-medium text-right">Revenue</th>
                <th className="pb-2 pr-4 font-medium text-right">Expenses</th>
                <th className="pb-2 pr-4 font-medium text-right">Profit</th>
                <th className="pb-2 pr-4 font-medium text-right">Inventory</th>
                <th className="pb-2 pr-4 font-medium text-right">Cash Flow</th>
              </tr>
            </thead>
            <tbody>
              {monthly.slice(-6).reverse().map((d) => (
                <tr key={d.date} className="border-b border-slate-800/50">
                  <td className="py-2 pr-4 text-slate-300">{d.date.slice(0, 7)}</td>
                  <td className="py-2 pr-4 text-right text-cyan-400">{formatCurrency(d.revenue)}</td>
                  <td className="py-2 pr-4 text-right text-red-400">{formatCurrency(d.expenses)}</td>
                  <td className="py-2 pr-4 text-right text-emerald-400">{formatCurrency(d.revenue - d.expenses)}</td>
                  <td className="py-2 pr-4 text-right text-slate-300">{formatNumber(d.inventory)}</td>
                  <td className="py-2 pr-4 text-right text-amber-400">{formatCurrency(d.cashFlow)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
