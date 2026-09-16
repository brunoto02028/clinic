"use client";

// Assign a protocol template to a patient. Opened from the template library
// (template already chosen) or from the patient's Protocol tab (patient
// already chosen) — the other one is picked here.
import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Send, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export interface AssignTemplateLite {
  id: string;
  name: string;
  isActive?: boolean;
  items?: { startWeek?: number | null }[];
}

export interface AssignPatientLite {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  preferredLocale?: string | null;
}

interface ExistingProtocol {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

type Language = "en-GB" | "pt-BR";

const VISIBILITY = [
  { key: "2", label: "Weeks 1–2", value: 2 },
  { key: "1", label: "Week 1", value: 1 },
  { key: "all", label: "Everything", value: null },
] as const;

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft", UNDER_REVIEW: "Under review", APPROVED: "Approved", SENT_TO_PATIENT: "Sent",
};

const languageOf = (locale?: string | null): Language =>
  (locale || "").toLowerCase().startsWith("pt") ? "pt-BR" : "en-GB";

export default function AssignProtocolDialog({
  open,
  onOpenChange,
  template,
  patient,
  onAssigned,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: AssignTemplateLite | null;
  patient?: AssignPatientLite | null;
  onAssigned?: (result: { protocolId: string; archived: number }) => void;
}) {
  const { toast } = useToast();
  const [patients, setPatients] = useState<AssignPatientLite[]>([]);
  const [templates, setTemplates] = useState<AssignTemplateLite[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [patientId, setPatientId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [language, setLanguage] = useState<Language>("en-GB");
  const [visibility, setVisibility] = useState<string>("2");
  const [note, setNote] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [conflict, setConflict] = useState<ExistingProtocol[] | null>(null);

  // Fresh form (and fresh lists) every time the dialog opens. Keyed on ids so
  // a parent re-render with a new object doesn't wipe what's been typed.
  const fixedPatientId = patient?.id;
  const fixedTemplateId = template?.id;
  const fixedPatientLocale = patient?.preferredLocale;
  useEffect(() => {
    if (!open) return;
    setSearch("");
    setPatientId(fixedPatientId || "");
    setTemplateId(fixedTemplateId || "");
    setLanguage(languageOf(fixedPatientLocale));
    setVisibility("2");
    setNote("");
    setConflict(null);

    let cancelled = false;
    const loads: Promise<void>[] = [];
    if (!fixedPatientId) {
      loads.push(
        fetch("/api/admin/patients?limit=500")
          .then((r) => (r.ok ? r.json() : []))
          .then((d) => { if (!cancelled) setPatients(Array.isArray(d) ? d : []); })
      );
    }
    if (!fixedTemplateId) {
      loads.push(
        fetch("/api/admin/protocols")
          .then((r) => (r.ok ? r.json() : []))
          .then((d) => { if (!cancelled) setTemplates(Array.isArray(d) ? d.filter((t) => t.isActive !== false) : []); })
      );
    }
    if (loads.length) {
      setListsLoading(true);
      Promise.all(loads)
        .catch(() => {})
        .finally(() => { if (!cancelled) setListsLoading(false); });
    }
    return () => { cancelled = true; };
  }, [open, fixedPatientId, fixedTemplateId, fixedPatientLocale]);

  const chosenPatient = patient || patients.find((p) => p.id === patientId) || null;
  const chosenTemplate = template || templates.find((t) => t.id === templateId) || null;
  const visibleThroughWeek = VISIBILITY.find((v) => v.key === visibility)?.value ?? null;

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) || (p.email || "").toLowerCase().includes(q)
    );
  }, [patients, search]);

  const preview = useMemo(() => {
    const items = chosenTemplate?.items;
    if (!items?.length) return null;
    const shown = visibleThroughWeek == null
      ? items.length
      : items.filter((it) => (it.startWeek || 1) <= visibleThroughWeek).length;
    return { shown, total: items.length };
  }, [chosenTemplate, visibleThroughWeek]);

  const pickPatient = (p: AssignPatientLite) => {
    setPatientId(p.id);
    setLanguage(languageOf(p.preferredLocale));
    setConflict(null);
  };

  const submit = async (onExisting?: "archive" | "keep") => {
    if (!chosenTemplate || !chosenPatient) return;
    setAssigning(true);
    try {
      const r = await fetch(`/api/admin/protocols/${chosenTemplate.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: chosenPatient.id,
          note: note.trim() || undefined,
          language,
          visibleThroughWeek,
          onExisting,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.status === 409 && Array.isArray(data.existing)) {
        setConflict(data.existing);
        return;
      }
      if (!r.ok) throw new Error(data.error || "Failed to assign");

      const details = [
        data.archived > 0 ? `Previous copy archived.` : "",
        data.prescriptions > 0 ? `${data.prescriptions} exercise(s) prescribed.` : "",
        data.unlinkedExercises > 0
          ? `${data.unlinkedExercises} item(s) have no exercise from this clinic's library linked — link them in the patient's Protocol tab.`
          : "",
      ].filter(Boolean).join(" ");
      toast({
        title: `Protocol assigned to ${chosenPatient.firstName}`,
        description: `The patient has been notified. ${details}`.trim(),
      });
      onOpenChange(false);
      onAssigned?.({ protocolId: data.protocolId, archived: data.archived || 0 });
    } catch (e: any) {
      toast({ title: "Error assigning", description: e.message, variant: "destructive" });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-sm">
            {template ? <>Assign &quot;{template.name}&quot;</> : patient ? <>Assign a template to {patient.firstName} {patient.lastName}</> : "Assign template"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {!patient && (
            <>
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search patient…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <div className="max-h-[200px] overflow-y-auto border border-border rounded-lg divide-y divide-border/50">
                {filteredPatients.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/30 transition-colors ${
                      patientId === p.id ? "bg-primary/10 border-l-2 border-primary" : ""
                    }`}
                    onClick={() => pickPatient(p)}
                  >
                    <p className="font-medium">{p.firstName} {p.lastName}</p>
                    <p className="text-[10px] text-muted-foreground">{p.email}</p>
                  </button>
                ))}
                {filteredPatients.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    {listsLoading ? "Loading…" : "No patients."}
                  </p>
                )}
              </div>
            </>
          )}

          {!template && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Template</Label>
              <Select value={templateId} onValueChange={(v) => { setTemplateId(v); setConflict(null); }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={listsLoading ? "Loading…" : "Choose a template"} />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-sm">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!listsLoading && templates.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  No templates in this clinic yet — create one in Clinical → Protocols.
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label className="text-xs text-muted-foreground">Send to patient in</Label>
            <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
              {([["en-GB", "English"], ["pt-BR", "Português"]] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLanguage(value)}
                  className={`text-[10px] font-medium px-2.5 py-1 rounded transition-colors ${language === value ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-xs text-muted-foreground">Visible to the patient at first</Label>
              <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
                {VISIBILITY.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => setVisibility(v.key)}
                    className={`text-[10px] font-medium px-2.5 py-1 rounded transition-colors whitespace-nowrap ${visibility === v.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {preview
                ? `${preview.shown} of ${preview.total} item(s) visible at first. `
                : ""}
              {visibleThroughWeek == null
                ? "The whole plan is released at once."
                : "Release the following weeks from the patient's Protocol tab."}
            </p>
          </div>

          <Textarea
            placeholder="Note for the patient (optional)…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="text-sm min-h-[60px]"
          />

          {conflict && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
              <p className="text-xs font-medium flex items-start gap-1.5">
                <TriangleAlert className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                {chosenPatient?.firstName} already has this protocol:
              </p>
              <ul className="text-[11px] text-muted-foreground space-y-0.5 pl-5 list-disc">
                {conflict.map((p) => (
                  <li key={p.id}>
                    {p.title} — {STATUS_LABELS[p.status] || p.status}, created{" "}
                    {new Date(p.createdAt).toLocaleDateString("en-GB")}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" className="h-8 text-xs" disabled={assigning} onClick={() => submit("archive")}>
                  {assigning && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  Archive the old one and assign
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" disabled={assigning} onClick={() => submit("keep")}>
                  Assign anyway (keep both)
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {!conflict && (
            <Button onClick={() => submit()} disabled={assigning || !chosenPatient || !chosenTemplate} className="gap-2">
              {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Assign & Notify
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
