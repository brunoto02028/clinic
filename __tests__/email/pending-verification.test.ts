/**
 * @jest-environment node
 *
 * Two patients signed up, never received a code, and closed the tab. From
 * there the product had no way back: /verify is reachable only through the
 * ?userId= link handed out at signup, and logging in answered "account is
 * deactivated" — a message about a problem that did not exist.
 *
 * This endpoint recovers that link. Because it turns credentials into a user
 * id, the tests below care as much about what it refuses as what it returns.
 */

jest.mock("@/lib/db", () => ({ prisma: { user: { findUnique: jest.fn() } } }));
jest.mock("bcryptjs", () => ({ compare: jest.fn() }));

import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { POST } from "@/app/api/auth/pending-verification/route";

const findUnique = (prisma as any).user.findUnique as jest.Mock;
const compare = bcrypt.compare as unknown as jest.Mock;

function request(body: any) {
  return new Request("http://localhost/api/auth/pending-verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

const unverified = {
  id: "u1",
  password: "hashed",
  isActive: false,
  emailVerified: null,
};

describe("POST /api/auth/pending-verification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it("returns the user id for an unverified account with the right password", async () => {
    findUnique.mockResolvedValue(unverified);
    compare.mockResolvedValue(true);

    const res = await POST(request({ email: "gabby@example.com", password: "correct" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.userId).toBe("u1");
  });

  it("does not turn an email address into a user id without the password", async () => {
    findUnique.mockResolvedValue(unverified);
    compare.mockResolvedValue(false);

    const res = await POST(request({ email: "gabby@example.com", password: "guess" }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.userId).toBeUndefined();
  });

  it("answers a known address and an unknown one identically", async () => {
    findUnique.mockResolvedValue(unverified);
    compare.mockResolvedValue(false);
    const known = await POST(request({ email: "gabby@example.com", password: "x" }));
    const knownBody = await known.json();

    findUnique.mockResolvedValue(null);
    const unknown = await POST(request({ email: "nobody@example.com", password: "x" }));
    const unknownBody = await unknown.json();

    expect(known.status).toBe(unknown.status);
    expect(knownBody).toEqual(unknownBody);
  });

  it("refuses an account the clinic deactivated, rather than sending it to verify", async () => {
    findUnique.mockResolvedValue({ ...unverified, emailVerified: new Date() });
    compare.mockResolvedValue(true);

    const res = await POST(request({ email: "former@example.com", password: "correct" }));

    expect(res.status).toBe(409);
  });

  it("refuses an account that is already usable", async () => {
    findUnique.mockResolvedValue({ ...unverified, isActive: true });
    compare.mockResolvedValue(true);

    const res = await POST(request({ email: "active@example.com", password: "correct" }));

    expect(res.status).toBe(409);
  });

  it("requires both fields", async () => {
    const res = await POST(request({ email: "a@b.com" }));
    expect(res.status).toBe(400);
    expect(findUnique).not.toHaveBeenCalled();
  });
});
