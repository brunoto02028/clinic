"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Trophy, Flame, Star, Target, Lock, CheckCircle, Circle,
  ArrowRight, TrendingUp, TrendingDown, Minus, Sparkles, Award,
  Loader2, ChevronRight, Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RecoveryRing from "@/components/dashboard/recovery-ring";
import { BADGE_REGISTRY, ARCHETYPES, getArchetype, type BadgeDef } from "@/lib/journey";
import { useLocale } from "@/hooks/use-locale";

interface JourneyData {
  progress: any;
  missions: any[];
  badges: string[];
  badgeDetails: any[];
  ring: { exercise: number; consistency: number; wellbeing: number };
  unreadNotifications: number;
  quizResult: any;
}

const AVATAR_STAGES = [
  { stage: 1, emoji: "🪑", descEn: "Seated, recovering", descPt: "Sentado, recuperando" },
  { stage: 2, emoji: "🧍", descEn: "Standing with support", descPt: "Em p\u00e9 com apoio" },
  { stage: 3, emoji: "🚶", descEn: "Walking independently", descPt: "Andando independente" },
  { stage: 4, emoji: "🏃", descEn: "Running strong", descPt: "Correndo forte" },
  { stage: 5, emoji: "🏋️", descEn: "Athletic, peak form", descPt: "Forma f\u00edsica plena" },
];

export default function JourneyPage() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const [data, setData] = useState<JourneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/patient/journey").then((r) => r.json()).catch(() => null),
      fetch("/api/dashboard/evolution").then((r) => r.json()).catch(() => null),
    ]).then(([journeyData, evoData]) => {
      setData(journeyData);
      setPrediction(evoData);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data?.progress) {
    return (
      <div className="text-center py-16">
        <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">{isPt ? "Sua jornada est\u00e1 sendo preparada..." : "Your journey is being prepared..."}</p>
      </div>
    );
  }

  const p = data.progress;
  const xpPercent = p.xpToNextLevel > 0 ? Math.min(100, (p.xpInLevel / p.xpToNextLevel) * 100) : 100;
  const avatarStage = AVATAR_STAGES.find((a) => a.stage === p.avatarStage) || AVATAR_STAGES[0];
  const archetype = p.archetypeKey ? getArchetype(p.archetypeKey) : null;

  // Percentile (rough estimate based on level)
  const percentile = Math.min(99, Math.max(1, 100 - Math.round((p.level / 30) * 85)));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Hero Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-card to-card">
          <div className="h-1.5 bg-gradient-to-r from-violet-500 via-purple-500 to-violet-700" />
          <CardContent className="p-5 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* Avatar */}
              <motion.div
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-violet-500/20 to-violet-500/10 flex items-center justify-center text-4xl sm:text-5xl shadow-lg shadow-violet-500/10"
              >
                {avatarStage.emoji}
              </motion.div>

              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <Badge className="bg-violet-500/15 text-violet-400 border-violet-500/20">
                    <Trophy className="h-3 w-3 mr-1" /> {isPt ? "Nível" : "Level"} {p.level}
                  </Badge>
                  <Badge variant="outline" className="text-amber-400 border-amber-500/20">
                    <Star className="h-3 w-3 mr-1" /> {p.bprCredits} {isPt ? "Cr\u00e9ditos" : "Credits"}
                  </Badge>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">{p.levelTitle}</h1>
                <p className="text-xs text-muted-foreground mt-1">
                  {isPt ? `Voc\u00ea est\u00e1 entre os ${percentile}% pacientes mais consistentes` : `You're among the top ${percentile}% most consistent patients`}
                </p>

                {/* XP Bar */}
                <div className="mt-3 max-w-sm mx-auto sm:mx-0">
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] text-muted-foreground">{isPt ? "Progresso XP" : "XP Progress"}</span>
                    <span className="text-[10px] font-medium text-amber-400">
                      {p.xpInLevel} / {p.xpToNextLevel} XP {isPt ? "para N\u00edvel" : "to Level"} {p.nextLevel?.level || "MAX"}
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${xpPercent}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                    />
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center justify-center sm:justify-start gap-4 mt-3">
                  <div className="flex items-center gap-1">
                    <Flame className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-bold text-foreground">{p.streakDays} {isPt ? "dias seguidos" : "day streak"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-bold text-foreground">{p.totalXpEarned} XP {isPt ? "total" : "total"}</span>
                  </div>
                </div>
              </div>

              {/* Recovery Ring */}
              <div className="hidden md:block">
                <RecoveryRing exercise={data.ring.exercise} consistency={data.ring.consistency} wellbeing={data.ring.wellbeing} />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Archetype Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              🧬 {isPt ? "Seu Perfil de Recuperação" : "Your Recovery Profile"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {archetype ? (
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0" style={{ backgroundColor: archetype.color + "20" }}>
                  {archetype.emoji}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground">{archetype.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{archetype.description}</p>
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">{isPt ? "Recomendações" : "Recommendations"}</p>
                    {archetype.recommendations.map((r, i) => (
                      <p key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        {r}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">{isPt ? "Descubra seu perfil de recuperação em 3 minutos" : "Discover your recovery profile in 3 minutes"}</p>
                <Link href="/dashboard/quiz">
                  <Button className="gap-2">
                    <Sparkles className="h-4 w-4" /> {isPt ? "Descobrir Meu Perfil" : "Discover My Profile"}
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Predictive Simulator */}
      {prediction?.hasData && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                🔮 {isPt ? "Projeção de Recuperação" : "Recovery Projection"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  prediction.trend === "up" ? "bg-emerald-500/15" : prediction.trend === "down" ? "bg-red-500/15" : "bg-amber-500/15"
                }`}>
                  {prediction.trend === "up" ? (
                    <TrendingUp className="h-6 w-6 text-emerald-400" />
                  ) : prediction.trend === "down" ? (
                    <TrendingDown className="h-6 w-6 text-red-400" />
                  ) : (
                    <Minus className="h-6 w-6 text-amber-400" />
                  )}
                </div>
                <div className="flex-1">
                  {prediction.trend === "up" && (
                    <>
                      <p className="text-sm font-medium text-emerald-400">
                        +{prediction.change}% {isPt ? "melhoria desde a última avaliação" : "improvement since last assessment"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isPt ? "Se mantiver esse ritmo, poderá atingir 85% de função em ~6 semanas" : "If you keep this pace, you could reach 85% function in ~6 weeks"}
                      </p>
                    </>
                  )}
                  {prediction.trend === "stagnant" && (
                    <>
                      <p className="text-sm font-medium text-amber-400">
                        ⚠️ {isPt ? "Seu progresso estagnou recentemente" : "Your progress has stalled recently"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isPt ? "Recomendamos tentar uma abordagem diferente. Considere agendar uma sessão." : "We recommend trying a different approach. Consider booking a session."}
                      </p>
                      <Link href="/dashboard/plans">
                        <Button size="sm" variant="outline" className="mt-2 text-xs gap-1 border-amber-500/20 text-amber-400 hover:bg-amber-500/10">
                          {isPt ? "Agendar com 15% OFF" : "Book with 15% OFF"} <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </>
                  )}
                  {prediction.trend === "down" && (
                    <>
                      <p className="text-sm font-medium text-red-400">
                        {prediction.change}% {isPt ? "regressão detectada" : "regression detected"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isPt ? "Não se preocupe — pequenos recuos são normais. Vamos retomar o caminho." : "Don't worry — small setbacks are normal. Let's get you back on track."}
                      </p>
                      <Link href="/dashboard/plans">
                        <Button size="sm" className="mt-2 text-xs gap-1">
                          {isPt ? "Agendar Sessão de Recuperação" : "Schedule Recovery Session"} <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Badges Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-5 w-5 text-amber-500" /> {isPt ? "Conquistas" : "Achievements"}
              <Badge variant="outline" className="ml-auto text-xs">
                {data.badges.length}/{BADGE_REGISTRY.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {BADGE_REGISTRY.map((badge) => {
                const unlocked = data.badges.includes(badge.key);
                return (
                  <div
                    key={badge.key}
                    className={`relative rounded-xl p-3 text-center transition-all ${
                      unlocked
                        ? "bg-card border border-amber-500/20 shadow-sm"
                        : "bg-muted/30 border border-white/5"
                    }`}
                  >
                    {!unlocked && (
                      <div className="absolute inset-0 bg-muted/80 backdrop-blur-[1px] rounded-xl flex items-center justify-center z-10">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="text-2xl mb-1">{badge.emoji}</div>
                    <p className={`text-[11px] font-semibold ${unlocked ? "text-foreground" : "text-muted-foreground"}`}>
                      {badge.label}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {unlocked ? (isPt ? "Desbloqueado ✅" : "Unlocked ✅") : badge.condition}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Weekly Missions */}
      {data.missions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-5 w-5 text-primary" /> {isPt ? "Missões Semanais" : "Weekly Missions"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.missions.map((mission: any) => {
                const tasks = mission.tasks as any[];
                const done = tasks.filter((t) => t.completed).length;
                const total = tasks.length;
                return (
                  <div key={mission.id} className={`p-3 rounded-lg border ${mission.completedAt ? "bg-emerald-500/10 border-emerald-500/20" : "bg-card border-white/10"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {mission.isBonusMission && <Badge className="bg-violet-500/15 text-violet-400 text-[10px]">{isPt ? "Bônus" : "Bonus"}</Badge>}
                        <span className="text-xs text-muted-foreground">{done}/{total} {isPt ? "tarefas" : "tasks"}</span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-400">+{mission.xpReward} XP</span>
                    </div>
                    <div className="space-y-1">
                      {tasks.map((task: any) => (
                        <div key={task.key} className="flex items-center gap-2">
                          {task.completed ? (
                            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <span className={`text-xs ${task.completed ? "text-emerald-400 line-through" : "text-muted-foreground"}`}>
                            {task.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Link href="/dashboard/quiz">
          <Card className="card-hover h-full">
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-1">🧬</div>
              <p className="text-xs font-semibold text-foreground">{isPt ? "Quiz Bio-Check" : "Bio-Check Quiz"}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/community">
          <Card className="card-hover h-full">
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-1">🏆</div>
              <p className="text-xs font-semibold text-foreground">{isPt ? "Comunidade" : "Community"}</p>
            </CardContent>
          </Card>
        </Link>
        <div className="relative cursor-not-allowed">
          <Card className="h-full opacity-50 grayscale pointer-events-none">
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-1">🛒</div>
              <p className="text-xs font-semibold text-foreground">{isPt ? "Loja" : "Marketplace"}</p>
            </CardContent>
          </Card>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {isPt ? "Em Breve" : "Coming Soon"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
