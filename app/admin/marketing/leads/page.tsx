"use client";

import { useState, useEffect } from "react";
import {
  Users, Mail, MailCheck, Download, CalendarCheck, Ban, Loader2,
  RefreshCw, Search, Tag,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LeadEvent {
  type: string;
  createdAt: string;
  meta?: Record<string, unknown> | null;
}

interface LeadContact {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  source: string | null;
  cluster: string | null;
  consent: boolean;
  confirmed: boolean;
  confirmedAt: string | null;
  subscribed: boolean;
  createdAt: string;
  events: LeadEvent[];
  stage: "captured" | "confirmed" | "downloaded" | "booked" | "unsubscribed";
}

const STAGE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  captured: { label: "Captured", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Mail },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-800 border-blue-200", icon: MailCheck },
  downloaded: { label: "Downloaded", color: "bg-indigo-100 text-indigo-800 border-indigo-200", icon: Download },
  booked: { label: "Booked", color: "bg-green-100 text-green-800 border-green-200", icon: CalendarCheck },
  unsubscribed: { label: "Unsubscribed", color: "bg-gray-100 text-gray-500 border-gray-200", icon: Ban },
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminLeadMagnetPage() {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<LeadContact[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [clusters, setClusters] = useState<{ cluster: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterCluster, setFilterCluster] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => { fetchContacts(); }, [filterStage, filterCluster]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStage !== "all") params.set("stage", filterStage);
      if (filterCluster !== "all") params.set("cluster", filterCluster);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/admin/lead-magnet?${params.toString()}`);
      const data = await res.json();
      setContacts(data.contacts || []);
      setCounts(data.counts || {});
      setClusters(data.clusters || []);
    } catch {
      toast({ title: "Error loading leads", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
            Leads
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lead-magnet funnel: captured → confirmed → downloaded → booked.
          </p>
        </div>
        <button onClick={fetchContacts} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm hover:bg-muted transition-colors self-start sm:self-auto">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Funnel counts */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(["captured", "confirmed", "downloaded", "booked", "unsubscribed"] as const).map((key) => {
          const cfg = STAGE_CONFIG[key];
          const Icon = cfg.icon;
          return (
            <button
              key={key}
              onClick={() => setFilterStage(filterStage === key ? "all" : key)}
              className={`border rounded-xl p-3 text-left transition-colors ${filterStage === key ? "bg-primary/5 border-primary" : "bg-card hover:bg-muted"}`}
            >
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Icon className="h-3.5 w-3.5" /> {cfg.label}
              </div>
              <div className="text-xl font-bold">{counts[key] ?? 0}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchContacts()}
            placeholder="Search email or name…"
            className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm bg-background"
          />
        </div>
        <select
          value={filterCluster}
          onChange={(e) => setFilterCluster(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm bg-background"
        >
          <option value="all">All clusters</option>
          {clusters.map((c) => (
            <option key={c.cluster} value={c.cluster}>{c.cluster} ({c.count})</option>
          ))}
        </select>
        {filterStage !== "all" && (
          <button onClick={() => setFilterStage("all")} className="px-3 py-2 rounded-lg border text-xs hover:bg-muted">
            Clear stage filter
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No leads here yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((c) => {
            const cfg = STAGE_CONFIG[c.stage];
            const StageIcon = cfg.icon;
            return (
              <div key={c.id} className="border rounded-xl p-4 bg-card">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{[c.firstName, c.lastName].filter(Boolean).join(" ") || c.email}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3" /> {c.email}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {c.cluster && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-muted text-muted-foreground">
                            <Tag className="h-3 w-3" /> {c.cluster}
                          </span>
                        )}
                        {c.source && <span className="text-[11px] text-muted-foreground">source: {c.source}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Captured {formatDate(c.createdAt)}
                        {c.confirmedAt && <> · Confirmed {formatDate(c.confirmedAt)}</>}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold border ${cfg.color}`}>
                    <StageIcon className="h-3 w-3" /> {cfg.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
