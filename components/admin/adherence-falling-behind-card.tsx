"use client";

// "Patients falling behind" (activity 071) — staff-only visibility for
// patients with an active protocol who've gone several days with no
// exercise log at all. Unlike DailyAdherenceCard, this never sends
// anything to the patient — no reminder button here, on purpose (see
// specs/071-alerta-adesao-staff/plan.md).

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Loader2, MessageSquare } from "lucide-react";

type FallingBehindPatient = { patientId: string; name: string; daysWithoutActivity: number; hasNote: boolean };

export default function AdherenceFallingBehindCard() {
  const [patients, setPatients] = useState<FallingBehindPatient[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/adherence/falling-behind")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPatients(d?.patients ?? null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent>
      </Card>
    );
  }

  if (patients === null) return null; // endpoint not available for this account (no clinic resolved) — same fail-closed behaviour as the rest of the admin

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-ba1-bad" />
          Patients falling behind
        </CardTitle>
      </CardHeader>
      <CardContent>
        {patients.length === 0 ? (
          <p className="text-sm text-muted-foreground">No patient has gone quiet — everyone with an active plan has logged something recently.</p>
        ) : (
          <ul className="space-y-3">
            {patients.map((p) => (
              <li key={p.patientId} className="text-sm flex items-center justify-between gap-2 pb-3 border-b border-border/50 last:border-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/patients/${p.patientId}`} className="text-primary hover:underline">{p.name}</Link>
                  <span className="text-muted-foreground"> — {p.daysWithoutActivity} day{p.daysWithoutActivity === 1 ? "" : "s"} with no log</span>
                </div>
                {p.hasNote && (
                  <span title="Has a patient note" className="flex items-center gap-1 text-xs text-primary shrink-0">
                    <MessageSquare className="h-3.5 w-3.5" />
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
