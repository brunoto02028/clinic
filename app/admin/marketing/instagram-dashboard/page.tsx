"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Instagram, Heart, MessageCircle, Users, Image as ImageIcon,
  ExternalLink, RefreshCw, Loader2, AlertCircle, CheckCircle, Clock,
  TrendingUp, Grid, List, Globe, FileText, Wifi, WifiOff, Zap, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface IGMedia {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
}

interface IGProfile {
  user_id: string;
  username: string;
  name: string;
  biography?: string;
  website?: string;
  profile_picture_url?: string;
  followers_count: number;
  following_count: number;
  media_count: number;
}

interface OverviewData {
  profile: IGProfile;
  media: IGMedia[];
  accountName: string;
  tokenExpiresAt: string | null;
  daysLeft: number | null;
  publishedPosts: number;
}

export default function InstagramDashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [refreshingToken, setRefreshingToken] = useState(false);
  const [tokenRefreshed, setTokenRefreshed] = useState(false);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchOverview();
    autoRefreshToken();
  }, []);

  async function fetchOverview() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/social/instagram-overview");
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to load");
      }
      const d = await res.json();
      setData(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function deletePost(mediaId: string) {
    setDeletingId(mediaId);
    try {
      const res = await fetch(`/api/admin/social/instagram-delete?mediaId=${mediaId}`, { method: "DELETE" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Delete failed");
      // Remove from local state
      setData(prev => prev ? { ...prev, media: prev.media.filter(m => m.id !== mediaId) } : prev);
      setDeleteConfirm(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  }

  async function autoRefreshToken() {
    try {
      await fetch("/api/admin/social/refresh-token");
    } catch {}
  }

  async function manualRefreshToken() {
    setRefreshingToken(true);
    try {
      const res = await fetch("/api/admin/social/refresh-token", { method: "POST" });
      const d = await res.json();
      if (d.results?.[0]?.success) {
        setTokenRefreshed(true);
        fetchOverview();
        setTimeout(() => setTokenRefreshed(false), 3000);
      }
    } catch {} finally {
      setRefreshingToken(false);
    }
  }

  function formatCount(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return String(n);
  }

  function timeAgo(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime();
    const d = Math.floor(diff / 86400000);
    if (d === 0) return "Today";
    if (d === 1) return "Yesterday";
    if (d < 7) return `${d}d ago`;
    if (d < 30) return `${Math.floor(d / 7)}w ago`;
    return `${Math.floor(d / 30)}mo ago`;
  }

  const tokenWarning = data?.daysLeft != null && data.daysLeft <= 10;
  const tokenOk = data?.daysLeft != null && data.daysLeft > 10;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/marketing/instagram" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <Instagram className="h-4 w-4 text-white" />
            </div>
            Instagram — Panorama Geral
          </h1>
          <p className="text-sm text-muted-foreground">Feed, estatísticas e gestão da conta</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchOverview} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
        <Link href="/admin/marketing/instagram-studio">
          <Button size="sm" className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
            <Zap className="h-4 w-4 mr-1" /> Criar Post
          </Button>
        </Link>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-400">{error}</p>
              {error.includes("No connected") && (
                <Link href="/admin/marketing/instagram-connect" className="text-xs text-blue-400 underline mt-1 block">
                  → Conectar Instagram
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {data && (
        <>
          {/* Profile Card */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                {data.profile.profile_picture_url ? (
                  <img
                    src={data.profile.profile_picture_url}
                    alt={data.profile.username}
                    className="h-16 w-16 rounded-full object-cover border-2 border-pink-500/30"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                    <Instagram className="h-8 w-8 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-lg text-foreground">@{data.profile.username}</h2>
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1 text-xs">
                      <Wifi className="h-3 w-3" /> Conectado
                    </Badge>
                    {data.profile.website && (
                      <a href={data.profile.website} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-400 flex items-center gap-1 hover:underline">
                        <Globe className="h-3 w-3" /> {data.profile.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{data.profile.name}</p>
                  {data.profile.biography && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{data.profile.biography}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {tokenWarning ? (
                    <div className="flex items-center gap-1.5 text-amber-400 text-xs font-medium">
                      <Clock className="h-3.5 w-3.5" />
                      Token expira em {data.daysLeft}d
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Token: {data.daysLeft}d restantes
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={manualRefreshToken}
                    disabled={refreshingToken}
                    className="text-xs h-7"
                  >
                    {refreshingToken ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                    {tokenRefreshed ? "Renovado ✓" : "Renovar Token"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard icon={<Users className="h-5 w-5 text-pink-400" />} label="Seguidores" value={formatCount(data.profile.followers_count)} />
            <StatCard icon={<ImageIcon className="h-5 w-5 text-blue-400" />} label="Total de Posts" value={formatCount(data.profile.media_count)} />
            <StatCard icon={<FileText className="h-5 w-5 text-emerald-400" />} label="Publicados via BPR" value={String(data.publishedPosts)} />
          </div>

          {/* Feed */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Feed Recente</CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant={view === "grid" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setView("grid")}
                  >
                    <Grid className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={view === "list" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setView("list")}
                  >
                    <List className="h-3.5 w-3.5" />
                  </Button>
                  <a
                    href={`https://www.instagram.com/${data.profile.username}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="h-7 text-xs ml-2">
                      <ExternalLink className="h-3 w-3 mr-1" /> Ver no Instagram
                    </Button>
                  </a>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {data.media.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">Nenhum post encontrado</div>
              ) : view === "grid" ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {(showAllPosts ? data.media : data.media.slice(0, 12)).map((m) => (
                    <div key={m.id} className="group relative aspect-square overflow-hidden rounded-lg bg-muted">
                      {(m.media_url || m.thumbnail_url) ? (
                        <img
                          src={m.media_url || m.thumbnail_url}
                          alt={m.caption?.slice(0, 40) || "post"}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <div className="flex gap-3 text-white text-sm font-semibold">
                          <span className="flex items-center gap-1"><Heart className="h-4 w-4" /> {m.like_count ?? "—"}</span>
                          <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> {m.comments_count ?? "—"}</span>
                        </div>
                        <div className="flex gap-1.5">
                          <a href={m.permalink} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-[10px] bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded backdrop-blur-sm flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" /> Ver
                          </a>
                          {deleteConfirm === m.id ? (
                            <button onClick={() => deletePost(m.id)} disabled={deletingId === m.id}
                              className="text-[10px] bg-red-500 hover:bg-red-600 text-white px-2 py-0.5 rounded flex items-center gap-1">
                              {deletingId === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirmar"}
                            </button>
                          ) : (
                            <button onClick={() => setDeleteConfirm(m.id)}
                              className="text-[10px] bg-red-500/70 hover:bg-red-500 text-white px-2 py-0.5 rounded flex items-center gap-1">
                              <Trash2 className="h-3 w-3" /> Apagar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {(showAllPosts ? data.media : data.media.slice(0, 12)).map((m) => (
                    <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
                      <a href={m.permalink} target="_blank" rel="noopener noreferrer"
                        className="h-12 w-12 rounded-lg overflow-hidden shrink-0 bg-muted">
                        {(m.media_url || m.thumbnail_url) ? (
                          <img src={m.media_url || m.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </a>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground line-clamp-1">{m.caption || "(sem legenda)"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(m.timestamp)}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                        <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {m.like_count ?? "—"}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {m.comments_count ?? "—"}</span>
                        <a href={m.permalink} target="_blank" rel="noopener noreferrer"
                          className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        {deleteConfirm === m.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => deletePost(m.id)} disabled={deletingId === m.id}
                              className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded flex items-center gap-1">
                              {deletingId === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirmar"}
                            </button>
                            <button onClick={() => setDeleteConfirm(null)}
                              className="text-[10px] text-muted-foreground hover:text-foreground px-1">✕</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(m.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!showAllPosts && data.media.length > 12 && (
                <button
                  onClick={() => setShowAllPosts(true)}
                  className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/30 transition-colors mt-2"
                >
                  Ver todos os {data.media.length} posts
                </button>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">{icon}</div>
        <div>
          <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
