"use client";

import { useState, useEffect } from "react";
import {
  Stethoscope, Plus, Pencil, Trash2, Loader2, ExternalLink, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const SERVICE_SLUGS = [
  "mls-laser", "biohacking-performance", "hrv-recovery-monitoring",
  "sleep-longevity-optimisation", "electrotherapy", "therapeutic-ultrasound",
  "exercise-therapy", "microcurrent", "sports-injury", "chronic-pain", "pre-post-surgery",
];

interface ConditionPage {
  id: string;
  slug: string;
  nameEn: string;
  namePt: string;
  summaryEn: string;
  summaryPt: string;
  contentEn: string;
  contentPt: string;
  metaDescriptionEn: string | null;
  metaDescriptionPt: string | null;
  relatedArticleSlug: string | null;
  relatedServiceSlug: string | null;
  localIntent: string | null;
  published: boolean;
  createdAt: string;
}

const emptyForm = {
  slug: "", nameEn: "", namePt: "", summaryEn: "", summaryPt: "",
  contentEn: "", contentPt: "", metaDescriptionEn: "", metaDescriptionPt: "",
  relatedArticleSlug: "", relatedServiceSlug: "", localIntent: "Ipswich", published: true,
};

export default function AdminConditionPagesPage() {
  const { toast } = useToast();
  const [pages, setPages] = useState<ConditionPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ConditionPage | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchPages(); }, []);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/condition-pages");
      const data = await res.json();
      setPages(data.conditionPages || []);
    } catch {
      toast({ title: "Error loading condition pages", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (p: ConditionPage) => {
    setEditing(p);
    setForm({
      slug: p.slug, nameEn: p.nameEn, namePt: p.namePt, summaryEn: p.summaryEn, summaryPt: p.summaryPt,
      contentEn: p.contentEn, contentPt: p.contentPt,
      metaDescriptionEn: p.metaDescriptionEn || "", metaDescriptionPt: p.metaDescriptionPt || "",
      relatedArticleSlug: p.relatedArticleSlug || "", relatedServiceSlug: p.relatedServiceSlug || "",
      localIntent: p.localIntent || "Ipswich", published: p.published,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nameEn.trim() || !form.namePt.trim()) {
      toast({ title: "Name (EN and PT) is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/admin/condition-pages/${editing.id}` : "/api/admin/condition-pages";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast({ title: editing ? "Condition page updated" : "Condition page created" });
      setDialogOpen(false);
      fetchPages();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this condition page? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/condition-pages/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast({ title: "Deleted" });
      fetchPages();
    } catch (err: any) {
      toast({ title: "Error deleting", description: err.message, variant: "destructive" });
    }
  };

  const togglePublished = async (p: ConditionPage) => {
    try {
      await fetch(`/api/admin/condition-pages/${p.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !p.published }),
      });
      fetchPages();
    } catch {
      toast({ title: "Error updating status", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Stethoscope className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
            Condition Pages
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            SEO bridge pages: condition summary → article (learn) → service (treat) → booking.
          </p>
        </div>
        <Button onClick={openCreate} className="self-start sm:self-auto">
          <Plus className="h-4 w-4 mr-1.5" /> New Condition Page
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Stethoscope className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No condition pages yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pages.map((p) => (
            <div key={p.id} className="border rounded-xl p-4 bg-card flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{p.nameEn}</p>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${p.published ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                    {p.published ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">/conditions/{p.slug}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                  {p.relatedArticleSlug && <span>Article: {p.relatedArticleSlug}</span>}
                  {p.relatedServiceSlug && <span>Service: {p.relatedServiceSlug}</span>}
                  {p.localIntent && <span>Local: {p.localIntent}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <a href={`/conditions/${p.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-muted transition-colors" title="View">
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button onClick={() => togglePublished(p)} className="p-2 rounded-lg hover:bg-muted transition-colors" title={p.published ? "Unpublish" : "Publish"}>
                  {p.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Edit">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors" title="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Condition Page" : "New Condition Page"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name (EN)</Label>
                <Input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} placeholder="Knee Pain" />
              </div>
              <div>
                <Label>Name (PT)</Label>
                <Input value={form.namePt} onChange={(e) => setForm({ ...form, namePt: e.target.value })} placeholder="Dor no Joelho" />
              </div>
            </div>
            {editing && (
              <div>
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Summary (EN)</Label>
                <Textarea rows={2} value={form.summaryEn} onChange={(e) => setForm({ ...form, summaryEn: e.target.value })} />
              </div>
              <div>
                <Label>Summary (PT)</Label>
                <Textarea rows={2} value={form.summaryPt} onChange={(e) => setForm({ ...form, summaryPt: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Content HTML (EN)</Label>
                <Textarea rows={6} value={form.contentEn} onChange={(e) => setForm({ ...form, contentEn: e.target.value })} placeholder="<p>...</p>" />
              </div>
              <div>
                <Label>Content HTML (PT)</Label>
                <Textarea rows={6} value={form.contentPt} onChange={(e) => setForm({ ...form, contentPt: e.target.value })} placeholder="<p>...</p>" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Related article slug (learn)</Label>
                <Input value={form.relatedArticleSlug} onChange={(e) => setForm({ ...form, relatedArticleSlug: e.target.value })} placeholder="e.g. frozen-shoulder-stages-treatment" />
              </div>
              <div>
                <Label>Related service (treat)</Label>
                <select
                  value={form.relatedServiceSlug}
                  onChange={(e) => setForm({ ...form, relatedServiceSlug: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">— none —</option>
                  {SERVICE_SLUGS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Local intent (city)</Label>
                <Input value={form.localIntent} onChange={(e) => setForm({ ...form, localIntent: e.target.value })} placeholder="Ipswich" />
              </div>
              <div className="flex items-end gap-2 pb-1.5">
                <input type="checkbox" id="published" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
                <Label htmlFor="published" className="mb-0">Published</Label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Meta description (EN)</Label>
                <Input value={form.metaDescriptionEn} onChange={(e) => setForm({ ...form, metaDescriptionEn: e.target.value })} />
              </div>
              <div>
                <Label>Meta description (PT)</Label>
                <Input value={form.metaDescriptionPt} onChange={(e) => setForm({ ...form, metaDescriptionPt: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                {editing ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
