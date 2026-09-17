"use client";

// Per-patient "did they do their exercises" panel, on the patient's own
// profile page (activity 49 follow-up — the clinic-wide card and the daily
// e-mail already covered this; this is the same thing scoped to one
// patient, with the send button right where the admin is already looking).
//
// Two independent touchpoints, each with its own preview/send: today's
// "still time" reminder (evening tone) and yesterday's "we missed you"
// follow-up (morning tone, named misses, invites the patient to reach out).

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, AlertCircle, Loader2, Send, Eye } from "lucide-react";

type MissingItem = { id: string; title: string };
type DayStatus = { hasPlan: boolean; allDone: boolean; missing: MissingItem[] };
type AdherenceToday = DayStatus & { yesterday: DayStatus };

function AdherenceSection({
  title,
  doneLabel,
  missingLabel,
  status,
  previewUrl,
  sendUrl,
  patientId,
}: {
  title: string;
  doneLabel: string;
  missingLabel: (n: number) => string;
  status: DayStatus;
  previewUrl: string;
  sendUrl: string;
  patientId: string;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      const res = await fetch(sendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      if (res.ok) setSent(true);
    } finally {
      setSending(false);
    }
  };

  if (!status.hasPlan) return null;

  return (
    <div className="space-y-2 pt-3 first:pt-0 border-t first:border-t-0">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
      {status.allDone ? (
        <p className="flex items-center gap-1.5 text-sm text-ba1-ok"><CheckCircle2 className="h-4 w-4" /> {doneLabel}</p>
      ) : (
        <>
          <p className="flex items-center gap-1.5 text-sm text-ba1-bad">
            <AlertCircle className="h-4 w-4" /> {missingLabel(status.missing.length)}
          </p>
          <ul className="text-xs text-muted-foreground space-y-0.5 pl-5 list-disc">
            {status.missing.map((m) => <li key={m.id}>{m.title}</li>)}
          </ul>
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-3.5 w-3.5 mr-1.5" /> Preview
            </Button>
            <Button size="sm" disabled={sending || sent} onClick={send}>
              {sending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : sent ? <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
              {sent ? "Sent" : "Send now"}
            </Button>
          </div>
        </>
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{title} — e-mail preview</DialogTitle>
          </DialogHeader>
          {/* Cache-busted and only mounted while open — an <iframe> navigation
              can get served from the browser's disk cache even with
              Cache-Control: no-store on the response, so a stale 404 from
              before this route existed could otherwise stick around. */}
          {previewOpen && (
            <iframe
              src={`${previewUrl}&_=${Date.now()}`}
              title={`${title} preview`}
              className="flex-1 w-full rounded-md border bg-white"
            />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
            <Button disabled={sending || sent} onClick={async () => { await send(); setPreviewOpen(false); }}>
              {sent ? "Sent" : "Looks good — send it"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PatientAdherencePanel({ patientId }: { patientId: string }) {
  const [data, setData] = useState<AdherenceToday | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/patients/${patientId}/adherence-today`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading || !data || (!data.hasPlan && !data.yesterday.hasPlan)) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Adherence</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <AdherenceSection
          title="Today"
          doneLabel="Completed everything today."
          missingLabel={(n) => `Missing ${n} ${n === 1 ? "activity" : "activities"} today`}
          status={{ hasPlan: data.hasPlan, allDone: data.allDone, missing: data.missing }}
          previewUrl={`/api/admin/adherence/preview-patient-email?patientId=${patientId}`}
          sendUrl="/api/admin/adherence/send-reminder"
          patientId={patientId}
        />
        <AdherenceSection
          title="Yesterday"
          doneLabel="Completed everything yesterday."
          missingLabel={(n) => `Missed ${n} ${n === 1 ? "activity" : "activities"} yesterday`}
          status={data.yesterday}
          previewUrl={`/api/admin/adherence/preview-yesterday-email?patientId=${patientId}`}
          sendUrl="/api/admin/adherence/send-yesterday-followup"
          patientId={patientId}
        />
      </CardContent>
    </Card>
  );
}
