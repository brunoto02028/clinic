"use client";

// Admin — Broadcast notifications to all or selected patients
import { useState, useEffect, useMemo } from "react";
import {
  Loader2, Send, Megaphone, Users, UserCheck, Trash2, ChevronDown, ChevronUp, Search, CheckCircle2, CalendarClock,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useVocab } from "@/hooks/use-vocab";

interface PatientLite {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Broadcast {
  id: string;
  title: string;
  content: string;
  audience: string;
  status?: string;
  scheduledFor?: string | null;
  recipientCount: number;
  readCount: number;
  recipients: { name: string; read: boolean }[];
  sentBy: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const { toast } = useToast();
  const { relabel } = useVocab();
  const [patients, setPatients] = useState<PatientLite[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);

  // Composer state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState<"all" | "selected">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [schedule, setSchedule] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/patients?limit=500").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/admin/broadcasts").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([pts, bcs]) => {
        const list = Array.isArray(pts) ? pts : pts.patients || pts.data || [];
        setPatients(
          list.map((p: any) => ({
            id: p.id,
            firstName: p.firstName || "",
            lastName: p.lastName || "",
            email: p.email || "",
          }))
        );
        setBroadcasts(Array.isArray(bcs) ? bcs : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredPatients = useMemo(() => {
    if (!search.trim()) return patients;
    const q = search.toLowerCase();
    return patients.filter(
      (p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
    );
  }, [patients, search]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const send = async () => {
    if (!title.trim() || !content.trim()) return;
    if (audience === "selected" && selectedIds.size === 0) {
      toast({ title: "Select at least one patient", variant: "destructive" });
      return;
    }
    if (schedule && !scheduledFor) {
      toast({ title: "Choose the schedule date/time", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const r = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          audience,
          patientIds: audience === "selected" ? Array.from(selectedIds) : [],
          scheduledFor: schedule && scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed");
      toast({
        title: data.scheduled ? "Notification scheduled!" : "Notification sent!",
        description: data.scheduled
          ? `Will be sent on ${new Date(data.scheduledFor).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}.`
          : `Delivered to ${data.recipientCount} patient${data.recipientCount > 1 ? "s" : ""}.`,
      });
      setTitle("");
      setContent("");
      setSelectedIds(new Set());
      setSchedule(false);
      setScheduledFor("");
      // refresh history
      fetch("/api/admin/broadcasts")
        .then((r) => (r.ok ? r.json() : []))
        .then((bcs) => setBroadcasts(Array.isArray(bcs) ? bcs : []));
    } catch (e: any) {
      toast({ title: "Error sending", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const removeBroadcast = async (id: string) => {
    if (!confirm("Delete this notification? Patients will no longer see it.")) return;
    await fetch("/api/admin/broadcasts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ broadcastId: id }),
    });
    setBroadcasts((b) => b.filter((x) => x.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          {relabel("Patient Notifications")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {relabel("Send announcements to all patients or only the selected ones. Everything is logged.")}
        </p>
      </div>

      {/* Composer */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">New Notification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Title (e.g. Schedule change next week)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="Write the notification…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px]"
          />

          {/* Audience selector */}
          <div className="flex items-center gap-2">
            <button
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors ${
                audience === "all"
                  ? "bg-primary/15 border-primary/40 text-primary font-semibold"
                  : "border-border text-muted-foreground"
              }`}
              onClick={() => setAudience("all")}
            >
              <Users className="h-3.5 w-3.5" />
              {relabel("All patients")} ({patients.length})
            </button>
            <button
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors ${
                audience === "selected"
                  ? "bg-primary/15 border-primary/40 text-primary font-semibold"
                  : "border-border text-muted-foreground"
              }`}
              onClick={() => setAudience("selected")}
            >
              <UserCheck className="h-3.5 w-3.5" />
              {relabel("Select patients")} {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
            </button>
          </div>

          {/* Patient selector */}
          {audience === "selected" && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="p-2 border-b border-border bg-muted/30">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search patient…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
              </div>
              <div className="max-h-[240px] overflow-y-auto divide-y divide-border/50">
                {filteredPatients.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedIds.has(p.id)}
                      onCheckedChange={() => toggle(p.id)}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">
                        {p.firstName} {p.lastName}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{p.email}</p>
                    </div>
                  </label>
                ))}
                {filteredPatients.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    No patients found.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Schedule option */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors ${
                schedule
                  ? "bg-primary/15 border-primary/40 text-primary font-semibold"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
              onClick={() => setSchedule(!schedule)}
            >
              <CalendarClock className="h-3.5 w-3.5" />
              {schedule ? "Scheduled for:" : "Schedule sending"}
            </button>
            {schedule && (
              <Input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="w-auto h-9 text-sm"
                min={new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16)}
              />
            )}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={send}
              disabled={sending || !title.trim() || !content.trim()}
              className="gap-2"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : schedule ? <CalendarClock className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {schedule
                ? "Schedule notification"
                : audience === "all"
                ? `Send to all (${patients.length})`
                : `Send to ${selectedIds.size} patient${selectedIds.size !== 1 ? "s" : ""}`}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {relabel("Each patient is notified by email/WhatsApp (as per preference) and sees the announcement in the portal.")}
          </p>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Notification History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {broadcasts.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              No notifications sent yet.
            </p>
          )}
          {broadcasts.map((b) => {
            const isOpen = expanded === b.id;
            return (
              <div key={b.id} className="border border-border rounded-xl overflow-hidden">
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/20"
                  onClick={() => setExpanded(isOpen ? null : b.id)}
                >
                  <Megaphone className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{b.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(b.createdAt).toLocaleString("en-GB", {
                        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                      })}{" "}
                      · {b.sentBy} · {b.audience === "all" ? "All" : "Selected"}
                    </p>
                  </div>
                  {b.status === "scheduled" ? (
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-500/15 text-amber-400 shrink-0 flex items-center gap-1">
                      <CalendarClock className="h-2.5 w-2.5" />
                      {b.scheduledFor ? new Date(b.scheduledFor).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Scheduled"}
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 shrink-0">
                      {b.readCount}/{b.recipientCount} read
                    </span>
                  )}
                  <button
                    className="text-red-400/60 hover:text-red-400 shrink-0"
                    onClick={(e) => { e.stopPropagation(); removeBroadcast(b.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                </div>
                {isOpen && (
                  <div className="px-4 py-3 border-t border-border/50 space-y-3">
                    <p className="text-xs whitespace-pre-wrap leading-relaxed">{b.content}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {b.recipients.map((r, i) => (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border ${
                            r.read
                              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                              : "bg-muted/40 border-border text-muted-foreground"
                          }`}
                        >
                          {r.read && <CheckCircle2 className="h-2.5 w-2.5" />}
                          {r.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
