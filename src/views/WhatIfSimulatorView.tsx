import { useState, useMemo } from 'react';
import { Sliders, TrendingUp, AlertTriangle, Package, Zap, RotateCcw } from 'lucide-react';
import type { WarehouseState } from '@/lib/use-warehouse';
import type { WhatIfScenario, WhatIfResult } from '@/lib/warehouse-types';
import { runWhatIfSimulation } from '@/lib/warehouse-ai';

const riskColorMap = {
  none: 'text-emerald-400',
  low: 'text-cyan-400',
  medium: 'text-amber-400',
  high: 'text-orange-400',
  critical: 'text-red-400',
};

const overstockColorMap = {
  none: 'text-emerald-400',
  low: 'text-cyan-400',
  medium: 'text-amber-400',
  high: 'text-violet-400',
};

export function WhatIfSimulatorView({ state }: { state: WarehouseState }) {
  const { products, zones, forecasts } = state;
  const [scenario, setScenario] = useState<WhatIfScenario>({
    demandIncrease: 10,
    supplierDelayDays: 0,
    stockAdjustment: 0,
    tempIncrease: 0,
    demandSpike: false,
  });

  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id ?? '');
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const results = useMemo(
    () => runWhatIfSimulation(scenario, products, zones, forecasts),
    [scenario, products, zones, forecasts]
  );

  const selectedResult = results.find((r) => r.scenario === scenario) && selectedProduct
    ? results[products.indexOf(selectedProduct)]
    : null;

  const presets = [
    { label: 'Demand +10%', scenario: { ...scenario, demandIncrease: 10, demandSpike: false } },
    { label: 'Demand +30%', scenario: { ...scenario, demandIncrease: 30, demandSpike: false } },
    { label: 'Demand Spike', scenario: { ...scenario, demandIncrease: 20, demandSpike: true } },
    { label: 'Supplier Delay 7d', scenario: { ...scenario, supplierDelayDays: 7, demandIncrease: 0, demandSpike: false } },
    { label: 'Temp +5°C', scenario: { ...scenario, tempIncrease: 5, demandIncrease: 0, demandSpike: false } },
    { label: 'Stock -20%', scenario: { ...scenario, stockAdjustment: -50, demandIncrease: 0, demandSpike: false } },
  ];

  const reset = () => setScenario({ demandIncrease: 10, supplierDelayDays: 0, stockAdjustment: 0, tempIncrease: 0, demandSpike: false });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <Sliders className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">What-If Simulation</h2>
            <p className="text-sm text-slate-400">Test scenarios and see projected impact on inventory and risk</p>
          </div>
        </div>
      </div>

      {/* Preset scenarios */}
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-3">Quick Scenarios</h3>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => setScenario(preset.scenario)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 text-slate-400 border border-slate-800 hover:text-cyan-300 hover:border-cyan-500/30 transition-all"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scenario controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-200">Scenario Parameters</h3>
          <button onClick={reset} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition-colors">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs text-slate-400 flex justify-between mb-2">
              <span>Demand Increase</span>
              <span className="text-cyan-400 font-medium">+{scenario.demandIncrease}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={scenario.demandIncrease}
              onChange={(e) => setScenario({ ...scenario, demandIncrease: Number(e.target.value) })}
              className="w-full accent-cyan-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 flex justify-between mb-2">
              <span>Supplier Delay</span>
              <span className="text-cyan-400 font-medium">{scenario.supplierDelayDays} days</span>
            </label>
            <input
              type="range"
              min={0}
              max={30}
              value={scenario.supplierDelayDays}
              onChange={(e) => setScenario({ ...scenario, supplierDelayDays: Number(e.target.value) })}
              className="w-full accent-cyan-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 flex justify-between mb-2">
              <span>Stock Adjustment</span>
              <span className="text-cyan-400 font-medium">{scenario.stockAdjustment > 0 ? '+' : ''}{scenario.stockAdjustment} units</span>
            </label>
            <input
              type="range"
              min={-200}
              max={200}
              value={scenario.stockAdjustment}
              onChange={(e) => setScenario({ ...scenario, stockAdjustment: Number(e.target.value) })}
              className="w-full accent-cyan-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 flex justify-between mb-2">
              <span>Temperature Increase</span>
              <span className="text-cyan-400 font-medium">+{scenario.tempIncrease}°C</span>
            </label>
            <input
              type="range"
              min={0}
              max={15}
              value={scenario.tempIncrease}
              onChange={(e) => setScenario({ ...scenario, tempIncrease: Number(e.target.value) })}
              className="w-full accent-cyan-500"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={scenario.demandSpike}
              onChange={(e) => setScenario({ ...scenario, demandSpike: e.target.checked })}
              className="accent-cyan-500"
            />
            <span className="text-sm text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Sudden demand spike (1.5x multiplier)
            </span>
          </label>
        </div>
      </div>

      {/* Product selector */}
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-3">Select Product to Analyze</h3>
        <div className="flex flex-wrap gap-2">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProductId(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedProductId === p.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {selectedProduct && selectedResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Result cards */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-cyan-400" /> {selectedProduct.name} — Simulation Result
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/30">
                  <div className="text-xs text-slate-400">Projected Stock</div>
                  <div className="text-xl font-bold text-white">{selectedResult.projectedStock}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/30">
                  <div className="text-xs text-slate-400">Expected Demand</div>
                  <div className="text-xl font-bold text-cyan-400">{selectedResult.expectedDemand}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/30">
                  <span className="text-sm text-slate-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-400" /> Shortage Risk
                  </span>
                  <span className={`text-sm font-semibold capitalize ${riskColorMap[selectedResult.shortageRisk]}`}>
                    {selectedResult.shortageRisk}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/30">
                  <span className="text-sm text-slate-400 flex items-center gap-2">
                    <Package className="w-4 h-4 text-violet-400" /> Overstock Risk
                  </span>
                  <span className={`text-sm font-semibold capitalize ${overstockColorMap[selectedResult.overstockRisk]}`}>
                    {selectedResult.overstockRisk}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/30">
                  <span className="text-sm text-slate-400 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-400" /> Expected Shortage
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {selectedResult.expectedShortageDays !== null ? `${selectedResult.expectedShortageDays} days` : 'No shortage'}
                  </span>
                </div>
              </div>

              {selectedResult.affectedZones.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="text-xs text-amber-300 mb-1">Affected Zones (Temperature)</div>
                  <div className="text-sm text-white">{selectedResult.affectedZones.join(', ')}</div>
                </div>
              )}
            </div>
          </div>

          {/* Recommendation */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" /> Recommended Action
            </h3>
            <div className={`p-4 rounded-lg border ${
              selectedResult.shortageRisk === 'critical' ? 'bg-red-500/10 border-red-500/20' :
              selectedResult.shortageRisk === 'high' ? 'bg-orange-500/10 border-orange-500/20' :
              selectedResult.overstockRisk === 'high' ? 'bg-violet-500/10 border-violet-500/20' :
              'bg-emerald-500/10 border-emerald-500/20'
            }`}>
              <p className="text-sm text-white font-medium">{selectedResult.recommendedAction}</p>
            </div>

            {selectedResult.recommendedReorderQty > 0 && (
              <div className="mt-4 p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm text-cyan-300 font-medium">Reorder Recommendation</span>
                </div>
                <div className="text-2xl font-bold text-white">{selectedResult.recommendedReorderQty} units</div>
              </div>
            )}

            {/* All products summary */}
            <div className="mt-6">
              <h4 className="text-xs text-slate-400 mb-2">All Products Impact Summary</h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {products.map((p, i) => {
                  const r = results[i];
                  if (!r) return null;
                  return (
                    <div key={p.id} className="flex items-center justify-between text-xs p-2 rounded bg-slate-800/30">
                      <span className="text-slate-300 truncate">{p.name}</span>
                      <span className={`font-medium capitalize ${riskColorMap[r.shortageRisk]}`}>
                        {r.shortageRisk}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
