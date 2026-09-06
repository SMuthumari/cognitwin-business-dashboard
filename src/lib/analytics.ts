import type {
  BusinessDataPoint,
  ForecastPoint,
  ForecastResult,
  KpiSummary,
  Recommendation,
  Risk,
  RiskLevel,
  WhatIfInputs,
  WhatIfResult,
} from './types';

export function aggregateByDate(data: BusinessDataPoint[]): BusinessDataPoint[] {
  const map = new Map<string, BusinessDataPoint>();
  for (const d of data) {
    const existing = map.get(d.date);
    if (existing) {
      existing.sales += d.sales;
      existing.revenue += d.revenue;
      existing.expenses += d.expenses;
      existing.inventory += d.inventory;
      existing.demand += d.demand;
      existing.production += d.production;
      existing.cashFlow += d.cashFlow;
    } else {
      map.set(d.date, { ...d });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function aggregateByProduct(data: BusinessDataPoint[]) {
  const map = new Map<string, BusinessDataPoint>();
  for (const d of data) {
    const existing = map.get(d.product);
    if (existing) {
      existing.sales += d.sales;
      existing.revenue += d.revenue;
      existing.expenses += d.expenses;
      existing.inventory += d.inventory;
      existing.demand += d.demand;
      existing.production += d.production;
      existing.cashFlow += d.cashFlow;
    } else {
      map.set(d.product, { ...d });
    }
  }
  return Array.from(map.values());
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

export function computeKPIs(data: BusinessDataPoint[]): KpiSummary {
  const monthly = aggregateByDate(data);
  if (monthly.length === 0) {
    return {
      totalRevenue: 0, totalExpenses: 0, totalProfit: 0, avgInventory: 0,
      totalCashFlow: 0, healthScore: 0, riskLevel: 'Low',
      revenueChange: 0, profitChange: 0, inventoryChange: 0, cashFlowChange: 0,
    };
  }

  const current = monthly[monthly.length - 1];
  const previous = monthly.length > 1 ? monthly[monthly.length - 2] : current;

  const totalRevenue = monthly.reduce((s, d) => s + d.revenue, 0);
  const totalExpenses = monthly.reduce((s, d) => s + d.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const avgInventory = monthly.reduce((s, d) => s + d.inventory, 0) / monthly.length;
  const totalCashFlow = monthly.reduce((s, d) => s + d.cashFlow, 0);

  const profitMargin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;
  const cashFlowRatio = totalRevenue > 0 ? totalCashFlow / totalRevenue : 0;
  const inventoryHealth = current.inventory > current.demand ? 1 : current.inventory / Math.max(current.demand, 1);

  const healthScore = Math.round(
    Math.min(100, Math.max(0,
      profitMargin * 40 + cashFlowRatio * 30 + inventoryHealth * 20 + 10
    ))
  );

  const riskLevel: RiskLevel =
    healthScore >= 75 ? 'Low' :
    healthScore >= 50 ? 'Moderate' :
    healthScore >= 30 ? 'High' : 'Critical';

  return {
    totalRevenue,
    totalExpenses,
    totalProfit,
    avgInventory,
    totalCashFlow,
    healthScore,
    riskLevel,
    revenueChange: pctChange(current.revenue, previous.revenue),
    profitChange: pctChange(current.revenue - current.expenses, previous.revenue - previous.expenses),
    inventoryChange: pctChange(current.inventory, previous.inventory),
    cashFlowChange: pctChange(current.cashFlow, previous.cashFlow),
  };
}

// Simple linear regression for forecasting
function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  const xs = Array.from({ length: n }, (_, i) => i);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * values[i], 0);
  const sumXX = xs.reduce((s, x) => s + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export function forecast(
  data: BusinessDataPoint[],
  metric: keyof BusinessDataPoint,
  periodsAhead = 6
): ForecastResult {
  const monthly = aggregateByDate(data);
  const values = monthly.map((d) => d[metric] as number);
  const { slope, intercept } = linearRegression(values);

  // Calculate residual std for confidence bounds
  const residuals = values.map((v, i) => v - (slope * i + intercept));
  const meanResidual = residuals.reduce((a, b) => a + b, 0) / residuals.length;
  const stdResidual = Math.sqrt(
    residuals.reduce((s, r) => s + (r - meanResidual) ** 2, 0) / Math.max(residuals.length - 2, 1)
  );

  const points: ForecastPoint[] = [];
  const n = values.length;

  // Historical actuals
  for (let i = 0; i < n; i++) {
    points.push({
      date: monthly[i].date,
      actual: values[i],
      predicted: Math.round(slope * i + intercept),
      lowerBound: Math.round(slope * i + intercept - stdResidual),
      upperBound: Math.round(slope * i + intercept + stdResidual),
    });
  }

  // Future predictions
  const lastDate = new Date(monthly[n - 1].date);
  for (let i = 0; i < periodsAhead; i++) {
    const futureDate = new Date(lastDate.getFullYear(), lastDate.getMonth() + i + 1, 15);
    const idx = n + i;
    const predicted = Math.max(0, slope * idx + intercept);
    const widening = stdResidual * (1 + i * 0.15);
    points.push({
      date: futureDate.toISOString().slice(0, 10),
      actual: null,
      predicted: Math.round(predicted),
      lowerBound: Math.round(Math.max(0, predicted - widening)),
      upperBound: Math.round(predicted + widening),
    });
  }

  const lastActual = values[n - 1];
  const lastPredicted = slope * (n - 1 + periodsAhead) + intercept;
  const predictedChange = pctChange(lastPredicted, lastActual);
  const trendDirection = predictedChange > 5 ? 'up' : predictedChange < -5 ? 'down' : 'stable';
  const confidence = Math.max(50, Math.min(95, 100 - stdResidual / Math.max(lastActual, 1) * 100));

  return {
    points,
    metric: metric as string,
    confidence: Math.round(confidence),
    trendDirection,
    predictedChange,
  };
}

export function analyzeRisks(data: BusinessDataPoint[]): Risk[] {
  const monthly = aggregateByDate(data);
  if (monthly.length < 2) return [];

  const current = monthly[monthly.length - 1];
  const previous = monthly[monthly.length - 2];
  const risks: Risk[] = [];

  // Inventory risk
  const inventoryRatio = current.demand > 0 ? current.inventory / current.demand : 999;
  if (inventoryRatio < 0.5) {
    risks.push({
      id: 'inv-low',
      type: 'inventory',
      level: inventoryRatio < 0.25 ? 'Critical' : 'High',
      title: 'Low Inventory Alert',
      description: `Current inventory covers only ${(inventoryRatio * 100).toFixed(0)}% of demand. Stock may run out soon.`,
      metric: 'Inventory / Demand Ratio',
      value: inventoryRatio,
      threshold: 0.5,
      trend: 'down',
    });
  } else if (inventoryRatio > 3) {
    risks.push({
      id: 'inv-high',
      type: 'inventory',
      level: 'Moderate',
      title: 'Excess Inventory',
      description: `Inventory is ${(inventoryRatio).toFixed(1)}x demand. Capital is tied up in unsold stock.`,
      metric: 'Inventory / Demand Ratio',
      value: inventoryRatio,
      threshold: 3,
      trend: 'up',
    });
  }

  // Expense risk
  const expenseRatio = current.revenue > 0 ? current.expenses / current.revenue : 1;
  if (expenseRatio > 0.75) {
    risks.push({
      id: 'exp-high',
      type: 'expense',
      level: expenseRatio > 0.9 ? 'Critical' : 'High',
      title: 'High Expense Ratio',
      description: `Expenses are ${(expenseRatio * 100).toFixed(0)}% of revenue. Profit margins are under pressure.`,
      metric: 'Expense / Revenue Ratio',
      value: expenseRatio,
      threshold: 0.75,
      trend: expenseRatio > (previous.expenses / Math.max(previous.revenue, 1)) ? 'up' : 'stable',
    });
  }

  // Cash flow risk
  if (current.cashFlow < 0) {
    risks.push({
      id: 'cf-neg',
      type: 'cashflow',
      level: 'Critical',
      title: 'Negative Cash Flow',
      description: `Cash flow is negative (${current.cashFlow.toFixed(0)}). Business is burning cash.`,
      metric: 'Cash Flow',
      value: current.cashFlow,
      threshold: 0,
      trend: 'down',
    });
  } else if (current.cashFlow < previous.cashFlow * 0.5) {
    risks.push({
      id: 'cf-decline',
      type: 'cashflow',
      level: 'High',
      title: 'Declining Cash Flow',
      description: `Cash flow dropped ${pctChange(current.cashFlow, previous.cashFlow).toFixed(0)}% from last period.`,
      metric: 'Cash Flow Change',
      value: pctChange(current.cashFlow, previous.cashFlow),
      threshold: -50,
      trend: 'down',
    });
  }

  // Sales risk
  const salesChange = pctChange(current.sales, previous.sales);
  if (salesChange < -15) {
    risks.push({
      id: 'sales-decline',
      type: 'sales',
      level: salesChange < -30 ? 'Critical' : 'High',
      title: 'Falling Sales',
      description: `Sales dropped ${Math.abs(salesChange).toFixed(0)}% compared to last period.`,
      metric: 'Sales Change',
      value: salesChange,
      threshold: -15,
      trend: 'down',
    });
  } else if (salesChange < -5) {
    risks.push({
      id: 'sales-slow',
      type: 'sales',
      level: 'Moderate',
      title: 'Slowing Sales',
      description: `Sales declined ${Math.abs(salesChange).toFixed(0)}% from last period. Monitor closely.`,
      metric: 'Sales Change',
      value: salesChange,
      threshold: -5,
      trend: 'down',
    });
  }

  return risks;
}

export function runWhatIf(data: BusinessDataPoint[], inputs: WhatIfInputs): WhatIfResult {
  const monthly = aggregateByDate(data);
  const current = monthly[monthly.length - 1];

  const demandMultiplier = 1 + inputs.demandChange / 100;
  const expenseMultiplier = 1 + inputs.expenseChange / 100;
  const priceMultiplier = 1 + inputs.priceChange / 100;

  const projectedDemand = Math.round(current.demand * demandMultiplier);
  const projectedRevenue = Math.round(current.revenue * demandMultiplier * priceMultiplier);
  const projectedExpenses = Math.round(current.expenses * expenseMultiplier * demandMultiplier);
  const projectedProfit = projectedRevenue - projectedExpenses;
  const projectedInventory = Math.max(0, Math.round(current.inventory - projectedDemand + current.production));

  const profitMargin = projectedRevenue > 0 ? projectedProfit / projectedRevenue : 0;
  const riskLevel: RiskLevel =
    profitMargin < 0 ? 'Critical' :
    profitMargin < 0.1 ? 'High' :
    profitMargin < 0.25 ? 'Moderate' : 'Low';

  const currentProfit = current.revenue - current.expenses;

  return {
    projectedRevenue,
    projectedExpenses,
    projectedProfit,
    projectedInventory,
    projectedDemand,
    projectedRiskLevel: riskLevel,
    profitDelta: projectedProfit - currentProfit,
  };
}

export function generateRecommendations(data: BusinessDataPoint[], risks: Risk[]): Recommendation[] {
  const recs: Recommendation[] = [];
  const monthly = aggregateByDate(data);
  const current = monthly[monthly.length - 1] ?? { revenue: 0, expenses: 0, inventory: 0, demand: 0, sales: 0, cashFlow: 0 } as BusinessDataPoint;

  for (const risk of risks) {
    switch (risk.type) {
      case 'inventory':
        if (risk.id === 'inv-low') {
          recs.push({
            id: `rec-${risk.id}`,
            priority: risk.level === 'Critical' ? 'high' : 'medium',
            category: 'Inventory',
            title: 'Increase Inventory Supply',
            description: 'Current inventory is insufficient to meet projected demand. Stockouts may occur.',
            action: 'Place purchase orders with suppliers to increase inventory by at least 50% of current demand gap.',
            impact: 'Prevents lost sales and maintains customer satisfaction.',
          });
        } else {
          recs.push({
            id: `rec-${risk.id}`,
            priority: 'medium',
            category: 'Inventory',
            title: 'Reduce Excess Inventory',
            description: 'Capital is tied up in excess stock that may not sell quickly.',
            action: 'Run promotions or bundle deals to clear excess inventory and free up working capital.',
            impact: 'Improves cash flow and reduces storage costs.',
          });
        }
        break;
      case 'expense':
        recs.push({
          id: `rec-${risk.id}`,
          priority: risk.level === 'Critical' ? 'high' : 'medium',
          category: 'Expenses',
          title: 'Optimize Cost Structure',
          description: 'Expense ratio is too high relative to revenue, threatening profitability.',
          action: 'Review top expense categories and identify 10-15% cost reduction opportunities. Negotiate supplier terms or reduce non-essential spending.',
          impact: 'Improves profit margins and cash reserves.',
        });
        break;
      case 'cashflow':
        recs.push({
          id: `rec-${risk.id}`,
          priority: 'high',
          category: 'Cash Flow',
          title: 'Improve Cash Flow Management',
          description: 'Cash flow is declining or negative, which may impact operations.',
          action: 'Expedite receivables collection, delay non-critical payables, and consider a short-term credit line.',
          impact: 'Ensures operational continuity and prevents liquidity crisis.',
        });
        break;
      case 'sales':
        recs.push({
          id: `rec-${risk.id}`,
          priority: risk.level === 'Critical' ? 'high' : 'medium',
          category: 'Sales',
          title: 'Boost Sales Performance',
          description: 'Sales are declining, which affects revenue and profitability.',
          action: 'Launch targeted marketing campaigns, offer customer incentives, and review pricing strategy.',
          impact: 'Reverses sales decline and stabilizes revenue.',
        });
        break;
    }
  }

  // Always add a positive recommendation if no critical risks
  if (risks.filter((r) => r.level === 'Critical').length === 0) {
    const profitMargin = current.revenue > 0 ? (current.revenue - current.expenses) / current.revenue : 0;
    if (profitMargin > 0.2) {
      recs.push({
        id: 'rec-growth',
        priority: 'low',
        category: 'Growth',
        title: 'Invest in Growth Opportunities',
        description: 'Business is healthy with strong profit margins. Consider reinvesting surplus for growth.',
        action: 'Allocate 15-20% of profits to marketing, product development, or market expansion.',
        impact: 'Accelerates business growth and market share.',
      });
    }
  }

  // Inventory optimization suggestion
  const invRatio = current.demand > 0 ? current.inventory / current.demand : 0;
  if (invRatio > 1 && invRatio < 3 && !risks.find((r) => r.type === 'inventory')) {
    recs.push({
      id: 'rec-inv-opt',
      priority: 'low',
      category: 'Operations',
      title: 'Optimize Inventory Turnover',
      description: 'Inventory levels are adequate but could be optimized for better efficiency.',
      action: 'Implement just-in-time inventory practices for top-selling products.',
      impact: 'Reduces carrying costs while maintaining service levels.',
    });
  }

  return recs.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });
}
