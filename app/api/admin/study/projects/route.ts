import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudyUserId } from "@/lib/study-auth";

export const dynamic = "force-dynamic";

// List the current user's study projects
export async function GET() {
  const userId = await getStudyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await prisma.studyProject.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { documents: true, drafts: true, messages: true } },
    },
  });
  return NextResponse.json({ projects });
}

// Create a new study project
export async function POST(req: NextRequest) {
  const userId = await getStudyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title = (body.title || "").trim();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const project = await prisma.studyProject.create({
    data: {
      ownerId: userId,
      title,
      course: body.course?.trim() || "Level 5 Diploma",
      provider: body.provider?.trim() || "Core Elements",
      level: body.level?.trim() || "Level 5",
      description: body.description?.trim() || null,
    },
  });
  return NextResponse.json({ project });
}
