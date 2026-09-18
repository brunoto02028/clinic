import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionStaffActor } from "@/lib/tenant-access";

export const dynamic = "force-dynamic";

// A tenant's own brand — name, logo and colours on its login (/studio/<slug>),
// invite page, admin and student portal (activity 52, T-3). Always the
// caller's own tenant: there is no clinic parameter, and slug/type are never
// editable here (the studio links may already have been shared).

const HEX = /^#[0-9a-fA-F]{6}$/;
// Logos come from /api/upload (served by /api/image-serve/<id>) or an absolute
// https URL — never a data: URL (it would bloat the session cookie).
const LOGO = /^(https:\/\/[^\s"'<>]+|\/api\/image-serve\/[A-Za-z0-9_-]+)$/;

const SELECT = { id: true, name: true, slug: true, logoUrl: true, primaryColor: true, secondaryColor: true } as const;

async function ownerActor(request: NextRequest) {
  const actor = await getSessionStaffActor(request);
  if (!actor || !actor.clinicId) return null;
  // The brand is the owner's call, not every therapist's.
  if (actor.role !== "ADMIN" && actor.role !== "SUPERADMIN") return null;
  return actor;
}

export async function GET(request: NextRequest) {
  const actor = await ownerActor(request);
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const clinic = await prisma.clinic.findUnique({ where: { id: actor.clinicId! }, select: SELECT });
  if (!clinic) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ branding: clinic });
}

export async function PATCH(request: NextRequest) {
  const actor = await ownerActor(request);
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const data: { name?: string; logoUrl?: string | null; logoPath?: null; primaryColor?: string; secondaryColor?: string } = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 2 || name.length > 80) {
      return NextResponse.json({ error: "Name must be 2–80 characters" }, { status: 400 });
    }
    data.name = name;
  }
  if (body.logoUrl !== undefined) {
    if (body.logoUrl === null || body.logoUrl === "") {
      data.logoUrl = null;
    } else if (typeof body.logoUrl === "string" && LOGO.test(body.logoUrl)) {
      // An uploaded image must be one this tenant uploaded — image ids travel
      // in public page URLs, so accepting any id would let a studio point its
      // logo at another tenant's image.
      const served = body.logoUrl.match(/^\/api\/image-serve\/([A-Za-z0-9_-]+)$/);
      if (served) {
        const image = await prisma.imageLibrary.findUnique({
          where: { id: served[1] },
          select: { uploadedBy: { select: { clinicId: true, role: true } } },
        });
        const owner = image?.uploadedBy;
        const ownedHere = owner && (owner.clinicId === actor.clinicId || owner.role === "SUPERADMIN");
        if (!ownedHere) {
          return NextResponse.json({ error: "Invalid logo URL" }, { status: 400 });
        }
      }
      data.logoUrl = body.logoUrl;
    } else {
      return NextResponse.json({ error: "Invalid logo URL" }, { status: 400 });
    }
    data.logoPath = null;
  }
  for (const key of ["primaryColor", "secondaryColor"] as const) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== "string" || !HEX.test(body[key])) {
        return NextResponse.json({ error: `${key} must be a hex colour like #4F7361` }, { status: 400 });
      }
      data[key] = body[key];
    }
  }

  const clinic = await prisma.clinic.update({ where: { id: actor.clinicId! }, data, select: SELECT });
  return NextResponse.json({ branding: clinic });
}
