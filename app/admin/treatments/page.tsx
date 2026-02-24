"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Edit,
  Trash2,
  Clock,
  PoundSterling,
  Stethoscope,
  Loader2,
  AlertCircle,
  Zap,
  Hand,
  Dumbbell,
  ClipboardList,
  Video,
  HelpCircle,
  MapPin,
  ShieldAlert,
  CheckCircle2,
  Settings,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";

const CATEGORIES = [
  { value: "ELECTROTHERAPY", label: "Electrotherapy", icon: Zap, color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { value: "MANUAL_THERAPY", label: "Manual Therapy", icon: Hand, color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "EXERCISE_THERAPY", label: "Exercise Therapy", icon: Dumbbell, color: "bg-green-100 text-green-700 border-green-200" },
  { value: "ASSESSMENT_SERVICE", label: "Assessment", icon: ClipboardList, color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "CONSULTATION", label: "Consultation", icon: Video, color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { value: "OTHER", label: "Other", icon: HelpCircle, color: "bg-gray-100 text-gray-700 border-gray-200" },
];

const getCat = (c: string) => CATEGORIES.find((x) => x.value === c) || CATEGORIES[5];

interface TreatmentType {
  id: string;
  name: string;
  description: string | null;
  category: string;
  requiresInPerson: boolean;
  duration: number;
  price: number;
  currency: string;
  isActive: boolean;
  sortOrder: number;
  equipmentNeeded: string | null;
  contraindications: string | null;
  indications: string | null;
  parameters: any;
}

const defaultForm = {
  name: "",
  description: "",
  category: "OTHER" as string,
  requiresInPerson: true,
  duration: 60,
  price: 60,
  isActive: true,
  sortOrder: 0,
  equipmentNeeded: "",
  contraindications: "",
  indications: "",
};

export default function AdminTreatmentsPage() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const [treatments, setTreatments] = useState<TreatmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editing, setEditing] = useState<TreatmentType | null>(null);
  const [deleting, setDeleting] = useState<TreatmentType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("ALL");
  const [form, setForm] = useState({ ...defaultForm });
  const { toast } = useToast();

  useEffect(() => { fetchTreatments(); }, []);

  const fetchTreatments = async () => {
    try {
      const res = await fetch("/api/admin/treatment-types");
      if (res.ok) setTreatments(await res.json());
    } catch { toast({ title: "Error", description: "Failed to load treatments", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const openCreate = (cat?: string) => {
    setEditing(null);
    setForm({ ...defaultForm, category: cat || activeTab === "ALL" ? "OTHER" : activeTab, sortOrder: treatments.length });
    setShowDialog(true);
  };

  const openEdit = (t: TreatmentType) => {
    setEditing(t);
    setForm({
      name: t.name,
      description: t.description || "",
      category: t.category || "OTHER",
      requiresInPerson: t.requiresInPerson,
      duration: t.duration,
      price: t.price,
      isActive: t.isActive,
      sortOrder: t.sortOrder,
      equipmentNeeded: t.equipmentNeeded || "",
      contraindications: t.contraindications || "",
      indications: t.indications || "",
    });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({ title: "Error", description: "Treatment name is required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const url = editing ? `/api/admin/treatment-types/${editing.id}` : "/api/admin/treatment-types";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast({ title: editing ? "Updated" : "Created", description: `Treatment "${form.name}" saved` });
        setShowDialog(false);
        fetchTreatments();
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error || "Failed to save", variant: "destructive" });
      }
    } catch { toast({ title: "Error", description: "Failed to save treatment", variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/admin/treatment-types/${deleting.id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Deleted", description: `Treatment "${deleting.name}" deleted` });
        setShowDeleteDialog(false); setDeleting(null); fetchTreatments();
      }
    } catch { toast({ title: "Error", description: "Failed to delete", variant: "destructive" }); }
  };

  const filtered = activeTab === "ALL" ? treatments : treatments.filter((t) => t.category === activeTab);
  const countByCategory = (cat: string) => treatments.filter((t) => t.category === cat).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{T("admin.treatmentTypesTitle")}</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="pt-6"><div className="h-24 bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Settings className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> {T("admin.treatmentTypesTitle")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{T("admin.treatmentTypesDesc")}</p>
        </div>
        <Button onClick={() => openCreate()} className="gap-2 w-full sm:w-auto"><Plus className="h-4 w-4" /> {T("admin.newTreatment")}</Button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1.5 flex-wrap bg-muted/50 rounded-lg p-1.5">
        <button
          className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${activeTab === "ALL" ? "bg-background shadow-sm" : "hover:bg-background/50"}`}
          onClick={() => setActiveTab("ALL")}
        >
          All ({treatments.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = countByCategory(cat.value);
          const Icon = cat.icon;
          return (
            <button
              key={cat.value}
              className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 ${activeTab === cat.value ? "bg-background shadow-sm" : "hover:bg-background/50"}`}
              onClick={() => setActiveTab(cat.value)}
            >
              <Icon className="h-3 w-3" /> {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Electrotherapy Quick Info */}
      {(activeTab === "ELECTROTHERAPY" || activeTab === "ALL") && countByCategory("ELECTROTHERAPY") > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="py-3 px-4 flex items-start gap-2">
            <Zap className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
            <div className="text-xs text-yellow-800">
              <strong>Electrotherapy</strong> treatments always require in-person attendance and cannot be delivered remotely.
              When building a protocol with electrotherapy, remote sessions will be automatically excluded for those items.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Treatment Cards */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">No treatments in this category</h3>
            <p className="text-sm text-muted-foreground mb-4">Add a treatment to get started</p>
            <Button onClick={() => openCreate(activeTab !== "ALL" ? activeTab : undefined)} className="gap-2">
              <Plus className="h-4 w-4" /> Add Treatment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => {
            const cat = getCat(t.category);
            const CatIcon = cat.icon;
            return (
              <Card key={t.id} className={`relative group ${!t.isActive ? "opacity-60" : ""}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${cat.color.split(" ")[0]}`}>
                        <CatIcon className={`h-4 w-4 ${cat.color.split(" ")[1]}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base leading-tight">{t.name}</CardTitle>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Badge variant="outline" className={`text-[9px] px-1 py-0 ${cat.color}`}>{cat.label}</Badge>
                          {!t.isActive && <Badge variant="outline" className="text-[9px] px-1 py-0">Inactive</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}><Edit className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setDeleting(t); setShowDeleteDialog(true); }}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" /> {t.duration} min</span>
                    <span className="flex items-center gap-1 font-semibold"><PoundSterling className="h-3 w-3" /> {t.price.toFixed(2)}</span>
                    {t.requiresInPerson && <span className="flex items-center gap-1 text-orange-600"><MapPin className="h-3 w-3" /> In-person</span>}
                    {!t.requiresInPerson && <span className="flex items-center gap-1 text-green-600"><Video className="h-3 w-3" /> Remote OK</span>}
                  </div>
                  {t.equipmentNeeded && <p className="text-[10px] text-muted-foreground"><strong>Equipment:</strong> {t.equipmentNeeded}</p>}
                  {t.indications && <p className="text-[10px] text-green-700"><CheckCircle2 className="h-2.5 w-2.5 inline mr-0.5" /> {t.indications.substring(0, 80)}...</p>}
                  {t.contraindications && <p className="text-[10px] text-red-600"><ShieldAlert className="h-2.5 w-2.5 inline mr-0.5" /> {t.contraindications.substring(0, 80)}...</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Treatment" : "New Treatment"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Name & Category */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Treatment Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. TENS Therapy" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category *</Label>
                <Select value={form.category} onValueChange={(v) => {
                  const isElectro = v === "ELECTROTHERAPY";
                  setForm({ ...form, category: v, requiresInPerson: isElectro ? true : form.requiresInPerson });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description..." rows={2} />
            </div>

            {/* Price, Duration, In-Person */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Duration (min)</Label>
                <Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Price (£)</Label>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Requires In-Person</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch
                    checked={form.requiresInPerson}
                    onCheckedChange={(checked) => setForm({ ...form, requiresInPerson: checked })}
                    disabled={form.category === "ELECTROTHERAPY"}
                  />
                  <span className="text-xs text-muted-foreground">{form.requiresInPerson ? "Yes" : "No"}</span>
                </div>
              </div>
            </div>

            {form.category === "ELECTROTHERAPY" && (
              <p className="text-[10px] text-amber-600 bg-amber-50 p-2 rounded">
                <Zap className="h-3 w-3 inline mr-1" /> Electrotherapy always requires in-person attendance. This cannot be changed.
              </p>
            )}

            {/* Equipment (shown for Electrotherapy and Manual Therapy) */}
            {(form.category === "ELECTROTHERAPY" || form.category === "MANUAL_THERAPY") && (
              <div className="space-y-1.5">
                <Label className="text-xs">Equipment Needed</Label>
                <Input value={form.equipmentNeeded} onChange={(e) => setForm({ ...form, equipmentNeeded: e.target.value })} placeholder="e.g. TENS unit, Ultrasound machine..." />
              </div>
            )}

            {/* Indications & Contraindications */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-green-700">Indications (when to use)</Label>
                <Textarea value={form.indications} onChange={(e) => setForm({ ...form, indications: e.target.value })} placeholder="Pain relief, inflammation, muscle spasm..." rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-red-600">Contraindications (when NOT to use)</Label>
                <Textarea value={form.contraindications} onChange={(e) => setForm({ ...form, contraindications: e.target.value })} placeholder="Pacemaker, pregnancy, active infection..." rows={2} />
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between border-t pt-3">
              <Label className="text-xs">Active</Label>
              <Switch checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Treatment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleting?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
