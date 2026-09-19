"use client";

// Clinician-facing evidence report (activity 15, T-5/T-6). Same layout as the
// approved mockup, rendered in the real BPR identity (logo + bruno palette +
// app fonts/tokens). Clinician-internal — never shown to the patient.
//
// Activity 63, T-1: shows the full history, not just the latest — as triage/
// data comes in and the report is regenerated, older versions stay visible
// (collapsed) instead of being replaced, so the clinician can see how the
// analysis evolved.

import { useCallback, useEffect, useState } from "react";
import {
  Loader2, AlertTriangle, CheckCircle2, RefreshCw, TrendingUp, FlaskConical,
  Stethoscope, ExternalLink, Languages, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

type Lang = "en" | "pt";

const T = {
  en: {
    myProgress: "Evidence Report", subtitle: "Auto-generated from triage — for therapist review. Not a diagnosis or prescription.",
    generating: "Generating evidence report…", empty: "No evidence report yet.",
    generate: "Generate report", regenerate: "Regenerate", markReview: "Mark under review",
    approve: "Approve", approved: "Approved", draft: "Draft", underReview: "Under review", archived: "Archived",
    caseSummary: "Case summary", complaint: "Chief complaint", location: "Location", duration: "Duration",
    pain: "Pain (VAS)", adl: "FAAM ADL", sport: "FAAM Sport", fn: "Function",
    safety: "Safety check", noFlags: "No urgent red flags.", redFlagTitle: "Red flags — priority human assessment",
    redFlagBody: "Evidence gathering was halted. This case requires priority human assessment before any treatment suggestion.",
    precautions: "Precautionary flags", summary: "Evidence summary", evidence: "Selected evidence",
    resources: "Clinic resources", available: "Available now", offCatalog: "Mentioned in literature, off catalogue",
    suggestions: "Suggestions", treatment: "Treatment / modalities", exercise: "Exercise",
    source: "Source", inClinic: "In clinic?", gaps: "Gaps & notes",
    disclaimer: "Evidence gathering to speed the physiotherapist's decision. Not a diagnosis or prescription; review before any patient contact.",
    translate: "Translate to PT", translating: "Translating…", error: "Generation error",
    history: "Earlier reports", noComplaint: "(no chief complaint recorded)",
  },
  pt: {
    myProgress: "Relatório de Evidência", subtitle: "Auto-gerado da triagem — para revisão do fisioterapeuta. Não é diagnóstico nem prescrição.",
    generating: "Gerando relatório de evidência…", empty: "Ainda sem relatório de evidência.",
    generate: "Gerar relatório", regenerate: "Regenerar", markReview: "Marcar em revisão",
    approve: "Aprovar", approved: "Aprovado", draft: "Rascunho", underReview: "Em revisão", archived: "Arquivado",
    caseSummary: "Resumo do caso", complaint: "Queixa principal", location: "Localização", duration: "Tempo de evolução",
    pain: "Dor (EVA)", adl: "FAAM ADL", sport: "FAAM Desporto", fn: "Função",
    safety: "Checagem de segurança", noFlags: "Sem red flags urgentes.", redFlagTitle: "Red flags — avaliação humana prioritária",
    redFlagBody: "O levantamento de evidência foi interrompido. Este caso precisa de avaliação humana prioritária antes de qualquer sugestão de conduta.",
    precautions: "Flags de precaução", summary: "Resumo da evidência", evidence: "Evidência selecionada",
    resources: "Recursos da clínica", available: "Disponível agora", offCatalog: "Mencionado na literatura, fora do catálogo",
    suggestions: "Sugestões", treatment: "Tratamento / modalidades", exercise: "Exercício",
    source: "Fonte", inClinic: "Na clínica?", gaps: "Lacunas e observações",
    disclaimer: "Levantamento de evidência para acelerar a decisão do fisioterapeuta. Não é diagnóstico nem prescrição; revise antes de qualquer contato com o paciente.",
    translate: "Traduzir para PT", translating: "Traduzindo…", error: "Erro de geração",
    history: "Relatórios anteriores", noComplaint: "(sem queixa principal registrada)",
  },
};

function statusPillFor(status: string, t: (typeof T)["en"]) {
  if (status === "APPROVED") return { cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", label: t.approved };
  if (status === "UNDER_REVIEW") return { cls: "bg-amber-500/15 text-amber-400 border-amber-500/30", label: t.underReview };
  if (status === "ARCHIVED") return { cls: "bg-muted text-muted-foreground border-border", label: t.archived };
  return { cls: "bg-muted text-muted-foreground border-border", label: t.draft };
}

function formatDate(iso: string, lang: Lang) {
  try {
    return new Date(iso).toLocaleDateString(lang === "pt" ? "pt-BR" : "en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

// One report's full body — the detailed view previously rendered inline for
// the single latest report. Now reused per item in the history, each with
// its own busy/translate/review-status state (a "mark reviewed" on an older
// item must never affect any other item).
function ReportBody({
  patientId, report, lang, onChange, onTranslated,
}: {
  patientId: string; report: any; lang: Lang; onChange: (updated: any) => void; onTranslated: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const t = T[lang];

  async function setStatus(status: string) {
    setBusy(status);
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/evidence-report`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: report.id, status }),
      });
      if (res.ok) onChange((await res.json()).report);
    } finally { setBusy(null); }
  }

  async function translate() {
    setBusy("translate");
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/evidence-report`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "translate", reportId: report.id }),
      });
      if (res.ok) { onChange((await res.json()).report); onTranslated(); }
    } finally { setBusy(null); }
  }

  if (report.status === "GENERATING") {
    return (
      <div className="text-center py-10">
        <Loader2 className="h-7 w-7 animate-spin text-bruno-turquoise mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">{t.generating}</p>
      </div>
    );
  }

  const cs = report.caseSummary || {};
  const scores = cs.scores || {};
  const evidence: any[] = Array.isArray(report.evidence) ? report.evidence : [];
  const cross = report.clinicCrossRef || {};
  const sug = report.suggestions || {};
  const gaps: string[] = Array.isArray(report.gaps) ? report.gaps : [];
  const flags: any[] = Array.isArray(report.redFlagDetails) ? report.redFlagDetails : [];
  const narrative = lang === "pt" ? (report.narrativePt || report.narrativeEn) : report.narrativeEn;
  const sr = evidence.filter((e) => e.evidenceRank === 5);
  const rct = evidence.filter((e) => e.evidenceRank === 4);
  const other = evidence.filter((e) => e.evidenceRank <= 3);

  return (
    <div className="space-y-6">
      {report.error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /><span>{t.error}: {report.error}</span>
        </div>
      )}

      {/* Case summary */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t.caseSummary}</h3>
        <div className="grid sm:grid-cols-3 gap-x-6 gap-y-1 text-sm mb-3">
          <div className="flex justify-between gap-2 border-b border-border py-1.5"><span className="text-muted-foreground">{t.complaint}</span><span className="text-right font-medium">{cs.chiefComplaint || "—"}</span></div>
          <div className="flex justify-between gap-2 border-b border-border py-1.5"><span className="text-muted-foreground">{t.location}</span><span className="text-right font-medium">{cs.location || "—"}</span></div>
          <div className="flex justify-between gap-2 border-b border-border py-1.5"><span className="text-muted-foreground">{t.duration}</span><span className="text-right font-medium">{cs.duration || "—"}</span></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { l: t.pain, v: scores.vas != null ? `${scores.vas}/10` : "—", c: "text-red-400" },
            { l: t.adl, v: scores.faamAdl != null ? `${scores.faamAdl}%` : "—", c: "text-blue-400" },
            { l: t.sport, v: scores.faamSport != null ? `${scores.faamSport}%` : "—", c: "text-purple-400" },
            { l: t.fn, v: scores.function != null ? `${scores.function}%` : "—", c: "text-emerald-400" },
          ].map((s) => (
            <div key={s.l} className="rounded-lg bg-muted/30 border border-border p-2.5 text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.l}</p>
              <p className={`text-xl font-bold mt-0.5 ${s.c}`}>{s.v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Safety */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t.safety}</h3>
        {report.redFlag ? (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3">
            <p className="flex items-center gap-2 font-semibold text-red-300 text-sm"><AlertTriangle className="h-4 w-4" />{t.redFlagTitle}</p>
            <p className="text-sm text-red-200/90 mt-1">{t.redFlagBody}</p>
            <ul className="list-disc pl-5 mt-2 text-sm text-red-200/80">{flags.map((f, i) => <li key={i}>{f.flag}</li>)}</ul>
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />{t.noFlags}
            {flags.length > 0 && <span className="text-muted-foreground ml-1">· {t.precautions}: {flags.map((f) => f.flag).join(", ")}</span>}
          </div>
        )}
      </section>

      {!report.redFlag && (
        <>
          {/* Narrative */}
          {narrative && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.summary}</h3>
                {lang === "pt" && !report.narrativePt && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={translate} disabled={busy === "translate"}>
                    {busy === "translate" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Languages className="h-3 w-3 mr-1" />}
                    {busy === "translate" ? t.translating : t.translate}
                  </Button>
                )}
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">{narrative}</p>
            </section>
          )}

          {/* Evidence */}
          {evidence.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t.evidence}</h3>
              <div className="space-y-2">
                {[{ list: sr, tag: "SR" }, { list: rct, tag: "RCT" }, { list: other, tag: "" }].flatMap(({ list }) =>
                  list.map((e) => (
                    <div key={e.ref} className="rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-medium text-bruno-turquoise bg-bruno-turquoise/10 px-1.5 py-0.5 rounded">{e.ref}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{e.evidenceLevel}</span>
                      </div>
                      <p className="text-sm font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1 break-words">
                        {e.journal || "?"} ({e.year}, {e.language}){" "}
                        {e.url && <a href={e.url} target="_blank" rel="noopener" className="text-bruno-turquoise inline-flex items-center gap-0.5">{e.doi ? "DOI" : "Link"} <ExternalLink className="h-3 w-3" /></a>}
                      </p>
                    </div>
                  )),
                )}
              </div>
            </section>
          )}

          {/* Clinic resources */}
          {((cross.available?.length ?? 0) > 0 || (cross.offCatalog?.length ?? 0) > 0) && (
            <section className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs font-semibold text-emerald-400 mb-2">{t.available}</p>
                <ul className="list-disc pl-5 text-sm space-y-1">{(cross.available || []).map((a: string, i: number) => <li key={i}>{a}</li>)}</ul>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs font-semibold text-amber-400 mb-2">{t.offCatalog}</p>
                <ul className="list-disc pl-5 text-sm space-y-1">{(cross.offCatalog || []).map((o: any, i: number) => <li key={i}>{o.item} <span className="font-mono text-xs text-bruno-turquoise">{o.sourceRef}</span></li>)}</ul>
              </div>
            </section>
          )}

          {/* Suggestions */}
          {((sug.treatment?.length ?? 0) > 0 || (sug.exercise?.length ?? 0) > 0) && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t.suggestions}</h3>
              <div className="overflow-x-auto space-y-3">
                {sug.treatment?.length > 0 && (
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-[11px] uppercase text-muted-foreground border-b border-border"><th className="py-1.5 pr-2">{t.treatment}</th><th className="py-1.5 px-2">{t.source}</th><th className="py-1.5 pl-2">{t.inClinic}</th></tr></thead>
                    <tbody>{sug.treatment.map((s: any, i: number) => (
                      <tr key={i} className="border-b border-border"><td className="py-2 pr-2">{s.text}</td><td className="py-2 px-2 font-mono text-xs text-bruno-turquoise">{s.sourceRef}</td><td className="py-2 pl-2">{s.available === "yes" ? <span className="text-emerald-400 font-medium">✓</span> : s.available === "partial" ? <span className="text-muted-foreground">~</span> : <span className="text-amber-400">✗</span>}</td></tr>
                    ))}</tbody>
                  </table>
                )}
                {sug.exercise?.length > 0 && (
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-[11px] uppercase text-muted-foreground border-b border-border"><th className="py-1.5 pr-2">{t.exercise}</th><th className="py-1.5 px-2">{t.source}</th><th className="py-1.5 pl-2">{t.inClinic}</th></tr></thead>
                    <tbody>{sug.exercise.map((s: any, i: number) => (
                      <tr key={i} className="border-b border-border"><td className="py-2 pr-2"><span className="font-medium">{s.name}</span><span className="block text-xs text-muted-foreground">{s.params}</span></td><td className="py-2 px-2 font-mono text-xs text-bruno-turquoise">{s.sourceRef}</td><td className="py-2 pl-2">{s.inCatalog ? <span className="text-emerald-400">✓</span> : <span className="text-amber-400">✗</span>}</td></tr>
                    ))}</tbody>
                  </table>
                )}
              </div>
            </section>
          )}

          {gaps.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t.gaps}</h3>
              <ul className="list-disc pl-5 text-sm space-y-1 text-foreground/90">{gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
            </section>
          )}
        </>
      )}

      {/* Disclaimer — always shown with the report, never editable/removable */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200/80 flex gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" /><span>{t.disclaimer}</span>
      </div>

      {/* Per-report review actions */}
      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        {report.status === "DRAFT" && (
          <Button size="sm" variant="outline" onClick={() => setStatus("UNDER_REVIEW")} disabled={!!busy || !!report.error}>{t.markReview}</Button>
        )}
        {report.status !== "APPROVED" && (
          <Button size="sm" onClick={() => setStatus("APPROVED")} disabled={!!busy || !!report.error}>
            {busy === "APPROVED" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <TrendingUp className="h-4 w-4 mr-1" />}{t.approve}
          </Button>
        )}
      </div>
    </div>
  );
}

// One timeline entry — collapsed by default (except the most recent, which
// starts expanded since that's what matters day to day).
function ReportCard({
  patientId, report, lang, defaultExpanded, onChange, onTranslated,
}: {
  patientId: string; report: any; lang: Lang; defaultExpanded: boolean; onChange: (updated: any) => void; onTranslated: () => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const t = T[lang];
  const pill = statusPillFor(report.status, t);
  const cs = report.caseSummary || {};

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-muted/20 hover:bg-muted/30 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`text-[11px] font-semibold px-2 py-1 rounded-full border shrink-0 ${pill.cls}`}>{pill.label}</span>
          <span className="text-sm font-medium truncate">{cs.chiefComplaint || t.noComplaint}</span>
          <span className="text-xs text-muted-foreground shrink-0">{formatDate(report.createdAt, lang)}</span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {expanded && (
        <div className="p-4 border-t border-border">
          <ReportBody patientId={patientId} report={report} lang={lang} onChange={onChange} onTranslated={onTranslated} />
        </div>
      )}
    </div>
  );
}

export function EvidenceReportTab({ patientId }: { patientId: string }) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("en");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const t = T[lang];

  useEffect(() => {
    fetch("/api/settings").then((r) => r.ok ? r.json() : null).then((s) => {
      if (s) setLogoUrl(s.logoUrl || s.darkLogoUrl || null);
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/evidence-report?history=true`);
      if (res.ok) setReports((await res.json()).reports || []);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  // Poll while the most recent report is being generated.
  useEffect(() => {
    if (reports[0]?.status !== "GENERATING") return;
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [reports, load]);

  async function regenerate() {
    setBusy("regen");
    try {
      await fetch(`/api/admin/patients/${patientId}/evidence-report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      await load();
    } finally { setBusy(null); }
  }

  // A card updated its own report (review status / translation) — patch just
  // that entry in the list so the timeline reflects it without a full refetch.
  function handleChange(updated: any) {
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const [latest, ...older] = reports;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header — BPR identity */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border bg-gradient-to-r from-bruno-slate/10 to-bruno-turquoise/10">
        <div className="flex items-center gap-3">
          <Logo size="sm" logoUrl={logoUrl} />
          <div>
            <p className="font-semibold text-foreground flex items-center gap-2"><Stethoscope className="h-4 w-4 text-bruno-turquoise" />{t.myProgress}</p>
            <p className="text-xs text-muted-foreground">{t.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-muted/50 p-0.5">
            {(["en", "pt"] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`rounded-md px-2 py-0.5 text-xs font-medium ${lang === l ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <Button size="sm" variant="ghost" onClick={regenerate} disabled={!!busy}>
            {busy === "regen" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}{t.regenerate}
          </Button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {!latest && (
          <div className="text-center py-14">
            <FlaskConical className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{t.empty}</p>
            <Button size="sm" className="mt-3" onClick={regenerate} disabled={busy === "regen"}>
              {busy === "regen" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FlaskConical className="h-4 w-4 mr-2" />}
              {t.generate}
            </Button>
          </div>
        )}

        {latest && (
          <div className="rounded-xl border border-bruno-turquoise/30 overflow-hidden">
            <div className="px-4 py-3 bg-bruno-turquoise/5 flex items-center gap-3">
              <span className={`text-[11px] font-semibold px-2 py-1 rounded-full border ${statusPillFor(latest.status, t).cls}`}>{statusPillFor(latest.status, t).label}</span>
              <span className="text-xs text-muted-foreground">{formatDate(latest.createdAt, lang)}</span>
            </div>
            <div className="p-4">
              <ReportBody patientId={patientId} report={latest} lang={lang} onChange={handleChange} onTranslated={() => setLang("pt")} />
            </div>
          </div>
        )}

        {older.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.history}</h3>
            <div className="space-y-2">
              {older.map((r) => (
                <ReportCard key={r.id} patientId={patientId} report={r} lang={lang} defaultExpanded={false} onChange={handleChange} onTranslated={() => setLang("pt")} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
