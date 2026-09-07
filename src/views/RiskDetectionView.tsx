import { useMemo } from 'react';
import {
  AlertTriangle, Thermometer, Package, Boxes, Activity,
  AlertCircle, XCircle,
} from 'lucide-react';
import type { WarehouseState } from '@/lib/use-warehouse';
import type { AlertType, AlertSeverity } from '@/lib/warehouse-types';

const severityConfig: Record<AlertSeverity, { color: string; bg: string; border: string; icon: typeof AlertCircle }> = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: XCircle },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: AlertTriangle },
  medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: AlertCircle },
  low: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', icon: Activity },
};

const typeIcons: Record<AlertType, typeof AlertTriangle> = {
  low_stock: Package,
  overstock: Boxes,
  stockout: AlertTriangle,
  temp_abnormal: Thermometer,
  inventory_mismatch: AlertCircle,
  unusual_movement: Activity,
};

export function RiskDetectionView({ state }: { state: WarehouseState }) {
  const { alerts, products, zones } = state;

  const alertsBySeverity = useMemo(() => {
    const grouped: Record<AlertSeverity, typeof alerts> = {
      critical: [],
      high: [],
      medium: [],
      low: [],
    };
    for (const alert of alerts) {
      grouped[alert.severity].push(alert);
    }
    return grouped;
  }, [alerts]);

  const stats = useMemo(() => {
    const lowStock = alerts.filter((a) => a.type === 'low_stock').length;
    const overstock = alerts.filter((a) => a.type === 'overstock').length;
    const stockout = alerts.filter((a) => a.type === 'stockout').length;
    const tempAbnormal = alerts.filter((a) => a.type === 'temp_abnormal').length;
    const mismatch = alerts.filter((a) => a.type === 'inventory_mismatch').length;
    const movement = alerts.filter((a) => a.type === 'unusual_movement').length;
    return { lowStock, overstock, stockout, tempAbnormal, mismatch, movement, total: alerts.length };
  }, [alerts]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-600 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">AI Risk Detection</h2>
            <p className="text-sm text-slate-400">Automated detection of inventory, temperature, and movement anomalies</p>
          </div>
          <div className="ml-auto px-4 py-2 rounded-lg bg-slate-800 border border-slate-700">
            <span className="text-2xl font-bold text-white">{stats.total}</span>
            <span className="text-xs text-slate-400 ml-2">Active Alerts</span>
          </div>
        </div>
      </div>

      {/* Risk type summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Low Stock', count: stats.lowStock, icon: Package, color: 'text-orange-400' },
          { label: 'Overstock', count: stats.overstock, icon: Boxes, color: 'text-violet-400' },
          { label: 'Stockout', count: stats.stockout, icon: AlertTriangle, color: 'text-red-400' },
          { label: 'Temp Abnormal', count: stats.tempAbnormal, icon: Thermometer, color: 'text-amber-400' },
          { label: 'Mismatch', count: stats.mismatch, icon: AlertCircle, color: 'text-cyan-400' },
          { label: 'Unusual Movement', count: stats.movement, icon: Activity, color: 'text-blue-400' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <Icon className={`w-5 h-5 ${s.color} mb-2`} />
              <div className="text-2xl font-bold text-white">{s.count}</div>
              <div className="text-[11px] text-slate-400">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Alerts by severity */}
      {(['critical', 'high', 'medium', 'low'] as AlertSeverity[]).map((severity) => {
        const severityAlerts = alertsBySeverity[severity];
        if (severityAlerts.length === 0) return null;
        const cfg = severityConfig[severity];
        const SevIcon = cfg.icon;

        return (
          <div key={severity}>
            <div className="flex items-center gap-2 mb-3">
              <SevIcon className={`w-4 h-4 ${cfg.color}`} />
              <h3 className={`text-sm font-semibold ${cfg.color} capitalize`}>{severity} Priority</h3>
              <span className="text-xs text-slate-500">({severityAlerts.length})</span>
            </div>
            <div className="space-y-3">
              {severityAlerts.map((alert) => {
                const TypeIcon = typeIcons[alert.type];
                return (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-4 p-4 rounded-xl border ${cfg.bg} ${cfg.border}`}
                  >
                    <div className={`w-10 h-10 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                      <TypeIcon className={`w-5 h-5 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-white text-sm">{alert.title}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border} capitalize`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mt-1">{alert.message}</p>
                      <div className="text-[10px] text-slate-600 mt-1">
                        {new Date(alert.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {alerts.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 flex flex-col items-center gap-3">
          <AlertCircle className="w-10 h-10 text-emerald-400" />
          <p className="text-sm text-slate-400">No active alerts. All warehouse operations are normal.</p>
        </div>
      )}

      {/* Risk matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Risk Distribution Matrix</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['critical', 'high', 'medium', 'low'] as AlertSeverity[]).map((sev) => {
            const cfg = severityConfig[sev];
            const count = alertsBySeverity[sev].length;
            return (
              <div key={sev} className={`p-4 rounded-lg border ${cfg.bg} ${cfg.border} text-center`}>
                <div className={`text-3xl font-bold ${cfg.color}`}>{count}</div>
                <div className={`text-xs ${cfg.color} capitalize mt-1`}>{sev}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
