"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, Send, MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/hooks/use-locale";

interface QuestionSet {
  id: string;
  questions: string[];
  context: string | null;
  status: "pending" | "answered" | "reviewed";
  answers: { index: number; question: string; answer: string }[] | null;
  language: string;
  createdAt: string;
  answeredAt: string | null;
}

const CLINIC_AVATAR = "https://bpr.rehab/favicon.ico";

function ClinicBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary text-xs font-bold">B</div>
      <div className="flex-1 bg-muted/40 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-foreground leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function PatientBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 flex-row-reverse">
      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400 text-xs font-bold">V</div>
      <div className="flex-1 bg-emerald-600/15 border border-emerald-500/20 rounded-2xl rounded-tr-none px-4 py-3 text-sm text-foreground leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export default function QuestionsPage() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSet, setActiveSet] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/patient/questions")
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : [];
        setSets(arr);
        const firstPending = arr.find((s: QuestionSet) => s.status === "pending");
        if (firstPending) setActiveSet(firstPending.id);
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
    const answers = (set.questions as string[]).map((q, i) => ({
      index: i,
      question: q,
      answer: drafts[set.id]?.[i] || "",
    }));
    setSubmitting(set.id);
    const r = await fetch("/api/patient/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionSetId: set.id, answers }),
    });
    if (r.ok) {
      setSubmitted(s => ({ ...s, [set.id]: true }));
      setSets(prev => prev.map(s => s.id === set.id ? { ...s, status: "answered", answeredAt: new Date().toISOString(), answers } : s));
    }
    setSubmitting(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  const pending = sets.filter(s => s.status === "pending");
  const answered = sets.filter(s => s.status !== "pending");
  const current = sets.find(s => s.id === activeSet);

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-28 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">{isPt ? "Mensagens da Clínica" : "Messages from the Clinic"}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isPt ? "O teu terapeuta enviou algumas perguntas. Responde quando puderes." : "Your therapist sent you a few questions. Reply when you can."}
        </p>
      </div>

      {/* Selector if multiple sets */}
      {sets.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sets.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { setActiveSet(s.id); initDraft(s); }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                activeSet === s.id
                  ? "bg-primary text-white border-primary"
                  : s.status === "pending"
                  ? "border-amber-500/40 text-amber-400 bg-amber-500/5"
                  : "border-border text-muted-foreground"
              }`}
            >
              {new Date(s.createdAt).toLocaleDateString(isPt ? "pt-BR" : "en-GB", { day: "numeric", month: "short" })}
              {s.status === "pending" && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 inline-block align-middle" />}
            </button>
          ))}
        </div>
      )}

      {sets.length === 0 && (
        <div className="text-center py-20 space-y-3">
          <MessageCircleQuestion className="h-12 w-12 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">
            {isPt ? "Nenhuma mensagem por enquanto." : "No messages yet."}
          </p>
        </div>
      )}

      {/* Active conversation */}
      {current && (() => {
        initDraft(current);
        const isPending = current.status === "pending";
        const isSubmitted = submitted[current.id];
        return (
          <div className="space-y-5">
            {/* Clinic greeting */}
            <ClinicBubble>
              {isPt
                ? <>Olá! Antes da próxima consulta, gostaria de te fazer algumas perguntas para poder personalizar melhor o teu tratamento. Podes responder com calma.</>
                : <>Hi! Before your next appointment, I have a few questions to help me personalise your treatment. Take your time to reply.</>}
            </ClinicBubble>

            {/* Questions as conversation */}
            {(current.questions as string[]).map((q, i) => {
              const existingAnswer = current.answers?.find(a => a.index === i)?.answer;
              const draftAnswer = drafts[current.id]?.[i] || "";
              return (
                <div key={i} className="space-y-3">
                  <ClinicBubble>
                    <span className="text-primary font-medium text-xs mr-1.5">{i + 1}.</span>
                    {q}
                  </ClinicBubble>

                  {/* Answered: show patient reply bubble */}
                  {!isPending && existingAnswer && (
                    <PatientBubble>{existingAnswer}</PatientBubble>
                  )}

                  {/* Pending: show textarea */}
                  {isPending && !isSubmitted && (
                    <div className="flex items-start gap-3 flex-row-reverse">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400 text-xs font-bold">V</div>
                      <div className="flex-1">
                        <Textarea
                          className="text-sm min-h-[80px] resize-none bg-muted/20 border-border/60 rounded-xl focus:border-primary/50"
                          placeholder={isPt ? "A tua resposta…" : "Your reply…"}
                          value={draftAnswer}
                          onChange={e => setDrafts(d => {
                            const arr = [...(d[current.id] || (current.questions as string[]).map(() => ""))];
                            arr[i] = e.target.value;
                            return { ...d, [current.id]: arr };
                          })}
                        />
                      </div>
                    </div>
                  )}

                  {/* Submitted: show what was answered */}
                  {isPending && isSubmitted && (
                    <PatientBubble>{draftAnswer || <em className="text-muted-foreground/60">—</em>}</PatientBubble>
                  )}
                </div>
              );
            })}

            {/* Submit / Sent state */}
            {isPending && (
              isSubmitted ? (
                <div className="flex items-center gap-2.5 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-400">
                      {isPt ? "Respostas enviadas!" : "Replies sent!"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isPt ? "O teu terapeuta vai rever as tuas respostas antes da consulta." : "Your therapist will review your replies before the appointment."}
                    </p>
                  </div>
                </div>
              ) : (
                <Button
                  className="w-full gap-2 bg-primary hover:bg-primary/90"
                  onClick={() => handleSubmit(current)}
                  disabled={submitting === current.id || !(drafts[current.id] || []).some(a => a.trim())}
                >
                  {submitting === current.id
                    ? <><Loader2 className="h-4 w-4 animate-spin" />{isPt ? "A enviar…" : "Sending…"}</>
                    : <><Send className="h-4 w-4" />{isPt ? "Enviar Respostas" : "Send Replies"}</>}
                </Button>
              )
            )}

            {/* Already answered summary */}
            {!isPending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                {isPt ? "Respondido em" : "Replied on"}{" "}
                {current.answeredAt
                  ? new Date(current.answeredAt).toLocaleDateString(isPt ? "pt-BR" : "en-GB", { day: "numeric", month: "long", year: "numeric" })
                  : "—"}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
