import { useMemo, useState } from 'react';
import {
  Brain, Thermometer, Package, AlertTriangle, Boxes,
  CheckCircle2, XCircle, MapPin, Cpu,
} from 'lucide-react';
import type { WarehouseState } from '@/lib/use-warehouse';
import type { ZoneStatus } from '@/lib/warehouse-types';

const zoneStatusConfig: Record<ZoneStatus, { color: string; bg: string; border: string; label: string }> = {
  normal: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Normal' },
  low_stock: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: 'Low Stock' },
  overstock: { color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30', label: 'Overstock' },
  temp_warning: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Temp Warning' },
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Critical' },
};

export function DigitalTwinView({ state }: { state: WarehouseState }) {
  const { zones, products, sensorReadings } = state;
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const selectedZone = zones.find((z) => z.id === selectedZoneId);
  const zoneProducts = useMemo(
    () => (selectedZone ? products.filter((p) => p.storageZone === selectedZone.id) : []),
    [selectedZone, products]
  );
  const zoneSensors = useMemo(
    () => (selectedZone ? sensorReadings.filter((r) => r.zoneId === selectedZone.id) : []),
    [selectedZone, sensorReadings]
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">AI Digital Twin</h2>
            <p className="text-sm text-slate-400">Virtual representation of warehouse operations — updates with live sensor data</p>
          </div>
        </div>
      </div>

      {/* Simulation banner */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
        <Cpu className="w-4 h-4 flex-shrink-0" />
        <span>Demo / Simulated Sensor Data — Digital Twin reflects simulated IoT readings. Connect real ESP32 for live mirroring.</span>
      </div>

      {/* Warehouse grid visualization */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Warehouse Layout — Zone Map</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((zone) => {
            const cfg = zoneStatusConfig[zone.status];
            const utilization = Math.round((zone.usedCapacity / zone.capacity) * 100);
            return (
              <button
                key={zone.id}
                onClick={() => setSelectedZoneId(zone.id)}
                className={`text-left p-5 rounded-xl border-2 transition-all ${
                  selectedZoneId === zone.id ? 'border-cyan-500' : cfg.border
                } ${cfg.bg} hover:scale-[1.02]`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className={`w-4 h-4 ${cfg.color}`} />
                    <span className="font-semibold text-white text-sm">{zone.name}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                    {cfg.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-slate-400">Temperature</div>
                    <div className={`font-medium ${zone.temperature > 27 || zone.temperature < 2 ? 'text-red-400' : 'text-white'}`}>
                      {zone.temperature}°C
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Humidity</div>
                    <div className="text-white font-medium">{zone.humidity}%</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Products</div>
                    <div className="text-white font-medium">{zone.productCount}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Capacity</div>
                    <div className={`font-medium ${utilization > 90 ? 'text-red-400' : utilization > 75 ? 'text-amber-400' : 'text-white'}`}>
                      {utilization}%
                    </div>
                  </div>
                </div>
                {/* Capacity bar */}
                <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      utilization > 90 ? 'bg-red-500' : utilization > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, utilization)}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected zone detail */}
      {selectedZone && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Zone sensor status */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-orange-400" />
              {selectedZone.name} — Sensor Status
            </h3>
            <div className="space-y-3">
              {zoneSensors.map((sensor) => {
                const statusIcon = sensor.status === 'online' ? CheckCircle2 : sensor.status === 'warning' ? AlertTriangle : XCircle;
                const StatusIcon = statusIcon;
                const statusColor = sensor.status === 'online' ? 'text-emerald-400' : sensor.status === 'warning' ? 'text-amber-400' : 'text-red-400';
                return (
                  <div key={sensor.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/30">
                    <div className="flex items-center gap-3">
                      <StatusIcon className={`w-4 h-4 ${statusColor}`} />
                      <span className="text-sm text-slate-300 capitalize">{sensor.sensorType}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white font-medium">{sensor.value}{sensor.unit}</span>
                      <span className={`ml-2 text-[10px] ${statusColor}`}>{sensor.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Zone products */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-cyan-400" />
              {selectedZone.name} — Products
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {zoneProducts.map((product) => {
                const statusColor = product.status === 'critical' ? 'text-red-400' :
                  product.status === 'low' ? 'text-orange-400' :
                  product.status === 'overstock' ? 'text-violet-400' : 'text-emerald-400';
                return (
                  <div key={product.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/30">
                    <div className="min-w-0">
                      <div className="text-sm text-slate-200 truncate">{product.name}</div>
                      <div className="text-[10px] text-slate-500">{product.id} · {product.rfidId}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`text-sm font-medium ${statusColor}`}>{product.quantity} units</div>
                      <div className="text-[10px] text-slate-500">min: {product.minStock} · max: {product.maxStock}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="text-slate-400 font-medium">Visual Indicators:</span>
          {(Object.entries(zoneStatusConfig) as [ZoneStatus, typeof zoneStatusConfig[ZoneStatus]][]).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-full border ${cfg.bg} ${cfg.border}`} />
              <span className={cfg.color}>{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
