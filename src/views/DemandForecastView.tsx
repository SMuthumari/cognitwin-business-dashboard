import { useMemo, useState } from 'react';
import { TrendingUp, AlertTriangle, Calendar, Package, Brain } from 'lucide-react';
import type { WarehouseState } from '@/lib/use-warehouse';
import type { DemandForecast } from '@/lib/warehouse-types';
import { ForecastChart } from '@/components/Charts';

const riskConfig = {
  none: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'No Risk' },
  low: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', label: 'Low Risk' },
  medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Medium Risk' },
  high: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'High Risk' },
};

export function DemandForecastView({ state }: { state: WarehouseState }) {
  const { forecasts, demandHistory, products } = state;
  const [selectedProductId, setSelectedProductId] = useState<string>(forecasts[0]?.productId ?? '');

  const selectedForecast = forecasts.find((f) => f.productId === selectedProductId);
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const chartData = useMemo(() => {
    if (!selectedForecast) return [];
    const hist = selectedForecast.historicalDemand.map((v, i) => {
      const date = demandHistory.find((h) => h.productId === selectedProductId)?.history[i]?.month ?? `M-${i}`;
      return { date, actual: v, predicted: v, lowerBound: v, upperBound: v };
    });
    const lastHistDate = hist.length > 0 ? hist[hist.length - 1].date : '';
    const pred = selectedForecast.predictedDemand.map((v, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() + i + 1);
      const widening = v * 0.1 * (i + 1);
      return {
        date: d.toISOString().slice(0, 7),
        actual: null,
        predicted: v,
        lowerBound: Math.max(0, Math.round(v - widening)),
        upperBound: Math.round(v + widening),
      };
    });
    return [...hist, ...pred];
  }, [selectedForecast, demandHistory, selectedProductId]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-600 flex items-center justify-center">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">AI Demand Forecasting</h2>
            <p className="text-sm text-slate-400">Demo forecasting algorithm using linear regression on historical data</p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
        <Brain className="w-4 h-4 flex-shrink-0" />
        <span>Demonstration forecasting — uses linear regression, not a trained ML model. Predictions are estimates based on historical trends.</span>
      </div>

      {/* Product selector */}
      <div className="flex flex-wrap gap-2">
        {forecasts.map((f) => (
          <button
            key={f.productId}
            onClick={() => setSelectedProductId(f.productId)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedProductId === f.productId
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {f.productName}
          </button>
        ))}
      </div>

      {selectedForecast && selectedProduct && (
        <>
          {/* Key metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <Package className="w-5 h-5 text-cyan-400 mb-2" />
              <div className="text-2xl font-bold text-white">{selectedForecast.currentStock}</div>
              <div className="text-[11px] text-slate-400">Current Stock</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <TrendingUp className="w-5 h-5 text-blue-400 mb-2" />
              <div className="text-2xl font-bold text-white">{selectedForecast.totalPredictedDemand}</div>
              <div className="text-[11px] text-slate-400">Predicted Demand (6mo)</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <Calendar className="w-5 h-5 text-amber-400 mb-2" />
              <div className="text-2xl font-bold text-white">
                {selectedForecast.expectedShortageDate
                  ? new Date(selectedForecast.expectedShortageDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : 'No shortage'}
              </div>
              <div className="text-[11px] text-slate-400">Expected Shortage Date</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-orange-400 mb-2" />
              <div className="text-2xl font-bold text-white">{selectedForecast.recommendedReorderQty}</div>
              <div className="text-[11px] text-slate-400">Recommended Reorder Qty</div>
            </div>
          </div>

          {/* Risk badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${riskConfig[selectedForecast.shortageRisk].bg} ${riskConfig[selectedForecast.shortageRisk].border} ${riskConfig[selectedForecast.shortageRisk].color} text-sm`}>
            <AlertTriangle className="w-4 h-4" />
            Shortage Risk: {riskConfig[selectedForecast.shortageRisk].label} · Confidence: {selectedForecast.confidence}%
          </div>

          {/* Forecast chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">
              {selectedProduct.name} — Demand Forecast
            </h3>
            <ForecastChart data={chartData} height={280} color="#06b6d4" />
          </div>

          {/* Recommendation card */}
          {selectedForecast.shortageRisk !== 'none' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">Shortage Prediction</h4>
                  <p className="text-sm text-slate-400">
                    Based on historical demand trends, <span className="text-white font-medium">{selectedProduct.name}</span> is projected to face a shortage
                    {selectedForecast.expectedShortageDate && (
                      <> around <span className="text-amber-300">{new Date(selectedForecast.expectedShortageDate).toLocaleDateString()}</span></>
                    )}.
                  </p>
                  <div className="mt-3 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    <span className="text-cyan-300 text-sm font-medium">Recommendation: Reorder {selectedForecast.recommendedReorderQty} units</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* All products forecast summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">All Products — Forecast Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-800">
                    <th className="px-4 py-2 font-medium">Product</th>
                    <th className="px-4 py-2 font-medium text-right">Stock</th>
                    <th className="px-4 py-2 font-medium text-right">Predicted (6mo)</th>
                    <th className="px-4 py-2 font-medium text-center">Shortage Risk</th>
                    <th className="px-4 py-2 font-medium text-right">Reorder Qty</th>
                    <th className="px-4 py-2 font-medium text-center">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {forecasts.map((f: DemandForecast) => {
                    const cfg = riskConfig[f.shortageRisk];
                    return (
                      <tr
                        key={f.productId}
                        onClick={() => setSelectedProductId(f.productId)}
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-2.5 text-slate-200">{f.productName}</td>
                        <td className="px-4 py-2.5 text-right text-white">{f.currentStock}</td>
                        <td className="px-4 py-2.5 text-right text-cyan-400">{f.totalPredictedDemand}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-amber-400">{f.recommendedReorderQty}</td>
                        <td className="px-4 py-2.5 text-center text-slate-400">{f.confidence}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
