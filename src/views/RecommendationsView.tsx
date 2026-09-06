import { useMemo } from 'react';
import { Lightbulb, AlertCircle, TrendingUp, Package, DollarSign, Wallet, ShoppingCart, Rocket } from 'lucide-react';
import type { BusinessDataPoint, Recommendation } from '@/lib/types';
import { generateRecommendations, analyzeRisks } from '@/lib/analytics';

const priorityConfig: Record<Recommendation['priority'], { bg: string; text: string; border: string; label: string }> = {
  high: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', label: 'High Priority' },
  medium: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Medium Priority' },
  low: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Low Priority' },
};

const categoryIcons: Record<string, typeof Package> = {
  Inventory: Package,
  Expenses: DollarSign,
  'Cash Flow': Wallet,
  Sales: ShoppingCart,
  Growth: Rocket,
  Operations: TrendingUp,
};

export function RecommendationsView({ data }: { data: BusinessDataPoint[] }) {
  const risks = useMemo(() => analyzeRisks(data), [data]);
  const recommendations = useMemo(() => generateRecommendations(data, risks), [data, risks]);

  const highCount = recommendations.filter((r) => r.priority === 'high').length;
  const mediumCount = recommendations.filter((r) => r.priority === 'medium').length;
  const lowCount = recommendations.filter((r) => r.priority === 'low').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">
            <Lightbulb className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">AI Recommendations</h2>
            <p className="text-sm text-slate-400">Rule-based insights to optimize your business</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-red-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{highCount}</div>
          <div className="text-xs text-slate-400">High Priority</div>
        </div>
        <div className="bg-slate-900 border border-amber-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">{mediumCount}</div>
          <div className="text-xs text-slate-400">Medium Priority</div>
        </div>
        <div className="bg-slate-900 border border-emerald-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">{lowCount}</div>
          <div className="text-xs text-slate-400">Low Priority</div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="space-y-4">
        {recommendations.length === 0 ? (
          <div className="bg-slate-900 border border-emerald-500/20 rounded-xl p-8 flex flex-col items-center gap-3">
            <Lightbulb className="w-12 h-12 text-emerald-400" />
            <p className="text-slate-300 font-medium">All clear! No recommendations at this time.</p>
            <p className="text-sm text-slate-500">Your business metrics are healthy.</p>
          </div>
        ) : (
          recommendations.map((rec) => {
            const Icon = categoryIcons[rec.category] || AlertCircle;
            const config = priorityConfig[rec.priority];
            return (
              <div key={rec.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-6 h-6 ${config.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-white">{rec.title}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${config.bg} ${config.text} ${config.border}`}>
                        {config.label}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{rec.category}</span>
                    </div>
                    <p className="text-sm text-slate-400 mb-3">{rec.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <div className="text-[10px] text-slate-500 mb-1">SUGGESTED ACTION</div>
                        <div className="text-sm text-slate-300">{rec.action}</div>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <div className="text-[10px] text-slate-500 mb-1">EXPECTED IMPACT</div>
                        <div className="text-sm text-slate-300">{rec.impact}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
