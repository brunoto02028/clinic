/**
 * @jest-environment node
 *
 * The social routes ran with whatever clinic the legacy helper produced, and
 * two of them dropped the clinic filter entirely when it came back null
 * (activity 47): the post list showed every clinic's posts, and disconnecting
 * an account skipped the ownership check.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    socialPost: { findMany: jest.fn(), count: jest.fn() },
    socialAccount: { findUnique: jest.fn(), delete: jest.fn() },
  },
}));
jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth-options", () => ({ authOptions: {} }));
jest.mock("@/lib/session-clinic", () => ({
  sessionClinicId: jest.fn(),
  NO_CLINIC: { error: "No clinic resolved for this account" },
}));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { sessionClinicId } from "@/lib/session-clinic";
import { GET as postsGet } from "@/app/api/admin/social/posts/route";
import { DELETE as accountDelete } from "@/app/api/admin/social/accounts/[id]/route";

const posts = (prisma as any).socialPost;
const accounts = (prisma as any).socialAccount;
const sessionMock = getServerSession as jest.Mock;
const clinicMock = sessionClinicId as jest.Mock;
const req = (url = "/api/admin/social/posts") => new NextRequest("http://localhost" + url);

beforeEach(() => {
  jest.resetAllMocks();
  sessionMock.mockResolvedValue({ user: { id: "u1", role: "ADMIN", clinicId: "clinicA" } });
  clinicMock.mockResolvedValue("clinicA");
  posts.findMany.mockResolvedValue([]);
  posts.count.mockResolvedValue(0);
});

describe("GET /api/admin/social/posts", () => {
  it("always filters by the caller's clinic", async () => {
    const res = await postsGet(req("/api/admin/social/posts?status=DRAFT"));
    expect(res.status).toBe(200);
    expect(posts.findMany.mock.calls[0][0].where).toMatchObject({ clinicId: "clinicA", status: "DRAFT" });
  });

  it("answers 403 instead of listing every clinic when none resolves", async () => {
    clinicMock.mockResolvedValue(null);
    expect((await postsGet(req())).status).toBe(403);
    expect(posts.findMany).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/social/accounts/[id]", () => {
  const ctx = { params: { id: "acc1" } };

  it("refuses another clinic's account", async () => {
    accounts.findUnique.mockResolvedValue({ id: "acc1", clinicId: "clinicB" });
    const res = await accountDelete(req("/api/admin/social/accounts/acc1"), ctx);
    expect(res.status).toBe(404);
    expect(accounts.delete).not.toHaveBeenCalled();
  });

  it("deletes the clinic's own account", async () => {
    accounts.findUnique.mockResolvedValue({ id: "acc1", clinicId: "clinicA" });
    accounts.delete.mockResolvedValue({});
    const res = await accountDelete(req("/api/admin/social/accounts/acc1"), ctx);
    expect(res.status).toBe(200);
    expect(accounts.delete).toHaveBeenCalledWith({ where: { id: "acc1" } });
  });

  it("refuses when no clinic resolves, rather than skipping the owner check", async () => {
    clinicMock.mockResolvedValue(null);
    accounts.findUnique.mockResolvedValue({ id: "acc1", clinicId: "clinicB" });
    expect((await accountDelete(req("/api/admin/social/accounts/acc1"), ctx)).status).toBe(403);
    expect(accounts.delete).not.toHaveBeenCalled();
  });
});
