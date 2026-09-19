"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { MessageSquareText, ArrowLeft, Loader2, Save, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/hooks/use-locale";
import { REMINDER_TEMPLATE_TOKENS, type ReminderTemplateType, type ReminderTemplatesJson } from "@/lib/reminder-templates";

// Admin-editable copy for the automated reminders (activity 62, T-5) — same
// precedent as the Terms & Conditions editor (activity 51): empty field =
// keep the hardcoded default, no field is required. Preview here is client-
// side only (sample values substituted for the tokens), never a real send.

const SECTIONS: { key: ReminderTemplateType; title: string; titlePt: string; sample: Record<string, string> }[] = [
  { key: "today", title: "Today reminder", titlePt: "Lembrete de hoje", sample: { items: "Wall Slides, Ice" } },
  { key: "yesterday", title: "Yesterday follow-up", titlePt: "Cobrança de ontem", sample: { items: "Wall Slides, Ice" } },
  { key: "onboarding", title: "Onboarding reminder", titlePt: "Lembrete de cadastro", sample: { items: "Complete your profile, Submit your medical screening" } },
  { key: "weeklyClosing", title: "Weekly closing", titlePt: "Fechamento semanal", sample: { name: "Ana" } },
];

function renderSample(text: string, vars: Record<string, string>): string {
  let out = text;
  for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(v);
  return out;
}

export default function ReminderTemplatesPage() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<ReminderTemplatesJson>({});
  const [hasChanges, setHasChanges] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/reminder-templates");
      const json = await res.json();
      if (res.ok) {
        setTemplates(json.templates || {});
        setHasChanges(false);
      } else {
        toast({ title: "Error", description: json.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to load", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setField = (type: ReminderTemplateType, lang: "en" | "pt", value: string) => {
    setTemplates((prev) => ({ ...prev, [type]: { ...prev[type], [lang]: value } }));
    setHasChanges(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/reminder-templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templates }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");
      setTemplates(json.templates || {});
      toast({ title: "Success", description: isPt ? "Textos salvos." : "Templates saved.", variant: "success" });
      setHasChanges(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <Link href="/admin/patients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-3.5 w-3.5" /> {isPt ? "Voltar" : "Back"}
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <MessageSquareText className="h-5 w-5 text-primary" /> {isPt ? "Textos dos lembretes" : "Reminder templates"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isPt
            ? "Personalize o texto que os lembretes automáticos enviam. Deixe em branco pra usar o texto padrão. A prévia abaixo usa um exemplo, não é um envio real."
            : "Customise the copy the automatic reminders send. Leave blank to use the default text. The preview below uses sample values — it's never a real send."}
        </p>
      </div>

      {SECTIONS.map((section) => {
        const entry = templates[section.key] || {};
        const tokens = REMINDER_TEMPLATE_TOKENS[section.key];
        return (
          <Card key={section.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{isPt ? section.titlePt : section.title}</CardTitle>
              <CardDescription>
                {isPt ? "Tokens disponíveis: " : "Available tokens: "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">{tokens.join(", ")}</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(["en", "pt"] as const).map((lang) => (
                <div key={lang} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium uppercase text-muted-foreground">{lang}</Label>
                    {entry[lang] && (
                      <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-muted-foreground" onClick={() => setField(section.key, lang, "")}>
                        <RotateCcw className="h-3 w-3" /> {isPt ? "Usar padrão" : "Reset to default"}
                      </Button>
                    )}
                  </div>
                  <Textarea
                    value={entry[lang] || ""}
                    onChange={(e) => setField(section.key, lang, e.target.value)}
                    placeholder={isPt ? "(usando o texto padrão)" : "(using the default text)"}
                    rows={3}
                    className="text-sm"
                  />
                  {entry[lang] && (
                    <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2">
                      {renderSample(entry[lang]!, section.sample)}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving || !hasChanges} className="gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isPt ? "Salvar" : "Save"}
        </Button>
      </div>
    </div>
  );
}
