"use client";

import Link from "next/link";
import { useLocale } from "@/hooks/use-locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Palette, UserPlus, Dumbbell, ClipboardList, TrendingUp, GraduationCap, ArrowRight, ArrowLeft } from "lucide-react";

interface GuideStep {
  icon: any;
  en: string; pt: string;
  whatEn: string; whatPt: string;
  whyEn: string; whyPt: string;
  href: string;
  ctaEn: string; ctaPt: string;
}

export default function StudioGuidePage() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";

  const steps: GuideStep[] = [
    {
      icon: Palette,
      en: "Personalise your studio", pt: "Personalize seu estúdio",
      whatEn: "Set your studio logo and brand colour in Settings.", whatPt: "Defina o logo e a cor da marca em Configurações.",
      whyEn: "Your students see your brand on the login and in their portal — not ours.", whyPt: "Seus alunos veem a sua marca no login e no portal deles — não a nossa.",
      href: "/admin/settings", ctaEn: "Open Settings", ctaPt: "Abrir Configurações",
    },
    {
      icon: UserPlus,
      en: "Invite your first student", pt: "Convide seu primeiro aluno",
      whatEn: "Copy your studio link (shown on the dashboard) and send it to a student, or add them under Students.", whatPt: "Copie o link do estúdio (no painel) e envie a um aluno, ou cadastre em Alunos.",
      whyEn: "They sign in through your branded link and land in a student portal built for training.", whyPt: "Eles entram pelo seu link e caem num portal de aluno feito para treino.",
      href: "/admin/patients", ctaEn: "Go to Students", ctaPt: "Ir para Alunos",
    },
    {
      icon: Dumbbell,
      en: "Build a workout", pt: "Monte um treino",
      whatEn: "Open a student, go to the Workouts tab and add exercises with sets, reps, load and rest — pulling from the exercise library (with videos).", whatPt: "Abra um aluno, vá na aba Treinos e adicione exercícios com séries, reps, carga e descanso — da biblioteca (com vídeos).",
      whyEn: "The student sees each exercise with its video and logs their sets from web or the app.", whyPt: "O aluno vê cada exercício com vídeo e registra as séries pela web ou pelo app.",
      href: "/admin/patients", ctaEn: "Open a student", ctaPt: "Abrir um aluno",
    },
    {
      icon: ClipboardList,
      en: "Record an assessment", pt: "Registre uma avaliação",
      whatEn: "In the student's Assessments tab, log weight, measurements, body composition (manual, bioimpedance or skinfolds) and progress photos.", whatPt: "Na aba Avaliações do aluno, registre peso, medidas, composição corporal (manual, bioimpedância ou dobras) e fotos de progresso.",
      whyEn: "Metric units, consent-gated photos, and body-fat computed for you.", whyPt: "Unidades métricas, fotos com consentimento e %GC calculado para você.",
      href: "/admin/patients", ctaEn: "Open a student", ctaPt: "Abrir um aluno",
    },
    {
      icon: TrendingUp,
      en: "Track progress", pt: "Acompanhe o progresso",
      whatEn: "The progress panel shows adherence, weekly volume, estimated 1RM (from logged sets) and body-composition trends.", whatPt: "O painel de progresso mostra aderência, volume semanal, 1RM estimado (dos logs) e tendências de composição.",
      whyEn: "See who's training and how they're evolving, at a glance.", whyPt: "Veja quem está treinando e como estão evoluindo, num relance.",
      href: "/admin/patients", ctaEn: "Open a student", ctaPt: "Abrir um aluno",
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {isPt ? "Voltar ao painel" : "Back to dashboard"}
        </Link>
        <h1 className="mt-3 flex items-center gap-2 text-2xl font-bold">
          <GraduationCap className="h-6 w-6 text-primary" />
          {isPt ? "Como usar o sistema" : "How it works"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {isPt ? "Cinco passos para colocar seu estúdio para rodar." : "Five steps to get your studio running."}
        </p>
      </div>

      <div className="space-y-4">
        {steps.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <s.icon className="h-4 w-4 text-primary" /> {isPt ? s.pt : s.en}
                  </h3>
                  <p className="text-sm">{isPt ? s.whatPt : s.whatEn}</p>
                  <p className="text-sm text-muted-foreground">{isPt ? s.whyPt : s.whyEn}</p>
                  <Button asChild size="sm" variant="outline" className="mt-2 gap-1.5">
                    <Link href={s.href}>{isPt ? s.ctaPt : s.ctaEn} <ArrowRight className="h-3.5 w-3.5" /></Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {isPt
          ? "Dica: seus alunos usam a web hoje; o app mobile está a caminho."
          : "Tip: your students use the web today; the mobile app is on the way."}
      </p>
    </div>
  );
}
