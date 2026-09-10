"use client";

import { useState } from "react";
import {
  type Bilingual,
  type ReadinessAnswer,
  type ReadinessQuestionnaire,
  type ReadinessResult,
  evaluateReadiness,
} from "@/lib/readiness-questionnaire";

interface ReadinessQuestionnaireFormProps {
  questionnaire: ReadinessQuestionnaire;
  isPt?: boolean;
  /** Called once the student submits, with the referral decision. */
  onComplete?: (result: ReadinessResult) => void;
}

/**
 * Bilingual readiness screen for the personal-trainer student onboarding
 * (T-19b). Renders the questionnaire's questions, evaluates them, and shows the
 * cleared or referral message. Content is supplied by the questionnaire prop —
 * a draft that is not panel-approved renders a visible preview banner so it is
 * never mistaken for live medical screening.
 */
export default function ReadinessQuestionnaireForm({
  questionnaire,
  isPt = false,
  onComplete,
}: ReadinessQuestionnaireFormProps) {
  const [answers, setAnswers] = useState<Record<string, ReadinessAnswer>>({});
  const [result, setResult] = useState<ReadinessResult | null>(null);
  const L = (b: Bilingual) => (isPt ? b.pt : b.en);

  // Any answer change invalidates a shown decision: clear it so the student
  // must re-submit. Prevents a stale "cleared"/"referral" verdict from lingering
  // over answers that would now evaluate differently (a readiness gate must not
  // fail open).
  const setAnswer = (id: string, value: ReadinessAnswer) => {
    setAnswers((a) => ({ ...a, [id]: value }));
    setResult(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = evaluateReadiness(questionnaire, answers);
    setResult(r);
    // Only a complete evaluation is a real readiness decision; an incomplete
    // form is not reported to the caller as cleared/referred.
    if (r.missingQuestionIds.length === 0) onComplete?.(r);
  };

  const incomplete = !!result && result.missingQuestionIds.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      {!questionnaire.panelApproved && (
        <div
          role="status"
          className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800"
        >
          {isPt
            ? "Prévia — conteúdo pendente de aprovação do painel clínico."
            : "Preview — content pending clinical-panel approval."}
        </div>
      )}

      <p className="text-sm text-muted-foreground">{L(questionnaire.intro)}</p>

      <fieldset className="space-y-4">
        {questionnaire.questions.map((q) => (
          <div key={q.id} className="space-y-2">
            <p className="text-sm font-medium">{L(q.prompt)}</p>
            <div className="flex gap-4">
              {(["yes", "no"] as const).map((value) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={q.id}
                    value={value}
                    checked={answers[q.id] === value}
                    onChange={() => setAnswer(q.id, value)}
                  />
                  {value === "yes" ? (isPt ? "Sim" : "Yes") : isPt ? "Não" : "No"}
                </label>
              ))}
            </div>
          </div>
        ))}
      </fieldset>

      {incomplete && (
        <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          {isPt ? "Por favor, responda todas as perguntas." : "Please answer all the questions."}
        </div>
      )}

      {result && !incomplete && (
        <div
          role="alert"
          className={`rounded-md p-3 text-sm ${
            result.cleared
              ? "border border-green-300 bg-green-50 text-green-800"
              : "border border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {L(result.cleared ? questionnaire.clearedMessage : questionnaire.referralMessage)}
        </div>
      )}

      {(!result || incomplete) && (
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {isPt ? "Enviar" : "Submit"}
        </button>
      )}
    </form>
  );
}
