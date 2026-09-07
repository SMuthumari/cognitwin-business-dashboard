export type StockStatus = 'normal' | 'low' | 'overstock' | 'critical';
export type SensorStatus = 'online' | 'offline' | 'warning' | 'error';
export type SensorType = 'rfid' | 'loadcell' | 'temperature' | 'humidity';
export type ZoneStatus = 'normal' | 'low_stock' | 'overstock' | 'temp_warning' | 'critical';
export type AlertType = 'low_stock' | 'overstock' | 'stockout' | 'temp_abnormal' | 'inventory_mismatch' | 'unusual_movement';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type Priority = 'high' | 'medium' | 'low';

export interface WarehouseProduct {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minStock: number;
  maxStock: number;
  storageZone: string;
  rfidId: string;
  weight: number;
  unitPrice: number;
  status: StockStatus;
}

export interface WarehouseZone {
  id: string;
  name: string;
  temperature: number;
  humidity: number;
  capacity: number;
  usedCapacity: number;
  productCount: number;
  status: ZoneStatus;
}

export interface SensorReading {
  id: string;
  sensorType: SensorType;
  zoneId: string;
  zoneName: string;
  value: number;
  unit: string;
  timestamp: string;
  status: SensorStatus;
  isSimulated: boolean;
}

export interface SensorHistory {
  zoneId: string;
  readings: { time: string; temperature: number; humidity: number; weight: number }[];
}

export interface DemandHistory {
  productId: string;
  productName: string;
  history: { month: string; demand: number }[];
}

export interface DemandForecast {
  productId: string;
  productName: string;
  currentStock: number;
  historicalDemand: number[];
  predictedDemand: number[];
  totalPredictedDemand: number;
  expectedShortageDate: string | null;
  recommendedReorderQty: number;
  confidence: number;
  shortageRisk: 'none' | 'low' | 'medium' | 'high';
}

export interface WarehouseAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  productId?: string;
  productName?: string;
  zoneId?: string;
  zoneName?: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface WarehouseRecommendation {
  id: string;
  priority: Priority;
  category: string;
  problem: string;
  reason: string;
  action: string;
  impact: string;
  productId?: string;
  productName?: string;
}

export interface WhatIfScenario {
  demandIncrease: number;
  supplierDelayDays: number;
  stockAdjustment: number;
  tempIncrease: number;
  demandSpike: boolean;
}

export interface WhatIfResult {
  scenario: WhatIfScenario;
  projectedStock: number;
  shortageRisk: 'none' | 'low' | 'medium' | 'high' | 'critical';
  expectedShortageDays: number | null;
  overstockRisk: 'none' | 'low' | 'medium' | 'high';
  expectedDemand: number;
  recommendedAction: string;
  recommendedReorderQty: number;
  affectedZones: string[];
}

export interface WarehouseMetrics {
  totalProducts: number;
  totalStock: number;
  lowStockItems: number;
  overstockItems: number;
  incomingStock: number;
  predictedDemand: number;
  warehouseHealth: number;
  avgTemperature: number;
  avgHumidity: number;
  activeAlerts: number;
  onlineSensors: number;
  totalSensors: number;
}

export interface StockMovement {
  date: string;
  inbound: number;
  outbound: number;
  net: number;
}
