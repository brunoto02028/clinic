'use client';

interface RecoveryData {
  hrv?: number | null;
  restingHr?: number | null;
  spo2?: number | null;
  bodyTemperature?: number | null;
}

export function RecoveryCard({ data }: { data: RecoveryData | null }) {
  if (!data) return <p className="text-sm text-muted-foreground">No recovery data yet</p>;

  const metrics = [
    { label: 'HRV', value: data.hrv, unit: 'ms', good: (v: number) => v > 40 },
    { label: 'Resting HR', value: data.restingHr, unit: 'bpm', good: (v: number) => v < 65 },
    { label: 'SpO2', value: data.spo2, unit: '%', good: (v: number) => v > 95 },
    { label: 'Temp', value: data.bodyTemperature, unit: '°C', good: () => true },
  ].filter(m => m.value != null);

  if (metrics.length === 0) return <p className="text-sm text-muted-foreground">No recovery data yet</p>;

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Recovery</h3>
      <div className="grid grid-cols-2 gap-4">
        {metrics.map(m => (
          <div key={m.label}>
            <p className="text-xs text-muted-foreground">{m.label}</p>
            <p className={`text-xl font-bold ${m.good(m.value!) ? 'text-emerald-400' : 'text-amber-400'}`}>
              {typeof m.value === 'number' ? (Number.isInteger(m.value) ? m.value : m.value.toFixed(1)) : m.value}
              <span className="text-xs font-normal text-muted-foreground ml-1">{m.unit}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
