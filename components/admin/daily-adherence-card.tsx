"use client";

// "Adherence today" — same numbers the 21h e-mail/reminder cron sends
// (activity 49), available on demand instead of waiting for end of day.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Loader2, Mail, Send } from "lucide-react";

type PatientSummary = { patientId: string; name: string; missingItems: { title: string }[] };
type Adherence = { completed: PatientSummary[]; missing: PatientSummary[] };

export default function DailyAdherenceCard() {
  const [data, setData] = useState<Adherence | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/admin/adherence/today")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const sendReminder = async (patientId: string) => {
    setSending(patientId);
    try {
      const res = await fetch("/api/admin/adherence/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      if (res.ok) setSent((prev) => new Set(prev).add(patientId));
    } finally {
      setSending(null);
    }
  };

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
              <li key={p.patientId} className="text-sm flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1 basis-64">
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
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs shrink-0"
                  disabled={sending === p.patientId || sent.has(p.patientId)}
                  onClick={() => sendReminder(p.patientId)}
                >
                  {sending === p.patientId ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : sent.has(p.patientId) ? (
                    <><CheckCircle2 className="h-3 w-3 mr-1" /> Sent</>
                  ) : (
                    <><Send className="h-3 w-3 mr-1" /> Send now</>
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
