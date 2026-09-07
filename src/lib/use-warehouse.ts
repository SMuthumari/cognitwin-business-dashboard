import { useState, useEffect, useMemo, useRef } from 'react';
import type {
  WarehouseProduct,
  WarehouseZone,
  SensorReading,
  DemandHistory,
  StockMovement,
  DemandForecast,
  WarehouseAlert,
  WarehouseRecommendation,
  WarehouseMetrics,
} from './warehouse-types';
import {
  generateProducts,
  generateZones,
  generateDemandHistory,
  generateStockMovements,
} from './warehouse-data';
import { generateSensorReadings, generateSensorHistory } from './iot-simulation';
import {
  forecastDemand,
  detectRisks,
  generateWarehouseRecommendations,
  computeWarehouseMetrics,
} from './warehouse-ai';

export interface WarehouseState {
  products: WarehouseProduct[];
  zones: WarehouseZone[];
  sensorReadings: SensorReading[];
  sensorHistory: Record<string, { time: string; temperature: number; humidity: number; weight: number }[]>;
  demandHistory: DemandHistory[];
  stockMovements: StockMovement[];
  forecasts: DemandForecast[];
  alerts: WarehouseAlert[];
  recommendations: WarehouseRecommendation[];
  metrics: WarehouseMetrics;
}

export function useWarehouseData(): WarehouseState & { refreshSensors: () => void } {
  const [products] = useState<WarehouseProduct[]>(() => generateProducts());
  const [zones, setZones] = useState<WarehouseZone[]>(() => generateZones(generateProducts()));
  const [sensorReadings, setSensorReadings] = useState<SensorReading[]>([]);
  const [sensorHistory] = useState(() => generateSensorHistory(generateZones(generateProducts())));
  const [demandHistory] = useState<DemandHistory[]>(() => generateDemandHistory(generateProducts()));
  const [stockMovements] = useState<StockMovement[]>(() => generateStockMovements());
  const tickRef = useRef(0);

  // Initial zones from products
  const allProducts = useMemo(() => products, [products]);
  const computedZones = useMemo(() => generateZones(allProducts), [allProducts]);

  useEffect(() => {
    setZones(computedZones);
  }, [computedZones]);

  // Simulate periodic sensor updates (every 5 seconds)
  const refreshSensors = () => {
    tickRef.current++;
    const readings = generateSensorReadings(computedZones, allProducts);
    setSensorReadings(readings);

    // Update zone temps from latest readings
    setZones((prev) =>
      prev.map((z) => {
        const tempReading = readings.find((r) => r.zoneId === z.id && r.sensorType === 'temperature');
        const humReading = readings.find((r) => r.zoneId === z.id && r.sensorType === 'humidity');
        if (tempReading) {
          const temp = tempReading.value;
          const hum = humReading?.value ?? z.humidity;
          let status = z.status;
          if (temp > 30 || temp < 2) status = 'critical';
          else if (temp > 27 || temp < 5) status = 'temp_warning';
          return { ...z, temperature: temp, humidity: hum, status };
        }
        return z;
      })
    );
  };

  useEffect(() => {
    refreshSensors();
    const interval = setInterval(refreshSensors, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const forecasts = useMemo(() => forecastDemand(allProducts, demandHistory), [allProducts, demandHistory]);
  const alerts = useMemo(() => detectRisks(allProducts, computedZones, forecasts), [allProducts, computedZones, forecasts]);
  const recommendations = useMemo(
    () => generateWarehouseRecommendations(allProducts, computedZones, forecasts, alerts),
    [allProducts, computedZones, forecasts, alerts]
  );
  const metrics = useMemo(
    () => computeWarehouseMetrics(allProducts, computedZones, forecasts, alerts, sensorReadings),
    [allProducts, computedZones, forecasts, alerts, sensorReadings]
  );

  return {
    products: allProducts,
    zones: computedZones,
    sensorReadings,
    sensorHistory,
    demandHistory,
    stockMovements,
    forecasts,
    alerts,
    recommendations,
    metrics,
    refreshSensors,
  };
}
