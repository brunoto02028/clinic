"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Calendar, Sparkles, Loader2, CheckCircle, AlertCircle,
  X, Zap, Instagram, Clock, Hash, RefreshCw, Save, Send,
  ChevronDown, ChevronUp, Film, Image as ImageIcon, Grid3x3,
  Filter, Download, Plus, Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const THEMES = [
  "MLS Laser", "Custom Insoles", "Biomechanics", "Foot Scan",
  "Sports Recovery", "Shockwave", "Posture", "Thermography",
  "Exercise Therapy", "Chronic Pain", "Bruno's Story", "Marketplace",
  "Blog Articles", "Patient Stories", "Clinic Life",
];

const DAY_COLORS: Record<string, string> = {
  REEL: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  CAROUSEL: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  IMAGE: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

const TONE_COLORS: Record<string, string> = {
  educational: "text-cyan-400",
  motivational: "text-amber-400",
  testimonial: "text-pink-400",
  promotional: "text-orange-400",
  behind_scenes: "text-violet-400",
  "behind-the-scenes": "text-violet-400",
};

interface CalendarPost {
  day: number;
  date: string;
  day_of_week: string;
  post_time: string;
  content_type: "REEL" | "CAROUSEL" | "IMAGE";
  tone: string;
  topic: string;
  hook: string;
  caption: string;
  hashtags: string[];
  visual_direction: string;
  bpr_connection: string;
  service?: string;
  saved?: boolean;
  saving?: boolean;
}

export default function ContentCalendarPage() {
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  // Config
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [postsPerWeek, setPostsPerWeek] = useState(7);
  const [language, setLanguage] = useState<"en" | "pt" | "both">("en");
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [includeMarketplace, setIncludeMarketplace] = useState(true);
  const [includeArticles, setIncludeArticles] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [savingAll, setSavingAll] = useState(false);

  async function generateCalendar() {
    setLoading(true);
    setError(null);
    setPosts([]);
    try {
      const res = await fetch("/api/admin/marketing/content-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          postsPerWeek,
          language,
          themes: selectedThemes,
          includeMarketplace,
          includeArticles,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPosts(data.posts || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function savePost(idx: number) {
    const post = posts[idx];
    setPosts(prev => prev.map((p, i) => i === idx ? { ...p, saving: true } : p));
    try {
      const scheduledAt = post.date && post.post_time
        ? new Date(`${post.date}T${post.post_time}:00`).toISOString()
        : null;

      await fetch("/api/admin/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: post.caption,
          hashtags: post.hashtags?.join(", ") || null,
          postType: post.content_type,
          mediaUrls: [],
          mediaPaths: [],
          accountId: null,
          scheduledAt,
          status: scheduledAt ? "SCHEDULED" : "DRAFT",
          aiGenerated: true,
          aiPrompt: post.topic,
        }),
      });
      setPosts(prev => prev.map((p, i) => i === idx ? { ...p, saved: true, saving: false } : p));
    } catch {
      setPosts(prev => prev.map((p, i) => i === idx ? { ...p, saving: false } : p));
    }
  }

  async function saveAllPosts() {
    setSavingAll(true);
    const unsaved = posts.map((_, i) => i).filter(i => !posts[i].saved);
    for (const idx of unsaved) {
      await savePost(idx);
      await new Promise(r => setTimeout(r, 200));
    }
    setSavingAll(false);
    setSuccess(`${unsaved.length} posts guardados/agendados!`);
    setTimeout(() => setSuccess(null), 4000);
  }

  function toggleTheme(t: string) {
    setSelectedThemes(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  }

  const savedCount = posts.filter(p => p.saved).length;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/marketing/instagram-studio" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            Calendário de Conteúdo
          </h1>
          <p className="text-sm text-muted-foreground">Gera 1 mês de posts com IA — agenda tudo de uma vez</p>
        </div>
        {posts.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{savedCount}/{posts.length} guardados</span>
            <Button onClick={saveAllPosts} disabled={savingAll || savedCount === posts.length}
              className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {savingAll ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
              {savingAll ? "A guardar..." : "Guardar Todos"}
            </Button>
          </div>
        )}
      </div>

      {/* Alerts */}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm">
          <CheckCircle className="h-4 w-4 shrink-0" /> {success}
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Config Card */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Start Date */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Data de Início</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
            </div>
            {/* Posts per week */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Posts por Semana</label>
              <div className="flex gap-1.5">
                {[3, 5, 7].map(n => (
                  <button key={n} onClick={() => setPostsPerWeek(n)}
                    className={`flex-1 py-2 rounded-lg border text-sm transition-all ${postsPerWeek === n ? "border-primary bg-primary/10 text-foreground font-semibold" : "border-border text-muted-foreground"}`}>
                    {n}/sem
                  </button>
                ))}
              </div>
            </div>
            {/* Language */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Idioma</label>
              <div className="flex gap-1.5">
                {(["en", "pt", "both"] as const).map(l => (
                  <button key={l} onClick={() => setLanguage(l)}
                    className={`flex-1 py-2 rounded-lg border text-sm transition-all ${language === l ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"}`}>
                    {l === "en" ? "🇬🇧" : l === "pt" ? "🇧🇷" : "🇬🇧+🇧🇷"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Themes */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
              Temas (opcional — deixa vazio para mix automático)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {THEMES.map(t => (
                <button key={t} onClick={() => toggleTheme(t)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${selectedThemes.includes(t) ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="flex flex-wrap gap-3 items-center">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              <input type="checkbox" checked={includeMarketplace} onChange={e => setIncludeMarketplace(e.target.checked)}
                className="rounded accent-primary" />
              Incluir Marketplace / PDFs
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              <input type="checkbox" checked={includeArticles} onChange={e => setIncludeArticles(e.target.checked)}
                className="rounded accent-primary" />
              Incluir Artigos do Blog
            </label>
          </div>

          <Button onClick={generateCalendar} disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-2.5">
            {loading
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> A gerar {postsPerWeek * 4} posts com Claude AI...</>
              : <><Sparkles className="h-4 w-4 mr-2" /> Gerar {postsPerWeek * 4} Posts para 1 Mês</>
            }
          </Button>
        </CardContent>
      </Card>

      {/* Loading state */}
      {loading && (
        <Card>
          <CardContent className="p-10 flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">A criar o teu calendário de conteúdo...</p>
              <p className="text-xs mt-1">Claude AI está a gerar {postsPerWeek * 4} posts únicos, captions, hashtags e sugestões visuais</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar Posts */}
      {posts.length > 0 && !loading && (
        <>
          {/* Summary bar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{posts.length} posts</span>
              <span>{posts.filter(p => p.content_type === "REEL").length} Reels</span>
              <span>{posts.filter(p => p.content_type === "CAROUSEL").length} Carrosséis</span>
              <span>{posts.filter(p => p.content_type === "IMAGE").length} Imagens</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}>
                <Grid3x3 className="h-3.5 w-3.5 mr-1" />
                {viewMode === "list" ? "Grid" : "Lista"}
              </Button>
              <Button variant="outline" size="sm" onClick={generateCalendar}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Regenerar
              </Button>
            </div>
          </div>

          {/* Posts List */}
          <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "space-y-3"}>
            {posts.map((post, idx) => (
              <Card key={idx} className={`transition-colors ${post.saved ? "border-emerald-500/30 bg-emerald-500/5" : "border-border"}`}>
                <CardContent className="p-0">
                  {/* Post Header */}
                  <button
                    onClick={() => setExpanded(expanded === idx ? null : idx)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/20 transition-colors text-left"
                  >
                    {/* Day number */}
                    <div className="h-9 w-9 rounded-lg bg-muted flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] text-muted-foreground leading-none">{post.day_of_week?.slice(0, 3)}</span>
                      <span className="text-sm font-bold text-foreground leading-tight">{post.day}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <Badge className={`text-[10px] shrink-0 ${DAY_COLORS[post.content_type] || "bg-muted"}`}>
                          {post.content_type === "REEL" ? <Film className="h-2.5 w-2.5 mr-0.5" /> : post.content_type === "CAROUSEL" ? <Grid3x3 className="h-2.5 w-2.5 mr-0.5" /> : <ImageIcon className="h-2.5 w-2.5 mr-0.5" />}
                          {post.content_type}
                        </Badge>
                        <span className={`text-[10px] font-medium ${TONE_COLORS[post.tone] || "text-muted-foreground"}`}>{post.tone}</span>
                        {post.service && <span className="text-[10px] text-muted-foreground">· {post.service}</span>}
                      </div>
                      <p className="text-xs font-medium text-foreground line-clamp-1">{post.topic}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">"{post.hook}"</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {post.post_time && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="h-3 w-3" /> {post.post_time}
                        </span>
                      )}
                      {post.saved ? (
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                          <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> Guardado
                        </Badge>
                      ) : (
                        <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); savePost(idx); }}
                          disabled={post.saving}
                          className="h-6 text-[10px] px-2">
                          {post.saving ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Save className="h-2.5 w-2.5 mr-0.5" />}
                          Guardar
                        </Button>
                      )}
                      {expanded === idx ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                  </button>

                  {/* Expanded content */}
                  {expanded === idx && (
                    <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                      {/* Hook */}
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-amber-400 font-semibold mb-0.5">🎣 HOOK</p>
                        <p className="text-xs font-semibold text-foreground">"{post.hook}"</p>
                      </div>
                      {/* Caption */}
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">Legenda</p>
                        <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{post.caption}</p>
                      </div>
                      {/* Hashtags */}
                      <div className="flex flex-wrap gap-1">
                        {post.hashtags?.slice(0, 10).map((h, i) => (
                          <span key={i} className="text-[10px] bg-muted/40 text-muted-foreground rounded px-1.5 py-0.5">#{h.replace(/^#/, "")}</span>
                        ))}
                        {(post.hashtags?.length || 0) > 10 && (
                          <span className="text-[10px] text-muted-foreground">+{(post.hashtags?.length || 0) - 10} mais</span>
                        )}
                      </div>
                      {/* Visual + BPR connection */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {post.visual_direction && (
                          <div className="bg-muted/30 rounded-lg px-3 py-2">
                            <p className="text-[10px] text-muted-foreground font-semibold mb-0.5">📹 Visual</p>
                            <p className="text-foreground">{post.visual_direction}</p>
                          </div>
                        )}
                        {post.bpr_connection && (
                          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                            <p className="text-[10px] text-blue-400 font-semibold mb-0.5">🔗 Ligação BPR</p>
                            <p className="text-blue-300">{post.bpr_connection}</p>
                          </div>
                        )}
                      </div>
                      {/* Actions */}
                      <div className="flex gap-2">
                        <Link href={`/admin/marketing/instagram-studio?topic=${encodeURIComponent(post.topic)}`} className="flex-1">
                          <Button size="sm" variant="outline" className="w-full text-xs">
                            <Zap className="h-3.5 w-3.5 mr-1" /> Criar no Studio
                          </Button>
                        </Link>
                        {!post.saved && (
                          <Button size="sm" onClick={() => savePost(idx)} disabled={post.saving}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                            {post.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                            {post.post_time ? "Agendar" : "Guardar Draft"}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {posts.length === 0 && !loading && (
        <Card>
          <CardContent className="p-12 flex flex-col items-center gap-4 text-muted-foreground">
            <Calendar className="h-14 w-14 opacity-20" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Cria o teu calendário de 1 mês</p>
              <p className="text-xs mt-1 max-w-sm">Configura as opções acima e clica em "Gerar Posts". Claude AI cria captions únicas, hooks virais, hashtags e sugestões visuais para cada dia.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
