import { useMemo } from 'react';
import { AlertTriangle, Package, DollarSign, Wallet, ShoppingCart, ShieldCheck } from 'lucide-react';
import type { BusinessDataPoint, Risk, RiskLevel } from '@/lib/types';
import { analyzeRisks, aggregateByDate } from '@/lib/analytics';

const riskColors: Record<RiskLevel, { bg: string; text: string; border: string; dot: string }> = {
  Low: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  Moderate: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  High: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  Critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-400' },
};

const riskIcons: Record<Risk['type'], typeof Package> = {
  inventory: Package,
  expense: DollarSign,
  cashflow: Wallet,
  sales: ShoppingCart,
};

export function RiskAnalysisView({ data }: { data: BusinessDataPoint[] }) {
  const risks = useMemo(() => analyzeRisks(data), [data]);
  const monthly = useMemo(() => aggregateByDate(data), [data]);
  const current = monthly[monthly.length - 1] ?? { inventory: 0, demand: 0, revenue: 0, expenses: 0, cashFlow: 0, sales: 0 };

  const riskCount = {
    Critical: risks.filter((r) => r.level === 'Critical').length,
    High: risks.filter((r) => r.level === 'High').length,
    Moderate: risks.filter((r) => r.level === 'Moderate').length,
    Low: risks.filter((r) => r.level === 'Low').length,
  };

  // Risk matrix scores
  const inventoryRisk = current.demand > 0 ? current.inventory / current.demand : 0;
  const expenseRisk = current.revenue > 0 ? current.expenses / current.revenue : 0;
  const cashFlowRisk = current.cashFlow < 0 ? 1 : current.revenue > 0 ? Math.max(0, 1 - current.cashFlow / (current.revenue * 0.3)) : 1;
  const salesRisk = monthly.length > 1 ? Math.max(0, -((current.sales - monthly[monthly.length - 2].sales) / Math.max(monthly[monthly.length - 2].sales, 1))) : 0;

  const riskMetrics = [
    { label: 'Inventory Risk', value: inventoryRisk, icon: Package, raw: `${inventoryRisk.toFixed(2)}x demand`, good: inventoryRisk >= 0.5 && inventoryRisk <= 3 },
    { label: 'Expense Risk', value: expenseRisk, icon: DollarSign, raw: `${(expenseRisk * 100).toFixed(0)}% of revenue`, good: expenseRisk < 0.75 },
    { label: 'Cash Flow Risk', value: cashFlowRisk, icon: Wallet, raw: current.cashFlow < 0 ? 'Negative' : `${(cashFlowRisk * 100).toFixed(0)}%`, good: cashFlowRisk < 0.5 },
    { label: 'Sales Risk', value: Math.abs(salesRisk), icon: ShoppingCart, raw: `${(salesRisk * 100).toFixed(0)}% decline`, good: salesRisk < 0.15 },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Risk summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['Critical', 'High', 'Moderate', 'Low'] as RiskLevel[]).map((level) => (
          <div key={level} className={`bg-slate-900 border ${riskColors[level].border} rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2.5 h-2.5 rounded-full ${riskColors[level].dot}`} />
              <span className={`text-xs font-medium ${riskColors[level].text}`}>{level} Risk</span>
            </div>
            <div className="text-2xl font-bold text-white">{riskCount[level]}</div>
            <div className="text-[10px] text-slate-500">{riskCount[level] === 1 ? 'alert' : 'alerts'}</div>
          </div>
        ))}
      </div>

      {/* Risk metrics */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="font-semibold text-slate-200 mb-4">Risk Indicators</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {riskMetrics.map((m) => {
            const Icon = m.icon;
            const pct = Math.min(100, m.value * 100);
            const color = m.good ? '#10b981' : pct > 75 ? '#ef4444' : pct > 50 ? '#f97316' : '#f59e0b';
            return (
              <div key={m.label} className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={`w-4 h-4 ${m.good ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <span className="text-xs text-slate-400">{m.label}</span>
                </div>
                <div className="text-lg font-bold text-white mb-1">{m.raw}</div>
                <div className="w-full bg-slate-700 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active risks */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-200">Active Risk Alerts</h3>
        {risks.length === 0 ? (
          <div className="bg-slate-900 border border-emerald-500/20 rounded-xl p-8 flex flex-col items-center gap-3">
            <ShieldCheck className="w-12 h-12 text-emerald-400" />
            <p className="text-slate-300 font-medium">No active risks detected</p>
            <p className="text-sm text-slate-500">All business metrics are within healthy ranges.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {risks.map((risk) => {
              const Icon = riskIcons[risk.type];
              const colors = riskColors[risk.level];
              return (
                <div key={risk.id} className={`bg-slate-900 border ${colors.border} rounded-xl p-5`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-white">{risk.title}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                          {risk.level}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mb-2">{risk.description}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">{risk.metric}:</span>
                        <span className={colors.text}>{risk.value.toFixed(2)}</span>
                        <span className="text-slate-500">/ threshold:</span>
                        <span className="text-slate-400">{risk.threshold}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Risk matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="font-semibold text-slate-200 mb-4">Risk Impact Matrix</h3>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div></div>
          <div className="text-slate-400">Low Impact</div>
          <div className="text-slate-400">Medium Impact</div>
          <div className="text-slate-400">High Impact</div>

          <div className="text-slate-400 text-right pr-2 flex items-center justify-end">Critical</div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400">Immediate Action</div>
          <div className="bg-red-500/15 border border-red-500/30 rounded-lg p-3 text-red-400">Urgent</div>
          <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-3 text-red-400 font-bold">Critical</div>

          <div className="text-slate-400 text-right pr-2 flex items-center justify-end">High</div>
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-orange-400">Monitor</div>
          <div className="bg-orange-500/15 border border-orange-500/30 rounded-lg p-3 text-orange-400">Action Needed</div>
          <div className="bg-orange-500/20 border border-orange-500/40 rounded-lg p-3 text-orange-400">Urgent</div>

          <div className="text-slate-400 text-right pr-2 flex items-center justify-end">Moderate</div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-amber-400">OK</div>
          <div className="bg-amber-500/15 border border-amber-500/30 rounded-lg p-3 text-amber-400">Watch</div>
          <div className="bg-amber-500/20 border border-amber-500/40 rounded-lg p-3 text-amber-400">Plan</div>

          <div className="text-slate-400 text-right pr-2 flex items-center justify-end">Low</div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-emerald-400">Safe</div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-emerald-400">Safe</div>
          <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-lg p-3 text-emerald-400">Monitor</div>
        </div>
      </div>
    </div>
  );
}
