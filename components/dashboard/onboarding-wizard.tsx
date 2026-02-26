"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User, ClipboardList, Calendar, CheckCircle, ChevronRight,
  Sparkles, X, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";

interface OnboardingStep {
  id: string;
  icon: any;
  titleEn: string;
  titlePt: string;
  descEn: string;
  descPt: string;
  href: string;
  checkField: string;
}

const STEPS: OnboardingStep[] = [
  {
    id: "profile",
    icon: User,
    titleEn: "Complete Your Profile",
    titlePt: "Complete Seu Perfil",
    descEn: "Add your phone number and address so we can contact you.",
    descPt: "Adicione seu telefone e endereço para que possamos contactá-lo.",
    href: "/dashboard/profile",
    checkField: "profileComplete",
  },
  {
    id: "screening",
    icon: ClipboardList,
    titleEn: "Assessment Screening",
    titlePt: "Triagem de Avaliação",
    descEn: "Fill in your health history so your therapist can prepare your treatment.",
    descPt: "Preencha seu histórico de saúde para que o terapeuta possa preparar seu tratamento.",
    href: "/dashboard/screening",
    checkField: "screeningComplete",
  },
  {
    id: "consent",
    icon: CheckCircle,
    titleEn: "Terms & Consent",
    titlePt: "Termos e Consentimento",
    descEn: "Review and accept the Terms of Use and consent for clinical data processing.",
    descPt: "Revise e aceite os Termos de Uso e consentimento para processamento de dados clínicos.",
    href: "/dashboard/consent",
    checkField: "consentAccepted",
  },
  {
    id: "appointment",
    icon: Calendar,
    titleEn: "Book Your First Appointment",
    titlePt: "Agende Sua Primeira Consulta",
    descEn: "Schedule your initial consultation with our physiotherapy team.",
    descPt: "Agende sua consulta inicial com nossa equipa de fisioterapia.",
    href: "/dashboard/appointments",
    checkField: "hasAppointment",
  },
];

export default function OnboardingWizard() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const pathname = usePathname();
  const isPreview = pathname?.startsWith("/patient-preview");

  const [dismissed, setDismissed] = useState(false);
  const [completionMap, setCompletionMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [allDone, setAllDone] = useState(false);

  useEffect(() => {
    // Check if user already dismissed
    const wasDismissed = localStorage.getItem("bpr_onboarding_dismissed");
    if (wasDismissed === "true") {
      setDismissed(true);
      setLoading(false);
      return;
    }

    // Fetch onboarding status
    fetch("/api/patient/onboarding-status")
      .then((r) => r.json())
      .then((data) => {
        setCompletionMap(data);
        const done = data.profileComplete && data.screeningComplete && data.consentAccepted && data.hasAppointment;
        setAllDone(!!done);
        if (done) {
          localStorage.setItem("bpr_onboarding_dismissed", "true");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("bpr_onboarding_dismissed", "true");
  };

  if (loading || dismissed || allDone || isPreview) return null;

  const completedCount = STEPS.filter((s) => completionMap[s.checkField]).length;
  const progress = Math.round((completedCount / STEPS.length) * 100);
  const nextStep = STEPS.find((s) => !completionMap[s.checkField]);

  return (
    <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-card to-primary/5 overflow-hidden relative">
      <div className="h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-colors z-10"
      >
        <X className="h-4 w-4" />
      </button>
      <CardContent className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/80">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-base">
              {isPt ? "Bem-vindo ao BPR!" : "Welcome to BPR!"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isPt ? `${completedCount} de ${STEPS.length} passos concluídos` : `${completedCount} of ${STEPS.length} steps completed`}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2 mb-5">
          <div
            className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const done = completionMap[step.checkField];
            const isCurrent = nextStep?.id === step.id;
            return (
              <Link key={step.id} href={step.href}>
                <div
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    done
                      ? "bg-emerald-500/10 border-emerald-500/20"
                      : isCurrent
                      ? "bg-primary/5 border-primary/30 ring-2 ring-primary/20"
                      : "bg-muted/50 border-white/10 hover:border-white/20"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      done
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                        ? "bg-primary text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${done ? "text-emerald-400 line-through" : "text-foreground"}`}>
                      {isPt ? step.titlePt : step.titleEn}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {isPt ? step.descPt : step.descEn}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Next action CTA */}
        {nextStep && (
          <div className="mt-4 flex justify-end">
            <Button asChild size="sm" className="gap-2">
              <Link href={nextStep.href}>
                {isPt ? "Próximo passo" : "Next step"}: {isPt ? nextStep.titlePt : nextStep.titleEn}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
