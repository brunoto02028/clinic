export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  try {
    await (prisma as any).emailContact.updateMany({
      where: { email: email.toLowerCase().trim() },
      data: { subscribed: false, unsubscribedAt: new Date() },
    });
    return NextResponse.json({ unsubscribed: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
