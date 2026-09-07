import type {
  WarehouseProduct,
  WarehouseZone,
  DemandHistory,
  StockMovement,
  StockStatus,
  ZoneStatus,
} from './warehouse-types';

// Deterministic PRNG for stable demo data
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rand = seeded(1234);

function calcStockStatus(qty: number, min: number, max: number): StockStatus {
  if (qty <= min * 0.5) return 'critical';
  if (qty <= min) return 'low';
  if (qty >= max * 1.1) return 'overstock';
  return 'normal';
}

function calcZoneStatus(
  products: WarehouseProduct[],
  temp: number,
  capacity: number,
  used: number
): ZoneStatus {
  const hasLowStock = products.some((p) => p.status === 'low' || p.status === 'critical');
  const hasOverstock = products.some((p) => p.status === 'overstock');
  const overCapacity = used / capacity > 0.9;
  if (temp > 30 || temp < 2) return 'critical';
  if (temp > 26 || temp < 5) return hasLowStock ? 'critical' : 'temp_warning';
  if (hasLowStock) return 'low_stock';
  if (hasOverstock || overCapacity) return 'overstock';
  return 'normal';
}

const ZONE_DEFS = [
  { id: 'A', name: 'Zone A — Electronics', baseTemp: 22, baseHumidity: 45, capacity: 500 },
  { id: 'B', name: 'Zone B — Perishables', baseTemp: 4, baseHumidity: 65, capacity: 300 },
  { id: 'C', name: 'Zone C — Apparel', baseTemp: 20, baseHumidity: 50, capacity: 400 },
  { id: 'D', name: 'Zone D — Heavy Goods', baseTemp: 24, baseHumidity: 40, capacity: 600 },
  { id: 'E', name: 'Zone E — Fragile Items', baseTemp: 21, baseHumidity: 48, capacity: 250 },
];

const PRODUCT_DEFS = [
  { name: 'Wireless Sensor Module', category: 'Electronics', zone: 'A', basePrice: 45, weight: 0.3, baseQty: 180, min: 50, max: 300 },
  { name: 'ESP32 DevKit Board', category: 'Electronics', zone: 'A', basePrice: 12, weight: 0.05, baseQty: 35, min: 60, max: 400 },
  { name: 'RFID Tag Pack (100)', category: 'Electronics', zone: 'A', basePrice: 30, weight: 0.2, baseQty: 220, min: 40, max: 250 },
  { name: 'Organic Almonds 1kg', category: 'Perishables', zone: 'B', basePrice: 18, weight: 1.0, baseQty: 45, min: 60, max: 200 },
  { name: 'Fresh Coffee Beans 5kg', category: 'Perishables', zone: 'B', basePrice: 55, weight: 5.0, baseQty: 15, min: 30, max: 150 },
  { name: 'Cold Brew Concentrate', category: 'Perishables', zone: 'B', basePrice: 22, weight: 2.0, baseQty: 8, min: 25, max: 100 },
  { name: 'Cotton T-Shirt', category: 'Apparel', zone: 'C', basePrice: 15, weight: 0.2, baseQty: 320, min: 80, max: 400 },
  { name: 'Denim Jacket', category: 'Apparel', zone: 'C', basePrice: 65, weight: 0.8, baseQty: 450, min: 60, max: 350 },
  { name: 'Wool Sweater', category: 'Apparel', zone: 'C', basePrice: 48, weight: 0.5, baseQty: 95, min: 50, max: 200 },
  { name: 'Steel Pipe Bundle', category: 'Heavy Goods', zone: 'D', basePrice: 120, weight: 25.0, baseQty: 680, min: 100, max: 500 },
  { name: 'Concrete Bag 40kg', category: 'Heavy Goods', zone: 'D', basePrice: 8, weight: 40.0, baseQty: 550, min: 80, max: 400 },
  { name: 'Industrial Cable 50m', category: 'Heavy Goods', zone: 'D', basePrice: 75, weight: 8.0, baseQty: 42, min: 30, max: 150 },
  { name: 'Glass Vase Set', category: 'Fragile', zone: 'E', basePrice: 35, weight: 1.5, baseQty: 28, min: 40, max: 120 },
  { name: 'Ceramic Plate Pack', category: 'Fragile', zone: 'E', basePrice: 28, weight: 3.0, baseQty: 15, min: 35, max: 100 },
  { name: 'Crystal Decanter', category: 'Fragile', zone: 'E', basePrice: 95, weight: 1.2, baseQty: 110, min: 20, max: 80 },
];

export function generateProducts(): WarehouseProduct[] {
  const products: WarehouseProduct[] = [];
  for (let i = 0; i < PRODUCT_DEFS.length; i++) {
    const def = PRODUCT_DEFS[i];
    const variance = 0.6 + rand() * 0.8;
    const quantity = Math.round(def.baseQty * variance);
    const minStock = def.min;
    const maxStock = def.max;
    products.push({
      id: `PRD-${String(i + 1).padStart(4, '0')}`,
      name: def.name,
      category: def.category,
      quantity,
      minStock,
      maxStock,
      storageZone: def.zone,
      rfidId: `RFID-${String(Math.floor(rand() * 900000) + 100000)}`,
      weight: def.weight,
      unitPrice: def.basePrice,
      status: calcStockStatus(quantity, minStock, maxStock),
    });
  }
  return products;
}

export function generateZones(products: WarehouseProduct[]): WarehouseZone[] {
  return ZONE_DEFS.map((z) => {
    const zoneProducts = products.filter((p) => p.storageZone === z.id);
    const tempVariance = (rand() - 0.5) * 4;
    const humVariance = (rand() - 0.5) * 8;
    const temperature = Math.round((z.baseTemp + tempVariance) * 10) / 10;
    const humidity = Math.round((z.baseHumidity + humVariance) * 10) / 10;
    const usedCapacity = zoneProducts.reduce((s, p) => s + p.quantity, 0);
    const productCount = zoneProducts.length;
    const status: ZoneStatus = calcZoneStatus(zoneProducts, temperature, z.capacity, usedCapacity);
    return {
      id: z.id,
      name: z.name,
      temperature,
      humidity,
      capacity: z.capacity,
      usedCapacity,
      productCount,
      status,
    };
  });
}

export function generateDemandHistory(products: WarehouseProduct[]): DemandHistory[] {
  const today = new Date();
  return products.map((p, idx) => {
    const history: { month: string; demand: number }[] = [];
    for (let m = 11; m >= 0; m--) {
      const d = new Date(today.getFullYear(), today.getMonth() - m, 1);
      const seasonal = 1 + 0.25 * Math.sin((d.getMonth() / 12) * 2 * Math.PI);
      const trend = 1 + (12 - m) * 0.02;
      const noise = 0.8 + rand() * 0.4;
      const baseDemand = p.minStock * 1.5;
      const demand = Math.round(baseDemand * seasonal * trend * noise * (1 + idx * 0.03));
      history.push({ month: d.toISOString().slice(0, 7), demand });
    }
    return {
      productId: p.id,
      productName: p.name,
      history,
    };
  });
}

export function generateStockMovements(): StockMovement[] {
  const movements: StockMovement[] = [];
  const today = new Date();
  for (let d = 13; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    const inbound = Math.round(200 + rand() * 300);
    const outbound = Math.round(150 + rand() * 350);
    movements.push({
      date: date.toISOString().slice(0, 10),
      inbound,
      outbound,
      net: inbound - outbound,
    });
  }
  return movements;
}
