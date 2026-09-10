/**
 * @jest-environment node
 *
 * Local dev and QA share the production provider keys. During the tenant
 * isolation QA (activity 19) a test booking mailed real notices to the
 * clinic's admin address. Outside production, messages must be logged and
 * dropped; production must keep sending exactly as before.
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

jest.mock("@/lib/db", () => ({ prisma: {} }));

import { sendEmail } from "@/lib/email";
import { sendTelegramMessage } from "@/lib/telegram";
import { outboundAllowed } from "@/lib/outbound-guard";

const env = process.env as Record<string, string | undefined>;
const original = {
  NODE_ENV: env.NODE_ENV,
  OUTBOUND_MODE: env.OUTBOUND_MODE,
  OUTBOUND_ALLOWLIST: env.OUTBOUND_ALLOWLIST,
  TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
}

const email = { to: "patient@example.com", subject: "Booking confirmed", html: "<p>See you Monday</p>" };

describe("outbound guard", () => {
  let log: jest.SpyInstance;

  beforeEach(() => {
    mockSend.mockReset().mockResolvedValue({ data: { id: "re_1" }, error: null });
    log = jest.spyOn(console, "log").mockImplementation(() => {});
    delete env.OUTBOUND_MODE;
    delete env.OUTBOUND_ALLOWLIST;
    env.NODE_ENV = "development";
  });

  afterEach(() => {
    jest.restoreAllMocks();
    restoreEnv();
  });

  it("drops email outside production, logs it, and lets the flow continue", async () => {
    const result = await sendEmail(email);

    expect(mockSend).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(log).toHaveBeenCalledWith("[OUTBOUND-SINK] email → patient@example.com: Booking confirmed");
  });

  it("sends in production, copies included", async () => {
    env.NODE_ENV = "production";

    await sendEmail({ ...email, bcc: "admin@example.com" });

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0].bcc).toEqual(["admin@example.com"]);
  });

  it("OUTBOUND_MODE=sink drops even in production", async () => {
    env.NODE_ENV = "production";
    env.OUTBOUND_MODE = "sink";

    await sendEmail(email);

    expect(mockSend).not.toHaveBeenCalled();
  });

  it("OUTBOUND_MODE=live sends outside production", async () => {
    env.OUTBOUND_MODE = "live";

    await sendEmail(email);

    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("an allowlisted address goes out; another primary recipient stops the whole message", async () => {
    env.OUTBOUND_ALLOWLIST = "QA@example.com";

    await sendEmail({ ...email, to: "qa@example.com" });
    expect(mockSend).toHaveBeenCalledTimes(1);

    await sendEmail({ ...email, to: ["qa@example.com", "admin@example.com"] });
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("trims copies outside the allowlist instead of dropping the email", async () => {
    env.OUTBOUND_ALLOWLIST = "qa@example.com";

    await sendEmail({ ...email, to: "qa@example.com", bcc: "admin@example.com" });

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0].bcc).toBeUndefined();
    expect(log).toHaveBeenCalledWith("[OUTBOUND-SINK] email → admin@example.com: bcc of: Booking confirmed");
  });

  it("matches phone numbers regardless of formatting", () => {
    env.OUTBOUND_ALLOWLIST = "447700900000";

    expect(outboundAllowed("+44 7700 900-000")).toBe(true);
    expect(outboundAllowed("+44 7700 900001")).toBe(false);
  });

  it("gives every dropped email its own id — templated sends log it into a unique column", async () => {
    const first = await sendEmail(email);
    const second = await sendEmail(email);

    expect(first.data?.id).toMatch(/^outbound-sink-/);
    expect(second.data?.id).not.toBe(first.data?.id);
  });

  it("keeps verification codes out of a production server's log in sink mode", async () => {
    env.NODE_ENV = "production";
    env.OUTBOUND_MODE = "sink";

    await sendEmail({ ...email, subject: "595466 — Verification code" });

    expect(log).toHaveBeenCalledWith("[OUTBOUND-SINK] email → patient@example.com: •••• — Verification code");
  });

  it("drops Telegram messages without calling the API", async () => {
    env.TELEGRAM_BOT_TOKEN = "123:abc";
    const fetchSpy = jest.spyOn(global, "fetch");

    const result = await sendTelegramMessage("987654", "Your session is tomorrow");

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});
