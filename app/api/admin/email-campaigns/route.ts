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

  const campaigns = await (prisma as any).emailCampaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { jobs: true } } },
  });
  return NextResponse.json(campaigns);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!authGuard(session)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const {
    name, subject, templateSlug, htmlBody, preheader,
    fromName, fromEmail, replyTo,
    groupId, sendToAll,
    batchSize, batchIntervalMs,
    scheduledAt, articleId,
  } = body;

  if (!name || !subject) return NextResponse.json({ error: "Name and subject required" }, { status: 400 });

  const campaign = await (prisma as any).emailCampaign.create({
    data: {
      name,
      subject,
      templateSlug: templateSlug || null,
      htmlBody: htmlBody || null,
      preheader: preheader || null,
      fromName: fromName || "Bruno Physical Rehabilitation",
      fromEmail: fromEmail || "support@bpr.rehab",
      replyTo: replyTo || null,
      groupId: groupId || null,
      sendToAll: sendToAll ?? false,
      batchSize: batchSize || 10,
      batchIntervalMs: batchIntervalMs || 300000,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      articleId: articleId || null,
      status: "DRAFT",
    },
  });

  return NextResponse.json(campaign);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!authGuard(session)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  if (data.scheduledAt) data.scheduledAt = new Date(data.scheduledAt);

  const campaign = await (prisma as any).emailCampaign.update({ where: { id }, data });
  return NextResponse.json(campaign);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!authGuard(session)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await (prisma as any).emailCampaign.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
