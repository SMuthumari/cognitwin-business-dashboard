import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import type { BusinessDataPoint } from '@/lib/types';
import { forecast, aggregateByDate } from '@/lib/analytics';
import { ForecastChart, BarChart } from '@/components/Charts';

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

const METRICS = [
  { key: 'revenue' as const, label: 'Revenue', format: formatCurrency },
  { key: 'sales' as const, label: 'Sales', format: formatNumber },
  { key: 'expenses' as const, label: 'Expenses', format: formatCurrency },
  { key: 'demand' as const, label: 'Demand', format: formatNumber },
  { key: 'inventory' as const, label: 'Inventory', format: formatNumber },
  { key: 'cashFlow' as const, label: 'Cash Flow', format: formatCurrency },
];

export function ForecastingView({ data }: { data: BusinessDataPoint[] }) {
  const [selectedMetric, setSelectedMetric] = useState<typeof METRICS[0]['key']>('revenue');
  const result = useMemo(() => forecast(data, selectedMetric, 6), [data, selectedMetric]);
  const monthly = useMemo(() => aggregateByDate(data), [data]);

  const currentMetric = METRICS.find((m) => m.key === selectedMetric)!;
  const fmt = currentMetric.format;

  const trendIcon = result.trendDirection === 'up' ? TrendingUp : result.trendDirection === 'down' ? TrendingDown : Minus;
  const TrendIcon = trendIcon;
  const trendColor = result.trendDirection === 'up' ? 'text-emerald-400' : result.trendDirection === 'down' ? 'text-red-400' : 'text-slate-400';

  const futurePoints = result.points.filter((p) => p.actual === null);
  const lastActual = result.points.filter((p) => p.actual !== null).slice(-1)[0];
  const lastPredicted = futurePoints[futurePoints.length - 1];

  // Bar chart of predicted future values
  const predictedBars = futurePoints.map((p) => ({
    label: p.date.slice(5, 7),
    value: p.predicted,
    color: '#8b5cf6',
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Metric selector */}
      <div className="flex flex-wrap gap-2">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setSelectedMetric(m.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedMetric === m.key
                ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Forecast summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Current {currentMetric.label}</div>
          <div className="text-xl font-bold text-white">{lastActual ? fmt(lastActual.actual!) : '-'}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Predicted (6mo)</div>
          <div className="text-xl font-bold text-violet-400">{lastPredicted ? fmt(lastPredicted.predicted) : '-'}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Trend Direction</div>
          <div className={`flex items-center gap-2 text-xl font-bold ${trendColor}`}>
            <TrendIcon className="w-5 h-5" />
            <span className="capitalize">{result.trendDirection}</span>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Confidence</div>
          <div className="text-xl font-bold text-white">{result.confidence}%</div>
        </div>
      </div>

      {/* Forecast chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-200">{currentMetric.label} Forecast</h3>
          <span className="text-xs text-slate-500">Linear Regression Model · 6-month projection</span>
        </div>
        <ForecastChart data={result.points} color="#8b5cf6" height={280} />
      </div>

      {/* Predicted values bar chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-violet-400" />
          <h3 className="font-semibold text-slate-200">Predicted Future Values</h3>
        </div>
        <BarChart data={predictedBars} formatValue={fmt} height={180} />
      </div>

      {/* Forecast table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="font-semibold text-slate-200 mb-4">Detailed Forecast Data</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-800">
                <th className="pb-2 pr-4 font-medium">Date</th>
                <th className="pb-2 pr-4 font-medium text-right">Actual</th>
                <th className="pb-2 pr-4 font-medium text-right">Predicted</th>
                <th className="pb-2 pr-4 font-medium text-right">Lower Bound</th>
                <th className="pb-2 pr-4 font-medium text-right">Upper Bound</th>
              </tr>
            </thead>
            <tbody>
              {result.points.slice(-12).map((p) => (
                <tr key={p.date} className="border-b border-slate-800/50">
                  <td className="py-2 pr-4 text-slate-300">{p.date.slice(0, 7)}</td>
                  <td className="py-2 pr-4 text-right text-blue-400">{p.actual !== null ? fmt(p.actual) : '-'}</td>
                  <td className="py-2 pr-4 text-right text-violet-400">{fmt(p.predicted)}</td>
                  <td className="py-2 pr-4 text-right text-slate-500">{fmt(p.lowerBound)}</td>
                  <td className="py-2 pr-4 text-right text-slate-500">{fmt(p.upperBound)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
