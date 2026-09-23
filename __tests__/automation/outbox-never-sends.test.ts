/**
 * The single most important guarantee in this product: an automation queues,
 * it does not send. Everything else in activity 072 is built on it.
 *
 * QA verified it by hand and had to throw away three spies whose positive
 * control failed — a spy that cannot detect a real send makes "zero calls" a
 * lie. This test mocks the mailer itself, so it fails the moment the queueing
 * path touches it.
 */
const sendEmail = jest.fn();
const createMany = jest.fn().mockResolvedValue({ count: 1 });
const findUniqueOrThrow = jest.fn().mockResolvedValue({ id: "msg_1" });

jest.mock("@/lib/email", () => ({ sendEmail: (...args: unknown[]) => sendEmail(...args) }));
jest.mock("@/lib/db", () => ({
  prisma: {
    outboundMessage: {
      createMany: (...args: unknown[]) => createMany(...args),
      findUniqueOrThrow: (...args: unknown[]) => findUniqueOrThrow(...args),
    },
  },
}));
jest.mock("@/lib/patient-email", () => ({
  renderPatientEmail: jest.fn().mockResolvedValue({ subject: "s", html: "<p>h</p>", bodyText: "b", locale: "en-GB", bothLanguages: true, hash: "h" }),
}));
jest.mock("@/lib/system-logger", () => ({ logAudit: jest.fn() }));

import { enqueueMessage, outboxIdempotencyKey } from "@/lib/automation/outbox";

describe("enqueueMessage", () => {
  beforeEach(() => {
    sendEmail.mockClear();
    createMany.mockClear();
  });

  const input = {
    clinicId: "c1",
    patientId: "p1",
    ruleCode: "RULE",
    window: "2026-09-23",
    subjectEn: "Your plan today",
    subjectPt: "Seu plano de hoje",
    bodyEn: "Two activities are still open.",
    bodyPt: "Duas atividades ainda estao abertas.",
  };

  it("never touches the mailer", async () => {
    await enqueueMessage(input);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("writes the row as AWAITING_APPROVAL, unsent", async () => {
    await enqueueMessage(input);
    const written = createMany.mock.calls[0][0].data[0];
    expect(written.status).toBeUndefined(); // the column defaults to AWAITING_APPROVAL
    expect(written.sentAt).toBeUndefined();
    expect(written.approvedById).toBeUndefined();
  });

  it("carries the clinic in the key, so one clinic cannot write over another", () => {
    const a = outboxIdempotencyKey("clinicA", "RULE", "p1", "w");
    const b = outboxIdempotencyKey("clinicB", "RULE", "p1", "w");
    expect(a).not.toBe(b);
    expect(a.startsWith("clinicA:")).toBe(true);
  });

  it("reports whether it queued or found one already there", async () => {
    createMany.mockResolvedValueOnce({ count: 1 });
    expect((await enqueueMessage(input)).queued).toBe(true);
    createMany.mockResolvedValueOnce({ count: 0 });
    expect((await enqueueMessage(input)).queued).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
