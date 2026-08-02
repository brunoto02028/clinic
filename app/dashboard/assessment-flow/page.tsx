"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  Loader2,
  ArrowLeft,
  Brain,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Target,
  Stethoscope,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLocale } from "@/hooks/use-locale";
import { useSession } from "next-auth/react";

interface StepData {
  id: string;
  label: string;
  labelPt: string;
  status: string;
  data: any;
}

interface AssessmentProgress {
  steps: StepData[];
  completedCount: number;
  totalSteps: number;
  progressPercent: number;
  nextStep: string | null;
  userId: string;
  clinicId: string;
}

const STEP_ICONS: Record<string, any> = {
  screening: ClipboardList,
  outcome_measures: TrendingUp,
};

const STEP_COLORS: Record<string, string> = {
  completed: "bg-green-500/15 text-green-500 border-green-500/30",
  processing: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  in_progress: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  partial: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  pending: "bg-muted text-muted-foreground border-border",
};

export default function AssessmentFlowPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const { data: session } = useSession();

  const [progress, setProgress] = useState<AssessmentProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const res = await fetch("/api/patient/assessment-progress");
      if (res.ok) {
        const data = await res.json();
        setProgress(data);
      }
    } catch (e) {
      console.error("Error fetching progress:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleStartStep = async (stepId: string) => {
    switch (stepId) {
      case "screening":
        router.push("/dashboard/screening");
        break;

      case "outcome_measures":
        router.push("/dashboard/outcome-measures");
        break;
    }
  };

  const getStatusBadge = (status: string) => {
    const labels: Record<string, { en: string; pt: string }> = {
      completed: { en: "Completed", pt: "Concluído" },
      processing: { en: "Processing", pt: "Processando" },
      in_progress: { en: "In Progress", pt: "Em Progresso" },
      partial: { en: "Partial", pt: "Parcial" },
      pending: { en: "Not Started", pt: "Não Iniciado" },
    };
    const label = labels[status] || labels.pending;
    return (
      <Badge variant="outline" className={`${STEP_COLORS[status]} text-xs`}>
        {status === "completed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
        {status === "processing" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
        {status === "in_progress" && <Clock className="h-3 w-3 mr-1" />}
        {isPt ? label.pt : label.en}
      </Badge>
    );
  };

  const getStepAction = (step: StepData) => {
    if (step.status === "completed") {
      return { label: isPt ? "Ver" : "View", variant: "outline" as const };
    }
    if (step.status === "processing") {
      return { label: isPt ? "Aguardar" : "Processing", variant: "outline" as const };
    }
    if (step.status === "in_progress") {
      return { label: isPt ? "Continuar" : "Continue", variant: "default" as const };
    }
    return { label: isPt ? "Iniciar" : "Start", variant: "default" as const };
  };

  const getStepDescription = (stepId: string) => {
    const descriptions: Record<string, { en: string; pt: string }> = {
      screening: {
        en: "Complete your medical history, pain assessment, and treatment goals. This helps us understand your condition before the assessment.",
        pt: "Complete o seu historial médico, avaliação da dor e objectivos de tratamento. Isto ajuda-nos a compreender a sua condição.",
      },
      outcome_measures: {
        en: "Rate your pain level (VAS) and complete the FAAM questionnaire to measure your foot and ankle function. These scores track your progress over time.",
        pt: "Avalie o seu nível de dor (VAS) e complete o questionário FAAM para medir a função do pé e tornozelo. Estes scores medem a sua evolução.",
      },
    };
    const desc = descriptions[stepId] || descriptions.screening;
    return isPt ? desc.pt : desc.en;
  };

  const getStepDetails = (step: StepData) => {
    if (!step.data) return null;

    switch (step.id) {
      case "screening":
        return step.data.chiefComplaint
          ? `${isPt ? "Queixa" : "Complaint"}: ${step.data.chiefComplaint}${step.data.painScore ? ` | ${isPt ? "Dor" : "Pain"}: ${step.data.painScore}/10` : ""}`
          : null;

      case "outcome_measures":
        return step.data?.vasScore !== undefined
          ? `VAS: ${step.data.vasScore}/10${step.data.faamAdlPercent ? ` | FAAM ADL: ${step.data.faamAdlPercent}%` : ""}${step.data.faamSportPercent ? ` | Sport: ${step.data.faamSportPercent}%` : ""}`
          : null;

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-10 w-10 text-yellow-500 mx-auto mb-3" />
        <p className="text-muted-foreground">
          {isPt ? "Não foi possível carregar o progresso." : "Unable to load progress."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" />
            {isPt ? "Avaliação Inicial" : "Initial Assessment"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isPt
              ? "Siga os passos abaixo antes da sua primeira consulta"
              : "Follow the steps below ahead of your first appointment"}
          </p>
        </div>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {isPt ? "Progresso Geral" : "Overall Progress"}
            </span>
            <span className="text-sm text-muted-foreground">
              {progress.completedCount}/{progress.totalSteps} {isPt ? "passos" : "steps"}
            </span>
          </div>
          <Progress value={progress.progressPercent} className="h-2" />
          {progress.progressPercent === 100 && (
            <p className="text-xs text-green-500 mt-2 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isPt
                ? "Avaliação completa! O seu terapeuta irá rever os resultados."
                : "Assessment complete! Your therapist will review the results."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-3">
        {progress.steps.map((step, index) => {
          const Icon = STEP_ICONS[step.id] || Target;
          const action = getStepAction(step);
          const details = getStepDetails(step);
          const isNext = progress.nextStep === step.id;
          const isLocked = step.status === "pending" && index > 0 && progress.steps[index - 1].status === "pending";

          return (
            <Card
              key={step.id}
              className={`transition-all ${
                isNext ? "ring-2 ring-primary/50 shadow-md" : ""
              } ${isLocked ? "opacity-50" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Step Number & Icon */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                    step.status === "completed"
                      ? "bg-green-500/15 text-green-500"
                      : isNext
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}>
                    {step.status === "completed" ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        {isPt ? "Passo" : "Step"} {index + 1}
                      </span>
                      {getStatusBadge(step.status)}
                      {isNext && (
                        <Badge className="bg-primary/20 text-primary text-xs">
                          <Sparkles className="h-3 w-3 mr-1" />
                          {isPt ? "Próximo" : "Next"}
                        </Badge>
                      )}
                    </div>

                    <h3 className="font-semibold mt-1">
                      {isPt ? step.labelPt : step.label}
                    </h3>

                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {getStepDescription(step.id)}
                    </p>

                    {details && (
                      <p className="text-xs mt-2 px-2 py-1 bg-muted rounded-md inline-block">
                        {details}
                      </p>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="flex-shrink-0">
                    <Button
                      variant={action.variant}
                      size="sm"
                      disabled={isLocked || step.status === "processing" || creating === step.id}
                      onClick={() => handleStartStep(step.id)}
                    >
                      {creating === step.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          {action.label}
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Box */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Brain className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">
                {isPt ? "Como funciona?" : "How does it work?"}
              </p>
              <p className="text-muted-foreground mt-1">
                {isPt
                  ? "Complete cada passo ao seu ritmo. As suas respostas são revistas pelo seu terapeuta antes da consulta, para que o tempo em clínica seja usado no tratamento."
                  : "Complete each step at your own pace. Your answers are reviewed by your therapist ahead of your appointment, so clinic time is spent on treatment."}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {isPt ? "~5 min total" : "~5 min total"}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <Stethoscope className="h-3 w-3 mr-1" />
                  {isPt ? "Revisto por terapeuta" : "Therapist reviewed"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
