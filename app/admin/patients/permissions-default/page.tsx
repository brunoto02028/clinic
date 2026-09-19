"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Shield, ArrowLeft, Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useVocab } from "@/hooks/use-vocab";
import { useLocale } from "@/hooks/use-locale";
import {
  MODULE_REGISTRY,
  PERMISSION_REGISTRY,
  MODULE_CATEGORIES,
  PERMISSION_CATEGORIES,
} from "@/lib/module-registry";

// Default permissions a brand-new patient of this clinic starts with,
// before any plan/treatment/manual override (activity 62). Deliberately
// simpler than the per-patient permissions screen (app/admin/patients/[id]/
// permissions) — a default only ever GRANTS (checked = included), it never
// hides or locks anything, so a plain checkbox per module/permission is
// enough; the richer hidden/locked vocabulary stays a per-patient concept.
export default function PatientDefaultPermissionsPage() {
  const { relabel } = useVocab();
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const rlabel = (en: string, pt: string) => relabel((isPt ? pt : en) || en || pt);
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/patient-defaults");
      const json = await res.json();
      if (res.ok) {
        setSelected(new Set(Object.keys(json.overrides || {})));
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

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
    setHasChanges(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const overrides = Object.fromEntries(Array.from(selected).map((k) => [k, true]));
      const res = await fetch("/api/admin/patient-defaults", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save");
      toast({ title: "Success", description: "Default permissions saved.", variant: "success" });
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

  const gatedModules = MODULE_REGISTRY.filter((m) => !m.alwaysVisible);

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <Link href="/admin/patients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-3.5 w-3.5" /> {relabel("Back to Patients")}
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" /> {relabel("Default Patient Permissions")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isPt
            ? "O que todo paciente novo já recebe ao se cadastrar, antes de qualquer plano ou pacote. Não afeta pacientes que já existem — só quem se cadastrar depois de salvar aqui."
            : "What every new patient already has as soon as they sign up, before any plan or treatment package. Doesn't affect patients who already exist — only whoever signs up after you save here."}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{isPt ? "Módulos" : "Modules"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {MODULE_CATEGORIES.filter((c) => c.key !== "core").map((cat) => {
            const items = gatedModules.filter((m) => m.category === cat.key);
            if (items.length === 0) return null;
            return (
              <div key={cat.key} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{isPt ? cat.labelPt : cat.label}</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {items.map((m) => (
                    <label key={m.key} className="flex items-start gap-2 rounded-lg border p-2.5 cursor-pointer hover:bg-muted/50">
                      <Checkbox checked={selected.has(m.key)} onCheckedChange={() => toggle(m.key)} className="mt-0.5" />
                      <span>
                        <span className="text-sm font-medium block">{rlabel(m.label, m.labelPt)}</span>
                        <span className="text-xs text-muted-foreground">{isPt ? m.descriptionPt : m.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{isPt ? "Permissões" : "Permissions"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {PERMISSION_CATEGORIES.map((cat) => {
            const items = PERMISSION_REGISTRY.filter((p) => p.category === cat.key);
            if (items.length === 0) return null;
            return (
              <div key={cat.key} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{isPt ? cat.labelPt : cat.label}</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {items.map((p) => (
                    <label key={p.key} className="flex items-start gap-2 rounded-lg border p-2.5 cursor-pointer hover:bg-muted/50">
                      <Checkbox checked={selected.has(p.key)} onCheckedChange={() => toggle(p.key)} className="mt-0.5" />
                      <span>
                        <span className="text-sm font-medium block">{rlabel(p.label, p.labelPt)}</span>
                        <span className="text-xs text-muted-foreground">{p.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving || !hasChanges} className="gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isPt ? "Salvar padrão" : "Save default"}
        </Button>
      </div>
    </div>
  );
}
