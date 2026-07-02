"use client";

import { useState, useEffect } from "react";
import { Loader2, MessageCircleQuestion, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export default function QuestionsPage() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSet, setOpenSet] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/patient/questions")
      .then(r => r.json())
      .then(data => setSets(Array.isArray(data) ? data : []))
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
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  const pending = sets.filter(s => s.status === "pending");
  const answered = sets.filter(s => s.status !== "pending");

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-24">
      <div>
        <h1 className="text-xl font-bold">{isPt ? "Perguntas do Terapeuta" : "Therapist Questions"}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isPt
            ? "O teu terapeuta enviou perguntas para completares antes da consulta."
            : "Your therapist sent questions for you to complete before your appointment."}
        </p>
      </div>

      {sets.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-2">
            <MessageCircleQuestion className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              {isPt ? "Nenhuma pergunta pendente." : "No questions pending."}
            </p>
          </CardContent>
        </Card>
      )}

      {pending.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
            {isPt ? `${pending.length} Pendente${pending.length > 1 ? "s" : ""}` : `${pending.length} Pending`}
          </p>
          {pending.map(set => (
            <Card key={set.id} className="border-amber-500/30">
              <button
                className="w-full p-4 flex items-center gap-3 text-left"
                onClick={() => { setOpenSet(openSet === set.id ? null : set.id); initDraft(set); }}
              >
                <MessageCircleQuestion className="h-5 w-5 text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {(set.questions as string[]).length} {isPt ? "perguntas" : "questions"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(set.createdAt).toLocaleDateString(isPt ? "pt-BR" : "en-GB")}
                    {set.context ? ` · ${set.context}` : ""}
                  </p>
                </div>
                {openSet === set.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {openSet === set.id && (
                <CardContent className="px-4 pb-4 pt-0 space-y-4 border-t">
                  {(set.questions as string[]).map((q, i) => (
                    <div key={i} className="space-y-1.5">
                      <p className="text-sm font-medium">
                        <span className="text-muted-foreground mr-1.5">{i + 1}.</span>{q}
                      </p>
                      <Textarea
                        className="text-sm min-h-[72px] resize-none"
                        placeholder={isPt ? "A tua resposta…" : "Your answer…"}
                        value={drafts[set.id]?.[i] || ""}
                        onChange={e => setDrafts(d => {
                          const arr = [...(d[set.id] || (set.questions as string[]).map(() => ""))];
                          arr[i] = e.target.value;
                          return { ...d, [set.id]: arr };
                        })}
                      />
                    </div>
                  ))}
                  {submitted[set.id] ? (
                    <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      {isPt ? "Respostas enviadas! Obrigado." : "Answers submitted! Thank you."}
                    </div>
                  ) : (
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleSubmit(set)}
                      disabled={submitting === set.id || !(drafts[set.id] || []).some(a => a.trim())}
                    >
                      {submitting === set.id
                        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{isPt ? "A enviar…" : "Sending…"}</>
                        : isPt ? "Enviar Respostas" : "Submit Answers"}
                    </Button>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {answered.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {isPt ? "Respondidas" : "Answered"}
          </p>
          {answered.map(set => (
            <Card key={set.id} className="opacity-70">
              <button
                className="w-full p-4 flex items-center gap-3 text-left"
                onClick={() => { setOpenSet(openSet === set.id ? null : set.id); initDraft(set); }}
              >
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {(set.questions as string[]).length} {isPt ? "perguntas" : "questions"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isPt ? "Respondido em" : "Answered on"}{" "}
                    {set.answeredAt ? new Date(set.answeredAt).toLocaleDateString(isPt ? "pt-BR" : "en-GB") : "—"}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 shrink-0">
                  {isPt ? "Respondido" : "Answered"}
                </Badge>
                {openSet === set.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {openSet === set.id && set.answers && (
                <CardContent className="px-4 pb-4 pt-0 space-y-3 border-t">
                  {(set.answers as { index: number; question: string; answer: string }[]).map((a, i) => (
                    <div key={i} className="space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground">{i + 1}. {a.question}</p>
                      <p className="text-sm bg-muted/30 rounded p-2">{a.answer || <em className="text-muted-foreground">—</em>}</p>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
