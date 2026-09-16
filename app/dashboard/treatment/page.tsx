"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/hooks/use-locale";
import { useVocab } from "@/hooks/use-vocab";
import { t as i18nT } from "@/lib/i18n";
import ProfessionalReviewBanner from "@/components/dashboard/professional-review-banner";
import {
  ClipboardCheck,
  RefreshCw,
  CheckCircle2,
  Circle,
  AlertCircle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  Activity,
  Play,
  AlertTriangle,
  Heart,
  Home,
  Building2,
  ScanLine,
  ExternalLink,
  X,
  Lock,
  CreditCard,
  Loader2,
  PoundSterling,
  Calendar,
  CalendarCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { isYoutubeUrl, getYoutubeEmbedUrl } from "@/lib/youtube-embed";

const PHASE_META: Record<string, { labelEn: string; labelPt: string; color: string; bg: string }> = {
  SHORT_TERM: { labelEn: "Short-Term (Acute)", labelPt: "Curto Prazo (Agudo)", color: "text-ba1-bad", bg: "bg-ba1-bad/10 border-ba1-bad/20" },
  MEDIUM_TERM: { labelEn: "Medium-Term (Rehabilitation)", labelPt: "Médio Prazo (Reabilitação)", color: "text-ba1-warn", bg: "bg-ba1-warn/10 border-ba1-warn/20" },
  LONG_TERM: { labelEn: "Long-Term (Maintenance)", labelPt: "Longo Prazo (Manutenção)", color: "text-ba1-ok", bg: "bg-ba1-ok/10 border-ba1-ok/20" },
};

const TYPE_ICONS: Record<string, any> = {
  IN_CLINIC: Building2,
  HOME_EXERCISE: Activity,
  HOME_CARE: Home,
  ASSESSMENT: ScanLine,
};

const TYPE_LABELS_EN: Record<string, string> = {
  IN_CLINIC: "In-Clinic Session",
  HOME_EXERCISE: "Home Exercise",
  HOME_CARE: "Self-Care",
  ASSESSMENT: "Assessment",
};
const TYPE_LABELS_PT: Record<string, string> = {
  IN_CLINIC: "Sessão na Clínica",
  HOME_EXERCISE: "Exercício em Casa",
  HOME_CARE: "Autocuidado",
  ASSESSMENT: "Avaliação",
};

export default function PatientTreatmentPage() {
  const { locale } = useLocale();
  const { relabel } = useVocab();
  const T = (key: string) => relabel(i18nT(key, locale));
  const isPt = locale === "pt-BR";
  const [protocols, setProtocols] = useState<any[]>([]);
  // Standalone exercises (activity 43) — ExercisePrescription rows with no
  // TreatmentProtocol behind them. Some patients (no protocol at all) only
  // ever have these; this page used to be the only one that showed them
  // (`/dashboard/exercises`, now retired — see activity 43/T-4).
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Carries the mute flag alongside the URL: the clip's own setting has to
  // reach the player, or a video the therapist silenced plays out loud here.
  const [videoModal, setVideoModal] = useState<{ url: string; muted: boolean } | null>(null);
  // A YouTube watch/share URL isn't a playable media file — pointing a bare
  // <video> tag at one leaves the player spinning forever (found in QA,
  // 13/09/2026). Shared with app/dashboard/exercises's own video modal.
  const [videoFailed, setVideoFailed] = useState(false);
  const [paying, setPaying] = useState<string | null>(null); // packageId being paid
  const [paymentBanner, setPaymentBanner] = useState<"success" | "cancelled" | null>(null);
  const [pendingAppointments, setPendingAppointments] = useState<any[]>([]);
  const [confirmingSchedule, setConfirmingSchedule] = useState(false);
  const [scheduleConfirmed, setScheduleConfirmed] = useState(false);
  const [showChangeRequest, setShowChangeRequest] = useState(false);
  const [changeRequestText, setChangeRequestText] = useState("");
  const [sendingChangeRequest, setSendingChangeRequest] = useState(false);
  const [changeRequestSent, setChangeRequestSent] = useState(false);
  const searchParams = useSearchParams();

  // Handle Stripe redirect query params
  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success") {
      setPaymentBanner("success");
      // Poll for webhook to process (Stripe webhook may be slightly delayed)
      const interval = setInterval(() => { fetchProtocols(); }, 3000);
      setTimeout(() => clearInterval(interval), 15000);
      // Clean URL
      window.history.replaceState({}, "", "/dashboard/treatment");
    } else if (payment === "cancelled") {
      setPaymentBanner("cancelled");
      window.history.replaceState({}, "", "/dashboard/treatment");
    }
  }, [searchParams]);

  const fetchProtocols = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/patient/protocol");
      const data = await res.json();
      // A 403 here means mod_treatment isn't in this patient's plan — not an
      // error. Since this page is now also where mod_exercises-only patients
      // land (activity 43 retired the separate "My Exercises" page), that's
      // routine: they simply have no protocols, same as fetchPrescriptions
      // below treats a missing mod_exercises the same way. Surfacing it as
      // an error banner would break the page for exactly the patients T-4
      // needs to keep working.
      if (res.status === 403) { setProtocols([]); return; }
      if (!res.ok) throw new Error(data.error);
      setProtocols(data.protocols || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPendingAppointments = useCallback(async () => {
    try {
      const res = await fetch("/api/patient/appointments?status=PENDING_PATIENT");
      if (res.ok) {
        const data = await res.json();
        setPendingAppointments(data.appointments || []);
      }
    } catch {}
  }, []);

  // Silent on failure (e.g. mod_exercises not in the patient's plan) — same
  // pattern as fetchPendingAppointments above, this page still works with
  // just protocol items if standalone prescriptions aren't available.
  const fetchPrescriptions = useCallback(async () => {
    try {
      const res = await fetch("/api/exercises");
      if (res.ok) {
        const data = await res.json();
        setPrescriptions((data.prescriptions || []).filter((p: any) => p.isActive));
      }
    } catch {}
  }, []);

  const confirmSchedule = async () => {
    setConfirmingSchedule(true);
    try {
      const protocolId = pendingAppointments.find((a: any) => a.protocolId)?.protocolId || null;
      const res = await fetch("/api/patient/appointments/confirm-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocolId }),
      });
      if (!res.ok) throw new Error("Failed to confirm");
      setScheduleConfirmed(true);
      setPendingAppointments([]);
      fetchProtocols();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConfirmingSchedule(false);
    }
  };

  const sendChangeRequest = async () => {
    if (!changeRequestText.trim()) return;
    setSendingChangeRequest(true);
    try {
      const res = await fetch("/api/patient/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `\ud83d\uddd3\ufe0f ${isPt ? "Pedido de altera\u00e7\u00e3o de hor\u00e1rios do tratamento" : "Treatment schedule change request"}: ${changeRequestText.trim()}`,
        }),
      });
      if (!res.ok) throw new Error("Failed to send");
      setChangeRequestSent(true);
      setShowChangeRequest(false);
      setChangeRequestText("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSendingChangeRequest(false);
    }
  };

  useEffect(() => { fetchProtocols(); fetchPendingAppointments(); fetchPrescriptions(); }, [fetchProtocols, fetchPendingAppointments, fetchPrescriptions]);

  const handleToggleItem = async (itemId: string, completed: boolean) => {
    try {
      const res = await fetch("/api/patient/protocol", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, completed }),
      });
      if (!res.ok) throw new Error("Failed to update");
      fetchProtocols();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Activity 42 — mark/unmark a specific day (within the current week only)
  // as done for one item. Optimistic-refetches the whole list rather than
  // patching local state, same pattern as handleToggleItem above.
  const handleToggleLog = async (itemId: string, dateStr: string) => {
    try {
      const res = await fetch("/api/patient/protocol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggleLog", itemId, date: dateStr }),
      });
      if (!res.ok) throw new Error("Failed to update");
      fetchProtocols();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Activity 43 — same toggle-by-date pattern as handleToggleLog above, for
  // exercises prescribed without a TreatmentProtocol behind them.
  const handleTogglePrescriptionLog = async (prescriptionId: string, dateStr: string) => {
    try {
      const res = await fetch("/api/exercises", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prescriptionId, date: dateStr }),
      });
      if (!res.ok) throw new Error("Failed to update");
      fetchPrescriptions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePayment = async (packageId: string) => {
    setPaying(packageId);
    try {
      const res = await fetch("/api/patient/packages/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err: any) {
      setError(err.message);
      setPaying(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-5 w-5 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">{T("common.loading")}</span>
      </div>
    );
  }

  // ── "Today" card (activity 43) — current-week home-exercise items across
  // every protocol, plus every active standalone prescription, normalised
  // into one shape so the card doesn't need to branch per item type.
  const todayStr = toDateStr(new Date());

  // Assigning a protocol template also auto-creates a matching standalone
  // ExercisePrescription per exercise (so the exercise-library video/notes
  // stay reachable) — every one of those exercises is ALSO a protocol item,
  // just possibly for a future week that's meant to stay hidden until the
  // therapist releases it. Without this filter every future-week exercise
  // would leak into "today" via its standalone duplicate, defeating
  // progressive release entirely (found in QA, activity 43). A prescription
  // only counts as "standalone" here when its exercise isn't already
  // governed by ANY of the patient's protocol items, current week or not.
  const protocolExerciseIds = new Set(
    protocols.flatMap((proto: any) => (proto.items || []).map((item: any) => item.exercise?.id).filter(Boolean))
  );
  const standaloneRx = prescriptions.filter((p: any) => !p.exercise?.id || !protocolExerciseIds.has(p.exercise.id));

  const todayProtocolTasks: TodayTask[] = protocols.flatMap((proto: any) => {
    if (proto.paymentRequired) return [];
    const currentWeek = currentWeekOf(proto);
    return (proto.items || [])
      .filter((item: any) => {
        if (item.hiddenFromPatient) return false;
        if (item.itemType === "IN_CLINIC" || item.itemType === "ASSESSMENT") return false;
        const startWeek = item.startWeek || 1;
        const endWeek = item.endWeek;
        return currentWeek >= startWeek && (endWeek == null || currentWeek <= endWeek);
      })
      .map((item: any) => ({
        key: `p-${item.id}`,
        kind: "protocol" as const,
        refId: item.id,
        name: item.title,
        description: item.description,
        sets: item.sets,
        reps: item.reps,
        holdSeconds: item.holdSeconds,
        restSeconds: item.restSeconds,
        frequency: item.frequency,
        videoUrl: item.exercise?.videoUrl,
        muteForPatient: item.exercise?.muteForPatient,
        doneToday: (item.completionLogs || []).some((l: any) => String(l.completedDate).slice(0, 10) === todayStr),
        weekCount: weekCountFrom(item.completionLogs),
      }));
  });
  const todayPrescriptionTasks: TodayTask[] = standaloneRx.map((p: any) => ({
    key: `x-${p.id}`,
    kind: "prescription" as const,
    refId: p.id,
    name: p.exercise?.name,
    description: p.exercise?.description,
    sets: p.sets ?? p.exercise?.defaultSets,
    reps: p.reps ?? p.exercise?.defaultReps,
    holdSeconds: p.holdSeconds ?? p.exercise?.defaultHoldSec,
    restSeconds: p.restSeconds ?? p.exercise?.defaultRestSec,
    frequency: p.frequency,
    videoUrl: p.exercise?.videoUrl,
    muteForPatient: p.exercise?.muteForPatient,
    doneToday: (p.completionLogs || []).some((l: any) => String(l.completedDate).slice(0, 10) === todayStr),
    weekCount: weekCountFrom(p.completionLogs),
  }));
  const todayTasks: TodayTask[] = [...todayProtocolTasks, ...todayPrescriptionTasks];
  const handleToggleToday = (task: TodayTask) => {
    if (task.kind === "protocol") handleToggleLog(task.refId, todayStr);
    else handleTogglePrescriptionLog(task.refId, todayStr);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          {T("patient.treatmentPlan")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {T("patient.treatmentDesc")}
        </p>
      </div>

      <ProfessionalReviewBanner />

      {/* Payment result banners */}
      {paymentBanner === "success" && (
        <div className="bg-ba1-ok/10 border border-ba1-ok/20 text-ba1-ok text-sm p-4 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-ba1-ok flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">{isPt ? "Pagamento Confirmado!" : "Payment Confirmed!"}</p>
            <p className="text-xs text-ba1-ok/80 mt-0.5">{isPt ? "Seu plano de tratamento será desbloqueado em instantes. Aguarde..." : "Your treatment plan will be unlocked momentarily. Please wait..."}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setPaymentBanner(null)}><X className="h-3 w-3" /></Button>
        </div>
      )}
      {paymentBanner === "cancelled" && (
        <div className="bg-ba1-warn/10 border border-ba1-warn/20 text-ba1-warn text-sm p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-ba1-warn flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">{isPt ? "Pagamento Cancelado" : "Payment Cancelled"}</p>
            <p className="text-xs text-ba1-warn/80 mt-0.5">{isPt ? "Você pode tentar novamente a qualquer momento." : "You can try again at any time."}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setPaymentBanner(null)}><X className="h-3 w-3" /></Button>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setError("")}><X className="h-3 w-3" /></Button>
        </div>
      )}

      <TodayCard tasks={todayTasks} onToggle={handleToggleToday} onPlayVideo={(url, muted) => { setVideoFailed(false); setVideoModal({ url, muted }); }} isPt={isPt} />

      {/* ── Proposed Schedule (PENDING_PATIENT) ── */}
      {pendingAppointments.length > 0 && !scheduleConfirmed && (
        <div className="border-2 border-ba1-warn/30 bg-ba1-warn/5 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-ba1-warn" />
            <h3 className="font-semibold text-ba1-warn">{isPt ? "Agenda Proposta — Aguarda a sua confirmação" : "Proposed Schedule — Awaiting your confirmation"}</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {isPt ? "O seu terapeuta sugeriu os seguintes dias e horários para o seu tratamento. Confirme para bloquear a sua agenda." : "Your therapist has suggested the following days and times for your treatment. Confirm to lock in your schedule."}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
            {pendingAppointments.slice(0, 20).map((a: any, i: number) => (
              <div key={a.id} className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 text-xs">
                <span className="text-ba1-warn font-bold w-5 text-right shrink-0">{i + 1}</span>
                <div>
                  <p className="font-medium">{new Date(a.dateTime).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</p>
                  <p className="text-muted-foreground">{new Date(a.dateTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · {a.duration}min</p>
                </div>
              </div>
            ))}
            {pendingAppointments.length > 20 && (
              <p className="text-xs text-muted-foreground col-span-2 text-center">+{pendingAppointments.length - 20} more sessions</p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button className="flex-1 bg-ba1-warn hover:bg-ba1-warn/90 gap-2" onClick={confirmSchedule} disabled={confirmingSchedule}>
              {confirmingSchedule
                ? <><Loader2 className="h-4 w-4 animate-spin" /> {isPt ? "A confirmar..." : "Confirming..."}</>
                : <><CalendarCheck className="h-4 w-4" /> {isPt ? "Confirmar Agenda de Tratamento" : "Confirm Treatment Schedule"}</>}
            </Button>
            <Button variant="outline" className="gap-2 border-ba1-warn/40 text-ba1-warn hover:bg-ba1-warn/10" onClick={() => setShowChangeRequest(v => !v)} disabled={confirmingSchedule}>
              <Clock className="h-4 w-4" /> {isPt ? "Pedir altera\u00e7\u00e3o de hor\u00e1rios" : "Request schedule change"}
            </Button>
          </div>
          {showChangeRequest && (
            <div className="space-y-2 border-t border-ba1-warn/20 pt-3">
              <Textarea
                value={changeRequestText}
                onChange={(e) => setChangeRequestText(e.target.value)}
                rows={3}
                placeholder={isPt ? "Descreva os dias/hor\u00e1rios que prefere (ex: prefiro ter\u00e7as e quintas \u00e0s 18h)..." : "Describe your preferred days/times (e.g. I prefer Tuesdays and Thursdays at 6pm)..."}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" className="gap-1.5" onClick={sendChangeRequest} disabled={sendingChangeRequest || !changeRequestText.trim()}>
                  {sendingChangeRequest ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarCheck className="h-3.5 w-3.5" />}
                  {isPt ? "Enviar pedido \u00e0 cl\u00ednica" : "Send request to clinic"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowChangeRequest(false)}>{isPt ? "Cancelar" : "Cancel"}</Button>
              </div>
            </div>
          )}
        </div>
      )}
      {changeRequestSent && (
        <div className="bg-ba1-ok/10 border border-ba1-ok/20 text-ba1-ok text-sm p-4 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p>{isPt ? "Pedido enviado \u00e0 cl\u00ednica! Entraremos em contacto para ajustar os hor\u00e1rios." : "Request sent to the clinic! We will contact you to adjust the schedule."}</p>
        </div>
      )}
      {scheduleConfirmed && (
        <div className="bg-ba1-ok/10 border border-ba1-ok/20 text-ba1-ok text-sm p-4 rounded-lg flex items-center gap-3">
          <CalendarCheck className="h-5 w-5 shrink-0" />
          <p>{isPt ? "Agenda confirmada! As suas sessões foram marcadas." : "Schedule confirmed! Your sessions have been booked."}</p>
        </div>
      )}

      {protocols.length === 0 && prescriptions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-medium">{T("patient.noTreatment")}</p>
            <p className="text-sm mt-1">{T("patient.noTreatmentDesc")}</p>
          </CardContent>
        </Card>
      )}

      {protocols.map((proto: any) => {
        // Group items by week range (activity 42) — startWeek-endWeek, in
        // order. Items with no endWeek are "ongoing" and shown as "Week N+".
        const byWeek: Record<string, any[]> = {};
        proto.items?.forEach((item: any) => {
          const key = `${item.startWeek || 1}-${item.endWeek || ""}`;
          if (!byWeek[key]) byWeek[key] = [];
          byWeek[key].push(item);
        });
        const weekKeys = Object.keys(byWeek).sort((a, b) => {
          const [aStart] = a.split("-").map(Number);
          const [bStart] = b.split("-").map(Number);
          return aStart - bStart;
        });

        // "Week 1" starts on the protocol's startDate — not the surgery date,
        // which matters when a patient restarts adaptively (see Ana Livia's
        // note: she's day 21 post-op but week 1 of this protocol instance).
        // Falls back to createdAt for older protocols with no startDate, so
        // the day strip always has a real date to anchor on instead of
        // silently rendering "Invalid Date" buttons.
        const effectiveStartDate = proto.startDate || proto.createdAt;
        const currentWeek = currentWeekOf(proto);

        // Progress stats
        const totalItems = proto.items?.length || 0;
        const completedItems = proto.items?.filter((i: any) => i.isCompleted).length || 0;
        const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

        return (
          <Card key={proto.id}>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-base sm:text-lg truncate">{proto.title}</CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    {isPt ? "Por Dr." : "By Dr."} {proto.therapist.firstName} {proto.therapist.lastName}
                    {proto.estimatedWeeks && <> · <Clock className="h-3 w-3 inline" /> {proto.estimatedWeeks} {isPt ? "semanas" : "weeks"}</>}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xl sm:text-2xl font-bold text-primary">{progress}%</div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{completedItems}/{totalItems} {isPt ? "concluídos" : "completed"}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-0">
              {/* Summary */}
              <p className="text-sm bg-muted/30 rounded-lg p-3">{proto.summary}</p>

              {/* Progressive release notice */}
              {proto.hasMoreComing && (
                <div className="bg-ba1-health/10 border border-ba1-health/20 text-ba1-health text-xs p-3 rounded-lg flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" />
                  <p>{isPt
                    ? "O seu especialista liberta o plano progressivamente conforme a sua evolução. Novos exercícios e atividades aparecerão aqui."
                    : "Your specialist releases the plan progressively as you improve. New exercises and activities will appear here."}</p>
                </div>
              )}

              {/* ─── Payment Gate ─── */}
              {proto.paymentRequired && proto.activePackage && (
                <div className="border-2 border-ba1-warn/30 bg-ba1-warn/10 rounded-lg p-4 sm:p-6 text-center space-y-3">
                  <Lock className="h-10 w-10 mx-auto text-ba1-warn" />
                  <h3 className="text-lg font-semibold text-ba1-warn">{T("treatment.paymentRequired")}</h3>
                  <p className="text-sm text-ba1-warn/80 max-w-md mx-auto">
                    {isPt ? "Seu protocolo de tratamento está pronto! Conclua o pagamento para desbloquear seu plano personalizado com exercícios, cronogramas e acompanhamento." : "Your treatment protocol is ready! Complete payment to unlock your full personalised treatment plan with exercises, schedules, and progress tracking."}
                  </p>
                  <div className="bg-card rounded-lg p-3 max-w-sm mx-auto space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">{isPt ? "Pacote" : "Package"}:</span><span className="font-medium">{proto.activePackage.name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{isPt ? "Sessões" : "Sessions"}:</span><span className="font-medium">{proto.activePackage.totalSessions}</span></div>
                    {proto.activePackage.consultationFee > 0 && (
                      <div className="flex justify-between"><span className="text-muted-foreground">{isPt ? "Taxa de Consulta" : "Consultation Fee"}:</span><span>£{proto.activePackage.consultationFee.toFixed(2)}</span></div>
                    )}
                    <div className="flex justify-between border-t pt-1.5 font-bold">
                      <span>{isPt ? "Total" : "Total"}:</span>
                      <span className="text-primary flex items-center gap-0.5">
                        <PoundSterling className="h-3.5 w-3.5" />
                        {proto.activePackage.selectedPaymentType === "FULL_PACKAGE"
                          ? (proto.activePackage.priceFullPackage || proto.activePackage.pricePerSession * proto.activePackage.totalSessions).toFixed(2)
                          : proto.activePackage.pricePerSession.toFixed(2)
                        }
                        {proto.activePackage.selectedPaymentType === "PER_SESSION" && <span className="text-xs font-normal text-muted-foreground ml-1">{isPt ? "/sessão" : "/session"}</span>}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="lg"
                    className="gap-2"
                    onClick={() => handlePayment(proto.activePackage.id)}
                    disabled={paying === proto.activePackage.id}
                  >
                    {paying === proto.activePackage.id ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> {isPt ? "Processando..." : "Processing..."}</>
                    ) : (
                      <><CreditCard className="h-4 w-4" /> {T("treatment.payNow")}</>
                    )}
                  </Button>
                  <p className="text-[10px] text-muted-foreground">{isPt ? "Pagamento seguro via Stripe" : "Secure payment powered by Stripe"}</p>
                </div>
              )}

              {/* Diagnosis summary */}
              {!proto.paymentRequired && proto.diagnosis?.summary && (
                <div className="bg-ba1-health/10 border border-ba1-health/20 rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-ba1-health mb-1">{isPt ? "Resumo Clínico" : "Clinical Summary"}</h4>
                  <p className="text-sm text-foreground">{proto.diagnosis.summary}</p>
                </div>
              )}

              {/* Precautions (visible even behind gate) */}
              {!proto.paymentRequired && proto.precautions?.length > 0 && (
                <div className="bg-ba1-bad/10 border border-ba1-bad/20 rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-ba1-bad flex items-center gap-1 mb-1">
                    <AlertTriangle className="h-3 w-3" /> {isPt ? "Precauções Importantes" : "Important Precautions"}
                  </h4>
                  {proto.precautions.map((pc: any, i: number) => (
                    <p key={i} className="text-sm text-ba1-bad/80">• {pc.precaution}</p>
                  ))}
                </div>
              )}

              {/* Goals */}
              {!proto.paymentRequired && proto.goals?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">{isPt ? "Seus Objetivos" : "Your Goals"}</h4>
                  <div className="grid gap-2">
                    {proto.goals.map((g: any, i: number) => (
                      <div key={i} className={`rounded-lg border p-2.5 ${PHASE_META[g.phase]?.bg || ""}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${PHASE_META[g.phase]?.color || ""}`}>{g.timeline}</span>
                          {g.metrics && <span className="text-[10px] text-muted-foreground">{g.metrics}</span>}
                        </div>
                        <p className="text-sm mt-0.5">{g.goal}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Items by Week (hidden behind payment gate) */}
              {!proto.paymentRequired && weekKeys.map((key) => {
                const items = byWeek[key];
                const [startWeek, endWeekStr] = key.split("-");
                const endWeek = endWeekStr ? Number(endWeekStr) : null;
                const isCurrentWeek = currentWeek >= Number(startWeek) && (endWeek === null || currentWeek <= endWeek);
                const weekCompleted = items.filter((i: any) => i.isCompleted).length;

                return (
                  <WeekSection
                    key={key}
                    startWeek={Number(startWeek)}
                    endWeek={endWeek}
                    isCurrentWeek={isCurrentWeek}
                    currentWeek={currentWeek}
                    items={items}
                    weekCompleted={weekCompleted}
                    onToggle={handleToggleItem}
                    onToggleLog={handleToggleLog}
                    onPlayVideo={(url: string, muted: boolean) => { setVideoFailed(false); setVideoModal({ url, muted }); }}
                    protocolStartDate={effectiveStartDate}
                  />
                );
              })}

              {/* References */}
              <ReferencesSection
                diagnosisRefs={proto.diagnosis?.references || []}
                protocolRefs={proto.references || []}
              />
            </CardContent>
          </Card>
        );
      })}

      <PrescriptionSection
        prescriptions={standaloneRx}
        onToggleLog={handleTogglePrescriptionLog}
        onPlayVideo={(url: string, muted: boolean) => { setVideoFailed(false); setVideoModal({ url, muted }); }}
      />

      {/* Video Modal */}
      {videoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setVideoModal(null)}>
          <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="absolute -top-10 right-0 text-white hover:text-white/80"
              onClick={() => setVideoModal(null)}
            >
              <X className="h-5 w-5" /> {isPt ? "Fechar" : "Close"}
            </Button>
            {isYoutubeUrl(videoModal.url) ? (
              <div className="aspect-video rounded-lg overflow-hidden">
                <iframe
                  src={getYoutubeEmbedUrl(videoModal.url, { muted: videoModal.muted })}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : videoFailed ? (
              <div className="aspect-video rounded-lg bg-black/40 flex flex-col items-center justify-center text-center px-6 text-white">
                <p className="text-sm font-medium">{isPt ? "Vídeo indisponível" : "Video unavailable"}</p>
                <p className="text-xs text-white/70 mt-1">{isPt ? "Tente novamente mais tarde ou avise a clínica." : "Try again later or let the clinic know."}</p>
              </div>
            ) : (
              <video
                src={videoModal.url}
                muted={videoModal.muted}
                controls
                // Browsers block autoplay of audible media, so an unmuted
                // clip that "autoplayed" simply never started — wait for a
                // manual tap instead (same fix already applied to
                // dashboard/exercises's own video modal).
                autoPlay={videoModal.muted}
                className="w-full rounded-lg"
                onError={() => setVideoFailed(true)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Week Section (activity 42 — replaces the old phase grouping) ───

// "Week 1" starts on the protocol's startDate — not the surgery date, which
// matters when a patient restarts adaptively. Falls back to createdAt for
// older protocols with no startDate. Shared by the per-protocol render below
// and the top-level "Today" card, which needs it for every protocol at once.
function currentWeekOf(proto: any): number {
  const effectiveStartDate = proto.startDate || proto.createdAt;
  return effectiveStartDate
    ? Math.max(1, Math.floor((Date.now() - new Date(effectiveStartDate).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1)
    : 1;
}

function weekLabel(startWeek: number, endWeek: number | null, isPt: boolean): string {
  const w = isPt ? "Semana" : "Week";
  if (endWeek === null) return `${w} ${startWeek}+`;
  if (endWeek === startWeek) return `${w} ${startWeek}`;
  return isPt ? `Semanas ${startWeek}-${endWeek}` : `Weeks ${startWeek}-${endWeek}`;
}

// 7 consecutive days for the given week number, counting from the
// protocol's startDate as day 1 of week 1 (not necessarily a calendar
// Monday). Built via setDate() day-increments rather than adding raw
// milliseconds, so a DST transition inside the range can't skip/duplicate
// a calendar day the way (ms + 24h*N) would.
function weekDates(startDate: string, weekNumber: number): Date[] {
  const base = new Date(startDate);
  base.setHours(0, 0, 0, 0);
  const weekStart = new Date(base);
  weekStart.setDate(weekStart.getDate() + (weekNumber - 1) * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

// LOCAL calendar date as YYYY-MM-DD — deliberately NOT toISOString(), which
// is UTC and silently shifts the date by a day whenever the browser's
// timezone offset crosses midnight (QA caught this: "today" was saving as
// "yesterday" for a UK browser). weekDates() below builds each Date at
// local midnight, so extracting local components here is what keeps them
// on the same calendar day the patient actually sees on the button.
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Indexed by Date.getDay() (0=Sun..6=Sat) rather than position-in-week, so
// the letter always matches the real weekday even when the protocol's
// "week 1" doesn't start on a Monday.
const WEEKDAY_LETTER_EN = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAY_LETTER_PT = ["D", "S", "T", "Q", "Q", "S", "S"];

// Last 7 calendar days ending today, oldest first (activity 43) — the
// window used for standalone prescriptions, which have no protocol
// startDate/week to anchor a calendar-week strip on. Same day-count as
// weekDates() above, just not aligned to a fixed week boundary.
function rollingDays(): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
}

// Distinct days logged within the same trailing-7-day window rollingDays()
// covers — the "X/7 this week" label (activity 43), replacing the old
// lifetime "Done Nx"/"Completed 1x" counters that carried no time context.
function weekCountFrom(logs: any[] | undefined): number {
  const cutoff = toDateStr(rollingDays()[0]);
  const today = toDateStr(new Date());
  const dates = new Set((logs || []).map((l: any) => String(l.completedDate).slice(0, 10)));
  let count = 0;
  dates.forEach((d) => { if (d >= cutoff && d <= today) count++; });
  return count;
}

function DayStrip({ days, marked, onToggleDate, isPt }: {
  days: Date[];
  marked: Set<string>;
  onToggleDate: (dateStr: string) => void;
  isPt: boolean;
}) {
  const todayStr = toDateStr(new Date());
  const dayLabels = isPt ? WEEKDAY_LETTER_PT : WEEKDAY_LETTER_EN;

  return (
    <div className="flex items-center gap-1 mt-2">
      {days.map((d) => {
        const dateStr = toDateStr(d);
        const isFuture = dateStr > todayStr;
        const isMarked = marked.has(dateStr);
        return (
          <button
            key={dateStr}
            disabled={isFuture}
            onClick={() => onToggleDate(dateStr)}
            title={d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}
            className={`h-7 w-7 rounded-full text-[10px] font-semibold flex items-center justify-center border transition-colors shrink-0 ${
              isMarked
                ? "bg-ba1-ok text-white border-ba1-ok"
                : isFuture
                  ? "border-muted text-muted-foreground/40 cursor-not-allowed"
                  : "border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            {isMarked ? <CheckCircle2 className="h-3.5 w-3.5" /> : dayLabels[d.getDay()]}
          </button>
        );
      })}
    </div>
  );
}

function WeekSection({ startWeek, endWeek, isCurrentWeek, currentWeek, items, weekCompleted, onToggle, onToggleLog, onPlayVideo, protocolStartDate }: {
  startWeek: number;
  endWeek: number | null;
  isCurrentWeek: boolean;
  currentWeek: number;
  items: any[];
  weekCompleted: number;
  onToggle: (id: string, completed: boolean) => void;
  onToggleLog: (itemId: string, dateStr: string) => void;
  onPlayVideo: (url: string, muted: boolean) => void;
  protocolStartDate: string;
}) {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const isPt = locale === "pt-BR";
  const [expanded, setExpanded] = useState(isCurrentWeek);

  return (
    <div>
      <button
        className={`w-full rounded-lg border p-3 flex items-center justify-between ${
          isCurrentWeek ? "bg-ba1-health/10 border-ba1-health/30" : "bg-muted/30"
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${isCurrentWeek ? "text-ba1-health" : ""}`}>
            {weekLabel(startWeek, endWeek, isPt)}
          </span>
          {isCurrentWeek && <Badge className="text-[9px] bg-ba1-health text-white">{isPt ? "Semana atual" : "Current week"}</Badge>}
          <Badge variant="outline" className="text-[10px]">{weekCompleted}/{items.length}</Badge>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div className="space-y-2 mt-2">
          {items.map((item: any) => {
            const Icon = TYPE_ICONS[item.itemType] || Activity;
            return (
              <div
                key={item.id}
                className={`border rounded-lg p-3 transition-colors ${item.isCompleted ? "bg-ba1-ok/5 border-ba1-ok/20" : ""}`}
              >
                <div className="flex items-start gap-3">
                  {item.itemType !== "IN_CLINIC" && item.itemType !== "ASSESSMENT" ? (
                    <button onClick={() => onToggle(item.id, !item.isCompleted)} className="mt-0.5 shrink-0">
                      {item.isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-ba1-ok" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                      )}
                    </button>
                  ) : (
                    <Icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium text-sm ${item.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                        {item.title}
                      </span>
                      <Badge variant="outline" className="text-[9px]">{isPt ? TYPE_LABELS_PT[item.itemType] : TYPE_LABELS_EN[item.itemType]}</Badge>
                      {weekCountFrom(item.completionLogs) > 0 && (
                        <span className="text-[10px] text-ba1-ok font-medium">{weekCountFrom(item.completionLogs)}/7 {isPt ? "esta semana" : "this week"}</span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>

                    {item.instructions && (
                      <p className="text-xs mt-1 bg-muted/50 rounded p-2 whitespace-pre-wrap leading-relaxed">{item.instructions}</p>
                    )}

                    {/* Parameters */}
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {item.frequency && <Badge variant="secondary" className="text-[10px]">{item.frequency}</Badge>}
                      {item.sets && <Badge variant="secondary" className="text-[10px]">{item.sets} {T("exercises.sets")}</Badge>}
                      {item.reps && <Badge variant="secondary" className="text-[10px]">{item.reps} {T("exercises.reps")}</Badge>}
                      {item.holdSeconds && <Badge variant="secondary" className="text-[10px]">{T("exercises.hold")} {item.holdSeconds}s</Badge>}
                      {item.restSeconds && <Badge variant="secondary" className="text-[10px]">{T("exercises.rest")} {item.restSeconds}s</Badge>}
                    </div>

                    {/* Exercise video */}
                    {item.exercise?.videoUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 h-7 text-xs gap-1"
                        onClick={() => onPlayVideo(item.exercise.videoUrl, item.exercise.muteForPatient !== false)}
                      >
                        <Play className="h-3 w-3" /> {T("treatment.watchVideo")}
                      </Button>
                    )}

                    {/* Daily strip — only for the current week */}
                    {isCurrentWeek && item.itemType !== "IN_CLINIC" && item.itemType !== "ASSESSMENT" && (
                      <div>
                        <p className="text-[10px] text-muted-foreground mt-2">{isPt ? "Marque os dias que fez:" : "Mark the days you did it:"}</p>
                        <DayStrip
                          days={weekDates(protocolStartDate, currentWeek)}
                          marked={new Set((item.completionLogs || []).map((l: any) => String(l.completedDate).slice(0, 10)))}
                          onToggleDate={(dateStr) => onToggleLog(item.id, dateStr)}
                          isPt={isPt}
                        />
                      </div>
                    )}

                    {/* References */}
                    {item.references?.length > 0 && (
                      <div className="mt-1.5">
                        {item.references.map((r: any, j: number) => (
                          <p key={j} className="text-[10px] text-primary/60 italic">
                            <BookOpen className="h-2.5 w-2.5 inline mr-0.5" /> {r.citation}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Today Card (activity 43) — everything due today in one place, from ───
// both current-week protocol items and standalone prescriptions, with a
// much bigger tap target than the day-strip circle below.

type TodayTask = {
  key: string;
  kind: "protocol" | "prescription";
  refId: string;
  name: string;
  description?: string | null;
  sets?: number | null;
  reps?: number | null;
  holdSeconds?: number | null;
  restSeconds?: number | null;
  frequency?: string | null;
  videoUrl?: string | null;
  muteForPatient?: boolean;
  doneToday: boolean;
  weekCount: number;
};

function TodayCard({ tasks, onToggle, onPlayVideo, isPt }: {
  tasks: TodayTask[];
  onToggle: (task: TodayTask) => void;
  onPlayVideo: (url: string, muted: boolean) => void;
  isPt: boolean;
}) {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  if (tasks.length === 0) return null;

  const todayLabel = new Date().toLocaleDateString(isPt ? "pt-BR" : "en-GB", { weekday: "long", day: "numeric", month: "long" });
  const doneCount = tasks.filter((t) => t.doneToday).length;

  return (
    <Card className="border-2 border-ba1-health/30 bg-ba1-health/5">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base capitalize flex items-center gap-1.5">
            <CalendarCheck className="h-4 w-4 text-ba1-health" /> {isPt ? "Hoje" : "Today"} · {todayLabel}
          </CardTitle>
          <Badge className="bg-ba1-health text-white text-[10px]">{doneCount}/{tasks.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-2">
        {tasks.map((task) => (
          <div key={task.key} className={`rounded-lg border p-3 flex items-start gap-3 ${task.doneToday ? "bg-ba1-ok/5 border-ba1-ok/20" : "bg-card"}`}>
            <button
              onClick={() => onToggle(task)}
              className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${
                task.doneToday
                  ? "bg-ba1-ok border-ba1-ok text-white"
                  : "border-ba1-health text-ba1-health hover:bg-ba1-health/10"
              }`}
              title={isPt ? "Marcar como feito hoje" : "Mark as done today"}
            >
              <CheckCircle2 className="h-6 w-6" />
            </button>
            <div className="flex-1 min-w-0">
              <p className={`font-medium text-sm ${task.doneToday ? "line-through text-muted-foreground" : ""}`}>{task.name}</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {task.sets && <Badge variant="secondary" className="text-[10px]">{task.sets} {T("exercises.sets")}</Badge>}
                {task.reps && <Badge variant="secondary" className="text-[10px]">{task.reps} {T("exercises.reps")}</Badge>}
                {task.holdSeconds && <Badge variant="secondary" className="text-[10px]">{T("exercises.hold")} {task.holdSeconds}s</Badge>}
                {task.frequency && <Badge variant="secondary" className="text-[10px]">{task.frequency}</Badge>}
              </div>
              {task.videoUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-xs gap-1"
                  onClick={() => onPlayVideo(task.videoUrl!, task.muteForPatient !== false)}
                >
                  <Play className="h-3 w-3" /> {T("treatment.watchVideo")}
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── General Exercises (activity 43) — standalone ExercisePrescription ───
// rows, no TreatmentProtocol behind them. Same day-strip UI as a protocol's
// WeekSection, but windowed on the last 7 rolling days instead of a
// protocol-anchored calendar week (these have no startWeek/endWeek).

function PrescriptionSection({ prescriptions, onToggleLog, onPlayVideo }: {
  prescriptions: any[];
  onToggleLog: (prescriptionId: string, dateStr: string) => void;
  onPlayVideo: (url: string, muted: boolean) => void;
}) {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const isPt = locale === "pt-BR";
  const days = rollingDays();

  if (prescriptions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-base sm:text-lg">{isPt ? "Exercícios Gerais" : "General Exercises"}</CardTitle>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {isPt ? "Prescritos diretamente pela clínica, sem um plano semanal associado." : "Prescribed directly by the clinic, not tied to a weekly plan."}
        </p>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {prescriptions.map((p: any) => {
          const marked = new Set<string>((p.completionLogs || []).map((l: any) => String(l.completedDate).slice(0, 10)));
          const weekCount = weekCountFrom(p.completionLogs);
          return (
            <div key={p.id} className="border rounded-lg p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{p.exercise?.name}</span>
                {weekCount > 0 && <span className="text-[10px] text-ba1-ok font-medium">{weekCount}/7 {isPt ? "esta semana" : "this week"}</span>}
              </div>
              {p.exercise?.description && <p className="text-xs text-muted-foreground mt-0.5">{p.exercise.description}</p>}

              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {p.frequency && <Badge variant="secondary" className="text-[10px]">{p.frequency}</Badge>}
                {(p.sets ?? p.exercise?.defaultSets) && <Badge variant="secondary" className="text-[10px]">{p.sets ?? p.exercise?.defaultSets} {T("exercises.sets")}</Badge>}
                {(p.reps ?? p.exercise?.defaultReps) && <Badge variant="secondary" className="text-[10px]">{p.reps ?? p.exercise?.defaultReps} {T("exercises.reps")}</Badge>}
                {(p.holdSeconds ?? p.exercise?.defaultHoldSec) && <Badge variant="secondary" className="text-[10px]">{T("exercises.hold")} {p.holdSeconds ?? p.exercise?.defaultHoldSec}s</Badge>}
              </div>

              {p.exercise?.videoUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-xs gap-1"
                  onClick={() => onPlayVideo(p.exercise.videoUrl, p.exercise.muteForPatient !== false)}
                >
                  <Play className="h-3 w-3" /> {T("treatment.watchVideo")}
                </Button>
              )}

              <div>
                <p className="text-[10px] text-muted-foreground mt-2">{isPt ? "Marque os dias que fez:" : "Mark the days you did it:"}</p>
                <DayStrip days={days} marked={marked} onToggleDate={(dateStr) => onToggleLog(p.id, dateStr)} isPt={isPt} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── References Section ───

function ReferencesSection({ diagnosisRefs, protocolRefs }: { diagnosisRefs: any[]; protocolRefs: any[] }) {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const [show, setShow] = useState(false);
  const allRefs = [...(diagnosisRefs || []), ...(protocolRefs || [])];
  // Deduplicate by citation
  const seen = new Set<string>();
  const unique = allRefs.filter((r) => {
    if (seen.has(r.citation)) return false;
    seen.add(r.citation);
    return true;
  });

  if (unique.length === 0) return null;

  return (
    <div className="border-t pt-3">
      <button
        className="text-sm font-semibold flex items-center gap-1.5 text-primary hover:underline"
        onClick={() => setShow(!show)}
      >
        <BookOpen className="h-4 w-4" /> {isPt ? "Referências Científicas" : "Scientific References"} ({unique.length})
        {show ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {show && (
        <div className="mt-2 space-y-2 pl-2 border-l-2 border-primary/20">
          {unique.map((r: any, i: number) => (
            <div key={i} className="text-xs">
              <p className="text-foreground">{r.citation}</p>
              {r.doi && (
                <a href={`https://doi.org/${r.doi}`} target="_blank" rel="noopener noreferrer" className="text-primary/70 hover:underline flex items-center gap-0.5">
                  DOI: {r.doi} <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
