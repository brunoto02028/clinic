"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import {
  GraduationCap, Plus, Loader2, Send, Bot, Trash2, FileText, Upload, BookOpen,
  Languages, Sparkles, ChevronLeft, Save, Download, Copy, Printer, Mic, MicOff,
  FileCheck, MessageSquare, Pencil, X, FileType, ListChecks, Wand2, CalendarClock,
  CheckCircle2, Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const RichTextEditor = dynamic(() => import("@/components/admin/rich-text-editor"), { ssr: false });

type Mode = "tutor" | "english";

interface ProjectSummary {
  id: string; title: string; course: string; provider: string; level: string | null;
  description: string | null; status: string; updatedAt: string;
  _count?: { documents: number; drafts: number; messages: number };
}
interface StudyDoc {
  id: string; originalName: string; mimeType: string; fileSize: number; kind: string;
  extractStatus: string; extractError: string | null; createdAt: string;
}
interface Draft { id: string; title: string; content: string; wordCount: number; status: string; updatedAt: string; taskId?: string | null; }
interface Msg { id?: string; role: string; content: string; mode: string; edited?: boolean; }
interface TaskDraftRef { id: string; title: string; status: string; wordCount: number; updatedAt: string; }
interface Task {
  id: string; title: string; brief: string | null; steps: string | null;
  type: string; priority: string; status: string; dueDate: string | null; order: number;
  drafts?: TaskDraftRef[];
}
interface FullProject extends ProjectSummary {
  documents: StudyDoc[]; drafts: Draft[]; messages: Msg[]; tasks: Task[];
}

const DOC_KINDS = [
  { value: "brief", label: "Assignment brief" },
  { value: "criteria", label: "Marking criteria" },
  { value: "reference", label: "Reference / reading" },
  { value: "notes", label: "My notes" },
  { value: "other", label: "Other" },
];

const DRAFT_STATUSES = [
  { value: "writing", label: "Being written", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  { value: "reviewing", label: "To review", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  { value: "to_deliver", label: "Ready to deliver", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" },
  { value: "delivered", label: "Delivered", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
];
const statusMeta = (s: string) => DRAFT_STATUSES.find((x) => x.value === s) || DRAFT_STATUSES[0];

const TASK_STATUSES = [
  { value: "todo", label: "To do", color: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200" },
  { value: "in_progress", label: "In progress", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  { value: "to_deliver", label: "Ready to deliver", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" },
  { value: "done", label: "Done", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
];
const TASK_TYPES: Record<string, string> = { essay: "Essay", study: "Study", exam: "Exam", reading: "Reading", other: "Other" };
const PRIORITY_META: Record<string, { label: string; color: string }> = {
  high: { label: "High", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  low: { label: "Low", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
};

export default function StudyAssistantPage() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<FullProject | null>(null);
  const [loadingProject, setLoadingProject] = useState(false);

  // New project dialog
  const [showNew, setShowNew] = useState(false);
  const [newProj, setNewProj] = useState({ title: "", course: "Level 5 Diploma", provider: "Core Elements", level: "Level 5", description: "" });
  const [creating, setCreating] = useState(false);

  // Workspace
  const [tab, setTab] = useState<"plan" | "tutor" | "english" | "documents" | "drafts">("tutor");

  // Plan / tasks
  const [braindump, setBraindump] = useState("");
  const [breakingDown, setBreakingDown] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", brief: "", type: "essay", priority: "medium", dueDate: "" });
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [focusText, setFocusText] = useState<string | null>(null);
  const [focusLoading, setFocusLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [pendingDraft, setPendingDraft] = useState<{ title: string; content: string } | null>(null);

  // Documents
  const [uploadKind, setUploadKind] = useState("brief");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Draft editor
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);

  // Canvas (split-view: chat + live document)
  const [canvas, setCanvas] = useState<Draft | null>(null);
  const [canvasMsgs, setCanvasMsgs] = useState<Msg[]>([]);
  const [canvasInput, setCanvasInput] = useState("");
  const [canvasSending, setCanvasSending] = useState(false);
  const [canvasTitle, setCanvasTitle] = useState("");
  const [canvasContent, setCanvasContent] = useState("");
  const [canvasDirty, setCanvasDirty] = useState(false);
  const [canvasSaving, setCanvasSaving] = useState(false);
  const canvasChatRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Voice
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // ── Data loading ──
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/study/projects");
      const data = await res.json();
      if (res.ok) setProjects(data.projects || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const openProject = async (id: string) => {
    setLoadingProject(true);
    try {
      const res = await fetch(`/api/admin/study/projects/${id}`);
      const data = await res.json();
      if (res.ok) { setActive(data.project); setTab("tutor"); setPendingDraft(null); }
    } finally { setLoadingProject(false); }
  };

  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active?.messages, sending, tab]);

  useEffect(() => {
    const el = canvasChatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [canvasMsgs, canvasSending]);

  // ── Project CRUD ──
  const createProject = async () => {
    if (!newProj.title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/study/projects", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newProj),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowNew(false);
      setNewProj({ title: "", course: "Level 5 Diploma", provider: "Core Elements", level: "Level 5", description: "" });
      await fetchProjects();
      openProject(data.project.id);
    } catch (err: any) {
      toast({ title: "Failed to create", description: err.message, variant: "destructive" });
    } finally { setCreating(false); }
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Delete this study project and all its documents, chats and drafts?")) return;
    await fetch(`/api/admin/study/projects/${id}`, { method: "DELETE" });
    setActive(null);
    fetchProjects();
    toast({ title: "Project deleted" });
  };

  // ── Chat ──
  const sendMessage = async (preset?: string) => {
    if (!active) return;
    const text = (preset || chatInput).trim();
    if (!text || sending) return;
    const mode: Mode = tab === "english" ? "english" : "tutor";
    setChatInput("");
    setActive((p) => p ? { ...p, messages: [...p.messages, { role: "user", content: text, mode }] } : p);
    setSending(true);
    try {
      const res = await fetch(`/api/admin/study/projects/${active.id}/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActive((p) => p ? { ...p, messages: [...p.messages, { role: "assistant", content: data.reply, mode }] } : p);
      if (data.draft?.content) setPendingDraft({ title: data.draft.title || "Draft", content: data.draft.content });
    } catch (err: any) {
      toast({ title: "AI error", description: err.message, variant: "destructive" });
    } finally { setSending(false); }
  };

  // ── Voice (Web Speech API) ──
  const toggleRecording = () => {
    if (recording) { recognitionRef.current?.stop(); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast({ title: "Voice not supported", description: "Use Chrome or Edge.", variant: "destructive" }); return; }
    const rec = new SR();
    rec.lang = tab === "english" ? "en-GB" : "pt-BR";
    rec.continuous = true; rec.interimResults = true;
    let finalText = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + " "; else interim += t;
      }
      setChatInput((finalText + interim).trim());
    };
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);
    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
  };

  // ── Documents ──
  const uploadOne = async (file: File): Promise<boolean> => {
    if (!active) return false;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", uploadKind);
    const res = await fetch(`/api/admin/study/projects/${active.id}/documents`, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    setActive((p) => p ? { ...p, documents: [data.document, ...p.documents] } : p);
    return data.document.extractStatus !== "failed";
  };

  const uploadDocs = async (files: FileList | File[]) => {
    if (!active) return;
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true);
    setUploadProgress({ done: 0, total: list.length });
    let ok = 0, failedExtract = 0, errored = 0;
    for (let i = 0; i < list.length; i++) {
      try {
        const extracted = await uploadOne(list[i]);
        ok++; if (!extracted) failedExtract++;
      } catch {
        errored++;
      }
      setUploadProgress({ done: i + 1, total: list.length });
    }
    setUploading(false);
    setUploadProgress(null);
    if (fileRef.current) fileRef.current.value = "";
    if (errored > 0) {
      toast({ title: `${ok} uploaded, ${errored} failed`, description: failedExtract ? `${failedExtract} uploaded but text couldn't be read.` : "", variant: "destructive" });
    } else if (failedExtract > 0) {
      toast({ title: `${ok} uploaded`, description: `${failedExtract} couldn't be read as text (e.g. scanned/empty). The rest are ready for the tutor.`, variant: "destructive" });
    } else {
      toast({ title: `${ok} document${ok > 1 ? "s" : ""} uploaded`, description: "Text extracted — the tutor can now use them." });
    }
  };

  const deleteDoc = async (id: string) => {
    await fetch(`/api/admin/study/documents/${id}`, { method: "DELETE" });
    setActive((p) => p ? { ...p, documents: p.documents.filter((d) => d.id !== id) } : p);
  };

  // ── Drafts ──
  const savePendingDraft = async (): Promise<Draft | null> => {
    if (!active || !pendingDraft) return null;
    const res = await fetch(`/api/admin/study/projects/${active.id}/drafts`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pendingDraft),
    });
    const data = await res.json();
    if (res.ok) {
      setActive((p) => p ? { ...p, drafts: [data.draft, ...p.drafts] } : p);
      setPendingDraft(null);
      toast({ title: "Saved to Drafts" });
      return data.draft as Draft;
    }
    return null;
  };

  // Save the pending draft AND open it in the Canvas for editing/review
  const openPendingInCanvas = async () => {
    const d = await savePendingDraft();
    if (d) openCanvas(d);
  };

  // ── Canvas (split-view document + chat) ──
  const openCanvas = async (d: Draft) => {
    setCanvas(d);
    setCanvasTitle(d.title);
    setCanvasContent(d.content);
    setCanvasDirty(false);
    setCanvasMsgs([]);
    try {
      const res = await fetch(`/api/admin/study/drafts/${d.id}/canvas`);
      const data = await res.json();
      if (res.ok) setCanvasMsgs(data.messages || []);
    } catch { /* ignore */ }
  };

  const closeCanvas = async () => {
    if (canvasDirty) await saveCanvasEdits();
    setCanvas(null);
    setCanvasMsgs([]);
    setCanvasInput("");
  };

  const sendCanvasMessage = async (preset?: string) => {
    if (!canvas) return;
    const text = (preset || canvasInput).trim();
    if (!text || canvasSending) return;
    setCanvasInput("");
    setCanvasMsgs((m) => [...m, { role: "user", content: text, mode: "canvas" }]);
    setCanvasSending(true);
    try {
      const res = await fetch(`/api/admin/study/drafts/${canvas.id}/canvas`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCanvasMsgs((m) => [...m, { role: "assistant", content: data.reply, mode: "canvas", edited: !!data.draft }]);
      if (data.draft) {
        setCanvasTitle(data.draft.title);
        setCanvasContent(data.draft.content);
        setCanvasDirty(false);
        setActive((p) => p ? { ...p, drafts: p.drafts.map((d) => d.id === data.draft.id ? data.draft : d) } : p);
        setCanvas(data.draft);
      }
    } catch (err: any) {
      toast({ title: "AI error", description: err.message, variant: "destructive" });
    } finally { setCanvasSending(false); }
  };

  // Tell the tutor to apply the suggestions discussed in chat directly to the document
  const applySuggestions = () => {
    sendCanvasMessage("Apply the changes and suggestions from our discussion above directly to the document now. Return the COMPLETE updated document with those improvements incorporated.");
  };

  const saveCanvasEdits = async () => {
    if (!canvas) return;
    setCanvasSaving(true);
    try {
      const res = await fetch(`/api/admin/study/drafts/${canvas.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: canvasTitle, content: canvasContent }),
      });
      const data = await res.json();
      if (res.ok) {
        setActive((p) => p ? { ...p, drafts: p.drafts.map((d) => d.id === data.draft.id ? data.draft : d) } : p);
        setCanvasDirty(false);
        toast({ title: "Document saved" });
      }
    } finally { setCanvasSaving(false); }
  };

  const openDraftEditor = (d: Draft) => { setEditingDraft(d); setDraftTitle(d.title); setDraftContent(d.content); };

  const saveDraftEdits = async () => {
    if (!editingDraft) return;
    setSavingDraft(true);
    try {
      const res = await fetch(`/api/admin/study/drafts/${editingDraft.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: draftTitle, content: draftContent }),
      });
      const data = await res.json();
      if (res.ok) {
        setActive((p) => p ? { ...p, drafts: p.drafts.map((d) => d.id === data.draft.id ? data.draft : d) } : p);
        setEditingDraft(null);
        toast({ title: "Draft saved" });
      }
    } finally { setSavingDraft(false); }
  };

  const deleteDraft = async (id: string) => {
    await fetch(`/api/admin/study/drafts/${id}`, { method: "DELETE" });
    setActive((p) => p ? { ...p, drafts: p.drafts.filter((d) => d.id !== id) } : p);
  };

  const updateDraftStatus = async (id: string, status: string) => {
    setActive((p) => p ? { ...p, drafts: p.drafts.map((d) => d.id === id ? { ...d, status } : d) } : p);
    await fetch(`/api/admin/study/drafts/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
  };

  // Open the draft in the Canvas to review & edit it side-by-side with the tutor
  const reviewDraft = (d: Draft) => {
    updateDraftStatus(d.id, "reviewing");
    openCanvas(d);
  };

  // ── Plan / Tasks ──
  const runBreakdown = async () => {
    if (!active) return;
    if (!braindump.trim() && active.documents.length === 0) {
      toast({ title: "Add your activities", description: "Type what you need to do, or upload your syllabus in Documents first.", variant: "destructive" });
      return;
    }
    setBreakingDown(true);
    try {
      const res = await fetch(`/api/admin/study/projects/${active.id}/tasks/breakdown`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: braindump }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActive((p) => p ? { ...p, tasks: [...p.tasks, ...data.tasks] } : p);
      setBraindump("");
      toast({ title: `${data.tasks.length} activit${data.tasks.length === 1 ? "y" : "ies"} created`, description: "Work through them one at a time." });
    } catch (err: any) {
      toast({ title: "Couldn't organise", description: err.message, variant: "destructive" });
    } finally { setBreakingDown(false); }
  };

  const addTask = async () => {
    if (!active || !newTask.title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    const res = await fetch(`/api/admin/study/projects/${active.id}/tasks`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newTask, dueDate: newTask.dueDate || null }),
    });
    const data = await res.json();
    if (res.ok) {
      setActive((p) => p ? { ...p, tasks: [...p.tasks, data.task] } : p);
      setShowAddTask(false);
      setNewTask({ title: "", brief: "", type: "essay", priority: "medium", dueDate: "" });
    }
  };

  const updateTask = async (id: string, patch: Partial<Task>) => {
    setActive((p) => p ? { ...p, tasks: p.tasks.map((t) => t.id === id ? { ...t, ...patch } : t) } : p);
    setOpenTask((t) => t && t.id === id ? { ...t, ...patch } : t);
    await fetch(`/api/admin/study/tasks/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    });
  };

  // Quick tick: mark an activity done (or send it back to "to do")
  const toggleDone = (t: Task) => updateTask(t.id, { status: t.status === "done" ? "todo" : "done" });

  const deleteTask = async (id: string) => {
    if (!confirm("Delete this activity? Drafts linked to it are kept (just unlinked).")) return;
    await fetch(`/api/admin/study/tasks/${id}`, { method: "DELETE" });
    setActive((p) => p ? { ...p, tasks: p.tasks.filter((t) => t.id !== id) } : p);
    setOpenTask(null);
  };

  // Create a draft for this activity and open it in the Canvas
  const startTaskDraft = async (task: Task) => {
    if (!active) return;
    const seed = `<h2>${task.title}</h2>${task.brief ? `<p><em>${task.brief}</em></p>` : ""}<p></p>`;
    const res = await fetch(`/api/admin/study/projects/${active.id}/drafts`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: task.title, content: seed, taskId: task.id }),
    });
    const data = await res.json();
    if (res.ok) {
      setActive((p) => p ? { ...p, drafts: [data.draft, ...p.drafts] } : p);
      if (task.status === "todo") updateTask(task.id, { status: "in_progress" });
      setOpenTask(null);
      openCanvas(data.draft);
    }
  };

  const openTaskDraftInCanvas = (ref: TaskDraftRef) => {
    const full = active?.drafts.find((d) => d.id === ref.id);
    setOpenTask(null);
    if (full) openCanvas(full);
  };

  // Ask the tutor where to begin today, based on all open activities
  const askFocus = async () => {
    if (!active) return;
    setFocusLoading(true);
    setFocusText(null);
    try {
      const res = await fetch(`/api/admin/study/projects/${active.id}/tasks/focus`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFocusText(data.reply);
    } catch (err: any) {
      toast({ title: "Couldn't get a suggestion", description: err.message, variant: "destructive" });
    } finally { setFocusLoading(false); }
  };

  // Discuss an activity with the main tutor
  const discussTask = (task: Task) => {
    setOpenTask(null);
    setTab("tutor");
    sendMessage(`Let's work on this activity: "${task.title}".${task.brief ? ` Requirement: ${task.brief}` : ""} Help me understand exactly what's expected and the best plan to complete it to a distinction standard.`);
  };

  // ── Export helpers ──
  const exportWord = (title: string, html: string) => {
    const doc = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${title}</title></head><body><h1>${title}</h1>${html}</body></html>`;
    const blob = new Blob([doc], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${title.replace(/[^a-z0-9]+/gi, "_")}.doc`; a.click();
    URL.revokeObjectURL(url);
  };
  const printPdf = (title: string, html: string) => {
    const w = window.open("", "_blank");
    if (!w) return;
    const styles = `
      @page { size: A4; margin: 25mm 20mm; }
      * { box-sizing: border-box; }
      body { font-family: 'Times New Roman', Georgia, serif; color: #1a1a1a; line-height: 1.7; font-size: 12pt; max-width: 800px; margin: 0 auto; padding: 24px; }
      h1 { font-family: Arial, Helvetica, sans-serif; font-size: 20pt; margin: 0 0 4px; }
      h2 { font-family: Arial, Helvetica, sans-serif; font-size: 14pt; margin: 22px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #ddd; }
      h3 { font-family: Arial, Helvetica, sans-serif; font-size: 12.5pt; margin: 16px 0 6px; }
      p { margin: 0 0 10px; text-align: justify; }
      ul, ol { margin: 0 0 12px; padding-left: 24px; }
      li { margin-bottom: 4px; }
      blockquote { margin: 12px 0; padding: 8px 16px; border-left: 3px solid #6366f1; background: #f5f5fb; font-style: italic; }
      strong { color: #111; }
      .doc-meta { font-family: Arial, sans-serif; color: #666; font-size: 9pt; margin-bottom: 20px; border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; }
      a { color: #4338ca; }
      h2, h3 { page-break-after: avoid; }
    `;
    w.document.write(`<html><head><meta charset="utf-8"><title>${title}</title><style>${styles}</style></head><body><h1>${title}</h1><div class="doc-meta">Bruno Azenha Tonheta · Generated ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>${html}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 400);
  };
  const copyText = (html: string) => {
    const tmp = document.createElement("div"); tmp.innerHTML = html;
    navigator.clipboard.writeText(tmp.innerText || "");
    toast({ title: "Copied as plain text" });
  };

  const formatReply = (text: string) => text.replace(/```json\s*[\s\S]*?```/g, "").trim();
  const fmtSize = (b: number) => b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)}MB` : `${(b / 1024).toFixed(0)}KB`;
  const fmtDue = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
    const label = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    if (days < 0) return { label: `${label} (overdue)`, urgent: true };
    if (days <= 3) return { label: `${label} (${days}d)`, urgent: true };
    return { label, urgent: false };
  };

  // ════════════════════════ RENDER ════════════════════════

  // PROJECT LIST
  if (!active) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="h-7 w-7 text-indigo-600" /> Study Assistant
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Your AI tutor for coursework, assignments and English exam prep.</p>
          </div>
          <Button onClick={() => setShowNew(true)} className="gap-2"><Plus className="h-4 w-4" /> New Study Project</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
        ) : projects.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-indigo-300 mb-3" />
            <p className="font-medium">No study projects yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Create one for each assignment or module of your Level 5 course.</p>
            <Button onClick={() => setShowNew(true)} className="gap-2"><Plus className="h-4 w-4" /> Create your first project</Button>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <Card key={p.id} className="cursor-pointer hover:border-indigo-400 transition-colors" onClick={() => openProject(p.id)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-base line-clamp-2">{p.title}</h3>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive shrink-0" onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge variant="outline" className="text-xs">{p.level || p.course}</Badge>
                    <Badge variant="secondary" className="text-xs">{p.provider}</Badge>
                  </div>
                  {p.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{p.description}</p>}
                  <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{p._count?.documents || 0} docs</span>
                    <span className="flex items-center gap-1"><FileCheck className="h-3 w-3" />{p._count?.drafts || 0} drafts</span>
                    <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{p._count?.messages || 0} msgs</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-indigo-600" /> New Study Project</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label className="text-xs">Title *</Label><Input value={newProj.title} onChange={(e) => setNewProj({ ...newProj, title: e.target.value })} placeholder="e.g. Unit 3 — Assessment of Sports Injuries" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Course</Label><Input value={newProj.course} onChange={(e) => setNewProj({ ...newProj, course: e.target.value })} /></div>
                <div className="space-y-1"><Label className="text-xs">Level</Label><Input value={newProj.level} onChange={(e) => setNewProj({ ...newProj, level: e.target.value })} /></div>
              </div>
              <div className="space-y-1"><Label className="text-xs">Provider</Label><Input value={newProj.provider} onChange={(e) => setNewProj({ ...newProj, provider: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Description (optional)</Label><Textarea rows={2} value={newProj.description} onChange={(e) => setNewProj({ ...newProj, description: e.target.value })} placeholder="What is this assignment/module about?" /></div>
              <div className="flex gap-2 pt-1">
                <Button onClick={createProject} disabled={creating} className="flex-1 gap-2">{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create</Button>
                <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // CANVAS (split-view: tutor chat + live document) — portalled to body for a true full-screen overlay
  if (canvas && mounted) {
    return createPortal(
      <div className="fixed inset-0 z-[100] bg-background flex flex-col">
        {/* Canvas header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="sm" onClick={closeCanvas} className="gap-1 shrink-0"><ChevronLeft className="h-4 w-4" /> Back</Button>
            <span className="h-5 w-px bg-border" />
            <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" />
            <span className="font-semibold truncate">Canvas</span>
            <span className="text-xs text-muted-foreground truncate hidden sm:inline">· {active.title}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canvasDirty && <span className="text-xs text-amber-600 dark:text-amber-400">Unsaved changes</span>}
            <Button size="sm" onClick={saveCanvasEdits} disabled={canvasSaving || !canvasDirty} className="gap-1">{canvasSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save</Button>
            <Button size="sm" variant="outline" onClick={() => exportWord(canvasTitle, canvasContent)} className="gap-1"><Download className="h-3.5 w-3.5" /> Word</Button>
            <Button size="sm" variant="outline" onClick={() => printPdf(canvasTitle, canvasContent)} className="gap-1"><Printer className="h-3.5 w-3.5" /> PDF</Button>
            <Button size="sm" variant="outline" onClick={() => copyText(canvasContent)} className="gap-1"><Copy className="h-3.5 w-3.5" /> Copy</Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          {/* Left: tutor chat */}
          <div className="flex flex-col w-full md:w-[42%] md:max-w-[480px] border-b md:border-b-0 md:border-r border-border min-h-0 h-[42vh] md:h-auto bg-slate-50 dark:bg-slate-900">
            <div className="px-4 py-2.5 border-b border-indigo-300 dark:border-indigo-500/40 bg-indigo-600 dark:bg-indigo-700 flex items-center gap-2 shrink-0">
              <Bot className="h-4 w-4 text-white shrink-0" />
              <span className="text-sm font-semibold text-white">Talk to your tutor here</span>
              <span className="text-xs text-indigo-100 hidden sm:inline">— it edits the document live →</span>
            </div>
            <div ref={canvasChatRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
              {canvasMsgs.length === 0 && (
                <div className="text-center py-8 px-3">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 text-indigo-500" />
                  <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">Co-write & review here</p>
                  <p className="text-xs mt-1.5 text-slate-600 dark:text-slate-300 leading-relaxed max-w-xs mx-auto">Ask me to improve the introduction, add a reference, expand a section, fix the English, add the references list — I'll edit the document directly.</p>
                  <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                    {["Review this against the brief & criteria", "Improve the introduction", "Add a References list (Harvard)", "Check the academic English"].map((s) => (
                      <Button key={s} variant="outline" size="sm" className="text-xs h-auto py-1 px-2 whitespace-normal bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-600 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700" onClick={() => sendCanvasMessage(s)} disabled={canvasSending}>{s}</Button>
                    ))}
                  </div>
                </div>
              )}
              {canvasMsgs.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[88%] rounded-lg p-2.5 text-sm whitespace-pre-wrap shadow-sm ${m.role === "user" ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700"}`}>{m.content}</div>
                  {m.role === "assistant" && !m.edited && i === canvasMsgs.length - 1 && !canvasSending && (
                    <Button size="sm" variant="outline" className="mt-1.5 h-7 gap-1 text-xs bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 hover:text-white" onClick={applySuggestions} disabled={canvasSending}>
                      <Sparkles className="h-3 w-3" /> Apply to document
                    </Button>
                  )}
                </div>
              ))}
              {canvasSending && <div className="flex justify-start"><div className="bg-muted rounded-lg p-2.5"><Loader2 className="h-4 w-4 animate-spin text-indigo-500" /></div></div>}
            </div>
            <div className="border-t border-indigo-200 dark:border-indigo-500/30 bg-white dark:bg-slate-900 p-2.5 flex gap-2 shrink-0">
              <Input
                value={canvasInput}
                onChange={(e) => setCanvasInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendCanvasMessage(); } }}
                placeholder="Tell the tutor what to change..."
                disabled={canvasSending}
                className="flex-1 bg-background"
              />
              <Button onClick={() => sendCanvasMessage()} disabled={canvasSending || !canvasInput.trim()} size="sm"><Send className="h-4 w-4" /></Button>
            </div>
          </div>

          {/* Right: live document */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-slate-100 dark:bg-slate-950">
            <div className="px-4 py-2 border-b border-border shrink-0 bg-background">
              <Input
                value={canvasTitle}
                onChange={(e) => { setCanvasTitle(e.target.value); setCanvasDirty(true); }}
                className="font-semibold border-0 px-0 text-base focus-visible:ring-0 shadow-none h-auto"
                placeholder="Document title"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
              <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-lg border border-border shadow-sm p-5 sm:p-8 min-h-full">
                <RichTextEditor value={canvasContent} onChange={(v) => { setCanvasContent(v); setCanvasDirty(true); }} />
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // WORKSPACE
  const modeMessages = active.messages.filter((m) => m.mode === (tab === "english" ? "english" : "tutor"));
  const isChat = tab === "tutor" || tab === "english";
  const suggestions = tab === "english"
    ? ["Ask me a mock practical exam question", "Correct this: ...", "Teach me clinical vocabulary for knee assessment", "How do I explain my treatment rationale in English?"]
    : ["Summarise the assignment brief and criteria", "Help me plan the structure", "Draft the introduction", "What does the assessor want for a distinction?"];

  return (
    <div className="space-y-4">
      {/* Workspace header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => { setActive(null); fetchProjects(); }} className="gap-1 shrink-0"><ChevronLeft className="h-4 w-4" /> Projects</Button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">{active.title}</h1>
            <div className="flex gap-1.5"><Badge variant="outline" className="text-xs">{active.level || active.course}</Badge><Badge variant="secondary" className="text-xs">{active.provider}</Badge></div>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-destructive gap-1" onClick={() => deleteProject(active.id)}><Trash2 className="h-4 w-4" /></Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit flex-wrap">
        {([["plan", "Plan", ListChecks], ["tutor", "Tutor", Bot], ["english", "English", Languages], ["documents", "Documents", FileText], ["drafts", "Drafts", FileCheck]] as const).map(([key, label, Icon]) => (
          <Button key={key} variant={tab === key ? "default" : "ghost"} size="sm" onClick={() => setTab(key)} className="gap-2">
            <Icon className="h-4 w-4" /> {label}
            {key === "plan" && active.tasks.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{active.tasks.length}</Badge>}
            {key === "documents" && active.documents.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{active.documents.length}</Badge>}
            {key === "drafts" && active.drafts.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{active.drafts.length}</Badge>}
          </Button>
        ))}
      </div>

      {/* PLAN / TASKS */}
      {tab === "plan" && (
        <div className="space-y-5">
          {active.tasks.length > 0 && (() => {
            const total = active.tasks.length;
            const done = active.tasks.filter((t) => t.status === "done").length;
            const pct = Math.round((done / total) * 100);
            const upcoming = active.tasks
              .filter((t) => t.status !== "done" && t.dueDate)
              .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
              .slice(0, 3);
            return (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Progress</p>
                      <p className="text-xs text-muted-foreground">{done} of {total} activities done</p>
                    </div>
                    <Button size="sm" onClick={askFocus} disabled={focusLoading} className="gap-2">
                      {focusLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} What should I start today?
                    </Button>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  {upcoming.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="text-xs text-muted-foreground">Next deadlines:</span>
                      {upcoming.map((t) => {
                        const due = fmtDue(t.dueDate);
                        return (
                          <button key={t.id} onClick={() => setOpenTask(t)} className={`text-[11px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 hover:opacity-80 ${due?.urgent ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
                            <CalendarClock className="h-3 w-3" />{due?.label} · {t.title.length > 24 ? t.title.slice(0, 24) + "…" : t.title}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {focusText && (
                    <div className="rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-950/30 p-3 relative">
                      <div className="flex items-center gap-1.5 mb-1"><Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-300" /><span className="text-xs font-semibold text-indigo-900 dark:text-indigo-100">Today's focus</span>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto" onClick={() => setFocusText(null)}><X className="h-3.5 w-3.5" /></Button>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{focusText}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          <Card className="border-indigo-300 dark:border-indigo-500/40 bg-indigo-50 dark:bg-indigo-950/30">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="font-semibold text-slate-900 dark:text-white">Organise your work into activities</h2>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200">
                Brain-dump everything you have to do — assignments, studies, exams, readings, deadlines — and I'll split it into clear activities so you can tackle one at a time. {active.documents.length > 0 ? "I'll also read your uploaded documents." : "Tip: upload your syllabus in Documents and I'll use it too."}
              </p>
              <Textarea
                rows={4}
                value={braindump}
                onChange={(e) => setBraindump(e.target.value)}
                placeholder={"e.g. Unit 3 assignment on injury assessment due 30 June (2500 words); revise for practical exam in July; read chapters 4-6; reflective journal weekly..."}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border-slate-300 dark:border-slate-600"
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={runBreakdown} disabled={breakingDown} className="gap-2">
                  {breakingDown ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Organise into activities
                </Button>
                <Button variant="outline" onClick={() => setShowAddTask(true)} className="gap-2"><Plus className="h-4 w-4" /> Add activity manually</Button>
              </div>
            </CardContent>
          </Card>

          {active.tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No activities yet. Brain-dump above and let the tutor break it down for you.</p>
          ) : (
            TASK_STATUSES.map((st) => {
              const group = active.tasks.filter((t) => (t.status || "todo") === st.value);
              if (group.length === 0) return null;
              return (
                <div key={st.value} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${st.color}`}>{st.label}</span>
                    <span className="text-xs text-muted-foreground">{group.length}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.map((t) => {
                      const due = fmtDue(t.dueDate);
                      const prio = PRIORITY_META[t.priority] || PRIORITY_META.medium;
                      return (
                        <Card key={t.id} className={`cursor-pointer hover:border-indigo-400 transition-colors ${t.status === "done" ? "opacity-70" : ""}`} onClick={() => setOpenTask(t)}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleDone(t); }}
                                title={t.status === "done" ? "Mark as not done" : "Mark as done"}
                                className={`shrink-0 mt-0.5 transition-colors ${t.status === "done" ? "text-green-600 dark:text-green-400" : "text-muted-foreground hover:text-green-600"}`}
                              >
                                {t.status === "done" ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                              </button>
                              <h3 className={`font-semibold leading-snug flex-1 ${t.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</h3>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive shrink-0" onClick={(e) => { e.stopPropagation(); deleteTask(t.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              <Badge variant="outline" className="text-[10px]">{TASK_TYPES[t.type] || t.type}</Badge>
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${prio.color}`}>{prio.label}</span>
                              {due && <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${due.urgent ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}><CalendarClock className="h-2.5 w-2.5" />{due.label}</span>}
                              {t.drafts && t.drafts.length > 0 && <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1"><FileCheck className="h-3 w-3" />{t.drafts.length}</span>}
                            </div>
                            {t.brief && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{t.brief}</p>}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* CHAT (tutor / english) */}
      {isChat && (
        <div className="space-y-3">
          <Card className={tab === "english" ? "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40" : "border-indigo-300 dark:border-indigo-500/40 bg-indigo-50 dark:bg-indigo-950/40"}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1.5">
                {tab === "english" ? <Languages className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> : <Bot className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
                <h2 className="font-semibold text-slate-900 dark:text-white">{tab === "english" ? "English Exam Coach" : "Academic Tutor"}</h2>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                {tab === "english"
                  ? "Practise spoken & written English for your practical exam. I correct you, teach clinical vocabulary and run mock questions."
                  : "I help you understand and write your coursework to a distinction standard, grounded in your uploaded brief & criteria."}
              </p>
              {active.documents.length === 0 && (
                <p className="text-xs mt-2 font-medium text-amber-700 dark:text-amber-300">Tip: upload your assignment brief & marking criteria in the Documents tab so I can tailor everything to them.</p>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                {suggestions.map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    className="text-xs h-auto py-1.5 px-3 whitespace-normal text-left bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700"
                    onClick={() => sendMessage(s)}
                    disabled={sending}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[55vh]">
              {modeMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-12 text-muted-foreground">
                  <Sparkles className="h-10 w-10 mb-3 text-indigo-400" />
                  <p className="font-medium text-foreground">Start chatting with your {tab === "english" ? "English coach" : "tutor"}</p>
                  <p className="text-sm mt-1">Type below, use a suggestion, or press the mic to speak.</p>
                </div>
              )}
              {modeMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-lg p-3 text-sm whitespace-pre-wrap ${m.role === "user" ? (tab === "english" ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white") : "bg-muted text-foreground"}`}>
                    {m.role === "assistant" ? formatReply(m.content) : m.content}
                  </div>
                </div>
              ))}
              {sending && <div className="flex justify-start"><div className="bg-muted rounded-lg p-3"><Loader2 className="h-4 w-4 animate-spin text-indigo-500" /></div></div>}
            </div>

            {/* Pending draft banner */}
            {pendingDraft && tab === "tutor" && (
              <div className="border-t border-green-300 bg-green-50 dark:bg-green-900/20 p-3 flex items-center justify-between gap-2">
                <div className="text-sm min-w-0"><strong className="text-green-800 dark:text-green-300">Draft ready:</strong> <span className="text-green-700 dark:text-green-400 truncate">{pendingDraft.title}</span></div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1" onClick={openPendingInCanvas}><Sparkles className="h-3.5 w-3.5" /> Open in Canvas</Button>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => savePendingDraft()}><Save className="h-3.5 w-3.5" /> Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setPendingDraft(null)}>Dismiss</Button>
                </div>
              </div>
            )}

            <div className="border-t border-border p-3 flex gap-2">
              <Button type="button" variant={recording ? "destructive" : "outline"} size="sm" className="shrink-0" onClick={toggleRecording} title="Speak">
                {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={tab === "english" ? "Write in English (I'll correct you) or ask for a mock question..." : "Ask anything, or ask me to draft a section..."}
                disabled={sending}
                className="flex-1"
              />
              <Button onClick={() => sendMessage()} disabled={sending || !chatInput.trim()} size="sm" className="gap-1"><Send className="h-4 w-4" /></Button>
            </div>
          </Card>
        </div>
      )}

      {/* DOCUMENTS */}
      {tab === "documents" && (
        <div className="space-y-4">
          <Card><CardContent className="p-4 space-y-3">
            <div className="space-y-1 max-w-xs">
              <Label className="text-xs">Document type (applied to all files you add now)</Label>
              <Select value={uploadKind} onValueChange={setUploadKind}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <input ref={fileRef} type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.txt,.md,.csv,.rtf,image/*" onChange={(e) => { if (e.target.files?.length) uploadDocs(e.target.files); }} />

            <div
              onClick={() => !uploading && fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); if (!uploading && e.dataTransfer.files?.length) uploadDocs(e.dataTransfer.files); }}
              className={`rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${dragOver ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40" : "border-border hover:border-indigo-400 hover:bg-muted/50"} ${uploading ? "pointer-events-none opacity-70" : ""}`}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                  <p className="text-sm font-medium">Uploading {uploadProgress ? `${uploadProgress.done}/${uploadProgress.total}` : ""}...</p>
                  <p className="text-xs text-muted-foreground">Reading text from your files</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <Upload className="h-6 w-6 text-indigo-500" />
                  <p className="text-sm font-medium text-foreground">Drag &amp; drop files here, or click to choose</p>
                  <p className="text-xs text-muted-foreground">Select <strong>multiple</strong> files at once · PDF, Word, text, and photos/images</p>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">The tutor reads these to ground its help in your exact brief &amp; criteria. For scanned/photo documents the text is read with AI vision. Max 20MB per file.</p>
          </CardContent></Card>

          {active.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No documents yet. Upload your assignment brief and marking criteria.</p>
          ) : (
            <div className="space-y-2">
              {active.documents.map((d) => (
                <Card key={d.id}><CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileType className="h-5 w-5 text-indigo-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{d.originalName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">{DOC_KINDS.find((k) => k.value === d.kind)?.label || d.kind}</Badge>
                        <span>{fmtSize(d.fileSize)}</span>
                        {d.extractStatus === "done" && <span className="text-green-600">Text extracted</span>}
                        {d.extractStatus === "failed" && <span className="text-red-500" title={d.extractError || ""}>Extraction failed</span>}
                        {d.extractStatus === "pending" && <span className="text-amber-500">Processing...</span>}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive shrink-0" onClick={() => deleteDoc(d.id)}><Trash2 className="h-4 w-4" /></Button>
                </CardContent></Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DRAFTS */}
      {tab === "drafts" && (
        <div className="space-y-5">
          {active.drafts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No work yet. In the Tutor tab, ask the AI to draft a section — then click "Save to Drafts". Your saved work appears here, organised by stage.</p>
          ) : (
            DRAFT_STATUSES.map((st) => {
              const group = active.drafts.filter((d) => (d.status || "writing") === st.value);
              if (group.length === 0) return null;
              return (
                <div key={st.value} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${st.color}`}>{st.label}</span>
                    <span className="text-xs text-muted-foreground">{group.length}</span>
                  </div>
                  {group.map((d) => (
                    <Card key={d.id}><CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground">{d.title}</h3>
                          <p className="text-xs text-muted-foreground">{d.wordCount} words · updated {new Date(d.updatedAt).toLocaleDateString("en-GB")}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" className="gap-1" onClick={() => openCanvas(d)}><Sparkles className="h-3.5 w-3.5" /> Open in Canvas</Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => deleteDraft(d.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none mt-2 line-clamp-3 text-muted-foreground" dangerouslySetInnerHTML={{ __html: d.content }} />
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <Select value={d.status || "writing"} onValueChange={(v) => updateDraftStatus(d.id, v)}>
                          <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{DRAFT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => reviewDraft(d)}><Bot className="h-3.5 w-3.5" /> Review with tutor</Button>
                        <span className="mx-1 h-5 w-px bg-border" />
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => exportWord(d.title, d.content)}><Download className="h-3.5 w-3.5" /> Word</Button>
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => printPdf(d.title, d.content)}><Printer className="h-3.5 w-3.5" /> PDF</Button>
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => copyText(d.content)}><Copy className="h-3.5 w-3.5" /> Copy</Button>
                      </div>
                    </CardContent></Card>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Draft editor dialog */}
      <Dialog open={!!editingDraft} onOpenChange={(o) => { if (!o) setEditingDraft(null); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5 text-indigo-600" /> Edit Draft</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">Title</Label><Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Content</Label><RichTextEditor value={draftContent} onChange={setDraftContent} /></div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={saveDraftEdits} disabled={savingDraft} className="gap-2">{savingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save</Button>
              <Button variant="outline" onClick={() => exportWord(draftTitle, draftContent)} className="gap-1"><Download className="h-3.5 w-3.5" /> Word</Button>
              <Button variant="outline" onClick={() => printPdf(draftTitle, draftContent)} className="gap-1"><Printer className="h-3.5 w-3.5" /> PDF</Button>
              <Button variant="ghost" onClick={() => setEditingDraft(null)} className="gap-1"><X className="h-4 w-4" /> Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task detail dialog */}
      <Dialog open={!!openTask} onOpenChange={(o) => { if (!o) setOpenTask(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {openTask && (
            <>
              <DialogHeader><DialogTitle className="flex items-center gap-2 pr-6"><ListChecks className="h-5 w-5 text-indigo-600 shrink-0" /> {openTask.title}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={openTask.status} onValueChange={(v) => updateTask(openTask.id, { status: v })}>
                    <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{TASK_STATUSES.map((s) => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={openTask.priority} onValueChange={(v) => updateTask(openTask.id, { priority: v })}>
                    <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(PRIORITY_META).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v.label} priority</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="date" value={openTask.dueDate ? openTask.dueDate.slice(0, 10) : ""} onChange={(e) => updateTask(openTask.id, { dueDate: e.target.value || null })} className="h-8 w-[150px] text-xs" />
                </div>

                {openTask.brief && <div><Label className="text-xs text-muted-foreground">What's required</Label><p className="text-sm mt-1">{openTask.brief}</p></div>}
                {openTask.steps && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Suggested steps</Label>
                    <div className="prose prose-sm dark:prose-invert max-w-none mt-1" dangerouslySetInnerHTML={{ __html: openTask.steps }} />
                  </div>
                )}

                {openTask.drafts && openTask.drafts.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Work for this activity</Label>
                    {openTask.drafts.map((d) => (
                      <div key={d.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2">
                        <span className="text-sm truncate">{d.title} <span className="text-xs text-muted-foreground">· {d.wordCount} words</span></span>
                        <Button size="sm" variant="outline" className="gap-1 shrink-0" onClick={() => openTaskDraftInCanvas(d)}><Sparkles className="h-3.5 w-3.5" /> Open in Canvas</Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button onClick={() => startTaskDraft(openTask)} className="gap-2"><Sparkles className="h-4 w-4" /> Start writing this (Canvas)</Button>
                  <Button variant="outline" onClick={() => discussTask(openTask)} className="gap-2"><Bot className="h-4 w-4" /> Discuss with tutor</Button>
                  <Button variant={openTask.status === "done" ? "secondary" : "outline"} onClick={() => toggleDone(openTask)} className="gap-2">
                    {openTask.status === "done" ? <><Circle className="h-4 w-4" /> Reopen</> : <><CheckCircle2 className="h-4 w-4 text-green-600" /> Mark done</>}
                  </Button>
                  <Button variant="ghost" className="text-destructive gap-1 ml-auto" onClick={() => deleteTask(openTask.id)}><Trash2 className="h-4 w-4" /> Delete</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add activity dialog */}
      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-indigo-600" /> Add activity</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">Title *</Label><Input value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} placeholder="e.g. Unit 3 — Injury assessment essay" /></div>
            <div className="space-y-1"><Label className="text-xs">What's required (optional)</Label><Textarea rows={2} value={newTask.brief} onChange={(e) => setNewTask({ ...newTask, brief: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Type</Label>
                <Select value={newTask.type} onValueChange={(v) => setNewTask({ ...newTask, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TASK_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Priority</Label>
                <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(PRIORITY_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Due date (optional)</Label><Input type="date" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} /></div>
            <div className="flex gap-2 pt-1">
              <Button onClick={addTask} className="flex-1 gap-2"><Plus className="h-4 w-4" /> Add</Button>
              <Button variant="outline" onClick={() => setShowAddTask(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {loadingProject && <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>}
    </div>
  );
}
