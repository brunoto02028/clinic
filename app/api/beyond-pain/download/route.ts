import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { logBookEvent, getBookReaderFromToken, BOOK_SOURCE } from "@/lib/book";

export const dynamic = "force-dynamic";

// GET /api/beyond-pain/download?token=<confirmToken>&lang=en|pt   (email link — single-use)
// GET /api/beyond-pain/download?lang=en|pt                        (on-page button — uses book_access cookie)
//
// Serves the Chapter One PDF for a confirmed book reader. The PDF itself
// lives outside /public (see book/pdf/) so there is no static, guessable
// URL for it — this route is the only way to reach the file.
//
// The emailed link is single-use per contact: the first successful request
// stamps `chapterOnePdfDownloadedAt`, and every request after that
// (including a retry by the same person, or anyone who was forwarded the
// email) gets rejected. This protects against the email link being shared
// or leaked. The on-page "Download" button on /beyond-pain/chapter-one
// omits the token and relies on the reader's own book_access session
// cookie instead, so it keeps working for as long as they're logged in as
// a confirmed reader — no separate one-time code to manage there.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const lang = request.nextUrl.searchParams.get("lang") === "pt" ? "pt" : "en";

  let contact: any = null;
  let enforceOneTimeUse = false;

  if (token) {
    contact = await (prisma as any).emailContact.findUnique({ where: { confirmToken: token } });
    enforceOneTimeUse = true;
  } else {
    contact = await getBookReaderFromToken(request.cookies.get("book_access")?.value);
  }

  if (!contact || !contact.confirmed || contact.source !== BOOK_SOURCE) {
    return NextResponse.json({ error: "This link is invalid." }, { status: 404 });
  }

  if (enforceOneTimeUse && contact.chapterOnePdfDownloadedAt) {
    return NextResponse.json(
      { error: "This download link has already been used. You can still read the chapter online any time." },
      { status: 410 }
    );
  }

  const filename = `chapter-one-${lang}.pdf`;
  const pdfPath = path.join(process.cwd(), "book", "pdf", filename);

  let file: Buffer;
  try {
    file = fs.readFileSync(pdfPath);
  } catch (err) {
    console.error("[beyond-pain/download] PDF not found:", err);
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  if (!contact.chapterOnePdfDownloadedAt) {
    await (prisma as any).emailContact.update({
      where: { id: contact.id },
      data: { chapterOnePdfDownloadedAt: new Date() },
    });
  }
  await logBookEvent(contact.id, "pdf_downloaded", { lang });

  return new NextResponse(file, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Beyond-Pain-Chapter-One-${lang}.pdf"`,
      "Content-Length": String(file.length),
      "Cache-Control": "no-store",
    },
  });
}
