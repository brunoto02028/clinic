"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, CloudOff, SlidersHorizontal, RotateCcw, Save } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Operators = Record<string, number | string | boolean | unknown[]>;
type Condition = Record<string, number | string | boolean | Operators>;

interface Rule {
  code: string;
  name: string;
  trigger: string;
  action: string;
  active: boolean;
  condition: Condition;
  actionData: Record<string, unknown>;
  channels: string[];
  source: "global" | "clinic";
}

const UI = {
  "en-GB": {
    title: "Automation rules",
    subtitle: "Change a limit or a wording here and it applies on the next run. No deploy.",
    failed: "We could not load the rules.",
    failedHint: "This does not mean there are none — the request failed.",
    retry: "Try again", save: "Save", saving: "Saving…",
    reset: "Back to the default", resetting: "Removing…",
    fromGlobal: "Default", fromClinic: "This clinic",
    on: "On", off: "Off",
    conditionTitle: "Fires when", textTitle: "Text",
    previewWith: (n: number) => `On a patient with ${n} missing activities`,
    readOnly: "Only an administrator can change these.",
    saved: "Saved. It applies on the next run.",
    nothingChanged: "Nothing changed, so nothing was saved.",
  },
  "pt-BR": {
    title: "Regras da automação",
    subtitle: "Mude um limite ou um texto aqui e vale na próxima execução. Sem deploy.",
    failed: "Não foi possível carregar as regras.",
    failedHint: "Isto não quer dizer que não existam — a consulta falhou.",
    retry: "Tentar de novo", save: "Salvar", saving: "Salvando…",
    reset: "Voltar ao padrão", resetting: "Removendo…",
    fromGlobal: "Padrão", fromClinic: "Esta clínica",
    on: "Ligada", off: "Desligada",
    conditionTitle: "Dispara quando", textTitle: "Texto",
    previewWith: (n: number) => `Num paciente com ${n} atividades não feitas`,
    readOnly: "Só um administrador pode mudar estas regras.",
    saved: "Salvo. Vale na próxima execução.",
    nothingChanged: "Nada mudou, então nada foi salvo.",
  },
} as const;

/**
 * Which `actionData` keys a person edits, and how.
 *
 * Not "every string in the object". `auditAction` and `useReminderTemplate`
 * are mechanics — a field that looks like a lever and breaks something when
 * pulled. QA caught that shape three times in this activity; here it is an
 * explicit list instead.
 */
const EDITABLE: Record<string, "text" | "priority"> = {
  titleEn: "text",
  titlePt: "text",
  priority: "priority",
};

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

/** The threshold this rule actually uses, for an honest preview. */
function thresholdOf(condition: Condition): number {
  for (const expr of Object.values(condition)) {
    if (typeof expr === "object" && expr !== null && !Array.isArray(expr)) {
      for (const [op, bound] of Object.entries(expr as Operators)) {
        if (["gte", "gt", "lte", "lt", "eq"].includes(op) && typeof bound === "number") {
          return op === "gt" ? bound + 1 : bound;
        }
      }
    }
  }
  return 1;
}

/** Fills `{fact}` the way lib/automation/rules.ts does, for the preview. */
function interpolate(text: string, facts: Record<string, number>) {
  return text.replace(/\{(\w+)\}/g, (whole, key) =>
    facts[key] === undefined ? whole : String(facts[key])
  );
}

export default function RulesPanel() {
  const { locale } = useLocale();
  const ui = UI[locale === "pt-BR" ? "pt-BR" : "en-GB"];

  const [rules, setRules] = useState<Rule[] | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, Rule>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // What the server last said, so an edit in progress can be told apart from a
  // stale copy. Without it, saving rule B wiped an unsaved edit on rule A.
  const server = useRef<Record<string, Rule>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch("/api/automation/rules");
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const fresh: Rule[] = data.rules ?? [];
      setRules(fresh);
      setCanEdit(!!data.canEdit);
      setDraft((current) => {
        const next: Record<string, Rule> = {};
        for (const r of fresh) {
          const was = server.current[r.code];
          const mine = current[r.code];
          // Keep what the person is typing; replace only what they have not
          // touched since the last time the server spoke.
          const untouched = !mine || !was || JSON.stringify(mine) === JSON.stringify(was);
          next[r.code] = untouched ? r : mine;
        }
        return next;
      });
      server.current = Object.fromEntries(fresh.map((r) => [r.code, r]));
    } catch {
      setFailed(true);
      setRules(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (code: string) => {
    const rule = draft[code];
    const was = server.current[code];
    setBusy(code);
    setMessage(null);

    // Only what changed. Sending everything made a save with nothing edited
    // create an override, quietly cutting that clinic off from the default
    // for good — a click with no visible effect and a permanent consequence.
    const body: Record<string, unknown> = {};
    if (!was || rule.active !== was.active) body.active = rule.active;
    if (!was || JSON.stringify(rule.condition) !== JSON.stringify(was.condition)) body.condition = rule.condition;
    if (!was || JSON.stringify(rule.actionData) !== JSON.stringify(was.actionData)) body.actionData = rule.actionData;
    if (Object.keys(body).length === 0) {
      setMessage(ui.nothingChanged);
      setBusy(null);
      return;
    }

    try {
      const res = await fetch(`/api/automation/rules/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      // The server's own words when it refuses — a mistyped placeholder or an
      // operator it does not understand deserves to be read, not swallowed.
      setMessage(res.ok ? ui.saved : data?.error ?? ui.failed);
      await load();
    } finally {
      setBusy(null);
    }
  };

  const reset = async (code: string) => {
    setBusy(code);
    setMessage(null);
    try {
      const res = await fetch(`/api/automation/rules/${code}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setMessage(data?.error ?? ui.failed);
      await load();
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (failed) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CloudOff className="h-8 w-8 text-muted-foreground" />
            <p>{ui.failed}</p>
            <p className="text-sm text-muted-foreground">{ui.failedHint}</p>
            <Button variant="outline" size="sm" onClick={load}>{ui.retry}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="rules-panel">
      <div className="flex items-start gap-3">
        <SlidersHorizontal className="h-6 w-6 text-foreground mt-0.5" />
        <div>
          <h2 className="text-2xl font-semibold">{ui.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{ui.subtitle}</p>
          {!canEdit && <p className="text-sm text-amber-400 mt-1">{ui.readOnly}</p>}
        </div>
      </div>

      {message && (
        <p className="text-sm text-foreground bg-muted/40 border rounded-md px-3 py-2">{message}</p>
      )}

      <div className="space-y-4">
        {rules?.map((r) => {
          const d = draft[r.code] ?? r;
          return (
            <Card key={r.code} data-testid="rule-row">
              <CardContent className="py-4 space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{r.code}</span>
                      {/* Brand green reads at 3.04:1 as text on the dark shell;
                          as a background with white on it, 5.32:1. */}
                      <Badge
                        variant="secondary"
                        className={r.source === "clinic" ? "bg-primary text-primary-foreground" : ""}
                      >
                        {r.source === "clinic" ? ui.fromClinic : ui.fromGlobal}
                      </Badge>
                      <Badge variant="outline">{r.trigger}</Badge>
                      <Badge variant="outline">{r.action}</Badge>
                    </div>
                    <p className="font-medium mt-1">{r.name}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{d.active ? ui.on : ui.off}</span>
                    <Switch
                      checked={d.active}
                      disabled={!canEdit || busy === r.code}
                      onCheckedChange={(v) =>
                        setDraft((s) => ({ ...s, [r.code]: { ...d, active: v } }))
                      }
                    />
                  </div>
                </div>

                {/* The limits, typed per field — not raw JSON for someone to
                    get a comma wrong in. */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{ui.conditionTitle}</p>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(d.condition).map(([fact, expr]) =>
                      typeof expr === "object" && expr !== null && !Array.isArray(expr) ? (
                        Object.entries(expr as Operators).map(([op, bound]) => (
                          <div key={`${fact}.${op}`} className="flex items-center gap-2">
                            <Label className="text-sm">{fact} <span className="text-muted-foreground">{op}</span></Label>
                            <Input
                              type={typeof bound === "number" ? "number" : "text"}
                              className="w-24"
                              value={String(bound)}
                              disabled={!canEdit || busy === r.code}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const next = typeof bound === "number" ? Number(raw) : raw;
                                setDraft((s) => ({
                                  ...s,
                                  [r.code]: {
                                    ...d,
                                    condition: {
                                      ...d.condition,
                                      [fact]: { ...(expr as Operators), [op]: next },
                                    },
                                  },
                                }));
                              }}
                            />
                          </div>
                        ))
                      ) : (
                        <div key={fact} className="flex items-center gap-2">
                          <Label className="text-sm">{fact} =</Label>
                          <Input className="w-32" value={String(expr)} disabled />
                        </div>
                      )
                    )}
                  </div>
                </div>

                {Object.keys(d.actionData).some((k) => k in EDITABLE) && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">{ui.textTitle}</p>
                    {Object.entries(d.actionData)
                      .filter(([k]) => k in EDITABLE)
                      .map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <Label className="text-sm">{key}</Label>
                          {EDITABLE[key] === "priority" ? (
                            // A free-text priority took the whole cron down in
                            // QA. The column is an enum; so is this.
                            <select
                              className="w-40 h-9 rounded-md border bg-background px-3 text-sm"
                              value={String(value)}
                              disabled={!canEdit || busy === r.code}
                              onChange={(e) =>
                                setDraft((s) => ({
                                  ...s,
                                  [r.code]: { ...d, actionData: { ...d.actionData, [key]: e.target.value } },
                                }))
                              }
                            >
                              {PRIORITIES.map((p) => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              value={String(value)}
                              disabled={!canEdit || busy === r.code}
                              onChange={(e) =>
                                setDraft((s) => ({
                                  ...s,
                                  [r.code]: { ...d, actionData: { ...d.actionData, [key]: e.target.value } },
                                }))
                              }
                            />
                          )}
                          {/* Only where there is something to fill, and with the
                              rule's own threshold rather than a made-up 3. */}
                          {typeof value === "string" && value.includes("{") && (
                            <p className="text-xs text-muted-foreground">
                              {ui.previewWith(thresholdOf(d.condition))}: “
                              {interpolate(String(value), { missingItems: thresholdOf(d.condition) })}”
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                )}

                {canEdit && (
                  <div className="flex gap-2">
                    <Button size="sm" disabled={busy === r.code} onClick={() => save(r.code)}>
                      <Save className="h-3.5 w-3.5 mr-1" />
                      {busy === r.code ? ui.saving : ui.save}
                    </Button>
                    {r.source === "clinic" && (
                      <Button size="sm" variant="outline" className="text-foreground" disabled={busy === r.code} onClick={() => reset(r.code)}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />{ui.reset}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
