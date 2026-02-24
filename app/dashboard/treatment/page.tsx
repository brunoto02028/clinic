"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/hooks/use-locale";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

const PHASE_META: Record<string, { labelEn: string; labelPt: string; color: string; bg: string }> = {
  SHORT_TERM: { labelEn: "Short-Term (Acute)", labelPt: "Curto Prazo (Agudo)", color: "text-red-700", bg: "bg-red-50 border-red-200 dark:bg-red-950/20" },
  MEDIUM_TERM: { labelEn: "Medium-Term (Rehabilitation)", labelPt: "Médio Prazo (Reabilitação)", color: "text-amber-700", bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/20" },
  LONG_TERM: { labelEn: "Long-Term (Maintenance)", labelPt: "Longo Prazo (Manutenção)", color: "text-green-700", bg: "bg-green-50 border-green-200 dark:bg-green-950/20" },
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
  const T = (key: string) => i18nT(key, locale);
  const isPt = locale === "pt-BR";
  const [protocols, setProtocols] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [videoModal, setVideoModal] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null); // packageId being paid
  const [paymentBanner, setPaymentBanner] = useState<"success" | "cancelled" | null>(null);
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
      if (!res.ok) throw new Error(data.error);
      setProtocols(data.protocols || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProtocols(); }, [fetchProtocols]);

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
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 text-green-800 dark:text-green-200 text-sm p-4 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">{isPt ? "Pagamento Confirmado!" : "Payment Confirmed!"}</p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">{isPt ? "Seu plano de tratamento será desbloqueado em instantes. Aguarde..." : "Your treatment plan will be unlocked momentarily. Please wait..."}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setPaymentBanner(null)}><X className="h-3 w-3" /></Button>
        </div>
      )}
      {paymentBanner === "cancelled" && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 text-amber-800 dark:text-amber-200 text-sm p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">{isPt ? "Pagamento Cancelado" : "Payment Cancelled"}</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">{isPt ? "Você pode tentar novamente a qualquer momento." : "You can try again at any time."}</p>
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

      {protocols.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-medium">{T("patient.noTreatment")}</p>
            <p className="text-sm mt-1">{T("patient.noTreatmentDesc")}</p>
          </CardContent>
        </Card>
      )}

      {protocols.map((proto: any) => {
        // Group items by phase
        const byPhase: Record<string, any[]> = {};
        proto.items?.forEach((item: any) => {
          if (!byPhase[item.phase]) byPhase[item.phase] = [];
          byPhase[item.phase].push(item);
        });

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

              {/* ─── Payment Gate ─── */}
              {proto.paymentRequired && proto.activePackage && (
                <div className="border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 sm:p-6 text-center space-y-3">
                  <Lock className="h-10 w-10 mx-auto text-amber-600" />
                  <h3 className="text-lg font-semibold text-amber-800">{T("treatment.paymentRequired")}</h3>
                  <p className="text-sm text-amber-700 max-w-md mx-auto">
                    {isPt ? "Seu protocolo de tratamento está pronto! Conclua o pagamento para desbloquear seu plano personalizado com exercícios, cronogramas e acompanhamento." : "Your treatment protocol is ready! Complete payment to unlock your full personalised treatment plan with exercises, schedules, and progress tracking."}
                  </p>
                  <div className="bg-white dark:bg-background rounded-lg p-3 max-w-sm mx-auto space-y-1.5 text-sm">
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
                        {proto.activePackage.selectedPaymentType === "PER_SESSION" && <span className="text-xs font-normal text-muted-foreground ml-1">/session</span>}
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
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-blue-700 mb-1">{isPt ? "Resumo Clínico" : "Clinical Summary"}</h4>
                  <p className="text-sm text-blue-900 dark:text-blue-200">{proto.diagnosis.summary}</p>
                </div>
              )}

              {/* Precautions (visible even behind gate) */}
              {!proto.paymentRequired && proto.precautions?.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-red-700 flex items-center gap-1 mb-1">
                    <AlertTriangle className="h-3 w-3" /> {isPt ? "Precauções Importantes" : "Important Precautions"}
                  </h4>
                  {proto.precautions.map((pc: any, i: number) => (
                    <p key={i} className="text-sm text-red-700">• {pc.precaution}</p>
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

              {/* Items by Phase (hidden behind payment gate) */}
              {!proto.paymentRequired && ["SHORT_TERM", "MEDIUM_TERM", "LONG_TERM"].map((phase) => {
                const items = byPhase[phase];
                if (!items?.length) return null;
                const meta = PHASE_META[phase];
                const phaseCompleted = items.filter((i: any) => i.isCompleted).length;

                return (
                  <PhaseSection
                    key={phase}
                    phase={phase}
                    meta={meta}
                    items={items}
                    phaseCompleted={phaseCompleted}
                    onToggle={handleToggleItem}
                    onPlayVideo={(url: string) => setVideoModal(url)}
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
            <video
              src={videoModal}
              controls
              autoPlay
              className="w-full rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Phase Section ───

function PhaseSection({ phase, meta, items, phaseCompleted, onToggle, onPlayVideo }: {
  phase: string;
  meta: { labelEn: string; labelPt: string; color: string; bg: string };
  items: any[];
  phaseCompleted: number;
  onToggle: (id: string, completed: boolean) => void;
  onPlayVideo: (url: string) => void;
}) {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const isPt = locale === "pt-BR";
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <button
        className={`w-full rounded-lg border p-3 flex items-center justify-between ${meta.bg}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${meta.color}`}>{isPt ? meta.labelPt : meta.labelEn}</span>
          <Badge variant="outline" className="text-[10px]">{phaseCompleted}/{items.length}</Badge>
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
                className={`border rounded-lg p-3 transition-colors ${item.isCompleted ? "bg-green-50/50 dark:bg-green-950/10 border-green-200" : ""}`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  {item.itemType !== "IN_CLINIC" && item.itemType !== "ASSESSMENT" ? (
                    <button onClick={() => onToggle(item.id, !item.isCompleted)} className="mt-0.5 shrink-0">
                      {item.isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
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
                      {item.completedCount > 0 && (
                        <span className="text-[10px] text-green-600">{isPt ? "Feito" : "Done"} {item.completedCount}x</span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>

                    {item.instructions && (
                      <p className="text-xs mt-1 bg-muted/50 rounded p-2">{item.instructions}</p>
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
                        onClick={() => onPlayVideo(item.exercise.videoUrl)}
                      >
                        <Play className="h-3 w-3" /> {T("treatment.watchVideo")}
                      </Button>
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
