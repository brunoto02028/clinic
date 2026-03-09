"use client";

import { useState, useEffect } from "react";
import { Clock, Save, Loader2, CheckCircle, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

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
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [slotInterval, setSlotInterval] = useState<30 | 60>(30);
  const { toast } = useToast();

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
      toast({ title: "Schedule saved", description: "Therapist availability has been updated." });
      setTimeout(() => setSaveStatus("idle"), 5000);
    } catch {
      setSaveStatus("error");
      toast({ title: "Error", description: "Failed to save schedule.", variant: "destructive" });
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
          Therapist Availability
        </h1>
        <p className="text-muted-foreground mt-1">
          Set your working hours for each day of the week. Patients will only see available time slots when booking.
        </p>
      </div>

      {/* Slot Interval Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Booking Slot Interval</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Choose how time slots are displayed to patients when booking. For example, if set to 60 minutes, patients will see slots like 16:00, 17:00, 18:00 instead of 16:00, 16:30, 17:00.
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
              <p className="text-xs mt-1">e.g. 16:00, 16:30, 17:00</p>
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
              <p className="text-xs mt-1">e.g. 16:00, 17:00, 18:00</p>
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Weekly Schedule</CardTitle>
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
                  <span className="font-semibold text-foreground">{dayInfo.label}</span>
                </div>

                {/* Time inputs */}
                {day.isAvailable && (
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
                      <Input
                        type="time"
                        value={day.startTime}
                        onChange={(e) => updateDay(day.dayOfWeek, "startTime", e.target.value)}
                        className="w-28 h-9"
                      />
                    </div>
                    <span className="text-muted-foreground">—</span>
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">To</Label>
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
                  <span className="text-sm text-muted-foreground italic">Not available</span>
                )}
              </div>
            );
          })}

          {saveStatus === "success" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mt-4">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">Schedule saved successfully! Patients will now see the updated availability.</span>
            </div>
          )}

          {saveStatus === "error" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 mt-4">
              <span className="text-sm font-medium">Failed to save schedule. Please try again.</span>
            </div>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full gap-2 mt-4">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : saveStatus === "success" ? (
              <>
                <CheckCircle className="h-4 w-4" /> Saved!
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save Schedule
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
