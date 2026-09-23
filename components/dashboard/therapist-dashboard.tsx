"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Users,
  Clock,
  ClipboardList,
  ArrowRight,
  Loader2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DashboardStats {
  todayAppointments: number;
  weekAppointments: number;
  totalPatients: number;
  pendingAppointments: number;
  recentPatients: Array<{
    id: string;
    firstName: string;
    lastName: string;
    createdAt: string;
  }>;
  upcomingAppointments: Array<{
    id: string;
    dateTime: string;
    treatmentType: string;
    patient: {
      firstName: string;
      lastName: string;
    };
  }>;
}

export default function TherapistDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/dashboard/stats");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Therapist Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Manage appointments, patients, and clinical documentation.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <Card className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Today</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {stats?.todayAppointments ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Appointments</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">This Week</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {stats?.weekAppointments ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Scheduled</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {stats?.totalPatients ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Patients</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-violet-500/15 flex items-center justify-center">
                  <Users className="h-6 w-6 text-violet-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Pending</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {stats?.pendingAppointments ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">To Confirm</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center">
                  <ClipboardList className="h-6 w-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Appointments */}
        <div>
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-primary" />
                Upcoming Appointments
              </CardTitle>
              <Link href="/dashboard/appointments">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {(stats?.upcomingAppointments?.length ?? 0) === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  No upcoming appointments
                </p>
              ) : (
                <div className="space-y-3">
                  {(stats?.upcomingAppointments ?? []).map((appointment) => (
                    <Link
                      key={appointment.id}
                      href={`/dashboard/appointments/${appointment.id}`}
                    >
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {appointment?.patient?.firstName ?? ""} {appointment?.patient?.lastName ?? ""}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {appointment?.treatmentType ?? ""}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">
                            {new Date(appointment?.dateTime ?? "").toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(appointment?.dateTime ?? "").toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Patients */}
        <div>
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                Recent Patients
              </CardTitle>
              <Link href="/dashboard/patients">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {(stats?.recentPatients?.length ?? 0) === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  No patients registered yet
                </p>
              ) : (
                <div className="space-y-3">
                  {(stats?.recentPatients ?? []).map((patient) => (
                    <Link
                      key={patient.id}
                      href={`/dashboard/patients/${patient.id}`}
                    >
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
                            <User className="h-5 w-5 text-emerald-400" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {patient?.firstName ?? ""} {patient?.lastName ?? ""}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Registered{" "}
                              {new Date(patient?.createdAt ?? "").toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
