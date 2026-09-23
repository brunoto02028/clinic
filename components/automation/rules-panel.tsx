"use client";

import { useCallback, useEffect, useState } from "react";
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
    preview: "On a patient with 3 missing activities",
    readOnly: "Only an administrator can change these.",
    saved: "Saved. It applies on the next run.",
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
    preview: "Num paciente com 3 atividades não feitas",
    readOnly: "Só um administrador pode mudar estas regras.",
    saved: "Salvo. Vale na próxima execução.",
  },
} as const;

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

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch("/api/automation/rules");
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setRules(data.rules ?? []);
      setCanEdit(!!data.canEdit);
      setDraft(Object.fromEntries((data.rules ?? []).map((r: Rule) => [r.code, r])));
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
    setBusy(code);
    setMessage(null);
    try {
      const res = await fetch(`/api/automation/rules/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active: rule.active,
          condition: rule.condition,
          actionData: rule.actionData,
        }),
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
                      <Badge variant={r.source === "clinic" ? "default" : "secondary"}>
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

                {Object.entries(d.actionData).some(([, v]) => typeof v === "string") && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">{ui.textTitle}</p>
                    {Object.entries(d.actionData)
                      .filter(([, v]) => typeof v === "string")
                      .map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <Label className="text-sm">{key}</Label>
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
                          {/* What it will actually read once the facts are in. */}
                          <p className="text-xs text-muted-foreground">
                            {ui.preview}: “{interpolate(String(value), { missingItems: 3 })}”
                          </p>
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
                      <Button size="sm" variant="outline" disabled={busy === r.code} onClick={() => reset(r.code)}>
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
