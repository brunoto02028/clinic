/**
 * @jest-environment node
 *
 * The library's maintenance routes used to work on every clinic's exercises at
 * once (activity 47): they now stay inside the clinic the caller is working in,
 * and reaching across tenants has to be asked for with ?allClinics=true — most
 * of all the one that wipes a library.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    exercise: { findMany: jest.fn(), update: jest.fn(), count: jest.fn(), deleteMany: jest.fn() },
    exerciseFolder: { count: jest.fn(), deleteMany: jest.fn() },
    exercisePrescription: { count: jest.fn(), deleteMany: jest.fn() },
    clinic: { findMany: jest.fn(), findUnique: jest.fn() },
  },
}));
jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth-options", () => ({ authOptions: {} }));
jest.mock("@/lib/video-thumbnail", () => ({ getVideoDuration: jest.fn(async () => 42), generateVideoThumbnail: jest.fn() }));
jest.mock("@/lib/video-web-safe", () => ({ probeVideo: jest.fn(), ensureWebSafeVideo: jest.fn() }));
jest.mock("@/lib/r2", () => ({
  deleteR2Url: jest.fn(async () => false),
  isR2Configured: () => false,
  listR2: jest.fn(async () => []),
  deleteFromR2: jest.fn(),
  keyFromR2Url: () => null,
}));
jest.mock("fs", () => ({ existsSync: () => false, statSync: jest.fn(), unlinkSync: jest.fn(), readdirSync: () => [] }));
jest.mock("@/lib/session-clinic", () => ({
  sessionClinicId: jest.fn(),
  NO_CLINIC: { error: "No clinic resolved for this account" },
}));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { sessionClinicId } from "@/lib/session-clinic";
import { POST as backfillDuration } from "@/app/api/admin/exercises/backfill-duration/route";
import { POST as normalizeVideos } from "@/app/api/admin/exercises/normalize-videos/route";
import { POST as resetLibrary } from "@/app/api/admin/exercises/reset-library/route";

const exercises = (prisma as any).exercise;
const folders = (prisma as any).exerciseFolder;
const prescriptions = (prisma as any).exercisePrescription;
const clinics = (prisma as any).clinic;
const sessionMock = getServerSession as jest.Mock;
const clinicMock = sessionClinicId as jest.Mock;

const post = (path: string) => new NextRequest("http://localhost" + path, { method: "POST" });
const asRole = (role: string) => sessionMock.mockResolvedValue({ user: { id: "s1", role, clinicId: "clinicA" } });

beforeEach(() => {
  jest.resetAllMocks();
  asRole("SUPERADMIN");
  clinicMock.mockResolvedValue("clinicA");
  exercises.findMany.mockResolvedValue([]);
  exercises.count.mockResolvedValue(0);
  exercises.deleteMany.mockResolvedValue({ count: 0 });
  folders.count.mockResolvedValue(0);
  folders.deleteMany.mockResolvedValue({ count: 0 });
  prescriptions.count.mockResolvedValue(0);
  prescriptions.deleteMany.mockResolvedValue({ count: 0 });
  clinics.findMany.mockResolvedValue([{ id: "clinicA", name: "Clinic A" }]);
  clinics.findUnique.mockResolvedValue({ name: "Clinic A" });
});

describe("backfill-duration", () => {
  const url = "/api/admin/exercises/backfill-duration";

  it("only touches the working clinic's exercises, and says which one", async () => {
    const res = await backfillDuration(post(url));
    expect(res.status).toBe(200);
    expect(exercises.findMany.mock.calls[0][0].where).toMatchObject({ clinicId: "clinicA", duration: null });
    expect((await res.json()).scope).toBe("Clinic A");
  });

  it("reaches every clinic only when asked to", async () => {
    const res = await backfillDuration(post(url + "?allClinics=true"));
    expect(exercises.findMany.mock.calls[0][0].where).not.toHaveProperty("clinicId");
    expect((await res.json()).scope).toBe("all clinics");
  });

  it("takes only the exact flag, nothing that merely looks like it", async () => {
    await backfillDuration(post(url + "?allClinics=1"));
    expect(exercises.findMany.mock.calls[0][0].where).toMatchObject({ clinicId: "clinicA" });
  });

  it("refuses when no clinic resolves, instead of running platform-wide", async () => {
    clinicMock.mockResolvedValue(null);
    expect((await backfillDuration(post(url))).status).toBe(403);
    expect(exercises.findMany).not.toHaveBeenCalled();
  });

  it("stays SUPERADMIN-only, ?allClinics and all", async () => {
    asRole("ADMIN");
    expect((await backfillDuration(post(url))).status).toBe(401);
    expect((await backfillDuration(post(url + "?allClinics=true"))).status).toBe(401);
    expect(exercises.findMany).not.toHaveBeenCalled();
  });
});

describe("normalize-videos", () => {
  const url = "/api/admin/exercises/normalize-videos?dryRun=true";

  it("counts and lists the same scoped set", async () => {
    const res = await normalizeVideos(post(url));
    expect(res.status).toBe(200);
    const countWhere = exercises.count.mock.calls[0][0].where;
    const listWhere = exercises.findMany.mock.calls[0][0].where;
    expect(countWhere).toMatchObject({ clinicId: "clinicA", isActive: true });
    expect(listWhere).toEqual(countWhere);
    expect((await res.json()).scope).toBe("Clinic A");
  });

  it("reaches every clinic only when asked to", async () => {
    const res = await normalizeVideos(post(url + "&allClinics=true"));
    expect(exercises.count.mock.calls[0][0].where).not.toHaveProperty("clinicId");
    expect((await res.json()).scope).toBe("all clinics");
  });

  it("refuses without a clinic and stays SUPERADMIN-only", async () => {
    clinicMock.mockResolvedValue(null);
    expect((await normalizeVideos(post(url))).status).toBe(403);
    asRole("THERAPIST");
    clinicMock.mockResolvedValue("clinicA");
    expect((await normalizeVideos(post(url))).status).toBe(401);
    expect(exercises.count).not.toHaveBeenCalled();
  });
});

describe("reset-library (destructive)", () => {
  const url = "/api/admin/exercises/reset-library";

  it("wipes only the working clinic", async () => {
    const res = await resetLibrary(post(url + "?confirm=DELETE-ALL"));
    expect(res.status).toBe(200);
    expect(exercises.deleteMany).toHaveBeenCalledWith({ where: { clinicId: "clinicA" } });
    expect(folders.deleteMany).toHaveBeenCalledWith({ where: { clinicId: "clinicA" } });
    expect((await res.json()).clinics).toEqual(["Clinic A"]);
  });

  it("wipes every clinic only when asked to", async () => {
    await resetLibrary(post(url + "?confirm=DELETE-ALL&allClinics=true"));
    expect(exercises.deleteMany).toHaveBeenCalledWith({ where: {} });
  });

  it("still refuses without the confirmation, without a clinic, and for anyone else", async () => {
    expect((await resetLibrary(post(url))).status).toBe(400);

    clinicMock.mockResolvedValue(null);
    expect((await resetLibrary(post(url + "?confirm=DELETE-ALL"))).status).toBe(403);

    asRole("ADMIN");
    clinicMock.mockResolvedValue("clinicA");
    expect((await resetLibrary(post(url + "?confirm=DELETE-ALL&allClinics=true"))).status).toBe(401);
    expect(exercises.deleteMany).not.toHaveBeenCalled();
  });
});
