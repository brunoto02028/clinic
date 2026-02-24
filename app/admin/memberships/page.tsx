"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Edit, Trash2, Users, Loader2, CreditCard, RefreshCw, Crown, Globe,
  UserCheck, ClipboardList, Eye, CheckCircle,
  Dumbbell, BookOpen, Heart, Activity, Footprints, Zap, Stethoscope,
  FileText, Video, MessageSquare, BarChart3, Star,
} from "lucide-react";
import MembershipPreviewModal, { INTERVAL_LABELS } from "@/components/memberships/MembershipPreviewModal";
import {
  MODULE_REGISTRY, PERMISSION_REGISTRY, MODULE_CATEGORIES, PERMISSION_CATEGORIES,
  ALL_FEATURE_KEYS, DEFAULT_FREE_FEATURES,
  type ModuleDefinition, type PermissionDefinition,
} from "@/lib/module-registry";

interface Patient { id: string; firstName: string; lastName: string; email: string; }
interface MembershipPlan {
  id: string; name: string; description: string | null; status: string;
  price: number; interval: string; isFree: boolean; features: string[];
  patientScope: string; patient: Patient | null;
  stripeProductId?: string | null; stripePriceId?: string | null;
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  PAUSED: "bg-yellow-100 text-yellow-800",
  CANCELLED: "bg-red-100 text-red-800",
  DRAFT: "bg-gray-100 text-gray-600",
};
type PatientScope = "specific" | "all" | "none";

export default function MembershipsPage() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editing, setEditing] = useState<MembershipPlan | null>(null);
  const [deleting, setDeleting] = useState<MembershipPlan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewPlan, setPreviewPlan] = useState<MembershipPlan | null>(null);
  const [stripeBranding, setStripeBranding] = useState({
    primaryColor: "#5dc9c0", secondaryColor: "#1a6b6b",
    businessName: "Bruno Physical Rehabilitation", logoUrl: "",
  });
  const [form, setForm] = useState({
    name: "", description: "", price: 9.90, interval: "MONTHLY",
    isFree: false, features: [] as string[], patientId: "", patientScope: "all" as PatientScope,
  });

  useEffect(() => { fetchPlans(); fetchPatients(); fetchBranding(); }, []);

  const fetchPlans = async () => {
    try { const r = await fetch("/api/admin/memberships"); if (r.ok) setPlans(await r.json()); }
    catch {} finally { setLoading(false); }
  };
  const fetchPatients = async () => {
    try {
      const r = await fetch("/api/admin/patients");
      if (r.ok) { const d = await r.json(); setPatients(Array.isArray(d) ? d : d.patients || []); }
    } catch {}
  };
  const fetchBranding = async () => {
    try {
      const r = await fetch("/api/admin/stripe-branding");
      if (r.ok) {
        const d = await r.json();
        setStripeBranding({
          primaryColor: d.branding?.primaryColor || "#5dc9c0",
          secondaryColor: d.branding?.secondaryColor || "#1a6b6b",
          businessName: d.businessProfile?.name || "Bruno Physical Rehabilitation",
          logoUrl: d.siteSettings?.logoUrl || "",
        });
      }
    } catch {}
  };

  const resetForm = () => setForm({ name: "", description: "", price: 9.90, interval: "MONTHLY", isFree: false, features: [], patientId: "", patientScope: "all" });
  const openCreate = () => { setEditing(null); resetForm(); setShowDialog(true); };
  const openEdit = (p: MembershipPlan) => {
    setEditing(p);
    setForm({
      name: p.name, description: p.description || "", price: p.price,
      interval: p.interval, isFree: p.isFree, features: p.features || [],
      patientId: p.patient?.id || "",
      patientScope: (p.patientScope as PatientScope) || (p.patient ? "specific" : "all"),
    });
    setShowDialog(true);
  };
  const toggleFeature = (key: string) =>
    setForm(f => ({ ...f, features: f.features.includes(key) ? f.features.filter(k => k !== key) : [...f.features, key] }));

  const handleSubmit = async () => {
    if (!form.name) { toast({ title: "Error", description: "Plan name is required", variant: "destructive" }); return; }
    if (form.patientScope === "specific" && !form.patientId) { toast({ title: "Error", description: "Please select a patient", variant: "destructive" }); return; }
    if (form.features.length === 0) { toast({ title: "Error", description: "Select at least one feature", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const url = editing ? `/api/admin/memberships/${editing.id}` : "/api/admin/memberships";
      const res = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (res.ok) {
        toast({ title: editing ? "Updated" : "Created", description: `"${form.name}" saved${!editing && data.stripeProductId ? " + Stripe subscription created" : ""}` });
        setShowDialog(false); fetchPlans();
      } else toast({ title: "Error", description: data.error || "Failed", variant: "destructive" });
    } catch { toast({ title: "Error", description: "Failed to save", variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  const handleStatusChange = async (planId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/memberships/${planId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (res.ok) { toast({ title: "Updated", description: `Status → ${status}` }); fetchPlans(); }
    } catch { toast({ title: "Error", description: "Failed to update", variant: "destructive" }); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/admin/memberships/${deleting.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "🗑️ Deleted", description: `"${deleting.name}" deleted${data.stripeArchived ? " and Stripe product archived" : ""}.` });
        setShowDeleteDialog(false); setDeleting(null); fetchPlans();
      } else toast({ title: "Error", description: data.error || "Failed", variant: "destructive" });
    } catch { toast({ title: "Error", description: "Failed to delete", variant: "destructive" }); }
  };

  if (loading) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Crown className="h-6 w-6 text-violet-600" /> Membership Plans</h1>
      <div className="grid gap-4 md:grid-cols-2">{[...Array(3)].map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="pt-6"><div className="h-24 bg-muted rounded" /></CardContent></Card>)}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Crown className="h-5 w-5 sm:h-6 sm:w-6 text-violet-600" /> Membership Plans</h1>
          <p className="text-muted-foreground text-sm mt-1">Recurring subscription plans — give patients access to exercises, health tools, education and more.</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-violet-600 hover:bg-violet-700 w-full sm:w-auto"><Plus className="h-4 w-4" /> New Membership</Button>
      </div>

      {/* Plans grid */}
      {plans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Crown className="h-14 w-14 text-violet-300 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No membership plans yet</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-xs">Create a membership plan to offer patients recurring access to your digital health tools.</p>
            <Button onClick={openCreate} className="gap-2 bg-violet-600 hover:bg-violet-700"><Plus className="h-4 w-4" /> Create First Plan</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map(p => (
            <Card key={p.id} className="group border-violet-100 hover:border-violet-300 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Crown className="h-4 w-4 text-violet-600 shrink-0" />
                      <span className="truncate">{p.name}</span>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {p.patient
                        ? <><Users className="h-3 w-3 inline mr-1" />{p.patient.firstName} {p.patient.lastName}</>
                        : p.patientScope === "all"
                          ? <><Globe className="h-3 w-3 inline mr-1" /><span className="text-violet-600 font-medium">All Patients</span></>
                          : <><ClipboardList className="h-3 w-3 inline mr-1" /><span className="text-amber-600 font-medium">Draft</span></>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <Badge className={statusColors[p.status] || ""}>{p.status}</Badge>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-violet-600" title="Preview" onClick={() => setPreviewPlan(p)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setDeleting(p); setShowDeleteDialog(true); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline gap-1">
                  {p.isFree
                    ? <span className="text-2xl font-bold text-green-600">Free</span>
                    : <><span className="text-2xl font-bold">£{p.price.toFixed(2)}</span><span className="text-sm text-muted-foreground">/{INTERVAL_LABELS[p.interval] || "month"}</span></>}
                  {p.stripeProductId && <span className="ml-auto flex items-center gap-1 text-xs text-violet-600 font-medium"><CreditCard className="h-3 w-3" /> Stripe</span>}
                </div>
                {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
                {p.features.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.features.slice(0, 4).map(key => {
                      const mod = MODULE_REGISTRY.find(m => m.key === key);
                      const perm = !mod ? PERMISSION_REGISTRY.find(pr => pr.key === key) : undefined;
                      const feat = mod || perm;
                      return feat ? <span key={key} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100"><feat.icon className="h-2.5 w-2.5" />{feat.label}</span> : null;
                    })}
                    {p.features.length > 4 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">+{p.features.length - 4} more</span>}
                  </div>
                )}
                <div className="flex gap-2 pt-1 border-t">
                  {p.status === "ACTIVE" && <>
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleStatusChange(p.id, "PAUSED")}>Pause</Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 text-destructive" onClick={() => handleStatusChange(p.id, "CANCELLED")}>Cancel</Button>
                  </>}
                  {p.status === "PAUSED" && <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleStatusChange(p.id, "ACTIVE")}>Resume</Button>}
                  {(p.status === "CANCELLED" || p.status === "DRAFT") && <>
                    <Button size="sm" variant="outline" className="text-xs h-7 gap-1 border-green-300 text-green-700 hover:bg-green-50" onClick={() => handleStatusChange(p.id, "ACTIVE")}><RefreshCw className="h-3 w-3" /> Activate</Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 gap-1 text-destructive border-red-200 hover:bg-red-50" onClick={() => { setDeleting(p); setShowDeleteDialog(true); }}><Trash2 className="h-3 w-3" /> Delete</Button>
                  </>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-violet-600" />
              {editing ? "Edit Membership Plan" : "New Membership Plan"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Name */}
            <div className="space-y-2">
              <Label>Plan Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Basic Access, Premium Health, Full Membership" />
            </div>
            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="What does this membership include? Who is it for?" />
            </div>
            {/* Pricing */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Pricing</Label>
              <div className="flex items-center gap-3 p-3 border rounded-xl bg-muted/20 flex-wrap">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.isFree} onChange={e => setForm(f => ({ ...f, isFree: e.target.checked, price: e.target.checked ? 0 : f.price }))} className="rounded" />
                  Free Plan
                </label>
                {!form.isFree && <>
                  <div className="flex-1 min-w-[110px]">
                    <Label className="text-xs">Price (£)</Label>
                    <Input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} className="mt-1 h-8" />
                  </div>
                  <div className="flex-1 min-w-[110px]">
                    <Label className="text-xs">Billing Interval</Label>
                    <Select value={form.interval} onValueChange={v => setForm(f => ({ ...f, interval: v }))}>
                      <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WEEKLY">Weekly</SelectItem>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                        <SelectItem value="YEARLY">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>}
              </div>
              {!form.isFree && form.price > 0 && (
                <p className="text-xs text-violet-600 flex items-center gap-1">
                  <CreditCard className="h-3 w-3" /> Stripe recurring: £{form.price.toFixed(2)}/{INTERVAL_LABELS[form.interval] || "month"}
                </p>
              )}
            </div>
            {/* Assign To */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Assign To</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "specific", label: "Specific Patient",   icon: UserCheck,     active: "border-[#5dc9c0] bg-[#5dc9c0]/10 text-[#1a6b6b]" },
                  { value: "all",      label: "All Patients",       icon: Globe,         active: "border-violet-400 bg-violet-50 text-violet-700" },
                  { value: "none",     label: "No Patient (Draft)", icon: ClipboardList, active: "border-amber-400 bg-amber-50 text-amber-700" },
                ] as const).map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setForm(f => ({ ...f, patientScope: opt.value, patientId: opt.value !== "specific" ? "" : f.patientId }))}
                    className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg border-2 text-xs font-medium transition-all ${form.patientScope === opt.value ? opt.active : "border-gray-200 text-muted-foreground hover:border-gray-300"}`}>
                    <opt.icon className="h-4 w-4" /><span>{opt.label}</span>
                  </button>
                ))}
              </div>
              {form.patientScope === "specific" && (
                <Select value={form.patientId} onValueChange={v => setForm(f => ({ ...f, patientId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select patient..." /></SelectTrigger>
                  <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.email}</SelectItem>)}</SelectContent>
                </Select>
              )}
              {form.patientScope === "all" && <p className="text-xs text-violet-600 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">Available to all patients. Ideal for platform-wide subscriptions like £9.90/month.</p>}
              {form.patientScope === "none" && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Saved as draft — assign later by editing.</p>}
            </div>
            {/* Modules & Permissions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Modules & Permissions *</Label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setForm(f => ({ ...f, features: ALL_FEATURE_KEYS }))} className="text-[10px] text-violet-600 underline hover:no-underline">Select All</button>
                  <button type="button" onClick={() => setForm(f => ({ ...f, features: DEFAULT_FREE_FEATURES }))} className="text-[10px] text-emerald-600 underline hover:no-underline">Free Defaults</button>
                  <button type="button" onClick={() => setForm(f => ({ ...f, features: [] }))} className="text-[10px] text-muted-foreground underline hover:no-underline">Clear</button>
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto pr-1 space-y-4">
                {/* Dashboard Modules */}
                {MODULE_CATEGORIES.map(cat => {
                  const mods = MODULE_REGISTRY.filter(m => m.category === cat.key);
                  if (mods.length === 0) return null;
                  return (
                    <div key={cat.key}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{cat.label}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {mods.map((mod: ModuleDefinition) => {
                          const checked = form.features.includes(mod.key);
                          const isCore = mod.alwaysVisible;
                          return (
                            <button key={mod.key} type="button"
                              onClick={() => !isCore && toggleFeature(mod.key)}
                              disabled={isCore}
                              className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                                isCore
                                  ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                                  : checked
                                    ? "border-violet-400 bg-violet-50"
                                    : "border-gray-200 hover:border-gray-300 bg-white"
                              }`}>
                              <div className={`p-1 rounded-md shrink-0 ${checked || isCore ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground"}`}>
                                <mod.icon className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={`text-xs font-semibold ${checked || isCore ? "text-violet-800" : "text-foreground"}`}>{mod.label}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{mod.description}</p>
                              </div>
                              {(checked || isCore) && <CheckCircle className="h-3.5 w-3.5 text-violet-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Permissions */}
                {PERMISSION_CATEGORIES.map(cat => {
                  const perms = PERMISSION_REGISTRY.filter(p => p.category === cat.key);
                  if (perms.length === 0) return null;
                  return (
                    <div key={cat.key}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{cat.label}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {perms.map((perm: PermissionDefinition) => {
                          const checked = form.features.includes(perm.key);
                          return (
                            <button key={perm.key} type="button" onClick={() => toggleFeature(perm.key)}
                              className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                                checked ? "border-emerald-400 bg-emerald-50" : "border-gray-200 hover:border-gray-300 bg-white"
                              }`}>
                              <div className={`p-1 rounded-md shrink-0 ${checked ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
                                <perm.icon className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={`text-xs font-semibold ${checked ? "text-emerald-800" : "text-foreground"}`}>{perm.label}</p>
                              </div>
                              {checked && <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-muted-foreground">
                {form.features.filter(f => f.startsWith("mod_")).length} modules, {form.features.filter(f => f.startsWith("perm_")).length} permissions selected
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-violet-600 hover:bg-violet-700 gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Update" : "Create Membership"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Membership Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{deleting?.name}"</strong> will be permanently deleted.
              {deleting?.stripeProductId && " The Stripe product will be archived (not deleted) to preserve billing history."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleting(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stripe Checkout Preview */}
      {previewPlan && (
        <MembershipPreviewModal
          plan={previewPlan}
          branding={stripeBranding}
          onClose={() => setPreviewPlan(null)}
        />
      )}
    </div>
  );
}
