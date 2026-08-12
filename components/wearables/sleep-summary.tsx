'use client';

import { useLocale } from '@/hooks/use-locale';

interface SleepData {
  sleepDuration?: number | null;
  sleepEfficiency?: number | null;
  deepMinutes?: number | null;
  remMinutes?: number | null;
  lightMinutes?: number | null;
  awakeMinutes?: number | null;
}

export function SleepSummary({ data }: { data: SleepData | null }) {
  const { locale } = useLocale();
  const isPt = locale === 'pt-BR';

  if (!data) return <p className="text-sm text-muted-foreground">{isPt ? 'Ainda sem dados de sono' : 'No sleep data yet'}</p>;

  const hours = data.sleepDuration ? Math.floor(data.sleepDuration / 60) : 0;
  const mins = data.sleepDuration ? Math.round(data.sleepDuration % 60) : 0;
  const total = (data.deepMinutes || 0) + (data.remMinutes || 0) + (data.lightMinutes || 0) + (data.awakeMinutes || 0);

  const stages = [
    { label: isPt ? 'Profundo' : 'Deep', value: data.deepMinutes, color: 'bg-indigo-600' },
    { label: 'REM', value: data.remMinutes, color: 'bg-purple-500' },
    { label: isPt ? 'Leve' : 'Light', value: data.lightMinutes, color: 'bg-sky-400' },
    { label: isPt ? 'Acordado' : 'Awake', value: data.awakeMinutes, color: 'bg-orange-400' },
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{isPt ? 'Sono' : 'Sleep'}</h3>
      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-3xl font-bold text-foreground">{hours}h {mins}m</span>
        {data.sleepEfficiency != null && (
          <span className="text-sm text-muted-foreground ml-2">{Math.round(data.sleepEfficiency)}% {isPt ? 'de eficiência' : 'efficiency'}</span>
        )}
      </div>
      {total > 0 && (
        <>
          <div className="flex h-3 rounded-full overflow-hidden mb-3">
            {stages.map(s => s.value && s.value > 0 ? (
              <div key={s.label} className={s.color} style={{ width: `${(s.value / total) * 100}%` }} />
            ) : null)}
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            {stages.map(s => s.value ? (
              <div key={s.label} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${s.color}`} />
                {s.label} {Math.round(s.value)}m
              </div>
            ) : null)}
          </div>
        </>
      )}
    </div>
  );
}
