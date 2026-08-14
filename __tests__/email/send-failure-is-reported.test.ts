/**
 * A wrong value pasted into Admin → AI Settings disabled every outbound email
 * for six days without a single error surfacing: the Resend SDK resolves with
 * { data, error } instead of throwing, and the send path only read the resolved
 * value. Patients requested verification codes, saw "code sent", and waited for
 * mail that had been rejected at the API.
 *
 * These tests pin the two halves of that failure: a rejected send must report
 * itself, and the field that broke must refuse the value that broke it.
 */

const mockSend = jest.fn();

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

jest.mock("@/lib/system-config", () => ({
  getConfigValue: jest.fn().mockResolvedValue("re_test_key"),
}));

import { sendEmail } from "@/lib/email";

describe("sendEmail — a rejected send must not report success", () => {
  beforeEach(() => {
    mockSend.mockReset();
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it("returns success:false when Resend rejects the key", async () => {
    // The exact response production received while the key was corrupted.
    mockSend.mockResolvedValue({
      data: null,
      error: { statusCode: 400, name: "validation_error", message: "API key is invalid" },
    });

    const result = await sendEmail({
      to: "patient@example.com",
      subject: "123456 — Verification code",
      html: "<p>code</p>",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("API key is invalid");
  });

  it("surfaces the provider's reason instead of swallowing it", async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { statusCode: 403, name: "restricted_api_key", message: "This key can only send from a verified domain" },
    });

    const result = await sendEmail({ to: "p@example.com", subject: "s", html: "<p>h</p>" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("verified domain");
  });

  it("still reports success on a real delivery", async () => {
    mockSend.mockResolvedValue({ data: { id: "73b70fb9-1b81-4b64-9d0e-012746c2be09" }, error: null });

    const result = await sendEmail({ to: "p@example.com", subject: "s", html: "<p>h</p>" });

    expect(result.success).toBe(true);
    expect((result as any).data.id).toBe("73b70fb9-1b81-4b64-9d0e-012746c2be09");
  });

  it("reports failure when the SDK throws outright", async () => {
    mockSend.mockRejectedValue(new Error("network down"));

    const result = await sendEmail({ to: "p@example.com", subject: "s", html: "<p>h</p>" });

    expect(result.success).toBe(false);
  });
});
