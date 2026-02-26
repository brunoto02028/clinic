"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Sparkles, CheckCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QUIZ_QUESTIONS, getArchetype } from "@/lib/journey";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";

type Stage = "welcome" | "quiz" | "result";

export default function QuizPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const [stage, setStage] = useState<Stage>("welcome");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: string; answer: string }[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [existingResult, setExistingResult] = useState<any>(null);

  useEffect(() => {
    fetch("/api/patient/journey/quiz")
      .then((r) => r.json())
      .then((d) => {
        if (d.completed) {
          setExistingResult(d);
          setStage("result");
          setResult(d);
        }
      })
      .catch(() => {});
  }, []);

  const question = QUIZ_QUESTIONS[currentQ];
  const progress = ((currentQ + 1) / QUIZ_QUESTIONS.length) * 100;

  const handleSelectAnswer = (key: string) => {
    setSelectedAnswer(key);
  };

  const handleNext = () => {
    if (!selectedAnswer) return;
    const newAnswers = [...answers, { questionId: question.id, answer: selectedAnswer }];
    setAnswers(newAnswers);
    setSelectedAnswer(null);

    if (currentQ < QUIZ_QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      submitQuiz(newAnswers);
    }
  };

  const handleBack = () => {
    if (currentQ > 0) {
      setCurrentQ(currentQ - 1);
      const prev = answers[answers.length - 1];
      setSelectedAnswer(prev?.answer || null);
      setAnswers(answers.slice(0, -1));
    }
  };

  const submitQuiz = async (finalAnswers: { questionId: string; answer: string }[]) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/patient/journey/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: finalAnswers }),
      });
      const data = await res.json();
      setResult(data);
      setStage("result");
    } catch {}
    setSubmitting(false);
  };

  const handleRetake = () => {
    setStage("welcome");
    setCurrentQ(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setResult(null);
    setExistingResult(null);
  };

  // ─── Welcome Screen ───
  if (stage === "welcome" && !existingResult) {
    return (
      <div className="max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500" />
            <CardContent className="p-8 text-center">
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring" }} className="text-6xl mb-4">
                🧬
              </motion.div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{T("quiz.title")}</h1>
              <p className="text-muted-foreground mb-1">{T("quiz.subtitle")}</p>
              <p className="text-sm text-muted-foreground mb-6">{T("quiz.meta")}</p>

              <div className="space-y-3 text-left mb-6">
                {[T("quiz.benefit1"), T("quiz.benefit2"), T("quiz.benefit3")].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>

              <Button onClick={() => setStage("quiz")} size="lg" className="w-full gap-2">
                <Sparkles className="h-4 w-4" /> {T("common.startQuiz")}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ─── Quiz Screen ───
  if (stage === "quiz" && !submitting) {
    return (
      <div className="max-w-lg mx-auto">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <button onClick={handleBack} disabled={currentQ === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-xs text-muted-foreground">
              {currentQ + 1} / {QUIZ_QUESTIONS.length}
            </span>
            <div className="w-5" />
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            {/* Question */}
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">{question.icon}</div>
              <h2 className="text-lg font-bold text-foreground">{question.question}</h2>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {question.options.map((opt) => (
                <motion.button
                  key={opt.key}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleSelectAnswer(opt.key)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selectedAnswer === opt.key
                      ? "border-violet-500 bg-violet-500/10 shadow-md shadow-violet-500/10"
                      : "border-white/10 bg-card hover:border-white/20"
                  }`}
                >
                  <p className={`text-sm font-medium ${selectedAnswer === opt.key ? "text-violet-400" : "text-foreground"}`}>
                    {opt.label}
                  </p>
                </motion.button>
              ))}
            </div>

            {/* Next button */}
            <div className="mt-6">
              <Button
                onClick={handleNext}
                disabled={!selectedAnswer}
                className="w-full gap-2"
                size="lg"
              >
                {currentQ < QUIZ_QUESTIONS.length - 1 ? (
                  <>{T("common.next")} <ArrowRight className="h-4 w-4" /></>
                ) : (
                  <>{T("quiz.seeProfile")} <Sparkles className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ─── Submitting ───
  if (submitting) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-violet-500 mx-auto mb-4" />
        <p className="text-muted-foreground">{T("quiz.analyzing")}</p>
      </div>
    );
  }

  // ─── Result Screen ───
  if (stage === "result" && result) {
    const archetype = result.archetype || getArchetype(result.result?.archetypeKey || result.archetypeKey);
    if (!archetype) {
      return (
        <div className="text-center py-16">
          <p className="text-muted-foreground">{T("quiz.errorLoading")}</p>
        </div>
      );
    }

    return (
      <div className="max-w-lg mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring" }}>
          <Card className="overflow-hidden">
            <div className="h-2" style={{ backgroundColor: archetype.color }} />
            <CardContent className="p-8 text-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="text-6xl mb-4"
              >
                {archetype.emoji}
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{T("quiz.yourArchetype")}</p>
                <h1 className="text-2xl font-bold text-foreground mb-2">{archetype.name}</h1>
                <p className="text-sm text-muted-foreground mb-6">{archetype.description}</p>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-left space-y-4">
                <h3 className="text-sm font-bold text-foreground">{T("quiz.recommendations")}</h3>
                {archetype.recommendations.map((rec: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 bg-muted/30 rounded-lg p-3">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">{rec}</p>
                  </div>
                ))}
              </motion.div>

              {result.xpEarned && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                  className="mt-4 bg-amber-500/10 rounded-lg p-3 flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-bold text-amber-400">+{result.xpEarned} {T("quiz.xpEarned")}</span>
                </motion.div>
              )}

              <div className="mt-6 space-y-3">
                <Link href="/dashboard/marketplace">
                  <Button className="w-full gap-2">
                    {T("quiz.viewProducts")} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/dashboard/journey">
                  <Button variant="outline" className="w-full">{T("quiz.backToJourney")}</Button>
                </Link>
                {existingResult && (
                  <Button variant="ghost" onClick={handleRetake} className="w-full text-xs text-muted-foreground">
                    {T("quiz.retake")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return null;
}
