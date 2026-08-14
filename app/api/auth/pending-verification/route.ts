export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

/**
 * Recovers the verification link for someone who closed the signup tab.
 *
 * /verify is reachable only through ?userId=..., handed out once at signup.
 * A patient who closed that tab had no way back: logging in answered "account
 * is deactivated" and nothing in the app pointed at /verify. Two patients were
 * lost to this in a week.
 *
 * The password is required precisely so this cannot be used to turn an email
 * address into a user id — the caller has to already be the account holder.
 * A wrong password and an unknown address answer identically.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = (await req.json()) ?? {};
    if (!email || !password) {
      return NextResponse.json({ error: "email and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase() },
      select: { id: true, password: true, isActive: true, emailVerified: true },
    });

    const deny = () =>
      NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

    if (!user?.password) return deny();
    if (!(await bcrypt.compare(String(password), user.password))) return deny();

    // Already usable, or switched off by the clinic — neither belongs at /verify.
    if (user.isActive || user.emailVerified) {
      return NextResponse.json({ error: "Account does not need verification" }, { status: 409 });
    }

    return NextResponse.json({ userId: user.id });
  } catch (error) {
    console.error("[pending-verification] error:", error);
    return NextResponse.json({ error: "Failed to resolve account" }, { status: 500 });
  }
}
