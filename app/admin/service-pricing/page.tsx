"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Save,
  Calendar,
  Footprints,
  Activity,
  CreditCard,
  Search,
  Shield,
  CheckCircle,
  XCircle,
  UserCheck,
  Plus,
  Package,
  Trash2,
  Pencil,
  Users,
  X,
  Sparkles,
  Send,
} from "lucide-react";

interface ServicePrice {
  id?: string;
  serviceType: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  isActive: boolean;
}

interface PatientAccess {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  access: Record<string, { granted: boolean; paid: boolean; id?: string }>;
}

interface ServicePkg {
  id?: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  includedServices: string[];
  durationDays: number | null;
  sessionsIncluded: number | null;
  isActive: boolean;
  sortOrder: number;
  _count?: { patientPackages: number };
}

const SERVICE_TYPES = [
  { type: "CONSULTATION", label: "Consultation Booking", icon: Calendar, defaultName: "Initial Consultation", defaultDesc: "First consultation with the physiotherapist including assessment and treatment plan." },
  { type: "FOOT_SCAN", label: "Foot Scan", icon: Footprints, defaultName: "Foot Scan Analysis", defaultDesc: "Biomechanical foot analysis with custom insole recommendation." },
  { type: "BODY_ASSESSMENT", label: "Body Assessment", icon: Activity, defaultName: "Body Assessment", defaultDesc: "Full body posture and movement assessment with AI analysis." },
];

export default function ServicePricingPage() {
  const [prices, setPrices] = useState<ServicePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [patients, setPatients] = useState<PatientAccess[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [togglingAccess, setTogglingAccess] = useState<string | null>(null);
  // Packages
  const [packages, setPackages] = useState<ServicePkg[]>([]);
  const [showPkgForm, setShowPkgForm] = useState(false);
  const [editPkg, setEditPkg] = useState<ServicePkg | null>(null);
  const [pkgForm, setPkgForm] = useState<ServicePkg>({ name: "", description: "", price: 0, currency: "GBP", includedServices: [], durationDays: null, sessionsIncluded: null, isActive: true, sortOrder: 0 });
  const [savingPkg, setSavingPkg] = useState(false);
  // Assign package to patient
  const [assignSearch, setAssignSearch] = useState("");
  const [assignPatients, setAssignPatients] = useState<{ id: string; firstName: string; lastName: string; email: string }[]>([]);
  const [assignSearchLoading, setAssignSearchLoading] = useState(false);
  const [assigningPkg, setAssigningPkg] = useState<string | null>(null);
  // AI assistant
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPrices();
    fetchPackages();
  }, []);

  const fetchPrices = async () => {
    try {
      const res = await fetch("/api/admin/service-prices");
      const data = await res.json();
      if (Array.isArray(data)) {
        // Merge with defaults
        const merged = SERVICE_TYPES.map((st) => {
          const existing = data.find((p: any) => p.serviceType === st.type);
          return existing || {
            serviceType: st.type,
            name: st.defaultName,
            description: st.defaultDesc,
            price: 0,
            currency: "GBP",
            isActive: false,
          };
        });
        setPrices(merged);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const savePrice = async (sp: ServicePrice) => {
    setSaving(sp.serviceType);
    try {
      const res = await fetch("/api/admin/service-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sp),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Saved!", description: `${sp.name} pricing updated.` });
      fetchPrices();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const deletePrice = async (sp: ServicePrice) => {
    if (!sp.id) {
      // Not saved yet — just reset to defaults
      const stConfig = SERVICE_TYPES.find((s) => s.type === sp.serviceType)!;
      setPrices((prev) => prev.map((p) => p.serviceType === sp.serviceType ? {
        serviceType: sp.serviceType, name: stConfig.defaultName,
        description: stConfig.defaultDesc, price: 0, currency: "GBP", isActive: false,
      } : p));
      toast({ title: "Reset", description: `${sp.name} reset to defaults.` });
      return;
    }
    if (!confirm(`Delete "${sp.name}" pricing? This cannot be undone.`)) return;
    try {
      const res = await fetch("/api/admin/service-prices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sp.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Deleted", description: `${sp.name} pricing removed.` });
      fetchPrices();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const searchPatients = async () => {
    if (!patientSearch.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/admin/patients?search=${encodeURIComponent(patientSearch)}&limit=10`);
      const data = await res.json();
      const patientList = Array.isArray(data) ? data : data.patients || [];

      // For each patient, fetch their service access
      const patientsWithAccess: PatientAccess[] = [];
      for (const p of patientList) {
        const accessRes = await fetch(`/api/admin/service-access?patientId=${p.id}`);
        const accessData = await accessRes.json();
        const accessMap: Record<string, { granted: boolean; paid: boolean; id?: string }> = {};
        for (const st of SERVICE_TYPES) {
          const record = Array.isArray(accessData) ? accessData.find((a: any) => a.serviceType === st.type) : null;
          accessMap[st.type] = {
            granted: record?.granted || false,
            paid: record?.paid || false,
            id: record?.id,
          };
        }
        patientsWithAccess.push({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email,
          access: accessMap,
        });
      }

      setPatients(patientsWithAccess);
    } catch { /* ignore */ }
    setSearchLoading(false);
  };

  const toggleAccess = async (patientId: string, serviceType: string, currentGranted: boolean) => {
    const key = `${patientId}-${serviceType}`;
    setTogglingAccess(key);
    try {
      const res = await fetch("/api/admin/service-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, serviceType, granted: !currentGranted }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: !currentGranted ? "Access Granted" : "Access Revoked", description: `Service access updated.` });
      // Refresh
      searchPatients();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setTogglingAccess(null);
    }
  };

  // ── Package functions ──────────────────────
  const fetchPackages = async () => {
    try {
      const res = await fetch("/api/admin/service-packages");
      const data = await res.json();
      if (Array.isArray(data)) setPackages(data);
    } catch { /* ignore */ }
  };

  const openPkgForm = (pkg?: ServicePkg) => {
    if (pkg) {
      setEditPkg(pkg);
      setPkgForm({ ...pkg });
    } else {
      setEditPkg(null);
      setPkgForm({ name: "", description: "", price: 0, currency: "GBP", includedServices: [], durationDays: null, sessionsIncluded: null, isActive: true, sortOrder: 0 });
    }
    setShowPkgForm(true);
  };

  const savePkg = async () => {
    if (!pkgForm.name || pkgForm.includedServices.length === 0) {
      toast({ title: "Error", description: "Name and at least one service are required.", variant: "destructive" });
      return;
    }
    setSavingPkg(true);
    try {
      const res = await fetch("/api/admin/service-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editPkg?.id ? { ...pkgForm, id: editPkg.id } : pkgForm),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Saved!", description: `Package "${pkgForm.name}" saved.` });
      setShowPkgForm(false);
      fetchPackages();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingPkg(false);
    }
  };

  const deletePkg = async (id: string) => {
    if (!confirm("Delete this package?")) return;
    try {
      await fetch("/api/admin/service-packages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      toast({ title: "Deleted" });
      fetchPackages();
    } catch { /* ignore */ }
  };

  const searchAssignPatients = async () => {
    if (!assignSearch.trim()) return;
    setAssignSearchLoading(true);
    try {
      const res = await fetch(`/api/admin/patients?search=${encodeURIComponent(assignSearch)}&limit=10`);
      const data = await res.json();
      setAssignPatients(Array.isArray(data) ? data : data.patients || []);
    } catch { /* ignore */ }
    setAssignSearchLoading(false);
  };

  const assignPackage = async (patientId: string, packageId: string) => {
    const key = `${patientId}-${packageId}`;
    setAssigningPkg(key);
    try {
      const res = await fetch("/api/admin/patient-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, packageId, paid: true }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Package Assigned!", description: "Patient now has access to the included services." });
      fetchPackages();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAssigningPkg(null);
    }
  };

  // AI package assistant
  const aiGeneratePackage = async () => {
    if (!aiInput.trim() || aiLoading) return;
    setAiLoading(true);
    setAiMessage(null);
    try {
      const res = await fetch("/api/admin/service-packages/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: aiInput, serviceTypes: SERVICE_TYPES.map(s => ({ type: s.type, label: s.label })) }),
      });
      if (res.ok) {
        const { response } = await res.json();
        // Parse JSON from AI response
        const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const raw = jsonMatch[1] || jsonMatch[0];
          const parsed = JSON.parse(raw);
          // Fill the form
          if (parsed.name) setPkgForm(p => ({ ...p, name: parsed.name }));
          if (parsed.description) setPkgForm(p => ({ ...p, description: parsed.description }));
          if (parsed.price !== undefined) setPkgForm(p => ({ ...p, price: parsed.price }));
          if (parsed.currency) setPkgForm(p => ({ ...p, currency: parsed.currency }));
          if (parsed.includedServices && Array.isArray(parsed.includedServices)) setPkgForm(p => ({ ...p, includedServices: parsed.includedServices }));
          if (parsed.durationDays !== undefined) setPkgForm(p => ({ ...p, durationDays: parsed.durationDays }));
          if (parsed.sessionsIncluded !== undefined) setPkgForm(p => ({ ...p, sessionsIncluded: parsed.sessionsIncluded }));
          if (parsed.isActive !== undefined) setPkgForm(p => ({ ...p, isActive: parsed.isActive }));
          // Show summary or questions
          if (parsed._questions) {
            setAiMessage(parsed._questions);
          } else if (parsed._summary) {
            setAiMessage(parsed._summary);
            setAiInput("");
          } else {
            setAiMessage("✅ Fields filled! Review and save.");
            setAiInput("");
          }
          toast({ title: "AI Package Assistant", description: "Fields populated from your description." });
        } else {
          setAiMessage(response);
        }
      } else {
        const err = await res.json();
        setAiMessage(`Error: ${err.error}`);
      }
    } catch (e: any) {
      setAiMessage(`Error: ${e.message}`);
    }
    setAiLoading(false);
  };

  const togglePkgService = (svc: string) => {
    setPkgForm((prev) => ({
      ...prev,
      includedServices: prev.includedServices.includes(svc)
        ? prev.includedServices.filter((s) => s !== svc)
        : [...prev.includedServices, svc],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Service Pricing & Access</h1>
        <p className="text-muted-foreground mt-1">Configure service prices and manage patient access</p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {prices.map((sp) => {
          const stConfig = SERVICE_TYPES.find((s) => s.type === sp.serviceType)!;
          const Icon = stConfig.icon;

          return (
            <Card key={sp.serviceType}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{stConfig.label}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`active-${sp.serviceType}`} className="text-xs text-muted-foreground">Active</Label>
                    <Switch
                      id={`active-${sp.serviceType}`}
                      checked={sp.isActive}
                      onCheckedChange={(checked) => {
                        setPrices((prev) => prev.map((p) => p.serviceType === sp.serviceType ? { ...p, isActive: checked } : p));
                      }}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Display Name</Label>
                  <Input
                    value={sp.name}
                    onChange={(e) => setPrices((prev) => prev.map((p) => p.serviceType === sp.serviceType ? { ...p, name: e.target.value } : p))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    value={sp.description}
                    onChange={(e) => setPrices((prev) => prev.map((p) => p.serviceType === sp.serviceType ? { ...p, description: e.target.value } : p))}
                    rows={2}
                    className="text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={sp.price}
                      onChange={(e) => setPrices((prev) => prev.map((p) => p.serviceType === sp.serviceType ? { ...p, price: parseFloat(e.target.value) || 0 } : p))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Currency</Label>
                    <Input
                      value={sp.currency}
                      onChange={(e) => setPrices((prev) => prev.map((p) => p.serviceType === sp.serviceType ? { ...p, currency: e.target.value } : p))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => savePrice(sp)}
                    disabled={saving === sp.serviceType}
                  >
                    {saving === sp.serviceType ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                    onClick={() => deletePrice(sp)}
                    title="Delete / Reset"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Patient Access Override */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Patient Access Override (Free Access)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search patient by name or email..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchPatients()}
              className="flex-1"
            />
            <Button onClick={searchPatients} disabled={searchLoading} className="gap-1.5">
              {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </Button>
          </div>

          {patients.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Patient</th>
                    {SERVICE_TYPES.map((st) => (
                      <th key={st.type} className="text-center px-3 py-2 font-medium">{st.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {patients.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{p.firstName} {p.lastName}</p>
                          <p className="text-xs text-muted-foreground">{p.email}</p>
                        </div>
                      </td>
                      {SERVICE_TYPES.map((st) => {
                        const access = p.access[st.type];
                        const isToggling = togglingAccess === `${p.id}-${st.type}`;
                        return (
                          <td key={st.type} className="text-center px-3 py-3">
                            {access.paid ? (
                              <Badge className="bg-green-100 text-green-800 gap-1">
                                <CreditCard className="h-3 w-3" /> Paid
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant={access.granted ? "default" : "outline"}
                                className={`gap-1 text-xs h-7 ${access.granted ? "bg-green-600 hover:bg-green-700" : ""}`}
                                onClick={() => toggleAccess(p.id, st.type, access.granted)}
                                disabled={isToggling}
                              >
                                {isToggling ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : access.granted ? (
                                  <><CheckCircle className="h-3 w-3" /> Free</>
                                ) : (
                                  <><XCircle className="h-3 w-3" /> No Access</>
                                )}
                              </Button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {patients.length === 0 && patientSearch && !searchLoading && (
            <p className="text-sm text-muted-foreground text-center py-4">No patients found. Try a different search.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Service Packages ────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Service Packages / Plans
            </CardTitle>
            <Button size="sm" onClick={() => openPkgForm()} className="gap-1.5">
              <Plus className="h-4 w-4" /> New Package
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {packages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No packages created yet. Click &quot;New Package&quot; to create one.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <Card key={pkg.id} className={`border ${pkg.isActive ? 'border-primary/30' : 'border-muted opacity-60'}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{pkg.name}</h3>
                        {pkg.description && <p className="text-xs text-muted-foreground mt-0.5">{pkg.description}</p>}
                      </div>
                      <Badge variant={pkg.isActive ? "default" : "secondary"} className="text-xs">
                        {pkg.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {pkg.currency === "GBP" ? "£" : pkg.currency} {pkg.price.toFixed(2)}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {pkg.includedServices.map((svc) => {
                        const st = SERVICE_TYPES.find((s) => s.type === svc);
                        return <Badge key={svc} variant="outline" className="text-xs">{st?.label || svc}</Badge>;
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {pkg.durationDays && <p>Duration: {pkg.durationDays} days</p>}
                      {pkg.sessionsIncluded && <p>Sessions: {pkg.sessionsIncluded}</p>}
                      <p className="flex items-center gap-1"><Users className="h-3 w-3" /> {pkg._count?.patientPackages || 0} assigned</p>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" className="flex-1 gap-1 h-7 text-xs" onClick={() => openPkgForm(pkg)}>
                        <Pencil className="h-3 w-3" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 h-7 text-xs text-destructive hover:bg-destructive/10" onClick={() => pkg.id && deletePkg(pkg.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Package Form Modal */}
      {showPkgForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-10 overflow-y-auto">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-lg mx-4 mb-10">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold">{editPkg ? "Edit Package" : "New Package"}</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowPkgForm(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="p-5 space-y-4">
              {/* AI Assistant */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Assistant — describe the package and I'll fill the fields
                </div>
                <div className="flex gap-2">
                  <Input
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && aiGeneratePackage()}
                    placeholder='e.g. "Complete rehab package, 12 sessions, consultation + foot scan + body assessment, £499, 90 days"'
                    className="text-sm flex-1"
                  />
                  <Button size="icon" onClick={aiGeneratePackage} disabled={aiLoading || !aiInput.trim()} className="shrink-0">
                    {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                {aiMessage && (
                  <p className="text-xs text-muted-foreground bg-background rounded p-2">{aiMessage}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Package Name *</Label>
                <Input value={pkgForm.name} onChange={(e) => setPkgForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Complete Package" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Description</Label>
                <Textarea value={pkgForm.description} onChange={(e) => setPkgForm((p) => ({ ...p, description: e.target.value }))} rows={2} placeholder="What's included..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Price *</Label>
                  <Input type="number" step="0.01" min="0" value={pkgForm.price} onChange={(e) => setPkgForm((p) => ({ ...p, price: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Currency</Label>
                  <Input value={pkgForm.currency} onChange={(e) => setPkgForm((p) => ({ ...p, currency: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Included Services *</Label>
                {SERVICE_TYPES.map((st) => (
                  <div key={st.type} className="flex items-center gap-2">
                    <Checkbox checked={pkgForm.includedServices.includes(st.type)} onCheckedChange={() => togglePkgService(st.type)} id={`pkg-svc-${st.type}`} />
                    <Label htmlFor={`pkg-svc-${st.type}`} className="text-sm font-normal cursor-pointer">{st.label}</Label>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Duration (days)</Label>
                  <Input type="number" min="0" value={pkgForm.durationDays || ""} onChange={(e) => setPkgForm((p) => ({ ...p, durationDays: e.target.value ? parseInt(e.target.value) : null }))} placeholder="Unlimited" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Sessions Included</Label>
                  <Input type="number" min="0" value={pkgForm.sessionsIncluded || ""} onChange={(e) => setPkgForm((p) => ({ ...p, sessionsIncluded: e.target.value ? parseInt(e.target.value) : null }))} placeholder="Unlimited" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={pkgForm.isActive} onCheckedChange={(c) => setPkgForm((p) => ({ ...p, isActive: c }))} id="pkg-active" />
                <Label htmlFor="pkg-active" className="text-sm">Active</Label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t">
              <Button variant="outline" onClick={() => setShowPkgForm(false)}>Cancel</Button>
              <Button onClick={savePkg} disabled={savingPkg} className="gap-1.5">
                {savingPkg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editPkg ? "Update" : "Create"} Package
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Package to Patient */}
      {packages.filter((p) => p.isActive).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Assign Package to Patient
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search patient by name or email..."
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchAssignPatients()}
                className="flex-1"
              />
              <Button onClick={searchAssignPatients} disabled={assignSearchLoading} className="gap-1.5">
                {assignSearchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </Button>
            </div>

            {assignPatients.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">Patient</th>
                      {packages.filter((p) => p.isActive).map((pkg) => (
                        <th key={pkg.id} className="text-center px-3 py-2 font-medium">{pkg.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {assignPatients.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <p className="font-medium">{p.firstName} {p.lastName}</p>
                          <p className="text-xs text-muted-foreground">{p.email}</p>
                        </td>
                        {packages.filter((pkg) => pkg.isActive).map((pkg) => {
                          const isAssigning = assigningPkg === `${p.id}-${pkg.id}`;
                          return (
                            <td key={pkg.id} className="text-center px-3 py-3">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-xs h-7"
                                onClick={() => pkg.id && assignPackage(p.id, pkg.id)}
                                disabled={isAssigning}
                              >
                                {isAssigning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                                Assign
                              </Button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
