import { useMemo } from 'react';

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  fillOpacity?: number;
  showDots?: boolean;
  formatValue?: (v: number) => string;
}

export function LineChart({
  data,
  height = 200,
  color = '#3b82f6',
  fillOpacity = 0.1,
  showDots = true,
  formatValue,
}: LineChartProps) {
  const { path, areaPath, points, min, max } = useMemo(() => {
    if (data.length === 0) return { path: '', areaPath: '', points: [], min: 0, max: 0 };
    const w = 600;
    const h = height;
    const pad = 8;
    const vals = data.map((d) => d.value);
    const min = Math.min(...vals, 0);
    const max = Math.max(...vals, 1);
    const range = max - min || 1;
    const stepX = (w - pad * 2) / Math.max(data.length - 1, 1);
    const pts = data.map((d, i) => ({
      x: pad + i * stepX,
      y: h - pad - ((d.value - min) / range) * (h - pad * 2),
    }));
    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const areaPath = `${path} L ${pts[pts.length - 1].x.toFixed(1)} ${h - pad} L ${pts[0].x.toFixed(1)} ${h - pad} Z`;
    return { path, areaPath, points: pts, min, max };
  }, [data, height]);

  if (data.length === 0) return <div className="text-slate-400 text-sm">No data</div>;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 600 ${height}`} className="w-full" style={{ height }}>
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#grad-${color.replace('#', '')})`} />
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {showDots && points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} className="opacity-70" />
        ))}
      </svg>
      <div className="flex justify-between mt-1 text-[10px] text-slate-500">
        {data.map((d, i) => (
          <span key={i} className={i % Math.ceil(data.length / 6) === 0 ? '' : 'hidden'}>
            {d.label}
          </span>
        ))}
      </div>
      {formatValue && (
        <div className="flex justify-between mt-0.5 text-[10px] text-slate-400">
          <span>{formatValue(min)}</span>
          <span>{formatValue(max)}</span>
        </div>
      )}
    </div>
  );
}

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  formatValue?: (v: number) => string;
  horizontal?: boolean;
}

export function BarChart({ data, height = 200, formatValue, horizontal = false }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  if (horizontal) {
    return (
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-slate-400 w-28 truncate text-right">{d.label}</span>
            <div className="flex-1 bg-slate-800/50 rounded-full h-6 relative overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color || '#3b82f6' }}
              >
                {formatValue && (
                  <span className="text-[10px] text-white font-medium">{formatValue(d.value)}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-slate-400">{formatValue ? formatValue(d.value) : d.value}</span>
            <div className="w-full rounded-t-md transition-all duration-500" style={{
              height: `${(d.value / max) * (height - 24)}px`,
              backgroundColor: d.color || '#3b82f6',
              minHeight: 4,
            }} />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-slate-500 truncate">{d.label}</div>
        ))}
      </div>
    </div>
  );
}

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}

export function DonutChart({ data, size = 160, thickness = 24, centerLabel, centerValue }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e293b" strokeWidth={thickness} />
          {data.map((d, i) => {
            const length = (d.value / total) * circumference;
            const dashArray = `${length} ${circumference - length}`;
            const circle = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth={thickness}
                strokeDasharray={dashArray}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            );
            offset += length;
            return circle;
          })}
        </svg>
        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue && <span className="text-xl font-bold text-white">{centerValue}</span>}
            {centerLabel && <span className="text-xs text-slate-400">{centerLabel}</span>}
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="text-slate-300">{d.label}</span>
            <span className="text-slate-500 ml-auto">{((d.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ForecastChartProps {
  data: { date: string; actual: number | null; predicted: number; lowerBound: number; upperBound: number }[];
  height?: number;
  color?: string;
}

export function ForecastChart({ data, height = 240, color = '#8b5cf6' }: ForecastChartProps) {
  const w = 600;
  const h = height;
  const pad = 12;
  const allVals = data.flatMap((d) => [d.actual, d.predicted, d.lowerBound, d.upperBound].filter((v): v is number => v !== null));
  const min = Math.min(...allVals, 0);
  const max = Math.max(...allVals, 1);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / Math.max(data.length - 1, 1);

  const toY = (v: number) => h - pad - ((v - min) / range) * (h - pad * 2);
  const toX = (i: number) => pad + i * stepX;

  const actualPoints = data.filter((d) => d.actual !== null);
  const futurePoints = data.filter((d) => d.actual === null);
  const firstFutureIdx = data.findIndex((d) => d.actual === null);

  const actualPath = actualPoints.map((d, i) => {
    const realIdx = data.indexOf(d);
    return `${i === 0 ? 'M' : 'L'} ${toX(realIdx).toFixed(1)} ${toY(d.actual!).toFixed(1)}`;
  }).join(' ');

  const predictedPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(d.predicted).toFixed(1)}`).join(' ');

  const bandPath = [
    ...data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(d.upperBound).toFixed(1)}`),
    ...data.slice().reverse().map((d, i) => `L ${toX(data.length - 1 - i).toFixed(1)} ${toY(d.lowerBound).toFixed(1)}`),
    'Z',
  ].join(' ');

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
        <defs>
          <linearGradient id="forecast-band" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.15} />
            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <path d={bandPath} fill="url(#forecast-band)" />
        <path d={predictedPath} fill="none" stroke={color} strokeWidth={2} strokeDasharray="6 4" strokeLinejoin="round" />
        <path d={actualPath} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {actualPoints.map((d, i) => {
          const realIdx = data.indexOf(d);
          return <circle key={i} cx={toX(realIdx)} cy={toY(d.actual!)} r={3} fill="#3b82f6" />;
        })}
        {futurePoints.map((d, i) => (
          <circle key={i} cx={toX(firstFutureIdx + i)} cy={toY(d.predicted)} r={3} fill={color} className="opacity-60" />
        ))}
        {firstFutureIdx > 0 && (
          <line
            x1={toX(firstFutureIdx - 1)} y1={pad}
            x2={toX(firstFutureIdx - 1)} y2={h - pad}
            stroke="#475569" strokeWidth={1} strokeDasharray="3 3"
          />
        )}
      </svg>
      <div className="flex justify-between mt-1 text-[10px] text-slate-500">
        {data.filter((_, i) => i % Math.ceil(data.length / 8) === 0).map((d, i) => (
          <span key={i}>{d.date.slice(0, 7)}</span>
        ))}
      </div>
      <div className="flex gap-4 mt-2 text-[10px]">
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="w-3 h-0.5 bg-blue-500" /> Actual
        </span>
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="w-3 h-0.5 border-t-2 border-dashed" style={{ borderColor: color }} /> Predicted
        </span>
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: color, opacity: 0.15 }} /> Confidence Band
        </span>
      </div>
    </div>
  );
}

interface GaugeProps {
  value: number;
  max?: number;
  label?: string;
  size?: number;
}

export function Gauge({ value, max = 100, label, size = 140 }: GaugeProps) {
  const pct = Math.min(1, Math.max(0, value / max));
  const angle = pct * 180;
  const radius = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;

  const arcPath = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(cx, cy, radius, startAngle);
    const end = polarToCartesian(cx, cy, radius, endAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
  };

  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
    const rad = ((angle - 180) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const color = pct >= 0.75 ? '#10b981' : pct >= 0.5 ? '#f59e0b' : pct >= 0.3 ? '#f97316' : '#ef4444';

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size / 2 + 16 }}>
        <svg width={size} height={size / 2 + 16}>
          <path d={arcPath(0, 180)} fill="none" stroke="#1e293b" strokeWidth={12} strokeLinecap="round" />
          <path d={arcPath(0, angle)} fill="none" stroke={color} strokeWidth={12} strokeLinecap="round" className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="text-2xl font-bold text-white">{value}</span>
          {label && <span className="text-[10px] text-slate-400">{label}</span>}
        </div>
      </div>
    </div>
  );
}
