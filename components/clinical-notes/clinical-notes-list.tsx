"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ClipboardList,
  Calendar,
  User,
  Plus,
  Loader2,
  Search,
  Download,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { useLocale } from "@/hooks/use-locale";

interface SOAPNote {
  id: string;
  createdAt: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  appointment: {
    dateTime: string;
    treatmentType: string;
  } | null;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  therapist: {
    firstName: string;
    lastName: string;
  };
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function ClinicalNotesList() {
  const { data: session } = useSession() || {};
  const { toast } = useToast();
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const [soapNotes, setSOAPNotes] = useState<SOAPNote[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  // Modal states
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedNote, setSelectedNote] = useState<SOAPNote | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Note form
  const [noteForm, setNoteForm] = useState({
    patientId: "",
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  });

  const userRole = (session?.user as any)?.role;
  const isStaff = userRole === "ADMIN" || userRole === "THERAPIST";

  useEffect(() => {
    setMounted(true);
    fetchSOAPNotes();
    if (isStaff) {
      fetchPatients();
    }
  }, [isStaff]);

  const fetchSOAPNotes = async () => {
    try {
      const response = await fetch("/api/soap-notes");
      const data = await response.json();
      setSOAPNotes(data?.soapNotes ?? []);
    } catch (error) {
      console.error("Error fetching SOAP notes:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await fetch("/api/patients");
      const data = await response.json();
      setPatients(data?.patients ?? []);
    } catch (error) {
      console.error("Error fetching patients:", error);
    }
  };

  const filteredNotes = (soapNotes ?? []).filter((note) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    const patientName = `${note?.patient?.firstName ?? ""} ${note?.patient?.lastName ?? ""}`.toLowerCase();
    const treatment = (note?.appointment?.treatmentType ?? "").toLowerCase();
    return patientName.includes(search) || treatment.includes(search);
  });

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

  const handleSaveNote = async () => {
    if (!noteForm.subjective || !noteForm.objective || !noteForm.assessment || !noteForm.plan) {
      toast({ title: isPt ? "Erro" : "Error", description: isPt ? "Preencha todos os campos SOAP" : "Please fill all SOAP fields", variant: "destructive" });
      return;
    }

    if (!selectedNote && !noteForm.patientId) {
      toast({ title: isPt ? "Erro" : "Error", description: isPt ? "Selecione um paciente" : "Please select a patient", variant: "destructive" });
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
        body.patientId = noteForm.patientId;
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast({ title: isPt ? "Sucesso" : "Success", description: selectedNote ? (isPt ? "Nota atualizada" : "Note updated successfully") : (isPt ? "Nota criada" : "Note created successfully") });
        setShowNoteModal(false);
        setSelectedNote(null);
        setNoteForm({ patientId: "", subjective: "", objective: "", assessment: "", plan: "" });
        fetchSOAPNotes();
      } else {
        const data = await response.json();
        toast({ title: isPt ? "Erro" : "Error", description: data.error || (isPt ? "Falha ao salvar nota" : "Failed to save note"), variant: "destructive" });
      }
    } catch (error) {
      toast({ title: isPt ? "Erro" : "Error", description: isPt ? "Falha ao salvar nota" : "Failed to save note", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!selectedNote) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/soap-notes/${selectedNote.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({ title: isPt ? "Sucesso" : "Success", description: isPt ? "Nota excluída" : "Note deleted successfully" });
        setShowDeleteDialog(false);
        setSelectedNote(null);
        fetchSOAPNotes();
      } else {
        toast({ title: isPt ? "Erro" : "Error", description: isPt ? "Falha ao excluir nota" : "Failed to delete note", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: isPt ? "Erro" : "Error", description: isPt ? "Falha ao excluir nota" : "Failed to delete note", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (note: SOAPNote) => {
    setSelectedNote(note);
    setNoteForm({
      patientId: note.patient.id,
      subjective: note.subjective || "",
      objective: note.objective || "",
      assessment: note.assessment || "",
      plan: note.plan || "",
    });
    setShowNoteModal(true);
  };

  const openNewModal = () => {
    setSelectedNote(null);
    setNoteForm({ patientId: "", subjective: "", objective: "", assessment: "", plan: "" });
    setPatientSearchQuery(""); // Reset patient search when opening new note modal
    setShowNoteModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{isPt ? "Notas Clínicas" : "Clinical Notes"}</h1>
          <p className="text-slate-600 mt-1">
            {isPt ? "Gerencie a documentação SOAP das consultas." : "Manage SOAP documentation for patient appointments."}
          </p>
        </div>
        {isStaff && (
          <Button onClick={openNewModal} className="gap-2">
            <Plus className="h-4 w-4" />
            {isPt ? "Nova Nota Clínica" : "New Clinical Note"}
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder={isStaff ? (isPt ? "Buscar por paciente ou tratamento..." : "Search by patient name or treatment...") : (isPt ? "Buscar por data ou tratamento..." : "Search by date or treatment...")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Notes List */}
      {loading ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : filteredNotes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <ClipboardList className="h-8 w-8 text-primary/40" />
            </div>
            <h3 className="text-lg font-medium text-slate-700">{isPt ? "Nenhuma nota clínica ainda" : "No clinical notes yet"}</h3>
            <p className="text-slate-500 mt-1 max-w-sm mx-auto">
              {isStaff
                ? (isPt ? "As notas clínicas aparecerão aqui após documentar as consultas." : "Clinical notes will appear here after you document patient appointments.")
                : (isPt ? "As suas notas clínicas aparecerão aqui após as suas sessões de tratamento." : "Your clinical notes will appear here after your treatment sessions.")}
            </p>
            {isStaff && (
              <Button onClick={openNewModal} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                {isPt ? "Criar Primeira Nota" : "Create First Note"}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredNotes.map((note, index) => (
            <div>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-500" />
                          <Link href={`/dashboard/patients/${note.patient.id ?? ""}`} className="font-semibold text-slate-800 hover:text-primary transition-colors">
                            {note?.patient?.firstName ?? ""} {note?.patient?.lastName ?? ""}
                          </Link>
                        </div>
                        {note.appointment && (
                          <Badge variant="outline">{note.appointment.treatmentType}</Badge>
                        )}
                        <Badge variant="secondary">
                          {new Date(note.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mt-3">
                        <div>
                          <p className="font-medium text-slate-700">{isPt ? "Subjetivo" : "Subjective"}:</p>
                          <p className="text-slate-600 line-clamp-2">{note.subjective}</p>
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">{isPt ? "Avaliação" : "Assessment"}:</p>
                          <p className="text-slate-600 line-clamp-2">{note.assessment}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-3">
                        {isPt ? "Por" : "By"} {note?.therapist?.firstName ?? ""} {note?.therapist?.lastName ?? ""}
                        {note.appointment && (
                          <> &middot; {isPt ? "Sessão em" : "Session on"}{" "}
                            {new Date(note.appointment.dateTime).toLocaleDateString(isPt ? "pt-BR" : "en-GB", {
                              day: "numeric",
                              month: "short",
                            })}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleDownloadPDF(note.id)} title="Download PDF">
                        <Download className="h-4 w-4" />
                      </Button>
                      {isStaff && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => openEditModal(note)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setSelectedNote(note);
                              setShowDeleteDialog(true);
                            }}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Note Modal */}
      <Dialog open={showNoteModal} onOpenChange={setShowNoteModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedNote ? (isPt ? "Editar Nota Clínica" : "Edit Clinical Note") : (isPt ? "Nova Nota Clínica" : "New Clinical Note")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!selectedNote && (
              <div className="space-y-2">
                <Label>{isPt ? "Paciente" : "Patient"} *</Label>
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder={isPt ? "Buscar paciente por nome ou email..." : "Search patient by name or email..."}
                      value={patientSearchQuery}
                      onChange={(e) => setPatientSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select
                    value={noteForm.patientId}
                    onValueChange={(value) => setNoteForm({ ...noteForm, patientId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isPt ? "Selecione um paciente" : "Select a patient"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      {patients
                        .filter((p) => {
                          if (!patientSearchQuery) return true;
                          const search = patientSearchQuery.toLowerCase();
                          const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
                          const email = p.email.toLowerCase();
                          return fullName.includes(search) || email.includes(search);
                        })
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.firstName} {p.lastName} ({p.email})
                          </SelectItem>
                        ))}
                      {patients.filter((p) => {
                        if (!patientSearchQuery) return true;
                        const search = patientSearchQuery.toLowerCase();
                        const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
                        const email = p.email.toLowerCase();
                        return fullName.includes(search) || email.includes(search);
                      }).length === 0 && (
                        <div className="p-4 text-center text-sm text-slate-500">
                          {isPt ? "Nenhum paciente encontrado" : "No patients found"}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>{isPt ? "Subjetivo" : "Subjective"} *</Label>
              <Textarea
                value={noteForm.subjective}
                onChange={(e) => setNoteForm({ ...noteForm, subjective: e.target.value })}
                placeholder={isPt ? "Queixas, sintomas e histórico do paciente..." : "Patient's complaints, symptoms, and history..."}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>{isPt ? "Objetivo" : "Objective"} *</Label>
              <Textarea
                value={noteForm.objective}
                onChange={(e) => setNoteForm({ ...noteForm, objective: e.target.value })}
                placeholder={isPt ? "Achados do exame físico, sinais vitais, observações..." : "Physical examination findings, vital signs, observations..."}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>{isPt ? "Avaliação" : "Assessment"} *</Label>
              <Textarea
                value={noteForm.assessment}
                onChange={(e) => setNoteForm({ ...noteForm, assessment: e.target.value })}
                placeholder={isPt ? "Diagnóstico clínico, interpretação dos achados..." : "Clinical diagnosis, interpretation of findings..."}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>{isPt ? "Plano" : "Plan"} *</Label>
              <Textarea
                value={noteForm.plan}
                onChange={(e) => setNoteForm({ ...noteForm, plan: e.target.value })}
                placeholder={isPt ? "Plano de tratamento, instruções de acompanhamento, recomendações..." : "Treatment plan, follow-up instructions, recommendations..."}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteModal(false)}>{isPt ? "Cancelar" : "Cancel"}</Button>
            <Button onClick={handleSaveNote} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {selectedNote ? (isPt ? "Atualizar Nota" : "Update Note") : (isPt ? "Criar Nota" : "Create Note")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isPt ? "Excluir Nota Clínica" : "Delete Clinical Note"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isPt ? "Tem certeza que deseja excluir esta nota clínica? Esta ação não pode ser desfeita." : "Are you sure you want to delete this clinical note? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isPt ? "Cancelar" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNote}
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isPt ? "Excluir" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
