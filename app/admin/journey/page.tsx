"use client";

import { useState, useEffect } from "react";
import {
  Trophy, Users, Flame, Star, Target, Award, ShoppingCart,
  Loader2, Plus, Trash2, Edit2, Play, Bell, BarChart3,
  TrendingUp, Zap, MessageSquare, Package, RefreshCw,
  CheckCircle, XCircle, Clock, ChevronDown, Brain,
  AlertTriangle, Shield, ShieldAlert, Send, Sparkles, Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BADGE_REGISTRY, ARCHETYPES } from "@/lib/journey";

type Tab = "overview" | "challenges" | "products" | "notifications" | "players" | "ai-coach";

export default function AdminJourneyPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [recentBadges, setRecentBadges] = useState<any[]>([]);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<any>(null);

  // Forms
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [challengeForm, setChallengeForm] = useState({ title: "", description: "", target: "500", reward: "", rewardCredits: "0", startsAt: "", endsAt: "" });
  const [productForm, setProductForm] = useState({ name: "", description: "", category: "digital_program", price: "0", imageUrl: "", targetArchetypes: [] as string[], creditsCost: "0", isActive: true });
  const [triggerLoading, setTriggerLoading] = useState<string | null>(null);

  // AI Coach state
  const [coachPatients, setCoachPatients] = useState<any[]>([]);
  const [coachSummary, setCoachSummary] = useState<any>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState<string | null>(null);
  const [campaignResult, setCampaignResult] = useState<any>(null);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/journey");
      const data = await res.json();
      setStats(data.stats);
      setTopPlayers(data.topPlayers || []);
      setRecentBadges(data.recentBadges || []);
      setRecentPosts(data.recentPosts || []);
      setActiveChallenge(data.activeChallenge);
    } catch {}
    setLoading(false);
  };

  const fetchChallenges = async () => {
    const res = await fetch("/api/admin/journey/challenges");
    const data = await res.json();
    setChallenges(data.challenges || []);
  };

  const fetchProducts = async () => {
    const res = await fetch("/api/admin/journey/products");
    const data = await res.json();
    setProducts(data.products || []);
  };

  const fetchCoachData = async () => {
    setCoachLoading(true);
    try {
      const res = await fetch("/api/admin/journey/ai-coach");
      const data = await res.json();
      setCoachPatients(data.patients || []);
      setCoachSummary(data.summary || null);
    } catch {}
    setCoachLoading(false);
  };

  const analyzePatient = async (patient: any) => {
    setAiAnalyzing(patient.patientId);
    setAiAnalysis(null);
    try {
      const res = await fetch("/api/admin/journey/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze_patient", patientData: patient }),
      });
      const data = await res.json();
      setAiAnalysis({ patientId: patient.patientId, ...data.result });
      setExpandedPatient(patient.patientId);
    } catch {}
    setAiAnalyzing(null);
  };

  const suggestCampaigns = async () => {
    setCampaignLoading(true);
    setCampaignResult(null);
    try {
      const atRisk = coachPatients.filter((p: any) => p.retention.risk !== "low");
      const res = await fetch("/api/admin/journey/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "suggest_campaign", patients: atRisk }),
      });
      const data = await res.json();
      setCampaignResult(data.result);
    } catch {}
    setCampaignLoading(false);
  };

  useEffect(() => {
    if (tab === "challenges") fetchChallenges();
    if (tab === "products") fetchProducts();
    if (tab === "ai-coach" && coachPatients.length === 0) fetchCoachData();
  }, [tab]);

  const handleTrigger = async (type: string) => {
    setTriggerLoading(type);
    try {
      const res = await fetch("/api/notifications/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      alert(`Trigger "${type}" completed: ${data.count || 0} actions`);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
    setTriggerLoading(null);
  };

  const handleCreateChallenge = async () => {
    try {
      await fetch("/api/admin/journey/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(challengeForm),
      });
      setShowChallengeForm(false);
      setChallengeForm({ title: "", description: "", target: "500", reward: "", rewardCredits: "0", startsAt: "", endsAt: "" });
      fetchChallenges();
    } catch {}
  };

  const handleDeleteChallenge = async (id: string) => {
    if (!confirm("Delete this challenge?")) return;
    await fetch("/api/admin/journey/challenges", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchChallenges();
  };

  const handleCreateProduct = async () => {
    try {
      await fetch("/api/admin/journey/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productForm),
      });
      setShowProductForm(false);
      setProductForm({ name: "", description: "", category: "digital_program", price: "0", imageUrl: "", targetArchetypes: [], creditsCost: "0", isActive: true });
      fetchProducts();
    } catch {}
  };

  const handleToggleProduct = async (id: string, isActive: boolean) => {
    await fetch("/api/admin/journey/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    fetchProducts();
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await fetch("/api/admin/journey/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchProducts();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "challenges", label: "Challenges", icon: Trophy },
    { key: "products", label: "Marketplace", icon: ShoppingCart },
    { key: "notifications", label: "Triggers", icon: Bell },
    { key: "players", label: "Leaderboard", icon: Users },
    { key: "ai-coach", label: "AI Coach", icon: Brain },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" /> BPR Journey Control Centre
          </h1>
          <p className="text-sm text-slate-500">Manage gamification, challenges, marketplace, and patient engagement</p>
        </div>
        <Button variant="outline" onClick={fetchDashboard} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ─── OVERVIEW TAB ─── */}
      {tab === "overview" && stats && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Active Players", value: stats.totalPlayers, icon: Users, color: "text-blue-600 bg-blue-100" },
              { label: "Avg Level", value: stats.avgLevel, icon: TrendingUp, color: "text-violet-600 bg-violet-100" },
              { label: "Avg Streak", value: `${stats.avgStreak}d`, icon: Flame, color: "text-red-600 bg-red-100" },
              { label: "Avg XP", value: stats.avgXp.toLocaleString(), icon: Zap, color: "text-amber-600 bg-amber-100" },
              { label: "Total Badges", value: stats.totalBadges, icon: Award, color: "text-emerald-600 bg-emerald-100" },
              { label: "Mission Rate", value: `${stats.missionCompletionRate}%`, icon: Target, color: "text-primary bg-primary/10" },
              { label: "Community Posts", value: stats.totalCommunityPosts, icon: MessageSquare, color: "text-pink-600 bg-pink-100" },
              { label: "High Fives", value: stats.totalHighFives, icon: Star, color: "text-amber-600 bg-amber-100" },
            ].map((stat, i) => (
              <Card key={i}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                    <p className="text-xs text-slate-500">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Active Challenge */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="h-5 w-5 text-amber-500" /> Active Challenge
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeChallenge ? (
                  <div>
                    <h3 className="font-bold text-slate-800">{activeChallenge.title}</h3>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${Math.min(100, (activeChallenge.current / activeChallenge.target) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600">
                        {activeChallenge.current}/{activeChallenge.target}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Reward: {activeChallenge.reward}</p>
                    <p className="text-xs text-slate-400">Ends: {new Date(activeChallenge.endsAt).toLocaleDateString()}</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No active challenge. Create one in the Challenges tab.</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Badges */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="h-5 w-5 text-emerald-500" /> Recent Badges
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentBadges.length === 0 ? (
                  <p className="text-sm text-slate-400">No badges unlocked yet</p>
                ) : (
                  <div className="space-y-2">
                    {recentBadges.slice(0, 5).map((b: any) => {
                      const def = BADGE_REGISTRY.find((bd) => bd.key === b.badgeKey);
                      return (
                        <div key={b.id} className="flex items-center gap-2 text-sm">
                          <span>{def?.emoji || "🏅"}</span>
                          <span className="font-medium text-slate-700">{b.patient?.firstName} {b.patient?.lastName}</span>
                          <span className="text-slate-400">—</span>
                          <span className="text-slate-500">{def?.label || b.badgeKey}</span>
                          <span className="text-[10px] text-slate-400 ml-auto">{new Date(b.unlockedAt).toLocaleDateString()}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Players */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5 text-blue-500" /> Top Players
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topPlayers.length === 0 ? (
                <p className="text-sm text-slate-400">No players yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 border-b">
                        <th className="pb-2 pr-3">#</th>
                        <th className="pb-2 pr-3">Patient</th>
                        <th className="pb-2 pr-3">Level</th>
                        <th className="pb-2 pr-3">XP</th>
                        <th className="pb-2 pr-3">Streak</th>
                        <th className="pb-2 pr-3">Credits</th>
                        <th className="pb-2">Archetype</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topPlayers.map((p: any, i: number) => {
                        const archetype = ARCHETYPES.find((a) => a.key === p.archetypeKey);
                        return (
                          <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="py-2 pr-3 font-bold text-slate-400">{i + 1}</td>
                            <td className="py-2 pr-3 font-medium text-slate-800">{p.patient?.firstName} {p.patient?.lastName}</td>
                            <td className="py-2 pr-3">
                              <Badge variant="outline" className="text-violet-600">{p.level}</Badge>
                            </td>
                            <td className="py-2 pr-3 text-amber-600 font-medium">{p.totalXpEarned.toLocaleString()}</td>
                            <td className="py-2 pr-3">
                              <span className="flex items-center gap-1">
                                <Flame className="h-3 w-3 text-red-500" /> {p.streakDays}d
                              </span>
                            </td>
                            <td className="py-2 pr-3 text-emerald-600">{p.bprCredits}</td>
                            <td className="py-2">
                              {archetype ? (
                                <span className="text-xs">{archetype.emoji} {archetype.name}</span>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── CHALLENGES TAB ─── */}
      {tab === "challenges" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-slate-800">Weekly Challenges</h2>
            <Button onClick={() => setShowChallengeForm(true)} className="gap-1" size="sm">
              <Plus className="h-4 w-4" /> New Challenge
            </Button>
          </div>

          {showChallengeForm && (
            <Card className="border-primary/30">
              <CardContent className="p-4 space-y-3">
                <Input placeholder="Challenge Title" value={challengeForm.title} onChange={(e) => setChallengeForm({ ...challengeForm, title: e.target.value })} />
                <Textarea placeholder="Description (optional)" value={challengeForm.description} onChange={(e) => setChallengeForm({ ...challengeForm, description: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Target (e.g. 500)" type="number" value={challengeForm.target} onChange={(e) => setChallengeForm({ ...challengeForm, target: e.target.value })} />
                  <Input placeholder="Reward (e.g. 10% OFF)" value={challengeForm.reward} onChange={(e) => setChallengeForm({ ...challengeForm, reward: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">Starts At</label>
                    <Input type="datetime-local" value={challengeForm.startsAt} onChange={(e) => setChallengeForm({ ...challengeForm, startsAt: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Ends At</label>
                    <Input type="datetime-local" value={challengeForm.endsAt} onChange={(e) => setChallengeForm({ ...challengeForm, endsAt: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateChallenge} size="sm">Create</Button>
                  <Button variant="ghost" onClick={() => setShowChallengeForm(false)} size="sm">Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {challenges.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-slate-400">No challenges yet</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {challenges.map((c: any) => (
                <Card key={c.id} className={c.isActive ? "border-amber-200" : "opacity-60"}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-slate-800">{c.title}</h3>
                          {c.isActive ? (
                            <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">Inactive</Badge>
                          )}
                          {c.completedAt && <Badge className="bg-amber-100 text-amber-700 text-[10px]">Completed</Badge>}
                        </div>
                        <p className="text-xs text-slate-500">{c.description}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, (c.current / c.target) * 100)}%` }} />
                          </div>
                          <span className="text-xs text-slate-600">{c.current}/{c.target}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(c.startsAt).toLocaleDateString()} — {new Date(c.endsAt).toLocaleDateString()} | Reward: {c.reward}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteChallenge(c.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── PRODUCTS TAB ─── */}
      {tab === "products" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-slate-800">Marketplace Products</h2>
            <Button onClick={() => setShowProductForm(true)} className="gap-1" size="sm">
              <Plus className="h-4 w-4" /> New Product
            </Button>
          </div>

          {showProductForm && (
            <Card className="border-primary/30">
              <CardContent className="p-4 space-y-3">
                <Input placeholder="Product Name" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
                <Textarea placeholder="Description" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Select value={productForm.category} onValueChange={(v) => setProductForm({ ...productForm, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="digital_program">Digital Program</SelectItem>
                      <SelectItem value="physical_product">Physical Product</SelectItem>
                      <SelectItem value="special_session">Special Session</SelectItem>
                      <SelectItem value="subscription">Subscription</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Price (£)" type="number" step="0.01" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} />
                </div>
                <Input placeholder="Image URL (optional)" value={productForm.imageUrl} onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Credits Cost" type="number" value={productForm.creditsCost} onChange={(e) => setProductForm({ ...productForm, creditsCost: e.target.value })} />
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Target Archetypes</p>
                    <div className="flex flex-wrap gap-1">
                      {ARCHETYPES.map((a) => (
                        <button
                          key={a.key}
                          onClick={() => {
                            const arr = productForm.targetArchetypes.includes(a.key)
                              ? productForm.targetArchetypes.filter((k) => k !== a.key)
                              : [...productForm.targetArchetypes, a.key];
                            setProductForm({ ...productForm, targetArchetypes: arr });
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] border ${
                            productForm.targetArchetypes.includes(a.key) ? "bg-violet-100 border-violet-300 text-violet-700" : "bg-white border-slate-200 text-slate-500"
                          }`}
                        >
                          {a.emoji} {a.key}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateProduct} size="sm">Create</Button>
                  <Button variant="ghost" onClick={() => setShowProductForm(false)} size="sm">Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {products.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-slate-400">No products yet</CardContent></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p: any) => (
                <Card key={p.id} className={!p.isActive ? "opacity-50" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge variant="outline" className="text-[10px]">{p.category}</Badge>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleProduct(p.id, p.isActive)}>
                          {p.isActive ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-slate-400" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => handleDeleteProduct(p.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">{p.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">{p.description}</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-lg font-bold text-primary">£{p.price.toFixed(2)}</span>
                      {p.creditsCost > 0 && <span className="text-[10px] text-emerald-600">or {p.creditsCost} credits</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── NOTIFICATIONS / TRIGGERS TAB ─── */}
      {tab === "notifications" && (
        <div className="space-y-4">
          <h2 className="font-bold text-slate-800">Automated Triggers</h2>
          <p className="text-sm text-slate-500">Run these manually or set up cron jobs to run them automatically.</p>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { type: "generate_missions", title: "Generate Weekly Missions", desc: "Creates missions for all active patients. Run every Monday.", icon: Target, color: "text-primary" },
              { type: "streak_check", title: "Streak Check", desc: "Sends notifications for streak milestones and broken streaks.", icon: Flame, color: "text-red-500" },
              { type: "stagnation_check", title: "Stagnation Check", desc: "Alerts patients whose body assessment scores plateaued.", icon: TrendingUp, color: "text-amber-500" },
              { type: "challenge_reminder", title: "Challenge Reminder", desc: "Reminds patients about challenges nearing completion.", icon: Trophy, color: "text-amber-500" },
            ].map((trigger) => (
              <Card key={trigger.type}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0`}>
                      <trigger.icon className={`h-5 w-5 ${trigger.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-sm text-slate-800">{trigger.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{trigger.desc}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 gap-1 text-xs"
                        onClick={() => handleTrigger(trigger.type)}
                        disabled={triggerLoading === trigger.type}
                      >
                        {triggerLoading === trigger.type ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        Run Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-slate-50">
            <CardContent className="p-4">
              <h3 className="font-bold text-sm text-slate-700 mb-2">Cron Job Setup</h3>
              <p className="text-xs text-slate-500 mb-2">Add these to your cron scheduler (e.g. Vercel Cron, pm2 cron):</p>
              <div className="space-y-1 font-mono text-xs text-slate-600 bg-white p-3 rounded border">
                <p># Every Monday at 6am — Generate Missions</p>
                <p>0 6 * * 1 curl -X POST https://bpr.rehab/api/notifications/trigger -H &quot;Authorization: Bearer $CRON_SECRET&quot; -d &apos;{`{"type":"generate_missions"}`}&apos;</p>
                <p className="mt-2"># Daily at 9am — Streak + Stagnation</p>
                <p>0 9 * * * curl -X POST https://bpr.rehab/api/notifications/trigger -H &quot;Authorization: Bearer $CRON_SECRET&quot; -d &apos;{`{"type":"streak_check"}`}&apos;</p>
                <p>5 9 * * * curl -X POST https://bpr.rehab/api/notifications/trigger -H &quot;Authorization: Bearer $CRON_SECRET&quot; -d &apos;{`{"type":"stagnation_check"}`}&apos;</p>
                <p className="mt-2"># Wednesday + Friday — Challenge Reminder</p>
                <p>0 12 * * 3,5 curl -X POST https://bpr.rehab/api/notifications/trigger -H &quot;Authorization: Bearer $CRON_SECRET&quot; -d &apos;{`{"type":"challenge_reminder"}`}&apos;</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── AI COACH TAB ─── */}
      {tab === "ai-coach" && (
        <div className="space-y-6">
          {coachLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Risk Summary Cards */}
              {coachSummary && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-slate-800">{coachSummary.avgScore}</p>
                      <p className="text-xs text-slate-500 mt-1">Avg Retention Score</p>
                    </CardContent>
                  </Card>
                  <Card className="border-red-200">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <ShieldAlert className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-600">{coachSummary.critical}</p>
                        <p className="text-[10px] text-slate-500">Critical Risk</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-amber-200">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-amber-600">{coachSummary.high}</p>
                        <p className="text-[10px] text-slate-500">High Risk</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-blue-200">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Eye className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{coachSummary.medium}</p>
                        <p className="text-[10px] text-slate-500">Medium Risk</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-emerald-200">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-emerald-600">{coachSummary.low}</p>
                        <p className="text-[10px] text-slate-500">Low Risk</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Actions Row */}
              <div className="flex flex-wrap gap-2">
                <Button onClick={fetchCoachData} variant="outline" size="sm" className="gap-1">
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh Data
                </Button>
                <Button
                  onClick={suggestCampaigns}
                  disabled={campaignLoading || coachPatients.filter((p) => p.retention.risk !== "low").length === 0}
                  size="sm"
                  className="gap-1 bg-violet-600 hover:bg-violet-700"
                >
                  {campaignLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  AI: Suggest Re-Engagement Campaigns
                </Button>
              </div>

              {/* AI Campaign Suggestions */}
              {campaignResult?.campaigns && (
                <Card className="border-violet-200 bg-violet-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base text-violet-800">
                      <Sparkles className="h-5 w-5" /> AI-Suggested Campaigns
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {campaignResult.campaigns.map((c: any, i: number) => (
                      <div key={i} className="bg-white rounded-lg border p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-slate-800">{c.name}</h3>
                          <Badge variant="outline" className="text-[10px] shrink-0">{c.channel}</Badge>
                        </div>
                        <p className="text-xs text-slate-500">{c.segment}</p>
                        <div className="bg-slate-50 rounded p-3 space-y-1">
                          <p className="text-xs font-semibold text-slate-600">Subject: {c.messageTemplate?.subject}</p>
                          <p className="text-xs text-slate-500 whitespace-pre-line">{c.messageTemplate?.body}</p>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-slate-400">
                          <span><Clock className="h-3 w-3 inline" /> {c.timing}</span>
                          <span><TrendingUp className="h-3 w-3 inline" /> {c.expectedImpact}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Patient Retention Table */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Brain className="h-5 w-5 text-violet-500" /> Patient Retention Scores
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 border-b bg-slate-50">
                        <th className="p-3">Patient</th>
                        <th className="p-3">Score</th>
                        <th className="p-3">Risk</th>
                        <th className="p-3">Level</th>
                        <th className="p-3">Streak</th>
                        <th className="p-3">Last Active</th>
                        <th className="p-3">Missions</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coachPatients.map((p: any) => {
                        const riskColor = p.retention.risk === "critical" ? "bg-red-100 text-red-700 border-red-200"
                          : p.retention.risk === "high" ? "bg-amber-100 text-amber-700 border-amber-200"
                          : p.retention.risk === "medium" ? "bg-blue-100 text-blue-700 border-blue-200"
                          : "bg-emerald-100 text-emerald-700 border-emerald-200";
                        const isExpanded = expandedPatient === p.patientId;
                        const isAnalyzing = aiAnalyzing === p.patientId;
                        const hasAnalysis = aiAnalysis?.patientId === p.patientId;
                        const lastActiveStr = p.lastActive
                          ? `${Math.floor((Date.now() - new Date(p.lastActive).getTime()) / 86400000)}d ago`
                          : "Never";

                        return (
                          <tr key={p.patientId} className="border-b border-slate-50 hover:bg-slate-50/50">
                            <td className="p-3">
                              <p className="font-medium text-slate-800">{p.name}</p>
                              <p className="text-[10px] text-slate-400">{p.email}</p>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="w-12 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${p.retention.score >= 70 ? "bg-emerald-500" : p.retention.score >= 45 ? "bg-blue-500" : p.retention.score >= 25 ? "bg-amber-500" : "bg-red-500"}`}
                                    style={{ width: `${p.retention.score}%` }}
                                  />
                                </div>
                                <span className="text-xs font-bold">{p.retention.score}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge className={`text-[10px] ${riskColor}`}>{p.retention.risk}</Badge>
                            </td>
                            <td className="p-3"><Badge variant="outline">{p.level}</Badge></td>
                            <td className="p-3">
                              <span className="flex items-center gap-1">
                                <Flame className={`h-3 w-3 ${p.streak > 0 ? "text-red-500" : "text-slate-300"}`} />
                                {p.streak}d
                              </span>
                            </td>
                            <td className="p-3 text-xs text-slate-500">{lastActiveStr}</td>
                            <td className="p-3 text-xs">{p.missionRate}%</td>
                            <td className="p-3 text-right">
                              <Button
                                size="sm"
                                variant={isExpanded ? "default" : "outline"}
                                className="gap-1 text-xs h-7"
                                onClick={() => {
                                  if (isExpanded) {
                                    setExpandedPatient(null);
                                  } else {
                                    analyzePatient(p);
                                  }
                                }}
                                disabled={isAnalyzing}
                              >
                                {isAnalyzing ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Brain className="h-3 w-3" />
                                )}
                                {isExpanded ? "Hide" : "AI Analyze"}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Expanded AI Analysis */}
                  {expandedPatient && aiAnalysis && (
                    <div className="border-t-2 border-violet-200 bg-violet-50/30 p-6 space-y-4">
                      <div className="flex items-center gap-2 text-violet-800 font-bold">
                        <Sparkles className="h-4 w-4" /> AI Analysis: {coachPatients.find((p) => p.patientId === expandedPatient)?.name}
                      </div>

                      {/* Assessment */}
                      <div className="bg-white rounded-lg border p-4">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Assessment</h4>
                        <p className="text-sm text-slate-700">{aiAnalysis.assessment}</p>
                      </div>

                      {/* Risk Factors + Actions */}
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="bg-white rounded-lg border p-4">
                          <h4 className="text-xs font-semibold text-red-500 uppercase mb-2">Risk Factors</h4>
                          <ul className="space-y-1.5">
                            {(aiAnalysis.riskFactors || []).map((f: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-white rounded-lg border p-4">
                          <h4 className="text-xs font-semibold text-emerald-600 uppercase mb-2">Recommended Actions</h4>
                          <ul className="space-y-2">
                            {(aiAnalysis.actions || []).map((a: any, i: number) => (
                              <li key={i} className="text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-slate-700">{a.title}</span>
                                  <Badge variant="outline" className="text-[10px]">{a.type}</Badge>
                                  <Badge className={`text-[10px] ${a.priority === "high" ? "bg-red-100 text-red-700" : a.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                                    {a.priority}
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">{a.description}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Suggested Message */}
                      {aiAnalysis.suggestedMessage && (
                        <div className="bg-white rounded-lg border p-4">
                          <h4 className="text-xs font-semibold text-violet-600 uppercase mb-2">Suggested Re-engagement Message</h4>
                          <p className="text-sm font-medium text-slate-700 mb-1">Subject: {aiAnalysis.suggestedMessage.subject}</p>
                          <p className="text-sm text-slate-600 whitespace-pre-line bg-slate-50 p-3 rounded">{aiAnalysis.suggestedMessage.body}</p>
                          <Button size="sm" variant="outline" className="mt-3 gap-1 text-xs">
                            <Send className="h-3 w-3" /> Send via Email
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ─── PLAYERS TAB ─── */}
      {tab === "players" && (
        <div className="space-y-4">
          <h2 className="font-bold text-slate-800">Player Leaderboard</h2>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b bg-slate-50">
                    <th className="p-3">#</th>
                    <th className="p-3">Patient</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Level</th>
                    <th className="p-3">Total XP</th>
                    <th className="p-3">Streak</th>
                    <th className="p-3">Longest</th>
                    <th className="p-3">Credits</th>
                    <th className="p-3">Archetype</th>
                  </tr>
                </thead>
                <tbody>
                  {topPlayers.map((p: any, i: number) => {
                    const archetype = ARCHETYPES.find((a) => a.key === p.archetypeKey);
                    return (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-400">{i + 1}</td>
                        <td className="p-3 font-medium text-slate-800">{p.patient?.firstName} {p.patient?.lastName}</td>
                        <td className="p-3 text-xs text-slate-500">{p.patient?.email}</td>
                        <td className="p-3"><Badge variant="outline">{p.level}</Badge></td>
                        <td className="p-3 font-medium text-amber-600">{p.totalXpEarned.toLocaleString()}</td>
                        <td className="p-3"><Flame className="h-3 w-3 text-red-500 inline" /> {p.streakDays}d</td>
                        <td className="p-3 text-slate-500">{p.longestStreak}d</td>
                        <td className="p-3 text-emerald-600">{p.bprCredits}</td>
                        <td className="p-3 text-xs">{archetype ? `${archetype.emoji} ${archetype.name}` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
