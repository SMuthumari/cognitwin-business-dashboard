import { useMemo } from 'react';
import { Lightbulb, ArrowRight, AlertTriangle, CheckCircle2, Package } from 'lucide-react';
import type { WarehouseState } from '@/lib/use-warehouse';
import type { Priority } from '@/lib/warehouse-types';

const priorityConfig: Record<Priority, { color: string; bg: string; border: string; label: string }> = {
  high: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'HIGH' },
  medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'MEDIUM' },
  low: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', label: 'LOW' },
};

export function SmartRecommendationsView({ state }: { state: WarehouseState }) {
  const { recommendations, alerts, metrics } = state;

  const grouped = useMemo(() => {
    const map: Record<Priority, typeof recommendations> = { high: [], medium: [], low: [] };
    for (const rec of recommendations) {
      map[rec.priority].push(rec);
    }
    return map;
  }, [recommendations]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center">
            <Lightbulb className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Smart Recommendations</h2>
            <p className="text-sm text-slate-400">AI-generated actions based on inventory, demand, and sensor analysis</p>
          </div>
          <div className="ml-auto px-4 py-2 rounded-lg bg-slate-800 border border-slate-700">
            <span className="text-2xl font-bold text-white">{recommendations.length}</span>
            <span className="text-xs text-slate-400 ml-2">Recommendations</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {(['high', 'medium', 'low'] as Priority[]).map((p) => {
          const cfg = priorityConfig[p];
          return (
            <div key={p} className={`p-4 rounded-xl border ${cfg.bg} ${cfg.border} text-center`}>
              <div className={`text-3xl font-bold ${cfg.color}`}>{grouped[p].length}</div>
              <div className={`text-xs ${cfg.color} mt-1`}>{cfg.label} PRIORITY</div>
            </div>
          );
        })}
      </div>

      {/* Recommendations */}
      {recommendations.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 flex flex-col items-center gap-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          <p className="text-sm text-slate-400">No recommendations needed. All warehouse operations are optimal.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(['high', 'medium', 'low'] as Priority[]).map((priority) => {
            const recs = grouped[priority];
            if (recs.length === 0) return null;
            const cfg = priorityConfig[priority];
            return (
              <div key={priority}>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className={`w-4 h-4 ${cfg.color}`} />
                  <h3 className={`text-sm font-semibold ${cfg.color}`}>{cfg.label} PRIORITY</h3>
                  <span className="text-xs text-slate-500">({recs.length})</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {recs.map((rec) => (
                    <div key={rec.id} className={`bg-slate-900 border ${cfg.border} rounded-xl p-5`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Package className={`w-4 h-4 ${cfg.color}`} />
                          <span className="text-xs text-slate-400">{rec.category}</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                          {cfg.label}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Problem</div>
                          <div className="text-sm text-white font-medium">{rec.problem}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Reason</div>
                          <div className="text-sm text-slate-400">{rec.reason}</div>
                        </div>
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-800/50 border border-slate-700/30">
                          <ArrowRight className={`w-4 h-4 ${cfg.color} flex-shrink-0 mt-0.5`} />
                          <div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Recommended Action</div>
                            <div className="text-sm text-slate-200">{rec.action}</div>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Impact</div>
                          <div className="text-xs text-slate-400">{rec.impact}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
