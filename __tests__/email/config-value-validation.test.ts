/**
 * Guards the field that caused the outage: Admin → AI Settings → Resend API Key.
 * The stored value takes precedence over the environment variable, so a bad
 * paste here is not a no-op — it shadows a working key.
 */

jest.mock("@/lib/db", () => ({ prisma: {} }));

import { validateConfigValue } from "@/lib/system-config";

describe("validateConfigValue", () => {
  it("refuses the shape of the value that broke production", () => {
    // What was actually stored: 52 characters, starting with "Bru" — a
    // credential from somewhere else pasted into the Resend field.
    const theValueThatBrokeIt = "Bru" + "x".repeat(49);

    const error = validateConfigValue("RESEND_API_KEY", theValueThatBrokeIt);

    expect(error).not.toBeNull();
    expect(error).toContain("re_");
  });

  it("refuses the masked value shown on screen", () => {
    expect(validateConfigValue("RESEND_API_KEY", "••••••••ff9f")).toContain("masked");
  });

  it("accepts a legitimate Resend key", () => {
    expect(validateConfigValue("RESEND_API_KEY", "re_abc123def456")).toBeNull();
  });

  it("allows clearing a field", () => {
    expect(validateConfigValue("RESEND_API_KEY", "")).toBeNull();
  });

  it("catches a key pasted into the wrong service's field", () => {
    expect(validateConfigValue("OPENAI_API_KEY", "re_abc123")).not.toBeNull();
    expect(validateConfigValue("ANTHROPIC_API_KEY", "sk-proj-abc")).not.toBeNull();
  });

  it("accepts each service's own key format", () => {
    expect(validateConfigValue("OPENAI_API_KEY", "sk-proj-abc123")).toBeNull();
    expect(validateConfigValue("ANTHROPIC_API_KEY", "sk-ant-api03-abc")).toBeNull();
    expect(validateConfigValue("HUGGINGFACE_API_KEY", "hf_abc123")).toBeNull();
  });

  it("leaves unconstrained settings alone", () => {
    expect(validateConfigValue("SMTP_HOST", "smtp.hostinger.com")).toBeNull();
    expect(validateConfigValue("SOME_CUSTOM_KEY", "anything at all")).toBeNull();
  });
});
