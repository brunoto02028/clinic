"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Sparkles, Loader2, TrendingUp, Calendar, Zap,
  ShoppingBag, Wand2, Copy, Check, ExternalLink, BookOpen,
  FileText, Instagram, Globe, Target, DollarSign, Clock,
  Flame, Eye, ChevronDown, ChevronUp, RefreshCw, Hash,
  Lightbulb, BarChart3, Megaphone, Star, Tag, Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

type Tab = "trending" | "calendar" | "hooks" | "marketplace" | "improve";

const TABS: { key: Tab; label: string; icon: any; desc: string }[] = [
  { key: "trending", label: "Trending Ideas", icon: TrendingUp, desc: "Viral content suggestions" },
  { key: "calendar", label: "Content Calendar", icon: Calendar, desc: "Weekly plan" },
  { key: "hooks", label: "Viral Hooks", icon: Zap, desc: "Scroll-stopping openers" },
  { key: "marketplace", label: "Marketplace Intel", icon: ShoppingBag, desc: "Product opportunities" },
  { key: "improve", label: "Improve Content", icon: Wand2, desc: "Upgrade existing posts" },
];

const URGENCY_COLORS: Record<string, string> = {
  high: "bg-red-500/15 text-red-400 border-red-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

const PLATFORM_ICONS: Record<string, any> = {
  instagram: Instagram,
  blog: Globe,
  pdf: BookOpen,
  tiktok: Megaphone,
};

export default function ContentIntelligencePage() {
  const [tab, setTab] = useState<Tab>("trending");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Trending Ideas
  const [trendFocus, setTrendFocus] = useState("");
  const [trendCount, setTrendCount] = useState(10);
  const [trendData, setTrendData] = useState<any>(null);

  // Calendar
  const [calWeeks, setCalWeeks] = useState(2);
  const [calFocus, setCalFocus] = useState("");
  const [calData, setCalData] = useState<any>(null);

  // Hooks
  const [hookTopic, setHookTopic] = useState("");
  const [hookPlatform, setHookPlatform] = useState("instagram");
  const [hookCount, setHookCount] = useState(15);
  const [hookData, setHookData] = useState<any>(null);

  // Marketplace
  const [marketData, setMarketData] = useState<any>(null);

  // Improve
  const [improveContent, setImproveContent] = useState("");
  const [improvePlatform, setImprovePlatform] = useState("instagram");
  const [improveGoal, setImproveGoal] = useState("");
  const [improveData, setImproveData] = useState<any>(null);

  // Expanded state
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const callAPI = async (action: string, extraBody: any = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/marketing/content-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extraBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const generateTrending = async () => {
    const data = await callAPI("trending-ideas", { focus: trendFocus, count: trendCount });
    if (data) setTrendData(data);
  };

  const generateCalendar = async () => {
    const data = await callAPI("content-calendar", { weeks: calWeeks, focus: calFocus });
    if (data) setCalData(data);
  };

  const generateHooks = async () => {
    const data = await callAPI("viral-hooks", { topic: hookTopic, platform: hookPlatform, count: hookCount });
    if (data) setHookData(data);
  };

  const generateMarketplace = async () => {
    const data = await callAPI("marketplace-opportunities");
    if (data) setMarketData(data);
  };

  const generateImprove = async () => {
    if (!improveContent.trim()) return;
    const data = await callAPI("improve-content", { content: improveContent, platform: improvePlatform, goal: improveGoal });
    if (data) setImproveData(data);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/marketing" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Content Intelligence Hub
          </h1>
          <p className="text-sm text-muted-foreground">AI-powered viral content ideas, calendar, and marketplace opportunities</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/marketplace/pdf-creator">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <BookOpen className="h-3.5 w-3.5" /> PDF Creator
            </Button>
          </Link>
          <Link href="/admin/marketing/articles">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" /> Articles
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30"
                : "bg-card hover:bg-muted text-muted-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">{t.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">{error}</div>
      )}

      {/* ━━━ TRENDING IDEAS ━━━ */}
      {tab === "trending" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2 space-y-2">
                  <Label className="font-semibold">Focus Area (optional)</Label>
                  <Input
                    placeholder="e.g. back pain, knee surgery recovery, sports injuries, posture..."
                    value={trendFocus}
                    onChange={(e) => setTrendFocus(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Number of Ideas</Label>
                  <select
                    value={trendCount}
                    onChange={(e) => setTrendCount(parseInt(e.target.value))}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value={5}>5 ideas</option>
                    <option value={10}>10 ideas</option>
                    <option value={15}>15 ideas</option>
                    <option value={20}>20 ideas</option>
                  </select>
                </div>
              </div>
              <Button onClick={generateTrending} disabled={loading} className="gap-2 bg-amber-600 hover:bg-amber-700 w-full sm:w-auto">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                {loading ? "Analyzing trends..." : "Generate Trending Ideas"}
              </Button>
            </CardContent>
          </Card>

          {trendData && (
            <>
              {trendData.trendingSummary && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                        <BarChart3 className="h-4 w-4 text-amber-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm mb-1">Trending Summary</h3>
                        <p className="text-sm text-muted-foreground">{trendData.trendingSummary}</p>
                        {trendData.seasonalNote && (
                          <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {trendData.seasonalNote}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                {trendData.ideas?.map((idea: any, i: number) => (
                  <Card key={i} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div
                        className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => toggleExpand(`trend-${i}`)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center text-sm font-bold text-amber-400 shrink-0">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-sm text-foreground">{idea.title}</h3>
                              {expandedItems.has(`trend-${i}`) ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{idea.hook}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              <Badge className={`text-[10px] border ${URGENCY_COLORS[idea.urgency] || URGENCY_COLORS.medium}`}>
                                <Flame className="h-2.5 w-2.5 mr-0.5" /> {idea.urgency}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">{idea.contentType}</Badge>
                              <Badge variant="outline" className="text-[10px]">{idea.category?.replace(/_/g, ' ')}</Badge>
                              {idea.platforms?.map((p: string) => {
                                const Icon = PLATFORM_ICONS[p] || Globe;
                                return <Icon key={p} className="h-3.5 w-3.5 text-muted-foreground" />;
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {expandedItems.has(`trend-${i}`) && (
                        <div className="px-4 pb-4 pt-0 border-t border-border/50 space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2 mt-3">
                            <div className="space-y-2">
                              <div>
                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase">Hook</h4>
                                <p className="text-sm text-foreground mt-0.5">{idea.hook}</p>
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 mt-1"
                                  onClick={(e) => { e.stopPropagation(); copyText(idea.hook, `hook-${i}`); }}>
                                  {copied === `hook-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                  {copied === `hook-${i}` ? "Copied!" : "Copy hook"}
                                </Button>
                              </div>
                              <div>
                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase">Why Viral</h4>
                                <p className="text-xs text-muted-foreground">{idea.whyViral}</p>
                              </div>
                              <div>
                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase">Best Time to Post</h4>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {idea.bestTimeToPost}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div>
                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase">
                                  <DollarSign className="h-3 w-3 inline" /> Monetization
                                </h4>
                                <p className="text-xs text-muted-foreground">{idea.monetization}</p>
                              </div>
                              {idea.pdfOpportunity && (
                                <div>
                                  <h4 className="text-[10px] font-bold text-emerald-400 uppercase">PDF Guide Opportunity</h4>
                                  <p className="text-xs text-muted-foreground">{idea.pdfOpportunity}</p>
                                  <Link href={`/admin/marketplace/pdf-creator?topic=${encodeURIComponent(idea.title)}`} onClick={(e) => e.stopPropagation()}>
                                    <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 mt-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                                      <BookOpen className="h-3 w-3" /> Create PDF
                                    </Button>
                                  </Link>
                                </div>
                              )}
                              {idea.affiliateOpportunity && (
                                <div>
                                  <h4 className="text-[10px] font-bold text-blue-400 uppercase">Affiliate Opportunity</h4>
                                  <p className="text-xs text-muted-foreground">{idea.affiliateOpportunity}</p>
                                </div>
                              )}
                              {idea.hashtags?.length > 0 && (
                                <div>
                                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase">Hashtags</h4>
                                  <div className="flex flex-wrap gap-1 mt-0.5">
                                    {idea.hashtags.map((h: string, j: number) => (
                                      <Badge key={j} variant="outline" className="text-[10px]">{h}</Badge>
                                    ))}
                                  </div>
                                  <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 mt-1"
                                    onClick={(e) => { e.stopPropagation(); copyText(idea.hashtags.join(' '), `tags-${i}`); }}>
                                    {copied === `tags-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                    Copy hashtags
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 pt-2 border-t border-border/30">
                            <Link href={`/admin/marketing/articles?topic=${encodeURIComponent(idea.title)}`} onClick={(e) => e.stopPropagation()}>
                              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                                <FileText className="h-3 w-3" /> Create Article
                              </Button>
                            </Link>
                            <Link href={`/admin/marketplace/pdf-creator?topic=${encodeURIComponent(idea.title)}`} onClick={(e) => e.stopPropagation()}>
                              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                                <BookOpen className="h-3 w-3" /> Create PDF Guide
                              </Button>
                            </Link>
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                              onClick={(e) => { e.stopPropagation(); copyText(`${idea.title}\n\n${idea.hook}`, `full-${i}`); }}>
                              {copied === `full-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              Copy All
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ━━━ CONTENT CALENDAR ━━━ */}
      {tab === "calendar" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2 space-y-2">
                  <Label className="font-semibold">Focus Theme (optional)</Label>
                  <Input
                    placeholder="e.g. Spring fitness prep, Runner's knee awareness..."
                    value={calFocus}
                    onChange={(e) => setCalFocus(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Weeks</Label>
                  <select
                    value={calWeeks}
                    onChange={(e) => setCalWeeks(parseInt(e.target.value))}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value={1}>1 week</option>
                    <option value={2}>2 weeks</option>
                    <option value={4}>4 weeks (month)</option>
                  </select>
                </div>
              </div>
              <Button onClick={generateCalendar} disabled={loading} className="gap-2 bg-violet-600 hover:bg-violet-700 w-full sm:w-auto">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                {loading ? "Planning..." : "Generate Content Calendar"}
              </Button>
            </CardContent>
          </Card>

          {calData && (
            <>
              {calData.strategyNotes && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-1 flex items-center gap-2"><Target className="h-4 w-4 text-violet-500" /> Strategy</h3>
                    <p className="text-sm text-muted-foreground">{calData.strategyNotes}</p>
                    {calData.kpis?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {calData.kpis.map((k: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px]"><BarChart3 className="h-2.5 w-2.5 mr-1" />{k}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {calData.calendar?.map((week: any, wi: number) => (
                <Card key={wi}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-violet-500/15 text-violet-400">Week {week.week}</Badge>
                      {week.theme && <span className="text-sm font-medium text-foreground">{week.theme}</span>}
                    </div>
                    <div className="space-y-2">
                      {week.days?.map((day: any, di: number) => (
                        <div key={di} className="border border-border/50 rounded-lg p-3 hover:bg-muted/20 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] font-bold">{day.day}</Badge>
                              <Badge variant="outline" className="text-[10px]">{day.platform}</Badge>
                              <Badge variant="outline" className="text-[10px]">{day.contentType}</Badge>
                            </div>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1"
                              onClick={() => copyText(day.caption || day.outline || day.script || day.title, `cal-${wi}-${di}`)}>
                              {copied === `cal-${wi}-${di}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                          <h4 className="font-medium text-sm mt-1.5">{day.title}</h4>
                          {day.caption && (
                            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line line-clamp-3">{day.caption}</p>
                          )}
                          {day.outline && (
                            <p className="text-xs text-muted-foreground mt-1">{day.outline}</p>
                          )}
                          {day.script && (
                            <p className="text-xs text-muted-foreground mt-1 italic">{day.script}</p>
                          )}
                          {(day.cta || day.notes || day.targetKeyword) && (
                            <div className="flex flex-wrap gap-2 mt-1.5">
                              {day.cta && <Badge className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{day.cta}</Badge>}
                              {day.targetKeyword && <Badge className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20">SEO: {day.targetKeyword}</Badge>}
                              {day.linkedProduct && <Badge className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20"><DollarSign className="h-2.5 w-2.5 mr-0.5" />{day.linkedProduct}</Badge>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      )}

      {/* ━━━ VIRAL HOOKS ━━━ */}
      {tab === "hooks" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label className="font-semibold">Topic</Label>
                  <Input
                    placeholder="e.g. knee pain, posture correction..."
                    value={hookTopic}
                    onChange={(e) => setHookTopic(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Platform</Label>
                  <select value={hookPlatform} onChange={(e) => setHookPlatform(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="blog">Blog/Article</option>
                    <option value="youtube">YouTube</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Count</Label>
                  <select value={hookCount} onChange={(e) => setHookCount(parseInt(e.target.value))}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                    <option value={10}>10 hooks</option>
                    <option value={15}>15 hooks</option>
                    <option value={20}>20 hooks</option>
                  </select>
                </div>
              </div>
              <Button onClick={generateHooks} disabled={loading} className="gap-2 bg-rose-600 hover:bg-rose-700 w-full sm:w-auto">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {loading ? "Creating hooks..." : "Generate Viral Hooks"}
              </Button>
            </CardContent>
          </Card>

          {hookData?.hooks?.length > 0 && (
            <div className="space-y-2">
              {hookData.hooks.map((h: any, i: number) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        (h.viralScore || 5) >= 8 ? "bg-red-500/20 text-red-400" :
                        (h.viralScore || 5) >= 6 ? "bg-amber-500/20 text-amber-400" :
                        "bg-blue-500/20 text-blue-400"
                      }`}>
                        {h.viralScore || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground">&ldquo;{h.hook}&rdquo;</p>
                        {h.followUp && <p className="text-xs text-muted-foreground mt-1">{h.followUp}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px]">{h.type}</Badge>
                          {h.why && <span className="text-[10px] text-muted-foreground">— {h.why}</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 shrink-0"
                        onClick={() => copyText(h.hook, `h-${i}`)}>
                        {copied === `h-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {hookData.tips?.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-xs text-amber-400 uppercase mb-2 flex items-center gap-1"><Lightbulb className="h-3 w-3" /> Tips</h3>
                    <ul className="space-y-1">
                      {hookData.tips.map((t: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <Star className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" /> {t}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* ━━━ MARKETPLACE OPPORTUNITIES ━━━ */}
      {tab === "marketplace" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground mb-3">
                Claude will analyze the physiotherapy/health market and suggest PDF guides, Amazon affiliate products, and bundle opportunities.
              </p>
              <Button onClick={generateMarketplace} disabled={loading} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
                {loading ? "Analyzing market..." : "Analyze Marketplace Opportunities"}
              </Button>
            </CardContent>
          </Card>

          {marketData && (
            <>
              {marketData.marketInsights && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-1 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-emerald-500" /> Market Insights</h3>
                    <p className="text-sm text-muted-foreground">{marketData.marketInsights}</p>
                  </CardContent>
                </Card>
              )}

              {/* PDF Guide Opportunities */}
              {marketData.pdfGuides?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2 px-1">
                    <BookOpen className="h-4 w-4 text-purple-500" /> PDF Guide Opportunities ({marketData.pdfGuides.length})
                  </h3>
                  {marketData.pdfGuides.map((g: any, i: number) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-sm">{g.title}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">{g.description}</p>
                          </div>
                          <Badge className="bg-emerald-500/15 text-emerald-400 shrink-0">£{g.suggestedPrice}</Badge>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 mt-3 text-xs text-muted-foreground">
                          <div><strong className="text-foreground/70">Target:</strong> {g.targetAudience}</div>
                          <div><strong className="text-foreground/70">Demand:</strong> {g.demandSignal}</div>
                          <div><strong className="text-foreground/70">Gap:</strong> {g.competitorGap}</div>
                          <div><strong className="text-foreground/70">Est. Revenue:</strong> {g.estimatedMonthlyRevenue}</div>
                        </div>
                        {g.contentOutline?.length > 0 && (
                          <div className="mt-2">
                            <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-0.5">
                              {g.contentOutline.map((c: string, j: number) => <li key={j}>{c}</li>)}
                            </ol>
                          </div>
                        )}
                        <div className="flex gap-2 mt-3">
                          <Link href={`/admin/marketplace/pdf-creator?topic=${encodeURIComponent(g.title)}`}>
                            <Button size="sm" className="h-7 text-xs gap-1 bg-purple-600 hover:bg-purple-700">
                              <BookOpen className="h-3 w-3" /> Create This PDF
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Affiliate Products */}
              {marketData.affiliateProducts?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2 px-1">
                    <Package className="h-4 w-4 text-amber-500" /> Amazon Affiliate Opportunities ({marketData.affiliateProducts.length})
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {marketData.affiliateProducts.map((p: any, i: number) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-sm">{p.productName}</h4>
                            <Badge variant="outline" className="text-[10px]">{p.category}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{p.whyRecommend}</p>
                          <p className="text-xs text-muted-foreground mt-1"><strong>Content idea:</strong> {p.contentIdea}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge className="text-[9px] bg-amber-500/10 text-amber-400">{p.estimatedCommission} commission</Badge>
                            <Badge variant="outline" className="text-[9px]">{p.searchVolume} demand</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Bundle Ideas */}
              {marketData.bundleIdeas?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2 px-1">
                    <Tag className="h-4 w-4 text-blue-500" /> Bundle Ideas ({marketData.bundleIdeas.length})
                  </h3>
                  {marketData.bundleIdeas.map((b: any, i: number) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm">{b.name}</h4>
                          <Badge className="bg-blue-500/15 text-blue-400">£{b.price}</Badge>
                        </div>
                        <ul className="mt-1 space-y-0.5">
                          {b.includes?.map((item: string, j: number) => (
                            <li key={j} className="text-xs text-muted-foreground flex items-center gap-1">
                              <Check className="h-3 w-3 text-emerald-500" /> {item}
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs text-muted-foreground mt-1 italic">{b.value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ━━━ IMPROVE CONTENT ━━━ */}
      {tab === "improve" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label className="font-semibold">Paste your existing content</Label>
                <Textarea
                  placeholder="Paste your Instagram caption, article draft, or any content you want to improve..."
                  value={improveContent}
                  onChange={(e) => setImproveContent(e.target.value)}
                  rows={6}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="font-semibold">Platform</Label>
                  <select value={improvePlatform} onChange={(e) => setImprovePlatform(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                    <option value="instagram">Instagram</option>
                    <option value="blog">Blog/Article</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="email">Email</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Goal (optional)</Label>
                  <Input
                    placeholder="e.g. more engagement, more clicks, more shares..."
                    value={improveGoal}
                    onChange={(e) => setImproveGoal(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={generateImprove} disabled={loading || !improveContent.trim()} className="gap-2 bg-cyan-600 hover:bg-cyan-700 w-full sm:w-auto">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {loading ? "Improving..." : "Improve Content"}
              </Button>
            </CardContent>
          </Card>

          {improveData && (
            <div className="space-y-4">
              {/* Score Comparison */}
              {improveData.engagementScore && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-2 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-cyan-500" /> Engagement Score</h3>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-400">{improveData.engagementScore.original}</div>
                        <div className="text-[10px] text-muted-foreground">Original</div>
                      </div>
                      <div className="text-lg text-muted-foreground">→</div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-emerald-400">{improveData.engagementScore.improved}</div>
                        <div className="text-[10px] text-muted-foreground">Improved</div>
                      </div>
                      <div className="flex-1 text-xs text-muted-foreground">{improveData.engagementScore.explanation}</div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Improved Version */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm text-emerald-400">Improved Version</h3>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                      onClick={() => copyText(improveData.improvedVersion, 'improved')}>
                      {copied === 'improved' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied === 'improved' ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                  <div className="text-sm text-foreground/90 whitespace-pre-line bg-muted/30 p-3 rounded-lg">
                    {improveData.improvedVersion}
                  </div>
                </CardContent>
              </Card>

              {/* Changes Made */}
              {improveData.changes?.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-2">Changes Made</h3>
                    <div className="space-y-2">
                      {improveData.changes.map((c: any, i: number) => (
                        <div key={i} className="text-xs">
                          <strong className="text-foreground/80">{c.what}</strong>
                          <span className="text-muted-foreground"> — {c.why}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Alternative Versions */}
              {improveData.alternativeVersions?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm px-1">Alternative Versions</h3>
                  {improveData.alternativeVersions.map((v: any, i: number) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-[10px]">{v.style}</Badge>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1"
                            onClick={() => copyText(v.content, `alt-${i}`)}>
                            {copied === `alt-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground whitespace-pre-line">{v.content}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* SEO + Hashtags */}
              <div className="grid gap-3 sm:grid-cols-2">
                {improveData.seoKeywords?.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-xs mb-2">SEO Keywords</h3>
                      <div className="flex flex-wrap gap-1">
                        {improveData.seoKeywords.map((k: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{k}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {improveData.suggestedHashtags?.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-xs">Hashtags</h3>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1"
                          onClick={() => copyText(improveData.suggestedHashtags.join(' '), 'hashtags')}>
                          {copied === 'hashtags' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          Copy all
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {improveData.suggestedHashtags.map((h: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{h}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
