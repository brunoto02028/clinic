import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  READINESS_QUESTIONNAIRE_DRAFT,
  evaluateReadiness,
  type ReadinessQuestionnaire,
} from "@/lib/readiness-questionnaire";
import ReadinessQuestionnaireForm from "@/components/readiness/readiness-questionnaire";

const QUESTIONNAIRE: ReadinessQuestionnaire = {
  version: "test",
  panelApproved: false,
  intro: { en: "Intro EN", pt: "Intro PT" },
  questions: [
    { id: "q1", prompt: { en: "Q1 EN", pt: "Q1 PT" }, referWhen: "yes" },
    { id: "q2", prompt: { en: "Q2 EN", pt: "Q2 PT" }, referWhen: "no" },
  ],
  referralMessage: { en: "See a professional", pt: "Procure um profissional" },
  clearedMessage: { en: "You're all set", pt: "Tudo certo" },
};

describe("evaluateReadiness", () => {
  it("clears when all answered and nothing flags", () => {
    const r = evaluateReadiness(QUESTIONNAIRE, { q1: "no", q2: "yes" });
    expect(r).toEqual({ cleared: true, flaggedQuestionIds: [], missingQuestionIds: [] });
  });

  it("flags a referral answer", () => {
    const r = evaluateReadiness(QUESTIONNAIRE, { q1: "yes", q2: "yes" });
    expect(r.cleared).toBe(false);
    expect(r.flaggedQuestionIds).toEqual(["q1"]);
  });

  it("fails closed on an unanswered question", () => {
    const r = evaluateReadiness(QUESTIONNAIRE, { q1: "no" });
    expect(r.cleared).toBe(false);
    expect(r.missingQuestionIds).toEqual(["q2"]);
  });

  it("draft is not panel-approved (never ships as guidance by default)", () => {
    expect(READINESS_QUESTIONNAIRE_DRAFT.panelApproved).toBe(false);
  });
});

describe("ReadinessQuestionnaireForm", () => {
  it("shows a preview banner while not panel-approved", () => {
    render(<ReadinessQuestionnaireForm questionnaire={QUESTIONNAIRE} />);
    expect(screen.getByText(/pending clinical-panel approval/i)).toBeInTheDocument();
  });

  it("renders PT prompts when isPt", () => {
    render(<ReadinessQuestionnaireForm questionnaire={QUESTIONNAIRE} isPt />);
    expect(screen.getByText("Q1 PT")).toBeInTheDocument();
    expect(screen.getByText("Intro PT")).toBeInTheDocument();
  });

  it("routes to referral and calls onComplete when an answer flags", () => {
    const onComplete = jest.fn();
    render(<ReadinessQuestionnaireForm questionnaire={QUESTIONNAIRE} onComplete={onComplete} />);
    // q1=yes flags a referral; q2=yes is fine. Select by name (labels repeat).
    fireEvent.click(document.querySelector('input[name="q1"][value="yes"]') as HTMLElement);
    fireEvent.click(document.querySelector('input[name="q2"][value="yes"]') as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("See a professional");
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ cleared: false, flaggedQuestionIds: ["q1"] })
    );
  });

  it("shows a neutral 'complete the form' prompt (not a referral) when incomplete, and does not call onComplete", () => {
    const onComplete = jest.fn();
    render(<ReadinessQuestionnaireForm questionnaire={QUESTIONNAIRE} onComplete={onComplete} />);
    // Answer only q1; leave q2 missing.
    fireEvent.click(document.querySelector('input[name="q1"][value="no"]') as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/answer all the questions/i);
    expect(screen.queryByText("See a professional")).not.toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
    // Submit button stays so the student can finish.
    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
  });

  it("clears a shown result when an answer changes (no stale verdict)", () => {
    render(<ReadinessQuestionnaireForm questionnaire={QUESTIONNAIRE} />);
    fireEvent.click(document.querySelector('input[name="q1"][value="no"]') as HTMLElement);
    fireEvent.click(document.querySelector('input[name="q2"][value="yes"]') as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("You're all set");
    // Flip q1 to the flagging answer — the cleared verdict must disappear.
    fireEvent.click(document.querySelector('input[name="q1"][value="yes"]') as HTMLElement);
    expect(screen.queryByText("You're all set")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
  });

  it("shows the cleared message when nothing flags", () => {
    render(<ReadinessQuestionnaireForm questionnaire={QUESTIONNAIRE} />);
    fireEvent.click(document.querySelector('input[name="q1"][value="no"]') as HTMLElement);
    fireEvent.click(document.querySelector('input[name="q2"][value="yes"]') as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("You're all set");
  });
});
