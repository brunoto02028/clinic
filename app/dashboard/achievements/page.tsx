"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import { Loader2, Trophy, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Achievement {
  id: string;
  titleEn: string;
  titlePt: string;
  descriptionEn?: string;
  descriptionPt?: string;
  category: string;
  triggerType: string;
  triggerValue?: number;
  xpReward: number;
  iconEmoji: string;
  badgeColor: string;
  condition?: { nameEn: string; namePt: string; iconEmoji?: string };
  isUnlocked: boolean;
  unlockedAt?: string;
}

export default function PatientAchievementsPage() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [totalUnlocked, setTotalUnlocked] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [totalAchievements, setTotalAchievements] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/patient/achievements");
        const data = await res.json();
        setAchievements(data.achievements || []);
        setTotalUnlocked(data.totalUnlocked || 0);
        setTotalXp(data.totalXp || 0);
        setTotalAchievements(data.totalAchievements || 0);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const unlocked = achievements.filter((a) => a.isUnlocked);
  const locked = achievements.filter((a) => !a.isUnlocked);
  const progress = totalAchievements > 0 ? Math.round((totalUnlocked / totalAchievements) * 100) : 0;

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">{isPt ? "Conquistas" : "Achievements"}</h1>
        <p className="text-muted-foreground text-sm">{isPt ? "Desbloqueie conquistas e ganhe XP" : "Unlock achievements and earn XP"}</p>
      </div>

      {/* Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalUnlocked}/{totalAchievements}</p>
                <p className="text-xs text-muted-foreground">{isPt ? "conquistas desbloqueadas" : "achievements unlocked"}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-amber-600">{totalXp} XP</p>
              <p className="text-xs text-muted-foreground">{isPt ? "total ganho" : "total earned"}</p>
            </div>
          </div>
          <Progress value={progress} className="h-2.5" />
          <p className="text-xs text-muted-foreground text-right mt-1">{progress}%</p>
        </CardContent>
      </Card>

      {achievements.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{isPt ? "Nenhuma conquista disponível" : "No achievements available"}</p>
          <p className="text-sm">{isPt ? "Conquistas serão adicionadas em breve." : "Achievements will be added soon."}</p>
        </CardContent></Card>
      ) : (
        <>
          {/* Unlocked */}
          {unlocked.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4" /> {isPt ? `Desbloqueadas (${unlocked.length})` : `Unlocked (${unlocked.length})`}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {unlocked.map((a) => (
                  <Card key={a.id} className="border-green-200 bg-green-50/30 overflow-hidden">
                    <div className="h-1" style={{ backgroundColor: a.badgeColor }} />
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ backgroundColor: a.badgeColor + "20" }}>
                          {a.iconEmoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm">{isPt ? a.titlePt : a.titleEn}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {isPt ? (a.descriptionPt || a.descriptionEn) : (a.descriptionEn || a.descriptionPt)}
                          </p>
                          <div className="flex gap-1.5 mt-1.5">
                            <Badge className="text-[10px] bg-amber-100 text-amber-700">{a.xpReward} XP</Badge>
                            {a.condition && <Badge className="text-[10px] bg-blue-100 text-blue-700">{a.condition.iconEmoji} {isPt ? a.condition.namePt : a.condition.nameEn}</Badge>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Locked */}
          {locked.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
                <Lock className="h-4 w-4" /> {isPt ? `Bloqueadas (${locked.length})` : `Locked (${locked.length})`}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {locked.map((a) => (
                  <Card key={a.id} className="opacity-60 overflow-hidden">
                    <div className="h-1 bg-slate-200" />
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-slate-100 grayscale">
                          {a.iconEmoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm">{isPt ? a.titlePt : a.titleEn}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {isPt ? (a.descriptionPt || a.descriptionEn) : (a.descriptionEn || a.descriptionPt)}
                          </p>
                          <div className="flex gap-1.5 mt-1.5">
                            <Badge variant="outline" className="text-[10px]">{a.xpReward} XP</Badge>
                            {a.condition && <Badge variant="outline" className="text-[10px]">{a.condition.iconEmoji} {isPt ? a.condition.namePt : a.condition.nameEn}</Badge>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
