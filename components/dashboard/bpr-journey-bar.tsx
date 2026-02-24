"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Flame, Star, Target, Trophy } from "lucide-react";

interface ProgressData {
  level: number;
  levelTitle: string;
  avatarStage: number;
  totalXpEarned: number;
  xpInLevel: number;
  xpToNextLevel: number;
  streakDays: number;
  bprCredits: number;
  archetypeKey: string | null;
}

export default function BPRJourneyBar() {
  const router = useRouter();
  const [data, setData] = useState<ProgressData | null>(null);
  const [hasMission, setHasMission] = useState(false);

  useEffect(() => {
    fetch("/api/patient/journey")
      .then((r) => r.json())
      .then((d) => {
        if (d.progress) setData(d.progress);
        if (d.missions?.length > 0) {
          const incomplete = d.missions.some((m: any) => !m.completedAt);
          setHasMission(incomplete);
        }
      })
      .catch(() => {});
  }, []);

  if (!data) return null;

  const xpPercent = data.xpToNextLevel > 0 ? Math.min(100, (data.xpInLevel / data.xpToNextLevel) * 100) : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onClick={() => router.push("/dashboard/journey")}
      className="cursor-pointer rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-3 sm:p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Level & Title */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center">
            <Trophy className="h-4.5 w-4.5 text-violet-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-violet-700">Level {data.level}</p>
            <p className="text-[11px] text-slate-500 leading-tight">{data.levelTitle}</p>
          </div>
        </div>

        {/* XP Bar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-slate-400">XP</span>
            <span className="text-[10px] font-medium text-amber-600">
              {data.xpInLevel} / {data.xpToNextLevel}
            </span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpPercent}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <div className="flex items-center gap-1" title="Streak">
            <Flame className="h-4 w-4 text-red-500" />
            <span className="text-xs font-bold text-slate-700">{data.streakDays}d</span>
          </div>
          <div className="flex items-center gap-1" title="BPR Credits">
            <Star className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-bold text-slate-700">{data.bprCredits}</span>
          </div>
          {hasMission && (
            <div className="flex items-center gap-1 animate-pulse" title="Active Mission">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-semibold text-primary">Mission</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
