"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Megaphone, Instagram, Plus, Calendar, Send, Clock,
  CheckCircle, AlertCircle, FileText, TrendingUp, Eye,
  Heart, MessageCircle, Share2, BarChart3, Loader2, Trash2,
  PenSquare, CalendarRange, LayoutTemplate, Sparkles, Link2,
  Rocket, Zap, Globe,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SocialAccount {
  id: string;
  platform: string;
  accountName: string;
  profilePicUrl: string | null;
  isActive: boolean;
  _count: { posts: number };
}

interface SocialPost {
  id: string;
  caption: string;
  hashtags: string | null;
  postType: string;
  mediaUrls: string[];
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  likes: number;
  comments: number;
  reach: number;
  impressions: number;
  aiGenerated: boolean;
  createdAt: string;
  account: { accountName: string; platform: string } | null;
  campaign: { id: string; name: string } | null;
}

const STATUS_MAP: Record<string, { label: string; colour: string; icon: any }> = {
  DRAFT: { label: "Draft", colour: "bg-slate-100 text-slate-700", icon: FileText },
  SCHEDULED: { label: "Scheduled", colour: "bg-blue-100 text-blue-700", icon: Clock },
  PUBLISHING: { label: "Publishing...", colour: "bg-amber-100 text-amber-700", icon: Send },
  PUBLISHED: { label: "Published", colour: "bg-green-100 text-green-700", icon: CheckCircle },
  FAILED: { label: "Failed", colour: "bg-red-100 text-red-700", icon: AlertCircle },
};

function SocialMediaContent() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [tab, setTab] = useState("all");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [superAutoGenerating, setSuperAutoGenerating] = useState(false);
  const [superAutoResult, setSuperAutoResult] = useState<any>(null);
  const [superAutoSaving, setSuperAutoSaving] = useState(false);
  const [superAutoLang, setSuperAutoLang] = useState("pt-BR");
  const [superAutoWeeks, setSuperAutoWeeks] = useState(4);

  useEffect(() => {
    const success = searchParams.get("success");
    const account = searchParams.get("account");
    const error = searchParams.get("error");
    if (success === "connected" && account) {
      setSuccessMsg(`Instagram account @${account} connected successfully!`);
      setTimeout(() => setSuccessMsg(null), 5000);
    }
    if (error) {
      setErrorMsg(decodeURIComponent(error));
      setTimeout(() => setErrorMsg(null), 8000);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, [tab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [accRes, postsRes] = await Promise.all([
        fetch("/api/admin/social/accounts"),
        fetch(`/api/admin/social/posts${tab !== "all" ? `?status=${tab}` : ""}`),
      ]);
      const accData = await accRes.json();
      const postsData = await postsRes.json();
      setAccounts(accData.accounts || []);
      setPosts(postsData.posts || []);
    } catch (err) {
      console.error("Failed to fetch social data:", err);
    } finally {
      setLoading(false);
    }
  };

  const connectInstagram = async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/admin/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "INSTAGRAM" }),
      });
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setErrorMsg(data.error || "Failed to get authentication URL");
        setConnecting(false);
      }
    } catch {
      setErrorMsg("Connection error");
      setConnecting(false);
    }
  };

  const publishPost = async (postId: string) => {
    try {
      const res = await fetch(`/api/admin/social/posts/${postId}/publish`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        setErrorMsg(data.error || "Publishing failed");
      }
    } catch {
      setErrorMsg("Publishing error");
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      await fetch(`/api/admin/social/posts/${postId}`, { method: "DELETE" });
      fetchData();
    } catch {
      setErrorMsg("Delete failed");
    }
  };

  // ─── Superautomação ───
  const generateSuperAuto = async () => {
    setSuperAutoGenerating(true);
    setSuperAutoResult(null);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/social/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "superautomacao", language: superAutoLang, weeks: superAutoWeeks }),
      });
      const data = await res.json();
      if (data.error) {
        setErrorMsg(data.error);
      } else {
        setSuperAutoResult(data);
        setSuccessMsg(`Generated ${data.posts?.length || 0} posts for "${data.calendarName}"`);
        setTimeout(() => setSuccessMsg(null), 5000);
      }
    } catch {
      setErrorMsg("Superautomação generation failed. Check your Gemini API key.");
    } finally {
      setSuperAutoGenerating(false);
    }
  };

  const saveSuperAutoAsDrafts = async () => {
    if (!superAutoResult?.posts?.length) return;
    setSuperAutoSaving(true);
    setErrorMsg(null);
    let saved = 0;
    const startDate = new Date();
    try {
      for (const post of superAutoResult.posts) {
        const schedDate = new Date(startDate);
        schedDate.setDate(schedDate.getDate() + (post.day - 1));
        const [hours, minutes] = (post.suggestedTime || "10:00").split(":");
        schedDate.setHours(parseInt(hours) || 10, parseInt(minutes) || 0, 0, 0);

        const hashtagStr = Array.isArray(post.hashtags) ? post.hashtags.join(", ") : "";
        const fullCaption = post.hook ? `${post.hook}\n\n${post.caption}` : post.caption;

        await fetch("/api/admin/social/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caption: fullCaption,
            hashtags: hashtagStr,
            postType: post.postType || "IMAGE",
            mediaUrls: [],
            mediaPaths: [],
            accountId: accounts[0]?.id || null,
            scheduledAt: schedDate.toISOString(),
            status: "DRAFT",
            aiGenerated: true,
            aiPrompt: `[Superautomação] Day ${post.day} ${post.slot} — ${post.contentPillar}: ${post.topic}`,
          }),
        });
        saved++;
      }
      setSuccessMsg(`${saved} posts saved as drafts! Add images and publish when ready.`);
      setSuperAutoResult(null);
      fetchData();
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch {
      setErrorMsg(`Saved ${saved} posts before error. Please try again.`);
    } finally {
      setSuperAutoSaving(false);
    }
  };

  const stats = {
    total: posts.length,
    published: posts.filter(p => p.status === "PUBLISHED").length,
    scheduled: posts.filter(p => p.status === "SCHEDULED").length,
    drafts: posts.filter(p => p.status === "DRAFT").length,
    totalLikes: posts.reduce((s, p) => s + p.likes, 0),
    totalReach: posts.reduce((s, p) => s + p.reach, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            {T("admin.socialMediaTitle")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {T("admin.socialMediaDesc")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/social/create">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Create Post
            </Button>
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800 text-sm">
          <CheckCircle className="h-4 w-4" /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-sm">
          <AlertCircle className="h-4 w-4" /> {errorMsg}
        </div>
      )}

      {/* Connected Accounts */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Connected Accounts</CardTitle>
            <Button variant="outline" size="sm" className="gap-2" onClick={connectInstagram} disabled={connecting}>
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Instagram className="h-4 w-4" />}
              Connect Instagram
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-2xl flex items-center justify-center mx-auto">
                <Instagram className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="font-medium">No accounts connected yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect your Instagram Business account to start posting directly from here.
                </p>
              </div>
              <Button onClick={connectInstagram} disabled={connecting} className="gap-2">
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Connect Instagram Account
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map(acc => (
                <div key={acc.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  {acc.profilePicUrl ? (
                    <img src={acc.profilePicUrl} alt="" className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Instagram className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm">@{acc.accountName}</p>
                    <p className="text-xs text-muted-foreground">{acc.platform} &middot; {acc._count.posts} posts</p>
                  </div>
                  <Badge className={acc.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                    {acc.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Posts", value: stats.total, icon: FileText, colour: "text-slate-600" },
          { label: "Published", value: stats.published, icon: CheckCircle, colour: "text-green-600" },
          { label: "Scheduled", value: stats.scheduled, icon: Clock, colour: "text-blue-600" },
          { label: "Drafts", value: stats.drafts, icon: PenSquare, colour: "text-amber-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <s.icon className={`h-4 w-4 ${s.colour}`} />
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/admin/social/create">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <PenSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Create Post</p>
                <p className="text-xs text-muted-foreground">Write with AI assistance</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/social/campaigns">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CalendarRange className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Campaigns</p>
                <p className="text-xs text-muted-foreground">Plan & schedule content</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/social/templates">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                <LayoutTemplate className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Templates</p>
                <p className="text-xs text-muted-foreground">Reusable post formats</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Superautomação */}
      <Card className="border-2 border-dashed border-violet-300 dark:border-violet-700 bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 dark:from-violet-950/30 dark:via-purple-950/20 dark:to-pink-950/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <Rocket className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Superautomação Instagram
                  <Badge className="bg-violet-100 text-violet-700 text-[10px]">AI</Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Generate a complete 30-day content calendar with hooks, captions, hashtags & strategy
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={superAutoLang} onValueChange={setSuperAutoLang}>
                <SelectTrigger className="w-[120px] h-8 text-xs bg-white dark:bg-background">
                  <Globe className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português</SelectItem>
                  <SelectItem value="en-GB">English</SelectItem>
                </SelectContent>
              </Select>
              <Select value={String(superAutoWeeks)} onValueChange={v => setSuperAutoWeeks(parseInt(v))}>
                <SelectTrigger className="w-[110px] h-8 text-xs bg-white dark:bg-background">
                  <Calendar className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Week</SelectItem>
                  <SelectItem value="2">2 Weeks</SelectItem>
                  <SelectItem value="4">4 Weeks</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={generateSuperAuto}
                disabled={superAutoGenerating}
                className="gap-2 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white shadow-md h-8 text-xs"
              >
                {superAutoGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                {superAutoGenerating ? "Generating..." : "Generate Calendar"}
              </Button>
            </div>
          </div>
        </CardHeader>

        {superAutoResult?.posts?.length > 0 && (
          <CardContent className="pt-0">
            <div className="bg-white dark:bg-zinc-900 rounded-xl border shadow-sm p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">{superAutoResult.calendarName}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{superAutoResult.strategy}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{superAutoResult.posts.length} posts</Badge>
                  <Button
                    onClick={saveSuperAutoAsDrafts}
                    disabled={superAutoSaving}
                    className="gap-1.5 h-8 text-xs"
                  >
                    {superAutoSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                    {superAutoSaving ? "Saving..." : "Save All as Drafts"}
                  </Button>
                </div>
              </div>

              {/* Calendar preview grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
                  <div key={d} className="text-[10px] font-medium text-muted-foreground py-1">{d}</div>
                ))}
                {Array.from({ length: superAutoWeeks * 7 }, (_, i) => {
                  const dayNum = i + 1;
                  const dayPosts = superAutoResult.posts.filter((p: any) => p.day === dayNum);
                  const hasHigh = dayPosts.some((p: any) => p.viralPotential === "high");
                  return (
                    <div key={i} className={`rounded-lg p-1.5 border text-[10px] min-h-[52px] ${dayPosts.length > 0 ? "bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800" : "border-dashed border-slate-200"}`}>
                      <div className="font-semibold text-muted-foreground">D{dayNum}</div>
                      {dayPosts.map((p: any, j: number) => (
                        <div key={j} className={`mt-0.5 px-1 py-0.5 rounded text-[8px] truncate ${
                          p.postType === "REEL" ? "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300"
                          : p.postType === "CAROUSEL" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                        }`}>
                          {hasHigh && j === 0 ? "🔥 " : ""}{p.postType === "REEL" ? "🎬" : p.postType === "CAROUSEL" ? "📸" : "📝"} {p.slot === "morning" ? "AM" : "PM"}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Sample posts preview */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <p className="text-xs font-medium text-muted-foreground">Preview (first 6 posts):</p>
                {superAutoResult.posts.slice(0, 6).map((post: any, i: number) => (
                  <div key={i} className="flex gap-2 p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 text-xs">
                    <div className="flex-shrink-0">
                      <Badge variant="outline" className="text-[9px]">
                        D{post.day} {post.slot === "morning" ? "🌅" : "🌙"}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-violet-700 dark:text-violet-300 truncate">{post.hook}</p>
                      <p className="text-muted-foreground line-clamp-2 mt-0.5">{post.caption}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        <Badge className={`text-[8px] ${
                          post.postType === "REEL" ? "bg-pink-100 text-pink-700"
                          : post.postType === "CAROUSEL" ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                        }`}>{post.postType}</Badge>
                        <Badge variant="outline" className="text-[8px]">{post.contentPillar}</Badge>
                        {post.viralPotential === "high" && <Badge className="text-[8px] bg-orange-100 text-orange-700">🔥 Viral</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Posts List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="DRAFT">Drafts</TabsTrigger>
              <TabsTrigger value="SCHEDULED">Scheduled</TabsTrigger>
              <TabsTrigger value="PUBLISHED">Published</TabsTrigger>
              <TabsTrigger value="FAILED">Failed</TabsTrigger>
            </TabsList>

            <TabsContent value={tab}>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <Megaphone className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                  <p className="text-muted-foreground">No posts yet</p>
                  <Link href="/admin/social/create">
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" /> Create Your First Post
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {posts.map(post => {
                    const statusInfo = STATUS_MAP[post.status] || STATUS_MAP.DRAFT;
                    const StatusIcon = statusInfo.icon;
                    return (
                      <div key={post.id} className="flex gap-3 p-3 rounded-lg border hover:bg-slate-50 transition-colors">
                        {/* Thumbnail */}
                        {post.mediaUrls[0] ? (
                          <img src={post.mediaUrls[0]} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <FileText className="h-6 w-6 text-slate-300" />
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm line-clamp-2">{post.caption}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <Badge className={`text-[10px] gap-1 ${statusInfo.colour}`}>
                              <StatusIcon className="h-2.5 w-2.5" /> {statusInfo.label}
                            </Badge>
                            {post.aiGenerated && (
                              <Badge variant="outline" className="text-[10px] gap-1">
                                <Sparkles className="h-2.5 w-2.5" /> AI
                              </Badge>
                            )}
                            {post.campaign && (
                              <Badge variant="outline" className="text-[10px]">{post.campaign.name}</Badge>
                            )}
                            {post.scheduledAt && (
                              <span className="text-[10px] text-muted-foreground">
                                <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                                {new Date(post.scheduledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                          </div>
                          {post.status === "PUBLISHED" && (
                            <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-0.5"><Heart className="h-2.5 w-2.5" />{post.likes}</span>
                              <span className="flex items-center gap-0.5"><MessageCircle className="h-2.5 w-2.5" />{post.comments}</span>
                              <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" />{post.reach}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          {(post.status === "DRAFT" || post.status === "FAILED") && accounts.length > 0 && (
                            <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={() => publishPost(post.id)}>
                              <Send className="h-3 w-3" /> Publish
                            </Button>
                          )}
                          <Link href={`/admin/social/create?edit=${post.id}`}>
                            <Button size="sm" variant="ghost" className="text-xs gap-1 h-7 w-full">
                              <PenSquare className="h-3 w-3" /> Edit
                            </Button>
                          </Link>
                          <Button size="sm" variant="ghost" className="text-xs gap-1 h-7 text-red-500 hover:text-red-700" onClick={() => deletePost(post.id)}>
                            <Trash2 className="h-3 w-3" /> Delete
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SocialMediaPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <SocialMediaContent />
    </Suspense>
  );
}
