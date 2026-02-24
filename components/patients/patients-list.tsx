"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  User,
  Search,
  Loader2,
  Calendar,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Copy,
  Mail,
  Phone,
  Brain,
  FileUp,
  Edit,
  Trash2,
  MoreVertical,
  X,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  createdAt: string;
  isActive?: boolean;
  clinicId?: string | null;
  medicalScreening: {
    id: string;
    consentGiven: boolean;
  } | null;
  patientAppointments: Array<{
    id: string;
    dateTime: string;
    status: string;
  }>;
}

export default function PatientsList() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  // Create dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdInfo, setCreatedInfo] = useState<{ name: string; email: string; tempPassword?: string } | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  // Edit dialog
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', phone: '', isActive: true });
  const [saving, setSaving] = useState(false);
  // Delete dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await fetch("/api/patients");
      const data = await response.json();
      setPatients(data?.patients ?? []);
    } catch (error) {
      console.error("Error fetching patients:", error);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (p: Patient, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingPatient(p);
    setEditForm({
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email,
      phone: p.phone || '',
      isActive: p.isActive !== false,
    });
    setShowEditDialog(true);
  };

  const handleEdit = async () => {
    if (!editingPatient) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/patients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: editingPatient.id, ...editForm }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Updated', description: `${editForm.firstName} ${editForm.lastName} updated.` });
        setShowEditDialog(false);
        fetchPatients();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update', variant: 'destructive' });
      }
    } catch { toast({ title: 'Error', description: 'Network error', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const openDelete = (p: Patient, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingPatient(p);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!deletingPatient) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/patients?patientId=${deletingPatient.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Deleted', description: `${deletingPatient.firstName} ${deletingPatient.lastName} removed.` });
        setShowDeleteDialog(false);
        setDeletingPatient(null);
        fetchPatients();
      } else {
        const data = await res.json();
        toast({ title: 'Error', description: data.error || 'Failed to delete', variant: 'destructive' });
      }
    } catch { toast({ title: 'Error', description: 'Network error', variant: 'destructive' }); }
    finally { setDeleting(false); }
  };

  const filteredPatients = (patients ?? []).filter((patient) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    const name = `${patient?.firstName ?? ""} ${patient?.lastName ?? ""}`.toLowerCase();
    const email = (patient?.email ?? "").toLowerCase();
    const phone = (patient?.phone ?? "").toLowerCase();
    return name.includes(search) || email.includes(search) || phone.includes(search);
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">{T("admin.patientsTitle")}</h1>
        <p className="text-slate-600 text-sm mt-1">
          {T("admin.patientsDesc")}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search name, email or phone..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button className="gap-2 shrink-0" onClick={() => { setForm({ firstName: '', lastName: '', email: '', phone: '', password: '' }); setCreatedInfo(null); setShowCreateDialog(true); }}>
          <UserPlus className="h-4 w-4" /> <span className="hidden sm:inline">Add Patient</span><span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{patients.length} patient{patients.length !== 1 ? "s" : ""}</span>
        {searchQuery && <span>· {filteredPatients.length} matching</span>}
      </div>

      {/* Patients List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredPatients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-700 mb-2">
              {searchQuery ? "No patients match your search" : "No patients registered"}
            </h3>
            <p className="text-slate-500 text-sm">
              {searchQuery ? "Try a different search term." : "Add a patient to get started."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPatients.map((patient, index) => (
            <div>
              <Link href={`/admin/patients/${patient.id}`}>
                <Card className={`card-hover cursor-pointer ${patient.isActive === false ? "opacity-60" : ""}`}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm sm:text-base text-slate-800 truncate">
                            {patient.firstName} {patient.lastName}
                          </h3>
                          {patient.isActive === false && <Badge variant="outline" className="text-[9px]">Inactive</Badge>}
                          {patient.medicalScreening?.consentGiven ? (
                            <Badge variant="success" className="gap-0.5 text-[10px] hidden sm:flex">
                              <CheckCircle className="h-2.5 w-2.5" /> Screened
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="gap-0.5 text-[10px] hidden sm:flex">
                              <AlertCircle className="h-2.5 w-2.5" /> No Screening
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 truncate">{patient.email}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                          {patient.phone && <span className="hidden sm:inline"><Phone className="h-3 w-3 inline mr-0.5" /> {patient.phone}</span>}
                          <span><Calendar className="h-3 w-3 inline mr-0.5" /> {new Date(patient.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                          <span className="hidden sm:inline">{patient.patientAppointments?.length ?? 0} appts</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Link
                          href={`/admin/patients/${patient.id}/documents`}
                          onClick={(e) => e.stopPropagation()}
                          className="hidden lg:inline-flex items-center gap-1 text-xs font-medium bg-muted hover:bg-muted/80 px-2 py-1.5 rounded-md transition-colors"
                        >
                          <FileUp className="h-3 w-3" /> Docs
                        </Link>
                        <Link
                          href={`/admin/patients/${patient.id}/diagnosis`}
                          onClick={(e) => e.stopPropagation()}
                          className="hidden lg:inline-flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 px-2 py-1.5 rounded-md transition-colors"
                        >
                          <Brain className="h-3 w-3" /> AI
                        </Link>
                        <Link
                          href={`/admin/patients/${patient.id}/permissions`}
                          onClick={(e) => e.stopPropagation()}
                          className="hidden lg:inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 px-2 py-1.5 rounded-md transition-colors"
                        >
                          <Shield className="h-3 w-3" /> Perm.
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.preventDefault()}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e: any) => openEdit(patient, e)}>
                              <Edit className="h-3.5 w-3.5 mr-2" /> Editar Paciente
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/patients/${patient.id}/documents`} onClick={(e) => e.stopPropagation()}>
                                <FileUp className="h-3.5 w-3.5 mr-2" /> Documentos
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/patients/${patient.id}/diagnosis`} onClick={(e) => e.stopPropagation()}>
                                <Brain className="h-3.5 w-3.5 mr-2" /> Avaliação IA
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/patients/${patient.id}/permissions`} onClick={(e) => e.stopPropagation()}>
                                <Shield className="h-3.5 w-3.5 mr-2" /> Permissões
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e: any) => openDelete(patient, e)}>
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir Paciente
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <ArrowRight className="h-4 w-4 text-slate-400 hidden md:block" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* ═══ CREATE PATIENT DIALOG ═══ */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Add New Patient
            </DialogTitle>
            <DialogDescription>
              Create a patient account. They can log in with the credentials below.
            </DialogDescription>
          </DialogHeader>

          {createdInfo ? (
            <div className="space-y-4 py-2">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="font-semibold text-green-800">Patient Created!</p>
                </div>
                <div className="space-y-2 text-sm">
                  <p><strong>Name:</strong> {createdInfo.name}</p>
                  <p><strong>Email:</strong> {createdInfo.email}</p>
                  {createdInfo.tempPassword && (
                    <div className="bg-white rounded p-2 border border-green-300">
                      <p className="text-xs text-muted-foreground mb-1">Temporary Password:</p>
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-sm bg-slate-100 px-2 py-1 rounded flex-1 break-all">{createdInfo.tempPassword}</code>
                        <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(createdInfo.tempPassword || ''); toast({ title: 'Copied!' }); }}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-[10px] text-amber-600 mt-1">Share this with the patient.</p>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Close</Button>
                <Button onClick={() => { setCreatedInfo(null); setForm({ firstName: '', lastName: '', email: '', phone: '', password: '' }); }}>Add Another</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" placeholder="John" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input id="lastName" placeholder="Smith" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="patient@example.com" className="pl-10" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="phone" placeholder="+44 7XXX XXXXXX" className="pl-10" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password <span className="text-muted-foreground text-xs">(blank = Patient123!)</span></Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="pr-10" />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                <Button
                  className="gap-2"
                  disabled={!form.firstName || !form.lastName || !form.email || creating}
                  onClick={async () => {
                    setCreating(true);
                    try {
                      const res = await fetch('/api/admin/patients', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(form),
                      });
                      const data = await res.json();
                      if (res.ok) {
                        setCreatedInfo({
                          name: `${data.patient.firstName} ${data.patient.lastName}`,
                          email: data.patient.email,
                          tempPassword: data.tempPassword,
                        });
                        fetchPatients();
                        toast({ title: 'Patient created', description: `${data.patient.firstName} ${data.patient.lastName} added successfully.` });
                      } else {
                        toast({ title: 'Error', description: data.error || 'Failed to create patient', variant: 'destructive' });
                      }
                    } catch {
                      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
                    } finally {
                      setCreating(false);
                    }
                  }}
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Create Patient
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ EDIT PATIENT DIALOG ═══ */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Edit Patient
            </DialogTitle>
            <DialogDescription>
              Update patient information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name *</Label>
                <Input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name *</Label>
                <Input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="email" className="pl-10" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-10" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={editForm.isActive} onCheckedChange={(c) => setEditForm({ ...editForm, isActive: c })} />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button disabled={!editForm.firstName || !editForm.lastName || !editForm.email || saving} onClick={handleEdit}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ DELETE PATIENT DIALOG ═══ */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Patient</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{deletingPatient?.firstName} {deletingPatient?.lastName}</strong>?
              This will remove all their data including screenings, assessments, and documents. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete Patient
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
