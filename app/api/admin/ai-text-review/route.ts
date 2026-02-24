import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { callAIChat } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

/**
 * Build a compact summary of the consent document for AI context.
 */
function buildDocSummary(ctx: any): string {
  if (!ctx) return "";
  const lines: string[] = [];
  lines.push(`Consent Checkbox: "${(ctx.consentCheckboxText || "").slice(0, 200)}"`);
  for (const group of ["termsSections", "privacySections", "liabilitySections"] as const) {
    const title = group === "termsSections" ? ctx.termsTitle : group === "privacySections" ? ctx.privacyTitle : ctx.liabilityTitle;
    lines.push(`\n## ${title || group} (${group})`);
    (ctx[group] || []).forEach((s: any, i: number) => {
      lines.push(`  [${i}] "${s.title}" — ${(s.body || "").slice(0, 120)}${(s.body || "").length > 120 ? "..." : ""}`);
    });
  }
  return lines.join("\n");
}

/**
 * POST /api/admin/ai-text-review — Chat with AI to review/edit legal texts
 * body: { messages: [{role, content}], context?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages, context } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    // Build compact doc summary instead of sending full JSON
    let docContext = "";
    try {
      const parsed = typeof context === "string" ? JSON.parse(context) : context;
      docContext = buildDocSummary(parsed);
    } catch {
      docContext = (context || "").slice(0, 2000);
    }

    const systemText = `You are a legal text editor for "Bruno Physical Rehabilitation" (BPR), a physiotherapy clinic in England, UK.
Tasks: review/edit Terms, Privacy Policies, Consent. Fix grammar. Use UK English. Ensure UK GDPR compliance. Translate to/from Portuguese (Brazil) when asked.

When suggesting changes, include apply blocks:
\`\`\`apply
{"group":"termsSections","index":0,"title":"New Title","body":"New body text"}
\`\`\`
Groups: termsSections, privacySections, liabilitySections. Index is 0-based.
For checkbox: \`\`\`apply
{"field":"consentCheckboxText","value":"New text"}
\`\`\`
Explain changes BEFORE the apply block. Respond in user's language.

Document:
${docContext}`;

    const reply = await callAIChat(messages, {
      systemPrompt: systemText,
      temperature: 0.4,
      maxTokens: 2048,
    });

    if (!reply) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("[ai-text-review] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
