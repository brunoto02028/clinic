"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Calendar,
  FileText,
  BookOpen,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  UserCheck,
  Stethoscope,
  Footprints,
  ArrowRight,
  Activity,
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  Heart,
  ShieldCheck,
  Building2,
  Plus,
  Settings,
  Eye,
  PenLine,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";

interface AdminStats {
  totalUsers: number;
  totalPatients: number;
  totalTherapists: number;
  totalAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
  confirmedAppointments: number;
  cancelledAppointments: number;
  todayAppointments: number;
  weekAppointments: number;
  totalSoapNotes: number;
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  totalFootScans: number;
  recentAppointments: Array<{
    id: string;
    patient: { firstName: string; lastName: string; email?: string };
    therapist?: { firstName: string; lastName: string };
    dateTime: string;
    status: string;
    treatmentType: string;
  }>;
  upcomingAppointments: Array<{
    id: string;
    patient: { firstName: string; lastName: string; email?: string };
    therapist?: { firstName: string; lastName: string };
    dateTime: string;
    status: string;
    treatmentType: string;
  }>;
  recentPatients: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    createdAt: string;
  }>;
  clinic: {
    id: string;
    name: string;
    slug: string;
    email: string;
    phone: string;
  } | null;
}

function StatCard({ title, value, subtitle, icon: Icon, color, bgColor, href }: {
  title: string; value: number | string; subtitle: string; icon: any; color: string; bgColor: string; href?: string;
}) {
  const content = (
    <Card className="card-hover group relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
      {href && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </Card>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { class: string; icon: any }> = {
    COMPLETED: { class: "bg-green-100 text-green-700", icon: CheckCircle },
    CONFIRMED: { class: "bg-blue-100 text-blue-700", icon: CalendarCheck },
    PENDING: { class: "bg-yellow-100 text-yellow-700", icon: AlertCircle },
    CANCELLED: { class: "bg-red-100 text-red-700", icon: AlertCircle },
  };
  const c = config[status] || config.PENDING;
  const StatusIcon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${c.class}`}>
      <StatusIcon className="h-3 w-3" />
      {status}
    </span>
  );
}

export default function AdminDashboard() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 bg-muted/50 rounded-xl animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2"><div className="h-4 bg-muted rounded w-24" /></CardHeader>
              <CardContent><div className="h-8 bg-muted rounded w-16" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const completionRate = stats?.totalAppointments
    ? Math.round((stats.completedAppointments / stats.totalAppointments) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* ═══ WELCOME BANNER ═══ */}
      <div className="relative rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {stats?.clinic?.name || T("admin.dashboard")}
            </h1>
            <p className="text-muted-foreground mt-1">
              Admin &middot; {T("admin.fullOverview")}
            </p>
            {stats?.clinic && (
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                <Badge variant="outline" className="gap-1 text-primary border-primary/30">
                  <Building2 className="h-3 w-3" /> ENTERPRISE
                </Badge>
                <span>{stats.clinic.email}</span>
                {stats.clinic.phone && <span>&middot; {stats.clinic.phone}</span>}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Link href="/admin/appointments">
              <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> {T("admin.newAppointment")}</Button>
            </Link>
            <Link href="/admin/patients">
              <Button size="sm" variant="outline" className="gap-1"><UserCheck className="h-4 w-4" /> {T("admin.patients")}</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ═══ TODAY AT A GLANCE ═══ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{T("admin.todayGlance")}</h2>
          <Badge variant="secondary" className="ml-2 text-xs">
            {new Date().toLocaleDateString(locale === "pt-BR" ? "pt-BR" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </Badge>
        </div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <StatCard
            title={T("admin.todaySessions")}
            value={stats?.todayAppointments || 0}
            subtitle={T("admin.appointmentsToday")}
            icon={CalendarCheck}
            color="text-primary"
            bgColor="bg-primary/10"
            href="/admin/appointments"
          />
          <StatCard
            title={T("admin.thisWeek")}
            value={stats?.weekAppointments || 0}
            subtitle={T("admin.sessionsScheduled")}
            icon={CalendarClock}
            color="text-indigo-600"
            bgColor="bg-indigo-100"
            href="/admin/appointments"
          />
          <StatCard
            title={T("admin.pendingActions")}
            value={stats?.pendingAppointments || 0}
            subtitle={T("admin.awaitingConfirmation")}
            icon={AlertCircle}
            color="text-amber-600"
            bgColor="bg-amber-100"
            href="/admin/appointments"
          />
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{T("admin.completionRate")}</CardTitle>
              <div className="p-2 rounded-lg bg-green-100">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completionRate}%</div>
              <Progress value={completionRate} className="h-1.5 mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.completedAppointments || 0} {T("admin.of")} {stats?.totalAppointments || 0}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══ MODULE: CLINIC ═══ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Stethoscope className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{T("admin.clinic")}</h2>
        </div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <StatCard
            title={T("admin.totalAppointments")}
            value={stats?.totalAppointments || 0}
            subtitle={`${stats?.confirmedAppointments || 0} ${T("admin.confirmed")}`}
            icon={Calendar}
            color="text-blue-600"
            bgColor="bg-blue-100"
            href="/admin/appointments"
          />
          <StatCard
            title={T("admin.clinicalNotes")}
            value={stats?.totalSoapNotes || 0}
            subtitle={T("admin.assessmentsRecorded")}
            icon={ClipboardList}
            color="text-purple-600"
            bgColor="bg-purple-100"
            href="/admin/clinical-notes"
          />
          <StatCard
            title={T("admin.footScans")}
            value={stats?.totalFootScans || 0}
            subtitle={T("admin.biomechanicalAnalyses")}
            icon={Footprints}
            color="text-teal-600"
            bgColor="bg-teal-100"
            href="/admin/scans"
          />
          <StatCard
            title={T("admin.completed")}
            value={stats?.completedAppointments || 0}
            subtitle={`${stats?.cancelledAppointments || 0} ${T("admin.cancelled")}`}
            icon={CheckCircle}
            color="text-green-600"
            bgColor="bg-green-100"
          />
        </div>

        {/* Upcoming Appointments */}
        <div className="grid gap-6 lg:grid-cols-2 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  {T("admin.upcomingAppointments")}
                </CardTitle>
                <Link href="/admin/appointments">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs">
                    {T("common.viewAll")} <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {stats?.upcomingAppointments && stats.upcomingAppointments.length > 0 ? (
                <div className="space-y-3">
                  {stats.upcomingAppointments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{a.patient.firstName} {a.patient.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">{a.treatmentType}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-xs text-muted-foreground">
                          {new Date(a.dateTime).toLocaleDateString(locale === "pt-BR" ? "pt-BR" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <StatusBadge status={a.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-6">{T("admin.noUpcoming")}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  {T("admin.recentActivity")}
                </CardTitle>
                <Link href="/admin/appointments">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs">
                    {T("common.viewAll")} <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {stats?.recentAppointments && stats.recentAppointments.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentAppointments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{a.patient.firstName} {a.patient.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {a.treatmentType}
                          {a.therapist && <span> &middot; {a.therapist.firstName}</span>}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-xs text-muted-foreground">
                          {new Date(a.dateTime).toLocaleDateString(locale === "pt-BR" ? "pt-BR" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <StatusBadge status={a.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-6">{T("admin.noRecent")}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══ MODULE: PATIENTS ═══ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Heart className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{T("admin.patients")}</h2>
        </div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
          <StatCard
            title={T("admin.totalPatients")}
            value={stats?.totalPatients || 0}
            subtitle={T("admin.registeredInSystem")}
            icon={UserCheck}
            color="text-rose-600"
            bgColor="bg-rose-100"
            href="/admin/patients"
          />
          <StatCard
            title={T("admin.therapists")}
            value={stats?.totalTherapists || 0}
            subtitle={T("admin.activeClinicians")}
            icon={Stethoscope}
            color="text-cyan-600"
            bgColor="bg-cyan-100"
            href="/admin/users"
          />
          <StatCard
            title={T("admin.totalUsers")}
            value={stats?.totalUsers || 0}
            subtitle={T("admin.allAccounts")}
            icon={Users}
            color="text-slate-600"
            bgColor="bg-slate-100"
            href="/admin/users"
          />
        </div>

        {/* Recent Patients */}
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                {T("admin.recentPatients")}
              </CardTitle>
              <Link href="/admin/patients">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  {T("admin.allPatients")} <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats?.recentPatients && stats.recentPatients.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {stats.recentPatients.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-primary">
                        {p.firstName?.[0]}{p.lastName?.[0]}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{p.firstName} {p.lastName}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-6">{T("admin.noPatients")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ... rest of the code remains the same ... */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{T("admin.administration")}</h2>
        </div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
          <StatCard
            title={T("admin.articles")}
            value={stats?.totalArticles || 0}
            subtitle={`${stats?.publishedArticles || 0} ${T("admin.published")}, ${stats?.draftArticles || 0} ${T("admin.drafts")}`}
            icon={BookOpen}
            color="text-orange-600"
            bgColor="bg-orange-100"
            href="/admin/articles"
          />
          <StatCard
            title={T("admin.clinicalNotes")}
            value={stats?.totalSoapNotes || 0}
            subtitle={T("admin.soapAssessments")}
            icon={FileText}
            color="text-violet-600"
            bgColor="bg-violet-100"
            href="/admin/clinical-notes"
          />
          <StatCard
            title={T("admin.footScans")}
            value={stats?.totalFootScans || 0}
            subtitle={T("admin.scansAnalyses")}
            icon={Footprints}
            color="text-teal-600"
            bgColor="bg-teal-100"
            href="/admin/scans"
          />
        </div>

        {/* Quick Actions */}
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              {T("admin.quickActions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Link href="/admin/patients" className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors group">
                <div className="p-2 bg-rose-100 rounded-lg"><UserCheck className="h-4 w-4 text-rose-600" /></div>
                <div>
                  <p className="font-medium text-sm">{T("admin.managePatients")}</p>
                  <p className="text-[11px] text-muted-foreground">{T("admin.registerEditView")}</p>
                </div>
              </Link>
              <Link href="/admin/clinical-notes" className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors group">
                <div className="p-2 bg-purple-100 rounded-lg"><ClipboardList className="h-4 w-4 text-purple-600" /></div>
                <div>
                  <p className="font-medium text-sm">{T("admin.clinicalNotes")}</p>
                  <p className="text-[11px] text-muted-foreground">{T("admin.soapAndAssessments")}</p>
                </div>
              </Link>
              <Link href="/admin/scans" className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors group">
                <div className="p-2 bg-teal-100 rounded-lg"><Footprints className="h-4 w-4 text-teal-600" /></div>
                <div>
                  <p className="font-medium text-sm">{T("admin.footScans")}</p>
                  <p className="text-[11px] text-muted-foreground">{T("admin.qrScanAnalysis")}</p>
                </div>
              </Link>
              <Link href="/admin/articles/new" className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors group">
                <div className="p-2 bg-orange-100 rounded-lg"><PenLine className="h-4 w-4 text-orange-600" /></div>
                <div>
                  <p className="font-medium text-sm">{T("admin.newArticle")}</p>
                  <p className="text-[11px] text-muted-foreground">{T("admin.writePublish")}</p>
                </div>
              </Link>
              <Link href="/admin/settings" className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors group">
                <div className="p-2 bg-slate-100 rounded-lg"><Settings className="h-4 w-4 text-slate-600" /></div>
                <div>
                  <p className="font-medium text-sm">{T("admin.siteSettings")}</p>
                  <p className="text-[11px] text-muted-foreground">{T("admin.logoTextsSEO")}</p>
                </div>
              </Link>
              <Link href="/admin/users" className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors group">
                <div className="p-2 bg-blue-100 rounded-lg"><Users className="h-4 w-4 text-blue-600" /></div>
                <div>
                  <p className="font-medium text-sm">{T("admin.usersStaff")}</p>
                  <p className="text-[11px] text-muted-foreground">{T("admin.manageTeam")}</p>
                </div>
              </Link>
              <Link href="/admin/appointments" className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors group">
                <div className="p-2 bg-green-100 rounded-lg"><Calendar className="h-4 w-4 text-green-600" /></div>
                <div>
                  <p className="font-medium text-sm">{T("nav.appointments")}</p>
                  <p className="text-[11px] text-muted-foreground">{T("admin.scheduleManage")}</p>
                </div>
              </Link>
              <Link href="/" className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors group">
                <div className="p-2 bg-primary/10 rounded-lg"><Eye className="h-4 w-4 text-primary" /></div>
                <div>
                  <p className="font-medium text-sm">{T("admin.viewWebsite")}</p>
                  <p className="text-[11px] text-muted-foreground">{T("admin.publicSite")}</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
