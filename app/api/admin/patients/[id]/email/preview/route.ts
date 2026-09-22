export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { guardEmailAccess } from "@/lib/patient-email-server";
import { maskEmail, parseEmailInput, renderPatientEmail } from "@/lib/patient-email";

// POST — render the exact e-mail (nothing is sent). The returned hash must be
// echoed back to /send, which refuses anything that no longer matches.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const g = await guardEmailAccess(request, params.id);
    if (g.response) return g.response;
    if (!g.patient.email) return NextResponse.json({ error: "This patient has no e-mail address on file" }, { status: 400 });

    const parsed = parseEmailInput(await request.json().catch(() => null));
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const email = await renderPatientEmail(g.patient, parsed.data);
    return NextResponse.json({
      subject: email.subject,
      html: email.html,
      locale: email.locale,
      toMasked: maskEmail(g.patient.email),
      hash: email.hash,
    });
  } catch (error) {
    console.error("[patient-email] preview error:", error);
    return NextResponse.json({ error: "Failed to build the preview" }, { status: 500 });
  }
}
