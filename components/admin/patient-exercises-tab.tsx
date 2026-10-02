"use client";

// Lists exercises prescribed to this patient — view, edit sets/reps/frequency, and remove.
import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Dumbbell, Play, Pencil, Trash2, Save, X, FileVideo, FolderPlus, Folder, Plus, LayoutGrid, ArrowLeft, Check } from "lucide-react";
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
  completionLogs?: { completedDate: string }[];
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

/** What the thumbnail grid needs from a folder's videos (activity 075). */
interface FolderVideo {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  defaultSets: number | null;
  defaultReps: number | null;
  defaultHoldSec: number | null;
  defaultRestSec: number | null;
}

/**
 * A category that holds exactly one folder of the same name is the same
 * shelf listed twice — that is what put "Advanced Core / Advanced Core"
 * one under the other in the picker. Collapse those into a single row.
 *
 * The row that survives is the **category**, not the child: a category can
 * also hold videos of its own (deleting a category promotes its folders and
 * they keep their videos — see the exercise-folders DELETE), and a row
 * pointing at the child would leave those with no way in, counted but
 * unreachable. The category id loses nothing, because both asking for a
 * folder's videos and prescribing one already reach its children.
 *
 * Categories with several folders, or with a folder named differently, are
 * left exactly as they are — nothing is ever hidden from this list.
 */
function collapseMirroredCategory(category: FolderNode): { row: FolderNode; children: FolderNode[] } {
  const children = category.children ?? [];
  const onlyChild = children.length === 1 ? children[0] : null;
  const mirrors =
    onlyChild && onlyChild.name.trim().toLowerCase() === category.name.trim().toLowerCase();
  if (mirrors) {
    return { row: category, children: [] };
  }
  return { row: category, children };
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

  /**
   * Mandar **um** exercício (095 T-5).
   *
   * Pedido do Bruno: *"quero poder enviar exercícios individuais e não a pasta
   * toda"*. O modelo sempre soube — `ExercisePrescription` é uma linha por
   * exercício, e a API já aceita `exercises: [...]`. O que não existia era o
   * botão: a única porta do painel prescrevia a pasta inteira, e foi assim que
   * o card de aderência dele passou a cobrar dez exercícios por dia.
   *
   * A pasta continua: quem manda um programa inteiro continua mandando.
   */
  const [umAberto, setUmAberto] = useState(false);
  const [buscaExercicio, setBuscaExercicio] = useState("");
  const [biblioteca, setBiblioteca] = useState<{ id: string; name: string; folder?: { name: string } | null }[]>([]);
  const [carregandoBiblioteca, setCarregandoBiblioteca] = useState(false);
  const [escolhido, setEscolhido] = useState<{ id: string; name: string } | null>(null);
  const [umaFrequencia, setUmaFrequencia] = useState("");
  const [umaNota, setUmaNota] = useState("");
  const [folderFrequency, setFolderFrequency] = useState("");
  const [folderNotes, setFolderNotes] = useState("");
  const [prescribing, setPrescribing] = useState(false);

  // Second view of the same dialog: the videos inside one folder, as
  // thumbnails, to prescribe a few instead of the whole shelf (activity
  // 075). `browsing` being set is what switches the dialog over.
  const [browsing, setBrowsing] = useState<{ id: string; name: string } | null>(null);
  const [videos, setVideos] = useState<FolderVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [videosError, setVideosError] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const browsingRef = useRef<string | null>(null);

  // Só a primeira carga troca a lista pelo spinner. Nas seguintes a lista
  // continua na tela: ela sumindo, a página perdia a altura e o navegador
  // devolvia o scroll para o topo — a cada exercício salvo, numa lista de
  // dezessete.
  const jaCarregou = useRef(false);

  const fetchPrescriptions = useCallback(async () => {
    if (!jaCarregou.current) setLoading(true);
    try {
      const res = await fetch(`/api/admin/exercise-prescriptions?patientId=${patientId}`);
      const data = await res.json();
      setPrescriptions(data.prescriptions || []);
      jaCarregou.current = true;
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
    setBrowsing(null);
    setPicked([]);
    setVideos([]);
    setVideosError("");
    setLoadingVideos(false);
    browsingRef.current = null;
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

  // Prescribing the same folder twice is a normal thing to do, and silence
  // about the skipped ones reads as a bug — so both paths (whole folder and
  // hand-picked videos) report the same three numbers.
  const reportPrescribed = (label: string, data: any) => {
    const parts = [`${data.count} exercise${data.count === 1 ? "" : "s"} prescribed`];
    if (data.restored > 0) parts.push(`${data.restored} back from an archived plan`);
    if (data.skipped > 0) parts.push(`${data.skipped} already prescribed`);
    toast({ description: `${label}: ${parts.join(", ")}.` });
  };

  const abrirUm = async () => {
    setUmAberto(true);
    setEscolhido(null);
    setBuscaExercicio("");
    if (biblioteca.length > 0) return;
    setCarregandoBiblioteca(true);
    try {
      const res = await fetch("/api/admin/exercises");
      const data = await res.json();
      const lista = Array.isArray(data) ? data : data.exercises || [];
      setBiblioteca(lista.map((e: any) => ({ id: e.id, name: e.name, folder: e.folder })));
    } catch {
      toast({ description: "Could not load the exercise library.", variant: "destructive" });
    } finally {
      setCarregandoBiblioteca(false);
    }
  };

  const prescreverUm = async () => {
    if (!escolhido) return;
    setPrescribing(true);
    try {
      const res = await fetch("/api/admin/exercise-prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          // Um item na lista: a API já trata isto como prescrição avulsa, com
          // `protocolId` nulo — que é o que faz o exercício não sumir quando
          // um plano é arquivado.
          exercises: [{ exerciseId: escolhido.id }],
          frequency: umaFrequencia.trim() || undefined,
          notes: umaNota.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast({
        description: data.count
          ? `${escolhido.name} prescribed.`
          : `${escolhido.name} was already prescribed to this patient.`,
      });
      setUmAberto(false);
      setUmaFrequencia("");
      setUmaNota("");
      fetchPrescriptions();
    } catch (e: any) {
      toast({ description: e.message || "Could not prescribe.", variant: "destructive" });
    } finally {
      setPrescribing(false);
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

      reportPrescribed(chosenFolder.name, data);
      setPickerOpen(false);
      fetchPrescriptions();
    } catch (err: any) {
      toast({ description: err.message || "Failed to prescribe folder.", variant: "destructive" });
    } finally {
      setPrescribing(false);
    }
  };

  const browseFolder = async (folder: { id: string; name: string }) => {
    setBrowsing(folder);
    setPicked([]);
    setVideos([]);
    setVideosError("");
    setLoadingVideos(true);
    // A slow answer for a folder left behind must not land in the grid of
    // the one now on screen: the ids are real, so prescribing from it would
    // quietly send the wrong videos.
    browsingRef.current = folder.id;
    try {
      const res = await fetch(`/api/admin/exercises?folderId=${encodeURIComponent(folder.id)}&all=true`);
      const data = await res.json();
      if (browsingRef.current !== folder.id) return;
      if (!res.ok) throw new Error(data.error || "Failed to load videos");
      setVideos(Array.isArray(data.exercises) ? data.exercises : []);
    } catch (err: any) {
      if (browsingRef.current !== folder.id) return;
      // A blank grid would read as "this folder is empty", which is a
      // different thing entirely from "we could not ask".
      setVideosError(err?.message || "Could not load this folder's videos.");
    } finally {
      if (browsingRef.current === folder.id) setLoadingVideos(false);
    }
  };

  // Unlike the folder path, the API does not fill in each exercise's own
  // defaults for a hand-picked list — it writes what it is given. The grid
  // already has them, so it sends them, and a video prescribed here lands
  // with the same sets and reps it would have had inside a whole folder.
  const prescribePicked = async () => {
    if (!browsing || picked.length === 0) return;
    setPrescribing(true);
    try {
      const chosen = videos.filter((v) => picked.includes(v.id));
      const res = await fetch("/api/admin/exercise-prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          exercises: chosen.map((v) => ({
            exerciseId: v.id,
            sets: v.defaultSets,
            reps: v.defaultReps,
            holdSeconds: v.defaultHoldSec,
            restSeconds: v.defaultRestSec,
          })),
          frequency: folderFrequency || null,
          notes: folderNotes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to prescribe");

      reportPrescribed(browsing.name, data);
      setPickerOpen(false);
      fetchPrescriptions();
    } catch (err: any) {
      toast({ description: err.message || "Failed to prescribe videos.", variant: "destructive" });
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{browsing ? browsing.name : "Prescribe exercises"}</DialogTitle>
          <DialogDescription>
            {browsing
              ? "Pick the videos to prescribe. Each one keeps its own default sets and reps. Videos this patient already has are skipped."
              : "Choose a folder to prescribe all of it at once, or open it to pick single videos. Exercises this patient already has are skipped."}
          </DialogDescription>
        </DialogHeader>

        {/* ── The videos inside one folder ── */}
        {browsing ? (
          loadingVideos ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : videosError ? (
            <p className="py-8 text-center text-sm text-destructive">{videosError}</p>
          ) : videos.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No videos in this folder.
            </p>
          ) : (
            <div className="max-h-[45vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {videos.map((v) => {
                  const on = picked.includes(v.id);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setPicked((prev) => (on ? prev.filter((id) => id !== v.id) : [...prev, v.id]))
                      }
                      className={`group relative overflow-hidden rounded-lg border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        on ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
                      }`}
                    >
                      {/* spans, not divs/ps: this is all inside a button */}
                      <span className="flex aspect-video items-center justify-center bg-muted">
                        {v.thumbnailUrl ? (
                          <img
                            src={v.thumbnailUrl}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <FileVideo className="h-7 w-7 text-muted-foreground/40" />
                        )}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded border ${
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-white/70 bg-black/40"
                        }`}
                      >
                        {on && <Check className="h-3 w-3" />}
                      </span>
                      <span className="block truncate px-2 py-1.5 text-xs" title={v.name}>
                        {v.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )
        ) : loadingTree ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : tree.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No folders yet. Create them in Clinical → Exercises.
          </p>
        ) : (
          <div className="max-h-[45vh] overflow-y-auto space-y-3 pr-1">
            {tree.map((category) => {
              const { row, children } = collapseMirroredCategory(category);
              const rowCount = row.totalExerciseCount ?? row.exerciseCount;
              return (
                <div key={category.id}>
                  <FolderRow
                    label={row.name}
                    count={rowCount}
                    isCategory
                    selected={chosenFolder?.id === row.id}
                    onSelect={() => setChosenFolder({ id: row.id, name: row.name, count: rowCount })}
                    onBrowse={() => browseFolder({ id: row.id, name: row.name })}
                  />
                  {children.length > 0 && (
                    <div className="ml-4 mt-1 space-y-1">
                      {children.map((child) => (
                        <FolderRow
                          key={child.id}
                          label={child.name}
                          count={child.exerciseCount}
                          selected={chosenFolder?.id === child.id}
                          onSelect={() =>
                            setChosenFolder({ id: child.id, name: child.name, count: child.exerciseCount })
                          }
                          onBrowse={() => browseFolder({ id: child.id, name: child.name })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {((chosenFolder && chosenFolder.count > 0 && !browsing) || (browsing && picked.length > 0)) && (
          <div className="space-y-2 border-t pt-3">
            <Input
              placeholder={
                browsing
                  ? "Frequency for the selected videos (e.g. 3x per week)"
                  : "Frequency for the whole folder (e.g. 3x per week)"
              }
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
          {browsing ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setBrowsing(null);
                  setPicked([]);
                  setVideosError("");
                }}
                disabled={prescribing}
                className="gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" /> Back to folders
              </Button>
              <Button onClick={prescribePicked} disabled={picked.length === 0 || prescribing} className="gap-2">
                {prescribing && <Loader2 className="h-4 w-4 animate-spin" />}
                {picked.length === 0 ? "Select videos" : `Prescribe ${picked.length} selected`}
              </Button>
            </>
          ) : (
            <>
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
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const umPicker = (
    <Dialog open={umAberto} onOpenChange={setUmAberto}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Prescribe one exercise</DialogTitle>
          <DialogDescription>
            One exercise, with its own default sets and reps. It is not tied to a plan, so archiving
            a plan never takes it back.
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="Search the library…"
          value={buscaExercicio}
          onChange={(e) => setBuscaExercicio(e.target.value)}
          className="text-sm"
        />

        {carregandoBiblioteca ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="max-h-[40vh] overflow-y-auto space-y-1 pr-1">
            {biblioteca
              .filter((e) => e.name.toLowerCase().includes(buscaExercicio.toLowerCase()))
              .slice(0, 60)
              .map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEscolhido({ id: e.id, name: e.name })}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                    escolhido?.id === e.id
                      ? "border-primary/50 bg-primary/10"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  {e.name}
                  {/* A pasta aparece **aqui**, para quem prescreve se situar na
                      biblioteca — e não na tela do paciente. */}
                  {e.folder?.name && (
                    <span className="block text-[11px] text-muted-foreground">{e.folder.name}</span>
                  )}
                </button>
              ))}
            {biblioteca.length > 0 &&
              biblioteca.filter((e) => e.name.toLowerCase().includes(buscaExercicio.toLowerCase())).length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">Nothing matches that.</p>
              )}
          </div>
        )}

        {escolhido && (
          <div className="space-y-2 border-t pt-3">
            <Input
              placeholder="Frequency (e.g. 3x per week)"
              value={umaFrequencia}
              onChange={(e) => setUmaFrequencia(e.target.value)}
              className="text-sm"
            />
            <Textarea
              placeholder="Notes for the patient (optional)"
              value={umaNota}
              onChange={(e) => setUmaNota(e.target.value)}
              className="text-sm min-h-[60px]"
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setUmAberto(false)} disabled={prescribing}>
            Cancel
          </Button>
          <Button onClick={prescreverUm} disabled={!escolhido || prescribing} className="gap-2">
            {prescribing && <Loader2 className="h-4 w-4 animate-spin" />}
            {escolhido ? `Prescribe ${escolhido.name}` : "Pick an exercise"}
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
      <div className="flex gap-2">
        {/* O avulso vem primeiro: é o caso mais comum no dia a dia, e era o
            que não tinha porta (095 T-5). Busca por nome, sem sair da ficha.
            "Add exercises" é a outra porta pro mesmo lugar: entra numa pasta e
            mostra os vídeos em miniatura, pra escolher vendo (075). */}
        <Button size="sm" variant="outline" onClick={abrirUm} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add one
        </Button>
        <Button size="sm" onClick={openPicker} className="gap-1.5">
          <FolderPlus className="h-4 w-4" /> Add exercises
        </Button>
      </div>
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
            Use &ldquo;Add one&rdquo; above to search by name, or &ldquo;Add exercises&rdquo; to
            prescribe a whole folder — or open one to pick single videos by thumbnail.
          </p>
        </div>
        {picker}
        {umPicker}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {header}
      {picker}
      {/* O diálogo do avulso **também aqui**, e este é o caso comum.
          Uma edição minha deixou duas cópias no ramo do estado vazio e nenhuma
          neste: o botão "Add one" aparecia para todo paciente que já tem
          exercício e não abria nada. O QA achou a duplicata; tirá-la mostrou a
          ausência. */}
      {umPicker}
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
              Prescribed by {p.therapist.firstName}
              {p.completionLogs && p.completionLogs.length > 0 && (
                <> · <span className="text-ba1-ok" title="Days marked done by the patient">
                  ✓ {p.completionLogs.map((l) => new Date(l.completedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" })).join(", ")}
                </span></>
              )}
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
  onBrowse,
}: {
  label: string;
  count: number;
  selected: boolean;
  isCategory?: boolean;
  onSelect: () => void;
  onBrowse: () => void;
}) {
  const empty = count === 0;
  // Two targets, so the row is a div: selecting the folder for a bulk
  // prescription and opening it to pick videos are different intentions,
  // and a button inside a button is invalid HTML anyway.
  return (
    <div
      className={`w-full flex items-center gap-1 rounded-lg border pl-3 pr-1.5 py-1 transition-colors ${
        selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
      } ${empty ? "opacity-50" : ""}`}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={empty}
        aria-pressed={selected}
        title={empty ? undefined : `Prescribe all ${count} of "${label}"`}
        className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
      >
        <Folder className={`h-4 w-4 shrink-0 ${isCategory ? "text-primary" : "text-muted-foreground"}`} />
        <span className={`flex-1 truncate text-sm ${isCategory ? "font-semibold" : ""}`}>{label}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {empty ? "empty" : `${count} video${count === 1 ? "" : "s"}`}
        </span>
      </button>
      {!empty && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBrowse}
          className="h-7 shrink-0 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
          title="See the videos in this folder"
        >
          <LayoutGrid className="h-3.5 w-3.5" /> View
        </Button>
      )}
    </div>
  );
}
