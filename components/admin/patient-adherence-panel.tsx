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
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, AlertCircle, Loader2, Send, Eye, MessageSquare } from "lucide-react";
import { useVocab } from "@/hooks/use-vocab";

type MissingItem = { id: string; title: string };
type DayStatus = { hasPlan: boolean; allDone: boolean; missing: MissingItem[]; reminderSentAt: string | null };
type AdherenceToday = DayStatus & { yesterday: DayStatus };

function formatSentAt(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AdherenceSection({
  title,
  doneLabel,
  missingLabel,
  status,
  previewUrl,
  sendUrl,
  patientId,
  sendBody,
  onSent,
  showLocaleToggle,
}: {
  title: string;
  doneLabel: string;
  missingLabel: (n: number) => string;
  status: DayStatus;
  previewUrl: string;
  sendUrl: string;
  patientId: string;
  /** Overrides the POST body sent to `sendUrl`. Defaults to `{ patientId }`
   * (what Today/Yesterday/Onboarding's clinic-wide routes expect) — the
   * weekly closing routes are patient-scoped in the URL and take `{ locale }`
   * instead (activity 60). */
  sendBody?: Record<string, any>;
  /** Called with the new timestamp right after a successful send. Today/
   * Yesterday/Onboarding don't need it (their `status.allDone` reflects
   * patient compliance, not whether a reminder went out, so it never
   * changes on send) — Weekly closing's `allDone` IS "did I send it",
   * so its parent needs telling or the section keeps showing "Not sent"
   * next to a button that already says "Sent" until the next full reload. */
  onSent?: (sentAt: string) => void;
  /** Today/Yesterday/Onboarding get an inline EN/PT picker next to Send now
   * (activity 62) — unlike weekly closing's two separate sections, one
   * section here just overrides the language for this particular send. Null
   * (the default) means "use the patient's own preferredLocale", same as
   * before this existed. */
  showLocaleToggle?: boolean;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentAt, setSentAt] = useState(status.reminderSentAt);
  const [locale, setLocale] = useState<"en" | "pt" | null>(null);

  useEffect(() => setSentAt(status.reminderSentAt), [status.reminderSentAt]);

  const send = async () => {
    setSending(true);
    try {
      const res = await fetch(sendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(sendBody || { patientId }), ...(locale ? { locale } : {}) }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.sent !== false) {
          const now = new Date().toISOString();
          setSentAt(now);
          onSent?.(now);
        }
      }
    } finally {
      setSending(false);
    }
  };

  if (!status.hasPlan) return null;
  const sent = !!sentAt;

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
          <div className="flex gap-2 pt-1 items-center">
            <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-3.5 w-3.5 mr-1.5" /> Preview
            </Button>
            <Button size="sm" disabled={sending || sent} onClick={send}>
              {sending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : sent ? <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
              {sent && sentAt ? `Sent ${formatSentAt(sentAt)}` : "Send now"}
            </Button>
            {showLocaleToggle && !sent && (
              <div className="flex items-center gap-0.5 rounded-md border border-border px-1 py-0.5">
                {(["en", "pt"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLocale((prev) => (prev === l ? null : l))}
                    title={l === "pt" ? "Force Portuguese for this send" : "Force English for this send"}
                    className={`text-[10px] px-1.5 py-0.5 rounded ${locale === l ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:bg-muted"}`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
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
              src={`${previewUrl}${locale ? `&locale=${locale}` : ""}&_=${Date.now()}`}
              title={`${title} preview`}
              className="flex-1 w-full rounded-md border bg-white"
            />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
            <Button disabled={sending || sent} onClick={async () => { await send(); setPreviewOpen(false); }}>
              {sent && sentAt ? `Sent ${formatSentAt(sentAt)}` : "Looks good — send it"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type WeeklyClosingStatus = { en: { sentAt: string | null }; pt: { sentAt: string | null } };
type ProtocolNote = { id: string; title: string; patientNotes: string; updatedAt: string; protocolTitle?: string; protocolStatus?: string };

// Activity 071 — surfaces what the patient wrote via the note box added to
// app/dashboard/treatment/page.tsx (that field existed on the model long
// before any screen let a patient fill it in). Includes notes from archived
// protocols on purpose — a plan being superseded is normal clinical
// progress and must never make the patient's feedback disappear (Bruno,
// 23/09/2026).
function PatientNotesSection({ notes }: { notes: ProtocolNote[] }) {
  if (notes.length === 0) return null;
  return (
    <div className="space-y-2 pt-3 first:pt-0 border-t first:border-t-0">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5" /> Patient notes
      </p>
      <ul className="space-y-2">
        {notes.map((n) => (
          <li key={n.id} className="text-sm bg-muted/50 rounded p-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 flex-wrap">
              {n.title}
              {n.protocolStatus === "ARCHIVED" && (
                <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                  Archived plan{n.protocolTitle ? ` — ${n.protocolTitle}` : ""}
                </span>
              )}
            </p>
            <p className="whitespace-pre-wrap">{n.patientNotes}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

type OnboardingPending = {
  profileIncomplete: boolean;
  screeningMissing: boolean;
  consentMissing: boolean;
  anyPending: boolean;
  reminderSentAt: string | null;
};

function onboardingStatus(p: OnboardingPending | null): DayStatus {
  if (!p) return { hasPlan: false, allDone: true, missing: [], reminderSentAt: null };
  const missing: MissingItem[] = [];
  if (p.profileIncomplete) missing.push({ id: "profile", title: "Complete profile" });
  if (p.screeningMissing) missing.push({ id: "screening", title: "Submit medical screening" });
  if (p.consentMissing) missing.push({ id: "consent", title: "Accept consent terms" });
  return { hasPlan: true, allDone: !p.anyPending, missing, reminderSentAt: p.reminderSentAt };
}

export default function PatientAdherencePanel({ patientId }: { patientId: string }) {
  const [data, setData] = useState<AdherenceToday | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingPending | null>(null);
  const { isPersonal } = useVocab();
  const [weeklyClosing, setWeeklyClosing] = useState<WeeklyClosingStatus | null>(null);
  const [notes, setNotes] = useState<ProtocolNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/patients/${patientId}/adherence-today`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/admin/patients/${patientId}/onboarding-pending`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/admin/patients/${patientId}/weekly-closing`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/admin/patients/${patientId}/protocol-notes`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([adherence, onboardingData, weeklyClosingData, notesData]) => {
        setData(adherence);
        setOnboarding(onboardingData);
        setWeeklyClosing(weeklyClosingData);
        setNotes(notesData?.notes ?? []);
      })
      .finally(() => setLoading(false));
  }, [patientId]);

  const onboardingReady = onboarding !== null;
  if (loading || !data || (!data.hasPlan && !data.yesterday.hasPlan && !onboarding?.anyPending && notes.length === 0)) return null;

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Adherence</CardTitle>
        <Link href="/admin/reminder-templates" className="text-xs text-primary hover:underline">
          Edit reminder text
        </Link>
      </CardHeader>
      <CardContent className="space-y-1">
        <PatientNotesSection notes={notes} />
        <AdherenceSection
          title="Today"
          doneLabel="Completed everything today."
          missingLabel={(n) => `Missing ${n} ${n === 1 ? "activity" : "activities"} today`}
          status={{ hasPlan: data.hasPlan, allDone: data.allDone, missing: data.missing, reminderSentAt: data.reminderSentAt }}
          previewUrl={`/api/admin/adherence/preview-patient-email?patientId=${patientId}`}
          sendUrl="/api/admin/adherence/send-reminder"
          patientId={patientId}
          showLocaleToggle
        />
        <AdherenceSection
          title="Yesterday"
          doneLabel="Completed everything yesterday."
          missingLabel={(n) => `Missed ${n} ${n === 1 ? "activity" : "activities"} yesterday`}
          status={data.yesterday}
          previewUrl={`/api/admin/adherence/preview-yesterday-email?patientId=${patientId}`}
          sendUrl="/api/admin/adherence/send-yesterday-followup"
          patientId={patientId}
          showLocaleToggle
        />
        {onboardingReady && (
          <AdherenceSection
            title="Onboarding"
            doneLabel={isPersonal ? "Profile and consent all done." : "Profile, screening and consent all done."}
            missingLabel={(n) => `${n} onboarding ${n === 1 ? "step" : "steps"} pending`}
            status={onboardingStatus(onboarding)}
            previewUrl={`/api/admin/adherence/preview-onboarding-email?patientId=${patientId}`}
            sendUrl="/api/admin/adherence/send-onboarding-reminder"
            patientId={patientId}
            showLocaleToggle
          />
        )}
        {data.hasPlan && weeklyClosing && (
          <>
            <AdherenceSection
              title="Weekly closing (EN)"
              doneLabel={weeklyClosing.en.sentAt ? `Sent this week (${formatSentAt(weeklyClosing.en.sentAt)}).` : "Sent this week."}
              missingLabel={() => "Not sent this week"}
              status={{ hasPlan: true, allDone: !!weeklyClosing.en.sentAt, missing: [], reminderSentAt: weeklyClosing.en.sentAt }}
              previewUrl={`/api/admin/adherence/preview-weekly-closing-email?patientId=${patientId}&locale=en`}
              sendUrl={`/api/admin/patients/${patientId}/weekly-closing`}
              sendBody={{ locale: "en" }}
              onSent={(sentAt) => setWeeklyClosing((prev) => (prev ? { ...prev, en: { sentAt } } : prev))}
              patientId={patientId}
            />
            <AdherenceSection
              title="Weekly closing (PT) — optional"
              doneLabel={weeklyClosing.pt.sentAt ? `Sent this week (${formatSentAt(weeklyClosing.pt.sentAt)}).` : "Sent this week."}
              missingLabel={() => "Not sent this week"}
              status={{ hasPlan: true, allDone: !!weeklyClosing.pt.sentAt, missing: [], reminderSentAt: weeklyClosing.pt.sentAt }}
              previewUrl={`/api/admin/adherence/preview-weekly-closing-email?patientId=${patientId}&locale=pt`}
              sendUrl={`/api/admin/patients/${patientId}/weekly-closing`}
              sendBody={{ locale: "pt" }}
              onSent={(sentAt) => setWeeklyClosing((prev) => (prev ? { ...prev, pt: { sentAt } } : prev))}
              patientId={patientId}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
