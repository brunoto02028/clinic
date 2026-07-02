"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, Send, MessageCircleQuestion, ChevronDown, ChevronUp, ClipboardList, HelpCircle } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/patient/questions")
      .then(r => r.json())
      .then(data => {
        const arr: QuestionSet[] = Array.isArray(data) ? data : [];
        setSets(arr);
        const initial: Record<string, boolean> = {};
        arr.forEach(s => {
          if (s.status !== "pending" && s.type !== "report") initial[s.id] = true;
        });
        setCollapsed(initial);
      })
      .catch(() => setSets([]))
      .finally(() => setLoading(false));
  }, []);

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

  // Group by day, sorted newest-first
  const sorted = [...sets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const days: { key: string; label: string; items: QuestionSet[] }[] = [];
  sorted.forEach(s => {
    const k = dayKey(s.createdAt);
    let group = days.find(d => d.key === k);
    if (!group) { group = { key: k, label: formatDayLabel(s.createdAt, isPt), items: [] }; days.push(group); }
    group.items.push(s);
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
      {sets.length === 0 && (
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
          {day.items.map(set => {
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
    </div>
  );
}
