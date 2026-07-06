"use client";

import { useState, useEffect } from "react";
import {
  Cpu, Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronRight,
  CheckCircle2, X, Save, Zap, AlertTriangle, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ── MLS MPHI 75 default seed ──────────────────────────────────────────────────
const MLS_MPHI75_SEED = {
  name: "MLS MPHI 75 Laser",
  manufacturer: "ASA Laser",
  model: "MPHI 75",
  description:
    "Class IV multi-radiance therapeutic laser combining pulsed 905 nm and continuous 808 nm wavelengths. Delivers photobiomodulation (PBM) for pain relief, inflammation reduction, and tissue regeneration.",
  indications: [
    "Tendinopathy (Achilles, patellar, rotator cuff, lateral epicondyle)",
    "Muscle strains & tears",
    "Ligament sprains",
    "Post-surgical rehabilitation",
    "Osteoarthritis (knee, hip, shoulder)",
    "Low back & neck pain",
    "Neuropathic pain",
    "Plantar fasciitis",
    "Bursitis",
    "Wound healing & scar tissue",
    "Lymphoedema",
    "Sports injuries (acute & chronic)",
  ],
  contraindications: [
    "Direct irradiation over neoplastic tissue",
    "Direct irradiation over thyroid gland",
    "Pregnancy (abdomen / lumbar)",
    "Photosensitive patients / photosensitising medication",
    "Epilepsy (avoid direct eye exposure)",
    "Active haemorrhage at treatment site",
    "Pacemakers (avoid thoracic region)",
  ],
  protocols: [
    { condition: "Achilles tendinopathy", settings: "4–6 J/cm² | 905nm pulsed + 808nm CW", sessions: 8, frequency: "3×/week", notes: "Apply along tendon and peritendinous tissue. Week 1–2 lower dose, progress." },
    { condition: "Patellar tendinopathy", settings: "4–6 J/cm²", sessions: 8, frequency: "3×/week", notes: "Treat insertion and mid-portion. Combine with eccentric loading." },
    { condition: "Rotator cuff tendinopathy", settings: "4 J/cm² | 905nm pulsed", sessions: 8, frequency: "2–3×/week", notes: "Target supraspinatus insertion and subacromial space." },
    { condition: "Lateral epicondylalgia", settings: "3–4 J/cm²", sessions: 6, frequency: "2–3×/week", notes: "Treat ECRB origin and radial head. Combine with eccentric wrist extension." },
    { condition: "Plantar fasciitis", settings: "4–6 J/cm²", sessions: 8, frequency: "3×/week", notes: "Treat medial calcaneal tuberosity and fascial band." },
    { condition: "Knee osteoarthritis", settings: "6–8 J/cm²", sessions: 12, frequency: "3×/week", notes: "Circumferential irradiation of joint. Combine with strengthening." },
    { condition: "Acute muscle strain", settings: "2–3 J/cm² | pulsed mode", sessions: 4, frequency: "Daily (days 1–3) then 3×/week", notes: "Begin within 48–72h. Low dose initially, increase as inflammation reduces." },
    { condition: "Low back pain (non-specific)", settings: "4–6 J/cm²", sessions: 8, frequency: "3×/week", notes: "Paraspinal muscles and facet joint regions. Combine with motor control." },
    { condition: "Neck pain / cervicogenic", settings: "3–4 J/cm²", sessions: 8, frequency: "2–3×/week", notes: "Treat cervical paraspinals and trigger points. Avoid direct carotid." },
    { condition: "Shoulder bursitis (subacromial)", settings: "4 J/cm² | 808nm CW", sessions: 6, frequency: "3×/week", notes: "Target subacromial space and bursa. Reduce dose if acute." },
    { condition: "Post-surgical recovery", settings: "2–4 J/cm² increasing", sessions: 10, frequency: "3×/week", notes: "Start 72h post-op on closed incision. Focus on surrounding tissue." },
    { condition: "Neuropathic pain", settings: "4 J/cm² | 905nm pulsed", sessions: 10, frequency: "3×/week", notes: "Treat along nerve distribution. May require higher session count." },
    { condition: "Wound healing / scar", settings: "2 J/cm² | low power CW", sessions: 8, frequency: "3×/week", notes: "Apply tangentially to wound margins. Avoid direct contact with open wounds." },
  ],
};

type Protocol = {
  condition: string;
  settings: string;
  sessions: number;
  frequency: string;
  notes: string;
};

type Equipment = {
  id: string;
  name: string;
  manufacturer?: string;
  model?: string;
  description?: string;
  indications?: string;
  contraindications?: string;
  protocols?: string;
  isActive: boolean;
  sortOrder: number;
};

function parseJSON<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

const BLANK_EQ = {
  name: "", manufacturer: "", model: "", description: "",
  indications: [] as string[], contraindications: [] as string[],
  protocols: [] as Protocol[], isActive: true, sortOrder: 0,
};

export default function EquipmentPage() {
  const { toast } = useToast();
  const [list, setList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ ...BLANK_EQ });
  const [seedLoading, setSeedLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/equipment");
    const data = await res.json();
    setList(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openEdit = (eq: Equipment) => {
    setForm({
      name: eq.name,
      manufacturer: eq.manufacturer || "",
      model: eq.model || "",
      description: eq.description || "",
      indications: parseJSON<string[]>(eq.indications, []),
      contraindications: parseJSON<string[]>(eq.contraindications, []),
      protocols: parseJSON<Protocol[]>(eq.protocols, []),
      isActive: eq.isActive,
      sortOrder: eq.sortOrder,
    });
    setEditingId(eq.id);
    setShowNew(false);
  };

  const openNew = () => {
    setForm({ ...BLANK_EQ });
    setEditingId(null);
    setShowNew(true);
  };

  const cancel = () => { setEditingId(null); setShowNew(false); };

  const save = async () => {
    if (!form.name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    setSaving(true);
    const body = {
      ...form,
      indications: form.indications,
      contraindications: form.contraindications,
      protocols: form.protocols,
    };
    const url = editingId ? `/api/admin/equipment/${editingId}` : "/api/admin/equipment";
    const method = editingId ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);
    if (res.ok) {
      toast({ title: editingId ? "Equipment updated" : "Equipment created" });
      cancel();
      load();
    } else {
      const d = await res.json();
      toast({ title: "Error", description: d.error, variant: "destructive" });
    }
  };

  const deleteEq = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/equipment/${id}`, { method: "DELETE" });
    if (res.ok) { toast({ title: "Deleted" }); load(); }
  };

  const seedMLS = async () => {
    setSeedLoading(true);
    const res = await fetch("/api/admin/equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(MLS_MPHI75_SEED),
    });
    setSeedLoading(false);
    if (res.ok) {
      toast({ title: "MLS MPHI 75 added", description: "13 clinical protocols pre-loaded" });
      load();
    } else {
      const d = await res.json();
      toast({ title: "Error", description: d.error, variant: "destructive" });
    }
  };

  // ── List item/tag helpers ────────────────────────────────────────────────────
  const addListItem = (field: "indications" | "contraindications", val: string) => {
    if (!val.trim()) return;
    setForm(f => ({ ...f, [field]: [...f[field], val.trim()] }));
  };
  const removeListItem = (field: "indications" | "contraindications", idx: number) => {
    setForm(f => ({ ...f, [field]: f[field].filter((_: string, i: number) => i !== idx) }));
  };

  const addProtocol = () =>
    setForm(f => ({ ...f, protocols: [...f.protocols, { condition: "", settings: "", sessions: 6, frequency: "", notes: "" }] }));
  const updateProtocol = (i: number, key: keyof Protocol, val: string | number) =>
    setForm(f => ({ ...f, protocols: f.protocols.map((p: Protocol, idx: number) => idx === i ? { ...p, [key]: val } : p) }));
  const removeProtocol = (i: number) =>
    setForm(f => ({ ...f, protocols: f.protocols.filter((_: Protocol, idx: number) => idx !== i) }));

  const mlsAlreadyExists = list.some(e => e.name.includes("MLS") || e.name.includes("MPHI"));

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Cpu className="h-5 w-5 text-primary" /> Clinic Equipment</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Knowledge base for Atlas — used in SOAP pre-fill and treatment plan suggestions</p>
        </div>
        <div className="flex gap-2">
          {!mlsAlreadyExists && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={seedMLS} disabled={seedLoading}>
              {seedLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              Load MLS MPHI 75
            </Button>
          )}
          <Button size="sm" className="gap-1.5 text-xs" onClick={openNew}>
            <Plus className="h-3 w-3" /> Add Equipment
          </Button>
        </div>
      </div>

      {/* ── Inline Form (new or edit) ── */}
      {(showNew || editingId) && (
        <Card className="border-primary/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{editingId ? "Edit Equipment" : "New Equipment"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1 space-y-1">
                <Label className="text-[11px]">Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="MLS MPHI 75 Laser" className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Manufacturer</Label>
                <Input value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} placeholder="ASA Laser" className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Model</Label>
                <Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="MPHI 75" className="h-8 text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="text-xs" />
            </div>

            {/* Indications */}
            <TagList
              label="Indications"
              icon={<Zap className="h-3 w-3 text-emerald-500" />}
              items={form.indications}
              onAdd={v => addListItem("indications", v)}
              onRemove={i => removeListItem("indications", i)}
              placeholder="e.g. Achilles tendinopathy"
              color="emerald"
            />

            {/* Contraindications */}
            <TagList
              label="Contraindications"
              icon={<AlertTriangle className="h-3 w-3 text-amber-500" />}
              items={form.contraindications}
              onAdd={v => addListItem("contraindications", v)}
              onRemove={i => removeListItem("contraindications", i)}
              placeholder="e.g. Neoplasia at site"
              color="amber"
            />

            {/* Protocols */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-semibold">Clinical Protocols</Label>
                <Button type="button" variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={addProtocol}>
                  <Plus className="h-2.5 w-2.5" /> Add Protocol
                </Button>
              </div>
              {form.protocols.map((p: Protocol, i: number) => (
                <div key={i} className="border rounded-lg p-2.5 space-y-2 bg-muted/20">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <Label className="text-[10px]">Condition</Label>
                      <Input value={p.condition} onChange={e => updateProtocol(i, "condition", e.target.value)} placeholder="Achilles tendinopathy" className="h-7 text-[11px]" />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px]">Settings</Label>
                      <Input value={p.settings} onChange={e => updateProtocol(i, "settings", e.target.value)} placeholder="4 J/cm² | 905nm pulsed" className="h-7 text-[11px]" />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px]">Sessions</Label>
                      <Input type="number" value={p.sessions} onChange={e => updateProtocol(i, "sessions", parseInt(e.target.value) || 0)} className="h-7 text-[11px]" />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px]">Frequency</Label>
                      <Input value={p.frequency} onChange={e => updateProtocol(i, "frequency", e.target.value)} placeholder="3×/week" className="h-7 text-[11px]" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px]">Notes</Label>
                    <Textarea value={p.notes} onChange={e => updateProtocol(i, "notes", e.target.value)} rows={1} className="text-[11px]" />
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-5 text-[10px] text-red-400 hover:text-red-500 p-0" onClick={() => removeProtocol(i)}>
                    <Trash2 className="h-2.5 w-2.5 mr-0.5" /> Remove
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <Button size="sm" className="h-7 text-xs gap-1" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                {editingId ? "Update" : "Create"}
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={cancel}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Equipment List ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : list.length === 0 ? (
        <div className="border rounded-xl py-16 text-center text-muted-foreground">
          <Cpu className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No equipment yet</p>
          <p className="text-xs mt-1">Add your clinic equipment so Atlas can recommend treatments</p>
          {!mlsAlreadyExists && (
            <Button variant="outline" size="sm" className="mt-4 gap-1.5 text-xs" onClick={seedMLS} disabled={seedLoading}>
              {seedLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              Load MLS MPHI 75 (pre-configured)
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(eq => {
            const protocols = parseJSON<Protocol[]>(eq.protocols, []);
            const indications = parseJSON<string[]>(eq.indications, []);
            const contraindications = parseJSON<string[]>(eq.contraindications, []);
            const isOpen = expandedId === eq.id;
            return (
              <div key={eq.id} className="border rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <button className="flex items-center gap-2 flex-1 text-left" onClick={() => setExpandedId(isOpen ? null : eq.id)}>
                    {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <Cpu className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{eq.name}</span>
                    {eq.manufacturer && <span className="text-xs text-muted-foreground">{eq.manufacturer}{eq.model ? ` · ${eq.model}` : ""}</span>}
                    <Badge variant="outline" className="text-[9px] ml-1">{protocols.length} protocols</Badge>
                    {!eq.isActive && <Badge variant="secondary" className="text-[9px]">Inactive</Badge>}
                  </button>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(eq)}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-500" onClick={() => deleteEq(eq.id, eq.name)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
                {isOpen && (
                  <div className="px-4 pb-4 border-t pt-3 space-y-4">
                    {eq.description && <p className="text-xs text-muted-foreground">{eq.description}</p>}
                    <div className="grid sm:grid-cols-2 gap-4">
                      {indications.length > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold text-emerald-500 mb-1.5 flex items-center gap-1"><Zap className="h-3 w-3" /> Indications</p>
                          <div className="flex flex-wrap gap-1">
                            {indications.map((ind: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400">{ind}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {contraindications.length > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold text-amber-500 mb-1.5 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Contraindications</p>
                          <div className="flex flex-wrap gap-1">
                            {contraindications.map((c: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-[9px] border-amber-500/30 text-amber-400">{c}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {protocols.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold mb-2">Clinical Protocols ({protocols.length})</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[10px]">
                            <thead>
                              <tr className="border-b text-muted-foreground">
                                <th className="text-left py-1 pr-3 font-medium">Condition</th>
                                <th className="text-left py-1 pr-3 font-medium">Settings</th>
                                <th className="text-left py-1 pr-3 font-medium">Sessions</th>
                                <th className="text-left py-1 pr-3 font-medium">Frequency</th>
                                <th className="text-left py-1 font-medium">Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {protocols.map((p: Protocol, i: number) => (
                                <tr key={i} className="border-b border-muted/40 last:border-0 align-top">
                                  <td className="py-1.5 pr-3 font-medium">{p.condition}</td>
                                  <td className="py-1.5 pr-3 text-muted-foreground font-mono text-[9px]">{p.settings}</td>
                                  <td className="py-1.5 pr-3">{p.sessions}</td>
                                  <td className="py-1.5 pr-3">{p.frequency}</td>
                                  <td className="py-1.5 text-muted-foreground max-w-xs">{p.notes}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── TagList helper component ──────────────────────────────────────────────────
function TagList({
  label, icon, items, onAdd, onRemove, placeholder, color,
}: {
  label: string; icon: React.ReactNode; items: string[];
  onAdd: (v: string) => void; onRemove: (i: number) => void;
  placeholder: string; color: "emerald" | "amber";
}) {
  const [input, setInput] = useState("");
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold flex items-center gap-1">{icon} {label}</Label>
      <div className="flex flex-wrap gap-1.5 mb-1">
        {items.map((item: string, i: number) => (
          <span key={i} className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${color === "emerald" ? "border-emerald-500/30 text-emerald-400" : "border-amber-500/30 text-amber-400"}`}>
            {item}
            <button type="button" onClick={() => onRemove(i)} className="hover:opacity-70"><X className="h-2.5 w-2.5" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onAdd(input); setInput(""); } }}
          placeholder={placeholder}
          className="h-7 text-[11px] flex-1"
        />
        <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => { onAdd(input); setInput(""); }}>
          <Plus className="h-2.5 w-2.5" />
        </Button>
      </div>
    </div>
  );
}
