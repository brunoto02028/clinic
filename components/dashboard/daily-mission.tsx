"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, CheckCircle, Circle, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";

interface Task {
  key: string;
  label: string;
  completed: boolean;
  xp: number;
}

interface Mission {
  id: string;
  tasks: Task[];
  completedAt: string | null;
  xpReward: number;
  isBonusMission: boolean;
}

export default function DailyMission() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/patient/journey")
      .then((r) => r.json())
      .then((d) => {
        if (d.missions) setMissions(d.missions);
      })
      .catch(() => {});
  }, []);

  if (missions.length === 0) return null;

  const activeMission = missions.find((m) => !m.completedAt);
  if (!activeMission) return null;

  const tasks = activeMission.tasks as Task[];
  const completedCount = tasks.filter((t) => t.completed).length;
  const totalXp = activeMission.xpReward;

  const handleComplete = async (taskKey: string) => {
    setCompleting(taskKey);
    try {
      const res = await fetch("/api/patient/journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete_mission_task",
          missionId: activeMission.id,
          taskKey,
        }),
      });
      if (res.ok) {
        setMissions((prev) =>
          prev.map((m) => {
            if (m.id !== activeMission.id) return m;
            return {
              ...m,
              tasks: (m.tasks as Task[]).map((t) =>
                t.key === taskKey ? { ...t, completed: true } : t
              ),
            };
          })
        );
      }
    } catch {}
    setCompleting(null);
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-teal-50/50 to-white overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary to-emerald-500" />
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-slate-800 text-sm">{T("mission.todaysMission")}</h3>
          </div>
          <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            <Sparkles className="h-3 w-3" />
            <span className="text-[11px] font-bold">+{totalXp} XP</span>
          </div>
        </div>

        <div className="space-y-2">
          <AnimatePresence>
            {tasks.map((task) => (
              <motion.div
                key={task.key}
                layout
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  task.completed ? "bg-emerald-50" : "bg-white hover:bg-slate-50"
                }`}
              >
                <button
                  onClick={() => !task.completed && handleComplete(task.key)}
                  disabled={!!completing || task.completed}
                  className="shrink-0"
                >
                  {task.completed ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500 }}>
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                    </motion.div>
                  ) : completing === task.key ? (
                    <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-300 hover:text-primary transition-colors" />
                  )}
                </button>
                <span className={`text-sm flex-1 ${task.completed ? "text-emerald-700 line-through" : "text-slate-700"}`}>
                  {task.label}
                </span>
                <span className="text-[10px] font-medium text-slate-400">+{task.xp} XP</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
          <span className="text-[11px] text-slate-400">
            {completedCount}/{tasks.length} {T("mission.completed")}
          </span>
          <Link href="/dashboard/journey">
            <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/80 gap-1 h-7 px-2">
              {T("mission.viewAll")} <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
