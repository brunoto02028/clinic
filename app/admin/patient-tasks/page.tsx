"use client";

// Admin — Patient Action Requests (tasks) with multi-recipient + custom types + read receipts
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Bell, Send, CheckCircle2, Clock, AlertTriangle,
  User, FileText, Mic, Shield, CreditCard, CalendarCheck,
  Loader2, Plus, Filter, Users, UserCheck, Search, X, Trash2, Check, CheckCheck,
} from "lucide-react";

const BUILTIN_TYPES = [
  { value: "CUSTOM", label: "Custom Message", icon: Bell },
  { value: "UPLOAD_DOCUMENT", label: "Upload Document", icon: FileText },
  { value: "COMPLETE_SCREENING", label: "Complete Screening", icon: Shield },
  { value: "RECORD_AUDIO", label: "Record Pre-Consultation", icon: Mic },
  { value: "SIGN_CONSENT", label: "Sign Consent", icon: FileText },
  { value: "UPDATE_PROFILE", label: "Update Profile", icon: User },
  { value: "CONFIRM_APPOINTMENT", label: "Confirm Appointment", icon: CalendarCheck },
  { value: "PAY_INVOICE", label: "Pay Invoice", icon: CreditCard },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-400 border border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  normal: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  low: "bg-muted text-muted-foreground border border-border",
};

const STATUS_BADGES: Record<string, { color: string; label: string }> = {
  pending: { color: "bg-amber-500/15 text-amber-400 border border-amber-500/30", label: "Pending" },
  in_progress: { color: "bg-blue-500/15 text-blue-400 border border-blue-500/30", label: "In Progress" },
  completed: { color: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30", label: "Completed" },
  cancelled: { color: "bg-muted text-muted-foreground border border-border", label: "Cancelled" },
};

interface CustomType {
  id: string;
  name: string;
  namePt: string | null;
  defaultTitle: string | null;
  defaultTitlePt: string | null;
  defaultDescription: string | null;
  defaultDescriptionPt: string | null;
  actionUrl: string | null;
}

export default function PatientTasksPage() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);

  // Custom types
  const [customTypes, setCustomTypes] = useState<CustomType[]>([]);
  const [showNewType, setShowNewType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeNamePt, setNewTypeNamePt] = useState("");
  const [savingType, setSavingType] = useState(false);

  // Form state
  const [audience, setAudience] = useState<"one" | "selected" | "all">("one");
  const [type, setType] = useState("CUSTOM");
  const [title, setTitle] = useState("");
  const [titlePt, setTitlePt] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionPt, setDescriptionPt] = useState("");
  const [priority, setPriority] = useState("normal");
  const [dueDate, setDueDate] = useState("");
  const [actionUrl, setActionUrl] = useState("");

  // Single patient search
  const [patientId, setPatientId] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  // Multi-patient selector
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [multiSearch, setMultiSearch] = useState("");

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/patient-tasks?status=${filterStatus}`);
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch {
      toast({ title: "Failed to load tasks", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, [filterStatus]);

  useEffect(() => {
    fetch("/api/admin/task-types")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setCustomTypes(Array.isArray(d) ? d : []))
      .catch(() => {});
    fetch("/api/admin/patients?limit=500")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setAllPatients(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const filteredMulti = useMemo(() => {
    if (!multiSearch.trim()) return allPatients;
    const q = multiSearch.toLowerCase();
    return allPatients.filter(
      (p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) || (p.email || "").toLowerCase().includes(q)
    );
  }, [allPatients, multiSearch]);

  const searchPatients = async (q: string) => {
    setPatientSearch(q);
    if (q.length < 2) { setPatientResults([]); return; }
    try {
      const res = await fetch(`/api/admin/patients?search=${encodeURIComponent(q)}&limit=5`);
      const data = await res.json();
      setPatientResults(Array.isArray(data) ? data : data.patients || []);
    } catch {}
  };

  const selectPatient = (p: any) => {
    setSelectedPatient(p);
    setPatientId(p.id);
    setPatientSearch(`${p.firstName} ${p.lastName}`);
    setPatientResults([]);
  };

  const applyType = (value: string) => {
    setType(value);
    const custom = customTypes.find((c) => `CUSTOM:${c.id}` === value);
    if (custom) {
      if (custom.defaultTitle) setTitle(custom.defaultTitle);
      if (custom.defaultTitlePt) setTitlePt(custom.defaultTitlePt);
      if (custom.defaultDescription) setDescription(custom.defaultDescription);
      if (custom.defaultDescriptionPt) setDescriptionPt(custom.defaultDescriptionPt);
      if (custom.actionUrl) setActionUrl(custom.actionUrl);
    }
  };

  const createType = async () => {
    if (!newTypeName.trim()) return;
    setSavingType(true);
    try {
      const r = await fetch("/api/admin/task-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTypeName,
          namePt: newTypeNamePt || undefined,
          defaultTitle: title || undefined,
          defaultTitlePt: titlePt || undefined,
          defaultDescription: description || undefined,
          defaultDescriptionPt: descriptionPt || undefined,
          actionUrl: actionUrl || undefined,
        }),
      });
      if (!r.ok) throw new Error("Failed");
      const created = await r.json();
      setCustomTypes((prev) => [...prev, created]);
      setType(`CUSTOM:${created.id}`);
      setShowNewType(false);
      setNewTypeName("");
      setNewTypeNamePt("");
      toast({ title: "Tipo criado!", description: "Guardado para reutilização futura." });
    } catch {
      toast({ title: "Erro ao criar tipo", variant: "destructive" });
    } finally {
      setSavingType(false);
    }
  };

  const deleteType = async (id: string) => {
    if (!confirm("Eliminar este tipo personalizado?")) return;
    await fetch("/api/admin/task-types", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setCustomTypes((prev) => prev.filter((c) => c.id !== id));
    if (type === `CUSTOM:${id}`) setType("CUSTOM");
  };

  const handleSubmit = async () => {
    if (!title) {
      toast({ title: "Título é obrigatório", variant: "destructive" });
      return;
    }
    if (audience === "one" && !patientId) {
      toast({ title: "Selecione um paciente", variant: "destructive" });
      return;
    }
    if (audience === "selected" && selectedIds.size === 0) {
      toast({ title: "Selecione pelo menos um paciente", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const apiType = type.startsWith("CUSTOM:") ? "CUSTOM" : type;
      const res = await fetch("/api/admin/patient-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          patientId: audience === "one" ? patientId : undefined,
          patientIds: audience === "selected" ? Array.from(selectedIds) : undefined,
          type: apiType,
          title,
          titlePt: titlePt || undefined,
          description: description || undefined,
          descriptionPt: descriptionPt || undefined,
          priority,
          dueDate: dueDate || undefined,
          actionUrl: actionUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({
        title: `Enviado a ${data.count} paciente${data.count > 1 ? "s" : ""}!`,
        description: `${data.notified} notificado${data.notified !== 1 ? "s" : ""} por email/WhatsApp.`,
      });

      setShowForm(false);
      setPatientId("");
      setSelectedPatient(null);
      setPatientSearch("");
      setSelectedIds(new Set());
      setAudience("one");
      setType("CUSTOM");
      setTitle(""); setTitlePt("");
      setDescription(""); setDescriptionPt("");
      setPriority("normal"); setDueDate(""); setActionUrl("");
      fetchTasks();
    } catch (err: any) {
      toast({ title: "Falha ao criar task", description: err.message, variant: "destructive" });
    }
    setSending(false);
  };

  const audienceBtn = (val: "one" | "selected" | "all", icon: any, label: string) => {
    const Icon = icon;
    return (
      <button
        type="button"
        className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors ${
          audience === val
            ? "bg-primary/15 border-primary/40 text-primary font-semibold"
            : "border-border text-muted-foreground hover:border-primary/30"
        }`}
        onClick={() => setAudience(val)}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Patient Action Requests
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Envie tasks e avisos a um paciente, a vários ou a todos. Notificação in-app, email e push.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" /> New Request
        </Button>
      </div>

      {/* New Task Form — dark theme, high contrast */}
      {showForm && (
        <Card className="border-primary/30 bg-card">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Send className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg text-foreground">New Action Request</h2>
            </div>

            {/* Audience selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Destinatários *</Label>
              <div className="flex flex-wrap items-center gap-2">
                {audienceBtn("one", User, "Um paciente")}
                {audienceBtn("selected", UserCheck, `Vários ${selectedIds.size > 0 ? `(${selectedIds.size})` : ""}`)}
                {audienceBtn("all", Users, `Todos (${allPatients.length})`)}
              </div>
            </div>

            {/* Single patient search */}
            {audience === "one" && (
              <div className="space-y-1 relative">
                <Label className="text-xs font-semibold text-foreground">Patient *</Label>
                <Input
                  placeholder="Procurar paciente por nome ou email…"
                  value={patientSearch}
                  onChange={(e) => searchPatients(e.target.value)}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground/60"
                />
                {patientResults.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {patientResults.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => selectPatient(p)}
                        className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                      >
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{p.firstName} {p.lastName}</span>
                        <span className="text-muted-foreground text-xs ml-auto">{p.email}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedPatient && (
                  <p className="text-xs text-emerald-400 mt-1">
                    ✓ {selectedPatient.firstName} {selectedPatient.lastName} ({selectedPatient.email})
                  </p>
                )}
              </div>
            )}

            {/* Multi patient selector */}
            {audience === "selected" && (
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="p-2 border-b border-border bg-muted/30">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Procurar paciente…"
                      value={multiSearch}
                      onChange={(e) => setMultiSearch(e.target.value)}
                      className="pl-8 h-8 text-xs bg-background"
                    />
                  </div>
                </div>
                <div className="max-h-[200px] overflow-y-auto divide-y divide-border/50">
                  {filteredMulti.map((p) => (
                    <label key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 cursor-pointer">
                      <Checkbox
                        checked={selectedIds.has(p.id)}
                        onCheckedChange={() => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                            return next;
                          });
                        }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{p.firstName} {p.lastName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{p.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {audience === "all" && (
              <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
                ⚠ Esta task será enviada a <strong>todos os {allPatients.length} pacientes activos</strong>.
              </p>
            )}

            {/* Type + Priority + Due date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">Task Type</Label>
                  <button
                    type="button"
                    className="text-[10px] text-primary hover:underline"
                    onClick={() => setShowNewType(!showNewType)}
                  >
                    + Novo tipo
                  </button>
                </div>
                <Select value={type} onValueChange={applyType}>
                  <SelectTrigger className="bg-background border-border text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BUILTIN_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                    {customTypes.length > 0 && (
                      <div className="px-2 py-1 text-[9px] font-bold text-muted-foreground uppercase">Personalizados</div>
                    )}
                    {customTypes.map((c) => (
                      <SelectItem key={c.id} value={`CUSTOM:${c.id}`}>
                        ★ {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {type.startsWith("CUSTOM:") && (
                  <button
                    type="button"
                    className="text-[10px] text-red-400/70 hover:text-red-400 flex items-center gap-1"
                    onClick={() => deleteType(type.replace("CUSTOM:", ""))}
                  >
                    <Trash2 className="h-2.5 w-2.5" /> Eliminar este tipo
                  </button>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="bg-background border-border text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Due Date (opcional)</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="bg-background border-border text-foreground" />
              </div>
            </div>

            {/* Inline new type creator */}
            {showNewType && (
              <div className="border border-primary/30 bg-primary/5 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-primary">Criar tipo personalizado</p>
                <p className="text-[10px] text-muted-foreground">
                  O título, descrição e URL preenchidos abaixo serão guardados como predefinição deste tipo.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input placeholder="Nome do tipo (EN) — ex.: Bring Gym Clothes" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} className="h-8 text-xs bg-background" />
                  <Input placeholder="Nome (PT) — opcional" value={newTypeNamePt} onChange={(e) => setNewTypeNamePt(e.target.value)} className="h-8 text-xs bg-background" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs gap-1" onClick={createType} disabled={savingType || !newTypeName.trim()}>
                    {savingType ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Guardar tipo
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowNewType(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Title */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Title (English) *</Label>
                <Input placeholder="e.g. Please upload your ID document" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-background border-border text-foreground placeholder:text-muted-foreground/60" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Titulo (Portugues)</Label>
                <Input placeholder="e.g. Por favor envie seu documento" value={titlePt} onChange={(e) => setTitlePt(e.target.value)} className="bg-background border-border text-foreground placeholder:text-muted-foreground/60" />
              </div>
            </div>

            {/* Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Description (English)</Label>
                <Textarea placeholder="Additional details..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="bg-background border-border text-foreground placeholder:text-muted-foreground/60" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Descricao (Portugues)</Label>
                <Textarea placeholder="Detalhes adicionais..." value={descriptionPt} onChange={(e) => setDescriptionPt(e.target.value)} rows={3} className="bg-background border-border text-foreground placeholder:text-muted-foreground/60" />
              </div>
            </div>

            {/* Action URL */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Action URL (opcional — para onde o paciente deve ir?)</Label>
              <Input placeholder="e.g. /dashboard/recordings or /dashboard/profile" value={actionUrl} onChange={(e) => setActionUrl(e.target.value)} className="bg-background border-border text-foreground placeholder:text-muted-foreground/60" />
            </div>

            {/* Submit */}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} disabled={sending} className="gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {audience === "all"
                  ? `Enviar a todos (${allPatients.length})`
                  : audience === "selected"
                  ? `Enviar a ${selectedIds.size} paciente${selectedIds.size !== 1 ? "s" : ""}`
                  : "Send to Patient"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{tasks.length} tasks</span>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p>No tasks found. Create one to request action from a patient.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const statusBadge = STATUS_BADGES[task.status] || STATUS_BADGES.pending;
            const typeConfig = BUILTIN_TYPES.find((t) => t.value === task.type);
            const TypeIcon = typeConfig?.icon || Bell;

            return (
              <Card key={task.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <TypeIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{task.title}</h3>
                          <Badge className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[task.priority]}`}>
                            {task.priority}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {task.patient?.firstName} {task.patient?.lastName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(task.createdAt).toLocaleDateString("en-GB")}
                          </span>
                          {task.dueDate && (
                            <span className="flex items-center gap-1 text-amber-400">
                              <AlertTriangle className="h-3 w-3" />
                              Due: {new Date(task.dueDate).toLocaleDateString("en-GB")}
                            </span>
                          )}
                          {/* Delivery + read receipts */}
                          <span className="flex items-center gap-1 text-emerald-400" title="Entregue na área do paciente">
                            <Check className="h-3 w-3" />
                            Entregue{task.emailSent ? " + email" : ""}
                          </span>
                          {task.viewedAt ? (
                            <span className="flex items-center gap-1 text-emerald-400 font-semibold" title={`Lida em ${new Date(task.viewedAt).toLocaleString("pt-BR")}`}>
                              <CheckCheck className="h-3 w-3" />
                              Lida
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-muted-foreground/60" title="Ainda não visualizada pelo paciente">
                              <CheckCheck className="h-3 w-3 opacity-40" />
                              Não lida
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={statusBadge.color}>{statusBadge.label}</Badge>
                      {task.status === "completed" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
