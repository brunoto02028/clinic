"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  FileText,
  Calendar,
  Download,
  Loader2,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocale } from "@/hooks/use-locale";

interface SOAPNote {
  id: string;
  createdAt: string;
  appointment: {
    dateTime: string;
    treatmentType: string;
  };
  therapist: {
    firstName: string;
    lastName: string;
  };
}

interface Appointment {
  id: string;
  dateTime: string;
  treatmentType: string;
  status: string;
  therapist: {
    firstName: string;
    lastName: string;
  };
}

export default function PatientRecords() {
  const { data: session } = useSession() || {};
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const [soapNotes, setSOAPNotes] = useState<SOAPNote[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const userId = (session?.user as any)?.id;

  useEffect(() => {
    setMounted(true);
    if (userId) {
      fetchData();
    }
  }, [userId]);

  const fetchData = async () => {
    try {
      const [notesRes, apptRes] = await Promise.all([
        fetch("/api/soap-notes"),
        fetch("/api/appointments?status=COMPLETED"),
      ]);

      const notesData = await notesRes.json();
      const apptData = await apptRes.json();

      setSOAPNotes(notesData?.soapNotes ?? []);
      setAppointments(apptData?.appointments ?? []);
    } catch (error) {
      console.error("Error fetching records:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (noteId: string) => {
    try {
      const response = await fetch(`/api/soap-notes/${noteId}/pdf`);
      const html = await response.text();

      // Open in new window for printing
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">{isPt ? "Meus Registros" : "My Records"}</h1>
        <p className="text-slate-600 text-sm mt-1">
          {isPt ? "Visualize seu histórico de tratamento e documentação clínica." : "View your treatment history and clinical documentation."}
        </p>
      </div>

      <Tabs defaultValue="notes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="notes" className="gap-2">
            <FileText className="h-4 w-4" />
            {isPt ? "Notas Clínicas" : "Clinical Notes"}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Calendar className="h-4 w-4" />
            {isPt ? "Histórico" : "Treatment History"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notes">
          {soapNotes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-700 mb-2">
                  {isPt ? "Nenhuma nota clínica ainda" : "No clinical notes yet"}
                </h3>
                <p className="text-slate-500">
                  {isPt ? "As notas clínicas aparecerão aqui após suas consultas serem concluídas." : "Clinical notes will appear here after your appointments are completed."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {soapNotes.map((note, index) => (
                <div>
                  <Card className="card-hover">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm sm:text-base text-slate-800">
                              {note?.appointment?.treatmentType ?? "Treatment"}
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                              {new Date(
                                note?.appointment?.dateTime ?? ""
                              ).toLocaleDateString(isPt ? "pt-BR" : "en-GB", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                            <p className="text-sm text-slate-500">
                              {isPt ? "Terapeuta" : "Therapist"}: {note?.therapist?.firstName ?? ""}{" "}
                              {note?.therapist?.lastName ?? ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link href={`/dashboard/clinical-notes/${note.id}`}>
                            <Button variant="outline" size="sm" className="gap-2">
                              {isPt ? "Ver" : "View"}
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2"
                            onClick={() => handleDownloadPDF(note.id)}
                          >
                            <Download className="h-4 w-4" />
                            PDF
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          {appointments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-700 mb-2">
                  {isPt ? "Nenhum histórico de tratamento" : "No treatment history"}
                </h3>
                <p className="text-slate-500">
                  {isPt ? "Suas consultas concluídas aparecerão aqui." : "Your completed appointments will appear here."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {appointments.map((appt, index) => (
                <div>
                  <Link href={`/dashboard/appointments/${appt.id}`}>
                    <Card className="card-hover cursor-pointer">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start sm:items-center justify-between gap-3">
                          <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-sm sm:text-base text-slate-800 truncate">
                                {appt?.treatmentType ?? ""}
                              </h3>
                              <p className="text-xs sm:text-sm text-slate-500">
                                {new Date(appt?.dateTime ?? "").toLocaleDateString(
                                  "en-GB",
                                  {
                                    weekday: "short",
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )}
                              </p>
                              <p className="text-xs sm:text-sm text-slate-500">
                                {appt?.therapist?.firstName ?? ""} {appt?.therapist?.lastName ?? ""}
                              </p>
                            </div>
                          </div>
                          <Badge variant="success" className="flex-shrink-0">{isPt ? "Concluído" : "Completed"}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
