// Physical-activity readiness questionnaire for a personal-trainer tenant's
// student onboarding (activity 20, T-19b). A personal student does NOT take the
// clinic's medical screening; they answer this shorter readiness check, and any
// contraindication routes them to a professional before training.
//
// STRUCTURE ONLY. The real questions and referral criteria are authored and
// reviewed by the clinical panel. The draft below is a neutral placeholder so
// the flow can be built and tested; `panelApproved: false` keeps it from
// shipping as medical guidance until the panel signs off and swaps the content.

export type ReadinessAnswer = "yes" | "no";

export interface Bilingual {
  en: string;
  pt: string;
}

export interface ReadinessQuestion {
  id: string;
  prompt: Bilingual;
  /** The answer that flags a possible contraindication → referral. */
  referWhen: ReadinessAnswer;
}

export interface ReadinessQuestionnaire {
  version: string;
  /** false until the clinical panel approves the content. */
  panelApproved: boolean;
  intro: Bilingual;
  questions: ReadinessQuestion[];
  /** Shown when any question flags a referral, or answers are incomplete. */
  referralMessage: Bilingual;
  /** Shown when every question is answered with no flags. */
  clearedMessage: Bilingual;
}

// Placeholder draft — replace `questions`, `intro` and the messages with the
// panel-approved content, then set `panelApproved: true`.
export const READINESS_QUESTIONNAIRE_DRAFT: ReadinessQuestionnaire = {
  version: "0-draft",
  panelApproved: false,
  intro: {
    en: "Before your first session, a few quick questions about your health.",
    pt: "Antes da sua primeira sessão, algumas perguntas rápidas sobre sua saúde.",
  },
  questions: [
    {
      id: "placeholder-1",
      prompt: {
        en: "[Placeholder] Has a health professional ever told you to avoid physical activity?",
        pt: "[Placeholder] Algum profissional de saúde já lhe disse para evitar atividade física?",
      },
      referWhen: "yes",
    },
    {
      id: "placeholder-2",
      prompt: {
        en: "[Placeholder] Do you feel well enough to start training today?",
        pt: "[Placeholder] Você se sente bem o suficiente para começar a treinar hoje?",
      },
      referWhen: "no",
    },
  ],
  referralMessage: {
    en: "Please check with a health professional before starting. Your trainer will be in touch.",
    pt: "Consulte um profissional de saúde antes de começar. Seu personal entrará em contato.",
  },
  clearedMessage: {
    en: "You're all set — see you at your first session!",
    pt: "Tudo certo — até a sua primeira sessão!",
  },
};

export interface ReadinessResult {
  /** True only when every question is answered and none flags a referral. */
  cleared: boolean;
  /** Questions whose answer flags a referral. */
  flaggedQuestionIds: string[];
  /** Questions still unanswered. */
  missingQuestionIds: string[];
}

/**
 * Decides readiness. Fails closed: an unanswered question never clears the
 * student, so an incomplete form routes to referral, not to training.
 */
export function evaluateReadiness(
  questionnaire: ReadinessQuestionnaire,
  answers: Record<string, ReadinessAnswer | undefined>
): ReadinessResult {
  const flaggedQuestionIds: string[] = [];
  const missingQuestionIds: string[] = [];
  for (const q of questionnaire.questions) {
    const a = answers[q.id];
    if (a === undefined) missingQuestionIds.push(q.id);
    else if (a === q.referWhen) flaggedQuestionIds.push(q.id);
  }
  return {
    cleared: flaggedQuestionIds.length === 0 && missingQuestionIds.length === 0,
    flaggedQuestionIds,
    missingQuestionIds,
  };
}
