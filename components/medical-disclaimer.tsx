"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

// Single source of truth for the medical disclaimer copy — never duplicate
// this text per-article. Rendered on every article (and, later, condition)
// page. See docs/spec BPR_Devin_Spec_Website_Improvements.md, P1.1.
const DISCLAIMER = {
  en: "This article is for general information and education only and is not a substitute for individual assessment, diagnosis or treatment by a qualified healthcare professional. If you have significant, worsening or concerning symptoms, please seek advice from a suitably qualified clinician.",
  pt: "Este artigo tem finalidade apenas informativa e educativa, não substituindo uma avaliação, diagnóstico ou tratamento individual por um profissional de saúde qualificado. Se apresentar sintomas significativos, em agravamento ou preocupantes, procure orientação de um profissional clínico devidamente qualificado.",
};

/**
 * "Not a substitute for professional advice" notice — a subtle, clearly
 * set-apart note, not a banner. Locale-aware (EN/PT), matching the initial
 * server-rendered language to avoid a hydration flash.
 */
export function MedicalDisclaimer() {
  const { locale } = useLocale();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const text = mounted && locale.startsWith("pt") ? DISCLAIMER.pt : DISCLAIMER.en;

  return (
    <div className="mt-10 flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
      <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground/70" />
      <p>{text}</p>
    </div>
  );
}
