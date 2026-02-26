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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import MembershipOfferBanner from "@/components/dashboard/membership-offer-banner";
import BPRJourneyBar from "@/components/dashboard/bpr-journey-bar";
import DailyMission from "@/components/dashboard/daily-mission";
import RecoveryRing from "@/components/dashboard/recovery-ring";
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

interface EvolutionData {
  change: number;
  trend: "up" | "stagnant" | "down";
}

interface RingData {
  exercise: number;
  consistency: number;
  wellbeing: number;
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
  const [mounted, setMounted] = useState(false);
  const [evolution, setEvolution] = useState<EvolutionData | null>(null);
  const [ring, setRing] = useState<RingData>({ exercise: 0, consistency: 0, wellbeing: 0 });

  useEffect(() => {
    setMounted(true);
    Promise.all([
      fetch("/api/dashboard/stats").then((r) => r.json()).catch(() => null),
      fetch("/api/patient-portal-config").then((r) => r.json()).catch(() => null),
    ]).then(([statsData, configData]) => {
      setStats(statsData);
      setConfig(configData);
      setLoading(false);
    });

    // Fetch journey data for evolution card and recovery ring
    fetch("/api/patient/journey").then((r) => r.json()).then((d) => {
      if (d.ring) setRing(d.ring);
    }).catch(() => {});

    // Fetch evolution data from body assessment comparison
    fetch("/api/dashboard/evolution").then((r) => r.json()).then((d) => {
      if (d.change !== undefined) setEvolution(d);
    }).catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // i18n mappings for stats and quick actions by ID
  const STAT_I18N: Record<string, { label: string; sublabel: string }> = {
    upcoming: { label: T("patient.stat.upcoming"), sublabel: T("patient.stat.appointments") },
    completed: { label: T("patient.stat.completed"), sublabel: T("patient.stat.sessions") },
    notes: { label: T("patient.stat.clinical"), sublabel: T("patient.stat.notes") },
  };
  const ACTION_I18N: Record<string, { title: string; description: string; buttonText: string }> = {
    book: { title: T("patient.action.bookTitle"), description: T("patient.action.bookDesc"), buttonText: T("patient.action.bookBtn") },
    records: { title: T("patient.action.recordsTitle"), description: T("patient.action.recordsDesc"), buttonText: T("patient.action.recordsBtn") },
    treatment: { title: T("patient.action.treatmentTitle"), description: T("patient.action.treatmentDesc"), buttonText: T("patient.action.treatmentBtn") },
    "body-assessment": { title: T("patient.action.assessmentTitle"), description: T("patient.action.assessmentDesc"), buttonText: T("patient.action.assessmentBtn") },
  };

  const welcomeTitle = T("patient.welcomeTitle");
  const welcomeSubtitle = T("patient.welcomeSubtitle");
  const showScreening = config?.showScreeningAlert ?? true;
  const screeningTitle = T("patient.screeningAlertTitle");
  const screeningText = T("patient.screeningAlertText");
  const enabledStats = (config?.statsCards || []).filter((s) => s.enabled);
  const enabledActions = (config?.quickActions || []).filter((a) => a.enabled);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">{welcomeTitle}</h1>
        <p className="text-muted-foreground mt-1">{welcomeSubtitle}</p>
      </div>

      {/* Screening Alert — shown when screening not yet completed and patient has upcoming appointments */}
      {showScreening && !stats?.screeningComplete && (
        <div>
          <Card className={`${(stats?.upcomingAppointments ?? 0) > 0 ? "border-red-500/30 bg-red-500/10" : "border-amber-500/20 bg-amber-500/10"}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${(stats?.upcomingAppointments ?? 0) > 0 ? "bg-red-500/15" : "bg-amber-500/15"}`}>
                  <AlertCircle className={`h-5 w-5 ${(stats?.upcomingAppointments ?? 0) > 0 ? "text-red-500" : "text-amber-500"}`} />
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold ${(stats?.upcomingAppointments ?? 0) > 0 ? "text-red-300" : "text-amber-300"}`}>
                    {(stats?.upcomingAppointments ?? 0) > 0
                      ? (locale === "pt-BR" ? "Screening Obrigatório — Consulta Agendada" : "Screening Required — Appointment Booked")
                      : screeningTitle}
                  </h3>
                  <p className={`text-sm mt-1 ${(stats?.upcomingAppointments ?? 0) > 0 ? "text-red-400/80" : "text-amber-400/80"}`}>
                    {(stats?.upcomingAppointments ?? 0) > 0
                      ? (locale === "pt-BR"
                        ? "Você tem uma consulta agendada. O screening médico deve ser completado pelo menos 24 horas antes da consulta. Complete agora para evitar reagendamento."
                        : "You have an upcoming appointment. Your medical screening must be completed at least 24 hours before your appointment. Complete it now to avoid rescheduling.")
                      : screeningText}
                  </p>
                  <Button asChild size="sm" className="mt-3">
                    <Link href={isPreview ? `/patient-preview/screening${previewQuery}` : "/dashboard/screening"}>
                      {T("screening.submit")}
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Onboarding Wizard (new patients) */}
      {!isPreview && <OnboardingWizard />}

      {/* BPR Journey Bar */}
      {!isPreview && <BPRJourneyBar />}

      {/* Membership Offer */}
      {!isPreview && <MembershipOfferBanner />}

      {/* Stats Grid + Recovery Ring */}
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
      <div>
      <div className={`grid gap-6 ${enabledStats.length >= 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : enabledStats.length === 2 ? 'sm:grid-cols-2' : ''}`}>
        {enabledStats.map((stat, index) => {
          const Icon = ICON_MAP[stat.icon] || Clock;
          const colors = COLOR_MAP[stat.color] || COLOR_MAP.primary;
          const value = stats?.[stat.field] ?? 0;
          return (
            <div>
              <Card className="card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">{STAT_I18N[stat.id]?.label || stat.label}</p>
                      <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
                      <p className="text-sm text-muted-foreground mt-1">{STAT_I18N[stat.id]?.sublabel || stat.sublabel}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center`}>
                      <Icon className={`h-6 w-6 ${colors.text}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      </div>
      {/* Recovery Ring */}
      {!isPreview && (
        <div className="flex justify-center lg:justify-start">
          <div className="bg-card rounded-xl border border-white/10 p-4 flex flex-col items-center justify-center">
            <p className="text-xs font-semibold text-muted-foreground mb-2">{T("ring.title")}</p>
            <RecoveryRing exercise={ring.exercise} consistency={ring.consistency} wellbeing={ring.wellbeing} />
          </div>
        </div>
      )}
      </div>

      {/* Daily Mission */}
      {!isPreview && <DailyMission />}

      {/* Quick Actions */}
      <div className={`grid gap-6 ${enabledActions.length >= 2 ? 'sm:grid-cols-2' : ''}`}>
        {enabledActions.map((action, index) => {
          const Icon = ICON_MAP[action.icon] || Calendar;
          return (
            <div>
              <Card className="card-hover h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className="h-5 w-5 text-primary" />
                    {ACTION_I18N[action.id]?.title || action.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm mb-4">{ACTION_I18N[action.id]?.description || action.description}</p>
                  <Button asChild className="w-full gap-2" variant="default">
                    <Link href={isPreview ? `/patient-preview${action.buttonLink.replace("/dashboard", "")}${previewQuery}` : action.buttonLink}>
                      {ACTION_I18N[action.id]?.buttonText || action.buttonText}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
