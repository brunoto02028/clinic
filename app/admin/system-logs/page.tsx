"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Bug,
  Shield,
  Download,
  Copy,
  Check,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Activity,
  Database,
  Clock,
  Users,
  Server,
  Zap,
  Eye,
  CheckCircle2,
  XCircle,
  BarChart3,
  FileText,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ─────────────────────────────────────────────

interface SystemLog {
  id: string;
  level: string;
  category: string;
  message: string;
  details: any;
  source: string | null;
  method: string | null;
  path: string | null;
  statusCode: number | null;
  duration: number | null;
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
  ip: string | null;
  userAgent: string | null;
  resolved: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
}

interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userRole: string;
  userName: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  description: string;
  metadata: any;
  ip: string | null;
  userAgent: string | null;
  path: string | null;
  createdAt: string;
}

interface HealthData {
  status: string;
  uptime: number;
  latency: number;
  checks: Record<string, { status: string; latency?: number; error?: string }>;
  memory: { heapUsedMB: number; heapTotalMB: number; rssMB: number };
  consecutiveFailures: number;
}

// ─── Constants ─────────────────────────────────────────

const LEVEL_CONFIG: Record<string, { color: string; bg: string; icon: any }> = {
  DEBUG: { color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-800", icon: Bug },
  INFO: { color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950", icon: Info },
  WARN: { color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950", icon: AlertTriangle },
  ERROR: { color: "text-red-600", bg: "bg-red-50 dark:bg-red-950", icon: AlertCircle },
  CRITICAL: { color: "text-red-700", bg: "bg-red-100 dark:bg-red-900", icon: Zap },
};

const CATEGORY_ICONS: Record<string, any> = {
  AUTH: Shield,
  SYSTEM: Server,
  API: Activity,
  DATABASE: Database,
  SECURITY: Shield,
  USER_ACTION: Users,
  PERFORMANCE: BarChart3,
  SCHEDULED: Clock,
};

// ─── Component ─────────────────────────────────────────

export default function SystemLogsPage() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const [tab, setTab] = useState<"system" | "audit">("system");
  const [logs, setLogs] = useState<(SystemLog | AuditLog)[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats24h, setStats24h] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("");
  const [category, setCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("tab", tab === "system" ? "all" : "audit");
      params.set("page", String(page));
      params.set("limit", "50");
      if (search) params.set("search", search);
      if (level && tab === "system") params.set("level", level);
      if (category && tab === "system") params.set("category", category);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      const res = await fetch(`/api/admin/system-logs?${params}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      if (data.stats24h) setStats24h(data.stats24h);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
    }
  }, [tab, page, search, level, category, dateFrom, dateTo]);

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setHealth(data);
    } catch {
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const handleExportCSV = async () => {
    const params = new URLSearchParams();
    params.set("tab", tab === "system" ? "all" : "audit");
    params.set("format", "csv");
    if (search) params.set("search", search);
    if (level && tab === "system") params.set("level", level);
    if (category && tab === "system") params.set("category", category);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);

    const res = await fetch(`/api/admin/system-logs?${params}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tab}-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyAll = async () => {
    const text = logs
      .map((l) => {
        if (tab === "system") {
          const sl = l as SystemLog;
          return `[${new Date(sl.createdAt).toLocaleString()}] [${sl.level}] [${sl.category}] ${sl.message}${sl.userEmail ? ` | User: ${sl.userEmail}` : ""}${sl.ip ? ` | IP: ${sl.ip}` : ""}`;
        } else {
          const al = l as AuditLog;
          return `[${new Date(al.createdAt).toLocaleString()}] [${al.action}] ${al.description} | ${al.userEmail}${al.ip ? ` | IP: ${al.ip}` : ""}`;
        }
      })
      .join("\n");

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResolve = async (id: string, resolved: boolean) => {
    try {
      await fetch("/api/admin/system-logs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, resolved }),
      });
      fetchLogs();
    } catch (err) {
      console.error("Failed to resolve log:", err);
    }
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{T("admin.systemLogsTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {T("admin.systemLogsDesc")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyAll}>
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? "Copied!" : "Copy All"}
          </Button>
          <Button variant="default" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Health Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Server Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      health?.status === "healthy"
                        ? "bg-green-500 animate-pulse"
                        : health?.status === "degraded"
                        ? "bg-amber-500 animate-pulse"
                        : "bg-slate-300"
                    }`}
                  />
                  <span className="text-lg font-bold capitalize">
                    {healthLoading ? "..." : health?.status || "Unknown"}
                  </span>
                </div>
              </div>
              <Server className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Uptime</p>
                <p className="text-lg font-bold mt-1">
                  {healthLoading ? "..." : health ? formatUptime(health.uptime) : "N/A"}
                </p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Memory (Heap)</p>
                <p className="text-lg font-bold mt-1">
                  {healthLoading
                    ? "..."
                    : health
                    ? `${health.memory.heapUsedMB}MB / ${health.memory.heapTotalMB}MB`
                    : "N/A"}
                </p>
              </div>
              <Database className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Errors (24h)</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-lg font-bold text-red-600">
                    {(stats24h.ERROR || 0) + (stats24h.CRITICAL || 0)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {stats24h.WARN || 0} warnings
                  </span>
                </div>
              </div>
              <AlertCircle className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b">
        <button
          onClick={() => { setTab("system"); setPage(1); setLogs([]); setExpandedLog(null); }}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "system"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            System Logs
          </div>
        </button>
        <button
          onClick={() => { setTab("audit"); setPage(1); setLogs([]); setExpandedLog(null); }}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "audit"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Audit Trail
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={tab === "system" ? "Search messages, sources, emails..." : "Search actions, emails, descriptions..."}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>

        {tab === "system" && (
          <>
            <Select value={level} onValueChange={(v) => { setLevel(v === "ALL" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Levels</SelectItem>
                <SelectItem value="DEBUG">Debug</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
                <SelectItem value="WARN">Warning</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Select value={category} onValueChange={(v) => { setCategory(v === "ALL" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                <SelectItem value="AUTH">Auth</SelectItem>
                <SelectItem value="SYSTEM">System</SelectItem>
                <SelectItem value="API">API</SelectItem>
                <SelectItem value="DATABASE">Database</SelectItem>
                <SelectItem value="SECURITY">Security</SelectItem>
                <SelectItem value="USER_ACTION">User Action</SelectItem>
                <SelectItem value="PERFORMANCE">Performance</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}

        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="w-[150px]"
          placeholder="From"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="w-[150px]"
          placeholder="To"
        />

        {(search || level || category || dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setLevel("");
              setCategory("");
              setDateFrom("");
              setDateTo("");
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Log List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <FileText className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">No logs found</p>
              <p className="text-xs mt-1">
                {search || level || category ? "Try adjusting your filters" : "Logs will appear as the system runs"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {logs.map((log) =>
                tab === "system" ? (
                  <SystemLogRow
                    key={log.id}
                    log={log as SystemLog}
                    expanded={expandedLog === log.id}
                    onToggle={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    onResolve={handleResolve}
                  />
                ) : (
                  <AuditLogRow
                    key={log.id}
                    log={log as AuditLog}
                    expanded={expandedLog === log.id}
                    onToggle={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  />
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total} logs
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── System Log Row ────────────────────────────────────

function SystemLogRow({
  log,
  expanded,
  onToggle,
  onResolve,
}: {
  log: SystemLog;
  expanded: boolean;
  onToggle: () => void;
  onResolve: (id: string, resolved: boolean) => void;
}) {
  const config = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.INFO;
  const LevelIcon = config.icon;
  const CatIcon = CATEGORY_ICONS[log.category] || Activity;
  const time = new Date(log.createdAt);

  return (
    <div className={`${config.bg} transition-colors`}>
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:opacity-90"
      >
        <div className={`mt-0.5 ${config.color}`}>
          <LevelIcon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
              {log.level}
            </Badge>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
              <CatIcon className="h-3 w-3" />
              {log.category}
            </Badge>
            {log.source && (
              <span className="text-[10px] text-muted-foreground font-mono">{log.source}</span>
            )}
            {log.resolved && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-600 border-green-300">
                <CheckCircle2 className="h-3 w-3 mr-0.5" />
                Resolved
              </Badge>
            )}
          </div>
          <p className="text-sm mt-1 line-clamp-2">{log.message}</p>
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
            <span>{time.toLocaleDateString()} {time.toLocaleTimeString()}</span>
            {log.userEmail && <span>User: {log.userEmail}</span>}
            {log.ip && <span>IP: {log.ip}</span>}
            {log.method && log.path && (
              <span className="font-mono">{log.method} {log.path}</span>
            )}
            {log.statusCode && <span>Status: {log.statusCode}</span>}
            {log.duration != null && <span>{log.duration}ms</span>}
          </div>
        </div>
        <Eye className="h-4 w-4 text-muted-foreground/50 mt-1 shrink-0" />
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 ml-7">
          <div className="bg-background/80 rounded-lg p-3 text-xs space-y-2 border">
            {log.userAgent && (
              <div>
                <span className="font-semibold">User Agent:</span>{" "}
                <span className="text-muted-foreground break-all">{log.userAgent}</span>
              </div>
            )}
            {log.details && (
              <div>
                <span className="font-semibold">Details:</span>
                <pre className="mt-1 p-2 bg-muted rounded text-[11px] overflow-x-auto max-h-60">
                  {typeof log.details === "string"
                    ? log.details
                    : JSON.stringify(log.details, null, 2)}
                </pre>
              </div>
            )}
            {log.resolvedBy && (
              <div>
                <span className="font-semibold">Resolved by:</span>{" "}
                <span className="text-muted-foreground">{log.resolvedBy}</span>
                {log.resolvedAt && (
                  <span className="text-muted-foreground ml-2">
                    at {new Date(log.resolvedAt).toLocaleString()}
                  </span>
                )}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              {!log.resolved ? (
                <Button size="sm" variant="outline" onClick={() => onResolve(log.id, true)}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Mark Resolved
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => onResolve(log.id, false)}>
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Reopen
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Audit Log Row ─────────────────────────────────────

function AuditLogRow({
  log,
  expanded,
  onToggle,
}: {
  log: AuditLog;
  expanded: boolean;
  onToggle: () => void;
}) {
  const time = new Date(log.createdAt);
  const isLogin = log.action.includes("LOGIN");
  const isFailed = log.action.includes("FAILED");

  return (
    <div className={isFailed ? "bg-red-50/50 dark:bg-red-950/20" : ""}>
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors"
      >
        <div className="mt-0.5">
          {isFailed ? (
            <XCircle className="h-4 w-4 text-red-500" />
          ) : isLogin ? (
            <Shield className="h-4 w-4 text-blue-500" />
          ) : (
            <Users className="h-4 w-4 text-slate-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant={isFailed ? "destructive" : "secondary"}
              className="text-[10px] px-1.5 py-0 font-mono"
            >
              {log.action}
            </Badge>
            {log.entity && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {log.entity}
              </Badge>
            )}
          </div>
          <p className="text-sm mt-1">{log.description}</p>
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
            <span>{time.toLocaleDateString()} {time.toLocaleTimeString()}</span>
            <span>{log.userEmail}</span>
            <span className="capitalize">{log.userRole.toLowerCase()}</span>
            {log.ip && <span>IP: {log.ip}</span>}
          </div>
        </div>
        <Eye className="h-4 w-4 text-muted-foreground/50 mt-1 shrink-0" />
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 ml-7">
          <div className="bg-background/80 rounded-lg p-3 text-xs space-y-2 border">
            <div>
              <span className="font-semibold">User ID:</span>{" "}
              <span className="text-muted-foreground font-mono">{log.userId}</span>
            </div>
            {log.userName && (
              <div>
                <span className="font-semibold">Name:</span>{" "}
                <span className="text-muted-foreground">{log.userName}</span>
              </div>
            )}
            {log.path && (
              <div>
                <span className="font-semibold">Path:</span>{" "}
                <span className="text-muted-foreground font-mono">{log.path}</span>
              </div>
            )}
            {log.userAgent && (
              <div>
                <span className="font-semibold">User Agent:</span>{" "}
                <span className="text-muted-foreground break-all">{log.userAgent}</span>
              </div>
            )}
            {log.metadata && (
              <div>
                <span className="font-semibold">Metadata:</span>
                <pre className="mt-1 p-2 bg-muted rounded text-[11px] overflow-x-auto max-h-60">
                  {typeof log.metadata === "string"
                    ? log.metadata
                    : JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
