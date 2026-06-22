"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User, ClipboardList, Calendar, CheckCircle, ChevronRight,
  Sparkles, ArrowRight,
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
    descEn: "Add your phone, date of birth, address, and emergency contact. We need this to reach you about appointments and ensure your safety during treatment.",
    descPt: "Adicione telefone, data de nascimento, endereço e contato de emergência. Precisamos disso para entrar em contato sobre consultas e garantir a sua segurança durante o tratamento.",
    href: "/dashboard/profile",
    checkField: "profileComplete",
  },
  {
    id: "consent",
    icon: CheckCircle,
    titleEn: "Terms & Consent",
    titlePt: "Termos e Consentimento",
    descEn: "Review and accept the Terms of Use and consent for clinical data processing. This is required by law before we can begin your treatment.",
    descPt: "Revise e aceite os Termos de Uso e consentimento para processamento de dados clínicos. Isto é exigido por lei antes de iniciarmos o seu tratamento.",
    href: "/dashboard/consent",
    checkField: "consentAccepted",
  },
  {
    id: "screening",
    icon: ClipboardList,
    titleEn: "Assessment Screening",
    titlePt: "Triagem de Avaliação",
    descEn: "Fill in your health history, complaints, pain levels and goals. Your therapist needs this to prepare the best treatment plan for you. It only takes 5–10 minutes.",
    descPt: "Preencha seu histórico de saúde, queixas, níveis de dor e objetivos. O terapeuta precisa disto para preparar o melhor plano de tratamento para si. Leva apenas 5–10 minutos.",
    href: "/dashboard/screening",
    checkField: "screeningComplete",
  },
  {
    id: "appointment",
    icon: Calendar,
    titleEn: "Book Your First Appointment",
    titlePt: "Agende Sua Primeira Consulta",
    descEn: "Schedule your initial consultation with our physiotherapy team. During this session, we'll assess your condition and create a personalised treatment plan.",
    descPt: "Agende sua consulta inicial com nossa equipa de fisioterapia. Nesta sessão, avaliaremos a sua condição e criaremos um plano de tratamento personalizado.",
    href: "/dashboard/appointments",
    checkField: "hasAppointment",
  },
];

export default function OnboardingWizard() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const pathname = usePathname();
  const isPreview = pathname?.startsWith("/patient-preview");

  const [completionMap, setCompletionMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [allDone, setAllDone] = useState(false);

  useEffect(() => {
    fetch("/api/patient/onboarding-status")
      .then((r) => r.json())
      .then((data) => {
        setCompletionMap(data);
        const allComplete = data.profileComplete && data.screeningComplete && data.consentAccepted && data.hasAppointment;
        setAllDone(!!allComplete);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || allDone || isPreview) return null;

  const completedCount = STEPS.filter((s) => completionMap[s.checkField]).length;
  const progress = Math.round((completedCount / STEPS.length) * 100);
  const nextStep = STEPS.find((s) => !completionMap[s.checkField]);

  return (
    <Card className="border-primary/30 bg-card overflow-hidden relative">
      <CardContent className="p-5 sm:p-6">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-bold text-foreground text-lg">
            {isPt ? "Bem-vindo ao BPR!" : "Welcome to BPR!"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isPt ? "Complete os passos abaixo para começar" : "Complete the steps below to get started"}
          </p>
        </div>

        {/* Progress ring + text */}
        <div className="flex items-center gap-4 mb-5 p-3 rounded-xl bg-muted/30">
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg viewBox="0 0 48 48" className="w-14 h-14 -rotate-90">
              <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/50" />
              <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" className="text-primary"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 20}`}
                strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`}
                style={{ transition: "stroke-dashoffset 0.5s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">{progress}%</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {isPt ? `${completedCount} de ${STEPS.length} completos` : `${completedCount} of ${STEPS.length} complete`}
            </p>
            <p className="text-xs text-muted-foreground">
              {isPt ? "Falta pouco para começar seu tratamento" : "Almost ready to start your treatment"}
            </p>
          </div>
        </div>

        {/* Checklist items */}
        <div className="flex flex-col gap-2">
          {STEPS.map((step) => {
            const done = completionMap[step.checkField];
            const isCurrent = nextStep?.id === step.id;
            const isLocked = !done && !isCurrent;

            return (
              <Link
                key={step.id}
                href={isLocked ? "#" : step.href}
                className={isLocked ? "pointer-events-none" : ""}
              >
                <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  done
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : isCurrent
                    ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20"
                    : "bg-muted/20 border-white/5 opacity-40"
                }`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 ${
                    done
                      ? "bg-emerald-500 border-emerald-500"
                      : isCurrent
                      ? "border-primary bg-primary/10"
                      : "border-muted-foreground/30"
                  }`}>
                    {done ? (
                      <CheckCircle className="h-4 w-4 text-white" />
                    ) : isCurrent ? (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${
                      done ? "text-emerald-400 line-through decoration-emerald-400/30" : "text-foreground"
                    }`}>
                      {isPt ? step.titlePt : step.titleEn}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {done
                        ? (isPt ? "Concluído" : "Complete")
                        : isCurrent
                        ? (isPt ? step.descPt : step.descEn)
                        : (isPt ? "Disponível após o passo anterior" : "Available after previous step")}
                    </p>
                  </div>
                  {!isLocked && (
                    <ChevronRight className={`h-4 w-4 shrink-0 ${
                      isCurrent ? "text-primary" : "text-muted-foreground/50"
                    }`} />
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* CTA Button */}
        {nextStep && (
          <Button asChild className="w-full mt-4 gap-2" size="lg">
            <Link href={nextStep.href}>
              {isPt ? nextStep.titlePt : nextStep.titleEn}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
