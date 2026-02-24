"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Users,
  Calendar,
  MapPin,
  TrendingUp,
  Activity,
  UserCheck,
  Stethoscope,
  Footprints,
  FileText,
  Plus,
  ArrowRight,
  Loader2,
  Globe,
} from "lucide-react";

interface ClinicStat {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postcode: string | null;
  country: string;
  isActive: boolean;
  createdAt: string;
  subscription: { plan: string; status: string } | null;
  stats: {
    totalUsers: number;
    patients: number;
    therapists: number;
    totalAppointments: number;
    pendingAppointments: number;
    completedAppointments: number;
    clinicalNotes: number;
    footScans: number;
  };
}

interface GlobalData {
  clinics: ClinicStat[];
  globalStats: {
    totalClinics: number;
    activeClinics: number;
    totalPatients: number;
    totalAppointments: number;
    totalTherapists: number;
  };
}

export default function GlobalDashboardPage() {
  const [data, setData] = useState<GlobalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/dashboard/global");
      if (res.status === 401 || res.status === 403) {
        setAccessDenied(true);
        return;
      }
      if (res.ok) {
        setData(await res.json());
      } else {
        toast({ title: "Error", description: "Failed to load dashboard", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const switchToClinic = async (clinicId: string) => {
    try {
      const res = await fetch("/api/admin/switch-clinic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId }),
      });
      if (res.ok) {
        toast({ title: "Switched", description: "Clinic context changed" });
        window.location.href = "/admin";
      }
    } catch {
      toast({ title: "Error", description: "Failed to switch", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Globe className="h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold">Access Restricted</h2>
        <p className="text-muted-foreground text-sm">This page is only available to Super Admins.</p>
        <a href="/admin" className="text-sm text-primary underline">Go back to Dashboard</a>
      </div>
    );
  }

  if (!data) return null;

  const { clinics, globalStats } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" /> Global View
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Overview of all registered clinics</p>
        </div>
        <Button className="gap-2" onClick={() => (window.location.href = "/admin/clinics")}>
          <Plus className="h-4 w-4" /> Register Clinic
        </Button>
      </div>

      {/* Global Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Building2 className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{globalStats.totalClinics}</p>
                <p className="text-xs text-muted-foreground">Total Clinics</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100"><Activity className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold">{globalStats.activeClinics}</p>
                <p className="text-xs text-muted-foreground">Active Clinics</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100"><Users className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{globalStats.totalPatients}</p>
                <p className="text-xs text-muted-foreground">Total Patients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100"><Calendar className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-2xl font-bold">{globalStats.totalAppointments}</p>
                <p className="text-xs text-muted-foreground">Total Appointments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100"><Stethoscope className="h-5 w-5 text-orange-600" /></div>
              <div>
                <p className="text-2xl font-bold">{globalStats.totalTherapists}</p>
                <p className="text-xs text-muted-foreground">Total Staff</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clinic Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Registered Clinics</h2>
        {clinics.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">No clinics registered</h3>
              <p className="text-sm text-muted-foreground mb-4">Register your first clinic to get started</p>
              <Button className="gap-2" onClick={() => (window.location.href = "/admin/clinics")}><Plus className="h-4 w-4" /> Register Clinic</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            {clinics.map((clinic) => (
              <Card key={clinic.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        {clinic.name}
                      </CardTitle>
                      {clinic.address && (
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {clinic.address}{clinic.city ? `, ${clinic.city}` : ""}{clinic.postcode ? ` ${clinic.postcode}` : ""}
                        </p>
                      )}
                      {clinic.email && (
                        <p className="text-xs text-muted-foreground mt-0.5">{clinic.email}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={clinic.isActive ? "default" : "secondary"}>
                        {clinic.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {clinic.subscription && (
                        <Badge variant="outline">{clinic.subscription.plan}</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
                    <div className="text-center p-2 bg-muted/50 rounded-lg">
                      <Users className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                      <p className="text-lg font-bold">{clinic.stats.patients}</p>
                      <p className="text-[10px] text-muted-foreground">Patients</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded-lg">
                      <Stethoscope className="h-4 w-4 mx-auto mb-1 text-orange-600" />
                      <p className="text-lg font-bold">{clinic.stats.therapists}</p>
                      <p className="text-[10px] text-muted-foreground">Staff</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded-lg">
                      <Calendar className="h-4 w-4 mx-auto mb-1 text-purple-600" />
                      <p className="text-lg font-bold">{clinic.stats.totalAppointments}</p>
                      <p className="text-[10px] text-muted-foreground">Appts</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded-lg">
                      <TrendingUp className="h-4 w-4 mx-auto mb-1 text-green-600" />
                      <p className="text-lg font-bold">{clinic.stats.pendingAppointments}</p>
                      <p className="text-[10px] text-muted-foreground">Pending</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded-lg">
                      <FileText className="h-4 w-4 mx-auto mb-1 text-teal-600" />
                      <p className="text-lg font-bold">{clinic.stats.clinicalNotes}</p>
                      <p className="text-[10px] text-muted-foreground">Notes</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded-lg">
                      <Footprints className="h-4 w-4 mx-auto mb-1 text-rose-600" />
                      <p className="text-lg font-bold">{clinic.stats.footScans}</p>
                      <p className="text-[10px] text-muted-foreground">Scans</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={() => switchToClinic(clinic.id)}
                    >
                      <ArrowRight className="h-3.5 w-3.5" /> Enter Clinic View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => (window.location.href = `/admin/clinics`)}
                    >
                      Manage
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
