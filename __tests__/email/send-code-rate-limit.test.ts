/**
 * @jest-environment node
 *
 * A patient asked for a verification code three times in three minutes. Each
 * request stored a code, failed to mail it, and answered "code sent". The
 * fourth attempt hit the 3-per-10-minutes ceiling — she was locked out by the
 * bookkeeping of deliveries that never happened.
 *
 * A code we could not deliver must leave no trace against the patient.
 */

jest.mock("@/lib/email", () => ({ sendEmail: jest.fn() }));
jest.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    verificationCode: {
      count: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/db";
import { POST } from "@/app/api/auth/send-code/route";

const mockSendEmail = sendEmail as jest.Mock;
const codes = (prisma as any).verificationCode;
const users = (prisma as any).user;

function request(body: any) {
  return new Request("http://localhost/api/auth/send-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

describe("POST /api/auth/send-code", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    users.findUnique.mockResolvedValue({
      id: "u1",
      email: "gabby@example.com",
      phone: null,
      firstName: "Gabby",
      isActive: false,
      preferredLocale: "en",
    });
    codes.count.mockResolvedValue(0);
    codes.updateMany.mockResolvedValue({ count: 0 });
    codes.create.mockResolvedValue({ id: "code-1" });
    codes.delete.mockResolvedValue({});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it("deletes the stored code when the email is rejected", async () => {
    mockSendEmail.mockResolvedValue({
      success: false,
      error: "validation_error: API key is invalid",
    });

    const res = await POST(request({ userId: "u1", channel: "EMAIL" }));

    expect(codes.delete).toHaveBeenCalledWith({ where: { id: "code-1" } });
    expect(res.status).toBe(502);
  });

  it("stops claiming success when nothing was delivered", async () => {
    mockSendEmail.mockResolvedValue({ success: false, error: "boom" });

    const res = await POST(request({ userId: "u1", channel: "EMAIL" }));
    const body = await res.json();

    expect(body.success).toBeUndefined();
    expect(body.error).toBeTruthy();
  });

  it("keeps the code and reports success on a real delivery", async () => {
    mockSendEmail.mockResolvedValue({ success: true, data: { id: "resend-id" } });

    const res = await POST(request({ userId: "u1", channel: "EMAIL" }));
    const body = await res.json();

    expect(codes.delete).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("still enforces the ceiling against codes that were actually sent", async () => {
    codes.count.mockResolvedValue(3);

    const res = await POST(request({ userId: "u1", channel: "EMAIL" }));

    expect(res.status).toBe(429);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
