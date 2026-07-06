'use client';

interface ActivityData {
  steps?: number | null;
  activeCalories?: number | null;
  totalCalories?: number | null;
  activeMinutes?: number | null;
}

export function ActivityCard({ data }: { data: ActivityData | null }) {
  if (!data) return <p className="text-sm text-muted-foreground">No activity data yet</p>;

  const metrics = [
    { label: 'Steps', value: data.steps, format: (v: number) => v.toLocaleString() },
    { label: 'Active Cal', value: data.activeCalories, format: (v: number) => `${Math.round(v)} kcal` },
    { label: 'Active Min', value: data.activeMinutes, format: (v: number) => `${v} min` },
  ].filter(m => m.value != null);

  if (metrics.length === 0) return <p className="text-sm text-muted-foreground">No activity data yet</p>;

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Activity</h3>
      <div className="grid grid-cols-3 gap-4">
        {metrics.map(m => (
          <div key={m.label}>
            <p className="text-xs text-muted-foreground">{m.label}</p>
            <p className="text-xl font-bold text-foreground">{m.format(m.value!)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
