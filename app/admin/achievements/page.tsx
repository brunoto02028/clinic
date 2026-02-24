"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import {
  Plus, Trash2, Edit2, Loader2, Search, Sparkles, Eye, EyeOff, Trophy, Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const ACH_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "treatment", label: "Treatment" },
  { value: "exercise", label: "Exercise" },
  { value: "education", label: "Education" },
  { value: "engagement", label: "Engagement" },
  { value: "milestone", label: "Milestone" },
];

const TRIGGER_TYPES = [
  { value: "manual", label: "Manual (admin grants)" },
  { value: "quiz_complete", label: "Quiz Completed" },
  { value: "exercise_count", label: "Exercises Done" },
  { value: "login_streak", label: "Login Streak" },
  { value: "screening_complete", label: "Screening Completed" },
  { value: "bp_reading", label: "BP Readings" },
  { value: "session_count", label: "Sessions Attended" },
];

const BADGE_COLORS = [
  "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#EF4444", "#6366F1", "#14B8A6",
];

interface Achievement {
  id: string;
  titleEn: string;
  titlePt: string;
  descriptionEn?: string;
  descriptionPt?: string;
  category: string;
  triggerType: string;
  triggerValue?: number;
  xpReward: number;
  iconEmoji: string;
  badgeColor: string;
  isActive: boolean;
  isPublished: boolean;
  condition?: { id: string; nameEn: string; namePt: string; iconEmoji?: string };
  _count: { patientAchievements: number };
}

interface Condition {
  id: string;
  nameEn: string;
  namePt: string;
  iconEmoji?: string;
  descriptionEn?: string;
}

export default function AchievementsPage() {
  const { locale } = useLocale();
  const { toast } = useToast();

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [form, setForm] = useState({
    titleEn: "", titlePt: "", descriptionEn: "", descriptionPt: "",
    conditionId: "", category: "general", triggerType: "manual",
    triggerValue: 1, xpReward: 50, iconEmoji: "🏆", badgeColor: "#8B5CF6",
    isPublished: false,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [aRes, cRes] = await Promise.all([
        fetch("/api/admin/achievements"),
        fetch("/api/admin/conditions"),
      ]);
      const aData = await aRes.json();
      const cData = await cRes.json();
      setAchievements(aData.achievements || []);
      setConditions(cData.conditions || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ titleEn: "", titlePt: "", descriptionEn: "", descriptionPt: "", conditionId: "", category: "general", triggerType: "manual", triggerValue: 1, xpReward: 50, iconEmoji: "🏆", badgeColor: "#8B5CF6", isPublished: false });
    setShowDialog(true);
  };

  const openEdit = (a: Achievement) => {
    setEditingId(a.id);
    setForm({
      titleEn: a.titleEn, titlePt: a.titlePt,
      descriptionEn: a.descriptionEn || "", descriptionPt: a.descriptionPt || "",
      conditionId: a.condition?.id || "", category: a.category,
      triggerType: a.triggerType, triggerValue: a.triggerValue || 1,
      xpReward: a.xpReward, iconEmoji: a.iconEmoji, badgeColor: a.badgeColor,
      isPublished: a.isPublished,
    });
    setShowDialog(true);
  };

  const handleAIGenerate = async () => {
    const cond = conditions.find((c) => c.id === form.conditionId);
    const condName = cond ? cond.nameEn : "general health and rehabilitation";
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/achievements/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conditionName: condName, conditionDescription: cond?.descriptionEn || "", count: 8 }),
      });
      const data = await res.json();
      if (data.generated?.achievements?.length) {
        // Save all generated achievements
        let created = 0;
        for (const a of data.generated.achievements) {
          const saveRes = await fetch("/api/admin/achievements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...a,
              conditionId: form.conditionId || null,
              isPublished: false,
            }),
          });
          if (saveRes.ok) created++;
        }
        toast({ title: "AI Generated!", description: `${created} achievements created as drafts.` });
        setShowDialog(false);
        fetchData();
      } else {
        toast({ title: "Error", description: data.error || "Generation failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "AI generation failed", variant: "destructive" });
    } finally { setGenerating(false); }
  };

  const handleSave = async () => {
    if (!form.titleEn || !form.titlePt) {
      toast({ title: "Error", description: "Title (EN & PT) required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const method = editingId ? "PATCH" : "POST";
      const payload = editingId ? { id: editingId, ...form, conditionId: form.conditionId || null } : { ...form, conditionId: form.conditionId || null };
      const res = await fetch("/api/admin/achievements", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast({ title: editingId ? "Updated" : "Created" });
        setShowDialog(false);
        fetchData();
      }
    } catch {} finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete achievement "${name}"?`)) return;
    const res = await fetch(`/api/admin/achievements?id=${id}`, { method: "DELETE" });
    if (res.ok) { toast({ title: "Deleted" }); fetchData(); }
  };

  const togglePublish = async (a: Achievement) => {
    await fetch("/api/admin/achievements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id, isPublished: !a.isPublished }),
    });
    fetchData();
  };

  const filtered = achievements.filter((a) => {
    const s = search.toLowerCase();
    return !s || a.titleEn.toLowerCase().includes(s) || a.titlePt.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Achievements</h1>
          <p className="text-muted-foreground text-sm">Create badges and achievements for patient gamification</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { openCreate(); }} variant="outline" className="gap-2">
            <Sparkles className="h-4 w-4" /> AI Generate Batch
          </Button>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Add Achievement</Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search achievements..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No achievements yet</p>
          <p className="text-sm">Create achievements manually or generate a batch with AI.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a) => (
            <Card key={a.id} className="hover:shadow-md transition-shadow overflow-hidden">
              <div className="h-1" style={{ backgroundColor: a.badgeColor }} />
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ backgroundColor: a.badgeColor + "20" }}>
                      {a.iconEmoji}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{locale === "pt-BR" ? a.titlePt : a.titleEn}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {locale === "pt-BR" ? (a.descriptionPt || a.descriptionEn) : (a.descriptionEn || a.descriptionPt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => togglePublish(a)}>
                      {a.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(a.id, a.titleEn)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <Badge variant="outline" className="text-[10px]">{a.category}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{TRIGGER_TYPES.find(t => t.value === a.triggerType)?.label || a.triggerType}</Badge>
                  {a.triggerValue && <Badge className="text-[10px] bg-slate-100 text-slate-600">×{a.triggerValue}</Badge>}
                  <Badge className="text-[10px] bg-amber-100 text-amber-700">{a.xpReward} XP</Badge>
                  {a.condition && <Badge className="text-[10px] bg-blue-100 text-blue-700">{a.condition.iconEmoji} {locale === "pt-BR" ? a.condition.namePt : a.condition.nameEn}</Badge>}
                  <Badge className={`text-[10px] ${a.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {a.isPublished ? "Published" : "Draft"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{a._count.patientAchievements} patients unlocked</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Achievement" : "New Achievement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* AI Generate */}
            {!editingId && (
              <div className="flex items-center gap-3 p-3 bg-violet-50 border border-violet-200 rounded-lg">
                <Sparkles className="h-5 w-5 text-violet-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-violet-800">AI Batch Generate</p>
                  <p className="text-xs text-violet-600">Generate 8 achievements based on a condition.</p>
                </div>
                <Button onClick={handleAIGenerate} disabled={generating} variant="outline" size="sm" className="gap-1.5 border-violet-300 text-violet-700">
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {generating ? "Generating..." : "Generate"}
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Title (EN) *</Label><Input value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} /></div>
              <div><Label>Title (PT) *</Label><Input value={form.titlePt} onChange={(e) => setForm({ ...form, titlePt: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Description (EN)</Label><Textarea value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} rows={2} /></div>
              <div><Label>Description (PT)</Label><Textarea value={form.descriptionPt} onChange={(e) => setForm({ ...form, descriptionPt: e.target.value })} rows={2} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Condition</Label>
                <Select value={form.conditionId} onValueChange={(v) => setForm({ ...form, conditionId: v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (General)</SelectItem>
                    {conditions.map((c) => <SelectItem key={c.id} value={c.id}>{c.iconEmoji} {c.nameEn}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ACH_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Trigger</Label>
                <Select value={form.triggerType} onValueChange={(v) => setForm({ ...form, triggerType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TRIGGER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Trigger Count</Label>
                <Input type="number" value={form.triggerValue} onChange={(e) => setForm({ ...form, triggerValue: parseInt(e.target.value) || 1 })} />
              </div>
              <div>
                <Label>XP Reward</Label>
                <Input type="number" value={form.xpReward} onChange={(e) => setForm({ ...form, xpReward: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Emoji Icon</Label>
                <Input value={form.iconEmoji} onChange={(e) => setForm({ ...form, iconEmoji: e.target.value })} placeholder="🏆" />
              </div>
              <div>
                <Label>Badge Color</Label>
                <div className="flex items-center gap-2 mt-1">
                  {BADGE_COLORS.map((c) => (
                    <button key={c} className={`w-7 h-7 rounded-full border-2 ${form.badgeColor === c ? "border-slate-800 scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} onClick={() => setForm({ ...form, badgeColor: c })} />
                  ))}
                </div>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} className="rounded" />
              <span className="text-sm">Publish immediately (visible to patients)</span>
            </label>
            <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingId ? "Update Achievement" : "Create Achievement"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
