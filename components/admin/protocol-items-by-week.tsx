"use client";

// Protocol items on the patient's Protocol tab, grouped by week the same way
// the patient's own Treatment Plan groups them, so the therapist can release
// or hide a whole week at once and add/edit items per week (activity 44).
import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Save, Pencil, Eye, EyeOff, Copy, Trash2, ChevronDown, ChevronUp, Video, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { groupItems, groupKey, hiddenAfterMove, parseKey, patientCanSee, protocolGated, visibleSummary, weekLabel } from "@/lib/protocol-weeks";

// Must match the ProtocolPhase enum — anything else fails the Prisma write.
const PHASES = ["SHORT_TERM", "MEDIUM_TERM", "LONG_TERM"];
const ITEM_TYPES: Record<string, string> = {
  HOME_EXERCISE: "Home exercise",
  HOME_CARE: "Self-care",
  IN_CLINIC: "In-clinic session",
  ASSESSMENT: "Assessment",
};

type LinkedExercise = { id: string; name: string; videoUrl?: string | null } | null;

export default function ProtocolItemsByWeek({ patientId, protocol, onChanged, flash, onError }: {
  patientId: string;
  protocol: any;
  onChanged: () => void;
  flash: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const items: any[] = protocol.items || [];
  const rtw: number | null = protocol.releasedThroughWeek ?? null;
  // Released items still don't reach the patient until the protocol is sent and paid.
  const gated = protocolGated(protocol);
  const [busy, setBusy] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [formError, setFormError] = useState("");
  const [linked, setLinked] = useState<LinkedExercise>(null);
  const [originalExerciseId, setOriginalExerciseId] = useState<string | null>(null);
  const [originalKey, setOriginalKey] = useState("");
  const [newWeek, setNewWeek] = useState({ start: "", end: "" });

  const { groups, keys } = groupItems(items);

  const request = async (body: any): Promise<{ ok: boolean; data: any }> => {
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/protocol`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocolId: protocol.id, ...body }),
      });
      return { ok: res.ok, data: await res.json().catch(() => ({})) };
    } catch (err: any) {
      return { ok: false, data: { error: err.message } };
    }
  };

  const patch = async (body: any) => {
    const r = await request(body);
    if (!r.ok) { onError(r.data?.error || "Request failed"); return null; }
    return r.data;
  };

  const isOpen = (key: string) =>
    open[key] ?? (groups[key].some((i) => patientCanSee(i, rtw)) || groups[key].some((i) => i.id === editId));

  const setWeekHidden = async (key: string, hidden: boolean) => {
    setBusy("week-" + key);
    const { start, end } = parseKey(key);
    const label = weekLabel(start, end);
    const r = await patch({ bulkHidden: { itemIds: groups[key].map((i) => i.id), hidden } });
    if (r) {
      flash(
        hidden ? `${label} hidden from the patient`
        : rtw != null && start > rtw ? `${label} released, but the patient won't see it until the release limit (week ${rtw}) reaches it`
        : `${label} released to the patient`
      );
      onChanged();
    }
    setBusy("");
  };

  const startEdit = (item: any) => {
    setEditId(item.id);
    setFormError("");
    setForm({
      title: item.title || "",
      phase: item.phase || "SHORT_TERM",
      itemType: item.itemType || "HOME_EXERCISE",
      startWeek: String(item.startWeek || 1),
      endWeek: item.endWeek == null ? "" : String(item.endWeek),
      frequency: item.frequency || "",
      sets: item.sets ?? "",
      reps: item.reps ?? "",
      holdSeconds: item.holdSeconds ?? "",
      description: item.description || "",
      instructions: item.instructions || "",
    });
    setLinked(item.exercise ? { id: item.exercise.id, name: item.exercise.name, videoUrl: item.exercise.videoUrl } : null);
    setOriginalExerciseId(item.exerciseId || item.exercise?.id || null);
    setOriginalKey(groupKey(item));
  };

  const toInt = (v: any) => (v === "" || v == null ? null : parseInt(v) || null);

  const saveEdit = async () => {
    if (!editId) return;
    const start = parseInt(form.startWeek);
    if (!Number.isInteger(start) || start < 1) { setFormError("Start week must be 1 or more."); return; }
    const end = form.endWeek === "" ? null : parseInt(form.endWeek);
    if (end !== null && (!Number.isInteger(end) || end < start)) { setFormError("End week must be empty or not before the start week."); return; }
    setFormError("");
    const itemUpdate: any = {
      title: form.title,
      phase: form.phase,
      itemType: form.itemType,
      startWeek: start,
      endWeek: end,
      frequency: form.frequency || null,
      sets: toInt(form.sets),
      reps: toInt(form.reps),
      holdSeconds: toInt(form.holdSeconds),
      description: form.description || "",
      instructions: form.instructions || null,
    };
    const exerciseId = linked?.id ?? null;
    // Only send the link when it changed — the API re-validates it, and an
    // untouched legacy link shouldn't block saving the rest of the item.
    if (exerciseId !== originalExerciseId) itemUpdate.exerciseId = exerciseId;
    // Moving to another week takes that week's visibility: shown only if the
    // destination week is already fully released, hidden otherwise. Keeping
    // its old visibility would quietly release part of a future week.
    const k = `${start}-${end ?? ""}`;
    let movedHidden: boolean | null = null;
    if (k !== originalKey) {
      movedHidden = hiddenAfterMove((groups[k] || []).filter((i) => i.id !== editId));
      itemUpdate.hiddenFromPatient = movedHidden;
    }
    const savingId = editId;
    setBusy(savingId);
    const r = await patch({ itemId: savingId, itemUpdate });
    if (r) {
      // Another item's editor may have been opened while this save was in flight.
      setEditId((cur) => (cur === savingId ? null : cur));
      const label = weekLabel(start, end);
      flash(movedHidden === null ? "Item updated" : movedHidden ? `Moved to ${label} (hidden until released)` : `Moved to ${label}`);
      setOpen((o) => ({ ...o, [k]: true }));
      onChanged();
    }
    setBusy("");
  };

  const toggleHidden = async (item: any) => {
    setBusy(item.id);
    const r = await patch({ itemId: item.id, itemUpdate: { hiddenFromPatient: !item.hiddenFromPatient } });
    if (r) { flash(item.hiddenFromPatient ? "Item visible to patient" : "Item hidden from patient"); onChanged(); }
    setBusy("");
  };

  const duplicate = async (item: any) => {
    setBusy(item.id);
    const fields = [
      "phase", "itemType", "sortOrder", "description", "instructions", "bodyRegion", "references",
      "treatmentTypeName", "sessionDuration", "sessionsPerWeek", "exerciseId",
      "sets", "reps", "holdSeconds", "restSeconds", "frequency", "startWeek", "endWeek",
    ];
    const copy = Object.fromEntries(fields.map((f) => [f, item[f]]));
    // A copy starts hidden like any new item — it only reaches the patient
    // once released.
    const newItem: Record<string, any> = { ...copy, title: `${item.title} (copy)`, hiddenFromPatient: true };
    let r = await request({ newItem });
    // An exercise from outside this clinic's library can't be linked — copy
    // the item anyway, just without the link, rather than failing.
    let unlinked = false;
    if (!r.ok && r.data?.code === "EXERCISE_NOT_IN_CLINIC" && newItem.exerciseId) {
      r = await request({ newItem: { ...newItem, exerciseId: null } });
      unlinked = true;
    }
    if (!r.ok) onError(r.data?.error || "Request failed");
    else {
      flash(unlinked
        ? "Item duplicated without its linked exercise (not in this clinic's library) — hidden until released"
        : "Item duplicated (hidden until released)");
      onChanged();
    }
    setBusy("");
  };

  const remove = async (item: any) => {
    if (!confirm(`Delete "${item.title}"?`)) return;
    setBusy(item.id);
    const r = await patch({ deleteItemId: item.id });
    if (r) { flash("Item deleted"); onChanged(); }
    setBusy("");
  };

  // New items are created hidden, in the chosen week, and open straight in
  // the editor — the patient never sees a blank "New item".
  const addItem = async (start: number, end: number | null, phase: string) => {
    const key = `${start}-${end ?? ""}`;
    setBusy("add-" + key);
    const r = await patch({
      newItem: { title: "New item", phase, itemType: "HOME_EXERCISE", startWeek: start, endWeek: end, hiddenFromPatient: true },
    });
    if (r?.item) {
      flash(`Item added to ${weekLabel(start, end)} (hidden until released)`);
      setOpen((o) => ({ ...o, [key]: true }));
      startEdit(r.item);
      onChanged();
    }
    setBusy("");
  };

  const addToNewWeek = () => {
    const start = parseInt(newWeek.start);
    const end = newWeek.end === "" ? null : parseInt(newWeek.end);
    if (!Number.isInteger(start) || start < 1) { onError("Choose a start week (1 or more)."); return; }
    if (end !== null && (!Number.isInteger(end) || end < start)) { onError("End week must be empty or not before the start week."); return; }
    setNewWeek({ start: "", end: "" });
    addItem(start, end, "SHORT_TERM");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Protocol Items ({items.length})</p>
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Add to week</span>
          <Input type="number" min={1} value={newWeek.start} onChange={(e) => setNewWeek((w) => ({ ...w, start: e.target.value }))} className="h-6 w-16 text-[10px]" placeholder="from" />
          <Input type="number" min={1} value={newWeek.end} onChange={(e) => setNewWeek((w) => ({ ...w, end: e.target.value }))} className="h-6 w-16 text-[10px]" placeholder="to" />
          <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={addToNewWeek} disabled={busy.startsWith("add-")}>
            <Plus className="h-3 w-3 mr-0.5" /> Add item
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-[11px]">
        <span className="text-muted-foreground">Patient currently sees: </span>
        <span className="font-semibold">{visibleSummary(protocol)}</span>
        {rtw != null && <span className="text-muted-foreground"> (release limit: week {rtw})</span>}
      </div>

      {keys.map((key) => {
        const { start, end } = parseKey(key);
        const group = groups[key];
        const seenCount = group.filter((i) => patientCanSee(i, rtw)).length;
        const hiddenCount = group.filter((i) => i.hiddenFromPatient).length;
        const state = seenCount === group.length ? "visible" : seenCount === 0 ? "hidden" : "partial";
        const expanded = isOpen(key);
        return (
          <div key={key} className="rounded-lg border">
            <div className="flex flex-wrap items-center gap-2 px-2.5 py-2 bg-muted/20">
              <button className="flex flex-wrap items-center gap-x-2 gap-y-1 flex-1 min-w-[11rem] text-left" onClick={() => setOpen((o) => ({ ...o, [key]: !expanded }))}>
                {expanded ? <ChevronUp className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
                <span className="text-xs font-semibold whitespace-nowrap">{weekLabel(start, end)}</span>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{group.length} item{group.length === 1 ? "" : "s"}</span>
                <Badge
                  variant="outline"
                  className={`text-[9px] whitespace-nowrap ${state === "visible" ? "border-emerald-500/40 text-emerald-400" : state === "hidden" ? "border-amber-500/40 text-amber-400" : "border-sky-500/40 text-sky-400"}`}
                >
                  {state === "visible" ? (gated ? "Released" : "Visible to patient") : state === "hidden" ? "Hidden" : gated ? "Partly released" : "Partly visible"}
                </Badge>
                {rtw != null && start > rtw && <span className="text-[9px] text-muted-foreground">beyond release limit</span>}
              </button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px]"
                onClick={() => setWeekHidden(key, hiddenCount === 0)}
                disabled={busy === "week-" + key}
              >
                {busy === "week-" + key ? <Loader2 className="h-3 w-3 animate-spin" /> : hiddenCount === 0 ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                {hiddenCount === 0 ? "Hide week" : "Release week"}
              </Button>
            </div>

            {expanded && (
              <div className="px-2.5 py-1">
                {group.map((item) =>
                  editId === item.id ? (
                    <div key={item.id} className="border border-primary/40 rounded-lg p-2 my-1.5 space-y-2 bg-muted/20">
                      {item.hiddenFromPatient && (
                        <p className="text-[10px] text-amber-400">Hidden from the patient until you release it (eye icon or "Release week").</p>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="space-y-1 col-span-2 sm:col-span-4"><Label className="text-[10px]">Title</Label>
                          <Input value={form.title} onChange={(e) => setForm((f: any) => ({ ...f, title: e.target.value }))} className="h-7 text-xs" />
                        </div>
                        <div className="space-y-1 col-span-2"><Label className="text-[10px]">Type</Label>
                          <select value={form.itemType} onChange={(e) => setForm((f: any) => ({ ...f, itemType: e.target.value }))} className="w-full h-7 rounded-md border border-input bg-background px-2 text-[10px]">
                            {Object.entries(ITEM_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1 col-span-2"><Label className="text-[10px]">Phase</Label>
                          <select value={form.phase} onChange={(e) => setForm((f: any) => ({ ...f, phase: e.target.value }))} className="w-full h-7 rounded-md border border-input bg-background px-2 text-[10px]">
                            {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1"><Label className="text-[10px]">Start week</Label>
                          <Input type="number" min={1} value={form.startWeek} onChange={(e) => setForm((f: any) => ({ ...f, startWeek: e.target.value }))} className="h-7 text-xs" />
                        </div>
                        <div className="space-y-1"><Label className="text-[10px]">End week (optional)</Label>
                          <Input type="number" min={1} value={form.endWeek} onChange={(e) => setForm((f: any) => ({ ...f, endWeek: e.target.value }))} className="h-7 text-xs" placeholder="ongoing" />
                        </div>
                        <div className="space-y-1 col-span-2"><Label className="text-[10px]">Frequency</Label>
                          <Input value={form.frequency} onChange={(e) => setForm((f: any) => ({ ...f, frequency: e.target.value }))} className="h-7 text-xs" placeholder="e.g. 3x/day" />
                        </div>
                        <div className="space-y-1"><Label className="text-[10px]">Sets</Label>
                          <Input type="number" min={0} value={form.sets} onChange={(e) => setForm((f: any) => ({ ...f, sets: e.target.value }))} className="h-7 text-xs" />
                        </div>
                        <div className="space-y-1"><Label className="text-[10px]">Reps</Label>
                          <Input type="number" min={0} value={form.reps} onChange={(e) => setForm((f: any) => ({ ...f, reps: e.target.value }))} className="h-7 text-xs" />
                        </div>
                        <div className="space-y-1"><Label className="text-[10px]">Hold (s)</Label>
                          <Input type="number" min={0} value={form.holdSeconds} onChange={(e) => setForm((f: any) => ({ ...f, holdSeconds: e.target.value }))} className="h-7 text-xs" />
                        </div>
                        <div className="space-y-1 col-span-2 sm:col-span-4"><Label className="text-[10px]">Description</Label>
                          <Textarea value={form.description} onChange={(e) => setForm((f: any) => ({ ...f, description: e.target.value }))} rows={2} className="text-xs" />
                        </div>
                        <div className="space-y-1 col-span-2 sm:col-span-4"><Label className="text-[10px]">Instructions (what the patient should do)</Label>
                          <Textarea value={form.instructions} onChange={(e) => setForm((f: any) => ({ ...f, instructions: e.target.value }))} rows={3} className="text-xs" />
                        </div>
                        <div className="space-y-1 col-span-2 sm:col-span-4">
                          <Label className="text-[10px]">Exercise from library (its video is what the patient watches)</Label>
                          <ExercisePicker
                            linked={linked}
                            onPick={(ex) => {
                              setLinked({ id: ex.id, name: ex.name, videoUrl: ex.videoUrl });
                              setForm((f: any) => ({
                                ...f,
                                title: !f.title || f.title === "New item" ? ex.name : f.title,
                                sets: f.sets === "" && ex.defaultSets ? ex.defaultSets : f.sets,
                                reps: f.reps === "" && ex.defaultReps ? ex.defaultReps : f.reps,
                                holdSeconds: f.holdSeconds === "" && ex.defaultHoldSec ? ex.defaultHoldSec : f.holdSeconds,
                              }));
                            }}
                            onUnlink={() => setLinked(null)}
                          />
                        </div>
                      </div>
                      {formError && <p className="text-[10px] text-red-400">{formError}</p>}
                      <div className="flex gap-1.5">
                        <Button size="sm" className="h-6 text-[10px]" onClick={saveEdit} disabled={busy === item.id}>
                          {busy === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-0.5" />} Save
                        </Button>
                        <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => setEditId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div key={item.id} className={`flex flex-wrap items-center gap-2 text-[10px] py-1 border-b border-border/30 last:border-0 ${item.hiddenFromPatient ? "opacity-50" : ""}`}>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">{item.phase || "—"}</Badge>
                      <span className="truncate flex-1 min-w-[8rem]">{item.treatmentTypeName || item.title || "—"}</span>
                      {item.exercise && (
                        <span title={item.exercise.videoUrl ? `Video: ${item.exercise.name}` : `${item.exercise.name} — no video yet`} className="shrink-0">
                          <Video className={`h-3 w-3 ${item.exercise.videoUrl ? "text-emerald-400" : "text-muted-foreground/40"}`} />
                        </span>
                      )}
                      {item.sets && item.reps && <span className="text-muted-foreground/60 shrink-0">{item.sets}×{item.reps}</span>}
                      {item.completionLogs?.length > 0 && (
                        <span className="text-ba1-ok shrink-0" title="Days marked done by the patient">
                          ✓ {item.completionLogs.map((l: any) => new Date(l.completedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" })).join(", ")}
                        </span>
                      )}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button title="Edit" className="p-1 rounded hover:bg-muted" onClick={() => startEdit(item)}>
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button title={item.hiddenFromPatient ? "Show to patient" : "Hide from patient"} className="p-1 rounded hover:bg-muted" onClick={() => toggleHidden(item)} disabled={busy === item.id}>
                          {item.hiddenFromPatient ? <EyeOff className="h-3 w-3 text-amber-400" /> : <Eye className="h-3 w-3" />}
                        </button>
                        <button title="Duplicate" className="p-1 rounded hover:bg-muted" onClick={() => duplicate(item)} disabled={busy === item.id}>
                          <Copy className="h-3 w-3" />
                        </button>
                        <button title="Delete" className="p-1 rounded hover:bg-red-500/20 text-red-400" onClick={() => remove(item)} disabled={busy === item.id}>
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )
                )}
                <button
                  className="text-[10px] text-primary hover:underline py-1 flex items-center gap-0.5"
                  onClick={() => addItem(start, end, group[0]?.phase || "SHORT_TERM")}
                  disabled={busy === "add-" + key}
                >
                  {busy === "add-" + key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Add to this week
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ExercisePicker({ linked, onPick, onUnlink }: {
  linked: LinkedExercise;
  onPick: (exercise: any) => void;
  onUnlink: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    const id = ++reqId.current;
    if (q.length < 2) { setResults([]); setLoading(false); return; }
    // Loading from the first keystroke, so "No exercises found" doesn't
    // flash during the debounce.
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/exercises?search=${encodeURIComponent(q)}&limit=8&sort=name`);
        const data = await res.json();
        // Ignore a slower earlier response landing after a newer one.
        if (id === reqId.current) setResults(data.exercises || []);
      } catch {
        if (id === reqId.current) setResults([]);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="space-y-1.5">
      {linked && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border px-2 py-1.5">
          <Video className={`h-3.5 w-3.5 ${linked.videoUrl ? "text-emerald-400" : "text-muted-foreground/40"}`} />
          <span className="text-xs font-medium">{linked.name}</span>
          <span className={`text-[10px] ${linked.videoUrl ? "text-emerald-400" : "text-amber-400"}`}>
            {linked.videoUrl ? "has video" : "no video yet"}
          </span>
          <a
            href={`/admin/exercises?search=${encodeURIComponent(linked.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
          >
            <ExternalLink className="h-3 w-3" /> {linked.videoUrl ? "Open in library" : "Open in library to add video"}
          </a>
          <button type="button" className="ml-auto text-[10px] text-muted-foreground hover:text-red-400 flex items-center gap-0.5" onClick={onUnlink}>
            <X className="h-3 w-3" /> Unlink
          </button>
        </div>
      )}
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-7 text-xs"
          placeholder={linked ? "Search to replace the linked exercise…" : "Search the exercise library by name…"}
        />
        {loading && <Loader2 className="h-3 w-3 animate-spin absolute right-2 top-2 text-muted-foreground" />}
      </div>
      {results.length > 0 && (
        <div className="rounded-md border divide-y max-h-48 overflow-y-auto">
          {results.map((ex) => (
            <button
              key={ex.id}
              type="button"
              className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-muted/50"
              onClick={() => { onPick(ex); setQuery(""); setResults([]); }}
            >
              <span className="flex-1 truncate">{ex.name}</span>
              <span className={`text-[10px] shrink-0 ${ex.videoUrl ? "text-emerald-400" : "text-muted-foreground"}`}>
                {ex.videoUrl ? "video" : "no video"}
              </span>
            </button>
          ))}
        </div>
      )}
      {query.trim().length >= 2 && !loading && results.length === 0 && (
        <p className="text-[10px] text-muted-foreground">No exercises found.</p>
      )}
    </div>
  );
}
