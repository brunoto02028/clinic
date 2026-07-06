"use client";

// Admin — Treatment Protocol Library (reusable templates per service/equipment/condition)
import { useState, useEffect, useMemo } from "react";
import {
  Loader2, Plus, Pencil, Trash2, Search, ClipboardList, Send, X, Dumbbell,
  Building2, Home, Stethoscope, ChevronDown, ChevronUp, UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const PHASES = [
  { value: "SHORT_TERM", label: "Curto Prazo (1-4 sem)" },
  { value: "MEDIUM_TERM", label: "Médio Prazo (4-12 sem)" },
  { value: "LONG_TERM", label: "Longo Prazo (12+ sem)" },
];

const ITEM_TYPES = [
  { value: "IN_CLINIC", label: "Na Clínica", icon: Building2 },
  { value: "HOME_EXERCISE", label: "Exercício em Casa", icon: Dumbbell },
  { value: "HOME_CARE", label: "Autocuidado", icon: Home },
  { value: "ASSESSMENT", label: "Avaliação", icon: Stethoscope },
];

const EQUIPMENT_OPTIONS = [
  "MLS Laser", "ALCE Eletroestimulação", "Ultrassom 1 MHz", "TENS", "EMS",
  "Termografia", "Análise Biomecânica", "HRV", "Terapia Manual", "Shockwave",
];

interface TemplateItem {
  id?: string;
  phase: string;
  itemType: string;
  sortOrder: number;
  title: string;
  description?: string | null;
  instructions?: string | null;
  treatmentTypeName?: string | null;
  sessionDuration?: number | null;
  sessionsPerWeek?: number | null;
  exerciseId?: string | null;
  exercise?: { id: string; name: string } | null;
  sets?: number | null;
  reps?: number | null;
  holdSeconds?: number | null;
  restSeconds?: number | null;
  frequency?: string | null;
  startWeek?: number;
  endWeek?: number | null;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  condition: string | null;
  bodyRegion: string | null;
  equipment: string[];
  category: string | null;
  estimatedWeeks: number | null;
  sessionsPerWeek: number | null;
  isActive: boolean;
  items: TemplateItem[];
  createdBy?: { firstName: string; lastName: string };
  updatedAt: string;
}

interface ExerciseLite {
  id: string;
  name: string;
  bodyRegion: string;
  defaultSets: number | null;
  defaultReps: number | null;
}

interface PatientLite {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const emptyItem = (): TemplateItem => ({
  phase: "SHORT_TERM",
  itemType: "HOME_EXERCISE",
  sortOrder: 0,
  title: "",
});

export default function ProtocolsPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [exercises, setExercises] = useState<ExerciseLite[]>([]);
  const [patients, setPatients] = useState<PatientLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState<any>({});
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [saving, setSaving] = useState(false);

  // Assign state
  const [assignOpen, setAssignOpen] = useState<Template | null>(null);
  const [assignPatientId, setAssignPatientId] = useState("");
  const [assignNote, setAssignNote] = useState("");
  const [assignSearch, setAssignSearch] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const seedProtocols = async () => {
    if (!confirm("Inserir os 10 protocolos clínicos de base? Esta ação cria os templates na biblioteca.")) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/protocols/seed", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast({ title: `✅ ${data.created} protocolos criados!`, description: data.protocols?.join(", ") });
        load();
      } else {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  const load = () => {
    Promise.all([
      fetch("/api/admin/protocols").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/admin/exercises?all=true").then((r) => (r.ok ? r.json() : { exercises: [] })),
      fetch("/api/admin/patients?limit=500").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([tpl, ex, pts]) => {
        setTemplates(Array.isArray(tpl) ? tpl : []);
        setExercises(ex.exercises || []);
        setPatients(Array.isArray(pts) ? pts : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.condition || "").toLowerCase().includes(q) ||
        t.equipment.some((e) => e.toLowerCase().includes(q))
    );
  }, [templates, search]);

  const filteredPatients = useMemo(() => {
    if (!assignSearch.trim()) return patients;
    const q = assignSearch.toLowerCase();
    return patients.filter(
      (p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) || (p.email || "").toLowerCase().includes(q)
    );
  }, [patients, assignSearch]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "", condition: "", bodyRegion: "", equipment: [], estimatedWeeks: "", sessionsPerWeek: "" });
    setItems([emptyItem()]);
    setEditorOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({
      name: t.name,
      description: t.description || "",
      condition: t.condition || "",
      bodyRegion: t.bodyRegion || "",
      equipment: t.equipment || [],
      estimatedWeeks: t.estimatedWeeks ?? "",
      sessionsPerWeek: t.sessionsPerWeek ?? "",
    });
    setItems(t.items.map((it) => ({ ...it })));
    setEditorOpen(true);
  };

  const save = async () => {
    if (!form.name?.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    const validItems = items.filter((it) => it.title.trim());
    setSaving(true);
    try {
      const payload = {
        ...form,
        estimatedWeeks: form.estimatedWeeks ? Number(form.estimatedWeeks) : null,
        sessionsPerWeek: form.sessionsPerWeek ? Number(form.sessionsPerWeek) : null,
        items: validItems.map((it, idx) => ({ ...it, sortOrder: idx })),
      };
      const r = await fetch(editing ? `/api/admin/protocols/${editing.id}` : "/api/admin/protocols", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Failed");
      toast({ title: editing ? "Protocolo actualizado" : "Protocolo criado" });
      setEditorOpen(false);
      load();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: Template) => {
    if (!confirm(`Eliminar o protocolo "${t.name}"?`)) return;
    await fetch(`/api/admin/protocols/${t.id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((x) => x.id !== t.id));
  };

  const assign = async () => {
    if (!assignOpen || !assignPatientId) return;
    setAssigning(true);
    try {
      const r = await fetch(`/api/admin/protocols/${assignOpen.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: assignPatientId, note: assignNote }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed");
      toast({
        title: "Protocolo atribuído!",
        description: `O paciente foi notificado. ${data.prescriptions > 0 ? `${data.prescriptions} exercício(s) prescritos.` : ""}`,
      });
      setAssignOpen(null);
      setAssignPatientId("");
      setAssignNote("");
    } catch (e: any) {
      toast({ title: "Erro ao atribuir", description: e.message, variant: "destructive" });
    } finally {
      setAssigning(false);
    }
  };

  const updateItem = (idx: number, patch: Partial<TemplateItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Protocolos de Atendimento
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Templates reutilizáveis por condição, serviço e equipamento. Atribua a pacientes com um clique.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {templates.length === 0 && (
            <Button variant="outline" onClick={seedProtocols} disabled={seeding} className="gap-2 text-primary border-primary/30 hover:bg-primary/5">
              {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
              Carregar 10 Protocolos Base
            </Button>
          )}
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Protocolo
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Procurar por nome, condição ou equipamento…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Template list */}
      {filtered.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <ClipboardList className="h-12 w-12 text-muted-foreground/20 mx-auto" />
          <p className="text-sm text-muted-foreground">
            {templates.length === 0 ? (
            <>
              Nenhum protocolo ainda.{" "}
              <button onClick={seedProtocols} disabled={seeding} className="text-primary underline hover:no-underline">
                {seeding ? "A carregar..." : "Carregar os 10 protocolos de base"}
              </button>
            </>
          ) : "Nenhum resultado."}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((t) => {
          const isOpen = expanded === t.id;
          const byPhase = PHASES.map((p) => ({
            ...p,
            items: t.items.filter((it) => it.phase === p.value),
          })).filter((p) => p.items.length > 0);
          return (
            <Card key={t.id} className="overflow-hidden">
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/20"
                onClick={() => setExpanded(isOpen ? null : t.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{t.name}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {t.condition && <Badge variant="outline" className="text-[9px]">{t.condition}</Badge>}
                    {t.bodyRegion && <Badge variant="outline" className="text-[9px]">{t.bodyRegion}</Badge>}
                    {t.equipment.slice(0, 4).map((e) => (
                      <Badge key={e} className="text-[9px] bg-primary/10 text-primary border-primary/20">{e}</Badge>
                    ))}
                    <span className="text-[10px] text-muted-foreground">
                      {t.items.length} item{t.items.length !== 1 ? "s" : ""}
                      {t.estimatedWeeks ? ` · ${t.estimatedWeeks} semanas` : ""}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="gap-1.5 h-8 shrink-0"
                  onClick={(e) => { e.stopPropagation(); setAssignOpen(t); }}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Atribuir
                </Button>
                <Button
                  variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0"
                  onClick={(e) => { e.stopPropagation(); openEdit(t); }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400/70 hover:text-red-400 shrink-0"
                  onClick={(e) => { e.stopPropagation(); remove(t); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </div>

              {isOpen && (
                <CardContent className="pt-0 pb-4 space-y-4 border-t border-border/50">
                  {t.description && <p className="text-xs text-muted-foreground mt-3 whitespace-pre-wrap">{t.description}</p>}
                  {byPhase.map((p) => (
                    <div key={p.value} className="space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-primary mt-2">{p.label}</p>
                      {p.items.map((it, i) => {
                        const TypeIcon = ITEM_TYPES.find((x) => x.value === it.itemType)?.icon || Dumbbell;
                        return (
                          <div key={i} className="flex items-start gap-2.5 pl-2">
                            <TypeIcon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium">
                                {it.title}
                                {it.exercise && <span className="text-primary"> → {it.exercise.name}</span>}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {[
                                  it.sets && it.reps ? `${it.sets}×${it.reps}` : null,
                                  it.holdSeconds ? `${it.holdSeconds}s hold` : null,
                                  it.frequency,
                                  it.sessionDuration ? `${it.sessionDuration} min` : null,
                                  it.sessionsPerWeek ? `${it.sessionsPerWeek}×/semana` : null,
                                ].filter(Boolean).join(" · ")}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* ── Editor Dialog ── */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Protocolo" : "Novo Protocolo"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs">Nome do Protocolo *</Label>
                <Input
                  value={form.name || ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="ex.: Osteoartrite do Joelho — Conservador Fase 1-3"
                />
              </div>
              <div>
                <Label className="text-xs">Condição</Label>
                <Input
                  value={form.condition || ""}
                  onChange={(e) => setForm({ ...form, condition: e.target.value })}
                  placeholder="ex.: Osteoartrite do joelho"
                />
              </div>
              <div>
                <Label className="text-xs">Região do Corpo</Label>
                <Input
                  value={form.bodyRegion || ""}
                  onChange={(e) => setForm({ ...form, bodyRegion: e.target.value })}
                  placeholder="ex.: KNEE"
                />
              </div>
              <div>
                <Label className="text-xs">Duração estimada (semanas)</Label>
                <Input
                  type="number"
                  value={form.estimatedWeeks ?? ""}
                  onChange={(e) => setForm({ ...form, estimatedWeeks: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Sessões por semana</Label>
                <Input
                  type="number"
                  value={form.sessionsPerWeek ?? ""}
                  onChange={(e) => setForm({ ...form, sessionsPerWeek: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Descrição</Label>
                <Textarea
                  value={form.description || ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="min-h-[70px]"
                  placeholder="Objectivos, critérios de progressão, notas clínicas…"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs mb-1.5 block">Equipamentos utilizados</Label>
                <div className="flex flex-wrap gap-1.5">
                  {EQUIPMENT_OPTIONS.map((eq) => {
                    const active = (form.equipment || []).includes(eq);
                    return (
                      <button
                        key={eq}
                        type="button"
                        className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                          active
                            ? "bg-primary/15 border-primary/40 text-primary font-semibold"
                            : "border-border text-muted-foreground hover:border-primary/30"
                        }`}
                        onClick={() =>
                          setForm({
                            ...form,
                            equipment: active
                              ? (form.equipment || []).filter((x: string) => x !== eq)
                              : [...(form.equipment || []), eq],
                          })
                        }
                      >
                        {eq}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Items builder */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold">Itens do Protocolo</Label>
                <Button
                  variant="outline" size="sm" className="h-7 text-xs gap-1"
                  onClick={() => setItems((prev) => [...prev, emptyItem()])}
                >
                  <Plus className="h-3 w-3" /> Adicionar Item
                </Button>
              </div>

              {items.map((it, idx) => (
                <div key={idx} className="border border-border rounded-xl p-3 space-y-3 relative">
                  <button
                    className="absolute top-2 right-2 text-red-400/60 hover:text-red-400"
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px]">Fase</Label>
                      <Select value={it.phase} onValueChange={(v) => updateItem(idx, { phase: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PHASES.map((p) => <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px]">Tipo</Label>
                      <Select value={it.itemType} onValueChange={(v) => updateItem(idx, { itemType: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ITEM_TYPES.map((p) => <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px]">Título *</Label>
                      <Input
                        className="h-8 text-xs"
                        value={it.title}
                        onChange={(e) => updateItem(idx, { title: e.target.value })}
                        placeholder="ex.: MLS Laser no joelho"
                      />
                    </div>
                  </div>

                  {it.itemType === "HOME_EXERCISE" && (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div className="col-span-2">
                        <Label className="text-[10px]">Exercício da biblioteca (vídeo)</Label>
                        <Select
                          value={it.exerciseId || "none"}
                          onValueChange={(v) => {
                            const ex = exercises.find((x) => x.id === v);
                            updateItem(idx, {
                              exerciseId: v === "none" ? null : v,
                              title: it.title || ex?.name || "",
                              sets: it.sets ?? ex?.defaultSets ?? null,
                              reps: it.reps ?? ex?.defaultReps ?? null,
                            });
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sem vídeo" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="text-xs">— Sem vídeo —</SelectItem>
                            {exercises.map((ex) => (
                              <SelectItem key={ex.id} value={ex.id} className="text-xs">
                                {ex.name} ({ex.bodyRegion})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px]">Séries</Label>
                        <Input className="h-8 text-xs" type="number" value={it.sets ?? ""} onChange={(e) => updateItem(idx, { sets: e.target.value ? Number(e.target.value) : null })} />
                      </div>
                      <div>
                        <Label className="text-[10px]">Reps</Label>
                        <Input className="h-8 text-xs" type="number" value={it.reps ?? ""} onChange={(e) => updateItem(idx, { reps: e.target.value ? Number(e.target.value) : null })} />
                      </div>
                      <div>
                        <Label className="text-[10px]">Frequência</Label>
                        <Input className="h-8 text-xs" value={it.frequency || ""} onChange={(e) => updateItem(idx, { frequency: e.target.value })} placeholder="3×/semana" />
                      </div>
                    </div>
                  )}

                  {it.itemType === "IN_CLINIC" && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[10px]">Serviço / Equipamento</Label>
                        <Input className="h-8 text-xs" value={it.treatmentTypeName || ""} onChange={(e) => updateItem(idx, { treatmentTypeName: e.target.value })} placeholder="ex.: MLS Laser Therapy" />
                      </div>
                      <div>
                        <Label className="text-[10px]">Duração (min)</Label>
                        <Input className="h-8 text-xs" type="number" value={it.sessionDuration ?? ""} onChange={(e) => updateItem(idx, { sessionDuration: e.target.value ? Number(e.target.value) : null })} />
                      </div>
                      <div>
                        <Label className="text-[10px]">Sessões/semana</Label>
                        <Input className="h-8 text-xs" type="number" value={it.sessionsPerWeek ?? ""} onChange={(e) => updateItem(idx, { sessionsPerWeek: e.target.value ? Number(e.target.value) : null })} />
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-[10px]">Instruções para o paciente</Label>
                    <Textarea
                      className="text-xs min-h-[48px]"
                      value={it.instructions || ""}
                      onChange={(e) => updateItem(idx, { instructions: e.target.value })}
                      placeholder="Como executar, precauções, progressão…"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Guardar Alterações" : "Criar Protocolo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign Dialog ── */}
      <Dialog open={Boolean(assignOpen)} onOpenChange={(o) => { if (!o) setAssignOpen(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Atribuir &quot;{assignOpen?.name}&quot;</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Procurar paciente…"
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <div className="max-h-[200px] overflow-y-auto border border-border rounded-lg divide-y divide-border/50">
              {filteredPatients.map((p) => (
                <button
                  key={p.id}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/30 transition-colors ${
                    assignPatientId === p.id ? "bg-primary/10 border-l-2 border-primary" : ""
                  }`}
                  onClick={() => setAssignPatientId(p.id)}
                >
                  <p className="font-medium">{p.firstName} {p.lastName}</p>
                  <p className="text-[10px] text-muted-foreground">{p.email}</p>
                </button>
              ))}
              {filteredPatients.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum paciente.</p>
              )}
            </div>
            <Textarea
              placeholder="Nota para o paciente (opcional)…"
              value={assignNote}
              onChange={(e) => setAssignNote(e.target.value)}
              className="text-sm min-h-[60px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(null)}>Cancelar</Button>
            <Button onClick={assign} disabled={assigning || !assignPatientId} className="gap-2">
              {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Atribuir e Notificar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
