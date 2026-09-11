"use client";

// Student's Challenges view (personal-trainer product, activity 29). Join
// challenges, see progress against target, streaks, and a leaderboard.
import { useEffect, useState, useCallback } from "react";
import { Trophy, Loader2, Flame, Medal, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/use-locale";
import BadgesStrip from "@/components/challenges/badges-strip";

interface ChallengeItem {
  id: string;
  title: string;
  description: string | null;
  metric: "WORKOUT_COUNT" | "MEAL_LOG_DAYS";
  target: number;
  startsAt: string;
  endsAt: string;
  joined: boolean;
  progress: number;
  pct: number;
}
interface LeaderboardEntry {
  studentId: string;
  displayName: string;
  progress: number;
  target: number;
  pct: number;
  completed: boolean;
}

const fmtDate = (s: string, isPt: boolean) => new Date(s).toLocaleDateString(isPt ? "pt-BR" : "en-GB", { day: "2-digit", month: "short" });

export default function StudentChallenges() {
  const { locale } = useLocale();
  const isPt = !!locale?.startsWith("pt");
  const t = (en: string, pt: string) => (isPt ? pt : en);
  const metricLabel = (m: string) =>
    m === "WORKOUT_COUNT" ? t("Workouts logged", "Treinos registrados") : t("Days with a meal logged", "Dias com refeição registrada");

  const [items, setItems] = useState<ChallengeItem[]>([]);
  const [streaks, setStreaks] = useState({ workout: 0, meal: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<ChallengeItem | null>(null);
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [boardLoading, setBoardLoading] = useState(false);
  const [badges, setBadges] = useState<any[]>([]);

  const load = useCallback(async () => {
    setError("");
    try {
      const [r, rb] = await Promise.all([fetch("/api/challenges"), fetch("/api/badges")]);
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      setItems(d.challenges || []);
      setStreaks(d.streaks || { workout: 0, meal: 0 });
      if (rb.ok) setBadges((await rb.json()).badges || []);
    } catch {
      setError(t("Could not load challenges.", "Não foi possível carregar os desafios."));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPt]);

  useEffect(() => { load(); }, [load]);

  async function join(id: string) {
    setBusy(id);
    try {
      const r = await fetch(`/api/challenges/${id}/join`, { method: "POST" });
      if (!r.ok) throw new Error(String(r.status));
      await load();
    } catch {
      setError(t("Could not join.", "Não foi possível entrar."));
    } finally {
      setBusy(null);
    }
  }

  async function openBoard(c: ChallengeItem) {
    setOpen(c); setBoard([]); setBoardLoading(true);
    try {
      const r = await fetch(`/api/challenges/${c.id}`);
      if (r.ok) setBoard((await r.json()).leaderboard || []);
    } finally {
      setBoardLoading(false);
    }
  }

  if (loading) return <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {t("Loading…", "Carregando…")}</div>;

  if (open) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <button onClick={() => setOpen(null)} className="flex items-center gap-1 text-xs text-primary hover:underline"><ChevronLeft className="h-3 w-3" /> {t("Back", "Voltar")}</button>
        <h1 className="text-lg font-bold flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> {open.title}</h1>
        <p className="text-sm text-muted-foreground">{metricLabel(open.metric)} · {t("target", "meta")} {open.target} · {fmtDate(open.startsAt, isPt)}–{fmtDate(open.endsAt, isPt)}</p>
        {boardLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> …</div>
        ) : (
          <div className="space-y-1.5">
            {board.map((e, i) => (
              <div key={e.studentId} className="flex items-center gap-3 rounded-md border p-2.5">
                <span className="w-6 text-center text-sm font-bold text-muted-foreground">{i + 1}</span>
                <span className="flex-1 text-sm font-medium">{e.displayName} {e.completed && <Medal className="inline h-3.5 w-3.5 text-amber-500" />}</span>
                <div className="w-28"><div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${Math.round(e.pct * 100)}%` }} /></div></div>
                <span className="w-12 text-right text-xs text-muted-foreground">{e.progress}/{e.target}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">{t("Challenges", "Desafios")}</h1>
      </div>

      {/* Streaks */}
      <div className="flex gap-2">
        <div className="flex-1 rounded-md border p-3 flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          <div><p className="text-lg font-bold leading-none">{streaks.workout}</p><p className="text-[11px] text-muted-foreground">{t("workout day streak", "dias de treino seguidos")}</p></div>
        </div>
        <div className="flex-1 rounded-md border p-3 flex items-center gap-2">
          <Flame className="h-5 w-5 text-emerald-500" />
          <div><p className="text-lg font-bold leading-none">{streaks.meal}</p><p className="text-[11px] text-muted-foreground">{t("meal log streak", "dias de refeição seguidos")}</p></div>
        </div>
      </div>

      {/* Achievements */}
      {badges.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">{t("Achievements", "Conquistas")}</p>
          <BadgesStrip badges={badges} isPt={isPt} />
        </div>
      )}

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
          {t("No challenges right now. Your trainer will set these up.", "Nenhum desafio no momento. Seu personal vai criar.")}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <div key={c.id} className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => openBoard(c)} className="text-left flex-1">
                  <p className="text-sm font-medium">{c.title}</p>
                  <p className="text-[11px] text-muted-foreground">{metricLabel(c.metric)} · {t("target", "meta")} {c.target} · {t("ends", "termina")} {fmtDate(c.endsAt, isPt)}</p>
                </button>
                {!c.joined && (
                  <Button size="sm" disabled={busy === c.id} onClick={() => join(c.id)} className="shrink-0 gap-1.5">
                    {busy === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trophy className="h-3.5 w-3.5" />} {t("Join", "Entrar")}
                  </Button>
                )}
              </div>
              {c.joined && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${Math.round(c.pct * 100)}%` }} /></div>
                  <span className="text-xs text-muted-foreground">{c.progress}/{c.target}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
