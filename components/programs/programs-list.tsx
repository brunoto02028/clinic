"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Copy, Trash2, Loader2, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useLocale } from "@/hooks/use-locale";

interface TemplateSummary {
  id: string;
  name: string;
  description: string | null;
  weeks: number;
  dayCount: number;
  exerciseCount: number;
  updatedAt: string;
}

export default function ProgramsList() {
  const { locale } = useLocale();
  const isPt = locale?.startsWith("pt");
  const t = (en: string, pt: string) => (isPt ? pt : en);

  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newWeeks, setNewWeeks] = useState("4");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setError("");
    try {
      const r = await fetch("/api/admin/workout-templates");
      if (!r.ok) throw new Error(String(r.status));
      setTemplates(await r.json());
    } catch {
      setError(t("Could not load programs.", "Não foi possível carregar os programas."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createTemplate() {
    if (!newName.trim()) {
      setCreateError(t("Give the program a name.", "Dê um nome ao programa."));
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const r = await fetch("/api/admin/workout-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), weeks: Number(newWeeks) }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || String(r.status));
      setCreateOpen(false);
      setNewName("");
      setNewWeeks("4");
      window.location.href = `/admin/training-programs/${data.id}`;
    } catch (e: any) {
      setCreateError(e?.message || t("Could not create the program.", "Não foi possível criar o programa."));
    } finally {
      setCreating(false);
    }
  }

  async function duplicate(id: string) {
    setBusyId(id);
    try {
      const r = await fetch(`/api/admin/workout-templates/${id}/duplicate`, { method: "POST" });
      if (!r.ok) throw new Error(String(r.status));
      await load();
    } catch {
      setError(t("Could not duplicate.", "Não foi possível duplicar."));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm(t("Delete this program? Students already assigned keep their workouts.", "Excluir este programa? Alunos já atribuídos mantêm os treinos deles."))) return;
    setBusyId(id);
    try {
      const r = await fetch(`/api/admin/workout-templates/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(String(r.status));
      await load();
    } catch {
      setError(t("Could not delete.", "Não foi possível excluir."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("Programs", "Programas")}</h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "Reusable, multi-week workout programs you can assign to many students at once.",
              "Programas de treino multi-semana reutilizáveis, atribuíveis a vários alunos de uma vez."
            )}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2" data-testid="program-new">
          <Plus className="h-4 w-4" /> {t("New program", "Novo programa")}
        </Button>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("Loading…", "Carregando…")}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed p-10 text-sm text-muted-foreground">
          <CalendarRange className="h-8 w-8" />
          {t("No programs yet.", "Nenhum programa ainda.")}
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="flex items-center justify-between gap-3 rounded-md border p-3"
              data-testid="program-row"
            >
              <Link href={`/admin/training-programs/${tpl.id}`} className="min-w-0 flex-1">
                <p className="truncate font-medium">{tpl.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t(`${tpl.weeks} week${tpl.weeks > 1 ? "s" : ""}`, `${tpl.weeks} semana${tpl.weeks > 1 ? "s" : ""}`)}
                  {" · "}
                  {t(`${tpl.exerciseCount} exercises`, `${tpl.exerciseCount} exercícios`)}
                </p>
              </Link>
              <div className="flex items-center gap-1">
                <button
                  title={t("Duplicate", "Duplicar")}
                  onClick={() => duplicate(tpl.id)}
                  disabled={busyId === tpl.id}
                  className="p-2 hover:text-primary disabled:opacity-50"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  title={t("Delete", "Excluir")}
                  onClick={() => remove(tpl.id)}
                  disabled={busyId === tpl.id}
                  className="p-2 hover:text-red-500 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("New program", "Novo programa")}</DialogTitle>
          </DialogHeader>
          {createError && <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{createError}</div>}
          <div className="space-y-3">
            <div>
              <Label htmlFor="program-name">{t("Name", "Nome")}</Label>
              <Input id="program-name" value={newName} onChange={(e) => setNewName(e.target.value)} data-testid="program-name-input" />
            </div>
            <div>
              <Label htmlFor="program-weeks">{t("Weeks", "Semanas")}</Label>
              <Input
                id="program-weeks"
                type="number"
                min={1}
                max={12}
                value={newWeeks}
                onChange={(e) => setNewWeeks(e.target.value)}
                data-testid="program-weeks-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createTemplate} disabled={creating} className="gap-2" data-testid="program-create-confirm">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {t("Create", "Criar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
