export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

function authGuard(session: any) {
  const role = (session?.user as any)?.role;
  return session && ["SUPERADMIN", "ADMIN", "THERAPIST"].includes(role);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!authGuard(session)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const groups = await (prisma as any).emailGroup.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { members: true } } },
  });
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!authGuard(session)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { name, description } = await req.json();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const group = await (prisma as any).emailGroup.create({ data: { name, description: description || null } });
  return NextResponse.json(group);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!authGuard(session)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id, name, description } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const group = await (prisma as any).emailGroup.update({ where: { id }, data: { name, description } });
  return NextResponse.json(group);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!authGuard(session)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await (prisma as any).emailGroup.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
