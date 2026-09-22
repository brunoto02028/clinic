"use client";

// "Email to patient" (activity 68): write → preview the exact e-mail → send.
// Nothing is sent without going through the preview step and an explicit click
// on the send button; the server refuses anything that differs from the preview.

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Loader2, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/hooks/use-locale";

type Lang = "en" | "pt" | "both";

type SentEmail = {
  id: string;
  subject: string;
  bodyText: string;
  html: string;
  locale: string;
  bothLanguages: boolean;
  status: "sent" | "failed";
  providerError: string | null;
  createdAt: string;
  sentBy: { firstName: string; lastName: string } | null;
};

type ApptOption = { id: string; dateTime: string; duration: number; treatmentType: string; status: string };

type Context = {
  patient: { firstName: string; hasEmail: boolean; toMasked: string | null; preferredLocale: string; address: string | null };
  appointments: ApptOption[];
  sent: SentEmail[];
};

type Draft = { language: Lang; subjectEn: string; subjectPt: string; bodyEn: string; bodyPt: string; appointmentId: string | null };
const emptyDraft = (): Draft => ({ language: "both", subjectEn: "", subjectPt: "", bodyEn: "", bodyPt: "", appointmentId: null });

const T = {
  en: {
    title: "Email to patient", write: "Write email", sent: "Emails sent", none: "No emails sent from here yet.",
    template: "Start from", blank: "Blank", language: "Send in", en: "English", pt: "Portuguese", both: "Both (patient's language first)",
    subjectEn: "Subject (English)", subjectPt: "Subject (Portuguese)", bodyEn: "Message (English)", bodyPt: "Message (Portuguese)",
    preview: "Preview", previewing: "Building preview…", back: "Back to edit", send: "Send email", sending: "Sending…",
    to: "To", subject: "Subject", previewNote: "This is exactly what the patient will receive.",
    noEmail: "This patient has no e-mail address on file.", sentOk: "Email sent", sentFail: "The email could not be sent",
    descWrite: "Write the email, then preview it. Nothing is sent until you confirm on the preview.",
    failed: "Failed", by: "by", loadError: "Could not load the email history.", show: "Show", hide: "Hide", langLabel: "Language",
  },
  pt: {
    title: "E-mail para o paciente", write: "Escrever e-mail", sent: "E-mails enviados", none: "Nenhum e-mail enviado por aqui ainda.",
    template: "Começar de", blank: "Em branco", language: "Enviar em", en: "Inglês", pt: "Português", both: "Os dois (idioma do paciente primeiro)",
    subjectEn: "Assunto (inglês)", subjectPt: "Assunto (português)", bodyEn: "Mensagem (inglês)", bodyPt: "Mensagem (português)",
    preview: "Ver prévia", previewing: "Gerando prévia…", back: "Voltar e editar", send: "Enviar e-mail", sending: "Enviando…",
    to: "Para", subject: "Assunto", previewNote: "É exatamente isto que o paciente vai receber.",
    noEmail: "Este paciente não tem e-mail cadastrado.", sentOk: "E-mail enviado", sentFail: "Não foi possível enviar o e-mail",
    descWrite: "Escreva o e-mail e veja a prévia. Nada é enviado até você confirmar na prévia.",
    failed: "Falhou", by: "por", loadError: "Não foi possível carregar o histórico de e-mails.", show: "Ver", hide: "Ocultar", langLabel: "Idioma",
  },
} as const;

const londonWhen = (iso: string, loc: string) =>
  new Intl.DateTimeFormat(loc, { timeZone: "Europe/London", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

export function PatientEmailPanel({ patientId, openAppointmentId }: { patientId: string; openAppointmentId?: string | null }) {
  const { locale } = useLocale();
  const isPt = String(locale).toLowerCase().startsWith("pt");
  const t = T[isPt ? "pt" : "en"];
  const { toast } = useToast();

  const [ctx, setCtx] = useState<Context | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"write" | "preview">("write");
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [preview, setPreview] = useState<{ subject: string; html: string; toMasked: string; hash: string; snapshot: Draft } | null>(null);
  const [busy, setBusy] = useState<"" | "template" | "preview" | "send">("");
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/email`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setCtx(await res.json());
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [patientId]);
  useEffect(() => { load(); }, [load]);

  const openBlank = () => { setDraft(emptyDraft()); setPreview(null); setError(null); setStep("write"); setOpen(true); };

  const applyTemplate = useCallback(async (appointmentId: string) => {
    if (!appointmentId) { setDraft(emptyDraft()); return; }
    setBusy("template"); setError(null);
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/email/template?appointmentId=${encodeURIComponent(appointmentId)}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Error"); return; }
      setDraft({ language: "both", subjectEn: data.subjectEn, subjectPt: data.subjectPt, bodyEn: data.bodyEn, bodyPt: data.bodyPt, appointmentId: data.appointmentId });
    } catch { setError(t.loadError); } finally { setBusy(""); }
  }, [patientId, t.loadError]);

  // Arriving from an appointment's "confirmation email" shortcut: open the composer prefilled.
  useEffect(() => {
    if (openAppointmentId && ctx) {
      setPreview(null); setStep("write"); setOpen(true);
      applyTemplate(openAppointmentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAppointmentId, !!ctx]);

  const payload = (d: Draft) => ({ language: d.language, subjectEn: d.subjectEn, subjectPt: d.subjectPt, bodyEn: d.bodyEn, bodyPt: d.bodyPt, appointmentId: d.appointmentId });

  async function doPreview() {
    setBusy("preview"); setError(null);
    try {
      const snapshot = { ...draft };
      const res = await fetch(`/api/admin/patients/${patientId}/email/preview`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload(snapshot)) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Error"); return; }
      setPreview({ subject: data.subject, html: data.html, toMasked: data.toMasked, hash: data.hash, snapshot });
      setStep("preview");
    } catch { setError("Network error"); } finally { setBusy(""); }
  }

  async function doSend() {
    if (!preview) return;
    setBusy("send"); setError(null);
    try {
      // Sends the snapshot that was previewed, never the (possibly edited) draft.
      const res = await fetch(`/api/admin/patients/${patientId}/email/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload(preview.snapshot), hash: preview.hash }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t.sentFail);
        if (data.code === "PREVIEW_MISMATCH") { setPreview(null); setStep("write"); }
        await load();
        return;
      }
      toast({ title: t.sentOk, description: preview.subject });
      setOpen(false); setPreview(null); setDraft(emptyDraft());
      await load();
    } catch { setError("Network error — nothing was confirmed. Check the history before trying again."); } finally { setBusy(""); }
  }

  const need = draft.language === "both" ? ["En", "Pt"] : [draft.language === "en" ? "En" : "Pt"];
  const canPreview = need.every((l) => (draft as any)[`subject${l}`].trim() && (draft as any)[`body${l}`].trim());
  const showEn = draft.language !== "pt";
  const showPt = draft.language !== "en";

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 mb-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold"><Mail className="h-4 w-4" />{t.title}</div>
        <Button size="sm" onClick={openBlank} disabled={!!ctx && !ctx.patient.hasEmail}><Mail className="h-3.5 w-3.5 mr-1" />{t.write}</Button>
      </div>
      {ctx && !ctx.patient.hasEmail && <p className="text-xs text-red-600">{t.noEmail}</p>}
      {loadError && <p className="text-xs text-red-600">{t.loadError}</p>}

      {ctx && (
        <div>
          <div className="text-xs font-semibold mb-1">{t.sent}</div>
          {ctx.sent.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t.none}</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {ctx.sent.map((m) => (
                <li key={m.id} className="p-2 text-xs">
                  <button type="button" className="w-full flex items-center justify-between gap-2 text-left" onClick={() => setExpanded(expanded === m.id ? null : m.id)}>
                    <span className="min-w-0 truncate">
                      <span className="font-medium">{m.subject}</span>
                      <span className="text-muted-foreground"> · {londonWhen(m.createdAt, isPt ? "pt-BR" : "en-GB")}{m.sentBy ? ` · ${t.by} ${m.sentBy.firstName}` : ""}</span>
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      {m.status === "failed" && <span className="rounded bg-red-500/15 text-red-600 px-1.5 py-0.5">{t.failed}</span>}
                      {expanded === m.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                  {expanded === m.id && (
                    <div className="mt-2 space-y-2">
                      {m.providerError && <p className="text-red-600">{m.providerError}</p>}
                      <iframe title={m.subject} sandbox="" srcDoc={m.html} className="w-full h-72 rounded border bg-white" />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { if (busy !== "send") setOpen(o); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.title}</DialogTitle>
            <DialogDescription>{step === "write" ? t.descWrite : t.previewNote}</DialogDescription>
          </DialogHeader>

          {step === "write" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-0.5">{t.template}</label>
                  <select
                    className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                    value={draft.appointmentId ?? ""}
                    disabled={busy === "template"}
                    onChange={(e) => applyTemplate(e.target.value)}
                  >
                    <option value="">{t.blank}</option>
                    {(ctx?.appointments || []).map((a) => (
                      <option key={a.id} value={a.id}>{a.treatmentType} — {londonWhen(a.dateTime, isPt ? "pt-BR" : "en-GB")}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-0.5">{t.language}</label>
                  <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={draft.language} onChange={(e) => setDraft({ ...draft, language: e.target.value as Lang })}>
                    <option value="both">{t.both}</option>
                    <option value="en">{t.en}</option>
                    <option value="pt">{t.pt}</option>
                  </select>
                </div>
              </div>

              {showEn && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-0.5">{t.subjectEn}</label>
                    <Input value={draft.subjectEn} maxLength={200} onChange={(e) => setDraft({ ...draft, subjectEn: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-0.5">{t.bodyEn}</label>
                    <Textarea rows={8} value={draft.bodyEn} maxLength={5000} onChange={(e) => setDraft({ ...draft, bodyEn: e.target.value })} />
                  </div>
                </div>
              )}
              {showPt && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-0.5">{t.subjectPt}</label>
                    <Input value={draft.subjectPt} maxLength={200} onChange={(e) => setDraft({ ...draft, subjectPt: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-0.5">{t.bodyPt}</label>
                    <Textarea rows={8} value={draft.bodyPt} maxLength={5000} onChange={(e) => setDraft({ ...draft, bodyPt: e.target.value })} />
                  </div>
                </div>
              )}
              {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
              <DialogFooter>
                <Button onClick={doPreview} disabled={!canPreview || busy !== ""}>
                  {busy === "preview" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  {busy === "preview" ? t.previewing : t.preview}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            preview && (
              <div className="space-y-3">
                <div className="text-xs space-y-0.5">
                  <div><span className="text-muted-foreground">{t.to}:</span> {preview.toMasked}</div>
                  <div><span className="text-muted-foreground">{t.subject}:</span> <span className="font-medium">{preview.subject}</span></div>
                </div>
                <iframe title="preview" sandbox="" srcDoc={preview.html} className="w-full h-[26rem] rounded border bg-white" />
                {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
                <DialogFooter className="gap-2 sm:gap-2">
                  <Button variant="outline" onClick={() => { setStep("write"); setError(null); }} disabled={busy === "send"}><ArrowLeft className="h-4 w-4 mr-1" />{t.back}</Button>
                  <Button onClick={doSend} disabled={busy === "send"}>
                    {busy === "send" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                    {busy === "send" ? t.sending : t.send}
                  </Button>
                </DialogFooter>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
