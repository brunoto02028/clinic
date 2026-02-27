"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Edit,
  Trash2,
  Plus,
  Loader2,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import { TREATMENT_OPTIONS } from "@/lib/types";

interface Appointment {
  id: string;
  dateTime: string;
  duration: number;
  treatmentType: string;
  status: string;
  price: number;
  notes: string | null;
  patient: { id: string; firstName: string; lastName: string; email: string };
  therapist: { id: string; firstName: string; lastName: string };
}

interface Patient { id: string; firstName: string; lastName: string; email: string; }

export default function AdminAppointmentsPage() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const isPt = locale === "pt-BR";
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [createForm, setCreateForm] = useState({
    patientId: "",
    dateTime: "",
    duration: 60,
    treatmentType: "Initial Assessment",
    price: 75,
    notes: "",
  });
  const [editForm, setEditForm] = useState({
    dateTime: "",
    duration: 0,
    treatmentType: "",
    price: 0,
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await fetch("/api/admin/appointments");
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
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

  const handleCreateAppointment = async () => {
    if (!createForm.patientId || !createForm.dateTime) {
      toast({ title: "Error", description: "Patient and date/time are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: createForm.patientId,
          dateTime: new Date(createForm.dateTime).toISOString(),
          duration: Number(createForm.duration),
          treatmentType: createForm.treatmentType,
          price: Number(createForm.price),
          notes: createForm.notes || null,
        }),
      });
      if (res.ok) {
        toast({ title: isPt ? "Consulta criada" : "Appointment created", description: isPt ? "O paciente receberá um email de confirmação." : "The patient will receive a confirmation email." });
        setShowCreateDialog(false);
        setCreateForm({ patientId: "", dateTime: "", duration: 60, treatmentType: "Initial Assessment", price: 75, notes: "" });
        fetchAppointments();
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error || "Failed to create appointment", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create appointment", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setAppointments(
          appointments.map((a) =>
            a.id === appointmentId ? { ...a, status: newStatus } : a
          )
        );
        toast({
          title: "Status updated",
          description: `Appointment has been marked as ${newStatus}.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update appointment.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    const localDateTime = new Date(appointment.dateTime);
    const year = localDateTime.getFullYear();
    const month = String(localDateTime.getMonth() + 1).padStart(2, '0');
    const day = String(localDateTime.getDate()).padStart(2, '0');
    const hours = String(localDateTime.getHours()).padStart(2, '0');
    const minutes = String(localDateTime.getMinutes()).padStart(2, '0');
    const formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    setEditForm({
      dateTime: formattedDateTime,
      duration: appointment.duration,
      treatmentType: appointment.treatmentType,
      price: appointment.price,
      notes: appointment.notes || "",
    });
    setShowEditDialog(true);
  };

  const handleEditAppointment = async () => {
    if (!selectedAppointment) return;
    
    setSubmitting(true);
    try {
      const res = await fetch(`/api/appointments/${selectedAppointment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateTime: new Date(editForm.dateTime).toISOString(),
          duration: Number(editForm.duration),
          treatmentType: editForm.treatmentType,
          price: Number(editForm.price),
          notes: editForm.notes,
        }),
      });

      if (res.ok) {
        await fetchAppointments();
        setShowEditDialog(false);
        toast({
          title: "Appointment updated",
          description: "The appointment has been updated successfully.",
        });
      } else {
        throw new Error("Failed to update appointment");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDeleteDialog(true);
  };

  const handleDeleteAppointment = async () => {
    if (!selectedAppointment) return;
    
    setSubmitting(true);
    try {
      const res = await fetch(`/api/appointments/${selectedAppointment.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setAppointments(appointments.filter(a => a.id !== selectedAppointment.id));
        setShowDeleteDialog(false);
        toast({
          title: "Appointment deleted",
          description: "The appointment has been deleted successfully.",
        });
      } else {
        throw new Error("Failed to delete appointment");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAppointments = appointments.filter((a) => {
    const matchesSearch =
      a.patient.firstName.toLowerCase().includes(search.toLowerCase()) ||
      a.patient.lastName.toLowerCase().includes(search.toLowerCase()) ||
      a.treatmentType.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return { class: "bg-green-500/20 text-green-400", icon: CheckCircle };
      case "CONFIRMED":
        return { class: "bg-blue-500/20 text-blue-400", icon: CheckCircle };
      case "PENDING":
        return { class: "bg-yellow-500/20 text-yellow-400", icon: AlertCircle };
      case "CANCELLED":
        return { class: "bg-red-500/20 text-red-400", icon: XCircle };
      default:
        return { class: "bg-muted text-muted-foreground", icon: AlertCircle };
    }
  };

  const statusCounts = {
    ALL: appointments.length,
    PENDING: appointments.filter((a) => a.status === "PENDING").length,
    CONFIRMED: appointments.filter((a) => a.status === "CONFIRMED").length,
    COMPLETED: appointments.filter((a) => a.status === "COMPLETED").length,
    CANCELLED: appointments.filter((a) => a.status === "CANCELLED").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{T("admin.appointmentsTitle")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {T("admin.appointmentsDesc")}
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" /> {isPt ? "Nova Consulta" : "New Appointment"}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient or treatment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(statusCounts).map(([status, count]) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
              <span className="ml-1 text-xs opacity-70">({count})</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredAppointments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No appointments found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((appointment) => {
            const badge = getStatusBadge(appointment.status);
            const StatusIcon = badge.icon;
            return (
              <Card key={appointment.id} className="card-hover">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">
                          {appointment.patient.firstName}{" "}
                          {appointment.patient.lastName}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.class}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {appointment.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {appointment.treatmentType}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(appointment.dateTime).toLocaleDateString(
                            "en-GB",
                            {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            }
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(appointment.dateTime).toLocaleTimeString(
                            "en-GB",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </span>
                        <span>£{appointment.price}</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {appointment.status === "PENDING" && (
                        <>
                          <Button
                            size="sm"
                            className="h-8 text-xs px-2"
                            onClick={() => updateStatus(appointment.id, "CONFIRMED")}
                          >
                            <CheckCircle className="h-3.5 w-3.5 sm:mr-1" />
                            <span className="hidden sm:inline">Confirm</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs px-2 text-destructive"
                            onClick={() => updateStatus(appointment.id, "CANCELLED")}
                          >
                            <XCircle className="h-3.5 w-3.5 sm:mr-1" />
                            <span className="hidden sm:inline">Cancel</span>
                          </Button>
                        </>
                      )}
                      {appointment.status === "CONFIRMED" && (
                        <Button
                          size="sm"
                          className="h-8 text-xs px-2"
                          onClick={() => updateStatus(appointment.id, "COMPLETED")}
                        >
                          <CheckCircle className="h-3.5 w-3.5 sm:mr-1" />
                          <span className="hidden sm:inline">Complete</span>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs px-2"
                        onClick={() => openEditDialog(appointment)}
                      >
                        <Edit className="h-3.5 w-3.5 sm:mr-1" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs px-2 text-destructive"
                        onClick={() => openDeleteDialog(appointment)}
                      >
                        <Trash2 className="h-3.5 w-3.5 sm:mr-1" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Appointment Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {isPt ? "Nova Consulta" : "New Appointment"}
            </DialogTitle>
            <DialogDescription>
              {isPt ? "Agende uma consulta para um paciente. O paciente receberá um email de confirmação automaticamente." : "Schedule an appointment for a patient. The patient will receive a confirmation email automatically."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{isPt ? "Paciente *" : "Patient *"}</Label>
              <Select value={createForm.patientId} onValueChange={v => setCreateForm(f => ({ ...f, patientId: v }))}>
                <SelectTrigger><SelectValue placeholder={isPt ? "Selecionar paciente..." : "Select patient..."} /></SelectTrigger>
                <SelectContent>
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isPt ? "Tipo de Tratamento" : "Treatment Type"}</Label>
              <Select value={createForm.treatmentType} onValueChange={v => {
                const opt = TREATMENT_OPTIONS.find(t => t.name === v);
                setCreateForm(f => ({ ...f, treatmentType: v, duration: opt?.duration || f.duration, price: opt?.price || f.price }));
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TREATMENT_OPTIONS.map(t => (
                    <SelectItem key={t.id} value={t.name}>{isPt && t.namePt ? t.namePt : t.name} — £{t.price} ({t.duration}min)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isPt ? "Data e Hora *" : "Date & Time *"}</Label>
              <Input type="datetime-local" value={createForm.dateTime} onChange={e => setCreateForm(f => ({ ...f, dateTime: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isPt ? "Duração (min)" : "Duration (min)"}</Label>
                <Input type="number" value={createForm.duration} onChange={e => setCreateForm(f => ({ ...f, duration: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>{isPt ? "Preço (£)" : "Price (£)"}</Label>
                <Input type="number" step="0.01" value={createForm.price} onChange={e => setCreateForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isPt ? "Notas" : "Notes"}</Label>
              <Textarea value={createForm.notes} onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder={isPt ? "Notas opcionais sobre a consulta..." : "Optional notes about the appointment..."} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{isPt ? "Cancelar" : "Cancel"}</Button>
            <Button onClick={handleCreateAppointment} disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPt ? "Criar Consulta" : "Create Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
            <DialogDescription>
              Update the appointment details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date & Time</label>
              <Input
                type="datetime-local"
                value={editForm.dateTime}
                onChange={(e) =>
                  setEditForm({ ...editForm, dateTime: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Duration (minutes)</label>
              <Input
                type="number"
                value={editForm.duration}
                onChange={(e) =>
                  setEditForm({ ...editForm, duration: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Treatment Type</label>
              <Input
                type="text"
                value={editForm.treatmentType}
                onChange={(e) =>
                  setEditForm({ ...editForm, treatmentType: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Price (£)</label>
              <Input
                type="number"
                step="0.01"
                value={editForm.price}
                onChange={(e) =>
                  setEditForm({ ...editForm, price: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm({ ...editForm, notes: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleEditAppointment} disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the appointment for{" "}
              <strong>
                {selectedAppointment?.patient.firstName}{" "}
                {selectedAppointment?.patient.lastName}
              </strong>{" "}
              on{" "}
              <strong>
                {selectedAppointment &&
                  new Date(selectedAppointment.dateTime).toLocaleString(
                    "en-GB",
                    { dateStyle: "full", timeStyle: "short" }
                  )}
              </strong>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAppointment}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? "Deleting..." : "Delete Appointment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
