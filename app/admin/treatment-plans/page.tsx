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
  Users,
  ClipboardList,
  Package,
  PoundSterling,
  Loader2,
  AlertCircle,
  Calendar,
  X,
  CreditCard,
  RefreshCw,
  Eye,
  Lock,
  Shield,
  ChevronDown,
  ChevronUp,
  Repeat,
  UserCheck,
  Globe,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface TreatmentType {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface PlanItem {
  id?: string;
  treatmentName: string;
  type: string;
  sessions: number;
  completedSessions: number;
  unitPrice: number;
  duration: number;
}

type PlanType = "SINGLE" | "COMBO" | "FREE" | "SUBSCRIPTION";
type SubscriptionInterval = "monthly" | "weekly" | "yearly";
type PatientScope = "specific" | "all" | "none";

interface TreatmentPlan {
  id: string;
  name: string;
  status: string;
  totalPrice: number;
  isFree: boolean;
  isCombo: boolean;
  totalSessions: number;
  completedSessions: number;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  patient: Patient | null;
  therapist: { id: string; firstName: string; lastName: string } | null;
  items: PlanItem[];
  _count: { appointments: number };
  stripeProductId?: string | null;
  stripePriceId?: string | null;
  planType?: PlanType;
  patientScope?: PatientScope;
  subscriptionInterval?: SubscriptionInterval;
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  CANCELLED: "bg-red-100 text-red-800",
  PAUSED: "bg-yellow-100 text-yellow-800",
};

export default function AdminTreatmentPlansPage() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [treatmentTypes, setTreatmentTypes] = useState<TreatmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editing, setEditing] = useState<TreatmentPlan | null>(null);
  const [deleting, setDeleting] = useState<TreatmentPlan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewPlan, setPreviewPlan] = useState<TreatmentPlan | null>(null);
  const [showCancellationPolicy, setShowCancellationPolicy] = useState(false);
  const [stripeBranding, setStripeBranding] = useState({ primaryColor: "#5dc9c0", secondaryColor: "#1a6b6b", businessName: "Bruno Physical Rehabilitation", logoUrl: "" });
  const [form, setForm] = useState({
    patientId: "",
    patientScope: "none" as PatientScope,
    name: "",
    planType: "SINGLE" as PlanType,
    totalPrice: 0,
    isFree: false,
    isCombo: false,
    isSubscription: false,
    subscriptionInterval: "monthly" as SubscriptionInterval,
    totalSessions: 1,
    notes: "",
    items: [] as { treatmentName: string; type: string; sessions: number; unitPrice: number; duration: number }[],
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPlans();
    fetchPatients();
    fetchTreatmentTypes();
    fetchStripeBranding();
  }, []);

  const fetchStripeBranding = async () => {
    try {
      const res = await fetch("/api/admin/stripe-branding");
      if (res.ok) {
        const data = await res.json();
        setStripeBranding({
          primaryColor: data.branding?.primaryColor || "#5dc9c0",
          secondaryColor: data.branding?.secondaryColor || "#1a6b6b",
          businessName: data.businessProfile?.name || "Bruno Physical Rehabilitation",
          logoUrl: data.siteSettings?.logoUrl || "",
        });
      }
    } catch {}
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/admin/treatment-plans");
      if (res.ok) setPlans(await res.json());
    } catch {
      toast({ title: "Error", description: "Failed to load plans", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await fetch("/api/admin/patients");
      if (res.ok) {
        const data = await res.json();
        setPatients(Array.isArray(data) ? data : data.patients || []);
      }
    } catch {}
  };

  const fetchTreatmentTypes = async () => {
    try {
      const res = await fetch("/api/admin/treatment-types");
      if (res.ok) setTreatmentTypes(await res.json());
    } catch {}
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ patientId: "", patientScope: "none", name: "", planType: "SINGLE", totalPrice: 0, isFree: false, isCombo: false, isSubscription: false, subscriptionInterval: "monthly", totalSessions: 1, notes: "", items: [] });
    setShowDialog(true);
  };

  const openEdit = (p: TreatmentPlan) => {
    setEditing(p);
    const pt = p.planType || (p.isFree ? "FREE" : p.isCombo ? "COMBO" : "SINGLE");
    setForm({
      patientId: p.patient?.id || "",
      patientScope: (p.patientScope as PatientScope) || (p.patient ? "specific" : "none"),
      name: p.name,
      planType: pt,
      totalPrice: p.totalPrice,
      isFree: p.isFree,
      isCombo: p.isCombo,
      isSubscription: pt === "SUBSCRIPTION",
      subscriptionInterval: p.subscriptionInterval || "monthly",
      totalSessions: p.totalSessions,
      notes: p.notes || "",
      items: p.items.map((i) => ({
        treatmentName: i.treatmentName,
        type: i.type,
        sessions: i.sessions,
        unitPrice: i.unitPrice,
        duration: i.duration,
      })),
    });
    setShowDialog(true);
  };

  const applyPlanType = (pt: PlanType) => {
    setForm(f => ({
      ...f,
      planType: pt,
      isFree: pt === "FREE",
      isCombo: pt === "COMBO",
      isSubscription: pt === "SUBSCRIPTION",
      totalPrice: pt === "FREE" ? 0 : f.totalPrice,
    }));
  };

  const addItem = () => {
    setForm({
      ...form,
      items: [...form.items, { treatmentName: "", type: "SINGLE", sessions: 1, unitPrice: 0, duration: 60 }],
    });
  };

  const removeItem = (index: number) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const items = [...form.items];
    (items[index] as any)[field] = value;
    // Auto-recalculate totals
    const newTotalPrice = form.isFree ? 0 : items.reduce((sum, i) => sum + (i.unitPrice || 0) * (i.sessions || 1), 0);
    const newTotalSessions = items.reduce((sum, i) => sum + (i.sessions || 1), 0);
    setForm({ ...form, items, totalPrice: newTotalPrice, totalSessions: newTotalSessions });
  };

  const addFromTreatmentType = (tt: TreatmentType) => {
    const newItems = [...form.items, {
      treatmentName: tt.name,
      type: form.isCombo ? "COMBO" : "SINGLE",
      sessions: 1,
      unitPrice: tt.price,
      duration: tt.duration,
    }];
    const newTotalPrice = form.isFree ? 0 : newItems.reduce((sum, i) => sum + i.unitPrice * i.sessions, 0);
    const newTotalSessions = newItems.reduce((sum, i) => sum + i.sessions, 0);
    setForm({ ...form, items: newItems, totalPrice: newTotalPrice, totalSessions: newTotalSessions });
  };

  const recalculate = () => {
    if (form.isFree) return;
    const totalPrice = form.items.reduce((sum, i) => sum + i.unitPrice * i.sessions, 0);
    const totalSessions = form.items.reduce((sum, i) => sum + i.sessions, 0);
    setForm({ ...form, totalPrice, totalSessions });
  };

  const handleSubmit = async () => {
    if (form.patientScope === "specific" && !form.patientId) {
      toast({ title: "Error", description: "Please select a patient or choose 'All Patients'", variant: "destructive" });
      return;
    }
    // patientScope === "none" or "all" → patientId stays empty, which is valid
    if (!form.name) {
      toast({ title: "Error", description: "Plan name is required", variant: "destructive" });
      return;
    }
    if (form.items.length === 0) {
      toast({ title: "Error", description: "Add at least one treatment to the plan", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const url = editing ? `/api/admin/treatment-plans/${editing.id}` : "/api/admin/treatment-plans";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast({ title: editing ? "Updated" : "Created", description: `Plan "${form.name}" saved` });
        setShowDialog(false);
        fetchPlans();
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error || "Failed to save", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save plan", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (planId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/treatment-plans/${planId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        if (status === "ACTIVE" && data.stripeRestored) {
          toast({ title: "✅ Plan Restored", description: "Plan reactivated and Stripe product/price restored successfully." });
        } else if (status === "ACTIVE" && data.stripeRestoreError) {
          toast({ title: "Plan Restored", description: `Plan reactivated locally, but Stripe restore failed: ${data.stripeRestoreError}`, variant: "destructive" });
        } else {
          toast({ title: "Updated", description: `Plan status changed to ${status}` });
        }
        fetchPlans();
      } else {
        toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/admin/treatment-plans/${deleting.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        if (data.hadStripeProduct && data.stripeArchived) {
          toast({ title: "🗑️ Deleted", description: `Plan "${deleting.name}" deleted and Stripe product archived successfully.` });
        } else if (data.hadStripeProduct && data.stripeArchiveError) {
          toast({ title: "Deleted (Stripe warning)", description: `Plan deleted locally but Stripe archive failed: ${data.stripeArchiveError}`, variant: "destructive" });
        } else {
          toast({ title: "Deleted", description: `Plan "${deleting.name}" deleted.` });
        }
        setShowDeleteDialog(false);
        setDeleting(null);
        fetchPlans();
      } else {
        toast({ title: "Error", description: data.error || "Failed to delete", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{T("admin.treatmentPlansTitle")}</h1>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="pt-6"><div className="h-24 bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{T("admin.treatmentPlansTitle")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{T("admin.treatmentPlansDesc")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCancellationPolicy(!showCancellationPolicy)} className="gap-2">
            <Shield className="h-4 w-4 text-amber-600" />
            Cancellation Policy
            {showCancellationPolicy ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> {T("admin.newPlan")}</Button>
        </div>
      </div>

      {/* ── Cancellation Policy Panel ── */}
      {showCancellationPolicy && (
        <div className="border border-amber-200 bg-amber-50 dark:bg-amber-950/20 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <Shield className="h-5 w-5" /> Cancellation & Refund Policy
            </h2>
            <a href="/cancellation-policy" target="_blank" className="flex items-center gap-1 text-xs text-amber-700 underline hover:no-underline">
              <ExternalLink className="h-3 w-3" /> View public page
            </a>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-muted/30 rounded-xl p-4 border border-amber-200 space-y-2">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Appointments
              </p>
              <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1.5">
                <li className="flex gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" /><span><strong>More than 48 hours before:</strong> Full refund processed automatically via Stripe.</span></li>
                <li className="flex gap-2"><AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" /><span><strong>Within 48 hours:</strong> No refund. Patient must contact clinic for exceptional circumstances.</span></li>
                <li className="flex gap-2"><Shield className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" /><span>Patient must accept this policy at checkout (logged in DB with timestamp).</span></li>
              </ul>
            </div>
            <div className="bg-white dark:bg-muted/30 rounded-xl p-4 border border-amber-200 space-y-2">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <Package className="h-4 w-4" /> Treatment Plans & Subscriptions
              </p>
              <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1.5">
                <li className="flex gap-2"><AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" /><span><strong>No self-service cancellation.</strong> Patient must submit a cancellation request.</span></li>
                <li className="flex gap-2"><UserCheck className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" /><span><strong>Admin review required.</strong> Refund amount based on sessions completed.</span></li>
                <li className="flex gap-2"><Repeat className="h-3.5 w-3.5 text-violet-600 shrink-0 mt-0.5" /><span><strong>Subscriptions:</strong> Cancel before next billing cycle to avoid next charge.</span></li>
                <li className="flex gap-2"><Shield className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" /><span>All requests logged in Admin → Cancellations with full audit trail.</span></li>
              </ul>
            </div>
          </div>
          <div className="bg-white dark:bg-muted/30 rounded-xl p-4 border border-amber-200 space-y-2">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Admin Workflow</p>
            <div className="flex flex-wrap gap-3 text-xs text-amber-700">
              <div className="flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/30 px-3 py-1.5 rounded-full">
                <span className="font-bold">1.</span> Patient submits request via portal
              </div>
              <div className="flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/30 px-3 py-1.5 rounded-full">
                <span className="font-bold">2.</span> Admin reviews in Cancellations page
              </div>
              <div className="flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/30 px-3 py-1.5 rounded-full">
                <span className="font-bold">3.</span> Approve → set refund amount
              </div>
              <div className="flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/30 px-3 py-1.5 rounded-full">
                <span className="font-bold">4.</span> Process Refund → Stripe auto-refunds
              </div>
            </div>
          </div>
          <div className="flex gap-2 text-xs">
            <a href="/admin/cancellations" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-700 text-white hover:bg-amber-800 transition-colors font-medium">
              <ExternalLink className="h-3.5 w-3.5" /> Go to Cancellations Admin
            </a>
            <a href="/admin/stripe-branding" className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors font-medium">
              <CreditCard className="h-3.5 w-3.5" /> Stripe Branding Settings
            </a>
          </div>
        </div>
      )}

      {plans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">No treatment plans yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create a plan to assign treatments to patients</p>
            <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Create First Plan</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((p) => (
            <Card key={p.id} className="group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {p.planType === "SUBSCRIPTION" ? <Repeat className="h-4 w-4 text-violet-600" /> : p.isCombo ? <Package className="h-4 w-4 text-primary" /> : <ClipboardList className="h-4 w-4 text-primary" />}
                      {p.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {p.patient ? (
                        <><Users className="h-3 w-3 inline mr-1" />{p.patient.firstName} {p.patient.lastName}</>
                      ) : p.patientScope === "all" ? (
                        <><Globe className="h-3 w-3 inline mr-1" /><span className="text-violet-600 font-medium">All Patients</span></>
                      ) : (
                        <><ClipboardList className="h-3 w-3 inline mr-1" /><span className="text-amber-600 font-medium">Draft — No Patient</span></>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[p.status] || ""}>{p.status}</Badge>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#5dc9c0]" title="Preview Stripe Checkout" onClick={() => setPreviewPlan(p)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleting(p); setShowDeleteDialog(true); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {p.items.map((item, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {item.treatmentName} ({item.sessions}x)
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {p.completedSessions}/{p.totalSessions} sessions
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      {p.isFree ? (
                        <Badge variant="secondary" className="text-xs">Free</Badge>
                      ) : (
                        <><PoundSterling className="h-3.5 w-3.5" />{p.totalPrice.toFixed(2)}</>
                      )}
                    </span>
                    <span>{p._count.appointments} appts</span>
                    {p.stripeProductId && (
                      <span className={`flex items-center gap-1 text-xs font-medium ${
                        p.status === "CANCELLED" ? "text-muted-foreground line-through" : "text-violet-600"
                      }`} title={p.status === "CANCELLED" ? "Stripe product archived" : "Linked to Stripe"}>
                        <CreditCard className="h-3 w-3" />
                        {p.status === "CANCELLED" ? "Stripe (archived)" : "Stripe"}
                      </span>
                    )}
                  </div>
                  {p.status === "ACTIVE" && (
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(p.id, "PAUSED")}>Pause</Button>
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(p.id, "COMPLETED")}>Complete</Button>
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleStatusChange(p.id, "CANCELLED")}>Cancel</Button>
                    </div>
                  )}
                  {p.status === "PAUSED" && (
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => handleStatusChange(p.id, "ACTIVE")}>Resume</Button>
                  )}
                  {p.status === "CANCELLED" && (
                    <div className="flex gap-2 pt-2 border-t mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-green-300 text-green-700 hover:bg-green-50"
                        onClick={() => handleStatusChange(p.id, "ACTIVE")}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Restore Plan
                        {p.stripeProductId && <span className="text-[10px] opacity-70">(+ Stripe)</span>}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-destructive border-red-200 hover:bg-red-50"
                        onClick={() => { setDeleting(p); setShowDeleteDialog(true); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete Permanently
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Plan" : "New Treatment Plan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* ── Plan Type ── */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Plan Type *</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  { value: "SINGLE", label: "Individual", icon: ClipboardList, desc: "One-off plan" },
                  { value: "COMBO",  label: "Combo",      icon: Package,       desc: "Package deal" },
                  { value: "FREE",   label: "Free",       icon: CheckCircle,   desc: "No charge" },
                  { value: "SUBSCRIPTION", label: "Subscription", icon: Repeat, desc: "Recurring" },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => applyPlanType(opt.value)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition-all ${
                      form.planType === opt.value
                        ? "border-[#5dc9c0] bg-[#5dc9c0]/10 text-[#1a6b6b]"
                        : "border-gray-200 text-muted-foreground hover:border-gray-300"
                    }`}
                  >
                    <opt.icon className="h-4 w-4" />
                    <span>{opt.label}</span>
                    <span className="text-[10px] opacity-70">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Subscription interval ── */}
            {form.planType === "SUBSCRIPTION" && (
              <div className="space-y-2 bg-violet-50 dark:bg-violet-950/20 border border-violet-200 rounded-xl p-3">
                <Label className="text-xs font-semibold text-violet-700">Subscription Settings</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Billing Interval</Label>
                    <Select value={form.subscriptionInterval} onValueChange={(v) => setForm(f => ({ ...f, subscriptionInterval: v as SubscriptionInterval }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Amount (£)</Label>
                    <Input className="mt-1" type="number" step="0.01" min="0" value={form.totalPrice} onChange={e => setForm(f => ({ ...f, totalPrice: parseFloat(e.target.value) || 0 }))} placeholder="9.90" />
                  </div>
                </div>
              </div>
            )}

            {/* ── Patient scope ── */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Assign To</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, patientScope: "specific" }))}
                  className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg border-2 text-xs font-medium transition-all ${
                    form.patientScope === "specific"
                      ? "border-[#5dc9c0] bg-[#5dc9c0]/10 text-[#1a6b6b]"
                      : "border-gray-200 text-muted-foreground hover:border-gray-300"
                  }`}
                >
                  <UserCheck className="h-4 w-4" />
                  <span>Specific Patient</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, patientScope: "all", patientId: "" }))}
                  className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg border-2 text-xs font-medium transition-all ${
                    form.patientScope === "all"
                      ? "border-violet-400 bg-violet-50 text-violet-700"
                      : "border-gray-200 text-muted-foreground hover:border-gray-300"
                  }`}
                >
                  <Globe className="h-4 w-4" />
                  <span>All Patients</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, patientScope: "none", patientId: "" }))}
                  className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg border-2 text-xs font-medium transition-all ${
                    form.patientScope === "none"
                      ? "border-amber-400 bg-amber-50 text-amber-700"
                      : "border-gray-200 text-muted-foreground hover:border-gray-300"
                  }`}
                >
                  <ClipboardList className="h-4 w-4" />
                  <span>No Patient (Draft)</span>
                </button>
              </div>
              {form.patientScope === "specific" && (
                <Select value={form.patientId} onValueChange={(v) => setForm({ ...form, patientId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select patient..." /></SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {form.patientScope === "all" && (
                <p className="text-xs text-violet-600 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
                  This plan will be available to all patients. Useful for subscription plans or general packages.
                </p>
              )}
              {form.patientScope === "none" && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Saved as a draft template — not assigned to any patient yet. You can assign it later by editing the plan.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Plan Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Post-Surgery Rehabilitation" />
            </div>

            {/* Treatment Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Treatments</Label>
                <div className="flex gap-2">
                  {treatmentTypes.length > 0 && (
                    <Select onValueChange={(v) => {
                      const tt = treatmentTypes.find((t) => t.id === v);
                      if (tt) addFromTreatmentType(tt);
                    }}>
                      <SelectTrigger className="w-[200px] h-8 text-xs">
                        <SelectValue placeholder="Add from catalog..." />
                      </SelectTrigger>
                      <SelectContent>
                        {treatmentTypes.map((tt) => (
                          <SelectItem key={tt.id} value={tt.id}>{tt.name} (£{tt.price})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Manual</Button>
                </div>
              </div>

              {form.items.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg border-dashed">
                  No treatments added yet. Use the catalog or add manually.
                </p>
              )}

              {form.items.map((item, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.treatmentName || `Treatment ${i + 1}`}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(i)}><X className="h-3 w-3" /></Button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <Label className="text-xs">Name</Label>
                      <Input className="h-8 text-xs" value={item.treatmentName} onChange={(e) => updateItem(i, "treatmentName", e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Sessions</Label>
                      <Input className="h-8 text-xs" type="number" value={item.sessions} onChange={(e) => updateItem(i, "sessions", parseInt(e.target.value) || 1)} />
                    </div>
                    <div>
                      <Label className="text-xs">Unit Price (£)</Label>
                      <Input className="h-8 text-xs" type="number" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(i, "unitPrice", parseFloat(e.target.value) || 0)} disabled={form.isFree} />
                    </div>
                    <div>
                      <Label className="text-xs">Duration (min)</Label>
                      <Input className="h-8 text-xs" type="number" value={item.duration} onChange={(e) => updateItem(i, "duration", parseInt(e.target.value) || 60)} />
                    </div>
                  </div>
                </div>
              ))}

              {form.items.length > 0 && !form.isFree && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={recalculate} className="gap-1.5">
                    <RefreshCw className="h-3 w-3" /> Recalculate
                  </Button>
                  <div className="flex items-center gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Total Sessions</Label>
                      <div className="h-8 w-20 text-xs font-semibold flex items-center px-2 border rounded-md bg-muted/50">{form.totalSessions}</div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Total Price (£)</Label>
                      <div className="h-8 w-28 text-sm font-bold flex items-center px-2 border rounded-md bg-primary/5 text-primary">
                        £{form.totalPrice.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Additional notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? "Update" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Stripe Checkout Preview Modal ── */}
      {previewPlan && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setPreviewPlan(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-[#5dc9c0] to-[#1a6b6b]">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Stripe Checkout Preview</h2>
                  <p className="text-xs text-muted-foreground">How the patient will see the payment page</p>
                </div>
              </div>
              <button onClick={() => setPreviewPlan(null)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="h-5 w-5" /></button>
            </div>

            {/* Stripe mock */}
            <div className="p-5">
              <div className="border-2 border-gray-200 rounded-2xl overflow-hidden shadow-lg bg-white">
                {/* Brand bar */}
                <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${stripeBranding.primaryColor}, ${stripeBranding.secondaryColor})` }} />
                <div className="flex flex-col sm:flex-row">
                  {/* Left — order summary */}
                  <div className="sm:w-2/5 bg-gray-50 p-5 border-b sm:border-b-0 sm:border-r space-y-4">
                    <div className="flex items-center gap-2">
                      {stripeBranding.logoUrl ? (
                        <img src={stripeBranding.logoUrl} alt={stripeBranding.businessName} className="h-8 w-auto object-contain" />
                      ) : (
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: stripeBranding.primaryColor }}>
                          {stripeBranding.businessName.charAt(0)}
                        </div>
                      )}
                      <span className="text-xs font-semibold text-gray-700 line-clamp-1">{stripeBranding.businessName}</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">Pay</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {previewPlan.isFree ? "Free" : `£${previewPlan.totalPrice.toFixed(2)}`}
                        {previewPlan.planType === "SUBSCRIPTION" && (
                          <span className="text-sm font-normal text-gray-500 ml-1">/{previewPlan.subscriptionInterval || "month"}</span>
                        )}
                      </p>
                    </div>
                    <div className="border-t pt-3 space-y-2">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span className="font-medium">{previewPlan.name}</span>
                      </div>
                      {previewPlan.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs text-gray-500">
                          <span>{item.treatmentName} × {item.sessions}</span>
                          <span>£{(item.unitPrice * item.sessions).toFixed(2)}</span>
                        </div>
                      ))}
                      {previewPlan.planType === "SUBSCRIPTION" && (
                        <div className="text-[10px] text-violet-600 flex items-center gap-1 mt-1">
                          <Repeat className="h-3 w-3" />
                          Recurring {previewPlan.subscriptionInterval || "monthly"} subscription
                        </div>
                      )}
                      <div className="text-[10px] text-green-600 flex items-center gap-1 mt-1">
                        <Shield className="h-3 w-3" />
                        Cancellation policy applies
                      </div>
                    </div>
                    <div className="border-t pt-3 flex justify-between text-xs font-semibold text-gray-800">
                      <span>Total due</span>
                      <span>{previewPlan.isFree ? "Free" : `£${previewPlan.totalPrice.toFixed(2)}`}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-gray-400 mt-2">
                      <Lock className="h-2.5 w-2.5" />
                      Powered by <span className="font-semibold text-gray-500 ml-0.5">Stripe</span>
                    </div>
                  </div>

                  {/* Right — payment form */}
                  <div className="flex-1 p-5 space-y-3">
                    <p className="text-xs font-semibold text-gray-700">Contact information</p>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500">Email</label>
                      <div className="border rounded-lg px-3 py-2 text-xs text-gray-400 bg-gray-50">
                        {previewPlan.patient?.email || "patient@email.com"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500">Full Name <span className="text-red-400">*</span></label>
                      <div className="border rounded-lg px-3 py-2 text-xs text-gray-400 bg-gray-50">
                        {previewPlan.patient ? `${previewPlan.patient.firstName} ${previewPlan.patient.lastName}` : "Patient Name"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500">Phone number <span className="text-red-400">*</span></label>
                      <div className="border rounded-lg px-3 py-2 text-xs text-gray-400 bg-gray-50">+44 7700 900000</div>
                    </div>
                    <p className="text-xs font-semibold text-gray-700 pt-1">Card information</p>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="px-3 py-2 text-xs text-gray-400 bg-gray-50 flex items-center justify-between border-b">
                        <span>1234 1234 1234 1234</span>
                        <CreditCard className="h-3.5 w-3.5 text-gray-300" />
                      </div>
                      <div className="flex">
                        <div className="flex-1 px-3 py-2 text-xs text-gray-400 bg-gray-50 border-r">MM / YY</div>
                        <div className="flex-1 px-3 py-2 text-xs text-gray-400 bg-gray-50">CVC</div>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-gray-700">Billing address <span className="text-red-400">*</span></p>
                    <div className="border rounded-lg overflow-hidden text-xs text-gray-400">
                      <div className="px-3 py-2 bg-gray-50 border-b">United Kingdom</div>
                      <div className="px-3 py-2 bg-gray-50 border-b">Address line 1</div>
                      <div className="px-3 py-2 bg-gray-50 border-b">City</div>
                      <div className="px-3 py-2 bg-gray-50">Postcode</div>
                    </div>
                    <div className="flex gap-2 items-start">
                      <div className="w-3.5 h-3.5 border-2 rounded mt-0.5 shrink-0" style={{ borderColor: stripeBranding.primaryColor }} />
                      <p className="text-[9px] text-gray-500 leading-relaxed">
                        By completing this payment you agree to our{" "}
                        <a href="/cancellation-policy" target="_blank" className="underline" style={{ color: stripeBranding.primaryColor }}>Cancellation Policy</a>:
                        {previewPlan.planType === "SUBSCRIPTION"
                          ? " Treatment plan cancellations require admin review. No automatic self-service cancellation."
                          : " Appointments cancelled within 48 hours are non-refundable."}
                      </p>
                    </div>
                    <button
                      className="w-full py-2.5 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-2"
                      style={{ background: `linear-gradient(135deg, ${stripeBranding.primaryColor}, ${stripeBranding.secondaryColor})` }}
                    >
                      <Lock className="h-3.5 w-3.5" />
                      {previewPlan.isFree ? "Confirm Free Plan" : `Pay £${previewPlan.totalPrice.toFixed(2)}${previewPlan.planType === "SUBSCRIPTION" ? `/${previewPlan.subscriptionInterval || "month"}` : ""}`}
                    </button>
                    <p className="text-[9px] text-gray-400 text-center">
                      Your payment is secured by Stripe. We'll send a confirmation email.
                    </p>
                  </div>
                </div>
              </div>

              {/* Fields collected */}
              <div className="mt-4 border rounded-xl p-4 space-y-2 bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fields collected at checkout</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {["Email", "Full Name", "Phone Number", "Billing Address", "Card Details", "Cancellation Policy Acceptance"].map(f => (
                    <div key={f} className="flex items-center gap-1.5 text-xs">
                      <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex gap-2 justify-end">
                <a href="/admin/stripe-branding" target="_blank" className="flex items-center gap-1.5 text-xs text-[#5dc9c0] hover:underline">
                  <ExternalLink className="h-3 w-3" /> Edit Stripe Branding
                </a>
                <button onClick={() => setPreviewPlan(null)} className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Treatment Plan Permanently
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  You are about to permanently delete{" "}
                  <strong>&quot;{deleting?.name}&quot;</strong>
                  {deleting?.patient ? ` (${deleting.patient.firstName} ${deleting.patient.lastName})` : ""}.
                  This action cannot be undone.
                </p>
                {deleting?.stripeProductId && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <CreditCard className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-800 space-y-1">
                      <p className="font-semibold">Stripe product will be archived</p>
                      <p>
                        This plan is linked to a Stripe product. Stripe does not allow hard-deleting products
                        with payment history — the product and price will be <strong>archived (deactivated)</strong> in Stripe.
                        It will no longer be available for new payments.
                      </p>
                    </div>
                  </div>
                )}
                {!deleting?.stripeProductId && (
                  <div className="flex items-start gap-2 bg-muted/50 border rounded-lg p-3">
                    <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      This plan has no Stripe product linked. Only the local record will be deleted.
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground gap-2">
              <Trash2 className="h-4 w-4" />
              Delete{deleting?.stripeProductId ? " & Archive in Stripe" : " Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
