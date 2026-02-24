import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import crypto from "crypto";

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function generateApiKey(): string {
  const random = crypto.randomBytes(32).toString("hex");
  return `bpr_k_${random}`;
}

// GET — list API keys for the clinic
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });
  if (!user?.clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const keys = await prisma.apiKey.findMany({
    where: { clinicId: user.clinicId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      permissions: true,
      lastUsedAt: true,
      expiresAt: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json(keys);
}

// POST — create a new API key
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });
  if (!user?.clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const body = await req.json();
  const { name, permissions, expiresAt } = body;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const rawKey = generateApiKey();
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.substring(0, 12) + "...";

  const apiKey = await prisma.apiKey.create({
    data: {
      clinicId: user.clinicId,
      name,
      keyHash,
      keyPrefix,
      permissions: permissions || "finance:read",
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  // Return the raw key ONLY on creation — it's never stored
  return NextResponse.json({
    id: apiKey.id,
    name: apiKey.name,
    key: rawKey, // Only shown once!
    keyPrefix,
    permissions: apiKey.permissions,
    expiresAt: apiKey.expiresAt,
    createdAt: apiKey.createdAt,
  }, { status: 201 });
}

// PATCH — update (activate/deactivate)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });
  if (!user?.clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const body = await req.json();
  const { id, isActive, name, permissions } = body;
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  const existing = await prisma.apiKey.findFirst({ where: { id, clinicId: user.clinicId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: any = {};
  if (isActive !== undefined) data.isActive = isActive;
  if (name !== undefined) data.name = name;
  if (permissions !== undefined) data.permissions = permissions;

  const updated = await prisma.apiKey.update({ where: { id }, data });
  return NextResponse.json(updated);
}

// DELETE — permanently delete an API key
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });
  if (!user?.clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const url = req.nextUrl;
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  const existing = await prisma.apiKey.findFirst({ where: { id, clinicId: user.clinicId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.apiKey.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
