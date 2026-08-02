"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Calendar,
  FileText,
  Shield,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  LayoutDashboard,
  Footprints,
  Heart,
  Activity,
  Dumbbell,
  FileUp,
  ClipboardList,
  MessageCircleQuestion,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import OnboardingWizard from "@/components/dashboard/onboarding-wizard";

const ICON_MAP: Record<string, any> = {
  LayoutDashboard,
  Calendar,
  Footprints,
  FileText,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Heart,
  Activity,
  Dumbbell,
  FileUp,
};

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  violet: { bg: "bg-violet-500/15", text: "text-violet-400" },
  blue: { bg: "bg-blue-500/15", text: "text-blue-400" },
  amber: { bg: "bg-amber-500/15", text: "text-amber-400" },
  rose: { bg: "bg-rose-500/15", text: "text-rose-400" },
};

interface DashboardStats {
  upcomingAppointments: number;
  completedAppointments: number;
  clinicalNotes: number;
  screeningComplete: boolean;
  [key: string]: any;
}

interface PortalConfig {
  welcomeTitle: string;
  welcomeSubtitle: string;
  statsCards: { id: string; label: string; sublabel: string; field: string; icon: string; color: string; enabled: boolean }[];
  quickActions: { id: string; title: string; description: string; buttonText: string; buttonLink: string; icon: string; enabled: boolean }[];
  showScreeningAlert: boolean;
  screeningAlertTitle: string;
  screeningAlertText: string;
}

export default function PatientDashboard() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isPreview = pathname?.startsWith("/patient-preview");
  const previewQuery = isPreview ? `?pid=${searchParams?.get("pid") || ""}&pname=${searchParams?.get("pname") || ""}` : "";
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [config, setConfig] = useState<PortalConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/stats").then((r) => r.json()).catch(() => null),
      fetch("/api/patient-portal-config").then((r) => r.json()).catch(() => null),
    ]).then(([statsData, configData]) => {
      setStats(statsData);
      setConfig(configData);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // i18n mappings for stats by ID
  const STAT_I18N: Record<string, { label: string; sublabel: string }> = {
    upcoming: { label: T("patient.stat.upcoming"), sublabel: T("patient.stat.appointments") },
    completed: { label: T("patient.stat.completed"), sublabel: T("patient.stat.sessions") },
    notes: { label: T("patient.stat.clinical"), sublabel: T("patient.stat.notes") },
  };

  const welcomeTitle = T("patient.welcomeTitle");
  const welcomeSubtitle = T("patient.welcomeSubtitle");
  const showScreening = config?.showScreeningAlert ?? true;
  const enabledStats = (config?.statsCards || []).filter((s) => s.enabled);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">{welcomeTitle}</h1>
        <p className="text-muted-foreground mt-1">{welcomeSubtitle}</p>
      </div>

      {/* Onboarding Checklist */}
      {!isPreview && <OnboardingWizard />}

      {/* Screening CTA - only when not done */}
      {showScreening && !stats?.screeningComplete && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary/15">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground">
                  {locale === "pt-BR" ? "Complete sua Triagem Médica" : "Complete Your Medical Screening"}
                </h3>
                <p className="text-sm mt-1 text-muted-foreground">
                  {locale === "pt-BR"
                    ? "Preencha o questionário para que possamos personalizar seu atendimento."
                    : "Fill out the questionnaire so we can personalize your care."}
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <Button asChild size="sm">
                    <Link href={isPreview ? `/patient-preview/screening${previewQuery}` : "/dashboard/screening"}>
                      {locale === "pt-BR" ? "Iniciar Triagem" : "Start Screening"}
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> ~5 min
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Access - shown after screening is complete */}
      {stats?.screeningComplete && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">
            {locale === "pt-BR" ? "Acesso rápido" : "Quick access"}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {[
              { icon: MessageCircleQuestion, label: locale === "pt-BR" ? "Perguntas" : "Questions", href: "/dashboard/questions" },
              { icon: ClipboardList, label: locale === "pt-BR" ? "Meu Plano" : "My Plan", href: "/dashboard/my-plan" },
              { icon: Calendar, label: locale === "pt-BR" ? "Consultas" : "Appointments", href: "/dashboard/appointments" },
              { icon: Dumbbell, label: locale === "pt-BR" ? "Exercícios" : "Exercises", href: "/dashboard/exercises" },
              { icon: FileText, label: locale === "pt-BR" ? "Documentos" : "Documents", href: "/dashboard/documents" },
            ].map((item) => (
              <Link key={item.href} href={isPreview ? item.href.replace("/dashboard", `/patient-preview`) + previewQuery : item.href}>
                <Card className="card-hover text-center p-4">
                  <item.icon className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stats - only when patient has appointment data */}
      {enabledStats.length > 0 && (stats?.completedAppointments ?? 0) > 0 && (
        <div className={`grid gap-4 ${enabledStats.length >= 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {enabledStats.map((stat) => {
            const Icon = ICON_MAP[stat.icon] || Clock;
            const colors = COLOR_MAP[stat.color] || COLOR_MAP.primary;
            const value = stats?.[stat.field] ?? 0;
            return (
              <Card key={stat.id} className="card-hover">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{STAT_I18N[stat.id]?.label || stat.label}</p>
                      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${colors.text}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
