"use client";

// Lists exercises prescribed to this patient — view, edit sets/reps/frequency, and remove.
import { useState, useEffect, useCallback } from "react";
import { Loader2, Dumbbell, Play, Pencil, Trash2, Save, X, FileVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Prescription {
  id: string;
  sets: number | null;
  reps: number | null;
  holdSeconds: number | null;
  restSeconds: number | null;
  frequency: string | null;
  notes: string | null;
  isActive: boolean;
  completedCount: number;
  createdAt: string;
  exercise: {
    id: string;
    name: string;
    bodyRegion: string;
    videoUrl: string | null;
    thumbnailUrl: string | null;
  };
  therapist: { firstName: string; lastName: string };
}

export default function PatientExercisesTab({ patientId }: { patientId: string }) {
  const { toast } = useToast();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ sets: string; reps: string; holdSeconds: string; restSeconds: string; frequency: string; notes: string }>({
    sets: "", reps: "", holdSeconds: "", restSeconds: "", frequency: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/exercise-prescriptions?patientId=${patientId}`);
      const data = await res.json();
      setPrescriptions(data.prescriptions || []);
    } catch (err) {
      console.error("Failed to fetch prescriptions:", err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const startEdit = (p: Prescription) => {
    setEditingId(p.id);
    setEdit({
      sets: p.sets?.toString() || "",
      reps: p.reps?.toString() || "",
      holdSeconds: p.holdSeconds?.toString() || "",
      restSeconds: p.restSeconds?.toString() || "",
      frequency: p.frequency || "",
      notes: p.notes || "",
    });
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/exercise-prescriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          sets: edit.sets ? parseInt(edit.sets) : null,
          reps: edit.reps ? parseInt(edit.reps) : null,
          holdSeconds: edit.holdSeconds ? parseInt(edit.holdSeconds) : null,
          restSeconds: edit.restSeconds ? parseInt(edit.restSeconds) : null,
          frequency: edit.frequency || null,
          notes: edit.notes || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast({ description: "Exercise updated." });
      setEditingId(null);
      fetchPrescriptions();
    } catch (err) {
      toast({ description: "Failed to save changes.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removePrescription = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from this patient's exercises?`)) return;
    try {
      const res = await fetch("/api/admin/exercise-prescriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: false }),
      });
      if (!res.ok) throw new Error("Failed to remove");
      setPrescriptions((prev) => prev.filter((p) => p.id !== id));
      toast({ description: `"${name}" removed.` });
    } catch (err) {
      toast({ description: "Failed to remove exercise.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Dumbbell className="h-10 w-10 text-muted-foreground/20 mb-3" />
        <p className="text-sm text-muted-foreground">No exercises prescribed yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Prescribe exercises from Clinical → Exercises.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {prescriptions.map((p) => (
        <div key={p.id} className="border rounded-lg p-3 flex items-start gap-3">
          <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden">
            {p.exercise.thumbnailUrl ? (
              <img src={p.exercise.thumbnailUrl} alt={p.exercise.name} className="w-full h-full object-cover" />
            ) : (
              <FileVideo className="h-6 w-6 text-muted-foreground/40" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-sm">{p.exercise.name}</p>
              <div className="flex items-center gap-1 shrink-0">
                {p.exercise.videoUrl && (
                  <a href={p.exercise.videoUrl} target="_blank" rel="noreferrer">
                    <Button variant="ghost" size="icon" className="h-7 w-7"><Play className="h-3.5 w-3.5" /></Button>
                  </a>
                )}
                {editingId === p.id ? (
                  <>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" disabled={saving} onClick={() => saveEdit(p.id)}>
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(p)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removePrescription(p.id, p.exercise.name)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {editingId === p.id ? (
              <div className="mt-2 space-y-2">
                <div className="grid grid-cols-4 gap-1.5">
                  <Input type="number" min="0" placeholder="Sets" value={edit.sets} onChange={(e) => setEdit((s) => ({ ...s, sets: e.target.value }))} className="h-7 text-xs" />
                  <Input type="number" min="0" placeholder="Reps" value={edit.reps} onChange={(e) => setEdit((s) => ({ ...s, reps: e.target.value }))} className="h-7 text-xs" />
                  <Input type="number" min="0" placeholder="Hold(s)" value={edit.holdSeconds} onChange={(e) => setEdit((s) => ({ ...s, holdSeconds: e.target.value }))} className="h-7 text-xs" />
                  <Input type="number" min="0" placeholder="Rest(s)" value={edit.restSeconds} onChange={(e) => setEdit((s) => ({ ...s, restSeconds: e.target.value }))} className="h-7 text-xs" />
                </div>
                <Input placeholder="Frequency (e.g. 3x per week)" value={edit.frequency} onChange={(e) => setEdit((s) => ({ ...s, frequency: e.target.value }))} className="h-7 text-xs" />
                <Textarea placeholder="Notes for patient..." value={edit.notes} onChange={(e) => setEdit((s) => ({ ...s, notes: e.target.value }))} className="text-xs min-h-14" />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                {[
                  p.sets && `${p.sets} sets`,
                  p.reps && `${p.reps} reps`,
                  p.holdSeconds && `${p.holdSeconds}s hold`,
                  p.restSeconds && `${p.restSeconds}s rest`,
                  p.frequency,
                ].filter(Boolean).join(" · ") || "No sets/reps set"}
              </p>
            )}

            <p className="text-[10px] text-muted-foreground mt-1">
              Prescribed by {p.therapist.firstName} · {p.completedCount > 0 ? `Completed ${p.completedCount}x` : "Not completed yet"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
