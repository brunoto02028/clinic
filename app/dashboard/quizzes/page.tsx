"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import {
  Loader2, BookOpen, CheckCircle2, Trophy, ChevronRight, ArrowLeft, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface QuizOption {
  en: string;
  pt: string;
  isCorrect: boolean;
}

interface QuizQuestion {
  id: string;
  questionEn: string;
  questionPt: string;
  options: QuizOption[];
  explanationEn?: string;
  explanationPt?: string;
}

interface Quiz {
  id: string;
  titleEn: string;
  titlePt: string;
  descriptionEn?: string;
  descriptionPt?: string;
  category: string;
  difficulty: string;
  xpReward: number;
  iconEmoji?: string;
  condition?: { nameEn: string; namePt: string; iconEmoji?: string };
  questions: QuizQuestion[];
  attempts: any[];
  _count: { questions: number };
}

type View = "list" | "quiz" | "result";

export default function PatientQuizzesPage() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const isPt = locale === "pt-BR";
  const { toast } = useToast();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("list");
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<{ selectedIndex: number; isCorrect: boolean }[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; totalQuestions: number; xpEarned: number } | null>(null);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/patient/quizzes");
      const data = await res.json();
      setQuizzes(data.quizzes || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchQuizzes(); }, []);

  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setCurrentQ(0);
    setAnswers([]);
    setSelectedOption(null);
    setShowExplanation(false);
    setResult(null);
    setView("quiz");
  };

  const handleSelectOption = (idx: number) => {
    if (showExplanation) return;
    setSelectedOption(idx);
  };

  const handleConfirm = () => {
    if (selectedOption === null || !activeQuiz) return;
    const q = activeQuiz.questions[currentQ];
    const isCorrect = q.options[selectedOption]?.isCorrect === true;
    setAnswers([...answers, { selectedIndex: selectedOption, isCorrect }]);
    setShowExplanation(true);
  };

  const handleNext = async () => {
    if (!activeQuiz) return;
    if (currentQ + 1 < activeQuiz.questions.length) {
      setCurrentQ(currentQ + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      // Submit results
      setSubmitting(true);
      try {
        const allAnswers = [...answers];
        const res = await fetch("/api/patient/quizzes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quizId: activeQuiz.id, answers: allAnswers }),
        });
        const data = await res.json();
        setResult({ score: data.score, totalQuestions: data.totalQuestions, xpEarned: data.xpEarned });
        setView("result");
        fetchQuizzes();
      } catch {
        toast({ title: "Error", description: "Failed to submit quiz", variant: "destructive" });
      } finally { setSubmitting(false); }
    }
  };

  // ─── List View ───
  if (view === "list") {
    return (
      <div className="max-w-2xl mx-auto space-y-6 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold">{isPt ? "Quizzes Educativos" : "Educational Quizzes"}</h1>
          <p className="text-muted-foreground text-sm">{isPt ? "Teste seus conhecimentos e ganhe XP" : "Test your knowledge and earn XP"}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : quizzes.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{isPt ? "Nenhum quiz disponível" : "No quizzes available"}</p>
            <p className="text-sm">{isPt ? "Novos quizzes serão adicionados em breve." : "New quizzes will be added soon."}</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {quizzes.map((q) => {
              const bestAttempt = q.attempts.length > 0 ? q.attempts.reduce((best: any, a: any) => (!best || a.score > best.score) ? a : best, null) : null;
              const isPerfect = bestAttempt && bestAttempt.score === bestAttempt.totalQuestions;
              return (
                <Card key={q.id} className={`hover:shadow-md transition-all cursor-pointer ${isPerfect ? "border-green-200 bg-green-50/30" : ""}`} onClick={() => startQuiz(q)}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl flex-shrink-0">{q.iconEmoji || "📝"}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{isPt ? q.titlePt : q.titleEn}</h3>
                        {(q.descriptionEn || q.descriptionPt) && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {isPt ? (q.descriptionPt || q.descriptionEn) : (q.descriptionEn || q.descriptionPt)}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <Badge variant="outline" className="text-[10px]">{q._count.questions} {isPt ? "perguntas" : "questions"}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{q.difficulty}</Badge>
                          <Badge className="text-[10px] bg-amber-100 text-amber-700">{q.xpReward} XP</Badge>
                          {q.condition && <Badge className="text-[10px] bg-blue-100 text-blue-700">{q.condition.iconEmoji} {isPt ? q.condition.namePt : q.condition.nameEn}</Badge>}
                          {bestAttempt && (
                            <Badge className={`text-[10px] ${isPerfect ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                              {isPerfect ? "✅ " : ""}{bestAttempt.score}/{bestAttempt.totalQuestions}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── Quiz View ───
  if (view === "quiz" && activeQuiz) {
    const q = activeQuiz.questions[currentQ];
    const progress = ((currentQ + (showExplanation ? 1 : 0)) / activeQuiz.questions.length) * 100;

    return (
      <div className="max-w-xl mx-auto space-y-6 px-4 py-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setView("list")} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> {isPt ? "Voltar" : "Back"}
          </Button>
          <span className="text-sm text-muted-foreground">{currentQ + 1}/{activeQuiz.questions.length}</span>
        </div>

        <Progress value={progress} className="h-2" />

        <Card>
          <CardContent className="pt-6 space-y-5">
            <h2 className="text-lg font-semibold">
              {isPt ? q.questionPt : q.questionEn}
            </h2>

            <div className="space-y-2">
              {q.options.map((opt, oIdx) => {
                let borderClass = "border-slate-200 hover:border-primary/50";
                if (showExplanation) {
                  if (opt.isCorrect) borderClass = "border-green-500 bg-green-50";
                  else if (oIdx === selectedOption && !opt.isCorrect) borderClass = "border-red-500 bg-red-50";
                  else borderClass = "border-slate-200 opacity-50";
                } else if (selectedOption === oIdx) {
                  borderClass = "border-primary bg-primary/5";
                }

                return (
                  <button
                    key={oIdx}
                    onClick={() => handleSelectOption(oIdx)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${borderClass}`}
                    disabled={showExplanation}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium flex-shrink-0">
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      <span className="text-sm">{isPt ? opt.pt : opt.en}</span>
                      {showExplanation && opt.isCorrect && <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto flex-shrink-0" />}
                      {showExplanation && oIdx === selectedOption && !opt.isCorrect && <XCircle className="h-5 w-5 text-red-500 ml-auto flex-shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {showExplanation && (q.explanationEn || q.explanationPt) && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>{isPt ? "Explicação:" : "Explanation:"}</strong>{" "}
                  {isPt ? (q.explanationPt || q.explanationEn) : (q.explanationEn || q.explanationPt)}
                </p>
              </div>
            )}

            <div className="flex justify-end">
              {!showExplanation ? (
                <Button onClick={handleConfirm} disabled={selectedOption === null} className="gap-2">
                  {isPt ? "Confirmar" : "Confirm"}
                </Button>
              ) : (
                <Button onClick={handleNext} disabled={submitting} className="gap-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {currentQ + 1 < activeQuiz.questions.length
                    ? (isPt ? "Próxima" : "Next")
                    : (isPt ? "Ver Resultado" : "See Result")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Result View ───
  if (view === "result" && result && activeQuiz) {
    const percentage = Math.round((result.score / result.totalQuestions) * 100);
    const isPerfect = result.score === result.totalQuestions;

    return (
      <div className="max-w-md mx-auto space-y-6 px-4 py-12 text-center">
        <div className="text-6xl mb-4">{isPerfect ? "🎉" : percentage >= 60 ? "👏" : "💪"}</div>
        <h1 className="text-2xl font-bold">
          {isPerfect ? (isPt ? "Perfeito!" : "Perfect!") : percentage >= 60 ? (isPt ? "Muito Bem!" : "Well Done!") : (isPt ? "Continue Tentando!" : "Keep Trying!")}
        </h1>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="text-4xl font-bold text-primary">{result.score}/{result.totalQuestions}</div>
            <Progress value={percentage} className="h-3" />
            <p className="text-muted-foreground text-sm">{percentage}% {isPt ? "correto" : "correct"}</p>
            <div className="flex items-center justify-center gap-2 text-amber-600">
              <Trophy className="h-5 w-5" />
              <span className="font-semibold">+{result.xpEarned} XP</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => startQuiz(activeQuiz)}>
            {isPt ? "Tentar Novamente" : "Try Again"}
          </Button>
          <Button onClick={() => { setView("list"); setActiveQuiz(null); }}>
            {isPt ? "Voltar aos Quizzes" : "Back to Quizzes"}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
