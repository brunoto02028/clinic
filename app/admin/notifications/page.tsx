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
  pushSent?: number | null;
  pushFailed?: number | null;
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
  // A segunda versão. Inglês é a língua primária: é o que se escreve primeiro e
  // o que todo paciente recebe quando isto fica vazio. Quem tem pt-BR no perfil
  // recebe esta.
  const [titlePt, setTitlePt] = useState("");
  const [contentPt, setContentPt] = useState("");
  const [audience, setAudience] = useState<"all" | "selected">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [schedule, setSchedule] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");
  // O aviso no celular (077). Desligado por omissão, e com uma etapa de prévia
  // antes de sair: push não tem desfazer.
  const [pushNotify, setPushNotify] = useState(false);
  const [preview, setPreview] = useState<{ patients: number; devices: number } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

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

  /** A prévia: o texto exato e quantos aparelhos recebem de verdade. */
  const abrirPreview = async () => {
    if (!title.trim() || !content.trim()) return;
    if (audience === "selected" && selectedIds.size === 0) {
      toast({ title: "Select at least one patient", variant: "destructive" });
      return;
    }
    setLoadingPreview(true);
    try {
      const r = await fetch("/api/admin/broadcasts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          patientIds: audience === "selected" ? Array.from(selectedIds) : [],
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      setPreview({ patients: d.patients, devices: d.devices });
    } catch (e: any) {
      toast({ title: "Could not load the preview", description: e.message, variant: "destructive" });
    } finally {
      setLoadingPreview(false);
    }
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
          titlePt: titlePt.trim() || null,
          contentPt: contentPt.trim() || null,
          scheduledFor: schedule && scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
          pushNotify,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed");
      toast({
        title: data.scheduled ? "Notification scheduled!" : "Notification sent!",
        description: data.scheduled
          ? `Will be sent on ${new Date(data.scheduledFor).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}.`
          : `Delivered to ${data.recipientCount} patient${data.recipientCount > 1 ? "s" : ""}.` +
            (data.push ? ` Phone: ${data.push.sent} device${data.push.sent === 1 ? "" : "s"}.` : ""),
      });
      setTitle("");
      setContent("");
      setTitlePt("");
      setContentPt("");
      setSelectedIds(new Set());
      setSchedule(false);
      setScheduledFor("");
      setPreview(null);
      setPushNotify(false);
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
          <div className="space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              English
            </span>
            <Input
              placeholder="Title (e.g. Schedule change next week)"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setPreview(null); }}
            />
            <Textarea
              placeholder="Write the notification…"
              value={content}
              onChange={(e) => { setContent(e.target.value); setPreview(null); }}
              className="min-h-[100px]"
            />
          </div>

          {/* Opcional de propósito. Obrigar as duas versões toda vez significa,
              na prática, não escrever — e uma mensagem em inglês que a pessoa
              talvez leia é melhor que silêncio. */}
          <div className="space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Português <span className="font-normal normal-case">— optional; pt-BR patients get this one</span>
            </span>
            <Input
              placeholder="Título (ex.: Mudança de horário na próxima semana)"
              value={titlePt}
              onChange={(e) => { setTitlePt(e.target.value); setPreview(null); }}
            />
            <Textarea
              placeholder="Escreva o aviso…"
              value={contentPt}
              onChange={(e) => { setContentPt(e.target.value); setPreview(null); }}
              className="min-h-[100px]"
            />
          </div>

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
              onClick={() => {
                // Agendar desmarca o push. Sem isto o estado continuava `true`,
                // ia no corpo e o servidor o descartava — a pessoa saía
                // achando que tinha armado o aviso no celular.
                const ligando = !schedule;
                setSchedule(ligando);
                if (ligando) setPushNotify(false);
                setPreview(null);
              }}
            >
              <CalendarClock className="h-3.5 w-3.5" />
              {schedule ? "Scheduled for:" : "Schedule sending"}
            </button>
            {schedule && (
              <span className="text-[10px] text-muted-foreground">
                A scheduled notice goes to the app only — no phone alert.
              </span>
            )}
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

          {/* O push é opt-in e some quando o envio é agendado: agendar push
              tiraria a chance de cancelar, que é a única proteção que existe. */}
          {!schedule && (
            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <Checkbox
                checked={pushNotify}
                onCheckedChange={(v) => { setPushNotify(!!v); setPreview(null); }}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Also notify on their phone</span>
                <span className="block text-[10px] text-muted-foreground">
                  A push notification for whoever has the app. It shows on the lock screen — write it
                  as something anyone nearby could read.
                </span>
              </span>
            </label>
          )}

          {preview ? (
            /* A prévia. Nada sai antes desta tela: push não tem desfazer. */
            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">This is what goes out:</p>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">English</p>
                <p className="text-sm font-semibold mt-1">{title}</p>
                <p className="text-sm whitespace-pre-wrap mt-1">{content}</p>
              </div>
              {/* As duas versões na prévia: é aqui que se percebe que o
                  português ficou para trás depois de uma edição no inglês. */}
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Português</p>
                {contentPt.trim() ? (
                  <>
                    <p className="text-sm font-semibold mt-1">{titlePt || title}</p>
                    <p className="text-sm whitespace-pre-wrap mt-1">{contentPt}</p>
                  </>
                ) : (
                  <p className="text-sm italic text-muted-foreground mt-1">
                    Not written — pt-BR patients will get the English version.
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                In the app for <strong>{preview.patients}</strong> patient{preview.patients === 1 ? "" : "s"}
                {pushNotify ? (
                  preview.devices > 0 ? (
                    <> · on the phone of <strong>{preview.devices}</strong> device{preview.devices === 1 ? "" : "s"}</>
                  ) : (
                    <> · <strong>no phone will ring</strong>: nobody has the app with notifications on yet</>
                  )
                ) : null}
              </p>
              <div className="flex gap-2">
                <Button onClick={send} disabled={sending} className="gap-2">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send now
                </Button>
                <Button variant="outline" onClick={() => setPreview(null)} disabled={sending}>
                  Back
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button
                onClick={schedule ? send : abrirPreview}
                disabled={sending || loadingPreview || !title.trim() || !content.trim()}
                className="gap-2"
              >
                {sending || loadingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : schedule ? <CalendarClock className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                {schedule
                  ? "Schedule notification"
                  : audience === "all"
                  ? `Review and send to all (${patients.length})`
                  : `Review and send to ${selectedIds.size} patient${selectedIds.size !== 1 ? "s" : ""}`}
              </Button>
            </div>
          )}
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
                  {/* O que aconteceu no celular. Antes isto vivia só no toast:
                      recarregar a página perdia os números, e uma falha inteira
                      do serviço não deixava rastro. */}
                  {b.pushSent != null && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${
                        b.pushFailed ? "bg-amber-500/15 text-amber-400" : "bg-sky-500/15 text-sky-400"
                      }`}
                      title={b.pushFailed ? `${b.pushFailed} did not go through` : undefined}
                    >
                      📱 {b.pushSent}
                      {b.pushFailed ? ` · ${b.pushFailed} failed` : ""}
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
