/**
 * @jest-environment node
 *
 * GET /api/exercises (the app's Exercises tab) asks Prisma for the
 * prescriptions the patient may see, instead of every active one — the leak
 * that handed her a whole plan's exercises on day one (activity 45) and
 * survived a plan being archived (activity 46).
 */

jest.mock("@/lib/db", () => ({
  prisma: { exercisePrescription: { findMany: jest.fn() }, treatmentProtocol: { findMany: jest.fn() } },
}));
jest.mock("@/lib/get-effective-user", () => ({ getEffectiveUser: jest.fn() }));
jest.mock("@/lib/module-access", () => ({ assertModuleAccess: jest.fn() }));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { GET } from "@/app/api/exercises/route";

const rx = (prisma as any).exercisePrescription;
const protocols = (prisma as any).treatmentProtocol;
const effective = getEffectiveUser as jest.Mock;
const req = () => new NextRequest("http://localhost/api/exercises");
const whereOf = () => rx.findMany.mock.calls[0][0].where;

beforeEach(() => {
  jest.resetAllMocks();
  effective.mockResolvedValue({ userId: "p1", role: "PATIENT", isImpersonating: false });
  rx.findMany.mockResolvedValue([]);
});

it("asks only for the prescriptions the released weeks cover", async () => {
  protocols.findMany.mockResolvedValue([
    {
      releasedThroughWeek: null,
      packages: [],
      items: [
        { exerciseId: "quad", hiddenFromPatient: false, startWeek: 1 },
        { exerciseId: "lunge", hiddenFromPatient: true, startWeek: 9 },
      ],
    },
  ]);
  const res = await GET(req());
  expect(res.status).toBe(200);
  expect(whereOf()).toMatchObject({
    patientId: "p1",
    isActive: true,
    OR: [
      { protocolId: null, exerciseId: { notIn: ["lunge"] } },
      { protocolId: { not: null }, exerciseId: { in: ["quad"] } },
    ],
  });
});

it("with no sent plan, keeps the standalone ones and drops every plan copy", async () => {
  protocols.findMany.mockResolvedValue([]);
  await GET(req());
  expect(whereOf().OR).toEqual([
    { protocolId: null },
    { protocolId: { not: null }, exerciseId: { in: [] } },
  ]);
});

it("refuses an unauthenticated caller without touching prescriptions", async () => {
  effective.mockResolvedValue(null);
  expect((await GET(req())).status).toBe(401);
  expect(rx.findMany).not.toHaveBeenCalled();
});
