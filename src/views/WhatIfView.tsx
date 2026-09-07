import { useMemo, useState } from 'react';
import { Sliders, TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart, AlertTriangle } from 'lucide-react';
import type { BusinessDataPoint, WhatIfInputs, RiskLevel } from '@/lib/types';
import { runWhatIf, aggregateByDate } from '@/lib/analytics';

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

const riskColors: Record<RiskLevel, string> = {
  Low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  Moderate: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  High: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  Critical: 'text-red-400 bg-red-500/10 border-red-500/30',
};

export function WhatIfView({ data }: { data: BusinessDataPoint[] }) {
  const [inputs, setInputs] = useState<WhatIfInputs>({
    demandChange: 0,
    expenseChange: 0,
    priceChange: 0,
  });

  const monthly = useMemo(() => aggregateByDate(data), [data]);
  const current = monthly[monthly.length - 1] ?? { revenue: 0, expenses: 0, inventory: 0, demand: 0, cashFlow: 0, sales: 0, production: 0 };
  const currentProfit = current.revenue - current.expenses;

  const result = useMemo(() => runWhatIf(data, inputs), [data, inputs]);

  const sliders = [
    { key: 'demandChange' as const, label: 'Demand Change', icon: ShoppingCart, min: -50, max: 50, color: 'accent-cyan-500' },
    { key: 'expenseChange' as const, label: 'Expense Change', icon: TrendingDown, icon2: true, min: -30, max: 50, color: 'accent-red-500' },
    { key: 'priceChange' as const, label: 'Price Change', icon: DollarSign, min: -30, max: 30, color: 'accent-emerald-500' },
  ];

  const comparisons = [
    { label: 'Revenue', current: current.revenue, projected: result.projectedRevenue, format: formatCurrency, icon: DollarSign, color: 'cyan' },
    { label: 'Expenses', current: current.expenses, projected: result.projectedExpenses, format: formatCurrency, icon: TrendingDown, color: 'red' },
    { label: 'Profit', current: currentProfit, projected: result.projectedProfit, format: formatCurrency, icon: TrendingUp, color: 'emerald' },
    { label: 'Inventory', current: current.inventory, projected: result.projectedInventory, format: formatNumber, icon: Package, color: 'blue' },
    { label: 'Demand', current: current.demand, projected: result.projectedDemand, format: formatNumber, icon: ShoppingCart, color: 'amber' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <Sliders className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">What-If Scenario Simulator</h2>
            <p className="text-sm text-slate-400">Adjust parameters to simulate business outcomes</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input sliders */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="font-semibold text-slate-200 mb-6">Scenario Parameters</h3>
          <div className="space-y-8">
            {sliders.map((slider) => {
              const Icon = slider.icon;
              const value = inputs[slider.key];
              return (
                <div key={slider.key}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-300">{slider.label}</span>
                    </div>
                    <span className={`text-sm font-bold ${value > 0 ? 'text-emerald-400' : value < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                      {value > 0 ? '+' : ''}{value}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={slider.min}
                    max={slider.max}
                    value={value}
                    onChange={(e) => setInputs({ ...inputs, [slider.key]: parseInt(e.target.value) })}
                    className={`w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer ${slider.color}`}
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>{slider.min}%</span>
                    <span>0%</span>
                    <span>+{slider.max}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick presets */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <p className="text-xs text-slate-400 mb-3">Quick Scenarios</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Optimistic', inputs: { demandChange: 20, expenseChange: -5, priceChange: 10 } },
                { label: 'Pessimistic', inputs: { demandChange: -20, expenseChange: 15, priceChange: -5 } },
                { label: 'Price Increase', inputs: { demandChange: -5, expenseChange: 0, priceChange: 15 } },
                { label: 'Reset', inputs: { demandChange: 0, expenseChange: 0, priceChange: 0 } },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => setInputs(preset.inputs)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="font-semibold text-slate-200 mb-6">Projected Outcomes</h3>

          {/* Risk level badge */}
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border mb-6 ${riskColors[result.projectedRiskLevel]}`}>
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Projected Risk Level: {result.projectedRiskLevel}</span>
          </div>

          <div className="space-y-3">
            {comparisons.map((c) => {
              const Icon = c.icon;
              const delta = c.projected - c.current;
              const deltaPct = c.current > 0 ? (delta / c.current) * 100 : 0;
              return (
                <div key={c.label} className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-lg">
                  <Icon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-400">{c.label}</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm text-slate-500 line-through">{c.format(c.current)}</span>
                      <span className="text-lg font-bold text-white">{c.format(c.projected)}</span>
                    </div>
                  </div>
                  <div className={`text-sm font-bold flex-shrink-0 ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                    {delta > 0 ? '+' : ''}{deltaPct.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>

          {/* Profit delta highlight */}
          <div className={`mt-4 p-4 rounded-lg border ${result.profitDelta > 0 ? 'bg-emerald-500/10 border-emerald-500/30' : result.profitDelta < 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-800 border-slate-700'}`}>
            <div className="text-xs text-slate-400 mb-1">Profit Impact</div>
            <div className={`text-2xl font-bold ${result.profitDelta > 0 ? 'text-emerald-400' : result.profitDelta < 0 ? 'text-red-400' : 'text-slate-300'}`}>
              {result.profitDelta > 0 ? '+' : ''}{formatCurrency(result.profitDelta)}
            </div>
          </div>
        </div>
      </div>

      {/* Scenario comparison chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="font-semibold text-slate-200 mb-6">Current vs Projected Comparison</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {comparisons.map((c) => {
            const maxVal = Math.max(c.current, c.projected, 1);
            return (
              <div key={c.label} className="text-center">
                <div className="text-xs text-slate-400 mb-2">{c.label}</div>
                <div className="flex items-end justify-center gap-2 h-32">
                  <div className="flex flex-col items-center">
                    <div className="w-8 bg-slate-600 rounded-t transition-all duration-500" style={{ height: `${(c.current / maxVal) * 100}%` }} />
                    <span className="text-[10px] text-slate-500 mt-1">Now</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className={`w-8 rounded-t transition-all duration-500 ${c.projected > c.current ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ height: `${(c.projected / maxVal) * 100}%` }} />
                    <span className="text-[10px] text-slate-500 mt-1">Sim</span>
                  </div>
                </div>
                <div className="text-xs font-medium text-white mt-2">{c.format(c.projected)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
