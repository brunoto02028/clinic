"use client";

// Lists exercises prescribed to this patient — view, edit sets/reps/frequency, and remove.
import { useState, useEffect, useCallback } from "react";
import { Loader2, Dumbbell, Play, Pencil, Trash2, Save, X, FileVideo, FolderPlus, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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

interface FolderNode {
  id: string;
  name: string;
  exerciseCount: number;
  children?: FolderNode[];
  totalExerciseCount?: number;
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

  // Prescribing a whole folder from here. Until now this tab could only list,
  // edit and remove — adding meant leaving the patient's record for the
  // library and navigating back, so a folder went across one video at a time.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tree, setTree] = useState<FolderNode[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [chosenFolder, setChosenFolder] = useState<{ id: string; name: string; count: number } | null>(null);
  const [folderFrequency, setFolderFrequency] = useState("");
  const [folderNotes, setFolderNotes] = useState("");
  const [prescribing, setPrescribing] = useState(false);

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

  const openPicker = async () => {
    setPickerOpen(true);
    setChosenFolder(null);
    setFolderFrequency("");
    setFolderNotes("");
    if (tree.length > 0) return;
    setLoadingTree(true);
    try {
      const res = await fetch("/api/admin/exercise-folders");
      const data = await res.json();
      setTree(Array.isArray(data.tree) ? data.tree : []);
    } catch {
      toast({ description: "Could not load folders.", variant: "destructive" });
    } finally {
      setLoadingTree(false);
    }
  };

  const prescribeFolder = async () => {
    if (!chosenFolder) return;
    setPrescribing(true);
    try {
      const res = await fetch("/api/admin/exercise-prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          folderId: chosenFolder.id,
          frequency: folderFrequency || null,
          notes: folderNotes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to prescribe");

      // Say plainly what happened: prescribing the same folder twice is a
      // normal thing to do, and silence about the skipped ones reads as a bug.
      const parts = [`${data.count} exercise${data.count === 1 ? "" : "s"} prescribed`];
      if (data.skipped > 0) parts.push(`${data.skipped} already prescribed`);
      toast({ description: `${chosenFolder.name}: ${parts.join(", ")}.` });

      setPickerOpen(false);
      fetchPrescriptions();
    } catch (err: any) {
      toast({ description: err.message || "Failed to prescribe folder.", variant: "destructive" });
    } finally {
      setPrescribing(false);
    }
  };

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

  const picker = (
    <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Prescribe a folder</DialogTitle>
          <DialogDescription>
            Every active exercise in the folder is prescribed at once, using each one&apos;s own
            default sets and reps. Exercises this patient already has are skipped.
          </DialogDescription>
        </DialogHeader>

        {loadingTree ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : tree.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No folders yet. Create them in Clinical → Exercises.
          </p>
        ) : (
          <div className="max-h-[45vh] overflow-y-auto space-y-3 pr-1">
            {tree.map((category) => (
              <div key={category.id}>
                <FolderRow
                  label={category.name}
                  count={category.totalExerciseCount ?? category.exerciseCount}
                  isCategory
                  selected={chosenFolder?.id === category.id}
                  onSelect={() =>
                    setChosenFolder({
                      id: category.id,
                      name: category.name,
                      count: category.totalExerciseCount ?? category.exerciseCount,
                    })
                  }
                />
                <div className="ml-4 mt-1 space-y-1">
                  {(category.children ?? []).map((child) => (
                    <FolderRow
                      key={child.id}
                      label={child.name}
                      count={child.exerciseCount}
                      selected={chosenFolder?.id === child.id}
                      onSelect={() =>
                        setChosenFolder({ id: child.id, name: child.name, count: child.exerciseCount })
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {chosenFolder && chosenFolder.count > 0 && (
          <div className="space-y-2 border-t pt-3">
            <Input
              placeholder="Frequency for the whole folder (e.g. 3x per week)"
              value={folderFrequency}
              onChange={(e) => setFolderFrequency(e.target.value)}
              className="text-sm"
            />
            <Textarea
              placeholder="Notes for the patient (optional)"
              value={folderNotes}
              onChange={(e) => setFolderNotes(e.target.value)}
              className="text-sm min-h-[60px]"
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setPickerOpen(false)} disabled={prescribing}>
            Cancel
          </Button>
          <Button
            onClick={prescribeFolder}
            disabled={!chosenFolder || chosenFolder.count === 0 || prescribing}
            className="gap-2"
          >
            {prescribing && <Loader2 className="h-4 w-4 animate-spin" />}
            {chosenFolder
              ? chosenFolder.count === 0
                ? "Folder is empty"
                : `Prescribe ${chosenFolder.count}`
              : "Select a folder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const header = (
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">
        {prescriptions.length} exercise{prescriptions.length === 1 ? "" : "s"} prescribed
      </p>
      <Button size="sm" onClick={openPicker} className="gap-1.5">
        <FolderPlus className="h-4 w-4" /> Add folder
      </Button>
    </div>
  );

  if (prescriptions.length === 0) {
    return (
      <div className="space-y-4">
        {header}
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <Dumbbell className="h-10 w-10 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">No exercises prescribed yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Use &ldquo;Add folder&rdquo; above to prescribe a whole set at once.
          </p>
        </div>
        {picker}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {header}
      {picker}
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
                  <Input type="number" min="0" list="edit-sets-options" placeholder="Sets" value={edit.sets} onChange={(e) => setEdit((s) => ({ ...s, sets: e.target.value }))} className="h-7 text-xs" />
                  <Input type="number" min="0" list="edit-reps-options" placeholder="Reps" value={edit.reps} onChange={(e) => setEdit((s) => ({ ...s, reps: e.target.value }))} className="h-7 text-xs" />
                  <Input type="number" min="0" list="edit-hold-options" placeholder="Hold(s)" value={edit.holdSeconds} onChange={(e) => setEdit((s) => ({ ...s, holdSeconds: e.target.value }))} className="h-7 text-xs" />
                  <Input type="number" min="0" list="edit-rest-options" placeholder="Rest(s)" value={edit.restSeconds} onChange={(e) => setEdit((s) => ({ ...s, restSeconds: e.target.value }))} className="h-7 text-xs" />
                  <datalist id="edit-sets-options">{["1", "2", "3", "4", "5"].map((v) => <option key={v} value={v} />)}</datalist>
                  <datalist id="edit-reps-options">{["5", "8", "10", "12", "15", "20"].map((v) => <option key={v} value={v} />)}</datalist>
                  <datalist id="edit-hold-options">{["5", "10", "15", "20", "30", "45", "60"].map((v) => <option key={v} value={v} />)}</datalist>
                  <datalist id="edit-rest-options">{["15", "30", "45", "60", "90", "120"].map((v) => <option key={v} value={v} />)}</datalist>
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

/**
 * A category counts everything beneath it, a folder counts what it holds —
 * so the number on the row is always what pressing Prescribe will send.
 */
function FolderRow({
  label,
  count,
  selected,
  isCategory,
  onSelect,
}: {
  label: string;
  count: number;
  selected: boolean;
  isCategory?: boolean;
  onSelect: () => void;
}) {
  const empty = count === 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={empty}
      className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
        selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
      } ${empty ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <Folder className={`h-4 w-4 shrink-0 ${isCategory ? "text-primary" : "text-muted-foreground"}`} />
      <span className={`flex-1 truncate text-sm ${isCategory ? "font-semibold" : ""}`}>{label}</span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {empty ? "empty" : `${count} video${count === 1 ? "" : "s"}`}
      </span>
    </button>
  );
}
