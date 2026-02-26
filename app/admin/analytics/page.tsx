"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Eye,
  MousePointerClick,
  Target,
  Clock,
  ArrowUpDown,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  RefreshCw,
  TrendingUp,
  MapPin,
  ExternalLink,
  Flame,
  BarChart3,
  ChevronDown,
  ArrowLeft,
} from "lucide-react";

// ─── Types ───
interface Summary {
  totalVisitors: number;
  newVisitors: number;
  returningVisitors: number;
  totalPageViews: number;
  totalClicks: number;
  totalConversions: number;
  avgTimeOnSite: number;
  bounceRate: number;
}

interface PageStat {
  path: string;
  views: number;
  avgTime: number;
  avgScroll: number;
}

interface Referrer {
  domain: string;
  count: number;
}

interface DeviceData {
  device: string;
  count: number;
}

interface CountryData {
  country: string;
  countryCode: string;
  count: number;
}

interface BrowserData {
  browser: string;
  count: number;
}

interface Visitor {
  id: string;
  ip: string | null;
  country: string | null;
  countryCode: string | null;
  city: string | null;
  browser: string | null;
  os: string | null;
  deviceType: string | null;
  referrerDomain: string | null;
  totalPageViews: number;
  totalClicks: number;
  totalTimeOnSite: number;
  isReturning: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  language: string | null;
  screenWidth: number | null;
  screenHeight: number | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
}

interface ConversionType {
  type: string;
  label: string;
  count: number;
}

interface ChartPoint {
  date: string;
  count: number;
}

interface HeatmapClick {
  x: number;
  y: number;
  pageWidth: number | null;
  pageHeight: number | null;
  elementTag: string | null;
  elementText: string | null;
}

interface HeatmapPage {
  path: string;
  clicks: number;
}

interface ConversionRecord {
  id: string;
  type: string;
  label: string | null;
  pagePath: string | null;
  createdAt: string;
  visitor: {
    ip: string | null;
    country: string | null;
    city: string | null;
    browser: string | null;
    os: string | null;
    deviceType: string | null;
    referrerDomain: string | null;
  };
}

// ─── Helpers ───
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

const DEVICE_ICONS: Record<string, any> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

const CONVERSION_COLORS: Record<string, string> = {
  whatsapp_click: "bg-green-500/20 text-green-400",
  phone_call: "bg-blue-500/20 text-blue-400",
  booking_start: "bg-violet-500/20 text-violet-400",
  booking_complete: "bg-emerald-500/20 text-emerald-400",
  form_submit: "bg-amber-500/20 text-amber-400",
  signup: "bg-cyan-500/20 text-cyan-400",
  cta_click: "bg-pink-500/20 text-pink-400",
};

// ─── Mini Bar Chart (SVG) ───
function MiniBarChart({ data, height = 120 }: { data: ChartPoint[]; height?: number }) {
  if (!data || data.length === 0) return <div className="text-xs text-muted-foreground text-center py-8">No data yet</div>;
  const maxVal = Math.max(...data.map(d => d.count), 1);
  const W = 600;
  const barW = Math.max(4, (W - data.length * 2) / data.length);

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" preserveAspectRatio="none">
      {data.map((d, i) => {
        const barH = (d.count / maxVal) * (height - 20);
        const x = i * (barW + 2);
        return (
          <g key={i}>
            <rect
              x={x}
              y={height - barH - 16}
              width={barW}
              height={barH}
              rx={2}
              className="fill-primary/60 hover:fill-primary transition-colors"
            />
            {data.length <= 14 && (
              <text x={x + barW / 2} y={height - 2} textAnchor="middle" fontSize="8" className="fill-muted-foreground">
                {new Date(d.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Heatmap Canvas Component ───
function HeatmapCanvas({ clicks, width = 800, height = 2000 }: { clicks: HeatmapClick[]; width?: number; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || clicks.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Determine max page height from clicks
    const maxPageH = Math.max(...clicks.map(c => c.pageHeight || 3000), height);
    const scaleY = height / maxPageH;

    // Draw heat points
    const radius = 30;
    const intensityMap = new Float32Array(canvas.width * canvas.height);

    clicks.forEach(click => {
      const cx = (click.x / 100) * width;
      const cy = click.y * scaleY;

      const startX = Math.max(0, Math.floor(cx - radius));
      const endX = Math.min(canvas.width, Math.ceil(cx + radius));
      const startY = Math.max(0, Math.floor(cy - radius));
      const endY = Math.min(canvas.height, Math.ceil(cy + radius));

      for (let py = startY; py < endY; py++) {
        for (let px = startX; px < endX; px++) {
          const dx = px - cx;
          const dy = py - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < radius) {
            const intensity = 1 - dist / radius;
            intensityMap[py * canvas.width + px] += intensity * intensity;
          }
        }
      }
    });

    // Find max intensity
    let maxIntensity = 0;
    for (let i = 0; i < intensityMap.length; i++) {
      if (intensityMap[i] > maxIntensity) maxIntensity = intensityMap[i];
    }

    if (maxIntensity === 0) return;

    // Render heatmap
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    for (let i = 0; i < intensityMap.length; i++) {
      const val = intensityMap[i] / maxIntensity;
      if (val > 0.01) {
        const idx = i * 4;
        // Blue → Cyan → Green → Yellow → Red
        let r = 0, g = 0, b = 0;
        if (val < 0.25) {
          b = 255;
          g = Math.round(val * 4 * 255);
        } else if (val < 0.5) {
          g = 255;
          b = Math.round((1 - (val - 0.25) * 4) * 255);
        } else if (val < 0.75) {
          g = 255;
          r = Math.round((val - 0.5) * 4 * 255);
        } else {
          r = 255;
          g = Math.round((1 - (val - 0.75) * 4) * 255);
        }
        imageData.data[idx] = r;
        imageData.data[idx + 1] = g;
        imageData.data[idx + 2] = b;
        imageData.data[idx + 3] = Math.round(Math.min(val * 3, 1) * 180);
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, [clicks, width, height]);

  if (clicks.length === 0) {
    return <div className="text-center text-muted-foreground py-12">No click data for this page yet</div>;
  }

  return (
    <div className="relative border border-white/10 rounded-lg overflow-hidden bg-black/30">
      <canvas ref={canvasRef} style={{ width, height: Math.min(height, 600) }} className="w-full" />
      <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 rounded px-2 py-1">
        <div className="w-20 h-2 rounded-full" style={{ background: "linear-gradient(to right, blue, cyan, lime, yellow, red)" }} />
        <span className="text-[9px] text-white/70 ml-1">Low → High</span>
      </div>
    </div>
  );
}

// ─── Main Page ───
export default function AnalyticsPage() {
  const [range, setRange] = useState<string>("7d");
  const [tab, setTab] = useState<string>("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Overview data
  const [summary, setSummary] = useState<Summary | null>(null);
  const [pageViewsChart, setPageViewsChart] = useState<ChartPoint[]>([]);
  const [topPages, setTopPages] = useState<PageStat[]>([]);
  const [topReferrers, setTopReferrers] = useState<Referrer[]>([]);
  const [deviceBreakdown, setDeviceBreakdown] = useState<DeviceData[]>([]);
  const [countryBreakdown, setCountryBreakdown] = useState<CountryData[]>([]);
  const [browserBreakdown, setBrowserBreakdown] = useState<BrowserData[]>([]);
  const [recentVisitors, setRecentVisitors] = useState<Visitor[]>([]);
  const [conversionsByType, setConversionsByType] = useState<ConversionType[]>([]);

  // Heatmap data
  const [heatmapClicks, setHeatmapClicks] = useState<HeatmapClick[]>([]);
  const [heatmapPages, setHeatmapPages] = useState<HeatmapPage[]>([]);
  const [selectedHeatmapPage, setSelectedHeatmapPage] = useState<string>("/");

  // Conversions detail
  const [conversions, setConversions] = useState<ConversionRecord[]>([]);

  // Visitor detail expand
  const [expandedVisitor, setExpandedVisitor] = useState<string | null>(null);

  const fetchData = useCallback(async (section: string, extra?: Record<string, string>) => {
    try {
      const params = new URLSearchParams({ range, section, ...extra });
      const res = await fetch(`/api/admin/analytics?${params}`);
      if (!res.ok) throw new Error("Failed");
      return await res.json();
    } catch (err) {
      console.error("Analytics fetch error:", err);
      return null;
    }
  }, [range]);

  // Load overview
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      if (tab === "overview") {
        const data = await fetchData("overview");
        if (!cancelled && data) {
          setSummary(data.summary);
          setPageViewsChart(data.pageViewsChart || []);
          setTopPages(data.topPages || []);
          setTopReferrers(data.topReferrers || []);
          setDeviceBreakdown(data.deviceBreakdown || []);
          setCountryBreakdown(data.countryBreakdown || []);
          setBrowserBreakdown(data.browserBreakdown || []);
          setRecentVisitors(data.recentVisitors || []);
          setConversionsByType(data.conversionsByType || []);
        }
      } else if (tab === "heatmap") {
        const data = await fetchData("heatmap", { path: selectedHeatmapPage });
        if (!cancelled && data) {
          setHeatmapClicks(data.clicks || []);
          setHeatmapPages(data.pages || []);
        }
      } else if (tab === "conversions") {
        const data = await fetchData("conversions");
        if (!cancelled && data) {
          setConversions(data.conversions || []);
        }
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [tab, range, fetchData, selectedHeatmapPage]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Re-trigger by toggling range (force re-fetch)
    setRange(r => r);
    const data = await fetchData(tab === "heatmap" ? "heatmap" : tab === "conversions" ? "conversions" : "overview",
      tab === "heatmap" ? { path: selectedHeatmapPage } : undefined);
    if (data && tab === "overview") {
      setSummary(data.summary);
      setPageViewsChart(data.pageViewsChart || []);
      setTopPages(data.topPages || []);
      setTopReferrers(data.topReferrers || []);
      setDeviceBreakdown(data.deviceBreakdown || []);
      setCountryBreakdown(data.countryBreakdown || []);
      setBrowserBreakdown(data.browserBreakdown || []);
      setRecentVisitors(data.recentVisitors || []);
      setConversionsByType(data.conversionsByType || []);
    } else if (data && tab === "heatmap") {
      setHeatmapClicks(data.clicks || []);
      setHeatmapPages(data.pages || []);
    } else if (data && tab === "conversions") {
      setConversions(data.conversions || []);
    }
    setRefreshing(false);
  };

  const totalDevices = deviceBreakdown.reduce((s, d) => s + d.count, 0) || 1;
  const totalCountries = countryBreakdown.reduce((s, d) => s + d.count, 0) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Site Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Visitor tracking, heatmaps, and conversion analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {["today", "7d", "30d", "90d"].map(r => (
            <Button
              key={r}
              variant={range === r ? "default" : "outline"}
              size="sm"
              onClick={() => setRange(r)}
              className="text-xs"
            >
              {r === "today" ? "Today" : r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "90 Days"}
            </Button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10 pb-1">
        {[
          { id: "overview", label: "Overview", icon: BarChart3 },
          { id: "heatmap", label: "Heatmap", icon: Flame },
          { id: "conversions", label: "Conversions", icon: Target },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t.id ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* ─── OVERVIEW TAB ─── */}
          {tab === "overview" && summary && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Visitors", value: formatNumber(summary.totalVisitors), icon: Users, color: "text-blue-400", sub: `${summary.newVisitors} new, ${summary.returningVisitors} returning` },
                  { label: "Page Views", value: formatNumber(summary.totalPageViews), icon: Eye, color: "text-emerald-400", sub: `${(summary.totalPageViews / Math.max(summary.totalVisitors, 1)).toFixed(1)} per visitor` },
                  { label: "Avg Time", value: formatDuration(summary.avgTimeOnSite), icon: Clock, color: "text-amber-400", sub: `${summary.bounceRate}% bounce rate` },
                  { label: "Conversions", value: formatNumber(summary.totalConversions), icon: Target, color: "text-pink-400", sub: `${summary.totalVisitors > 0 ? ((summary.totalConversions / summary.totalVisitors) * 100).toFixed(1) : "0"}% rate` },
                ].map((kpi, i) => (
                  <Card key={i} className="border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                        <span className="text-2xl font-bold">{kpi.value}</span>
                      </div>
                      <p className="text-xs font-medium">{kpi.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Page Views Chart */}
              <Card className="border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Page Views Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MiniBarChart data={pageViewsChart} height={140} />
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Pages */}
                <Card className="border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Eye className="h-4 w-4 text-emerald-400" />
                      Top Pages
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5 max-h-80 overflow-y-auto">
                    {topPages.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No page data yet</p>}
                    {topPages.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-1.5 border-b border-white/5 last:border-0">
                        <span className="text-muted-foreground w-5 text-right">{i + 1}.</span>
                        <span className="flex-1 font-mono truncate">{p.path}</span>
                        <Badge variant="secondary" className="text-[10px]">{p.views} views</Badge>
                        <span className="text-muted-foreground w-12 text-right">{formatDuration(p.avgTime)}</span>
                        <span className="text-muted-foreground w-10 text-right">{p.avgScroll}%↓</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Conversions by Type */}
                <Card className="border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4 text-pink-400" />
                      Conversions by Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {conversionsByType.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No conversions yet</p>}
                    {conversionsByType.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <Badge className={`text-[10px] ${CONVERSION_COLORS[c.type] || "bg-white/10 text-white/70"}`}>
                          {c.type.replace(/_/g, " ")}
                        </Badge>
                        <span className="flex-1 truncate">{c.label || c.type}</span>
                        <span className="font-bold">{c.count}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Device Breakdown */}
                <Card className="border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-blue-400" />
                      Devices
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {deviceBreakdown.map((d, i) => {
                      const DevIcon = DEVICE_ICONS[d.device] || Monitor;
                      const pct = Math.round((d.count / totalDevices) * 100);
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 capitalize">
                              <DevIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              {d.device}
                            </span>
                            <span>{pct}% <span className="text-muted-foreground">({d.count})</span></span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {deviceBreakdown.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No data</p>}
                  </CardContent>
                </Card>

                {/* Browser Breakdown */}
                <Card className="border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Globe className="h-4 w-4 text-violet-400" />
                      Browsers
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {browserBreakdown.map((b, i) => {
                      const totalBrowsers = browserBreakdown.reduce((s, x) => s + x.count, 0) || 1;
                      const pct = Math.round((b.count / totalBrowsers) * 100);
                      return (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span>{b.browser}</span>
                          <span>{pct}% <span className="text-muted-foreground">({b.count})</span></span>
                        </div>
                      );
                    })}
                    {browserBreakdown.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No data</p>}
                  </CardContent>
                </Card>

                {/* Top Referrers */}
                <Card className="border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-amber-400" />
                      Traffic Sources
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {topReferrers.map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="truncate">{r.domain || "Direct"}</span>
                        <Badge variant="secondary" className="text-[10px]">{r.count}</Badge>
                      </div>
                    ))}
                    {topReferrers.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No referrer data</p>}
                  </CardContent>
                </Card>
              </div>

              {/* Countries */}
              <Card className="border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-400" />
                    Visitor Countries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {countryBreakdown.map((c, i) => {
                      const pct = Math.round((c.count / totalCountries) * 100);
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs bg-white/5 rounded-lg px-3 py-2">
                          <span className="text-lg">{countryCodeToFlag(c.countryCode)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{c.country}</p>
                            <p className="text-muted-foreground">{pct}% ({c.count})</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {countryBreakdown.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No geographic data yet</p>}
                </CardContent>
              </Card>

              {/* Recent Visitors */}
              <Card className="border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-400" />
                    Recent Visitors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {recentVisitors.map((v) => {
                      const DevIcon = DEVICE_ICONS[v.deviceType || "desktop"] || Monitor;
                      return (
                        <div key={v.id}>
                          <button
                            onClick={() => setExpandedVisitor(expandedVisitor === v.id ? null : v.id)}
                            className="w-full flex items-center gap-2 text-xs py-2 px-2 rounded-lg hover:bg-white/5 transition-colors"
                          >
                            <DevIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="font-mono text-muted-foreground w-24 truncate text-left">{v.ip || "—"}</span>
                            {v.country && <span className="shrink-0">{countryCodeToFlag(v.countryCode || "")}</span>}
                            <span className="truncate text-left flex-1">{v.city ? `${v.city}, ${v.country}` : v.country || "Unknown"}</span>
                            <span className="text-muted-foreground">{v.browser}</span>
                            <Badge variant="secondary" className="text-[10px]">{v.totalPageViews} pv</Badge>
                            <span className="text-muted-foreground">{formatDuration(v.totalTimeOnSite)}</span>
                            {v.isReturning && <Badge className="text-[10px] bg-emerald-500/20 text-emerald-400">returning</Badge>}
                            <ChevronDown className={`h-3 w-3 transition-transform ${expandedVisitor === v.id ? "rotate-180" : ""}`} />
                          </button>
                          {expandedVisitor === v.id && (
                            <div className="ml-8 mb-2 p-3 bg-white/5 rounded-lg text-xs space-y-1">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div><span className="text-muted-foreground">OS:</span> {v.os}</div>
                                <div><span className="text-muted-foreground">Screen:</span> {v.screenWidth}×{v.screenHeight}</div>
                                <div><span className="text-muted-foreground">Language:</span> {v.language}</div>
                                <div><span className="text-muted-foreground">Referrer:</span> {v.referrerDomain || "Direct"}</div>
                                <div><span className="text-muted-foreground">Clicks:</span> {v.totalClicks}</div>
                                <div><span className="text-muted-foreground">First seen:</span> {new Date(v.firstSeenAt).toLocaleString()}</div>
                                <div><span className="text-muted-foreground">Last seen:</span> {new Date(v.lastSeenAt).toLocaleString()}</div>
                                {v.utmSource && <div><span className="text-muted-foreground">UTM:</span> {v.utmSource}/{v.utmMedium}/{v.utmCampaign}</div>}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {recentVisitors.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No visitors recorded yet. The tracker starts collecting data once deployed.</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ─── HEATMAP TAB ─── */}
          {tab === "heatmap" && (
            <div className="space-y-4">
              {/* Page selector */}
              <Card className="border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium">Select Page:</span>
                    {heatmapPages.length === 0 && <span className="text-xs text-muted-foreground">No click data yet</span>}
                    {heatmapPages.map((p) => (
                      <Button
                        key={p.path}
                        variant={selectedHeatmapPage === p.path ? "default" : "outline"}
                        size="sm"
                        className="text-xs"
                        onClick={() => setSelectedHeatmapPage(p.path)}
                      >
                        {p.path} <Badge variant="secondary" className="ml-1 text-[10px]">{p.clicks}</Badge>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Heatmap */}
              <Card className="border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-400" />
                    Click Heatmap — {selectedHeatmapPage}
                    <Badge variant="secondary" className="text-[10px]">{heatmapClicks.length} clicks</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <HeatmapCanvas clicks={heatmapClicks} />
                </CardContent>
              </Card>

              {/* Click breakdown table */}
              {heatmapClicks.length > 0 && (
                <Card className="border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Most Clicked Elements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {Object.entries(
                        heatmapClicks.reduce((acc, c) => {
                          const key = `${c.elementTag || "?"}:${(c.elementText || "").slice(0, 40)}`;
                          acc[key] = (acc[key] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      )
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 20)
                        .map(([el, count], i) => {
                          const [tag, text] = el.split(":");
                          return (
                            <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-white/5">
                              <Badge variant="secondary" className="text-[10px] font-mono">{tag}</Badge>
                              <span className="flex-1 truncate text-muted-foreground">{text || "—"}</span>
                              <span className="font-bold">{count} clicks</span>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ─── CONVERSIONS TAB ─── */}
          {tab === "conversions" && (
            <div className="space-y-4">
              <Card className="border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4 text-pink-400" />
                    Conversion Events
                    <Badge variant="secondary" className="text-[10px]">{conversions.length} total</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 max-h-[600px] overflow-y-auto">
                    {conversions.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No conversions recorded yet</p>}
                    {conversions.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 text-xs py-2 border-b border-white/5 last:border-0">
                        <Badge className={`text-[10px] shrink-0 ${CONVERSION_COLORS[c.type] || "bg-white/10 text-white/70"}`}>
                          {c.type.replace(/_/g, " ")}
                        </Badge>
                        <span className="flex-1 truncate">{c.label || "—"}</span>
                        <span className="text-muted-foreground font-mono">{c.pagePath || "/"}</span>
                        {c.visitor.country && <span>{countryCodeToFlag(c.visitor.country)}</span>}
                        <span className="text-muted-foreground">{c.visitor.browser} / {c.visitor.os}</span>
                        <span className="text-muted-foreground w-32 text-right">{new Date(c.createdAt).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Country code to flag emoji ───
function countryCodeToFlag(code: string | null): string {
  if (!code || code.length !== 2) return "🌍";
  const upper = code.toUpperCase();
  return String.fromCodePoint(
    ...Array.from(upper).map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
  );
}
