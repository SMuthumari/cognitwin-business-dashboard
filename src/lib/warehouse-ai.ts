import type {
  WarehouseProduct,
  WarehouseZone,
  DemandHistory,
  DemandForecast,
  WarehouseAlert,
  WarehouseRecommendation,
  WhatIfScenario,
  WhatIfResult,
  WarehouseMetrics,
  StockMovement,
} from './warehouse-types';

// AI Processing Module
// ---------------------
// This module is structured so real ML models can be plugged in later.
// Each function has a clear separation:
//   - Data collection: inputs (products, zones, demand history)
//   - Data processing: linear regression, trend analysis
//   - AI analysis: risk detection, forecasting, what-if simulation
//   - Recommendations: action generation
//
// To connect real ML models:
//   1. Replace the forecasting algorithm with an API call to a
//      Python/TF.js model endpoint.
//   2. Replace risk thresholds with model-predicted anomaly scores.
//   3. Keep the same function signatures so views don't change.

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  const xs = Array.from({ length: n }, (_, i) => i);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * values[i], 0);
  const sumXX = xs.reduce((s, x) => s + x * x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// === DEMAND FORECASTING ===
export function forecastDemand(
  products: WarehouseProduct[],
  demandHistory: DemandHistory[]
): DemandForecast[] {
  return products.map((product) => {
    const history = demandHistory.find((h) => h.productId === product.id);
    const histValues = history?.history.map((h) => h.demand) ?? [product.minStock * 1.5];

    const { slope, intercept } = linearRegression(histValues);
    const residuals = histValues.map((v, i) => v - (slope * i + intercept));
    const meanRes = residuals.reduce((a, b) => a + b, 0) / Math.max(residuals.length, 1);
    const stdRes = Math.sqrt(
      residuals.reduce((s, r) => s + (r - meanRes) ** 2, 0) / Math.max(residuals.length - 2, 1)
    );

    const predictedDemand: number[] = [];
    const n = histValues.length;
    for (let i = 0; i < 6; i++) {
      const idx = n + i;
      const predicted = Math.max(0, Math.round(slope * idx + intercept));
      predictedDemand.push(predicted);
    }

    const totalPredictedDemand = predictedDemand.reduce((s, v) => s + v, 0);
    const avgMonthlyDemand = totalPredictedDemand / 6;
    const currentStock = product.quantity;

    // Expected shortage date
    let expectedShortageDate: string | null = null;
    let shortageRisk: DemandForecast['shortageRisk'] = 'none';

    if (avgMonthlyDemand > 0) {
      const monthsUntilShortage = currentStock / avgMonthlyDemand;
      if (monthsUntilShortage < 6) {
        const date = new Date();
        date.setMonth(date.getMonth() + Math.ceil(monthsUntilShortage));
        expectedShortageDate = date.toISOString().slice(0, 10);
      }
      if (monthsUntilShortage < 1) shortageRisk = 'high';
      else if (monthsUntilShortage < 2) shortageRisk = 'medium';
      else if (monthsUntilShortage < 4) shortageRisk = 'low';
    }

    // Recommended reorder quantity
    const safetyStock = product.minStock;
    const recommendedReorderQty = Math.max(0, Math.round(
      Math.max(product.maxStock - currentStock, safetyStock * 2 - currentStock, totalPredictedDemand * 0.3)
    ));

    const confidence = Math.max(50, Math.min(95,
      100 - (stdRes / Math.max(avgMonthlyDemand, 1)) * 50
    ));

    return {
      productId: product.id,
      productName: product.name,
      currentStock,
      historicalDemand: histValues,
      predictedDemand,
      totalPredictedDemand,
      expectedShortageDate,
      recommendedReorderQty,
      confidence: Math.round(confidence),
      shortageRisk,
    };
  });
}

// === RISK DETECTION ===
export function detectRisks(
  products: WarehouseProduct[],
  zones: WarehouseZone[],
  forecasts: DemandForecast[]
): WarehouseAlert[] {
  const alerts: WarehouseAlert[] = [];
  const now = new Date().toISOString();

  for (const product of products) {
    const forecast = forecasts.find((f) => f.productId === product.id);

    // Low stock
    if (product.status === 'critical' || (product.status === 'low')) {
      alerts.push({
        id: `alert-low-${product.id}`,
        type: 'low_stock',
        severity: product.status === 'critical' ? 'critical' : 'high',
        title: 'Low Stock Risk',
        message: `${product.name} has only ${product.quantity} units left (min: ${product.minStock}).`,
        productId: product.id,
        productName: product.name,
        timestamp: now,
        acknowledged: false,
      });
    }

    // Overstock
    if (product.status === 'overstock') {
      alerts.push({
        id: `alert-over-${product.id}`,
        type: 'overstock',
        severity: 'medium',
        title: 'Overstock Risk',
        message: `${product.name} inventory (${product.quantity}) is significantly above predicted demand.`,
        productId: product.id,
        productName: product.name,
        timestamp: now,
        acknowledged: false,
      });
    }

    // Possible stockout
    if (forecast && forecast.shortageRisk === 'high') {
      const days = forecast.expectedShortageDate
        ? Math.ceil((new Date(forecast.expectedShortageDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;
      alerts.push({
        id: `alert-stockout-${product.id}`,
        type: 'stockout',
        severity: 'critical',
        title: 'Possible Stockout',
        message: `${product.name} may run out in ${days} days based on predicted demand.`,
        productId: product.id,
        productName: product.name,
        timestamp: now,
        acknowledged: false,
      });
    }

    // Inventory mismatch (simulated detection)
    if (product.weight > 0 && product.quantity > 0) {
      const expectedWeight = product.quantity * product.weight;
      const mismatchChance = (product.id.charCodeAt(4) + product.id.charCodeAt(5)) % 10;
      if (mismatchChance === 0) {
        alerts.push({
          id: `alert-mismatch-${product.id}`,
          type: 'inventory_mismatch',
          severity: 'medium',
          title: 'Inventory Mismatch',
          message: `${product.name} weight reading differs from expected ${expectedWeight.toFixed(1)}kg. Physical count may be needed.`,
          productId: product.id,
          productName: product.name,
          timestamp: now,
          acknowledged: false,
        });
      }
    }
  }

  // Temperature risks
  for (const zone of zones) {
    if (zone.temperature > 27 || zone.temperature < 2) {
      alerts.push({
        id: `alert-temp-${zone.id}`,
        type: 'temp_abnormal',
        severity: zone.temperature > 30 || zone.temperature < 0 ? 'critical' : 'high',
        title: 'Temperature Risk',
        message: `${zone.name} temperature is ${zone.temperature}°C, outside the safe range.`,
        zoneId: zone.id,
        zoneName: zone.name,
        timestamp: now,
        acknowledged: false,
      });
    }
  }

  // Unusual stock movement (simulated)
  const unusualProduct = products.find((p, i) => i === 7 && p.quantity > p.maxStock * 0.8);
  if (unusualProduct) {
    alerts.push({
      id: `alert-movement-${unusualProduct.id}`,
      type: 'unusual_movement',
      severity: 'low',
      title: 'Unusual Stock Movement',
      message: `${unusualProduct.name} shows unusual outbound movement pattern in the last 24 hours.`,
      productId: unusualProduct.id,
      productName: unusualProduct.name,
      timestamp: now,
      acknowledged: false,
    });
  }

  return alerts.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.severity] - order[b.severity];
  });
}

// === WHAT-IF SIMULATION ===
export function runWhatIfSimulation(
  scenario: WhatIfScenario,
  products: WarehouseProduct[],
  zones: WarehouseZone[],
  forecasts: DemandForecast[]
): WhatIfResult[] {
  return products.map((product) => {
    const forecast = forecasts.find((f) => f.productId === product.id);
    const baseDemand = forecast ? forecast.predictedDemand[0] : product.minStock * 1.5;

    const demandMultiplier = 1 + scenario.demandIncrease / 100;
    const spikeMultiplier = scenario.demandSpike ? 1.5 : 1;
    const expectedDemand = Math.round(baseDemand * demandMultiplier * spikeMultiplier);

    // Supplier delay reduces effective incoming stock
    const effectiveIncoming = Math.max(0, Math.round(product.maxStock * 0.2 - scenario.supplierDelayDays * 5));
    const adjustedStock = Math.max(0, product.quantity + scenario.stockAdjustment + effectiveIncoming);

    const daysOfStock = expectedDemand > 0 ? (adjustedStock / (expectedDemand / 30)) : 999;
    const expectedShortageDays = daysOfStock < 60 ? Math.round(daysOfStock) : null;

    let shortageRisk: WhatIfResult['shortageRisk'] = 'none';
    if (expectedShortageDays !== null) {
      if (expectedShortageDays < 7) shortageRisk = 'critical';
      else if (expectedShortageDays < 14) shortageRisk = 'high';
      else if (expectedShortageDays < 30) shortageRisk = 'medium';
      else shortageRisk = 'low';
    }

    let overstockRisk: WhatIfResult['overstockRisk'] = 'none';
    if (adjustedStock > product.maxStock * 1.2) overstockRisk = 'high';
    else if (adjustedStock > product.maxStock) overstockRisk = 'medium';
    else if (adjustedStock > product.maxStock * 0.9) overstockRisk = 'low';

    const recommendedReorderQty = shortageRisk === 'critical' || shortageRisk === 'high'
      ? Math.max(0, Math.round(product.maxStock - adjustedStock + expectedDemand * 0.5))
      : 0;

    let recommendedAction = 'No action needed. Stock levels are healthy.';
    if (shortageRisk === 'critical') recommendedAction = `URGENT: Reorder ${recommendedReorderQty} units immediately.`;
    else if (shortageRisk === 'high') recommendedAction = `Reorder ${recommendedReorderQty} units within 7 days.`;
    else if (shortageRisk === 'medium') recommendedAction = `Monitor closely. Consider reordering ${recommendedReorderQty} units.`;
    else if (overstockRisk === 'high') recommendedAction = 'Reduce excess inventory. Run promotions or relocate stock.';
    else if (overstockRisk === 'medium') recommendedAction = 'Slow down inbound orders. Current stock is sufficient.';

    // Temperature impact on zone
    const affectedZones: string[] = [];
    const productZone = zones.find((z) => z.id === product.storageZone);
    if (productZone && scenario.tempIncrease > 0) {
      const projectedTemp = productZone.temperature + scenario.tempIncrease;
      if (projectedTemp > 27 || (productZone.id === 'B' && projectedTemp > 8)) {
        affectedZones.push(productZone.name);
      }
    }

    return {
      scenario,
      projectedStock: adjustedStock,
      shortageRisk,
      expectedShortageDays,
      overstockRisk,
      expectedDemand,
      recommendedAction,
      recommendedReorderQty,
      affectedZones,
    };
  });
}

// === RECOMMENDATION ENGINE ===
export function generateWarehouseRecommendations(
  products: WarehouseProduct[],
  zones: WarehouseZone[],
  forecasts: DemandForecast[],
  alerts: WarehouseAlert[]
): WarehouseRecommendation[] {
  const recs: WarehouseRecommendation[] = [];

  for (const product of products) {
    const forecast = forecasts.find((f) => f.productId === product.id);

    // Reorder recommendation
    if (product.status === 'critical' || product.status === 'low') {
      recs.push({
        id: `rec-reorder-${product.id}`,
        priority: product.status === 'critical' ? 'high' : 'medium',
        category: 'Reorder Stock',
        problem: 'Low stock detected.',
        reason: `Current inventory (${product.quantity}) is below minimum level (${product.minStock}). Predicted demand exceeds available stock.`,
        action: `Reorder ${forecast?.recommendedReorderQty ?? product.maxStock - product.quantity} units from supplier.`,
        impact: 'Prevents stockout and ensures continuous availability.',
        productId: product.id,
        productName: product.name,
      });
    }

    // Reduce excess
    if (product.status === 'overstock') {
      recs.push({
        id: `rec-reduce-${product.id}`,
        priority: 'medium',
        category: 'Reduce Excess Inventory',
        problem: 'Overstock detected.',
        reason: `Current inventory (${product.quantity}) significantly exceeds maximum level (${product.maxStock}) and predicted demand.`,
        action: 'Run promotions, bundle deals, or transfer to another zone to clear excess stock.',
        impact: 'Frees up storage space and reduces carrying costs.',
        productId: product.id,
        productName: product.name,
      });
    }
  }

  // Temperature recommendations
  for (const zone of zones) {
    if (zone.temperature > 27 || zone.temperature < 2) {
      recs.push({
        id: `rec-temp-${zone.id}`,
        priority: zone.temperature > 30 || zone.temperature < 0 ? 'high' : 'medium',
        category: 'Check Abnormal Temperature',
        problem: 'Abnormal temperature detected.',
        reason: `${zone.name} temperature is ${zone.temperature}°C, outside safe operating range.`,
        action: 'Inspect HVAC system and verify sensor calibration. Relocate temperature-sensitive products if needed.',
        impact: 'Prevents product damage and ensures compliance with storage requirements.',
      });
    }
  }

  // Prepare for demand increase
  const highDemandProducts = forecasts.filter(
    (f) => f.shortageRisk === 'high' || f.shortageRisk === 'medium'
  );
  for (const f of highDemandProducts.slice(0, 3)) {
    recs.push({
      id: `rec-prepare-${f.productId}`,
      priority: f.shortageRisk === 'high' ? 'high' : 'medium',
      category: 'Prepare for Demand Increase',
      problem: 'Predicted demand increase detected.',
      reason: `Forecast indicates ${f.productName} will face shortage by ${f.expectedShortageDate ?? 'soon'}.`,
      action: `Pre-order ${f.recommendedReorderQty} units and arrange storage capacity.`,
      impact: 'Ensures stock availability during peak demand period.',
      productId: f.productId,
      productName: f.productName,
    });
  }

  // Move products recommendation
  const overstockZone = zones.find((z) => z.status === 'overstock');
  const lowZone = zones.find((z) => z.status === 'normal' && z.usedCapacity < z.capacity * 0.5);
  if (overstockZone && lowZone) {
    recs.push({
      id: `rec-move-${overstockZone.id}-${lowZone.id}`,
      priority: 'low',
      category: 'Move Products to Another Zone',
      problem: 'Zone capacity imbalance detected.',
      reason: `${overstockZone.name} is near capacity while ${lowZone.name} has available space.`,
      action: `Transfer excess inventory from ${overstockZone.name} to ${lowZone.name}.`,
      impact: 'Optimizes warehouse space utilization and improves picking efficiency.',
    });
  }

  return recs.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });
}

// === WAREHOUSE METRICS ===
export function computeWarehouseMetrics(
  products: WarehouseProduct[],
  zones: WarehouseZone[],
  forecasts: DemandForecast[],
  alerts: WarehouseAlert[],
  sensorReadings: { status: string }[]
): WarehouseMetrics {
  const totalStock = products.reduce((s, p) => s + p.quantity, 0);
  const lowStockItems = products.filter((p) => p.status === 'low' || p.status === 'critical').length;
  const overstockItems = products.filter((p) => p.status === 'overstock').length;
  const predictedDemand = forecasts.reduce((s, f) => s + f.totalPredictedDemand, 0);
  const avgTemp = zones.reduce((s, z) => s + z.temperature, 0) / Math.max(zones.length, 1);
  const avgHum = zones.reduce((s, z) => s + z.humidity, 0) / Math.max(zones.length, 1);
  const activeAlerts = alerts.filter((a) => !a.acknowledged).length;
  const onlineSensors = sensorReadings.filter((s) => s.status === 'online').length;

  // Health score calculation
  const stockHealth = Math.min(100, (1 - lowStockItems / Math.max(products.length, 1)) * 100);
  const tempHealth = zones.every((z) => z.temperature >= 5 && z.temperature <= 27) ? 100 : 60;
  const alertHealth = Math.max(0, 100 - activeAlerts * 15);
  const warehouseHealth = Math.round((stockHealth * 0.4 + tempHealth * 0.3 + alertHealth * 0.3));

  return {
    totalProducts: products.length,
    totalStock,
    lowStockItems,
    overstockItems,
    incomingStock: Math.round(totalStock * 0.08),
    predictedDemand,
    warehouseHealth,
    avgTemperature: Math.round(avgTemp * 10) / 10,
    avgHumidity: Math.round(avgHum * 10) / 10,
    activeAlerts,
    onlineSensors,
    totalSensors: sensorReadings.length,
  };
}
