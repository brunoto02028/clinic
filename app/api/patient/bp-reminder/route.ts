import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from '@/lib/get-effective-user';
import { patientGate } from "@/lib/patient-gate";

export const dynamic = 'force-dynamic';

// GET — check current reminder status
export async function GET() {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate();
  if (__gate.response) return __gate.response;

  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: effectiveUser.userId },
      select: { bpReminderEnabled: true },
    });

    return NextResponse.json({ enabled: user?.bpReminderEnabled ?? false });
  } catch (error) {
    console.error("BP reminder GET error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// PATCH — toggle reminder on/off
export async function PATCH(request: NextRequest) {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate();
  if (__gate.response) return __gate.response;

  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { enabled } = await request.json();

    await prisma.user.update({
      where: { id: effectiveUser.userId },
      data: { bpReminderEnabled: !!enabled },
    });

    return NextResponse.json({ success: true, enabled: !!enabled });
  } catch (error) {
    console.error("BP reminder PATCH error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
