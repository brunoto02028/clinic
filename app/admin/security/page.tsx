"use client";

import { useState, useEffect } from "react";
import {
  Shield, ShieldAlert, ShieldCheck, AlertTriangle, Ban, Eye,
  RefreshCw, Loader2, Lock, Globe, Activity, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface SecurityStats {
  totalEvents24h: number;
  criticalEvents: number;
  highEvents: number;
  blockedIPs: number;
  rateLimitedRequests: number;
  bruteForceAttempts: number;
  xssAttempts: number;
  sqlInjectionAttempts: number;
  scannerDetections: number;
  activeRateLimits: number;
  topAttackers: { ip: string; count: number; severity: string }[];
}

interface SecurityEvent {
  id: string;
  timestamp: string;
  type: string;
  ip: string;
  path: string;
  details: string;
  severity: string;
}

export default function SecurityPage() {
  const { toast } = useToast();
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/admin/security");
      const data = await res.json();
      if (res.ok) {
        setStats(data.stats);
        setEvents(data.events);
      }
    } catch (err) {
      console.error("Failed to fetch security data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchData(false), 30000);
    return () => clearInterval(interval);
  }, []);

  const blockIP = async (ip: string) => {
    try {
      const res = await fetch("/api/admin/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "block", ip }),
      });
      if (res.ok) {
        toast({ title: `IP ${ip} blocked` });
        fetchData(false);
      }
    } catch {
      toast({ title: "Failed to block IP", variant: "destructive" });
    }
  };

  const severityColor = (s: string) => {
    switch (s) {
      case "critical": return "bg-red-600 text-white";
      case "high": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "medium": return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
      default: return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  const typeIcon = (t: string) => {
    switch (t) {
      case "rate_limit": return <Zap className="h-3.5 w-3.5" />;
      case "brute_force": return <Lock className="h-3.5 w-3.5" />;
      case "xss_attempt": return <ShieldAlert className="h-3.5 w-3.5" />;
      case "sql_injection": return <AlertTriangle className="h-3.5 w-3.5" />;
      case "scan_detected": return <Eye className="h-3.5 w-3.5" />;
      case "blocked_ip": return <Ban className="h-3.5 w-3.5" />;
      default: return <Shield className="h-3.5 w-3.5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-7 w-7 text-red-600" />
            Cyber Security
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time threat monitoring, rate limiting, and attack prevention
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData(false)} disabled={refreshing} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Status Banner */}
      <Card className={`${
        (stats?.criticalEvents || 0) > 0 ? "border-red-500 bg-red-50 dark:bg-red-950/20" :
        (stats?.highEvents || 0) > 0 ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20" :
        "border-green-500 bg-green-50 dark:bg-green-950/20"
      }`}>
        <CardContent className="p-4 flex items-center gap-3">
          {(stats?.criticalEvents || 0) > 0 ? (
            <>
              <ShieldAlert className="h-6 w-6 text-red-600" />
              <div>
                <p className="font-semibold text-red-700 dark:text-red-400">CRITICAL: Active threats detected</p>
                <p className="text-sm text-red-600/80 dark:text-red-400/60">{stats?.criticalEvents} critical events in the last 24h</p>
              </div>
            </>
          ) : (stats?.highEvents || 0) > 0 ? (
            <>
              <AlertTriangle className="h-6 w-6 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-700 dark:text-amber-400">WARNING: Suspicious activity detected</p>
                <p className="text-sm text-amber-600/80 dark:text-amber-400/60">{stats?.highEvents} high-severity events in the last 24h</p>
              </div>
            </>
          ) : (
            <>
              <ShieldCheck className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-700 dark:text-green-400">SECURE: No active threats</p>
                <p className="text-sm text-green-600/80 dark:text-green-400/60">All systems operating normally. Monitoring active.</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="h-5 w-5 mx-auto text-blue-600 mb-1" />
            <p className="text-2xl font-bold">{stats?.totalEvents24h || 0}</p>
            <p className="text-xs text-muted-foreground">Events (24h)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Ban className="h-5 w-5 mx-auto text-red-600 mb-1" />
            <p className="text-2xl font-bold">{stats?.blockedIPs || 0}</p>
            <p className="text-xs text-muted-foreground">Blocked IPs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Zap className="h-5 w-5 mx-auto text-amber-600 mb-1" />
            <p className="text-2xl font-bold">{stats?.rateLimitedRequests || 0}</p>
            <p className="text-xs text-muted-foreground">Rate Limited</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Lock className="h-5 w-5 mx-auto text-purple-600 mb-1" />
            <p className="text-2xl font-bold">{stats?.bruteForceAttempts || 0}</p>
            <p className="text-xs text-muted-foreground">Brute Force</p>
          </CardContent>
        </Card>
      </div>

      {/* Attack Types */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-600" /> Attack Summary (24h)
            </h3>
            <div className="space-y-2">
              {[
                { label: "SQL Injection", count: stats?.sqlInjectionAttempts || 0, color: "text-red-600" },
                { label: "XSS Attempts", count: stats?.xssAttempts || 0, color: "text-orange-600" },
                { label: "Scanner Probes", count: stats?.scannerDetections || 0, color: "text-amber-600" },
                { label: "Brute Force", count: stats?.bruteForceAttempts || 0, color: "text-purple-600" },
                { label: "Rate Limits Hit", count: stats?.rateLimitedRequests || 0, color: "text-blue-600" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-foreground/70">{item.label}</span>
                  <span className={`font-mono font-bold ${item.color}`}>{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Attackers */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Globe className="h-4 w-4 text-amber-600" /> Top Suspicious IPs
            </h3>
            {stats?.topAttackers?.length ? (
              <div className="space-y-2">
                {stats.topAttackers.slice(0, 5).map((attacker) => (
                  <div key={attacker.ip} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{attacker.ip}</code>
                      <Badge className={severityColor(attacker.severity)} variant="secondary">
                        {attacker.severity}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{attacker.count}x</span>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-red-600" onClick={() => blockIP(attacker.ip)}>
                        <Ban className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No suspicious IPs detected</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Security Features Active */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3">Active Security Measures</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { name: "Rate Limiting", active: true, desc: "60-100 req/min" },
              { name: "Brute Force Protection", active: true, desc: "5 attempts, 30min block" },
              { name: "SQL Injection Filter", active: true, desc: "Pattern detection" },
              { name: "XSS Protection", active: true, desc: "Script/event detection" },
              { name: "Path Traversal Block", active: true, desc: "../ detection" },
              { name: "Scanner Detection", active: true, desc: "wp-admin, .env, etc" },
              { name: "HTTPS Forced", active: true, desc: "301 redirect" },
              { name: "Security Headers", active: true, desc: "HSTS, X-Frame, CSP" },
            ].map((feature) => (
              <div key={feature.name} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                <ShieldCheck className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium">{feature.name}</p>
                  <p className="text-[10px] text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Event Log */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" /> Recent Security Events
          </h3>
          {events.length === 0 ? (
            <div className="text-center py-8">
              <ShieldCheck className="h-10 w-10 mx-auto text-green-500 mb-2" />
              <p className="text-sm text-muted-foreground">No security events recorded. System is clean.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {events.map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 text-sm">
                  <div className="mt-0.5">{typeIcon(event.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge className={severityColor(event.severity)} variant="secondary">
                        {event.severity}
                      </Badge>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{event.ip}</code>
                      <span className="text-xs text-muted-foreground">{event.path}</span>
                    </div>
                    <p className="text-xs text-foreground/70 mt-0.5 truncate">{event.details}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(event.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
