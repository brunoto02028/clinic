import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logBookEvent, sendBookChapterDeliveryEmail, BOOK_SOURCE } from "@/lib/book";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXTAUTH_URL || "https://bpr.clinic";

// GET /api/beyond-pain/confirm?token=...
// The magic link from the confirmation email. Verifies the address,
// marks the contact confirmed+subscribed, sets the long-lived book_access
// cookie (server-side gate for /beyond-pain/chapter-one — see lib/book.ts),
// and redirects straight into the unlocked chapter. Idempotent.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(`${BASE_URL}/beyond-pain?error=missing_token`);
  }

  try {
    const contact = await (prisma as any).emailContact.findUnique({ where: { confirmToken: token } });
    if (!contact || contact.source !== BOOK_SOURCE) {
      return NextResponse.redirect(`${BASE_URL}/beyond-pain?error=invalid_token`);
    }

    if (!contact.confirmed) {
      await (prisma as any).emailContact.update({
        where: { id: contact.id },
        data: { confirmed: true, confirmedAt: new Date(), subscribed: true },
      });
      await logBookEvent(contact.id, "book_confirmed");
      // First confirmation only — deliver the actual chapter PDF by email
      // (copyright notice + case for buying the finished book included).
      await sendBookChapterDeliveryEmail({
        email: contact.email,
        firstName: contact.firstName,
        language: contact.language,
        confirmToken: contact.confirmToken,
        contactId: contact.id,
      });
    }
    await logBookEvent(contact.id, "book_unlocked");

    const res = NextResponse.redirect(`${BASE_URL}/beyond-pain/chapter-one`);
    res.cookies.set("book_access", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    return res;
  } catch (error) {
    console.error("[beyond-pain/confirm] error:", error);
    return NextResponse.redirect(`${BASE_URL}/beyond-pain?error=server_error`);
  }
}
