"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, CalendarDays, CalendarOff, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useLocale } from "@/hooks/use-locale";

/**
 * A agenda que a clínica escreve.
 *
 * Antes disto a semana era **uma janela por dia**, com capacidade 1 sempre —
 * "manhã de consulta, tarde de tratamento" não tinha como ser dito, e uma
 * sessão em grupo, muito menos.
 *
 * Aqui as regras são dados: quantas janelas quiser por dia, o que cada uma
 * atende, quantos cabem, e de quanto em quanto um horário abre. O que a tela
 * **não** deixa fazer é sobrepor duas janelas — o servidor recusa, e é a única
 * regra que não é preferência: consulta e tratamento disputam a mesma sala.
 */

interface Window {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  kind: "CONSULTATION" | "TREATMENT";
  capacity: number;
  slotMinutes: number;
}

interface Exception {
  id: string;
  date: string;
  closed: boolean;
  startTime: string | null;
  endTime: string | null;
  note: string | null;
}

const DIAS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DIAS_PT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const PASSOS = [15, 20, 30, 45, 60, 90];

export default function ScheduleWindowsEditor() {
  const { locale } = useLocale();
  const isPt = String(locale).toLowerCase().startsWith("pt");
  const { toast } = useToast();

  // Sem escolher de quem é a agenda, um admin que não atende via os sete dias
  // como "Not working" — configurando a própria agenda, que ninguém marca
  // (QA de 25/09). O terapeuta continua caindo em si mesmo por padrão.
  const [terapeutas, setTerapeutas] = useState<{ id: string; name: string }[]>([]);
  const [terapeutaId, setTerapeutaId] = useState<string>("");
  const [windows, setWindows] = useState<Window[] | null>(null);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [diaAberto, setDiaAberto] = useState<number | null>(null);

  const [nova, setNova] = useState({
    startTime: "09:00",
    endTime: "13:00",
    kind: "CONSULTATION" as Window["kind"],
    capacity: 1,
    slotMinutes: 60,
  });
  const [excecao, setExcecao] = useState({ date: "", closed: true, startTime: "", endTime: "", note: "" });

  useEffect(() => {
    fetch("/api/therapists", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        const lista = (d.therapists || d || []).map((t: any) => ({
          id: t.id,
          name: `${t.firstName ?? ""} ${t.lastName ?? ""}`.trim() || t.email,
        }));
        setTerapeutas(lista);
      })
      .catch(() => setTerapeutas([]));
  }, []);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(
        `/api/admin/schedule${terapeutaId ? `?therapistId=${terapeutaId}` : ""}`,
        { cache: "no-store" }
      );
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      setWindows(d.windows || []);
      setExceptions(d.exceptions || []);
    } catch {
      setWindows([]);
      toast({
        title: isPt ? "Não foi possível carregar a agenda" : "Could not load the schedule",
        variant: "destructive",
      });
    }
  }, [isPt, toast, terapeutaId]);

  useEffect(() => { void carregar(); }, [carregar]);

  const criar = async (dayOfWeek: number) => {
    setSalvando(true);
    try {
      const r = await fetch("/api/admin/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayOfWeek, therapistId: terapeutaId || undefined, ...nova }),
      });
      const d = await r.json();
      if (!r.ok) {
        // A recusa de sobreposição vem com o horário da janela que conflita —
        // dizer só "inválido" mandaria a pessoa procurar sozinha.
        throw new Error((isPt && d.errorPt) || d.error || "failed");
      }
      setDiaAberto(null);
      await carregar();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  const apagar = async (id: string) => {
    await fetch("/api/admin/schedule", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await carregar();
  };

  const criarExcecao = async () => {
    if (!excecao.date) return;
    setSalvando(true);
    try {
      const r = await fetch("/api/admin/schedule/exceptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(excecao),
      });
      const d = await r.json();
      if (!r.ok) throw new Error((isPt && d.errorPt) || d.error || "failed");
      setExcecao({ date: "", closed: true, startTime: "", endTime: "", note: "" });
      await carregar();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  const apagarExcecao = async (id: string) => {
    await fetch("/api/admin/schedule/exceptions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await carregar();
  };

  if (windows === null) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const dias = isPt ? DIAS_PT : DIAS_EN;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {isPt ? "Janelas de atendimento" : "Booking windows"}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {isPt
              ? "Quantas quiser por dia. Consulta é um a um; tratamento pode ter mais de um paciente junto. A capacidade é de quem está na sala ao mesmo tempo — 14h às 18h com 4 são 4 pessoas às 14h e outras 4 às 15h."
              : "As many a day as you like. A consultation is one to one; treatment can hold more than one patient at once. Capacity is who is in the room at the same time — 14:00–18:00 with 4 is four people at 14:00 and another four at 15:00."}
          </p>
          {terapeutas.length > 1 && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">
                {isPt ? "Agenda de:" : "Diary of:"}
              </span>
              <select
                value={terapeutaId}
                onChange={(e) => setTerapeutaId(e.target.value)}
                className="h-8 rounded-md border border-border bg-background px-2 text-xs"
              >
                <option value="">{isPt ? "A minha" : "Mine"}</option>
                {terapeutas.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {windows.length === 0 && (
            <p className="text-xs rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 mt-1">
              {isPt
                ? "Enquanto não houver nenhuma janela aqui, vale a agenda semanal antiga, abaixo — uma faixa por dia, um paciente por horário."
                : "Until there is a window here, the old weekly schedule below applies — one range a day, one patient per slot."}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {dias.map((nomeDia, dia) => {
            const doDia = windows.filter((w) => w.dayOfWeek === dia);
            return (
              <div key={dia} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{nomeDia}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDiaAberto(diaAberto === dia ? null : dia)}
                    className="gap-1.5 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {isPt ? "Janela" : "Window"}
                  </Button>
                </div>

                {doDia.length === 0 ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    {isPt ? "Sem atendimento." : "Not working."}
                  </p>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    {doDia.map((w) => (
                      <div key={w.id} className="flex items-center gap-2 text-xs rounded-lg bg-muted/50 px-2.5 py-2">
                        {w.kind === "CONSULTATION" ? (
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        ) : (
                          <Users className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        )}
                        <span className="font-medium">{w.startTime}–{w.endTime}</span>
                        <span className="text-muted-foreground">
                          {w.kind === "CONSULTATION"
                            ? isPt ? "consulta" : "consultation"
                            : isPt ? "tratamento" : "treatment"}
                          {" · "}
                          {w.capacity === 1
                            ? isPt ? "1 paciente" : "1 patient"
                            : isPt ? `até ${w.capacity} juntos` : `up to ${w.capacity} together`}
                          {" · "}
                          {isPt ? `de ${w.slotMinutes} em ${w.slotMinutes} min` : `every ${w.slotMinutes} min`}
                        </span>
                        <button
                          onClick={() => void apagar(w.id)}
                          className="ml-auto text-muted-foreground hover:text-destructive shrink-0"
                          aria-label={isPt ? "Remover janela" : "Remove window"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {diaAberto === dia && (
                  <div className="mt-3 rounded-lg border border-border bg-background p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        type="time"
                        value={nova.startTime}
                        onChange={(e) => setNova({ ...nova, startTime: e.target.value })}
                        className="h-8 w-28 text-xs"
                      />
                      <span className="text-xs text-muted-foreground">–</span>
                      <Input
                        type="time"
                        value={nova.endTime}
                        onChange={(e) => setNova({ ...nova, endTime: e.target.value })}
                        className="h-8 w-28 text-xs"
                      />
                      <select
                        value={nova.kind}
                        onChange={(e) => {
                          const kind = e.target.value as Window["kind"];
                          // Consulta volta para 1: avaliação é um a um, e
                          // deixar 4 ali seria um engano de um clique.
                          setNova({ ...nova, kind, capacity: kind === "CONSULTATION" ? 1 : nova.capacity });
                        }}
                        className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                      >
                        <option value="CONSULTATION">{isPt ? "Consulta" : "Consultation"}</option>
                        <option value="TREATMENT">{isPt ? "Tratamento" : "Treatment"}</option>
                      </select>
                      <select
                        value={nova.capacity}
                        onChange={(e) => setNova({ ...nova, capacity: Number(e.target.value) })}
                        disabled={nova.kind === "CONSULTATION"}
                        className="h-8 rounded-md border border-border bg-background px-2 text-xs disabled:opacity-50"
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n} {isPt ? (n === 1 ? "paciente" : "juntos") : n === 1 ? "patient" : "together"}
                          </option>
                        ))}
                      </select>
                      <select
                        value={nova.slotMinutes}
                        onChange={(e) => setNova({ ...nova, slotMinutes: Number(e.target.value) })}
                        className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                      >
                        {PASSOS.map((p) => (
                          <option key={p} value={p}>{p} min</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => void criar(dia)} disabled={salvando}>
                        {salvando && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                        {isPt ? "Adicionar" : "Add"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDiaAberto(null)}>
                        {isPt ? "Cancelar" : "Cancel"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarOff className="h-5 w-5" />
            {isPt ? "Dias que fogem da semana" : "Days that break the week"}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {isPt
              ? "Feriado, férias, ou um dia mais curto. Fechar apaga as janelas do dia; encurtar apara as janelas em vez de apagá-las."
              : "A holiday, time off, or an early finish. Closing removes the day's windows; shortening trims them instead of deleting them."}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={excecao.date}
              onChange={(e) => setExcecao({ ...excecao, date: e.target.value })}
              className="h-8 w-40 text-xs"
              min={new Date().toISOString().slice(0, 10)}
            />
            <select
              value={excecao.closed ? "closed" : "short"}
              onChange={(e) => setExcecao({ ...excecao, closed: e.target.value === "closed" })}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs"
            >
              <option value="closed">{isPt ? "Fechado" : "Closed"}</option>
              <option value="short">{isPt ? "Horário reduzido" : "Shorter day"}</option>
            </select>
            {!excecao.closed && (
              <>
                <Input
                  type="time"
                  value={excecao.startTime}
                  onChange={(e) => setExcecao({ ...excecao, startTime: e.target.value })}
                  className="h-8 w-28 text-xs"
                  placeholder={isPt ? "de" : "from"}
                />
                <Input
                  type="time"
                  value={excecao.endTime}
                  onChange={(e) => setExcecao({ ...excecao, endTime: e.target.value })}
                  className="h-8 w-28 text-xs"
                  placeholder={isPt ? "até" : "to"}
                />
              </>
            )}
            <Input
              value={excecao.note}
              onChange={(e) => setExcecao({ ...excecao, note: e.target.value })}
              placeholder={isPt ? "Motivo (opcional)" : "Reason (optional)"}
              className="h-8 w-44 text-xs"
            />
            <Button size="sm" onClick={() => void criarExcecao()} disabled={salvando || !excecao.date}>
              {isPt ? "Adicionar" : "Add"}
            </Button>
          </div>

          {exceptions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {isPt ? "Nenhum dia marcado à frente." : "No days marked ahead."}
            </p>
          ) : (
            <div className="space-y-1.5">
              {exceptions.map((e) => (
                <div key={e.id} className="flex items-center gap-2 text-xs rounded-lg bg-muted/50 px-2.5 py-2">
                  <span className="font-medium">
                    {new Date(`${e.date}T12:00:00`).toLocaleDateString(isPt ? "pt-BR" : "en-GB", {
                      weekday: "short", day: "2-digit", month: "short",
                    })}
                  </span>
                  <span className="text-muted-foreground">
                    {e.closed
                      ? isPt ? "fechado" : "closed"
                      : `${e.startTime || "—"}–${e.endTime || "—"}`}
                    {e.note ? ` · ${e.note}` : ""}
                  </span>
                  <button
                    onClick={() => void apagarExcecao(e.id)}
                    className="ml-auto text-muted-foreground hover:text-destructive"
                    aria-label={isPt ? "Remover" : "Remove"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
