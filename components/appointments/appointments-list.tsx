"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  User,
  Plus,
  Loader2,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/hooks/use-locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Appointment {
  id: string;
  dateTime: string;
  duration: number;
  treatmentType: string;
  status: string;
  price: number;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  therapist: {
    id: string;
    firstName: string;
    lastName: string;
  };
  payment: {
    status: string;
  } | null;
  soapNote: {
    id: string;
  } | null;
}

export default function AppointmentsList() {
  const { data: session } = useSession() || {};
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [mounted, setMounted] = useState(false);

  const isTherapist =
    (session?.user as any)?.role === "ADMIN" ||
    (session?.user as any)?.role === "THERAPIST";

  useEffect(() => {
    setMounted(true);
    fetchAppointments();
  }, [statusFilter]);

  const fetchAppointments = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      const response = await fetch(`/api/appointments?${params.toString()}`);
      const data = await response.json();
      setAppointments(data?.appointments ?? []);
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge variant="success">{isPt ? "Confirmado" : "Confirmed"}</Badge>;
      case "PENDING":
        return <Badge variant="warning">{isPt ? "Pendente" : "Pending"}</Badge>;
      case "COMPLETED":
        return <Badge variant="info">{isPt ? "Concluído" : "Completed"}</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">{isPt ? "Cancelado" : "Cancelled"}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{isPt ? "Agendamentos" : "Appointments"}</h1>
          <p className="text-muted-foreground mt-1">
            {isTherapist
              ? (isPt ? "Gerencie e visualize todos os agendamentos" : "Manage and view all scheduled appointments")
              : (isPt ? "Visualize e gerencie seus agendamentos" : "View and manage your booked appointments")}
          </p>
        </div>
        <Link href="/dashboard/appointments/book" className="w-full sm:w-auto">
          <Button className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            {isPt ? "Agendar Consulta" : "Book Appointment"}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={isPt ? "Filtrar por status" : "Filter by status"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isPt ? "Todos" : "All Appointments"}</SelectItem>
              <SelectItem value="PENDING">{isPt ? "Pendente" : "Pending"}</SelectItem>
              <SelectItem value="CONFIRMED">{isPt ? "Confirmado" : "Confirmed"}</SelectItem>
              <SelectItem value="COMPLETED">{isPt ? "Concluído" : "Completed"}</SelectItem>
              <SelectItem value="CANCELLED">{isPt ? "Cancelado" : "Cancelled"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : appointments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {isPt ? "Nenhum agendamento encontrado" : "No appointments found"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {statusFilter !== "all"
                ? (isPt ? "Tente alterar o filtro para ver mais agendamentos" : "Try changing the filter to see more appointments")
                : (isPt ? "Agende sua primeira consulta para começar" : "Book your first appointment to get started")}
            </p>
            <Link href="/dashboard/appointments/book">
              <Button>{isPt ? "Agendar Consulta" : "Book Appointment"}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment, index) => (
            <div>
              <Link href={`/dashboard/appointments/${appointment.id}`}>
                <Card className="card-hover cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Calendar className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground">
                              {appointment?.treatmentType ?? "Appointment"}
                            </h3>
                            {getStatusBadge(appointment?.status ?? "")}
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>
                                {new Date(appointment?.dateTime ?? "").toLocaleDateString(
                                  isPt ? "pt-BR" : "en-GB",
                                  {
                                    weekday: "short",
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )}{" "}
                                {isPt ? "às" : "at"}{" "}
                                {new Date(appointment?.dateTime ?? "").toLocaleTimeString(
                                  isPt ? "pt-BR" : "en-GB",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                            </div>
                            {isTherapist && (
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                <span>
                                  {appointment?.patient?.firstName ?? ""}{" "}
                                  {appointment?.patient?.lastName ?? ""}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 mt-2 md:mt-0 ml-0">
                        <div className="text-right">
                          <p className="font-semibold text-sm sm:text-base text-foreground">
                            £{(appointment?.price ?? 0).toFixed(2)}
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {appointment?.payment?.status === "SUCCEEDED"
                              ? (isPt ? "Pago" : "Paid")
                              : (isPt ? "Pagamento Pendente" : "Payment Pending")}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
