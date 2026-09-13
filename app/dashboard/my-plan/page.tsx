"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Target,
  AlertTriangle,
  Building2,
  Home,
  Loader2,
  MessageSquare,
  Repeat,
  Calendar,
  User,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/hooks/use-locale";

const PHASE_COLORS: Record<string, string> = {
  acute: "text-ba1-bad bg-ba1-bad/10 border-ba1-bad/20",
  subacute: "text-ba1-warn bg-ba1-warn/10 border-ba1-warn/20",
  chronic: "text-ba1-health bg-ba1-health/10 border-ba1-health/20",
};

const SEVERITY_COLORS: Record<string, string> = {
  mild: "text-ba1-ok bg-ba1-ok/10 border-ba1-ok/20",
  moderate: "text-ba1-warn bg-ba1-warn/10 border-ba1-warn/20",
  severe: "text-ba1-bad bg-ba1-bad/10 border-ba1-bad/20",
};

export default function MyPlanPage() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openPhase, setOpenPhase] = useState<number>(0);

  useEffect(() => {
    fetch("/api/patient/rehab-plan")
      .then(r => r.json())
      .then(d => setPlan(d.plan || null))
      .catch(() => setPlan(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (!plan) return (
    <div className="max-w-lg mx-auto px-4 py-12 text-center space-y-3">
      <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center mx-auto">
        <Activity className="h-7 w-7 text-muted-foreground" />
      </div>
      <h2 className="font-semibold">{isPt ? "Nenhum plano disponível" : "No plan available yet"}</h2>
      <p className="text-sm text-muted-foreground">
        {isPt
          ? "O teu terapeuta ainda não enviou o teu plano de reabilitação. Após a tua avaliação, o plano aparecerá aqui."
          : "Your therapist hasn't sent your rehabilitation plan yet. After your assessment, your plan will appear here."}
      </p>
    </div>
  );

  const p = plan.planJson as any;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-24">

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold">{isPt ? "Meu Plano de Reabilitação" : "My Rehabilitation Plan"}</h1>
        <p className="text-sm text-muted-foreground">
          {isPt ? "Preparado por" : "Prepared by"}{" "}
          <span className="font-medium text-foreground">
            {plan.createdBy?.firstName} {plan.createdBy?.lastName}
          </span>
          {plan.sentAt && (
            <span> · {new Date(plan.sentAt).toLocaleDateString(isPt ? "pt-BR" : "en-GB")}</span>
          )}
        </p>
      </div>

      {/* Therapist note */}
      {plan.therapistNote && (
        <Card className="border-ba1-health/30 bg-ba1-health/5">
          <CardContent className="p-4 flex gap-3">
            <User className="h-4 w-4 text-ba1-health shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-ba1-health mb-1">
                {isPt ? "Nota do terapeuta" : "Therapist note"}
              </p>
              <p className="text-sm leading-relaxed">{plan.therapistNote}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clinical summary */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            {isPt ? "Resumo Clínico" : "Clinical Summary"}
          </p>
          <p className="text-sm font-medium leading-snug">{p.diagnosisHypothesis}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={`text-xs ${SEVERITY_COLORS[p.severity] || ""}`}>
              {isPt
                ? p.severity === "mild" ? "Leve" : p.severity === "moderate" ? "Moderado" : "Severo"
                : p.severity}
            </Badge>
            <Badge variant="outline" className={`text-xs ${PHASE_COLORS[p.phase] || ""}`}>
              {isPt
                ? p.phase === "acute" ? "Fase Aguda" : p.phase === "subacute" ? "Fase Subaguda" : "Fase Crónica"
                : p.phase}
            </Badge>
          </div>
          {p.prognosis && (
            <div className="flex gap-2 items-start text-sm text-muted-foreground">
              <Target className="h-3.5 w-3.5 shrink-0 mt-0.5 text-ba1-ok" />
              <span>{p.prognosis}</span>
            </div>
          )}
          {p.returnToActivityTimeline && (
            <div className="flex gap-2 items-start text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0 mt-0.5 text-ba1-ok" />
              <span>{p.returnToActivityTimeline}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Red flags */}
      {p.redFlags?.length > 0 && (
        <Card className="border-ba1-bad/30 bg-ba1-bad/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-ba1-bad" />
              <p className="text-xs font-semibold text-ba1-bad uppercase">
                {isPt ? "Avisos importantes" : "Important warnings"}
              </p>
            </div>
            <ul className="space-y-1">
              {p.redFlags.map((f: string, i: number) => (
                <li key={i} className="text-sm text-ba1-bad flex gap-2">
                  <span className="shrink-0">•</span><span>{f}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Rehabilitation phases */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">{isPt ? "Fases de Reabilitação" : "Rehabilitation Phases"}</p>
        {p.phases?.map((phase: any, i: number) => (
          <Card key={i} className="overflow-hidden">
            <button
              className="w-full p-4 flex items-center gap-3 text-left"
              onClick={() => setOpenPhase(openPhase === i ? -1 : i)}
            >
              <div className="w-7 h-7 rounded-full bg-ba1-ok/20 text-ba1-ok flex items-center justify-center text-xs font-bold shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{phase.phase}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{phase.duration}</span>
                </div>
              </div>
              {openPhase === i
                ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
            </button>

            {openPhase === i && (
              <CardContent className="px-4 pb-4 pt-0 space-y-4 border-t">

                {/* Goals */}
                {phase.goals?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                      {isPt ? "Objetivos" : "Goals"}
                    </p>
                    <ul className="space-y-1.5">
                      {phase.goals.map((g: string, j: number) => (
                        <li key={j} className="flex gap-2 text-sm">
                          <CheckCircle2 className="h-3.5 w-3.5 text-ba1-ok shrink-0 mt-0.5" />
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* BPR treatments */}
                {phase.bprTreatments?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-3.5 w-3.5 text-ba1-ok" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase">
                        {isPt ? "Tratamentos na Clínica" : "In-Clinic Treatments"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {phase.bprTreatments.map((t: string, j: number) => (
                        <Badge key={j} variant="outline" className="text-xs border-ba1-ok/30 text-ba1-ok">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exercises */}
                {phase.exercises?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Home className="h-3.5 w-3.5 text-ba1-health" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase">
                        {isPt ? "Exercícios em Casa" : "Home Exercises"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {phase.exercises.map((ex: any, j: number) => (
                        <div key={j} className="p-3 bg-muted/30 rounded-lg space-y-1">
                          <p className="text-sm font-medium">{ex.name}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            {ex.sets && (
                              <span className="flex items-center gap-1">
                                <Repeat className="h-3 w-3" />{ex.sets}
                              </span>
                            )}
                            {ex.reps && <span>× {ex.reps}</span>}
                            {ex.frequency && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />{ex.frequency}
                              </span>
                            )}
                          </div>
                          {ex.notes && (
                            <p className="text-xs text-muted-foreground flex gap-1.5">
                              <MessageSquare className="h-3 w-3 shrink-0 mt-0.5" />
                              {ex.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Precautions */}
                {phase.precautions?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-ba1-warn uppercase mb-2">
                      {isPt ? "Precauções" : "Precautions"}
                    </p>
                    <ul className="space-y-1">
                      {phase.precautions.map((pr: string, j: number) => (
                        <li key={j} className="flex gap-2 text-sm text-ba1-warn">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>{pr}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Progression criteria */}
                {phase.progressionCriteria?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                      {isPt ? "Critérios de Progressão" : "Progression Criteria"}
                    </p>
                    <ul className="space-y-1">
                      {phase.progressionCriteria.map((c: string, j: number) => (
                        <li key={j} className="flex gap-2 text-sm text-muted-foreground">
                          <span className="text-ba1-ok shrink-0">→</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Footer note */}
      <Card className="bg-muted/20">
        <CardContent className="p-4 text-xs text-muted-foreground text-center">
          {isPt
            ? "Este plano foi preparado especificamente para ti. Se tiveres dúvidas ou os sintomas mudarem, contacta o teu terapeuta."
            : "This plan was prepared specifically for you. If you have any questions or your symptoms change, contact your therapist."}
        </CardContent>
      </Card>
    </div>
  );
}
