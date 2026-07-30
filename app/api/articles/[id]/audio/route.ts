import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateSpeech, stripHtmlForSpeech } from "@/lib/eleven-labs";

export const dynamic = "force-dynamic";

// GET /api/articles/[id]/audio?locale=en|pt
// Returns (and lazily generates + caches) ElevenLabs narration for the
// article's "Listen to article" player. Public — only serves published
// articles, and only ever reads/speaks public blog content (no patient data).
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const locale: "en" | "pt" = searchParams.get("locale") === "pt" ? "pt" : "en";

    const article = await prisma.article.findUnique({ where: { id: params.id } });
    if (!article || !article.published) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const cached = await (prisma as any).articleAudio.findUnique({
      where: { articleId_locale: { articleId: article.id, locale } },
    });

    if (cached) {
      const buffer = Buffer.from(cached.audioData, "base64");
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": cached.mimeType,
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Length": String(buffer.length),
        },
      });
    }

    const title = locale === "pt" ? (article.titlePt || article.title) : (article.titleEn || article.title);
    const excerpt = locale === "pt" ? (article.excerptPt || article.excerpt) : (article.excerptEn || article.excerpt);
    const content = locale === "pt" ? (article.contentPt || article.content) : (article.contentEn || article.content);
    const text = stripHtmlForSpeech(`${title}. ${excerpt}. ${content}`);

    if (!text) {
      return NextResponse.json({ error: "No content to narrate" }, { status: 400 });
    }

    const { audio, voiceId } = await generateSpeech(text, locale);
    const base64 = audio.toString("base64");

    // Upsert — tolerate a race where two requests generate concurrently.
    await (prisma as any).articleAudio.upsert({
      where: { articleId_locale: { articleId: article.id, locale } },
      create: { articleId: article.id, locale, voiceId, audioData: base64, characterCount: text.length },
      update: { voiceId, audioData: base64, characterCount: text.length },
    });

    return new NextResponse(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(audio.length),
      },
    });
  } catch (error) {
    console.error("[article-audio] error:", error);
    return NextResponse.json({ error: "Failed to generate audio" }, { status: 500 });
  }
}
