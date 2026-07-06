"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Brain, Plus, Users, AlertTriangle, CheckCircle2, TrendingUp,
  Activity, Moon, Zap, Heart, Flame, Wind, Dna, Pencil, Trash2,
  X, Save, UserCheck, ChevronDown, ChevronUp, Watch,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "SLEEP",      label: "Sleep",       icon: Moon,     color: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20" },
  { value: "NUTRITION",  label: "Nutrition",   icon: Flame,    color: "bg-orange-500/15 text-orange-400 border-orange-500/20" },
  { value: "EXERCISE",   label: "Exercise",    icon: Activity, color: "bg-green-500/15 text-green-400 border-green-500/20" },
  { value: "LIGHT",      label: "Light",       icon: Zap,      color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" },
  { value: "COLD",       label: "Cold",        icon: Wind,     color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20" },
  { value: "BREATHWORK", label: "Breathwork",  icon: Wind,     color: "bg-violet-500/15 text-violet-400 border-violet-500/20" },
  { value: "SUPPLEMENT", label: "Supplement",  icon: Dna,      color: "bg-teal-500/15 text-teal-400 border-teal-500/20" },
  { value: "HRV",        label: "HRV",         icon: Heart,    color: "bg-rose-500/15 text-rose-400 border-rose-500/20" },
];

const FREQUENCIES = ["DAILY", "WEEKLY", "AS_NEEDED"];

const BLANK_ITEM = { category: "SLEEP", title: "", titlePt: "", description: "", descriptionPt: "", frequency: "DAILY", duration: "" };

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricBadge({ value, label, color }: { value: number | null; label: string; color: string }) {
  if (value == null) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="text-center">
      <div className={`text-sm font-bold text-${color}-400`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function PatientCard({ p, protocols, onAssign }: { p: any; protocols: any[]; onAssign: (patientId: string, protocolId: string, notes: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selProtocol, setSelProtocol] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const hasAlerts = p.alerts?.length > 0;

  const doAssign = async () => {
    if (!selProtocol) return;
    setSaving(true);
    await onAssign(p.id, selProtocol, assignNotes);
    setSaving(false);
    setAssigning(false);
  };

  return (
    <Card className={`border ${hasAlerts ? "border-amber-500/30" : "border-border"}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0 text-sm font-bold text-emerald-400">
              {p.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
              <p className="text-xs text-muted-foreground truncate">{p.email}</p>
              {p.activeProtocol && (
                <p className="text-xs text-teal-400 mt-0.5 flex items-center gap-1">
                  <Brain className="h-3 w-3" /> {p.activeProtocol}
                </p>
              )}
              {p.wearableConnections?.length > 0 && (
                <p className="text-xs text-violet-400 mt-0.5 flex items-center gap-1">
                  <Watch className="h-3 w-3" /> {p.wearableConnections.length} device{p.wearableConnections.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasAlerts && (
              <div title={p.alerts.join(", ")}>
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              </div>
            )}
            <span className="text-xs text-muted-foreground">{p.checkInCount}/7</span>
            <button onClick={() => setExpanded(v => !v)} className="text-muted-foreground hover:text-foreground">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Latest metrics */}
        {p.latest && (
          <div className="mt-3 grid grid-cols-5 gap-2 p-2 rounded-lg bg-muted border border-border">
            <MetricBadge value={p.latest.energyLevel} label="Energy" color="amber" />
            <MetricBadge value={p.latest.painLevel} label="Pain" color="rose" />
            <MetricBadge value={p.latest.sleepQuality} label="Sleep" color="indigo" />
            <MetricBadge value={p.latest.stressLevel} label="Stress" color="violet" />
            <MetricBadge value={p.latest.hrv ? Math.round(p.latest.hrv) : null} label="HRV" color="teal" />
          </div>
        )}

        {/* Wearable data row */}
        {p.latestWearable && (
          <div className="mt-2 p-2 rounded-lg bg-violet-500/5 border border-violet-500/15 flex flex-wrap gap-x-4 gap-y-1 items-center">
            <span className="text-xs text-violet-400 font-medium">{p.latestWearable.provider} · {p.latestWearable.dataDate}</span>
            {p.latestWearable.hrv != null && <span className="text-xs text-muted-foreground">HRV <span className="font-semibold text-rose-400">{Math.round(p.latestWearable.hrv)} ms</span></span>}
            {p.latestWearable.sleepScore != null && <span className="text-xs text-muted-foreground">Sleep <span className="font-semibold text-indigo-400">{Math.round(p.latestWearable.sleepScore)}%</span></span>}
            {p.latestWearable.restingHr != null && <span className="text-xs text-muted-foreground">RHR <span className="font-semibold text-amber-400">{Math.round(p.latestWearable.restingHr)} bpm</span></span>}
            {p.latestWearable.hrvScore != null && <span className="text-xs text-muted-foreground">Recovery <span className="font-semibold text-emerald-400">{Math.round(p.latestWearable.hrvScore)}%</span></span>}
          </div>
        )}
        {p.wearableConnections?.length === 0 && (
          <p className="mt-1 text-xs text-muted-foreground/50 italic">No wearable connected</p>
        )}

        {/* Alerts */}
        {hasAlerts && (
          <div className="mt-2 flex flex-wrap gap-1">
            {p.alerts.map((a: string) => (
              <Badge key={a} className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">{a}</Badge>
            ))}
          </div>
        )}

        {/* Expanded: trends + notes */}
        {expanded && (
          <div className="mt-3 space-y-2">
            {p.latest?.notes && (
              <div className="p-2 rounded-lg bg-card border border-border text-xs text-muted-foreground italic">
                "{p.latest.notes}"
              </div>
            )}

            {/* 7-day mini bars */}
            {p.trend?.energy?.length > 0 && (
              <div className="space-y-1">
                {[
                  { key: "energy", label: "Energy", color: "amber" },
                  { key: "pain",   label: "Pain",   color: "rose" },
                  { key: "sleep",  label: "Sleep",  color: "indigo" },
                ].map(({ key, label, color }) => (
                  <div key={key} className="grid grid-cols-[56px_1fr] gap-2 items-center">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <div className="flex gap-0.5 h-5 items-end">
                      {(p.trend[key] || []).map((d: any, i: number) => {
                        const pct = d.value != null ? Math.round((d.value / 10) * 100) : 0;
                        return (
                          <div key={i} className="flex-1 bg-muted rounded-sm overflow-hidden flex items-end">
                            <div className={`w-full bg-${color}-500/60`} style={{ height: `${pct}%` }} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Assign protocol */}
            {!assigning ? (
              <Button size="sm" variant="outline" className="w-full mt-1 text-xs" onClick={() => setAssigning(true)}>
                <UserCheck className="h-3 w-3 mr-1" />
                {p.activeProtocol ? "Change Protocol" : "Assign Protocol"}
              </Button>
            ) : (
              <div className="space-y-2 p-3 rounded-lg bg-muted border border-border">
                <select
                  value={selProtocol} onChange={e => setSelProtocol(e.target.value)}
                  className="w-full text-xs rounded border border-border bg-card px-2 py-1.5 focus:outline-none"
                >
                  <option value="">Select protocol...</option>
                  {protocols.map((pr: any) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
                </select>
                <textarea
                  rows={2} value={assignNotes} onChange={e => setAssignNotes(e.target.value)}
                  placeholder="Notes for patient (optional)..."
                  className="w-full text-xs rounded border border-border bg-card px-2 py-1.5 resize-none focus:outline-none"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={doAssign} disabled={!selProtocol || saving}>
                    {saving ? "Assigning..." : "Assign"}
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => setAssigning(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Protocol Builder ─────────────────────────────────────────────────────────

function ProtocolBuilder({ protocol, onSave, onCancel }: { protocol?: any; onSave: (data: any) => Promise<void>; onCancel: () => void }) {
  const [name, setName] = useState(protocol?.name || "");
  const [description, setDescription] = useState(protocol?.description || "");
  const [items, setItems] = useState<any[]>(protocol?.items || []);
  const [saving, setSaving] = useState(false);

  const addItem = () => setItems(v => [...v, { ...BLANK_ITEM }]);
  const removeItem = (i: number) => setItems(v => v.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: string) =>
    setItems(v => v.map((it, idx) => idx === i ? { ...it, [field]: value } : it));

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ name, description, items });
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Protocol Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sleep & Recovery Foundation"
          className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
        <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Brief description of this protocol's goals..."
          className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Protocol Items</label>
          <Button size="sm" variant="outline" className="text-xs" onClick={addItem}>
            <Plus className="h-3 w-3 mr-1" /> Add Item
          </Button>
        </div>

        {items.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg">
            No items yet. Click "Add Item" to build this protocol.
          </div>
        )}

        {items.map((item, i) => {
          const cat = CATEGORIES.find(c => c.value === item.category);
          const Icon = cat?.icon || Brain;
          return (
            <div key={i} className="p-3 rounded-xl border border-border bg-muted space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${cat?.color || ""}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <select value={item.category} onChange={e => updateItem(i, "category", e.target.value)}
                  className="text-xs rounded border border-border bg-card px-2 py-1 focus:outline-none flex-1">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <select value={item.frequency} onChange={e => updateItem(i, "frequency", e.target.value)}
                  className="text-xs rounded border border-border bg-card px-2 py-1 focus:outline-none">
                  {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <button onClick={() => removeItem(i)} className="text-muted-foreground hover:text-rose-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={item.title} onChange={e => updateItem(i, "title", e.target.value)}
                  placeholder="Title (EN)" className="text-xs rounded border border-border bg-card px-2 py-1.5 focus:outline-none" />
                <input value={item.titlePt || ""} onChange={e => updateItem(i, "titlePt", e.target.value)}
                  placeholder="Title (PT)" className="text-xs rounded border border-border bg-card px-2 py-1.5 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <textarea rows={2} value={item.description || ""} onChange={e => updateItem(i, "description", e.target.value)}
                  placeholder="Description (EN)" className="text-xs rounded border border-border bg-card px-2 py-1.5 resize-none focus:outline-none" />
                <textarea rows={2} value={item.descriptionPt || ""} onChange={e => updateItem(i, "descriptionPt", e.target.value)}
                  placeholder="Description (PT)" className="text-xs rounded border border-border bg-card px-2 py-1.5 resize-none focus:outline-none" />
              </div>
              <input value={item.duration || ""} onChange={e => updateItem(i, "duration", e.target.value)}
                placeholder='Duration (e.g. "10 min", "30 min")'
                className="w-full text-xs rounded border border-border bg-card px-2 py-1.5 focus:outline-none" />
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 pt-1">
        <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={!name.trim() || saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : protocol ? "Update Protocol" : "Create Protocol"}
        </Button>
        <Button variant="outline" onClick={onCancel}><X className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminBiohackingPage() {
  const [tab, setTab] = useState<"monitoring" | "protocols">("monitoring");
  const [patients, setPatients] = useState<any[]>([]);
  const [protocols, setProtocols] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProtocol, setEditingProtocol] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [filterAlerts, setFilterAlerts] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [pRes, prRes] = await Promise.all([
      fetch("/api/biohacking/patients"),
      fetch("/api/biohacking/protocols"),
    ]);
    const pData = await pRes.json();
    const prData = await prRes.json();
    setPatients(pData.patients || []);
    setProtocols(prData.protocols || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreateProtocol = async (data: any) => {
    const res = await fetch("/api/biohacking/protocols", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (res.ok) { setCreating(false); load(); }
  };

  const handleUpdateProtocol = async (data: any) => {
    const res = await fetch(`/api/biohacking/protocols/${editingProtocol.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (res.ok) { setEditingProtocol(null); load(); }
  };

  const handleDeleteProtocol = async (id: string) => {
    if (!confirm("Archive this protocol?")) return;
    await fetch(`/api/biohacking/protocols/${id}`, { method: "DELETE" });
    load();
  };

  const handleAssign = async (patientId: string, protocolId: string, notes: string) => {
    await fetch("/api/biohacking/assign", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId, protocolId, notes }),
    });
    load();
  };

  const alertCount = patients.filter(p => p.alerts?.length > 0).length;
  const displayedPatients = filterAlerts ? patients.filter(p => p.alerts?.length > 0) : patients;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Brain className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Biohacking & Performance</h1>
            <p className="text-sm text-muted-foreground">Monitor patients · Build protocols · Track biological trends</p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-emerald-400 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-foreground">{patients.length}</p>
              <p className="text-xs text-muted-foreground">Active Patients</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-amber-400 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-foreground">{alertCount}</p>
              <p className="text-xs text-muted-foreground">Need Attention</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Brain className="h-8 w-8 text-teal-400 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-foreground">{protocols.length}</p>
              <p className="text-xs text-muted-foreground">Protocols</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Watch className="h-8 w-8 text-violet-400 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-foreground">{patients.filter(p => p.wearableConnections?.length > 0).length}</p>
              <p className="text-xs text-muted-foreground">Wearable Connected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        {(["monitoring", "protocols"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {t === "monitoring" ? (
              <span className="flex items-center justify-center gap-2"><TrendingUp className="h-4 w-4" /> Monitoring {alertCount > 0 && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs px-1.5 py-0">{alertCount}</Badge>}</span>
            ) : (
              <span className="flex items-center justify-center gap-2"><Brain className="h-4 w-4" /> Protocols</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-24 bg-muted rounded-xl animate-pulse"/>)}</div>
      ) : tab === "monitoring" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{displayedPatients.length} patient{displayedPatients.length !== 1 ? "s" : ""} — last 7 days check-in data</p>
            {alertCount > 0 && (
              <button onClick={() => setFilterAlerts(v => !v)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition-colors ${filterAlerts ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "border-border text-muted-foreground hover:text-foreground"}`}>
                <AlertTriangle className="h-3 w-3" />
                {filterAlerts ? "Show All" : `${alertCount} Alert${alertCount > 1 ? "s" : ""}`}
              </button>
            )}
          </div>

          {displayedPatients.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center">
                <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">{filterAlerts ? "No patients with alerts." : "No patients yet."}</p>
              </CardContent>
            </Card>
          )}

          {displayedPatients.map((p: any) => (
            <PatientCard key={p.id} p={p} protocols={protocols} onAssign={handleAssign} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {(creating || editingProtocol) ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{editingProtocol ? "Edit Protocol" : "New Protocol"}</CardTitle>
              </CardHeader>
              <CardContent>
                <ProtocolBuilder
                  protocol={editingProtocol}
                  onSave={editingProtocol ? handleUpdateProtocol : handleCreateProtocol}
                  onCancel={() => { setCreating(false); setEditingProtocol(null); }}
                />
              </CardContent>
            </Card>
          ) : (
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create New Protocol
            </Button>
          )}

          {protocols.length === 0 && !creating && (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center">
                <Brain className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">No protocols yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Create your first biohacking protocol above.</p>
              </CardContent>
            </Card>
          )}

          {protocols.map((pr: any) => (
            <Card key={pr.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{pr.name}</p>
                    {pr.description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{pr.description}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{pr.items?.length || 0} items</Badge>
                      <Badge variant="outline" className="text-xs">{pr._count?.assignments || 0} assigned</Badge>
                      {pr.items?.slice(0, 4).map((it: any) => {
                        const cat = CATEGORIES.find(c => c.value === it.category);
                        if (!cat) return null;
                        const Icon = cat.icon;
                        return (
                          <span key={it.id} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border ${cat.color}`}>
                            <Icon className="h-3 w-3" /> {it.title}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingProtocol(pr); setCreating(false); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300" onClick={() => handleDeleteProtocol(pr.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
