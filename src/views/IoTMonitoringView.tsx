import { useMemo, useState } from 'react';
import {
  Cpu, Thermometer, Droplets, Weight, ScanLine, Wifi, Activity,
  AlertTriangle, CheckCircle2, XCircle, RefreshCw,
} from 'lucide-react';
import type { WarehouseState } from '@/lib/use-warehouse';
import type { SensorType, SensorStatus } from '@/lib/warehouse-types';
import { LineChart } from '@/components/Charts';

const sensorIcons: Record<SensorType, typeof Thermometer> = {
  temperature: Thermometer,
  humidity: Droplets,
  loadcell: Weight,
  rfid: ScanLine,
};

const sensorColors: Record<SensorType, string> = {
  temperature: '#f97316',
  humidity: '#06b6d4',
  loadcell: '#8b5cf6',
  rfid: '#10b981',
};

const statusConfig: Record<SensorStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  online: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Online' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', label: 'Warning' },
  error: { icon: XCircle, color: 'text-red-400', label: 'Error' },
  offline: { icon: XCircle, color: 'text-slate-500', label: 'Offline' },
};

export function IoTMonitoringView({ state }: { state: WarehouseState }) {
  const { sensorReadings, sensorHistory, zones, refreshSensors } = state;
  const [selectedZone, setSelectedZone] = useState<string>(zones[0]?.id ?? 'A');

  const zoneReadings = useMemo(
    () => sensorReadings.filter((r) => r.zoneId === selectedZone),
    [sensorReadings, selectedZone]
  );

  const historyData = useMemo(() => {
    const hist = sensorHistory[selectedZone] ?? [];
    return {
      temp: hist.slice(-12).map((r) => ({ label: r.time, value: r.temperature })),
      hum: hist.slice(-12).map((r) => ({ label: r.time, value: r.humidity })),
      weight: hist.slice(-12).map((r) => ({ label: r.time, value: r.weight })),
    };
  }, [sensorHistory, selectedZone]);

  const onlineCount = sensorReadings.filter((r) => r.status === 'online').length;
  const warningCount = sensorReadings.filter((r) => r.status === 'warning').length;
  const errorCount = sensorReadings.filter((r) => r.status === 'error').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Simulation banner */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 flex-shrink-0" />
          <span>Demo / Simulated Sensor Data — ESP32 IoT gateway simulation. Replace with real sensor API to go live.</span>
        </div>
        <button
          onClick={refreshSensors}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors flex-shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Poll Sensors
        </button>
      </div>

      {/* ESP32 Gateway status */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <Cpu className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">ESP32 IoT Gateway</h3>
            <p className="text-sm text-slate-400">Simulated sensor data aggregation node</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400">Active</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">{onlineCount}</div>
            <div className="text-[11px] text-slate-400">Online Sensors</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400">{warningCount}</div>
            <div className="text-[11px] text-slate-400">Warnings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{errorCount}</div>
            <div className="text-[11px] text-slate-400">Errors</div>
          </div>
        </div>
      </div>

      {/* Zone selector */}
      <div className="flex flex-wrap gap-2">
        {zones.map((z) => (
          <button
            key={z.id}
            onClick={() => setSelectedZone(z.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedZone === z.id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {z.name}
          </button>
        ))}
      </div>

      {/* Sensor readings for selected zone */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {zoneReadings.map((reading) => {
          const Icon = sensorIcons[reading.sensorType];
          const statusCfg = statusConfig[reading.status];
          const StatusIcon = statusCfg.icon;
          return (
            <div key={reading.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${sensorColors[reading.sensorType]}20` }}>
                  <Icon className="w-5 h-5" style={{ color: sensorColors[reading.sensorType] }} />
                </div>
                <span className={`inline-flex items-center gap-1 text-[10px] ${statusCfg.color}`}>
                  <StatusIcon className="w-3 h-3" /> {statusCfg.label}
                </span>
              </div>
              <div className="text-2xl font-bold text-white">
                {reading.value}<span className="text-sm text-slate-400 ml-1">{reading.unit}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1 capitalize">{reading.sensorType}</div>
              <div className="text-[10px] text-slate-600 mt-1">{new Date(reading.timestamp).toLocaleTimeString()}</div>
            </div>
          );
        })}
      </div>

      {/* Sensor history charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-orange-400" /> Temperature
          </h3>
          <LineChart data={historyData.temp} height={180} color="#f97316" formatValue={(v) => `${v.toFixed(1)}°`} />
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Droplets className="w-4 h-4 text-cyan-400" /> Humidity
          </h3>
          <LineChart data={historyData.hum} height={180} color="#06b6d4" formatValue={(v) => `${v.toFixed(0)}%`} />
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Weight className="w-4 h-4 text-violet-400" /> Load Cell Weight
          </h3>
          <LineChart data={historyData.weight} height={180} color="#8b5cf6" formatValue={(v) => `${Math.round(v)}kg`} />
        </div>
      </div>

      {/* Data flow architecture */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Wifi className="w-4 h-4 text-cyan-400" /> Real-Time Data Flow Architecture
        </h3>
        <div className="flex flex-col lg:flex-row items-center gap-3 text-xs">
          {[
            { label: 'RFID / Load Cell / Temp Sensors', icon: ScanLine, color: 'text-emerald-400' },
            { label: 'ESP32 Gateway', icon: Cpu, color: 'text-cyan-400' },
            { label: 'Data Processing', icon: Activity, color: 'text-blue-400' },
            { label: 'AI Digital Twin', icon: Cpu, color: 'text-violet-400' },
            { label: 'AI Analysis & Prediction', icon: Cpu, color: 'text-amber-400' },
            { label: 'Smart Recommendations', icon: CheckCircle2, color: 'text-teal-400' },
            { label: 'Warehouse Manager', icon: CheckCircle2, color: 'text-emerald-400' },
          ].map((step, i, arr) => {
            const Icon = step.icon;
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-2 px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700/50 min-w-[140px]">
                  <Icon className={`w-5 h-5 ${step.color}`} />
                  <span className="text-slate-300 text-center">{step.label}</span>
                </div>
                {i < arr.length - 1 && <span className="text-slate-600 text-lg">↓</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
