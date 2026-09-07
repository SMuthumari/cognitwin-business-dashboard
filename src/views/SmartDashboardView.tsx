import { useMemo } from 'react';
import {
  Package, Boxes, AlertTriangle, TrendingUp, ArrowDownToLine,
  Brain, Thermometer, Activity, Wifi, Cpu,
} from 'lucide-react';
import type { WarehouseState } from '@/lib/use-warehouse';
import { LineChart, BarChart, DonutChart, Gauge } from '@/components/Charts';

export function SmartDashboardView({ state }: { state: WarehouseState }) {
  const { metrics, products, zones, stockMovements, sensorHistory, forecasts } = state;

  const inventoryByZone = useMemo(
    () =>
      zones.map((z) => ({
        label: `Zone ${z.id}`,
        value: z.usedCapacity,
        color: z.status === 'critical' ? '#ef4444' : z.status === 'temp_warning' ? '#f59e0b' : z.status === 'low_stock' ? '#f97316' : z.status === 'overstock' ? '#8b5cf6' : '#3b82f6',
      })),
    [zones]
  );

  const stockMovementData = useMemo(
    () =>
      stockMovements.slice(-7).map((m) => ({
        label: m.date.slice(5),
        value: m.net,
      })),
    [stockMovements]
  );

  const demandForecastData = useMemo(() => {
    const totalHist = forecasts[0]?.historicalDemand ?? [];
    const totalPred = forecasts[0]?.predictedDemand ?? [];
    const hist = totalHist.slice(-6).map((v, i) => ({ label: `M-${6 - i}`, value: v }));
    const pred = totalPred.slice(0, 6).map((v, i) => ({ label: `M+${i + 1}`, value: v }));
    return [...hist, ...pred];
  }, [forecasts]);

  const tempHistoryData = useMemo(() => {
    const zoneA = sensorHistory['A'] ?? [];
    return zoneA.slice(-12).map((r) => ({ label: r.time, value: r.temperature }));
  }, [sensorHistory]);

  const statusBreakdown = useMemo(() => {
    const normal = products.filter((p) => p.status === 'normal').length;
    const low = products.filter((p) => p.status === 'low').length;
    const critical = products.filter((p) => p.status === 'critical').length;
    const overstock = products.filter((p) => p.status === 'overstock').length;
    return [
      { label: 'Normal', value: normal, color: '#10b981' },
      { label: 'Low Stock', value: low, color: '#f97316' },
      { label: 'Critical', value: critical, color: '#ef4444' },
      { label: 'Overstock', value: overstock, color: '#8b5cf6' },
    ];
  }, [products]);

  const kpiCards = [
    { label: 'Total Products', value: metrics.totalProducts, icon: Package, color: 'text-cyan-400', bg: 'from-cyan-500/10 to-blue-500/10' },
    { label: 'Total Stock', value: metrics.totalStock.toLocaleString(), icon: Boxes, color: 'text-blue-400', bg: 'from-blue-500/10 to-indigo-500/10' },
    { label: 'Low Stock Items', value: metrics.lowStockItems, icon: AlertTriangle, color: 'text-orange-400', bg: 'from-orange-500/10 to-red-500/10' },
    { label: 'Overstock Items', value: metrics.overstockItems, icon: TrendingUp, color: 'text-violet-400', bg: 'from-violet-500/10 to-purple-500/10' },
    { label: 'Incoming Stock', value: metrics.incomingStock.toLocaleString(), icon: ArrowDownToLine, color: 'text-emerald-400', bg: 'from-emerald-500/10 to-teal-500/10' },
    { label: 'Predicted Demand', value: metrics.predictedDemand.toLocaleString(), icon: Brain, color: 'text-cyan-400', bg: 'from-cyan-500/10 to-teal-500/10' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Simulation banner */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
        <Cpu className="w-4 h-4 flex-shrink-0" />
        <span>Demo / Simulated Sensor Data — ESP32 IoT gateway simulation active. Real hardware can be connected later.</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className={`bg-gradient-to-br ${kpi.bg} border border-slate-700/50 rounded-xl p-4`}>
              <Icon className={`w-5 h-5 ${kpi.color} mb-2`} />
              <div className="text-2xl font-bold text-white">{kpi.value}</div>
              <div className="text-[11px] text-slate-400">{kpi.label}</div>
            </div>
          );
        })}
      </div>

      {/* Health & Environmental */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 self-start">Warehouse Health</h3>
          <Gauge value={metrics.warehouseHealth} max={100} label="Health Score" size={180} />
          <div className="mt-3 text-center">
            <span className={`text-xs px-3 py-1 rounded-full ${
              metrics.warehouseHealth >= 75 ? 'bg-emerald-500/10 text-emerald-400' :
              metrics.warehouseHealth >= 50 ? 'bg-amber-500/10 text-amber-400' :
              'bg-red-500/10 text-red-400'
            }`}>
              {metrics.warehouseHealth >= 75 ? 'Healthy' : metrics.warehouseHealth >= 50 ? 'Moderate' : 'At Risk'}
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-orange-400" /> Environmental Status
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Avg Temperature</span>
                <span className="text-white font-medium">{metrics.avgTemperature}°C</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${
                  metrics.avgTemperature > 27 ? 'bg-red-500' : metrics.avgTemperature > 24 ? 'bg-amber-500' : 'bg-emerald-500'
                }`} style={{ width: `${Math.min(100, (metrics.avgTemperature / 35) * 100)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Avg Humidity</span>
                <span className="text-white font-medium">{metrics.avgHumidity}%RH</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${
                  metrics.avgHumidity > 70 ? 'bg-amber-500' : 'bg-cyan-500'
                }`} style={{ width: `${Math.min(100, metrics.avgHumidity)}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {zones.map((z) => (
                <div key={z.id} className="flex items-center gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full ${
                    z.status === 'critical' ? 'bg-red-500 animate-pulse' :
                    z.status === 'temp_warning' ? 'bg-amber-500' :
                    z.status === 'low_stock' ? 'bg-orange-500' :
                    z.status === 'overstock' ? 'bg-violet-500' : 'bg-emerald-500'
                  }`} />
                  <span className="text-slate-300">{z.name.split('—')[0].trim()}</span>
                  <span className="text-slate-500 ml-auto">{z.temperature}°C</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-cyan-400" /> IoT Sensor Status
          </h3>
          <div className="flex items-center justify-center mb-4">
            <DonutChart
              data={[
                { label: 'Online', value: metrics.onlineSensors, color: '#10b981' },
                { label: 'Warning', value: metrics.totalSensors - metrics.onlineSensors, color: '#f59e0b' },
              ]}
              size={140}
              centerValue={`${metrics.onlineSensors}/${metrics.totalSensors}`}
              centerLabel="Sensors"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 justify-center">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            ESP32 Gateway: Simulated Active
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Inventory Levels by Zone</h3>
          <BarChart data={inventoryByZone} height={200} formatValue={(v) => `${v}`} />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Stock Movement (Net)</h3>
          <LineChart data={stockMovementData} height={200} color="#10b981" formatValue={(v) => `${v}`} />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Demand Forecast (Demo Algorithm)</h3>
          <LineChart data={demandForecastData} height={200} color="#06b6d4" showDots={false} formatValue={(v) => `${Math.round(v)}`} />
          <p className="text-[10px] text-slate-500 mt-2">Historical (left) → Predicted (right). Linear regression demo model.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Temperature Trend — Zone A</h3>
          <LineChart data={tempHistoryData} height={200} color="#f97316" formatValue={(v) => `${v.toFixed(1)}°`} />
        </div>
      </div>

      {/* Stock status breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Product Status Distribution</h3>
        <div className="flex items-center justify-center">
          <DonutChart data={statusBreakdown} size={180} centerValue={`${products.length}`} centerLabel="Products" />
        </div>
      </div>
    </div>
  );
}
