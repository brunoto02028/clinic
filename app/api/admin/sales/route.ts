import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET — List leads with filters
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const stage = searchParams.get("stage");
  const source = searchParams.get("source");
  const priority = searchParams.get("priority");

  const where: any = {};
  if (stage && stage !== "all") where.stage = stage;
  if (source && source !== "all") where.source = source;
  if (priority && priority !== "all") where.priority = priority;

  const leads = await prisma.salesLead.findMany({
    where,
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });

  // Calculate stats
  const allLeads = await prisma.salesLead.findMany();
  const stats = {
    total: allLeads.length,
    new: allLeads.filter((l) => l.stage === "new").length,
    contacted: allLeads.filter((l) => l.stage === "contacted").length,
    booked: allLeads.filter((l) => l.stage === "consultation_booked").length,
    attended: allLeads.filter((l) => l.stage === "attended").length,
    converted: allLeads.filter((l) => l.stage === "converted").length,
    lost: allLeads.filter((l) => l.stage === "lost").length,
    totalPipelineValue: allLeads.filter((l) => !["converted", "lost"].includes(l.stage)).reduce((sum, l) => sum + (l.estimatedValue || 0), 0),
    totalRevenue: allLeads.filter((l) => l.stage === "converted").reduce((sum, l) => sum + (l.actualValue || l.estimatedValue || 0), 0),
    conversionRate: allLeads.length > 0 ? Math.round((allLeads.filter((l) => l.stage === "converted").length / allLeads.length) * 100) : 0,
    overdueFollowUps: allLeads.filter((l) => l.nextFollowUpAt && new Date(l.nextFollowUpAt) < new Date() && !["converted", "lost"].includes(l.stage)).length,
  };

  return NextResponse.json({ leads, stats });
}

// POST — Create new lead
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, email, phone, source, interestedIn, estimatedValue, notes, priority } = body;

  if (!name || !source) {
    return NextResponse.json({ error: "Name and source are required" }, { status: 400 });
  }

  const lead = await prisma.salesLead.create({
    data: {
      name,
      email: email || null,
      phone: phone || null,
      source,
      interestedIn: interestedIn || null,
      estimatedValue: estimatedValue ? parseFloat(estimatedValue) : null,
      notes: notes || null,
      priority: priority || "medium",
    },
  });

  return NextResponse.json(lead, { status: 201 });
}
