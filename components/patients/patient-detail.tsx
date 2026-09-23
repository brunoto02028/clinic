"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  User,
  Calendar,
  Mail,
  Phone,
  ArrowLeft,
  Loader2,
  AlertCircle,
  FileText,
  ClipboardList,
  Shield,
  AlertTriangle,
  CheckCircle,
  Plus,
  Pencil,
  Trash2,
  Download,
  X,
  Clock,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/components/ui/use-toast";
import { ClinicalReportViewer } from "@/components/clinical-analysis/clinical-report-viewer";

interface PatientDetailProps {
  patientId: string;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  createdAt: string;
  medicalScreening: {
    unexplainedWeightLoss: boolean;
    nightPain: boolean;
    traumaHistory: boolean;
    neurologicalSymptoms: boolean;
    bladderBowelDysfunction: boolean;
    recentInfection: boolean;
    cancerHistory: boolean;
    steroidUse: boolean;
    osteoporosisRisk: boolean;
    cardiovascularSymptoms: boolean;
    severeHeadache: boolean;
    dizzinessBalanceIssues: boolean;
    currentMedications: string | null;
    allergies: string | null;
    surgicalHistory: string | null;
    otherConditions: string | null;
    gpDetails: string | null;
    emergencyContact: string | null;
    emergencyContactPhone: string | null;
    consentGiven: boolean;
  } | null;
  patientAppointments: Array<{
    id: string;
    dateTime: string;
    treatmentType: string;
    status: string;
    notes: string | null;
    therapist: {
      firstName: string;
      lastName: string;
    };
    soapNote: { id: string } | null;
  }>;
  soapNotesFor: Array<{
    id: string;
    createdAt: string;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    appointment: {
      dateTime: string;
      treatmentType: string;
    };
    therapist: {
      firstName: string;
      lastName: string;
    };
  }>;
}

interface Therapist {
  id: string;
  firstName: string;
  lastName: string;
}

const RED_FLAG_LABELS: Record<string, string> = {
  unexplainedWeightLoss: "Unexplained Weight Loss",
  nightPain: "Severe Night Pain",
  traumaHistory: "Recent Trauma/Injury",
  neurologicalSymptoms: "Neurological Symptoms",
  bladderBowelDysfunction: "Bladder/Bowel Dysfunction",
  recentInfection: "Recent Infection/Fever",
  cancerHistory: "Cancer History",
  steroidUse: "Steroid Use",
  osteoporosisRisk: "Osteoporosis Risk",
  cardiovascularSymptoms: "Cardiovascular Symptoms",
  severeHeadache: "Severe Headache",
  dizzinessBalanceIssues: "Dizziness/Balance Issues",
};

const TREATMENT_TYPES = [
  "Initial Assessment",
  "Follow-up Session",
  "Kinesiotherapy",
  "MENS Therapy",
  "Laser Therapy",
  "Shockwave Therapy",
  "EMS Treatment",
  "Therapeutic Ultrasound",
  "Post-Surgery Rehabilitation",
  "Sports Injury Treatment",
  "Chronic Pain Management",
];

export default function PatientDetail({ patientId }: PatientDetailProps) {
  const { data: session } = useSession() || {};
  const { toast } = useToast();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === "ADMIN";
  const isStaff = userRole === "ADMIN" || userRole === "THERAPIST";
  
  // Modal states
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showDeleteNoteDialog, setShowDeleteNoteDialog] = useState(false);
  const [showDeleteApptDialog, setShowDeleteApptDialog] = useState(false);
  const [showEditPatientModal, setShowEditPatientModal] = useState(false);
  const [showDeletePatientDialog, setShowDeletePatientDialog] = useState(false);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Appointment form
  const [appointmentForm, setAppointmentForm] = useState({
    date: "",
    time: "",
    treatmentType: "",
    therapistId: "",
    notes: "",
  });

  // Note form
  const [noteForm, setNoteForm] = useState({
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
    appointmentId: "",
  });

  // Patient edit form
  const [patientEditForm, setPatientEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    setMounted(true);
    fetchPatient();
    fetchTherapists();
  }, [patientId]);

  const fetchPatient = async () => {
    try {
      const response = await fetch(`/api/patients/${patientId}`);
      const data = await response.json();
      setPatient(data?.patient ?? null);
    } catch (error) {
      console.error("Error fetching patient:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTherapists = async () => {
    try {
      const response = await fetch("/api/therapists");
      const data = await response.json();
      setTherapists(data?.therapists ?? []);
    } catch (error) {
      console.error("Error fetching therapists:", error);
    }
  };

  const getRedFlags = () => {
    if (!patient?.medicalScreening) return [];
    const flags: string[] = [];
    Object.entries(RED_FLAG_LABELS).forEach(([key, label]) => {
      if (patient.medicalScreening?.[key as keyof typeof patient.medicalScreening] === true) {
        flags.push(label);
      }
    });
    return flags;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge variant="success">Confirmed</Badge>;
      case "PENDING":
        return <Badge variant="warning">Pending</Badge>;
      case "COMPLETED":
        return <Badge variant="info">Completed</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Create appointment
  const handleCreateAppointment = async () => {
    if (!appointmentForm.date || !appointmentForm.time || !appointmentForm.treatmentType || !appointmentForm.therapistId) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const dateTime = new Date(`${appointmentForm.date}T${appointmentForm.time}`);
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          therapistId: appointmentForm.therapistId,
          dateTime: dateTime.toISOString(),
          treatmentType: appointmentForm.treatmentType,
          notes: appointmentForm.notes,
        }),
      });

      if (response.ok) {
        toast({ title: "Success", description: "Appointment scheduled successfully" });
        setShowAppointmentModal(false);
        setAppointmentForm({ date: "", time: "", treatmentType: "", therapistId: "", notes: "" });
        fetchPatient();
      } else {
        const data = await response.json();
        toast({ title: "Error", description: data.error || "Failed to create appointment", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create appointment", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete appointment
  const handleDeleteAppointment = async () => {
    if (!selectedAppt) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/appointments/${selectedAppt.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({ title: "Success", description: "Appointment deleted successfully" });
        setShowDeleteApptDialog(false);
        setSelectedAppt(null);
        fetchPatient();
      } else {
        toast({ title: "Error", description: "Failed to delete appointment", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete appointment", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create/Edit SOAP note
  const handleSaveNote = async () => {
    if (!noteForm.subjective || !noteForm.objective || !noteForm.assessment || !noteForm.plan) {
      toast({ title: "Error", description: "Please fill all SOAP fields", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const url = selectedNote ? `/api/soap-notes/${selectedNote.id}` : "/api/soap-notes";
      const method = selectedNote ? "PUT" : "POST";
      
      const body: any = {
        subjective: noteForm.subjective,
        objective: noteForm.objective,
        assessment: noteForm.assessment,
        plan: noteForm.plan,
      };

      if (!selectedNote) {
        body.patientId = patientId;
        if (noteForm.appointmentId) {
          body.appointmentId = noteForm.appointmentId;
        }
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast({ title: "Success", description: selectedNote ? "Note updated successfully" : "Note created successfully" });
        setShowNoteModal(false);
        setSelectedNote(null);
        setNoteForm({ subjective: "", objective: "", assessment: "", plan: "", appointmentId: "" });
        fetchPatient();
      } else {
        const data = await response.json();
        toast({ title: "Error", description: data.error || "Failed to save note", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save note", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete SOAP note
  const handleDeleteNote = async () => {
    if (!selectedNote) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/soap-notes/${selectedNote.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({ title: "Success", description: "Note deleted successfully" });
        setShowDeleteNoteDialog(false);
        setSelectedNote(null);
        fetchPatient();
      } else {
        toast({ title: "Error", description: "Failed to delete note", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete note", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit patient
  const openEditPatientModal = () => {
    if (patient) {
      setPatientEditForm({
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone || "",
      });
      setShowEditPatientModal(true);
    }
  };

  const handleEditPatient = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/patients/${patientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patientEditForm),
      });

      if (response.ok) {
        toast({ title: "Success", description: "Patient updated successfully" });
        setShowEditPatientModal(false);
        fetchPatient();
      } else {
        const data = await response.json();
        toast({ title: "Error", description: data.error || "Failed to update patient", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update patient", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete patient
  const handleDeletePatient = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/patients/${patientId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({ title: "Success", description: "Patient deleted successfully" });
        // Redirect to patients list
        window.location.href = "/dashboard/patients";
      } else {
        const data = await response.json();
        toast({ title: "Error", description: data.error || "Failed to delete patient", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete patient", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = async (noteId: string) => {
    try {
      const response = await fetch(`/api/soap-notes/${noteId}/pdf`);
      const html = await response.text();
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
    }
  };

  const openEditNoteModal = (note: any) => {
    setSelectedNote(note);
    setNoteForm({
      subjective: note.subjective || "",
      objective: note.objective || "",
      assessment: note.assessment || "",
      plan: note.plan || "",
      appointmentId: "",
    });
    setShowNoteModal(true);
  };

  const openNewNoteModal = () => {
    setSelectedNote(null);
    setNoteForm({ subjective: "", objective: "", assessment: "", plan: "", appointmentId: "" });
    setShowNoteModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!patient) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700">Patient not found</h3>
          <Link href="/dashboard/patients">
            <Button className="mt-4">Back to Patients</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const redFlags = getRedFlags();
  const appointmentsWithoutNotes = patient.patientAppointments.filter(a => !a.soapNote && a.status === "COMPLETED");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/patients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-800">
                {patient?.firstName ?? ""} {patient?.lastName ?? ""}
              </h1>
              {patient?.medicalScreening?.consentGiven ? (
                <Badge variant="success" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Screening Complete
                </Badge>
              ) : (
                <Badge variant="warning" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  No Screening
                </Badge>
              )}
            </div>
            <p className="text-slate-600 mt-1">
              Patient since{" "}
              {new Date(patient?.createdAt ?? "").toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isStaff && (
            <>
              <Button onClick={() => setShowAppointmentModal(true)} className="gap-2">
                <Calendar className="h-4 w-4" />
                Schedule Appointment
              </Button>
              <Button onClick={openNewNoteModal} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                New Clinical Note
              </Button>
              <Button onClick={openEditPatientModal} variant="outline" className="gap-2">
                <Pencil className="h-4 w-4" />
                Edit Patient
              </Button>
              {isAdmin && (
                <Button onClick={() => setShowDeletePatientDialog(true)} variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete Patient
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Red Flags Alert */}
      {redFlags.length > 0 && (
        <div>
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-800">Red Flags Identified</p>
                  <p className="text-sm text-amber-700 mt-1">
                    This patient has indicated the following conditions requiring attention:
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {redFlags.map((flag) => (
                      <Badge key={flag} variant="warning" className="bg-amber-100">
                        {flag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Full Medical Screening Details - EXPANDED VIEW */}
      {patient?.medicalScreening && (
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Complete Medical Screening Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Red Flag Questions Section */}
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Red Flag Screening Questions
                </h3>
                <div className="grid gap-3">
                  {[
                    { key: "unexplainedWeightLoss", label: "Unexplained Weight Loss" },
                    { key: "nightPain", label: "Severe Night Pain" },
                    { key: "traumaHistory", label: "Recent Trauma/Injury" },
                    { key: "neurologicalSymptoms", label: "Neurological Symptoms (numbness, tingling, weakness)" },
                    { key: "bladderBowelDysfunction", label: "Bladder/Bowel Dysfunction" },
                    { key: "recentInfection", label: "Recent Infection/Fever" },
                    { key: "cancerHistory", label: "Cancer History" },
                    { key: "steroidUse", label: "Steroid Medication Use" },
                    { key: "osteoporosisRisk", label: "Osteoporosis Risk" },
                    { key: "cardiovascularSymptoms", label: "Cardiovascular Symptoms" },
                    { key: "severeHeadache", label: "Severe Headache" },
                    { key: "dizzinessBalanceIssues", label: "Dizziness/Balance Issues" },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-md border"
                    >
                      <span className="text-sm font-medium">{item.label}</span>
                      {patient.medicalScreening?.[item.key as keyof typeof patient.medicalScreening] ? (
                        <Badge variant="destructive" className="gap-1">
                          <X className="h-3 w-3" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          No
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Medical History Details */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-bruno-turquoise" />
                  Medical History Information
                </h3>
                <div className="grid gap-4">
                  <div className="p-4 bg-slate-50 rounded-md">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Current Medications</p>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">
                      {patient.medicalScreening.currentMedications || "None reported"}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-slate-50 rounded-md">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Allergies</p>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">
                      {patient.medicalScreening.allergies || "None reported"}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-slate-50 rounded-md">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Surgical History</p>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">
                      {patient.medicalScreening.surgicalHistory || "None reported"}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-slate-50 rounded-md">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Other Medical Conditions</p>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">
                      {patient.medicalScreening.otherConditions || "None reported"}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-slate-50 rounded-md">
                    <p className="text-sm font-semibold text-slate-700 mb-2">GP Details</p>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">
                      {patient.medicalScreening.gpDetails || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Consent Status */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2">
                  {patient.medicalScreening.consentGiven ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700">
                        Patient consent obtained for treatment
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <span className="text-sm font-medium text-red-700">
                        Patient consent not obtained
                      </span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contact Info */}
      <div>
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="font-medium text-slate-800">{patient?.email ?? "N/A"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Phone</p>
                  <p className="font-medium text-slate-800">{patient?.phone || "Not provided"}</p>
                </div>
              </div>
              {patient?.medicalScreening?.emergencyContact && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Emergency Contact</p>
                    <p className="font-medium text-slate-800">
                      {patient.medicalScreening.emergencyContact}
                      {patient.medicalScreening?.emergencyContactPhone && (
                        <span className="text-slate-500 ml-2">({patient.medicalScreening.emergencyContactPhone})</span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="appointments" className="space-y-6">
        <TabsList>
          <TabsTrigger value="appointments" className="gap-2">
            <Calendar className="h-4 w-4" />
            Appointments ({patient.patientAppointments.length})
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Clinical Notes ({patient.soapNotesFor.length})
          </TabsTrigger>
          <TabsTrigger value="medical" className="gap-2">
            <FileText className="h-4 w-4" />
            Medical History
          </TabsTrigger>
          {(isAdmin || isStaff) && patient?.medicalScreening && (
            <TabsTrigger value="analysis" className="gap-2">
              <Activity className="h-4 w-4" />
              Clinical Analysis
            </TabsTrigger>
          )}
        </TabsList>

        {/* Appointments Tab */}
        <TabsContent value="appointments">
          {(patient?.patientAppointments?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-700">No appointments</h3>
                <p className="text-slate-500 mt-1">Schedule the first appointment for this patient.</p>
                <Button onClick={() => setShowAppointmentModal(true)} className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Schedule Appointment
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {patient.patientAppointments.map((appt, index) => (
                <div>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-slate-800">{appt?.treatmentType ?? ""}</h3>
                            {getStatusBadge(appt?.status ?? "")}
                          </div>
                          <p className="text-sm text-slate-500 mt-1">
                            <Clock className="inline h-3 w-3 mr-1" />
                            {new Date(appt?.dateTime ?? "").toLocaleDateString("en-GB", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            at{" "}
                            {new Date(appt?.dateTime ?? "").toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          <p className="text-sm text-slate-500">
                            With {appt.therapist.firstName} {appt.therapist.lastName}
                          </p>
                          {appt.notes && <p className="text-sm text-slate-600 mt-2 italic">"{appt.notes}"</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          {appt.soapNote ? (
                            <Link href={`/dashboard/clinical-notes/${appt.soapNote.id}`}>
                              <Badge variant="info" className="cursor-pointer">View Note</Badge>
                            </Link>
                          ) : appt.status === "COMPLETED" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setNoteForm({ ...noteForm, appointmentId: appt.id });
                                openNewNoteModal();
                              }}
                              className="gap-1"
                            >
                              <Plus className="h-3 w-3" />
                              Add Note
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setSelectedAppt(appt);
                              setShowDeleteApptDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Clinical Notes Tab */}
        <TabsContent value="notes">
          {(patient?.soapNotesFor?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-700">No clinical notes yet</h3>
                <p className="text-slate-500 mt-1">Create clinical documentation for this patient.</p>
                <Button onClick={openNewNoteModal} className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Create Clinical Note
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {patient.soapNotesFor.map((note, index) => (
                <div>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h3 className="font-semibold text-slate-800">
                              {note.appointment?.treatmentType || "Clinical Note"}
                            </h3>
                            <Badge variant="outline">
                              {new Date(note.createdAt).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="font-medium text-slate-700">Subjective:</p>
                              <p className="text-slate-600 line-clamp-2">{note.subjective}</p>
                            </div>
                            <div>
                              <p className="font-medium text-slate-700">Assessment:</p>
                              <p className="text-slate-600 line-clamp-2">{note.assessment}</p>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 mt-2">
                            By {note.therapist.firstName} {note.therapist.lastName}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleDownloadPDF(note.id)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEditNoteModal(note)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setSelectedNote(note);
                              setShowDeleteNoteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Medical History Tab */}
        <TabsContent value="medical">
          {!patient?.medicalScreening ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-700">No medical screening</h3>
                <p className="text-slate-500 mt-1">Patient has not completed the medical screening form.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Medications & Allergies</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Current Medications</p>
                    <p className="text-sm text-slate-600">{patient.medicalScreening.currentMedications || "None reported"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Allergies</p>
                    <p className="text-sm text-slate-600">{patient.medicalScreening.allergies || "None reported"}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Surgical History</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">{patient.medicalScreening.surgicalHistory || "None reported"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Other Conditions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">{patient.medicalScreening.otherConditions || "None reported"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">GP Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">{patient.medicalScreening.gpDetails || "Not provided"}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Clinical Analysis Tab */}
        {(isAdmin || isStaff) && (
          <TabsContent value="analysis">
            {!patient?.medicalScreening ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-700">No medical screening</h3>
                  <p className="text-slate-500 mt-1">Patient has not completed the medical screening form yet.</p>
                </CardContent>
              </Card>
            ) : (
              <ClinicalReportViewer 
                patientId={patientId} 
                patientName={`${patient.firstName} ${patient.lastName}`} 
              />
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Schedule Appointment Modal */}
      <Dialog open={showAppointmentModal} onOpenChange={setShowAppointmentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={appointmentForm.date}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, date: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="space-y-2">
                <Label>Time *</Label>
                <Input
                  type="time"
                  value={appointmentForm.time}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, time: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Treatment Type *</Label>
              <Select
                value={appointmentForm.treatmentType}
                onValueChange={(value) => setAppointmentForm({ ...appointmentForm, treatmentType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select treatment" />
                </SelectTrigger>
                <SelectContent>
                  {TREATMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Therapist *</Label>
              <Select
                value={appointmentForm.therapistId}
                onValueChange={(value) => setAppointmentForm({ ...appointmentForm, therapistId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select therapist" />
                </SelectTrigger>
                <SelectContent>
                  {therapists.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.firstName} {t.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={appointmentForm.notes}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
                placeholder="Any notes for this appointment..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAppointmentModal(false)}>Cancel</Button>
            <Button onClick={handleCreateAppointment} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clinical Note Modal */}
      <Dialog open={showNoteModal} onOpenChange={setShowNoteModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedNote ? "Edit Clinical Note" : "New Clinical Note"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!selectedNote && appointmentsWithoutNotes.length > 0 && (
              <div className="space-y-2">
                <Label>Link to Appointment (optional)</Label>
                <Select
                  value={noteForm.appointmentId}
                  onValueChange={(value) => setNoteForm({ ...noteForm, appointmentId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select appointment or leave blank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No appointment</SelectItem>
                    {appointmentsWithoutNotes.map((appt) => (
                      <SelectItem key={appt.id} value={appt.id}>
                        {appt.treatmentType} -{" "}
                        {new Date(appt.dateTime).toLocaleDateString("en-GB")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Subjective *</Label>
              <Textarea
                value={noteForm.subjective}
                onChange={(e) => setNoteForm({ ...noteForm, subjective: e.target.value })}
                placeholder="Patient's complaints, symptoms, and history..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Objective *</Label>
              <Textarea
                value={noteForm.objective}
                onChange={(e) => setNoteForm({ ...noteForm, objective: e.target.value })}
                placeholder="Physical examination findings, vital signs, observations..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Assessment *</Label>
              <Textarea
                value={noteForm.assessment}
                onChange={(e) => setNoteForm({ ...noteForm, assessment: e.target.value })}
                placeholder="Clinical diagnosis, interpretation of findings..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Plan *</Label>
              <Textarea
                value={noteForm.plan}
                onChange={(e) => setNoteForm({ ...noteForm, plan: e.target.value })}
                placeholder="Treatment plan, follow-up instructions, recommendations..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteModal(false)}>Cancel</Button>
            <Button onClick={handleSaveNote} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {selectedNote ? "Update" : "Create"} Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Note Confirmation */}
      <AlertDialog open={showDeleteNoteDialog} onOpenChange={setShowDeleteNoteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Clinical Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this clinical note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNote}
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Appointment Confirmation */}
      <AlertDialog open={showDeleteApptDialog} onOpenChange={setShowDeleteApptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this appointment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAppointment}
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Patient Dialog */}
      <Dialog open={showEditPatientModal} onOpenChange={setShowEditPatientModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Patient Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={patientEditForm.firstName}
                onChange={(e) => setPatientEditForm({ ...patientEditForm, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={patientEditForm.lastName}
                onChange={(e) => setPatientEditForm({ ...patientEditForm, lastName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={patientEditForm.email}
                onChange={(e) => setPatientEditForm({ ...patientEditForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={patientEditForm.phone}
                onChange={(e) => setPatientEditForm({ ...patientEditForm, phone: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditPatientModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleEditPatient} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Patient Dialog */}
      <AlertDialog open={showDeletePatientDialog} onOpenChange={setShowDeletePatientDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Patient?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this patient? This will permanently delete all their appointments, clinical notes, and medical screening data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePatient}
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete Patient
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
