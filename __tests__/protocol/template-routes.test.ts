/**
 * @jest-environment node
 *
 * Template library routes (activity 45): each clinic only lists, reads, edits,
 * deletes and seeds its own templates, and items only link its own exercises.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    protocolTemplate: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    exercise: { findMany: jest.fn() },
  },
}));
jest.mock("@/lib/get-effective-user", () => ({ getEffectiveUser: jest.fn() }));
jest.mock("@/lib/default-tenant", () => ({ getDefaultClinicId: jest.fn() }));
jest.mock("@/lib/tenant-access", () => ({
  ...jest.requireActual("@/lib/tenant-access"),
  getActor: jest.fn(),
}));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActor } from "@/lib/tenant-access";
import { GET as list, POST as create } from "@/app/api/admin/protocols/route";
import { GET as getOne, PATCH as patch, DELETE as remove } from "@/app/api/admin/protocols/[id]/route";
import { POST as seed } from "@/app/api/admin/protocols/seed/route";

const templates = (prisma as any).protocolTemplate;
const exercises = (prisma as any).exercise;
const actorMock = getActor as jest.Mock;

const req = (method: string, body?: unknown) =>
  new NextRequest("http://localhost/api/admin/protocols", {
    method,
    ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });
const ctx = { params: { id: "tpl1" } };

beforeEach(() => {
  jest.resetAllMocks();
  actorMock.mockResolvedValue({ userId: "u1", role: "ADMIN", clinicId: "clinicA", isImpersonating: false });
  templates.findMany.mockResolvedValue([]);
  templates.create.mockResolvedValue({ id: "new" });
  templates.update.mockResolvedValue({ id: "tpl1" });
  // Only "own-ex" is clinic A's.
  exercises.findMany.mockImplementation(({ where }: any) =>
    Promise.resolve(where.id.in.filter((id: string) => id === "own-ex").map((id: string) => ({ id })))
  );
});

describe("list and create", () => {
  it("lists only the caller's clinic's templates", async () => {
    const res = await list(req("GET"));
    expect(res.status).toBe(200);
    expect(templates.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { clinicId: "clinicA" } }));
  });

  it("refuses staff with no clinic and patients", async () => {
    actorMock.mockResolvedValue({ userId: "s1", role: "SUPERADMIN", clinicId: null, isImpersonating: false });
    expect((await list(req("GET"))).status).toBe(403);
    actorMock.mockResolvedValue({ userId: "p1", role: "PATIENT", clinicId: "clinicA", isImpersonating: false });
    expect((await list(req("GET"))).status).toBe(403);
    expect(templates.findMany).not.toHaveBeenCalled();
  });

  it("creates in the caller's clinic, keeping only own exercise links and the PT fields", async () => {
    const res = await create(req("POST", {
      name: " Knee plan ",
      items: [
        { title: "Squat", titlePt: "Agachamento", instructionsPt: "Devagar", exerciseId: "own-ex" },
        { title: "Lunge", exerciseId: "other-clinic-ex" },
      ],
    }));
    expect(res.status).toBe(201);
    const data = templates.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ clinicId: "clinicA", createdById: "u1", name: "Knee plan" });
    expect(data.items.create[0]).toMatchObject({ title: "Squat", titlePt: "Agachamento", instructionsPt: "Devagar", exerciseId: "own-ex" });
    expect(data.items.create[1].exerciseId).toBeNull();
  });

  it.each([
    ["a non-JSON body", "nope"],
    ["no name", { items: [] }],
    ["items that aren't a list", { name: "X", items: "a" }],
    ["a null item", { name: "X", items: [null] }],
    ["an item without a title", { name: "X", items: [{ phase: "SHORT_TERM" }] }],
    ["an unknown phase", { name: "X", items: [{ title: "A", phase: "SOON" }] }],
    ["an unknown item type", { name: "X", items: [{ title: "A", itemType: "GYM" }] }],
  ])("rejects %s with 400", async (_label, body) => {
    expect((await create(req("POST", body))).status).toBe(400);
    expect(templates.create).not.toHaveBeenCalled();
  });
});

describe("another clinic's template answers like a missing one", () => {
  beforeEach(() => templates.findFirst.mockResolvedValue(null));

  it("GET → 404", async () => {
    const res = await getOne(req("GET"), ctx);
    expect(res.status).toBe(404);
    expect(templates.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "tpl1", clinicId: "clinicA" } }));
  });

  it("PATCH → 404 without writing", async () => {
    expect((await patch(req("PATCH", { name: "hijacked" }), ctx)).status).toBe(404);
    expect(templates.update).not.toHaveBeenCalled();
  });

  it("DELETE → 404 without deleting", async () => {
    expect((await remove(req("DELETE"), ctx)).status).toBe(404);
    expect(templates.delete).not.toHaveBeenCalled();
  });
});

describe("editing the clinic's own template", () => {
  beforeEach(() => templates.findFirst.mockResolvedValue({ id: "tpl1", clinicId: "clinicA" }));

  it("replaces items atomically, keeping translations and illustration", async () => {
    const res = await patch(req("PATCH", {
      items: [{
        id: "old-item", templateId: "tpl1", title: "Bridge", titlePt: "Ponte", descriptionPt: "Desc PT",
        instructionsPt: "Instr PT", illustrationUrl: "https://img/bridge.png", exerciseId: "other-clinic-ex",
        exercise: { id: "other-clinic-ex", name: "Bridge" }, startWeek: 3,
      }],
    }), ctx);
    expect(res.status).toBe(200);
    const { where, data } = templates.update.mock.calls[0][0];
    expect(where).toEqual({ id: "tpl1" });
    expect(data.items.deleteMany).toEqual({});
    expect(data.items.create).toEqual([expect.objectContaining({
      title: "Bridge", titlePt: "Ponte", descriptionPt: "Desc PT", instructionsPt: "Instr PT",
      illustrationUrl: "https://img/bridge.png", exerciseId: null, startWeek: 3,
    })]);
    expect(data.items.create[0]).not.toHaveProperty("id");
    expect(data.items.create[0]).not.toHaveProperty("exercise");
  });

  it("rejects invalid items with 400 before writing", async () => {
    expect((await patch(req("PATCH", { items: [null] }), ctx)).status).toBe(400);
    expect((await patch(req("PATCH", "nope"), ctx)).status).toBe(400);
    expect(templates.update).not.toHaveBeenCalled();
  });

  it("deletes it", async () => {
    templates.delete.mockResolvedValue({});
    expect((await remove(req("DELETE"), ctx)).status).toBe(200);
    expect(templates.delete).toHaveBeenCalledWith({ where: { id: "tpl1" } });
  });
});

describe("seed", () => {
  it("is admin-only", async () => {
    actorMock.mockResolvedValue({ userId: "t1", role: "THERAPIST", clinicId: "clinicA", isImpersonating: false });
    expect((await seed(req("POST"))).status).toBe(403);
    expect(templates.create).not.toHaveBeenCalled();
  });

  it("seeds into the caller's (active) clinic", async () => {
    actorMock.mockResolvedValue({ userId: "s1", role: "SUPERADMIN", clinicId: "activeClinic", isImpersonating: false });
    templates.create.mockImplementation(({ data }: any) => Promise.resolve({ name: data.name }));
    const res = await seed(req("POST"));
    expect(res.status).toBe(201);
    expect(templates.create).toHaveBeenCalled();
    for (const [args] of templates.create.mock.calls) {
      expect(args.data).toMatchObject({ clinicId: "activeClinic", createdById: "s1" });
    }
  });
});
