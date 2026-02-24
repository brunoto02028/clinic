"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Trophy, Users, Hand, ArrowRight, Loader2, Clock,
  TrendingUp, Medal, Flame, Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/hooks/use-locale";

interface Post {
  id: string;
  type: string;
  content: string;
  highFives: number;
  anonName: string;
  createdAt: string;
}

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  target: number;
  current: number;
  reward: string;
  endsAt: string;
}

const TYPE_EMOJI: Record<string, string> = {
  badge_unlock: "🏅",
  streak: "🔥",
  level_up: "🎉",
  challenge_contribution: "💪",
  milestone: "⭐",
};

function timeAgo(dateStr: string, isPt: boolean): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return isPt ? `${mins}min atrás` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return isPt ? `${hrs}h atrás` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return isPt ? `${days}d atrás` : `${days}d ago`;
}

export default function CommunityPage() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const [posts, setPosts] = useState<Post[]>([]);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [rank, setRank] = useState(0);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [loading, setLoading] = useState(true);
  const [highFiving, setHighFiving] = useState<string | null>(null);
  const [contributing, setContributing] = useState(false);

  useEffect(() => {
    fetch("/api/patient/journey/community")
      .then((r) => r.json())
      .then((d) => {
        setPosts(d.posts || []);
        setChallenge(d.challenge || null);
        setRank(d.rank || 0);
        setTotalParticipants(d.totalParticipants || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleHighFive = async (postId: string) => {
    setHighFiving(postId);
    try {
      await fetch("/api/patient/journey/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "high_five", postId }),
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, highFives: p.highFives + 1 } : p))
      );
    } catch {}
    setHighFiving(null);
  };

  const handleContribute = async () => {
    if (!challenge) return;
    setContributing(true);
    try {
      const res = await fetch("/api/patient/journey/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "contribute", challengeId: challenge.id, amount: 1 }),
      });
      const data = await res.json();
      if (data.success) {
        setChallenge((prev) => prev ? { ...prev, current: data.newCurrent || prev.current + 1 } : null);
      }
    } catch {}
    setContributing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const challengePercent = challenge ? Math.min(100, (challenge.current / challenge.target) * 100) : 0;
  const challengeTimeLeft = challenge ? (() => {
    const diff = new Date(challenge.endsAt).getTime() - Date.now();
    if (diff <= 0) return isPt ? "Encerrado" : "Ended";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return isPt ? `${days}d ${hours}h restantes` : `${days}d ${hours}h left`;
  })() : "";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" /> BPR Arena
        </h1>
        <p className="text-sm text-slate-500 mt-1">{isPt ? "Celebre vitórias, participe de desafios e mantenha-se motivado" : "Celebrate victories, join challenges, and stay motivated together"}</p>
      </div>

      {/* Weekly Challenge */}
      {challenge && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-white overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 mb-2">
                    <Trophy className="h-3 w-3 mr-1" /> {isPt ? "Desafio Semanal" : "Weekly Challenge"}
                  </Badge>
                  <h3 className="font-bold text-slate-800">{challenge.title}</h3>
                  {challenge.description && (
                    <p className="text-xs text-slate-500 mt-1">{challenge.description}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="h-3 w-3" /> {challengeTimeLeft}
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-slate-500">{challenge.current} / {challenge.target}</span>
                  <span className="text-xs font-bold text-amber-600">{Math.round(challengePercent)}%</span>
                </div>
                <div className="h-3 bg-amber-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${challengePercent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  🎁 {isPt ? "Recompensa" : "Reward"}: <span className="font-medium text-slate-700">{challenge.reward}</span>
                </p>
                <Button
                  size="sm"
                  onClick={handleContribute}
                  disabled={contributing}
                  className="gap-1 bg-amber-500 hover:bg-amber-600 text-xs"
                >
                  {contributing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Target className="h-3 w-3" />}
                  {isPt ? "Contribuir" : "Contribute"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Ranking */}
      {rank > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-violet-200 bg-violet-50/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                <Medal className="h-5 w-5 text-violet-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-700">
                  {isPt ? `Você é #${rank} em consistência esta semana` : `You're #${rank} in consistency this week`}
                </p>
                <p className="text-xs text-slate-400">{isPt ? `De ${totalParticipants} participantes` : `Out of ${totalParticipants} participants`}</p>
              </div>
              <TrendingUp className="h-5 w-5 text-violet-500" />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Victory Wall */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="h-5 w-5 text-orange-500" /> {isPt ? "Mural de Vitórias" : "Victory Wall"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {posts.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">{isPt ? "Nenhuma vitória ainda. Seja o primeiro!" : "No victories yet. Be the first!"}</p>
                <Link href="/dashboard/journey">
                  <Button variant="outline" size="sm" className="mt-3 gap-1 text-xs">
                    {isPt ? "Comece sua jornada" : "Start your journey"} <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((post, i) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="text-xl shrink-0">
                      {TYPE_EMOJI[post.type] || "✨"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700">
                        <span className="font-semibold text-violet-600">{post.anonName || (isPt ? "Anônimo" : "Anonymous")}</span>{" "}
                        {post.content}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(post.createdAt, isPt)}</p>
                    </div>
                    <button
                      onClick={() => handleHighFive(post.id)}
                      disabled={highFiving === post.id}
                      className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50 transition-colors text-xs"
                    >
                      <Hand className="h-3.5 w-3.5 text-amber-500" />
                      <span className="font-medium text-slate-600">{post.highFives}</span>
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
