"use client";

import { useState, useEffect } from "react";
import { Clock, Save, Loader2, CheckCircle, ToggleLeft, ToggleRight, CalendarOff, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useLocale } from "@/hooks/use-locale";

interface TherapistBlock {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  blockType: string;
}

const BLOCK_TYPES = [
  { value: "ABSENCE", label: "Absence", labelPt: "Ausência" },
  { value: "VACATION", label: "Vacation", labelPt: "Férias" },
  { value: "TRAINING", label: "Training", labelPt: "Treinamento" },
  { value: "OTHER", label: "Other", labelPt: "Outro" },
];

const DAYS = [
  { value: 0, label: "Sunday", labelPt: "Domingo" },
  { value: 1, label: "Monday", labelPt: "Segunda-feira" },
  { value: 2, label: "Tuesday", labelPt: "Terça-feira" },
  { value: 3, label: "Wednesday", labelPt: "Quarta-feira" },
  { value: 4, label: "Thursday", labelPt: "Quinta-feira" },
  { value: 5, label: "Friday", labelPt: "Sexta-feira" },
  { value: 6, label: "Saturday", labelPt: "Sábado" },
];

interface DaySchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

const DEFAULT_SCHEDULE: DaySchedule[] = DAYS.map((d) => ({
  dayOfWeek: d.value,
  startTime: "09:00",
  endTime: "17:00",
  isAvailable: d.value !== 0 && d.value !== 6, // Mon-Fri by default
}));

export default function AvailabilityPage() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [slotInterval, setSlotInterval] = useState<30 | 60>(30);
  const { toast } = useToast();

  const [blocks, setBlocks] = useState<TherapistBlock[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(true);
  const [addingBlock, setAddingBlock] = useState(false);
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockType, setBlockType] = useState("ABSENCE");

  const fetchBlocks = () => {
    setBlocksLoading(true);
    fetch("/api/admin/calendar/blocks")
      .then((r) => r.json())
      .then((data) => setBlocks(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setBlocksLoading(false));
  };

  useEffect(() => {
    fetchBlocks();
  }, []);

  const handleAddBlock = async () => {
    if (!blockStart || !blockEnd) return;
    setAddingBlock(true);
    try {
      const res = await fetch("/api/admin/calendar/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: blockStart, endDate: blockEnd, reason: blockReason || null, blockType }),
      });
      if (!res.ok) throw new Error("Failed to add block");
      setBlockStart("");
      setBlockEnd("");
      setBlockReason("");
      setBlockType("ABSENCE");
      fetchBlocks();
      toast({
        title: isPt ? "Data bloqueada" : "Date blocked",
        description: isPt ? "Os pacientes não verão mais horários disponíveis nesse período." : "Patients will no longer see available slots in that period.",
      });
    } catch {
      toast({
        title: isPt ? "Erro" : "Error",
        description: isPt ? "Falha ao bloquear a data." : "Failed to block the date.",
        variant: "destructive",
      });
    } finally {
      setAddingBlock(false);
    }
  };

  const handleDeleteBlock = async (id: string) => {
    try {
      const res = await fetch("/api/admin/calendar/blocks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete block");
      setBlocks((prev) => prev.filter((b) => b.id !== id));
    } catch {
      toast({
        title: isPt ? "Erro" : "Error",
        description: isPt ? "Falha ao remover o bloqueio." : "Failed to remove the block.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetch("/api/admin/availability")
      .then((r) => r.json())
      .then((data) => {
        if (data.availability && data.availability.length > 0) {
          const merged = DEFAULT_SCHEDULE.map((def) => {
            const existing = data.availability.find((a: DaySchedule) => a.dayOfWeek === def.dayOfWeek);
            return existing
              ? { dayOfWeek: existing.dayOfWeek, startTime: existing.startTime, endTime: existing.endTime, isAvailable: existing.isAvailable }
              : def;
          });
          setSchedule(merged);
        }
        if (data.slotInterval) setSlotInterval(data.slotInterval === 60 ? 60 : 30);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateDay = (dayOfWeek: number, field: keyof DaySchedule, value: any) => {
    setSchedule((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule, slotInterval }),
      });

      if (!res.ok) throw new Error("Failed to save");

      setSaveStatus("success");
      toast({
        title: isPt ? "Agenda salva" : "Schedule saved",
        description: isPt ? "A disponibilidade do terapeuta foi atualizada." : "Therapist availability has been updated.",
      });
      setTimeout(() => setSaveStatus("idle"), 5000);
    } catch {
      setSaveStatus("error");
      toast({
        title: isPt ? "Erro" : "Error",
        description: isPt ? "Falha ao salvar a agenda." : "Failed to save schedule.",
        variant: "destructive",
      });
      setTimeout(() => setSaveStatus("idle"), 5000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Clock className="h-6 w-6 text-primary" />
          {isPt ? "Disponibilidade do Terapeuta" : "Therapist Availability"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isPt
            ? "Defina seu horário de trabalho para cada dia da semana. Os pacientes só verão os horários disponíveis ao agendar."
            : "Set your working hours for each day of the week. Patients will only see available time slots when booking."}
        </p>
      </div>

      {/* Slot Interval Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{isPt ? "Intervalo dos Horários de Agendamento" : "Booking Slot Interval"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            {isPt
              ? "Escolha como os horários são exibidos aos pacientes ao agendar. Por exemplo, se definido para 60 minutos, os pacientes verão horários como 16:00, 17:00, 18:00 em vez de 16:00, 16:30, 17:00."
              : "Choose how time slots are displayed to patients when booking. For example, if set to 60 minutes, patients will see slots like 16:00, 17:00, 18:00 instead of 16:00, 16:30, 17:00."}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setSlotInterval(30)}
              className={`flex-1 p-4 rounded-lg border-2 text-center transition-all ${
                slotInterval === 30
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-white/10 hover:border-primary/50 text-muted-foreground"
              }`}
            >
              <p className="font-bold text-lg">30 min</p>
              <p className="text-xs mt-1">{isPt ? "ex.: 16:00, 16:30, 17:00" : "e.g. 16:00, 16:30, 17:00"}</p>
            </button>
            <button
              type="button"
              onClick={() => setSlotInterval(60)}
              className={`flex-1 p-4 rounded-lg border-2 text-center transition-all ${
                slotInterval === 60
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-white/10 hover:border-primary/50 text-muted-foreground"
              }`}
            >
              <p className="font-bold text-lg">60 min</p>
              <p className="text-xs mt-1">{isPt ? "ex.: 16:00, 17:00, 18:00" : "e.g. 16:00, 17:00, 18:00"}</p>
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{isPt ? "Agenda Semanal" : "Weekly Schedule"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {schedule.map((day) => {
            const dayInfo = DAYS.find((d) => d.value === day.dayOfWeek)!;
            return (
              <div
                key={day.dayOfWeek}
                className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border transition-colors ${
                  day.isAvailable
                    ? "border-primary/20 bg-primary/5"
                    : "border-white/5 bg-muted/20 opacity-60"
                }`}
              >
                {/* Day name + toggle */}
                <div className="flex items-center gap-3 sm:w-44">
                  <button
                    type="button"
                    onClick={() => updateDay(day.dayOfWeek, "isAvailable", !day.isAvailable)}
                    className="shrink-0"
                  >
                    {day.isAvailable ? (
                      <ToggleRight className="h-6 w-6 text-primary" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                    )}
                  </button>
                  <span className="font-semibold text-foreground">{isPt ? dayInfo.labelPt : dayInfo.label}</span>
                </div>

                {/* Time inputs */}
                {day.isAvailable && (
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">{isPt ? "De" : "From"}</Label>
                      <Input
                        type="time"
                        value={day.startTime}
                        onChange={(e) => updateDay(day.dayOfWeek, "startTime", e.target.value)}
                        className="w-28 h-9"
                      />
                    </div>
                    <span className="text-muted-foreground">—</span>
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">{isPt ? "Até" : "To"}</Label>
                      <Input
                        type="time"
                        value={day.endTime}
                        onChange={(e) => updateDay(day.dayOfWeek, "endTime", e.target.value)}
                        className="w-28 h-9"
                      />
                    </div>
                  </div>
                )}

                {!day.isAvailable && (
                  <span className="text-sm text-muted-foreground italic">{isPt ? "Indisponível" : "Not available"}</span>
                )}
              </div>
            );
          })}

          {saveStatus === "success" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mt-4">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">
                {isPt ? "Agenda salva com sucesso! Os pacientes já verão a disponibilidade atualizada." : "Schedule saved successfully! Patients will now see the updated availability."}
              </span>
            </div>
          )}

          {saveStatus === "error" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 mt-4">
              <span className="text-sm font-medium">{isPt ? "Falha ao salvar a agenda. Tente novamente." : "Failed to save schedule. Please try again."}</span>
            </div>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full gap-2 mt-4">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {isPt ? "Salvando..." : "Saving..."}
              </>
            ) : saveStatus === "success" ? (
              <>
                <CheckCircle className="h-4 w-4" /> {isPt ? "Salvo!" : "Saved!"}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> {isPt ? "Salvar Agenda" : "Save Schedule"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Blocked Dates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarOff className="h-5 w-5 text-primary" />
            {isPt ? "Datas Bloqueadas" : "Blocked Dates"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {isPt
              ? "Bloqueie feriados, férias ou dias de ausência. Pacientes não verão nenhum horário disponível nesse período."
              : "Block holidays, vacation or absence days. Patients won't see any available slots during that period."}
          </p>

          {/* Add block form */}
          <div className="p-4 rounded-lg border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-1.5 flex-1">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">{isPt ? "De" : "From"}</Label>
                <Input type="date" value={blockStart} onChange={(e) => setBlockStart(e.target.value)} className="h-9" />
              </div>
              <div className="flex items-center gap-1.5 flex-1">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">{isPt ? "Até" : "To"}</Label>
                <Input type="date" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} className="h-9" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={blockType}
                onChange={(e) => setBlockType(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm sm:w-40"
              >
                {BLOCK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{isPt ? t.labelPt : t.label}</option>
                ))}
              </select>
              <Input
                type="text"
                placeholder={isPt ? "Motivo (opcional)" : "Reason (optional)"}
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="h-9 flex-1"
              />
              <Button onClick={handleAddBlock} disabled={addingBlock || !blockStart || !blockEnd} size="sm" className="gap-1.5 shrink-0">
                {addingBlock ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {isPt ? "Bloquear" : "Block"}
              </Button>
            </div>
          </div>

          {/* Existing blocks list */}
          {blocksLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-2">
              {isPt ? "Nenhuma data bloqueada." : "No blocked dates."}
            </p>
          ) : (
            <div className="space-y-2">
              {blocks.map((b) => {
                const typeInfo = BLOCK_TYPES.find((t) => t.value === b.blockType);
                const start = new Date(b.startDate).toLocaleDateString(isPt ? "pt-BR" : "en-GB", { day: "2-digit", month: "short", year: "numeric" });
                const end = new Date(b.endDate).toLocaleDateString(isPt ? "pt-BR" : "en-GB", { day: "2-digit", month: "short", year: "numeric" });
                return (
                  <div key={b.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-white/10 bg-muted/20">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {start === end ? start : `${start} — ${end}`}
                        <span className="ml-2 text-xs text-muted-foreground">({isPt ? typeInfo?.labelPt : typeInfo?.label})</span>
                      </p>
                      {b.reason && <p className="text-xs text-muted-foreground mt-0.5">{b.reason}</p>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteBlock(b.id)} className="text-red-400 hover:text-red-300 shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
