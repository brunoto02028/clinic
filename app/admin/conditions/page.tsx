"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import { Plus, Trash2, Edit2, Loader2, Search, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const BODY_REGIONS = [
  { value: "knee", label: "Knee / Joelho" },
  { value: "shoulder", label: "Shoulder / Ombro" },
  { value: "lower_back", label: "Lower Back / Lombar" },
  { value: "ankle", label: "Ankle / Tornozelo" },
  { value: "hip", label: "Hip / Quadril" },
  { value: "neck", label: "Neck / Pescoço" },
  { value: "wrist", label: "Wrist / Pulso" },
  { value: "elbow", label: "Elbow / Cotovelo" },
  { value: "foot", label: "Foot / Pé" },
  { value: "spine", label: "Spine / Coluna" },
  { value: "hand", label: "Hand / Mão" },
  { value: "general", label: "General / Geral" },
];

const CATEGORIES = [
  { value: "musculoskeletal", label: "Musculoskeletal" },
  { value: "neurological", label: "Neurological" },
  { value: "post_surgical", label: "Post-Surgical" },
  { value: "sports_injury", label: "Sports Injury" },
  { value: "chronic_pain", label: "Chronic Pain" },
  { value: "degenerative", label: "Degenerative" },
  { value: "inflammatory", label: "Inflammatory" },
  { value: "postural", label: "Postural" },
  { value: "other", label: "Other" },
];

interface Condition {
  id: string;
  nameEn: string;
  namePt: string;
  slug: string;
  descriptionEn?: string;
  descriptionPt?: string;
  bodyRegion?: string;
  category?: string;
  icdCode?: string;
  iconEmoji?: string;
  isActive: boolean;
  _count: { quizzes: number; achievements: number };
}

export default function ConditionsPage() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const { toast } = useToast();

  const [conditions, setConditions] = useState<Condition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    nameEn: "", namePt: "", descriptionEn: "", descriptionPt: "",
    bodyRegion: "", category: "", icdCode: "", iconEmoji: "",
  });

  const fetchConditions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/conditions");
      const data = await res.json();
      setConditions(data.conditions || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchConditions(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ nameEn: "", namePt: "", descriptionEn: "", descriptionPt: "", bodyRegion: "", category: "", icdCode: "", iconEmoji: "" });
    setShowDialog(true);
  };

  const openEdit = (c: Condition) => {
    setEditingId(c.id);
    setForm({
      nameEn: c.nameEn, namePt: c.namePt,
      descriptionEn: c.descriptionEn || "", descriptionPt: c.descriptionPt || "",
      bodyRegion: c.bodyRegion || "", category: c.category || "",
      icdCode: c.icdCode || "", iconEmoji: c.iconEmoji || "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.nameEn || !form.namePt) {
      toast({ title: "Error", description: "Name (EN & PT) are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const method = editingId ? "PATCH" : "POST";
      const payload = editingId ? { id: editingId, ...form } : form;
      const res = await fetch("/api/admin/conditions", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast({ title: editingId ? "Updated" : "Created", description: `Condition "${form.nameEn}" saved.` });
        setShowDialog(false);
        fetchConditions();
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.error, variant: "destructive" });
      }
    } catch {} finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete condition "${name}"? This will also affect linked quizzes and achievements.`)) return;
    try {
      const res = await fetch(`/api/admin/conditions?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Deleted", description: `Condition "${name}" deleted.` });
        fetchConditions();
      }
    } catch {}
  };

  const filtered = conditions.filter((c) => {
    const s = search.toLowerCase();
    return !s || c.nameEn.toLowerCase().includes(s) || c.namePt.toLowerCase().includes(s) || (c.bodyRegion || "").includes(s);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Conditions Library</h1>
          <p className="text-muted-foreground text-sm">Manage injury and condition types for quizzes and achievements</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Add Condition
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search conditions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No conditions found</p>
          <p className="text-sm">Create your first condition to start generating quizzes and achievements.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{c.iconEmoji || "🩺"}</span>
                    <div>
                      <CardTitle className="text-base">{locale === "pt-BR" ? c.namePt : c.nameEn}</CardTitle>
                      <p className="text-xs text-muted-foreground">{locale === "pt-BR" ? c.nameEn : c.namePt}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => handleDelete(c.id, c.nameEn)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {(c.descriptionEn || c.descriptionPt) && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {locale === "pt-BR" ? (c.descriptionPt || c.descriptionEn) : (c.descriptionEn || c.descriptionPt)}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {c.bodyRegion && <Badge variant="outline" className="text-[10px]">{c.bodyRegion}</Badge>}
                  {c.category && <Badge variant="secondary" className="text-[10px]">{c.category}</Badge>}
                  {c.icdCode && <Badge className="text-[10px] bg-blue-100 text-blue-700">{c.icdCode}</Badge>}
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground pt-1">
                  <span>{c._count.quizzes} quizzes</span>
                  <span>{c._count.achievements} achievements</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Condition" : "New Condition"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name (EN) *</Label><Input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} placeholder="e.g. Ankle Sprain" /></div>
              <div><Label>Name (PT) *</Label><Input value={form.namePt} onChange={(e) => setForm({ ...form, namePt: e.target.value })} placeholder="e.g. Entorse de Tornozelo" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Description (EN)</Label><Textarea value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} rows={2} /></div>
              <div><Label>Description (PT)</Label><Textarea value={form.descriptionPt} onChange={(e) => setForm({ ...form, descriptionPt: e.target.value })} rows={2} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Body Region</Label>
                <Select value={form.bodyRegion} onValueChange={(v) => setForm({ ...form, bodyRegion: v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{BODY_REGIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Emoji Icon</Label>
                <Input value={form.iconEmoji} onChange={(e) => setForm({ ...form, iconEmoji: e.target.value })} placeholder="🦵" />
              </div>
            </div>
            <div>
              <Label>ICD-10 Code (optional)</Label>
              <Input value={form.icdCode} onChange={(e) => setForm({ ...form, icdCode: e.target.value })} placeholder="e.g. M54.5" />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingId ? "Update Condition" : "Create Condition"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
