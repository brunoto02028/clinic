"use client";

// "Adherence today" — same numbers the 21h e-mail/reminder cron sends
// (activity 49), available on demand instead of waiting for end of day.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Loader2, Mail } from "lucide-react";

type PatientSummary = { patientId: string; name: string; missingItems: { title: string }[] };
type Adherence = { completed: PatientSummary[]; missing: PatientSummary[] };

export default function DailyAdherenceCard() {
  const [data, setData] = useState<Adherence | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/adherence/today")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent>
      </Card>
    );
  }

  if (!data || (data.completed.length === 0 && data.missing.length === 0)) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Today&apos;s adherence</CardTitle>
        <a
          href="/api/admin/adherence/preview-email"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          <Mail className="h-3.5 w-3.5" /> Preview e-mail
        </a>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1 text-ba1-ok"><CheckCircle2 className="h-4 w-4" /> {data.completed.length} completed</span>
          <span className="flex items-center gap-1 text-ba1-bad"><AlertCircle className="h-4 w-4" /> {data.missing.length} missing</span>
        </div>
        {data.missing.length > 0 && (
          <ul className="space-y-1">
            {data.missing.map((p) => (
              <li key={p.patientId} className="text-sm">
                <Link href={`/admin/patients/${p.patientId}`} className="text-primary hover:underline">{p.name}</Link>
                <span className="text-muted-foreground"> — {p.missingItems.map((i) => i.title).join(", ")}</span>
                <a
                  href={`/api/admin/adherence/preview-patient-email?patientId=${p.patientId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-xs text-muted-foreground hover:text-primary underline"
                >
                  their e-mail
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
