"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useVocab } from "@/hooks/use-vocab";
import { useLocale } from "@/hooks/use-locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Palette, UserPlus, Dumbbell, ClipboardList, TrendingUp, CheckCircle2, Circle, ArrowRight, X, GraduationCap } from "lucide-react";

const DISMISS_KEY = "bpr-studio-getting-started-dismissed";

interface Step {
  icon: any;
  en: string;
  pt: string;
  descEn: string;
  descPt: string;
  href: string;
  done?: boolean;
}

export default function StudioGettingStarted({ studentCount = 0 }: { studentCount?: number }) {
  const { isPersonal } = useVocab();
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid a flash before we read storage

  useEffect(() => {
    try { setDismissed(localStorage.getItem(DISMISS_KEY) === "1"); } catch { setDismissed(false); }
  }, []);

  if (!isPersonal || dismissed) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setDismissed(true);
  };

  const steps: Step[] = [
    { icon: Palette, en: "Personalise your studio", pt: "Personalize seu estúdio", descEn: "Add your logo and brand colour.", descPt: "Adicione seu logo e a cor da marca.", href: "/admin/settings" },
    { icon: UserPlus, en: "Invite your first student", pt: "Convide seu primeiro aluno", descEn: "Share your studio link so they can join.", descPt: "Compartilhe o link do estúdio para eles entrarem.", href: "/admin/patients", done: studentCount > 0 },
    { icon: Dumbbell, en: "Build a workout", pt: "Monte um treino", descEn: "Open a student and add exercises with sets, reps and load.", descPt: "Abra um aluno e adicione exercícios com séries, reps e carga.", href: "/admin/patients" },
    { icon: ClipboardList, en: "Record an assessment", pt: "Registre uma avaliação", descEn: "Log measurements, body composition and photos.", descPt: "Registre medidas, composição corporal e fotos.", href: "/admin/patients" },
    { icon: TrendingUp, en: "Track progress", pt: "Acompanhe o progresso", descEn: "See adherence, estimated 1RM and body-composition trends.", descPt: "Veja aderência, 1RM estimado e tendências de composição.", href: "/admin/patients" },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Card className="border-primary/30 relative">
      <button
        type="button"
        onClick={dismiss}
        aria-label={isPt ? "Dispensar" : "Dismiss"}
        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          {isPt ? "Primeiros passos" : "Getting started"}
        </CardTitle>
        <CardDescription>
          {isPt ? "Um caminho rápido para preparar seu estúdio." : "A quick path to set your studio up."}
          {" "}
          <Link href="/admin/studio-guide" className="text-primary font-medium hover:underline">
            {isPt ? "Guia completo" : "Full guide"} →
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((s, i) => (
          <Link
            key={i}
            href={s.href}
            className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3 hover:bg-muted/40 transition-colors"
          >
            {s.done
              ? <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
              : <Circle className="h-5 w-5 flex-shrink-0 text-muted-foreground/40" />}
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${s.done ? "text-muted-foreground line-through decoration-muted-foreground/30" : ""}`}>
                {isPt ? s.pt : s.en}
              </p>
              <p className="text-xs text-muted-foreground">{isPt ? s.descPt : s.descEn}</p>
            </div>
            <s.icon className="h-4 w-4 flex-shrink-0 text-muted-foreground/60" />
          </Link>
        ))}
        <p className="pt-1 text-xs text-muted-foreground">
          {doneCount > 0
            ? (isPt ? `${doneCount} de ${steps.length} concluído` : `${doneCount} of ${steps.length} done`)
            : (isPt ? "Comece pelo primeiro passo" : "Start with the first step")}
        </p>
      </CardContent>
    </Card>
  );
}
