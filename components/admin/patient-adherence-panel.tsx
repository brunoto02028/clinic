"use client";

// Per-patient "did they do today's exercises" panel, on the patient's own
// profile page (activity 49 follow-up — the clinic-wide card and the daily
// e-mail already covered this; this is the same thing scoped to one
// patient, with the send button right where the admin is already looking).

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, AlertCircle, Loader2, Send, Eye } from "lucide-react";

type AdherenceToday = { hasPlan: boolean; allDone: boolean; missing: { id: string; title: string }[] };

export default function PatientAdherencePanel({ patientId }: { patientId: string }) {
  const [data, setData] = useState<AdherenceToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/patients/${patientId}/adherence-today`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, [patientId]);

  const sendReminder = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/admin/adherence/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      if (res.ok) setSent(true);
    } finally {
      setSending(false);
    }
  };

  if (loading || !data || !data.hasPlan) return null; // nothing scheduled today — nothing to show

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Today&apos;s plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.allDone ? (
            <p className="flex items-center gap-1.5 text-sm text-ba1-ok"><CheckCircle2 className="h-4 w-4" /> Completed everything today.</p>
          ) : (
            <>
              <p className="flex items-center gap-1.5 text-sm text-ba1-bad">
                <AlertCircle className="h-4 w-4" /> Missing {data.missing.length} {data.missing.length === 1 ? "activity" : "activities"} today
              </p>
              <ul className="text-xs text-muted-foreground space-y-0.5 pl-5 list-disc">
                {data.missing.map((m) => <li key={m.id}>{m.title}</li>)}
              </ul>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)}>
                  <Eye className="h-3.5 w-3.5 mr-1.5" /> Preview reminder
                </Button>
                <Button size="sm" disabled={sending || sent} onClick={sendReminder}>
                  {sending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : sent ? <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                  {sent ? "Sent" : "Send reminder now"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Reminder e-mail preview</DialogTitle>
          </DialogHeader>
          <iframe
            src={`/api/admin/adherence/preview-patient-email?patientId=${patientId}`}
            title="Reminder e-mail preview"
            className="flex-1 w-full rounded-md border bg-white"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
            <Button disabled={sending || sent} onClick={async () => { await sendReminder(); setPreviewOpen(false); }}>
              {sent ? "Sent" : "Looks good — send it"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
