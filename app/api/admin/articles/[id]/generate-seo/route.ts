import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { callAI } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

function authGuard(session: any) {
  const role = session?.user?.role;
  return session && ["SUPERADMIN", "ADMIN", "THERAPIST"].includes(role);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// POST /api/admin/articles/[id]/generate-seo
// Uses AI (OpenRouter/Claude via callAI) to generate a locally-optimised meta
// description, target keyword and tags from the article's own content —
// so search visibility (e.g. "physio Ipswich", condition + Suffolk) matches
// what the article actually covers.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!authGuard(session)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const article = await prisma.article.findUnique({ where: { id: params.id } });
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const title = article.titleEn || article.title;
  const excerpt = article.excerptEn || article.excerpt;
  const contentText = stripHtml(article.contentEn || article.content || "").slice(0, 6000);
  const titlePt = article.titlePt;
  const excerptPt = article.excerptPt;

  const prompt = `You are an SEO specialist for a UK sports & clinical physiotherapy clinic (BPR) based in Ipswich, Suffolk, whose site is read by both English and Brazilian Portuguese speakers. Given the article below, produce locally-optimised SEO metadata that will help this exact article rank and be found by people searching for this condition/topic, ideally combined with local intent (e.g. "physio Ipswich", "[condition] Suffolk") where it makes sense.

ARTICLE TITLE (EN):
${title}

EXCERPT (EN):
${excerpt}
${titlePt ? `\nARTICLE TITLE (PT-BR):\n${titlePt}\n\nEXCERPT (PT-BR):\n${excerptPt || ""}` : ""}

CONTENT (plain text, may be truncated):
${contentText}

Return ONLY a valid JSON object with exactly these keys, no markdown fences, no commentary:
{
  "metaDescription": "under 155 characters, compelling, includes the primary keyword naturally, in English",
  "metaDescriptionPt": "${titlePt ? "under 155 characters, compelling, includes the primary keyword naturally, in natural Brazilian Portuguese (pt-BR)" : "empty string — no PT-BR title/excerpt was supplied above"}",
  "keyword": "the single best target search keyword/phrase for this article (2-5 words)",
  "tags": ["3 to 6 short topical tags, Title Case, e.g. Knee, Osteoarthritis, Injury Prevention"]
}`;

  try {
    const raw = await callAI(prompt, { maxTokens: 700 });
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/, "");
    }
    const parsed = JSON.parse(cleaned);

    const metaDescription = String(parsed.metaDescription || "").slice(0, 200);
    const metaDescriptionPt = String(parsed.metaDescriptionPt || "").slice(0, 200) || undefined;
    const keyword = String(parsed.keyword || "");
    const tags = Array.isArray(parsed.tags) ? parsed.tags.map((t: any) => String(t)).filter(Boolean) : [];

    return NextResponse.json({ metaDescription, metaDescriptionPt, keyword, tags });
  } catch (error: any) {
    console.error("[generate-seo] error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate SEO metadata" }, { status: 500 });
  }
}
