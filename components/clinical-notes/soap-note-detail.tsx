"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ClipboardList,
  Calendar,
  User,
  ArrowLeft,
  Loader2,
  Download,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SOAPNoteDetailProps {
  noteId: string;
}

interface SOAPNote {
  id: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  painLevel: number | null;
  rangeOfMotion: string | null;
  functionalTests: string | null;
  createdAt: string;
  appointment: {
    dateTime: string;
    treatmentType: string;
    duration: number;
  };
  patient: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  therapist: {
    firstName: string;
    lastName: string;
  };
}

export default function SOAPNoteDetail({ noteId }: SOAPNoteDetailProps) {
  const { data: session } = useSession() || {};
  const [note, setNote] = useState<SOAPNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const isTherapist =
    (session?.user as any)?.role === "ADMIN" ||
    (session?.user as any)?.role === "THERAPIST";

  useEffect(() => {
    setMounted(true);
    fetchNote();
  }, [noteId]);

  const fetchNote = async () => {
    try {
      const response = await fetch(`/api/soap-notes/${noteId}`);
      const data = await response.json();
      setNote(data?.soapNote ?? null);
    } catch (error) {
      console.error("Error fetching note:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/soap-notes/${noteId}/pdf`);
      const html = await response.text();
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
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

  if (!note) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700">Clinical note not found</h3>
          <Link href={isTherapist ? "/dashboard/clinical-notes" : "/dashboard/records"}>
            <Button className="mt-4">Back</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={isTherapist ? "/dashboard/clinical-notes" : "/dashboard/records"}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Clinical SOAP Note
            </h1>
            <p className="text-slate-600 mt-1">
              {note?.appointment?.treatmentType ?? ""} -{" "}
              {new Date(note?.appointment?.dateTime ?? "").toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleDownloadPDF}>
          <Download className="h-4 w-4" />
          Export PDF
        </Button>
      </div>

      {/* Patient Info */}
      <div>
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    {note?.patient?.firstName ?? ""} {note?.patient?.lastName ?? ""}
                  </p>
                  <p className="text-sm text-slate-500">{note?.patient?.email ?? ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(note?.appointment?.dateTime ?? "").toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{note?.appointment?.duration ?? 60} mins</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SOAP Sections */}
      <div className="space-y-6">
        {/* Subjective */}
        <div>
          <Card>
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Badge className="bg-primary text-white">S</Badge>
                Subjective
              </CardTitle>
            </CardHeader>
            <CardContent className="py-4">
              <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                {note?.subjective ?? "Not recorded"}
              </p>
              {note?.painLevel !== null && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg inline-block">
                  <span className="text-sm text-slate-500">Pain Level: </span>
                  <span className="font-semibold text-slate-800">
                    {note.painLevel}/10
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Objective */}
        <div>
          <Card>
            <CardHeader className="bg-emerald-50 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Badge className="bg-emerald-600 text-white">O</Badge>
                Objective
              </CardTitle>
            </CardHeader>
            <CardContent className="py-4">
              <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                {note?.objective ?? "Not recorded"}
              </p>
              {(note?.rangeOfMotion || note?.functionalTests) && (
                <div className="mt-4 grid sm:grid-cols-2 gap-4">
                  {note?.rangeOfMotion && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-500">Range of Motion</p>
                      <p className="font-medium text-slate-800">
                        {note.rangeOfMotion}
                      </p>
                    </div>
                  )}
                  {note?.functionalTests && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-500">Functional Tests</p>
                      <p className="font-medium text-slate-800">
                        {note.functionalTests}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Assessment */}
        <div>
          <Card>
            <CardHeader className="bg-violet-50 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Badge className="bg-violet-600 text-white">A</Badge>
                Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="py-4">
              <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                {note?.assessment ?? "Not recorded"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Plan */}
        <div>
          <Card>
            <CardHeader className="bg-amber-50 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Badge className="bg-amber-600 text-white">P</Badge>
                Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="py-4">
              <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                {note?.plan ?? "Not recorded"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-slate-500 py-4">
        <p>
          Documented by {note?.therapist?.firstName ?? ""} {note?.therapist?.lastName ?? ""} on{" "}
          {new Date(note?.createdAt ?? "").toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>
    </div>
  );
}
