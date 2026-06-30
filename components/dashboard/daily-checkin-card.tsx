"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Dumbbell, CheckCircle2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/use-locale";

const MOOD_OPTIONS = [
  { value: 1, emoji: "😞", label: "Very bad",   labelPt: "Muito mal" },
  { value: 2, emoji: "😕", label: "Not great",  labelPt: "Não muito bem" },
  { value: 3, emoji: "😐", label: "Okay",       labelPt: "OK" },
  { value: 4, emoji: "🙂", label: "Good",       labelPt: "Bem" },
  { value: 5, emoji: "😄", label: "Great!",     labelPt: "Ótimo!" },
];

const PAIN_COLORS: Record<number, string> = {
  0: "bg-emerald-500", 1: "bg-emerald-400", 2: "bg-green-400",
  3: "bg-yellow-400",  4: "bg-yellow-500",  5: "bg-orange-400",
  6: "bg-orange-500",  7: "bg-red-400",     8: "bg-red-500",
  9: "bg-red-600",    10: "bg-red-700",
};

interface CheckIn {
  painLevel: number;
  moodLevel: number;
  exercisesDone: boolean;
  checkinDate: string;
}

export default function DailyCheckInCard() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";

  const [todayCheckIn, setTodayCheckIn] = useState<CheckIn | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const [painLevel, setPainLevel] = useState(0);
  const [moodLevel, setMoodLevel] = useState(3);
  const [exercisesDone, setExercisesDone] = useState(false);

  const fetchToday = useCallback(async () => {
    try {
      const res = await fetch("/api/patient/daily-checkin");
      const data = await res.json();
      if (data.today) {
        setTodayCheckIn(data.today);
        setPainLevel(data.today.painLevel);
        setMoodLevel(data.today.moodLevel);
        setExercisesDone(data.today.exercisesDone);
        setDone(true);
        setCollapsed(true);
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/patient/daily-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ painLevel, moodLevel, exercisesDone }),
      });
      if (res.ok) {
        const data = await res.json();
        setTodayCheckIn(data.checkIn);
        setDone(true);
        setCollapsed(true);
      }
    } catch {}
    finally { setSaving(false); }
  };

  if (loading) return null;

  const selectedMood = MOOD_OPTIONS.find(m => m.value === moodLevel);

  // Collapsed summary (after check-in done)
  if (done && collapsed) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card
          className="border-emerald-500/20 bg-emerald-500/5 cursor-pointer hover:border-emerald-500/40 transition-colors"
          onClick={() => setCollapsed(false)}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-400">
                    {isPt ? "Check-in feito hoje ✓" : "Today's check-in done ✓"}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {isPt ? "Dor" : "Pain"}: <span className="font-medium text-foreground">{painLevel}/10</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {isPt ? "Humor" : "Mood"}: <span className="text-base leading-none">{selectedMood?.emoji}</span>
                    </span>
                    {exercisesDone && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <Dumbbell className="h-3 w-3" />{isPt ? "Exercícios feitos" : "Exercises done"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-primary/20 bg-card overflow-hidden">
        {/* Header bar */}
        <div className="h-1 bg-gradient-to-r from-primary to-emerald-500" />
        <CardContent className="p-4 sm:p-5 space-y-5">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Heart className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">
                  {isPt ? "Como te sentes hoje?" : "How are you feeling today?"}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {isPt ? "Check-in de 30 segundos" : "30-second check-in"}
                </p>
              </div>
            </div>
            {done && (
              <button onClick={() => setCollapsed(true)} className="text-muted-foreground hover:text-foreground">
                <ChevronUp className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Mood selector */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {isPt ? "Humor" : "Mood"}
            </p>
            <div className="flex justify-between gap-1">
              {MOOD_OPTIONS.map(m => (
                <button
                  key={m.value}
                  onClick={() => setMoodLevel(m.value)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl border-2 transition-all ${
                    moodLevel === m.value
                      ? "border-primary bg-primary/10 scale-105"
                      : "border-border hover:border-border/60 bg-card"
                  }`}
                >
                  <span className="text-xl leading-none">{m.emoji}</span>
                  <span className="text-[10px] text-muted-foreground hidden sm:block">{isPt ? m.labelPt : m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pain scale */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {isPt ? "Nível de dor" : "Pain level"}
              </p>
              <div className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${PAIN_COLORS[painLevel] || "bg-emerald-500"}`}>
                {painLevel}/10 — {painLevel === 0 ? (isPt ? "Sem dor" : "No pain") : painLevel <= 3 ? (isPt ? "Leve" : "Mild") : painLevel <= 6 ? (isPt ? "Moderado" : "Moderate") : (isPt ? "Intenso" : "Severe")}
              </div>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPainLevel(i)}
                  className={`flex-1 h-7 rounded-md text-xs font-semibold transition-all ${
                    painLevel === i
                      ? `${PAIN_COLORS[i]} text-white scale-110 shadow-sm`
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* Exercises done */}
          <button
            onClick={() => setExercisesDone(v => !v)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
              exercisesDone
                ? "border-emerald-500/40 bg-emerald-500/10"
                : "border-border hover:border-border/60 bg-card"
            }`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${exercisesDone ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
              <Dumbbell className="h-4 w-4" />
            </div>
            <p className={`text-sm font-medium ${exercisesDone ? "text-emerald-400" : "text-foreground"}`}>
              {isPt ? "Fiz os meus exercícios hoje" : "I did my exercises today"}
            </p>
            {exercisesDone && (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto" />
            )}
          </button>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full gap-2"
          >
            {saving ? (
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {done
              ? (isPt ? "Actualizar check-in" : "Update check-in")
              : (isPt ? "Guardar check-in (+15 XP)" : "Save check-in (+15 XP)")}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
