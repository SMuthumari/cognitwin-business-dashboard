import type { SensorReading, SensorType, SensorStatus, WarehouseZone, WarehouseProduct } from './warehouse-types';

// IoT Simulation Layer
// ---------------------
// This module generates realistic sensor readings that mimic data
// coming from an ESP32 gateway connected to RFID, load cell,
// temperature, and humidity sensors.
//
// To connect real ESP32 hardware later:
//   1. Replace generateSensorReadings() with a fetch() call to your
//      ESP32 HTTP endpoint or a WebSocket subscription.
//   2. Map the real sensor payload to the SensorReading interface.
//   3. Set isSimulated = false for real readings.
//   4. Optionally create a Supabase Edge Function that receives
//      ESP32 POST data and stores it in a sensor_readings table.

let tick = 0;

function noise(base: number, amplitude: number, t: number): number {
  const wave = Math.sin(t / 5) * amplitude * 0.5;
  const random = (Math.random() - 0.5) * amplitude;
  return Math.round((base + wave + random) * 10) / 10;
}

function tempStatus(temp: number, zoneId: string): SensorStatus {
  if (zoneId === 'B') {
    if (temp > 8 || temp < 0) return 'error';
    if (temp > 6 || temp < 1) return 'warning';
  } else {
    if (temp > 30 || temp < 5) return 'error';
    if (temp > 27 || temp < 8) return 'warning';
  }
  return 'online';
}

function humStatus(hum: number): SensorStatus {
  if (hum > 80 || hum < 20) return 'error';
  if (hum > 70 || hum < 30) return 'warning';
  return 'online';
}

export function generateSensorReadings(
  zones: WarehouseZone[],
  products: WarehouseProduct[]
): SensorReading[] {
  tick++;
  const readings: SensorReading[] = [];
  const now = new Date().toISOString();

  for (const zone of zones) {
    const zoneProducts = products.filter((p) => p.storageZone === zone.id);

    // Temperature sensor
    const temp = noise(zone.temperature, 1.5, tick);
    readings.push({
      id: `TEMP-${zone.id}-${tick}`,
      sensorType: 'temperature',
      zoneId: zone.id,
      zoneName: zone.name,
      value: temp,
      unit: '°C',
      timestamp: now,
      status: tempStatus(temp, zone.id),
      isSimulated: true,
    });

    // Humidity sensor
    const hum = noise(zone.humidity, 4, tick + 3);
    readings.push({
      id: `HUM-${zone.id}-${tick}`,
      sensorType: 'humidity',
      zoneId: zone.id,
      zoneName: zone.name,
      value: hum,
      unit: '%RH',
      timestamp: now,
      status: humStatus(hum),
      isSimulated: true,
    });

    // Load cell (total weight in zone)
    const totalWeight = zoneProducts.reduce((s, p) => s + p.quantity * p.weight, 0);
    const weightReading = noise(totalWeight, totalWeight * 0.02 + 1, tick + 7);
    readings.push({
      id: `LOAD-${zone.id}-${tick}`,
      sensorType: 'loadcell',
      zoneId: zone.id,
      zoneName: zone.name,
      value: Math.round(weightReading * 10) / 10,
      unit: 'kg',
      timestamp: now,
      status: 'online',
      isSimulated: true,
    });

    // RFID scan (count of tagged items detected)
    const taggedCount = zoneProducts.reduce((s, p) => s + p.quantity, 0);
    const detected = Math.round(noise(taggedCount, taggedCount * 0.05 + 1, tick + 11));
    readings.push({
      id: `RFID-${zone.id}-${tick}`,
      sensorType: 'rfid',
      zoneId: zone.id,
      zoneName: zone.name,
      value: detected,
      unit: 'items',
      timestamp: now,
      status: 'online',
      isSimulated: true,
    });
  }

  return readings;
}

// Generate time-series history for charts
export function generateSensorHistory(zones: WarehouseZone[]) {
  const history: Record<string, { time: string; temperature: number; humidity: number; weight: number }[]> = {};
  const now = new Date();
  for (const zone of zones) {
    const points: { time: string; temperature: number; humidity: number; weight: number }[] = [];
    for (let i = 23; i >= 0; i--) {
      const t = new Date(now);
      t.setHours(t.getHours() - i);
      const temp = noise(zone.temperature, 2, i);
      const hum = noise(zone.humidity, 5, i + 3);
      const weight = noise(zone.usedCapacity * 0.5, 20, i + 7);
      points.push({
        time: t.toTimeString().slice(0, 5),
        temperature: temp,
        humidity: hum,
        weight: Math.round(weight),
      });
    }
    history[zone.id] = points;
  }
  return history;
}
