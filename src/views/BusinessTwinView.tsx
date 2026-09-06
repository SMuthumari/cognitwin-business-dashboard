import { useMemo } from 'react';
import { Brain, DollarSign, TrendingDown, Package, ShoppingCart, TrendingUp, AlertTriangle } from 'lucide-react';
import type { BusinessDataPoint, RiskLevel } from '@/lib/types';
import { aggregateByDate, computeKPIs } from '@/lib/analytics';
import { Gauge } from '@/components/Charts';

const formatCurrency = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
};

const formatNumber = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
};

const riskColors: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  Low: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  Moderate: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  High: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  Critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
};

export function BusinessTwinView({ data }: { data: BusinessDataPoint[] }) {
  const kpis = useMemo(() => computeKPIs(data), [data]);
  const monthly = useMemo(() => aggregateByDate(data), [data]);
  const current = monthly[monthly.length - 1] ?? { revenue: 0, expenses: 0, inventory: 0, demand: 0, sales: 0, production: 0, cashFlow: 0 };

  const stats = [
    { label: 'Current Revenue', value: formatCurrency(current.revenue), icon: DollarSign, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: 'Current Expenses', value: formatCurrency(current.expenses), icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Current Inventory', value: formatNumber(current.inventory), icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Current Demand', value: formatNumber(current.demand), icon: ShoppingCart, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Current Profit', value: formatCurrency(current.revenue - current.expenses), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Current Production', value: formatNumber(current.production), icon: Brain, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  ];

  const profitMargin = current.revenue > 0 ? ((current.revenue - current.expenses) / current.revenue) * 100 : 0;
  const inventoryTurnover = current.inventory > 0 ? current.sales / current.inventory : 0;
  const demandFulfillment = current.demand > 0 ? Math.min(100, (current.production / current.demand) * 100) : 100;
  const operationalEfficiency = current.production > 0 ? Math.min(100, (current.sales / current.production) * 100) : 0;

  const risk = riskColors[kpis.riskLevel];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Digital Business Twin</h2>
            <p className="text-sm text-slate-400">Real-time digital representation of your business state</p>
          </div>
        </div>
      </div>

      {/* Twin visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health gauge */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center">
          <h3 className="font-semibold text-slate-200 mb-4">Business Health Score</h3>
          <Gauge value={kpis.healthScore} label="out of 100" size={180} />
          <div className={`mt-4 px-4 py-1.5 rounded-full text-sm font-medium border ${risk.bg} ${risk.text} ${risk.border}`}>
            Risk Level: {kpis.riskLevel}
          </div>
        </div>

        {/* Current state stats */}
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="text-lg font-bold text-white">{stat.value}</div>
                <div className="text-xs text-slate-400 mt-0.5">{stat.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Operational metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Profit Margin', value: `${profitMargin.toFixed(1)}%`, target: '> 20%', good: profitMargin > 20 },
          { label: 'Inventory Turnover', value: `${inventoryTurnover.toFixed(2)}x`, target: '> 1.0x', good: inventoryTurnover > 1 },
          { label: 'Demand Fulfillment', value: `${demandFulfillment.toFixed(0)}%`, target: '> 90%', good: demandFulfillment > 90 },
          { label: 'Operational Efficiency', value: `${operationalEfficiency.toFixed(0)}%`, target: '> 85%', good: operationalEfficiency > 85 },
        ].map((m) => (
          <div key={m.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">{m.label}</span>
              {m.good ? (
                <span className="text-[10px] text-emerald-400">Healthy</span>
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              )}
            </div>
            <div className="text-xl font-bold text-white">{m.value}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Target: {m.target}</div>
          </div>
        ))}
      </div>

      {/* Twin state diagram */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="font-semibold text-slate-200 mb-6">Business Twin State Map</h3>
        <div className="flex flex-col items-center gap-4">
          {/* Center node */}
          <div className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-center">
            <Brain className="w-8 h-8 text-cyan-400 mx-auto mb-1" />
            <div className="font-semibold text-white">Business Core</div>
            <div className="text-xs text-slate-400">Health: {kpis.healthScore}/100</div>
          </div>

          {/* Connecting lines + branches */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
            {[
              { label: 'Revenue Stream', value: formatCurrency(current.revenue), color: 'cyan', change: kpis.revenueChange },
              { label: 'Expense Load', value: formatCurrency(current.expenses), color: 'red', change: null },
              { label: 'Inventory Level', value: formatNumber(current.inventory), color: 'blue', change: kpis.inventoryChange },
              { label: 'Cash Position', value: formatCurrency(current.cashFlow), color: 'amber', change: kpis.cashFlowChange },
            ].map((node) => {
              const colors: Record<string, string> = {
                cyan: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/5',
                red: 'border-red-500/30 text-red-400 bg-red-500/5',
                blue: 'border-blue-500/30 text-blue-400 bg-blue-500/5',
                amber: 'border-amber-500/30 text-amber-400 bg-amber-500/5',
              };
              return (
                <div key={node.label} className={`rounded-xl border ${colors[node.color]} p-4 text-center`}>
                  <div className="text-xs text-slate-400 mb-1">{node.label}</div>
                  <div className="text-lg font-bold text-white">{node.value}</div>
                  {node.change !== null && (
                    <div className={`text-[10px] mt-1 ${node.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {node.change >= 0 ? '+' : ''}{node.change.toFixed(1)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
