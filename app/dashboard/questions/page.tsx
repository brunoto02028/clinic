"use client";

import { useState, useEffect } from "react";
import { useRef } from "react";
import { Loader2, CheckCircle2, Send, MessageCircleQuestion, ChevronDown, ChevronUp, ClipboardList, HelpCircle, Megaphone, BellRing, MessageSquare, Paperclip, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/hooks/use-locale";

interface QuestionSet {
  id: string;
  type?: "questions" | "report";
  questions: string[];
  context: string | null;
  status: "pending" | "answered" | "reviewed";
  answers: { index: number; question: string; answer: string }[] | null;
  language: string;
  createdAt: string;
  answeredAt: string | null;
}

interface ClinicMsg {
  id: string;
  senderRole: "staff" | "patient";
  kind: "message" | "notice" | "broadcast";
  title: string | null;
  content: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  readAt: string | null;
  createdAt: string;
  sender: { firstName: string; lastName: string; role: string };
}

type TimelineItem =
  | { kind: "qset"; createdAt: string; q: QuestionSet }
  | { kind: "msg"; createdAt: string; m: ClinicMsg };

function dayKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDayLabel(dateStr: string, isPt: boolean) {
  return new Date(dateStr).toLocaleDateString(isPt ? "pt-BR" : "en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatTime(dateStr: string, isPt: boolean) {
  return new Date(dateStr).toLocaleTimeString(isPt ? "pt-BR" : "en-GB", {
    hour: "2-digit", minute: "2-digit",
  });
}

export default function QuestionsPage() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [msgs, setMsgs] = useState<ClinicMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [chatDraft, setChatDraft] = useState("");
  const [chatFile, setChatFile] = useState<File | null>(null);
  const [sendingChat, setSendingChat] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/patient/questions").then(r => r.json()).catch(() => []),
      fetch("/api/patient/messages").then(r => r.ok ? r.json() : []).catch(() => []),
    ])
      .then(([qData, mData]) => {
        const arr: QuestionSet[] = Array.isArray(qData) ? qData : [];
        setSets(arr);
        setMsgs(Array.isArray(mData) ? mData : []);
        const initial: Record<string, boolean> = {};
        arr.forEach(s => {
          if (s.status !== "pending" && s.type !== "report") initial[s.id] = true;
        });
        setCollapsed(initial);
        // Mark staff messages as read
        fetch("/api/patient/messages", { method: "PATCH" }).catch(() => {});
      })
      .finally(() => setLoading(false));
  }, []);

  const sendChat = async () => {
    if (!chatDraft.trim() && !chatFile) return;
    setSendingChat(true);
    try {
      let r: Response;
      if (chatFile) {
        const fd = new FormData();
        fd.append("content", chatDraft);
        fd.append("file", chatFile);
        r = await fetch("/api/patient/messages", { method: "POST", body: fd });
      } else {
        r = await fetch("/api/patient/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: chatDraft }),
        });
      }
      if (r.ok) {
        const msg = await r.json();
        setMsgs(m => [...m, msg]);
        setChatDraft("");
        setChatFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } finally {
      setSendingChat(false);
    }
  };

  const initDraft = (set: QuestionSet) => {
    if (!drafts[set.id]) {
      setDrafts(d => ({
        ...d,
        [set.id]: set.answers
          ? (set.questions as string[]).map((_, i) => set.answers?.find(a => a.index === i)?.answer || "")
          : (set.questions as string[]).map(() => ""),
      }));
    }
  };

  const handleSubmit = async (set: QuestionSet) => {
    initDraft(set);
    const answers = (set.questions as string[]).map((q, i) => ({
      index: i, question: q, answer: drafts[set.id]?.[i] || "",
    }));
    setSubmitting(set.id);
    const r = await fetch("/api/patient/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionSetId: set.id, answers }),
    });
    if (r.ok) {
      setSubmitted(s => ({ ...s, [set.id]: true }));
      setSets(prev => prev.map(s =>
        s.id === set.id ? { ...s, status: "answered", answeredAt: new Date().toISOString(), answers } : s
      ));
    }
    setSubmitting(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  const pendingCount = sets.filter(s => s.status === "pending" && s.type !== "report").length;

  // Merge question sets + chat messages into one timeline, group by day, newest-first
  const timeline: TimelineItem[] = [
    ...sets.map(q => ({ kind: "qset" as const, createdAt: q.createdAt, q })),
    ...msgs.map(m => ({ kind: "msg" as const, createdAt: m.createdAt, m })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const days: { key: string; label: string; items: TimelineItem[] }[] = [];
  timeline.forEach(item => {
    const k = dayKey(item.createdAt);
    let group = days.find(d => d.key === k);
    if (!group) { group = { key: k, label: formatDayLabel(item.createdAt, isPt), items: [] }; days.push(group); }
    group.items.push(item);
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {isPt ? "Mensagens da Clínica" : "Clinic Messages"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isPt ? "Comunicações do seu terapeuta" : "Communications from your therapist"}
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full text-xs font-semibold text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            {pendingCount} {isPt ? "pendente" : "pending"}{pendingCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Empty state */}
      {sets.length === 0 && msgs.length === 0 && (
        <div className="text-center py-24 space-y-3">
          <MessageCircleQuestion className="h-12 w-12 text-muted-foreground/20 mx-auto" />
          <p className="text-sm text-muted-foreground">
            {isPt ? "Nenhuma mensagem por enquanto." : "No messages yet."}
          </p>
        </div>
      )}

      {/* Timeline grouped by day */}
      {days.map(day => (
        <div key={day.key} className="space-y-4">
          {/* Day separator */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border/50" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              {day.label}
            </span>
            <div className="flex-1 h-px bg-border/50" />
          </div>

          {/* Cards for this day */}
          {day.items.map(item => {
            if (item.kind === "msg") {
              const m = item.m;
              const fromStaff = m.senderRole === "staff";
              const isBroadcast = m.kind === "broadcast";
              return (
                <div key={m.id} className={`flex ${fromStaff ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[85%] rounded-2xl border px-4 py-3 ${
                    isBroadcast
                      ? "bg-amber-500/5 border-amber-500/25"
                      : fromStaff
                      ? "bg-card border-border"
                      : "bg-primary/10 border-primary/25"
                  }`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {isBroadcast
                        ? <Megaphone className="h-3 w-3 text-amber-400" />
                        : m.kind === "notice"
                        ? <BellRing className="h-3 w-3 text-primary" />
                        : <MessageSquare className="h-3 w-3 text-muted-foreground" />}
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {fromStaff
                          ? (isBroadcast ? (isPt ? "Aviso da Clínica" : "Clinic Notice") : `${m.sender.firstName} (${isPt ? "clínica" : "clinic"})`)
                          : (isPt ? "Você" : "You")}
                      </span>
                      <span className="text-[9px] text-muted-foreground/60">{formatTime(m.createdAt, isPt)}</span>
                    </div>
                    {m.title && <p className="text-xs font-bold mb-1">{m.title}</p>}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                    {m.attachmentUrl && (
                      m.attachmentType?.startsWith("image/") ? (
                        <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block mt-2">
                          <img src={m.attachmentUrl} alt={m.attachmentName || ""} className="max-h-48 rounded-xl border border-border/50 object-cover" />
                        </a>
                      ) : (
                        <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-2 px-3 py-2 bg-muted/40 border border-border/60 rounded-xl text-xs font-medium hover:bg-muted/70 transition-colors">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="truncate">{m.attachmentName || (isPt ? "Anexo" : "Attachment")}</span>
                        </a>
                      )
                    )}
                  </div>
                </div>
              );
            }
            const set = item.q;
            const isReport = set.type === "report";
            const isPending = set.status === "pending";
            const isSubmitted = submitted[set.id];
            const isCollapsed = collapsed[set.id] ?? false;
            if (!isReport) initDraft(set);

            return (
              <div
                key={set.id}
                className={`rounded-2xl border overflow-hidden transition-all ${
                  isReport
                    ? "border-emerald-500/25 bg-emerald-500/5"
                    : isPending
                    ? "border-primary/30 bg-primary/5 shadow-sm shadow-primary/10"
                    : "border-border bg-card"
                }`}
              >
                {/* Card header */}
                <div
                  className={`flex items-center gap-3 px-4 py-3 ${
                    isReport
                      ? "bg-emerald-500/10 border-b border-emerald-500/20"
                      : isPending
                      ? "bg-primary/10 border-b border-primary/20"
                      : "bg-muted/30 border-b border-border/50"
                  } ${!isReport && !isPending ? "cursor-pointer" : ""}`}
                  onClick={() => {
                    if (!isReport && !isPending) {
                      setCollapsed(c => ({ ...c, [set.id]: !c[set.id] }));
                    }
                  }}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isReport ? "bg-emerald-500/20" : "bg-primary/20"
                  }`}>
                    {isReport
                      ? <ClipboardList className="h-4 w-4 text-emerald-400" />
                      : <HelpCircle className="h-4 w-4 text-primary" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${isReport ? "text-emerald-300" : isPending ? "text-primary" : "text-foreground"}`}>
                      {isReport
                        ? (isPt ? "Relatório / Mensagem Clínica" : "Clinical Report / Message")
                        : (isPt ? "Pré-Atendimento — Perguntas" : "Pre-Appointment Questions")}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatTime(set.createdAt, isPt)}
                      {set.context && set.context !== "Pre-assessment questions" && set.context !== "Relatório/Feedback"
                        ? ` · ${set.context}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!isReport && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isPending
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        {isPending ? (isPt ? "⏳ Pendente" : "⏳ Pending") : (isPt ? "✅ Respondido" : "✅ Answered")}
                      </span>
                    )}
                    {isReport && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                        {isPt ? "✓ Recebido" : "✓ Received"}
                      </span>
                    )}
                    {!isReport && !isPending && (
                      isCollapsed ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Card body */}
                {!isCollapsed && (
                  <div className="px-4 py-4 space-y-4">

                    {/* REPORT: plain text lines */}
                    {isReport && (
                      <div className="space-y-2">
                        {(set.questions as string[]).map((line, i) => (
                          <p key={i} className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{line}</p>
                        ))}
                      </div>
                    )}

                    {/* QUESTIONS: each question with answer area */}
                    {!isReport && (
                      <div className="space-y-5">
                        {(set.questions as string[]).map((q, i) => {
                          const existingAnswer = set.answers?.find(a => a.index === i)?.answer;
                          const draftAnswer = drafts[set.id]?.[i] || "";
                          return (
                            <div key={i} className="space-y-2">
                              {/* Question */}
                              <div className="flex items-start gap-2.5">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 ${
                                  isPending ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                                }`}>{i + 1}</span>
                                <p className="text-sm font-medium text-foreground leading-snug flex-1">{q}</p>
                              </div>

                              {/* Existing answer (already submitted) */}
                              {!isPending && existingAnswer && (
                                <div className="ml-7 bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-3 py-2.5">
                                  <p className="text-[10px] font-semibold text-emerald-400/70 mb-1">{isPt ? "Sua resposta" : "Your reply"}</p>
                                  <p className="text-sm text-foreground leading-relaxed">{existingAnswer}</p>
                                </div>
                              )}

                              {/* Draft textarea (pending) */}
                              {isPending && !isSubmitted && (
                                <div className="ml-7">
                                  <Textarea
                                    className="text-sm min-h-[72px] resize-y bg-background border-border/70 rounded-xl focus:border-primary/60 focus:ring-primary/20 placeholder:text-muted-foreground/40"
                                    placeholder={isPt ? "A sua resposta…" : "Your reply…"}
                                    value={draftAnswer}
                                    onChange={e => setDrafts(d => {
                                      const arr = [...(d[set.id] || (set.questions as string[]).map(() => ""))];
                                      arr[i] = e.target.value;
                                      return { ...d, [set.id]: arr };
                                    })}
                                  />
                                </div>
                              )}

                              {/* Submitted draft */}
                              {isPending && isSubmitted && draftAnswer && (
                                <div className="ml-7 bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-3 py-2.5">
                                  <p className="text-sm text-foreground leading-relaxed">{draftAnswer}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Submit button / success state */}
                        {isPending && (
                          isSubmitted ? (
                            <div className="flex items-center gap-2.5 p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl">
                              <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-semibold text-emerald-400">{isPt ? "Respostas enviadas!" : "Replies sent!"}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{isPt ? "O teu terapeuta vai rever antes da consulta." : "Your therapist will review before your appointment."}</p>
                              </div>
                            </div>
                          ) : (
                            <Button
                              className="w-full gap-2 bg-primary hover:bg-primary/90 rounded-xl"
                              onClick={() => handleSubmit(set)}
                              disabled={submitting === set.id || !(drafts[set.id] || []).some(a => a.trim())}
                            >
                              {submitting === set.id
                                ? <><Loader2 className="h-4 w-4 animate-spin" />{isPt ? "A enviar…" : "Sending…"}</>
                                : <><Send className="h-4 w-4" />{isPt ? "Enviar Respostas" : "Send Replies"}</>}
                            </Button>
                          )
                        )}

                        {/* Already answered footer */}
                        {!isPending && set.answeredAt && (
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                            {isPt ? "Respondido em" : "Replied on"}{" "}
                            {new Date(set.answeredAt).toLocaleDateString(isPt ? "pt-BR" : "en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Reply composer — patient can message the clinic */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-background/95 backdrop-blur border-t border-border p-3">
        <div className="max-w-2xl mx-auto space-y-2">
        {chatFile && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/25 rounded-xl text-xs">
            <Paperclip className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate flex-1 font-medium">{chatFile.name}</span>
            <span className="text-muted-foreground">{(chatFile.size / 1024 / 1024).toFixed(1)}MB</span>
            <button onClick={() => { setChatFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="p-0.5 hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.txt,.csv"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) setChatFile(f); }}
          />
          <Button
            size="icon"
            variant="outline"
            className="rounded-xl h-11 w-11 shrink-0"
            onClick={() => fileInputRef.current?.click()}
            title={isPt ? "Anexar ficheiro (foto, PDF, exame…)" : "Attach file (photo, PDF, exam…)"}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            value={chatDraft}
            onChange={e => setChatDraft(e.target.value)}
            placeholder={isPt ? "Escreva uma mensagem à clínica…" : "Write a message to the clinic…"}
            className="text-sm min-h-[44px] max-h-32 resize-none rounded-xl flex-1"
            rows={1}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); }
            }}
          />
          <Button
            size="icon"
            className="rounded-xl h-11 w-11 shrink-0"
            onClick={sendChat}
            disabled={sendingChat || (!chatDraft.trim() && !chatFile)}
          >
            {sendingChat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
}
