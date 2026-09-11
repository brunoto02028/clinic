"use client";

// Presentational badge strip (activity 30). Earned badges are highlighted;
// not-yet-earned ones are faded with a small progress bar. Used by the student
// portal and the trainer's student detail page.
interface EarnedBadge {
  key: string;
  emoji: string;
  label: string;
  labelPt: string;
  description: string;
  descriptionPt: string;
  earned: boolean;
  progress: number;
  value: number;
  threshold: number;
}

export default function BadgesStrip({ badges, isPt }: { badges: EarnedBadge[]; isPt: boolean }) {
  if (!badges || badges.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2" data-testid="badges-strip">
      {badges.map((b) => {
        const label = isPt ? b.labelPt : b.label;
        const desc = isPt ? b.descriptionPt : b.description;
        return (
          <div
            key={b.key}
            title={`${desc} — ${b.value}/${b.threshold}`}
            className={`flex flex-col items-center gap-1 rounded-lg border p-2 w-[84px] ${b.earned ? "border-amber-300 bg-amber-50/60" : "border-border opacity-50"}`}
            data-testid={`badge-${b.key}`}
            data-earned={b.earned}
          >
            <span className={`text-2xl ${b.earned ? "" : "grayscale"}`}>{b.emoji}</span>
            <span className="text-[10px] font-medium text-center leading-tight">{label}</span>
            {!b.earned && (
              <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-amber-400" style={{ width: `${Math.round(b.progress * 100)}%` }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
