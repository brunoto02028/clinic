"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
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
  CreditCard,
  Banknote,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  BanIcon,
  X,
  Receipt,
  Mail,
  MapPin,
  Video,
  BellRing,
  Users,
  Home,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { useVocab } from "@/hooks/use-vocab";
import { t as i18nT } from "@/lib/i18n";
import { zonedTimeToUtc, getZonedDateTimeLocalString, CLINIC_TIMEZONE } from "@/lib/clinic-timezone";
import { TREATMENT_OPTIONS } from "@/lib/types";

interface DbTreatmentType {
  id: string; name: string; namePt: string | null;
  duration: number; price: number; discountPercent: number; isActive: boolean;
}

interface Appointment {
  id: string;
  dateTime: string;
  duration: number;
  treatmentType: string;
  status: string;
  price: number;
  paymentMethod?: string;
  notes: string | null;
  /**
   * Presencial ou por vídeo. O dado sempre veio — o GET da agenda usa `include`
   * sem `select`, então todo campo escalar da consulta chega aqui — mas esta
   * interface não o declarava, e a agenda principal era o único lugar que criava
   * uma consulta por vídeo sem depois mostrar que ela era por vídeo.
   */
  mode?: "IN_PERSON" | "VIDEO" | "HOME_VISIT" | null;
  /**
   * O formato que o **paciente pediu**, e o que se fez com o pedido (098).
   *
   * O horário é dele na hora em que marca; o formato é um pedido. A consulta
   * nasce na clínica e o pedido fica aqui até alguém decidir.
   */
  requestedMode?: "VIDEO" | "HOME_VISIT" | null;
  modeApprovedAt?: string | null;
  modeRefusedReason?: string | null;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    dateOfBirth?: string | null;
    guardian?: { firstName: string; lastName: string } | null;
    managedRelationship?: string | null;
    managedRelationshipOther?: string | null;
  };
  therapist: { id: string; firstName: string; lastName: string };
}

interface Patient { id: string; firstName: string; lastName: string; email: string; }

export default function AdminAppointmentsPage() {
  const { locale } = useLocale();
  const { relabel, isPersonal, ready: vocabReady } = useVocab();
  const T = (key: string) => relabel(i18nT(key, locale));
  const isPt = locale === "pt-BR";
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [dbTreatments, setDbTreatments] = useState<DbTreatmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  /**
   * Ver só as consultas por vídeo (095 T-2).
   *
   * Numa agenda de presenciais, uma consulta por vídeo se perde — e foi
   * perdendo-se que ela pareceu não existir. O filtro também responde a
   * pergunta oposta, que é a mais comum: "tenho alguma hoje?".
   */
  const [soVideo, setSoVideo] = useState(false);
  /** Só as que esperam uma decisão de formato (098 T-3). */
  const [soPedidos, setSoPedidos] = useState(false);
  const [decidindo, setDecidindo] = useState<string | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState<Record<string, string>>({});
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [createForm, setCreateForm] = useState({
    patientId: "",
    dateTime: "",
    appointmentDate: "",
    appointmentTime: "",
    duration: 60,
    treatmentType: "",
    price: 0,
    notes: "",
    paymentMode: "in_person" as "online" | "in_person",
    /**
     * Presencial ou à distância (089).
     *
     * A rota `POST /api/admin/appointments` já aceitava `mode` — e o formulário
     * nunca ofereceu. Só dava para marcar consulta por vídeo numa página
     * separada, `/admin/video-consultations`, então na prática o cenário "marquei
     * uma consulta à distância" não acontecia no fluxo de quem marca consulta.
     */
    mode: "IN_PERSON" as "IN_PERSON" | "VIDEO",
    // Off by default: nothing reaches the patient without a previewed e-mail (activity 68)
    sendConfirmation: false,
    // O caso fora da curva, que numa clínica pequena é semanal. Os dois ficam
    // em auditoria com autor e motivo (atividade 080, T-4).
    courtesySession: false,
    waiveCharge: false,
    overrideReason: "",
  });
  const [aiNotesLoading, setAiNotesLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    // Presencial ou por vídeo, **também na edição** (095 T-2): antes só dava
    // para escolher ao criar, e transformar uma consulta exigia apagá-la.
    mode: "IN_PERSON" as "IN_PERSON" | "VIDEO",
    dateTime: "",
    duration: 0,
    treatmentType: "",
    price: 0,
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const isCalendarView = searchParams.get("view") === "calendar";

  // Calendar blocks
  const [blocks, setBlocks] = useState<Array<{ id: string; startDate: string; endDate: string; reason: string | null; blockType: string }>>([]);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockForm, setBlockForm] = useState({ startDate: "", endDate: "", reason: "", blockType: "ABSENCE" });
  const [blockSubmitting, setBlockSubmitting] = useState(false);

  // Calendar: current week start (Monday)
  const [calendarWeekStart, setCalendarWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay(); // 0=Sun
    const diff = day === 0 ? -6 : 1 - day; // shift to Monday
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
    fetchTreatmentTypes();
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    try {
      const res = await fetch("/api/admin/calendar/blocks");
      if (res.ok) setBlocks(await res.json());
    } catch {}
  };

  const createBlock = async () => {
    if (!blockForm.startDate || !blockForm.endDate) return;
    setBlockSubmitting(true);
    try {
      const res = await fetch("/api/admin/calendar/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blockForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await fetchBlocks();
      setShowBlockDialog(false);
      setBlockForm({ startDate: "", endDate: "", reason: "", blockType: "ABSENCE" });
      toast({ title: "Period blocked", description: "Days marked as unavailable." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Could not create block.", variant: "destructive" });
    } finally { setBlockSubmitting(false); }
  };

  const deleteBlock = async (id: string) => {
    await fetch("/api/admin/calendar/blocks", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setBlocks(prev => prev.filter(b => b.id !== id));
    toast({ title: "Block removed" });
  };

  const isDayBlocked = (day: Date) => {
    const d = day.getTime();
    return blocks.some(b => {
      const s = new Date(b.startDate); s.setHours(0,0,0,0);
      const e = new Date(b.endDate);   e.setHours(23,59,59,999);
      return d >= s.getTime() && d <= e.getTime();
    });
  };

  const getBlockForDay = (day: Date) => {
    const d = day.getTime();
    return blocks.find(b => {
      const s = new Date(b.startDate); s.setHours(0,0,0,0);
      const e = new Date(b.endDate);   e.setHours(23,59,59,999);
      return d >= s.getTime() && d <= e.getTime();
    });
  };

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

  const fetchTreatmentTypes = async () => {
    try {
      const res = await fetch("/api/admin/treatment-types");
      if (res.ok) {
        const data = await res.json();
        const active = (data as DbTreatmentType[]).filter(t => t.isActive);
        setDbTreatments(active);
      }
    } catch {}
  };

  const [aiInstructions, setAiInstructions] = useState("");

  const handleAiNotes = async () => {
    if (!createForm.patientId || !createForm.treatmentType) {
      toast({ title: "Info", description: isPt ? "Selecione paciente e tratamento primeiro" : "Select patient and treatment first", variant: "destructive" });
      return;
    }
    setAiNotesLoading(true);
    try {
      const patient = patients.find(p => p.id === createForm.patientId);
      const res = await fetch("/api/admin/appointments/generate-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim(),
          patientId: createForm.patientId,
          treatmentType: createForm.treatmentType,
          duration: createForm.duration,
          instructions: aiInstructions || "",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreateForm(f => ({ ...f, notes: data.notes || "" }));
      } else {
        const patient = patients.find(p => p.id === createForm.patientId);
        setCreateForm(f => ({ ...f, notes: `${createForm.treatmentType} session for ${patient?.firstName || 'patient'}. Duration: ${createForm.duration} min. Please arrive 10 minutes early and complete your medical screening form.` }));
      }
    } catch {
      const patient = patients.find(p => p.id === createForm.patientId);
      setCreateForm(f => ({ ...f, notes: `${createForm.treatmentType} session for ${patient?.firstName || 'patient'}. Duration: ${createForm.duration} min. Please arrive 10 minutes early and complete your medical screening form.` }));
    } finally {
      setAiNotesLoading(false);
    }
  };

  const handleCreateAppointment = async () => {
    if (!createForm.patientId || !createForm.appointmentDate || !createForm.appointmentTime) {
      toast({ title: "Error", description: isPt ? "Paciente, data e hora são obrigatórios" : "Patient, date and time are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: createForm.patientId,
          dateTime: zonedTimeToUtc(createForm.appointmentDate, createForm.appointmentTime).toISOString(),
          duration: Number(createForm.duration),
          treatmentType: createForm.treatmentType,
          price: Number(createForm.price),
          notes: createForm.notes || null,
          // Sem isto o seletor de formato desenhava e nao chegava ao servidor.
          mode: createForm.mode,
          paymentMode: createForm.paymentMode,
          courtesySession: createForm.courtesySession || undefined,
          waiveCharge: createForm.waiveCharge || undefined,
          overrideReason: createForm.overrideReason || undefined,
          sendConfirmation: createForm.paymentMode === "online" ? true : createForm.sendConfirmation,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const checkoutMsg = data.checkoutUrl ? (isPt ? ` Link de pagamento gerado.` : ` Payment link generated.`) : '';
        const emailed = createForm.paymentMode === "online" || createForm.sendConfirmation;
        toast({
          title: relabel(isPt ? "Consulta criada" : "Appointment created"),
          description: relabel(emailed
            ? (isPt ? "O paciente receberá um email de confirmação." : "The patient will receive a confirmation email.")
            : (isPt ? "Nenhum email foi enviado. Use \"Confirmar por email\" na consulta para ver a prévia e enviar." : "No email was sent. Use \"Email confirmation\" on the appointment to preview and send it.")) + checkoutMsg,
        });
        setShowCreateDialog(false);
        // Os tres ultimos faltavam, e o `setState` os apagava do estado: depois de
        // criar uma consulta, `createForm.courtesySession` virava `undefined` e os
        // campos de cortesia/isencao ficavam sem valor na proxima.
        setCreateForm({
          patientId: "", dateTime: "", appointmentDate: "", appointmentTime: "",
          duration: 60, treatmentType: "", price: 0, notes: "",
          paymentMode: "in_person", sendConfirmation: false, mode: "IN_PERSON",
          courtesySession: false, waiveCharge: false, overrideReason: "",
        });
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

  const [invoiceSendingId, setInvoiceSendingId] = useState<string | null>(null);
  const [invoiceDialogAppointment, setInvoiceDialogAppointment] = useState<any>(null);
  const [invoiceExtraItems, setInvoiceExtraItems] = useState<{ description: string; unitPrice: string }[]>([]);

  const openInvoiceDialog = (appointment: any) => {
    setInvoiceDialogAppointment(appointment);
    setInvoiceExtraItems([]);
  };

  const addInvoiceExtraItem = () => {
    setInvoiceExtraItems((prev) => [...prev, { description: "", unitPrice: "" }]);
  };

  const updateInvoiceExtraItem = (index: number, field: "description" | "unitPrice", value: string) => {
    setInvoiceExtraItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  };

  const removeInvoiceExtraItem = (index: number) => {
    setInvoiceExtraItems((prev) => prev.filter((_, i) => i !== index));
  };

  const sendInvoice = async () => {
    const appointment = invoiceDialogAppointment;
    if (!appointment) return;
    setInvoiceSendingId(appointment.id);
    try {
      const extraItems = invoiceExtraItems
        .filter((it) => it.description.trim() && parseFloat(it.unitPrice) > 0)
        .map((it) => ({ description: it.description.trim(), unitPrice: parseFloat(it.unitPrice) }));

      const res = await fetch(`/api/admin/appointments/${appointment.id}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraItems }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: "Invoice queued for approval",
          description: `Invoice ${data.invoiceNumber} for ${appointment.patient.firstName} ${appointment.patient.lastName} is waiting in Marketing → Email → Pending Approval.`,
        });
        setInvoiceDialogAppointment(null);
      } else {
        toast({ title: "Error", description: data.error || "Failed to generate invoice", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate invoice", variant: "destructive" });
    } finally {
      setInvoiceSendingId(null);
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
    const formattedDateTime = getZonedDateTimeLocalString(new Date(appointment.dateTime));

    setEditForm({
      dateTime: formattedDateTime,
      duration: appointment.duration,
      treatmentType: appointment.treatmentType,
      price: appointment.price,
      notes: appointment.notes || "",
      // Consulta antiga não tem `mode` gravado; ela é presencial.
      mode: appointment.mode === "VIDEO" ? "VIDEO" : "IN_PERSON",
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
          dateTime: zonedTimeToUtc(editForm.dateTime.slice(0, 10), editForm.dateTime.slice(11, 16)).toISOString(),
          duration: Number(editForm.duration),
          treatmentType: editForm.treatmentType,
          price: Number(editForm.price),
          notes: editForm.notes,
          mode: editForm.mode,
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
    const matchesModo = !soVideo || a.mode === "VIDEO";
    const matchesPedido = !soPedidos || pedidoPendente(a);
    return matchesSearch && matchesStatus && matchesModo && matchesPedido;
  });

  /** Pediu alguma coisa e ninguém decidiu ainda. */
  const pedidoPendente = (a: Appointment) =>
    !!a.requestedMode && !a.modeApprovedAt && !a.modeRefusedReason;

  const nomeDoFormato = (m?: string | null) =>
    m === "VIDEO"
      ? isPt ? "por vídeo" : "by video"
      : m === "HOME_VISIT"
        ? isPt ? "em casa" : "at home"
        : isPt ? "na clínica" : "at the clinic";

  /**
   * Aprovar ou recusar o formato pedido (098 T-3).
   *
   * **Recusar não cancela**: a consulta continua de pé, presencial, no mesmo
   * horário. E recusar exige motivo — um "não" sem frase manda a pessoa ligar
   * para a clínica para perguntar por quê.
   */
  const decidirFormato = async (a: Appointment, decision: "approve" | "refuse") => {
    const reason = (motivoRecusa[a.id] || "").trim();
    if (decision === "refuse" && !reason) {
      alert(isPt ? "Diga o motivo ao paciente." : "Tell the patient why.");
      return;
    }
    setDecidindo(a.id);
    try {
      const res = await fetch(`/api/appointments/${a.id}/format`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason: reason || undefined }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error || String(res.status));
      setMotivoRecusa((m) => ({ ...m, [a.id]: "" }));
      await fetchAppointments();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDecidindo(null);
    }
  };

  /**
   * Entrar na sala e chamar o paciente, aqui na agenda.
   *
   * Existia só em `/admin/video-consultations`, uma tela separada — e a agenda é
   * onde o terapeuta olha o dia. Quem marcasse uma consulta por vídeo por aqui
   * não tinha por onde entrar nela sem trocar de tela.
   *
   * A janela (dez minutos antes até trinta depois) é decidida no servidor, não
   * aqui: o botão aparece sempre e a recusa explica a partir de quando. Um
   * relógio de navegador escondendo o botão erraria em fuso e em máquina atrasada.
   */
  const [chamando, setChamando] = useState<string | null>(null);

  /**
   * Quem está olhando a agenda (achado 5 do QA da T-8).
   *
   * A agenda mostra as consultas da clínica inteira, e os dois botões apareciam
   * em todas — inclusive nas de outro terapeuta, e para um admin, que nunca
   * atende. O servidor recusa certo, com 404, mas a frase que chega é "esta
   * consulta não está disponível", e quem está vendo a consulta ali na frente
   * não entende. Botão que só falha não devia existir.
   */
  const { data: sessao } = useSession();
  const meuId = (sessao?.user as any)?.id as string | undefined;

  const entrarNaSala = (id: string) => {
    window.open(`/video-room/${id}`, "_blank", "noopener,noreferrer");
  };

  const chamarPaciente = async (id: string) => {
    setChamando(id);
    try {
      const res = await fetch(`/api/appointments/${id}/video/call`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: isPt ? "Não foi possível chamar" : "Could not call",
          description: (isPt ? data.errorPt : data.error) || data.error || `HTTP ${res.status}`,
          variant: "destructive",
        });
        return;
      }
      // Zero aparelho é notícia, não erro: o paciente não tem o app ou desligou
      // os avisos, e o terapeuta precisa saber antes de esperar dez minutos.
      toast(
        data.aparelhos > 0
          ? {
              title: isPt ? "Paciente chamado" : "Patient called",
              description: isPt
                ? `O telefone dele está tocando em ${data.aparelhos} aparelho${data.aparelhos > 1 ? "s" : ""}.`
                : `Their phone is ringing on ${data.aparelhos} device${data.aparelhos > 1 ? "s" : ""}.`,
            }
              : data.falhas > 0
                ? {
                    // `falhas > 0` com `aparelhos: 0` é envio que não saiu — a
                    // Expo recusou o token, a rede caiu. Dizer "este paciente
                    // não tem aparelho" seria afirmar algo sobre ele quando o
                    // que houve foi problema nosso (achado 4 do QA da T-8).
                    title: isPt ? "O aviso não saiu" : "The call did not go out",
                    description: isPt
                      ? "O paciente tem aparelho, mas o envio falhou. Tente de novo, e avise por outro caminho se insistir."
                      : "The patient has a device, but the send failed. Try again, and reach them another way if it persists.",
                    variant: "destructive" as const,
                  }
          : {
              title: isPt ? "Ninguém para chamar" : "Nobody to ring",
              description: isPt
                ? "Este paciente não tem aparelho registrado, ou desligou os avisos. Avise por outro caminho."
                : "This patient has no device registered, or has notifications off. Reach them another way.",
              variant: "destructive",
            }
      );
    } catch {
      toast({
        title: isPt ? "Não foi possível chamar" : "Could not call",
        description: isPt ? "Tente de novo." : "Try again.",
        variant: "destructive",
      });
    } finally {
      setChamando(null);
    }
  };

  /**
   * Menos de 18 — a conta feita aqui, com o nascimento que a rota mandou.
   *
   * Por comparação de data e não por divisão de milissegundos: a divisão erra
   * o aniversário de quem nasceu em 29 de fevereiro, e "faz 18 hoje" é
   * exatamente o caso em que a resposta precisa estar certa.
   */
  const ehMenor = (nascimento?: string | null): boolean => {
    if (!nascimento) return false;
    const d = new Date(nascimento);
    if (isNaN(d.getTime())) return false;
    const hoje = new Date();
    let anos = hoje.getUTCFullYear() - d.getUTCFullYear();
    const m = hoje.getUTCMonth() - d.getUTCMonth();
    if (m < 0 || (m === 0 && hoje.getUTCDate() < d.getUTCDate())) anos--;
    return anos < 18;
  };

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

  // ── Calendar helpers ──────────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(calendarWeekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [calendarWeekStart]);

  const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 08:00–19:00

  const apptsByDay = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((a) => {
      const key = new Date(a.dateTime).toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return map;
  }, [appointments]);

  const STATUS_CAL: Record<string, string> = {
    CONFIRMED: "bg-blue-500/20 border-blue-500/40 text-blue-300",
    PENDING: "bg-amber-500/20 border-amber-500/40 text-amber-300",
    PENDING_PATIENT: "bg-orange-500/20 border-orange-500/40 text-orange-300 border-dashed",
    COMPLETED: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
    CANCELLED: "bg-red-500/20 border-red-500/40 text-red-300 opacity-60",
  };

  const navWeek = (dir: 1 | -1) => {
    setCalendarWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + dir * 7);
      return d;
    });
  };

  /**
   * Quantos horários livres cada dia da semana tem (095 T-8).
   *
   * A agenda mostrava **só o que já foi marcado** — e a pergunta que se faz ao
   * telefone com um paciente esperando é a outra: *"onde ainda cabe?"*. O dado
   * existe desde a 087 (`/api/availability?from=&to=`, que devolve contagem por
   * dia), e ele é o mesmo que o app do paciente lê: se as duas telas
   * discordarem sobre um dia, é porque estão lendo fontes diferentes, e agora
   * não estão.
   */
  const [vagasPorDia, setVagasPorDia] = useState<Record<string, number | null>>({});

  useEffect(() => {
    const dias = calendarDays;
    if (dias.length === 0) return;
    const texto = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    let vivo = true;
    /**
     * **Sem `therapistId`, de propósito** (QA da 095, falha 8.6).
     *
     * Eu passava o id de quem estava logado, e o app do paciente não passa
     * nenhum. Mesma rota, parâmetros diferentes — e aí as duas telas discordavam
     * sobre o mesmo dia, que é exatamente o que eu tinha escrito que não
     * aconteceria.
     *
     * Pior: um segundo terapeuta da clínica, sem janela própria configurada,
     * via a **semana inteira como fechada** enquanto o paciente via vagas. Quem
     * atende o telefone é quem está logado, e o painel dizia que não cabia
     * ninguém.
     *
     * Sem o id, a rota responde a disponibilidade da clínica — a mesma que o
     * paciente vê. Numa clínica com vários terapeutas este número é o da
     * clínica, não o de cada um; modelar agenda por pessoa é outra atividade, e
     * inventá-la aqui seria um número que só parece pessoal.
     */
    fetch(`/api/availability?from=${texto(dias[0])}&to=${texto(dias[dias.length - 1])}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!vivo || !d?.dias) return;
        const mapa: Record<string, number | null> = {};
        for (const dia of d.dias) mapa[dia.data] = dia.fechado ? null : dia.livres;
        setVagasPorDia(mapa);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [calendarDays]);

  const DAY_NAMES_PT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const DAY_NAMES_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
          <Plus className="h-4 w-4" /> {relabel(isPt ? "Nova Consulta" : "New Appointment")}
        </Button>
      </div>

      {/* ── Calendar View ── */}
      {isCalendarView && (
        <div className="space-y-3">
          {/* Week navigation + Block button */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => navWeek(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {calendarDays[0].toLocaleDateString(isPt ? "pt-BR" : "en-GB", { day: "2-digit", month: "short" })}
                {" – "}
                {calendarDays[6].toLocaleDateString(isPt ? "pt-BR" : "en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-red-500/40 text-red-400 hover:bg-red-500/10" onClick={() => setShowBlockDialog(true)}>
                <BanIcon className="h-3 w-3" />Block Period
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => navWeek(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Active blocks list (compact) */}
          {blocks.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {blocks.map(b => (
                <div key={b.id} className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-md px-2 py-1 text-[10px] text-red-400">
                  <BanIcon className="h-2.5 w-2.5 shrink-0" />
                  <span>{new Date(b.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
                  {b.startDate !== b.endDate && <><span>→</span><span>{new Date(b.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span></>}
                  {b.reason && <span className="text-muted-foreground">· {b.reason.trim()}</span>}
                  <button onClick={() => deleteBlock(b.id)} className="ml-0.5 hover:text-red-300"><X className="h-2.5 w-2.5" /></button>
                </div>
              ))}
            </div>
          )}

          {/* Grid */}
          <div className="overflow-x-auto rounded-lg border">
            <div className="min-w-[640px]">
              {/* Day headers */}
              <div className="grid grid-cols-8 border-b">
                <div className="p-2 text-xs text-muted-foreground text-center" />
                {calendarDays.map((day, i) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  const blocked = isDayBlocked(day);
                  const blk = getBlockForDay(day);
                  return (
                    <div key={i} className={`p-2 text-center border-l ${isToday ? "bg-emerald-500/10" : ""} ${blocked ? "bg-red-500/10" : ""}`}>
                      <p className="text-[10px] text-muted-foreground">{(isPt ? DAY_NAMES_PT : DAY_NAMES_EN)[i]}</p>
                      <p className={`text-sm font-semibold ${isToday ? "text-emerald-400" : ""} ${blocked ? "text-red-400" : ""}`}>{day.getDate()}</p>
                      {blocked && <p className="text-[8px] text-red-400/80 leading-tight truncate">{blk?.reason || "Unavailable"}</p>}
                      {/* Onde ainda cabe alguém. Zero aparece: "cheio" é uma
                          resposta, e a ausência do número não é. */}
                      {!blocked && (() => {
                        /**
                         * Dia que já passou não mostra vaga (QA 8.6).
                         *
                         * A semana anterior aparecia oferecendo "5 livres" em
                         * dias que já foram — um número verdadeiro sobre um
                         * tempo que não existe mais.
                         */
                        const inicioDeHoje = new Date();
                        inicioDeHoje.setHours(0, 0, 0, 0);
                        if (day < inicioDeHoje) return null;

                        const chave = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                        const livres = vagasPorDia[chave];
                        if (livres === undefined) return null;
                        /**
                         * "Sem vaga", e não "fechado".
                         *
                         * A rota devolve fechado tanto para o dia em que a
                         * clínica não abre quanto para hoje depois de os
                         * horários passarem. Dizer "fechado" no segundo caso
                         * afirma algo que pode não ser verdade; "sem vaga" é o
                         * que os dois casos têm em comum.
                         */
                        if (livres === null) return <p className="text-[9px] text-muted-foreground/70">{isPt ? "sem vaga" : "no slots"}</p>;
                        return (
                          <p
                            className={`text-[9px] ${livres === 0 ? "text-muted-foreground/70" : "text-emerald-500/90"}`}
                            title={isPt ? "Consultas e sessões somadas" : "Consultations and sessions combined"}
                          >
                            {livres === 0 ? (isPt ? "cheio" : "full") : isPt ? `${livres} livres` : `${livres} free`}
                          </p>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>

              {/* Time rows */}
              {HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-8 border-b last:border-b-0" style={{ minHeight: 56 }}>
                  <div className="p-1.5 text-[10px] text-muted-foreground text-right pr-2 border-r pt-1">
                    {hour.toString().padStart(2, "0")}:00
                  </div>
                  {calendarDays.map((day, di) => {
                    const blocked = isDayBlocked(day);
                    const dayAppts = (apptsByDay[day.toDateString()] || []).filter((a) => {
                      const h = new Date(a.dateTime).getHours();
                      return h === hour;
                    });
                    return (
                      <div key={di} className={`border-l p-0.5 space-y-0.5 relative ${blocked ? "bg-red-500/5" : ""}`}>
                        {blocked && hour === 8 && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                            <BanIcon className="h-5 w-5 text-red-500" />
                          </div>
                        )}
                        {dayAppts.map((a) => (
                          <button
                            key={a.id}
                            onClick={() => { setSelectedAppointment(a); setShowEditDialog(true); setEditForm({ dateTime: a.dateTime, duration: a.duration, treatmentType: a.treatmentType, price: a.price, notes: a.notes || "", mode: a.mode === "VIDEO" ? "VIDEO" : "IN_PERSON" }); }}
                            className={`w-full text-left text-[9px] leading-tight p-1 rounded border ${STATUS_CAL[a.status] || "bg-muted"} hover:opacity-80 transition-opacity`}
                          >
                            <p className="font-medium truncate">{a.patient.firstName} {a.patient.lastName}</p>
                            <p className="truncate opacity-80">{a.treatmentType}</p>
                            <p className="opacity-60 flex items-center gap-1">
                              {new Date(a.dateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: CLINIC_TIMEZONE })}
                              {/* No mês inteiro não cabe texto, e saber que a
                                  consulta é remota muda o dia de quem organiza. */}
                              {a.mode === "VIDEO" && <Video className="h-2.5 w-2.5" />}
                            </p>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters — only in list view */}
      {!isCalendarView && (
      <>{/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={relabel("Search by patient or treatment...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={soVideo ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setSoVideo((v) => !v)}
          >
            <Video className="h-3.5 w-3.5" />
            {isPt ? "Só por vídeo" : "Video only"}
            <span className="ml-1 text-xs opacity-70">
              ({appointments.filter((a) => a.mode === "VIDEO").length})
            </span>
          </Button>
          {/* 098 T-3: os pedidos ficavam invisíveis até alguém abrir consulta
              por consulta. Este botão é a fila. */}
          {appointments.some(pedidoPendente) && (
            <Button
              variant={soPedidos ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setSoPedidos((v) => !v)}
            >
              <Clock className="h-3.5 w-3.5" />
              {isPt ? "Pedido de formato" : "Format requests"}
              <span className="ml-1 text-xs opacity-70">
                ({appointments.filter(pedidoPendente).length})
              </span>
            </Button>
          )}
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
            <p className="text-muted-foreground">{relabel("No appointments found")}</p>
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
                        {/* A regra sai do texto dos termos e aparece onde se
                            lê na hora: ninguém da clínica fica sozinho com uma
                            criança, e é o responsável que a acompanha —
                            presencialmente ou na videochamada (095 T-3). */}
                        {ehMenor(appointment.patient.dateOfBirth) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-600">
                            <Users className="h-3 w-3" />
                            {appointment.patient.guardian
                              ? isPt
                                ? `Menor — com ${appointment.patient.guardian.firstName}`
                                : `Minor — with ${appointment.patient.guardian.firstName}`
                              : isPt
                                ? "Menor — acompanhado"
                                : "Minor — accompanied"}
                          </span>
                        )}
                        {appointment.mode === "VIDEO" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-500/15 text-violet-600">
                            <Video className="h-3 w-3" />
                            {isPt ? "Por vídeo" : "Video"}
                          </span>
                        )}
                        {appointment.mode === "HOME_VISIT" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-600">
                            <Home className="h-3 w-3" />
                            {isPt ? "Em casa" : "At home"}
                          </span>
                        )}
                        {pedidoPendente(appointment) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/15 text-orange-600">
                            <Clock className="h-3 w-3" />
                            {isPt
                              ? `Pediu: ${nomeDoFormato(appointment.requestedMode)}`
                              : `Asked: ${nomeDoFormato(appointment.requestedMode)}`}
                          </span>
                        )}
                        {appointment.modeRefusedReason && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/15 text-slate-500">
                            {isPt ? "Formato recusado" : "Format refused"}
                          </span>
                        )}
                        {appointment.paymentMethod === "IN_PERSON" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-600">
                            {isPt ? "Pagar no local" : "Pay in person"}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {appointment.treatmentType}
                      </p>

                      {/* A decisão do formato, na própria linha (098 T-3).
                          Recusar **não cancela**: a consulta continua de pé,
                          presencial, no mesmo horário — só o lugar volta a ser
                          a clínica. */}
                      {pedidoPendente(appointment) && (
                        <div className="mt-2 rounded-lg border border-orange-500/30 bg-orange-500/5 p-2 space-y-2">
                          <p className="text-xs text-muted-foreground">
                            {isPt
                              ? `O paciente pediu esta consulta ${nomeDoFormato(appointment.requestedMode)}. Recusar não cancela — ela continua na clínica, no mesmo horário.`
                              : `The patient asked for this appointment ${nomeDoFormato(appointment.requestedMode)}. Refusing does not cancel it — it stays at the clinic, same time.`}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              className="h-7 text-xs gap-1"
                              disabled={decidindo === appointment.id}
                              onClick={() => decidirFormato(appointment, "approve")}
                            >
                              <CheckCircle className="h-3 w-3" />
                              {isPt ? "Aprovar" : "Approve"}
                            </Button>
                            <Input
                              value={motivoRecusa[appointment.id] || ""}
                              onChange={(e) =>
                                setMotivoRecusa((m) => ({ ...m, [appointment.id]: e.target.value }))
                              }
                              placeholder={isPt ? "Motivo da recusa…" : "Why not…"}
                              className="h-7 text-xs flex-1 min-w-[160px]"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              disabled={decidindo === appointment.id}
                              onClick={() => decidirFormato(appointment, "refuse")}
                            >
                              <XCircle className="h-3 w-3" />
                              {isPt ? "Recusar" : "Refuse"}
                            </Button>
                          </div>
                        </div>
                      )}
                      {appointment.modeRefusedReason && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {isPt ? "Motivo: " : "Reason: "}
                          {appointment.modeRefusedReason}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(appointment.dateTime).toLocaleDateString(
                            "en-GB",
                            {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              timeZone: CLINIC_TIMEZONE,
                            }
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(appointment.dateTime).toLocaleTimeString(
                            "en-GB",
                            { hour: "2-digit", minute: "2-digit", timeZone: CLINIC_TIMEZONE }
                          )}
                        </span>
                        <span>£{appointment.price}</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {/* Vêm primeiro porque, no dia da consulta, é o que o
                          terapeuta vai apertar. Some quando a consulta não vai
                          mais acontecer ou já aconteceu. */}
                      {appointment.mode === "VIDEO" &&
                        appointment.therapist?.id === meuId &&
                        !["CANCELLED", "NO_SHOW", "COMPLETED"].includes(appointment.status) && (
                          <>
                            <Button
                              size="sm"
                              className="h-8 text-xs px-2"
                              onClick={() => entrarNaSala(appointment.id)}
                            >
                              <Video className="h-3.5 w-3.5 sm:mr-1" />
                              <span className="hidden sm:inline">{isPt ? "Entrar" : "Join"}</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs px-2"
                              disabled={chamando === appointment.id}
                              onClick={() => chamarPaciente(appointment.id)}
                            >
                              <BellRing className="h-3.5 w-3.5 sm:mr-1" />
                              <span className="hidden sm:inline">
                                {chamando === appointment.id
                                  ? isPt ? "Chamando…" : "Calling…"
                                  : isPt ? "Chamar paciente" : "Call patient"}
                              </span>
                            </Button>
                          </>
                        )}
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
                      {!isPersonal && appointment.status !== "CANCELLED" && (
                        <Button size="sm" variant="outline" className="h-8 text-xs px-2" asChild>
                          <a href={`/admin/patients/${appointment.patient.id}?email=${appointment.id}`}>
                            <Mail className="h-3.5 w-3.5 sm:mr-1" />
                            <span className="hidden sm:inline">{isPt ? "Confirmar por email" : "Email confirmation"}</span>
                          </a>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs px-2"
                        onClick={() => openInvoiceDialog(appointment)}
                      >
                        <Receipt className="h-3.5 w-3.5 sm:mr-1" />
                        <span className="hidden sm:inline">Send Invoice</span>
                      </Button>
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
      </> )}

      {/* Send Invoice Dialog */}
      <Dialog open={!!invoiceDialogAppointment} onOpenChange={(open) => { if (!open) setInvoiceDialogAppointment(null); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Generate Invoice
            </DialogTitle>
            <DialogDescription>
              This queues the invoice for your approval — nothing is sent to the patient until you approve it in Marketing → Email → Pending Approval.
            </DialogDescription>
          </DialogHeader>
          {invoiceDialogAppointment && (
            <div className="space-y-4 py-2">
              <div className="text-sm bg-muted/50 rounded-lg p-3">
                <p className="font-medium">{invoiceDialogAppointment.patient.firstName} {invoiceDialogAppointment.patient.lastName}</p>
                <p className="text-muted-foreground">{invoiceDialogAppointment.treatmentType} — £{invoiceDialogAppointment.price}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Extra items (optional — e.g. a package or plan)</Label>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addInvoiceExtraItem}>
                    <Plus className="h-3 w-3" /> Add item
                  </Button>
                </div>
                {invoiceExtraItems.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      placeholder="Description (e.g. Monthly Rehabilitation Package)"
                      value={item.description}
                      onChange={(e) => updateInvoiceExtraItem(i, "description", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="£"
                      value={item.unitPrice}
                      onChange={(e) => updateInvoiceExtraItem(i, "unitPrice", e.target.value)}
                      className="w-24"
                    />
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => removeInvoiceExtraItem(i)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="text-sm font-medium text-right">
                Total: £{(
                  Number(invoiceDialogAppointment.price) +
                  invoiceExtraItems.reduce((sum, it) => sum + (parseFloat(it.unitPrice) || 0), 0)
                ).toFixed(2)}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceDialogAppointment(null)}>Cancel</Button>
            <Button onClick={sendInvoice} disabled={invoiceSendingId === invoiceDialogAppointment?.id} className="gap-1.5">
              {invoiceSendingId === invoiceDialogAppointment?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
              Generate Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Appointment Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {relabel(isPt ? "Nova Consulta" : "New Appointment")}
            </DialogTitle>
            <DialogDescription>
              {relabel(isPt ? "Agende uma consulta para um paciente. O paciente receberá um email de confirmação automaticamente." : "Schedule an appointment for a patient. The patient will receive a confirmation email automatically.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">
            <div className="space-y-2">
              <Label>{relabel(isPt ? "Paciente *" : "Patient *")}</Label>
              <Select value={createForm.patientId} onValueChange={v => setCreateForm(f => ({ ...f, patientId: v }))}>
                <SelectTrigger><SelectValue placeholder={relabel(isPt ? "Selecionar paciente..." : "Select patient...")} /></SelectTrigger>
                <SelectContent>
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{relabel(isPt ? "Tipo de Tratamento" : "Treatment Type")}</Label>
              <Select value={createForm.treatmentType} onValueChange={v => {
                const dbOpt = dbTreatments.find(t => t.name === v);
                if (dbOpt) {
                  const finalPrice = dbOpt.discountPercent > 0 ? dbOpt.price * (1 - dbOpt.discountPercent / 100) : dbOpt.price;
                  setCreateForm(f => ({ ...f, treatmentType: v, duration: dbOpt.duration, price: Math.round(finalPrice * 100) / 100 }));
                } else {
                  const opt = TREATMENT_OPTIONS.find(t => t.name === v);
                  setCreateForm(f => ({ ...f, treatmentType: v, duration: opt?.duration || f.duration, price: opt?.price || f.price }));
                }
              }}>
                <SelectTrigger><SelectValue placeholder={relabel(isPt ? "Selecionar tratamento..." : "Select treatment...")} /></SelectTrigger>
                <SelectContent>
                  {dbTreatments.length > 0
                    ? dbTreatments.map(t => {
                        const finalPrice = t.discountPercent > 0 ? t.price * (1 - t.discountPercent / 100) : t.price;
                        return (
                          <SelectItem key={t.id} value={t.name}>
                            {isPt && t.namePt ? t.namePt : t.name} — £{finalPrice.toFixed(2)} ({t.duration}min)
                            {t.discountPercent > 0 && ` (-${t.discountPercent}%)`}
                          </SelectItem>
                        );
                      })
                    : vocabReady && !isPersonal
                      // Only a KNOWN clinic gets the fixed physiotherapy fallback.
                      // A personal-trainer studio has its own catalog and must never
                      // see physio; while the session is still loading (tenant type
                      // unknown) we also withhold it, so a personal tenant can't flash
                      // the physio list before the session resolves.
                      ? TREATMENT_OPTIONS.map(t => (
                          <SelectItem key={t.id} value={t.name}>{isPt && t.namePt ? t.namePt : t.name} — £{t.price} ({t.duration}min)</SelectItem>
                        ))
                      : (
                        <SelectItem value="__none" disabled>
                          {isPt ? "Nenhum serviço configurado ainda" : "No services configured yet"}
                        </SelectItem>
                      )
                  }
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isPt ? "Data *" : "Date *"}</Label>
                <Input type="date" value={createForm.appointmentDate} onChange={e => setCreateForm(f => ({ ...f, appointmentDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{isPt ? "Hora *" : "Time *"}</Label>
                <Select value={createForm.appointmentTime} onValueChange={v => setCreateForm(f => ({ ...f, appointmentTime: v }))}>
                  <SelectTrigger><SelectValue placeholder={isPt ? "Selecionar hora..." : "Select time..."} /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 20 }, (_, i) => {
                      const h = Math.floor(i / 2) + 8;
                      const m = i % 2 === 0 ? "00" : "30";
                      const val = `${h.toString().padStart(2, "0")}:${m}`;
                      return <SelectItem key={val} value={val}>{val}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
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
            {/* Formato da consulta. Vem **antes** do pagamento de proposito: o
                formato muda o que a pessoa faz no dia, e o pagamento nao. */}
            <div className="space-y-2">
              <Label>{isPt ? "Formato" : "Format"}</Label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button"
                  onClick={() => setCreateForm(f => ({ ...f, mode: "IN_PERSON" }))}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    createForm.mode === "IN_PERSON"
                      ? "border-[#5dc9c0] bg-[#5dc9c0]/10 text-[#5dc9c0]"
                      : "border-border text-muted-foreground hover:border-border/80"
                  }`}>
                  <MapPin className="h-4 w-4" />
                  <div className="text-left">
                    {/* "Presencial", e não "Na Clínica": o Modo de Pagamento
                        logo abaixo já tem um botão chamado "Na Clínica", e os
                        dois ficavam um sobre o outro no mesmo diálogo, com o
                        mesmo rótulo e significados diferentes (achado 4 do QA). */}
                    <p className="font-medium">{isPt ? "Presencial" : "In person"}</p>
                    <p className="text-[10px] opacity-70">{isPt ? "O paciente comparece à clínica" : "The patient attends"}</p>
                  </div>
                </button>
                <button type="button"
                  onClick={() => setCreateForm(f => ({ ...f, mode: "VIDEO" }))}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    createForm.mode === "VIDEO"
                      ? "border-violet-500/40 bg-violet-500/15 text-violet-400"
                      : "border-border text-muted-foreground hover:border-border/80"
                  }`}>
                  <Video className="h-4 w-4" />
                  <div className="text-left">
                    <p className="font-medium">{isPt ? "À distância" : "Remote"}</p>
                    <p className="text-[10px] opacity-70">{isPt ? "Por videochamada, no app" : "By video call, in the app"}</p>
                  </div>
                </button>
              </div>
            </div>
            {/* Payment Mode */}
            <div className="space-y-2">
              <Label>{isPt ? "Modo de Pagamento" : "Payment Mode"}</Label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button"
                  onClick={() => setCreateForm(f => ({ ...f, paymentMode: "in_person" }))}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    createForm.paymentMode === "in_person"
                      ? "border-[#5dc9c0] bg-[#5dc9c0]/10 text-[#5dc9c0]"
                      : "border-border text-muted-foreground hover:border-border/80"
                  }`}>
                  <Banknote className="h-4 w-4" />
                  <div className="text-left">
                    <p className="font-medium">{isPt ? "Na Clínica" : "In-Person"}</p>
                    <p className="text-[10px] opacity-70">{relabel(isPt ? "Pagar presencialmente" : "Pay at the clinic")}</p>
                  </div>
                </button>
                <button type="button"
                  onClick={() => setCreateForm(f => ({ ...f, paymentMode: "online" }))}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    createForm.paymentMode === "online"
                      ? "border-violet-500/40 bg-violet-500/15 text-violet-400"
                      : "border-border text-muted-foreground hover:border-border/80"
                  }`}>
                  <CreditCard className="h-4 w-4" />
                  <div className="text-left">
                    <p className="font-medium">{isPt ? "Pagamento Online" : "Pay Online"}</p>
                    <p className="text-[10px] opacity-70">{isPt ? "Link de pagamento por email" : "Payment link via email"}</p>
                  </div>
                </button>
              </div>
              {createForm.paymentMode === "online" && createForm.price > 0 && (
                <p className="text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2">
                  {relabel(isPt
                    ? `Um link de pagamento de £${createForm.price.toFixed(2)} será gerado e enviado ao paciente por email.`
                    : `A payment link for £${createForm.price.toFixed(2)} will be generated and sent to the patient via email.`)}
                </p>
              )}
            </div>
            {/* Confirmation e-mail: off unless asked (the previewed composer is the normal way) */}
            <label className="flex items-start gap-2 text-xs rounded-lg border border-border px-3 py-2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={createForm.paymentMode === "online" ? true : createForm.sendConfirmation}
                disabled={createForm.paymentMode === "online"}
                onChange={(e) => setCreateForm(f => ({ ...f, sendConfirmation: e.target.checked }))}
              />
              <span>
                <span className="font-medium">{isPt ? "Enviar e-mail de confirmação agora (sem prévia)" : "Send the confirmation email now (no preview)"}</span>
                <span className="block text-muted-foreground">
                  {createForm.paymentMode === "online"
                    ? (isPt ? "Necessário no pagamento online: o e-mail leva o link de pagamento." : "Required for online payment: the email carries the payment link.")
                    : (isPt ? "Deixe desmarcado para escrever e ver a prévia depois, em \"Confirmar por email\"." : "Leave unchecked to write and preview it afterwards with \"Email confirmation\".")}
                </span>
              </span>
            </label>
            {/* Cortesia e isenção. Ficam juntas e discretas: são a exceção, e
                uma tela que as destaca convida a usá-las por reflexo. */}
            <div className="rounded-lg border border-border px-3 py-2 space-y-2">
              <label className="flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={createForm.courtesySession}
                  onChange={(e) => setCreateForm(f => ({ ...f, courtesySession: e.target.checked }))}
                />
                <span>
                  <span className="font-medium">{isPt ? "Sessão de cortesia" : "Courtesy session"}</span>
                  <span className="block text-muted-foreground">
                    {isPt
                      ? "Sai do pacote do paciente mesmo se ele estiver esgotado. Para ele, aparece como sessão do pacote."
                      : "Comes out of the patient's package even when it is spent. To them it shows as a package session."}
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={createForm.waiveCharge}
                  onChange={(e) => setCreateForm(f => ({ ...f, waiveCharge: e.target.checked }))}
                />
                <span>
                  <span className="font-medium">{isPt ? "Isentar a cobrança" : "Waive the charge"}</span>
                  <span className="block text-muted-foreground">
                    {isPt ? "Esta consulta fica com preço zero." : "This appointment is priced at zero."}
                  </span>
                </span>
              </label>
              {(createForm.courtesySession || createForm.waiveCharge) && (
                <input
                  value={createForm.overrideReason}
                  onChange={(e) => setCreateForm(f => ({ ...f, overrideReason: e.target.value }))}
                  placeholder={isPt ? "Motivo (fica no registro)" : "Reason (kept on the record)"}
                  className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs"
                />
              )}
            </div>

            {/* AI Notes Section */}
            <div className="space-y-3 border border-violet-500/20 rounded-lg p-3 bg-violet-500/5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-400" />
                <Label className="text-violet-400 font-medium">{isPt ? "Notas com IA" : "AI Notes"}</Label>
              </div>
              <div className="flex gap-2">
                <Input
                  value={aiInstructions}
                  onChange={e => setAiInstructions(e.target.value)}
                  placeholder={relabel(isPt
                    ? "Ex: paciente precisa preencher triagem antes, trazer exames..."
                    : "Ex: patient must complete screening first, bring medical records...")}
                  className="flex-1 text-sm bg-background"
                />
                <Button type="button" size="sm" className="gap-1.5 shrink-0 bg-violet-600 hover:bg-violet-700 text-white"
                  onClick={handleAiNotes} disabled={aiNotesLoading || !createForm.patientId || !createForm.treatmentType}>
                  {aiNotesLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {aiNotesLoading ? (isPt ? "Gerando..." : "Generating...") : (isPt ? "Gerar" : "Generate")}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">{relabel(isPt ? "Escreva instruções extras e clique Gerar. A IA cria as notas com base no paciente, tratamento e suas instruções." : "Write extra instructions and click Generate. AI creates notes based on patient, treatment and your instructions.")}</p>
            </div>
            <div className="space-y-2">
              <Label>{relabel(isPt ? "Notas da Consulta" : "Appointment Notes")}</Label>
              <Textarea value={createForm.notes} onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder={relabel(isPt ? "Notas clínicas sobre a consulta..." : "Clinical notes about the appointment...")} />
            </div>
          </div>
          <DialogFooter className="shrink-0 pt-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{isPt ? "Cancelar" : "Cancel"}</Button>
            <Button onClick={handleCreateAppointment} disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {relabel(isPt ? "Criar Consulta" : "Create Appointment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{relabel("Edit Appointment")}</DialogTitle>
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
              <label className="text-sm font-medium">{relabel("Treatment Type")}</label>
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
            {/* Presencial ou por vídeo, na edição (095 T-2).
                O modo só existia na criação, e por isso a videochamada parecia
                não existir: a agenda estava cheia de presenciais e não havia
                por onde transformar uma sem apagá-la e perder o horário. */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{isPt ? "Formato" : "Format"}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, mode: "IN_PERSON" })}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    editForm.mode === "IN_PERSON"
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-border/80"
                  }`}
                >
                  <MapPin className="h-4 w-4" />
                  {isPt ? "Presencial" : "In person"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, mode: "VIDEO" })}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    editForm.mode === "VIDEO"
                      ? "border-violet-500/40 bg-violet-500/15 text-violet-400"
                      : "border-border text-muted-foreground hover:border-border/80"
                  }`}
                >
                  <Video className="h-4 w-4" />
                  {isPt ? "À distância" : "Remote"}
                </button>
              </div>
              {editForm.mode === "VIDEO" && (
                <p className="text-[11px] text-muted-foreground">
                  {isPt
                    ? "O paciente vê que é por vídeo e entra pelo app. A sala abre dez minutos antes."
                    : "The patient sees it is by video and joins from the app. The room opens ten minutes before."}
                </p>
              )}
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

      {/* ── Block Period Dialog ── */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BanIcon className="h-5 w-5 text-red-400" />
              Block Period
            </DialogTitle>
            <DialogDescription>
              Mark days as unavailable. No bookings will be accepted during this period.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Start date</Label>
                <Input type="date" value={blockForm.startDate} onChange={e => setBlockForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End date</Label>
                <Input type="date" value={blockForm.endDate} onChange={e => setBlockForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reason <span className="text-muted-foreground">(optional)</span></Label>
              <Input placeholder="e.g. Vacation, Conference, Training..." value={blockForm.reason} onChange={e => setBlockForm(f => ({ ...f, reason: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={blockForm.blockType} onValueChange={v => setBlockForm(f => ({ ...f, blockType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ABSENCE">Absence</SelectItem>
                  <SelectItem value="VACATION">Vacation</SelectItem>
                  <SelectItem value="TRAINING">Training</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)}>Cancel</Button>
            <Button
              onClick={createBlock}
              disabled={!blockForm.startDate || !blockForm.endDate || blockSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {blockSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <BanIcon className="h-4 w-4 mr-1" />}
              Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

