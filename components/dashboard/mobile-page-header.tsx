"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/use-locale";

const PAGE_TITLES: Record<string, { en: string; pt: string }> = {
  "/dashboard": { en: "Dashboard", pt: "Painel" },
  "/dashboard/appointments": { en: "Appointments", pt: "Agendamentos" },
  "/dashboard/appointments/book": { en: "Book Appointment", pt: "Agendar Consulta" },
  "/dashboard/blood-pressure": { en: "Blood Pressure", pt: "Pressão Arterial" },
  "/dashboard/body-assessments": { en: "Body Assessment", pt: "Avaliação Corporal" },
  "/dashboard/cancellation-policy": { en: "Cancellation Policy", pt: "Política de Cancelamento" },
  "/dashboard/clinical-notes": { en: "Clinical Notes", pt: "Notas Clínicas" },
  "/dashboard/community": { en: "Community", pt: "Comunidade" },
  "/dashboard/consent": { en: "Consent", pt: "Consentimento" },
  "/dashboard/documents": { en: "My Documents", pt: "Meus Documentos" },
  "/dashboard/education": { en: "Education", pt: "Educação" },
  "/dashboard/exercises": { en: "My Exercises", pt: "Meus Exercícios" },
  "/dashboard/journey": { en: "BPR Journey", pt: "Jornada BPR" },
  "/dashboard/marketplace": { en: "Marketplace", pt: "Marketplace" },
  "/dashboard/membership": { en: "Membership", pt: "Assinatura" },
  "/dashboard/plans": { en: "Plans & Pricing", pt: "Planos e Preços" },
  "/dashboard/profile": { en: "My Profile", pt: "Meu Perfil" },
  "/dashboard/quiz": { en: "Quiz", pt: "Quiz" },
  "/dashboard/quizzes": { en: "Quizzes", pt: "Quizzes" },
  "/dashboard/records": { en: "My Records", pt: "Meus Registros" },
  "/dashboard/scans": { en: "Foot Scans", pt: "Escaneamento de Pés" },
  "/dashboard/screening": { en: "Medical Screening", pt: "Triagem Médica" },
  "/dashboard/treatment": { en: "Treatment Plan", pt: "Plano de Tratamento" },
  "/dashboard/achievements": { en: "Achievements", pt: "Conquistas" },
};

export default function MobilePageHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";

  // Don't show on main dashboard
  if (!pathname || pathname === "/dashboard" || pathname === "/dashboard/") return null;

  // Find matching title — try exact match first, then prefix match for dynamic routes like /appointments/[id]
  let title = PAGE_TITLES[pathname];
  if (!title) {
    // Try prefix match (e.g. /dashboard/appointments/abc → Appointments)
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length >= 2) {
      const parentPath = "/" + segments.slice(0, 2).join("/");
      title = PAGE_TITLES[parentPath];
    }
  }

  if (!title) return null;

  return (
    <div className="lg:hidden flex items-center gap-2 -mt-2 mb-4">
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 h-9 w-9"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <h2 className="text-base font-semibold text-foreground truncate">
        {isPt ? title.pt : title.en}
      </h2>
    </div>
  );
}
