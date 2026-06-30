import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

const TERRA_API_KEY = process.env.TERRA_API_KEY ?? "";
const TERRA_DEV_ID  = process.env.TERRA_DEV_ID  ?? "";
const TERRA_BASE    = "https://api.tryterra.co/v2";

// GET — generate a Terra widget session URL for the patient to connect their wearable
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await (prisma as any).user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });
  if (!user || user.role !== "PATIENT") {
    return NextResponse.json({ error: "Patients only" }, { status: 403 });
  }

  // Generate Terra widget session
  const res = await fetch(`${TERRA_BASE}/auth/generateWidgetSession`, {
    method: "POST",
    headers: {
      "x-api-key": TERRA_API_KEY,
      "dev-id": TERRA_DEV_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reference_id: user.id,         // our internal user id — returned in webhooks
      language: "en",
      auth_success_redirect_url: `${process.env.NEXTAUTH_URL}/dashboard/biohacking?connected=1`,
      auth_failure_redirect_url: `${process.env.NEXTAUTH_URL}/dashboard/biohacking?connected=0`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[Terra connect] widget session error:", err);
    return NextResponse.json({ error: "Failed to create Terra session" }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json({ url: data.url, session_id: data.session_id });
}

// DELETE — deauthorise / disconnect a provider
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await (prisma as any).user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { terraUserId } = await req.json();

  // Revoke on Terra side
  await fetch(`${TERRA_BASE}/auth/deauthUser?user_id=${terraUserId}`, {
    method: "DELETE",
    headers: { "x-api-key": TERRA_API_KEY, "dev-id": TERRA_DEV_ID },
  }).catch(() => {});

  // Mark as disconnected in DB
  await (prisma as any).wearableConnection.updateMany({
    where: { userId: user.id, terraUserId },
    data: { status: "DISCONNECTED" },
  });

  return NextResponse.json({ ok: true });
}
