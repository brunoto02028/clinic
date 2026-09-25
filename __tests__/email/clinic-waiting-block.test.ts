/**
 * @jest-environment node
 *
 * O bloco "Waiting for you" que viaja dentro do relatório diário.
 *
 * Duas regras que o e-mail não pode quebrar: nenhum dado clínico sai daqui
 * (caixa de e-mail não é prontuário) e nada aparece quando não há nada — um
 * resumo que chega vazio ensina a não abrir o próximo.
 */

jest.mock("@/lib/db", () => ({ prisma: {} }));

import { waitingEmailBlock, type ClinicWaiting } from "@/lib/clinic-waiting";

const espera = (over: Partial<ClinicWaiting> = {}): ClinicWaiting => {
  const w = {
    exerciseVideos: 0,
    unreadMessages: 0,
    unassignedMeasurements: 0,
    patientsWithoutExercises: 0,
    messagesAwaitingApproval: 0,
    patientsInPain: 0,
    ...over,
  };
  return {
    ...w,
    total:
      w.exerciseVideos +
      w.unreadMessages +
      w.unassignedMeasurements +
      w.patientsWithoutExercises +
      w.messagesAwaitingApproval +
      w.patientsInPain,
  };
};

describe("waitingEmailBlock", () => {
  it("some quando não há nada esperando", () => {
    expect(waitingEmailBlock(espera(), "https://bpr.clinic")).toBe("");
  });

  it("fala no singular quando é um só", () => {
    const html = waitingEmailBlock(espera({ exerciseVideos: 1, unreadMessages: 1, unassignedMeasurements: 1 }), "https://bpr.clinic");
    expect(html).toContain("exercise video to watch");
    expect(html).toContain("message from a patient");
    expect(html).toContain("blood pressure reading to assign");
    expect(html).not.toContain("exercise videos to watch");
  });

  it("fala no plural quando é mais de um", () => {
    const html = waitingEmailBlock(espera({ exerciseVideos: 3, unreadMessages: 2 }), "https://bpr.clinic");
    expect(html).toContain("exercise videos to watch");
    expect(html).toContain("messages from patients");
  });

  it("omite a linha do que está zerado", () => {
    const html = waitingEmailBlock(espera({ exerciseVideos: 2 }), "https://bpr.clinic");
    expect(html).toContain("exercise videos to watch");
    expect(html).not.toContain("message");
    expect(html).not.toContain("blood pressure");
  });

  it("o app vazio de quem está em tratamento também espera pela clínica", () => {
    const html = waitingEmailBlock(espera({ patientsWithoutExercises: 1 }), "https://bpr.clinic");
    expect(html).toContain("patient in treatment with no exercises yet");

    const varios = waitingEmailBlock(espera({ patientsWithoutExercises: 4 }), "https://bpr.clinic");
    expect(varios).toContain("patients in treatment with no exercises yet");
  });

  it("leva contagem e link, nunca o que está no vídeo", () => {
    const html = waitingEmailBlock(espera({ exerciseVideos: 2, unassignedMeasurements: 1 }), "https://bpr.clinic");
    expect(html).toContain("https://bpr.clinic/admin/patients");
    expect(html).toContain("https://bpr.clinic/admin/measurements/inbox");
    // nenhum nome, nenhum id, nenhuma chave de armazenamento
    expect(html).not.toMatch(/storageKey|exercise-submissions\/|r2\.dev|cloudflarestorage/);
  });
});

describe("waitingEmailBlock — dor alta e fila de aprovação", () => {
  it("dor alta da semana aparece, no singular e no plural", () => {
    const um = waitingEmailBlock(espera({ patientsInPain: 1 }), "https://bpr.clinic");
    expect(um).toContain("patient reporting severe pain this week");

    const varios = waitingEmailBlock(espera({ patientsInPain: 3 }), "https://bpr.clinic");
    expect(varios).toContain("patients reporting severe pain this week");
  });

  it("mensagem parada na fila de aprovação aparece", () => {
    const html = waitingEmailBlock(espera({ messagesAwaitingApproval: 2 }), "https://bpr.clinic");
    expect(html).toContain("messages waiting for your approval");
    expect(html).toContain("https://bpr.clinic/admin/outbox");
  });

  it("nem a dor nem a fila levam nome de paciente", () => {
    const html = waitingEmailBlock(
      espera({ patientsInPain: 2, messagesAwaitingApproval: 1 }),
      "https://bpr.clinic"
    );
    // contagem e link, como todo o resto do bloco
    expect(html).not.toMatch(/@|painLevel|patientId/);
  });
});
