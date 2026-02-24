import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import * as cheerio from "cheerio";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * Import an article from an external URL.
 * Scrapes title, content, images, excerpt and creates an Article record.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as any).role;
    if (!["ADMIN", "SUPERADMIN", "THERAPIST"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9,pt-BR;q=0.8",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
        { status: 400 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract title
    const title =
      $('meta[property="og:title"]').attr("content") ||
      $("h1").first().text().trim() ||
      $("title").text().trim() ||
      "Imported Article";

    // Extract description/excerpt
    const excerpt =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      $("article p").first().text().trim().slice(0, 300) ||
      title;

    // Extract featured image
    let featuredImage =
      $('meta[property="og:image"]').attr("content") ||
      $("article img").first().attr("src") ||
      $(".post-thumbnail img, .entry-thumbnail img, .featured-image img").first().attr("src") ||
      null;

    // Extract article content - try multiple selectors
    let contentHtml = "";
    const contentSelectors = [
      "article .entry-content",
      "article .post-content",
      ".article-content",
      ".post-body",
      "article",
      ".entry-content",
      ".post-content",
      '[itemprop="articleBody"]',
      ".blog-post-content",
      "main .content",
    ];

    for (const selector of contentSelectors) {
      const el = $(selector).first();
      if (el.length && el.html() && el.text().trim().length > 100) {
        contentHtml = el.html() || "";
        break;
      }
    }

    // Fallback: get all paragraphs
    if (!contentHtml) {
      const paragraphs: string[] = [];
      $("p").each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 30) {
          paragraphs.push($.html(el) || "");
        }
      });
      contentHtml = paragraphs.join("\n");
    }

    // Remove scripts, styles, ads, nav from content
    const $content = cheerio.load(contentHtml, null, false);
    $content("script, style, nav, .advertisement, .ad, .sidebar, .comments, .social-share, .related-posts, footer, header, html, head, meta, link").remove();
    // Unwrap body tag if present
    const bodyEl = $content("body");
    if (bodyEl.length) {
      contentHtml = bodyEl.html() || "";
    } else {
      contentHtml = $content.html() || "";
    }

    // Download images from the article content and replace URLs
    const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
    const articlesDir = path.join(uploadsDir, "articles");
    await mkdir(articlesDir, { recursive: true });

    const baseUrl = new URL(url);
    const downloadedImages: Record<string, string> = {};

    // Find all images in content
    const $parsed = cheerio.load(contentHtml, null, false);
    const imagePromises: Promise<void>[] = [];

    $parsed("img").each((_, img) => {
      const src = $parsed(img).attr("src");
      if (!src) return;

      // Resolve relative URLs
      let absoluteSrc: string;
      try {
        absoluteSrc = new URL(src, baseUrl.origin).href;
      } catch {
        return;
      }

      const promise = (async () => {
        try {
          const imgRes = await fetch(absoluteSrc, {
            headers: { "User-Agent": "Mozilla/5.0" },
          });
          if (!imgRes.ok) return;

          const contentType = imgRes.headers.get("content-type") || "";
          if (!contentType.startsWith("image/")) return;

          const ext = contentType.includes("png") ? ".png" :
            contentType.includes("webp") ? ".webp" :
            contentType.includes("gif") ? ".gif" :
            contentType.includes("svg") ? ".svg" : ".jpg";

          const filename = `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
          const filePath = path.join(articlesDir, filename);

          const buffer = await imgRes.arrayBuffer();
          await writeFile(filePath, new Uint8Array(buffer));

          const localUrl = `/uploads/articles/${filename}`;
          downloadedImages[src] = localUrl;
        } catch (e) {
          console.error("Failed to download image:", absoluteSrc, e);
        }
      })();

      imagePromises.push(promise);
    });

    // Wait for all image downloads (max 30 seconds)
    await Promise.race([
      Promise.all(imagePromises),
      new Promise((resolve) => setTimeout(resolve, 30000)),
    ]);

    // Replace image URLs in content
    for (const [originalSrc, localSrc] of Object.entries(downloadedImages)) {
      contentHtml = contentHtml.replace(new RegExp(escapeRegex(originalSrc), "g"), localSrc);
    }

    // Download featured image too
    let localFeaturedImage: string | null = null;
    if (featuredImage) {
      try {
        const absoluteFeatured = new URL(featuredImage, baseUrl.origin).href;
        const imgRes = await fetch(absoluteFeatured, {
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        if (imgRes.ok) {
          const contentType = imgRes.headers.get("content-type") || "";
          if (contentType.startsWith("image/")) {
            const ext = contentType.includes("png") ? ".png" :
              contentType.includes("webp") ? ".webp" : ".jpg";
            const filename = `featured-${Date.now()}${ext}`;
            const filePath = path.join(articlesDir, filename);
            const buffer = await imgRes.arrayBuffer();
            await writeFile(filePath, new Uint8Array(buffer));
            localFeaturedImage = `/uploads/articles/${filename}`;
          }
        }
      } catch (e) {
        console.error("Failed to download featured image:", e);
      }
    }

    // Generate unique slug
    const baseSlug = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 100);

    let slug = baseSlug;
    let counter = 1;
    while (await prisma.article.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create article
    const userId = (session.user as any).id;
    const article = await prisma.article.create({
      data: {
        title,
        slug,
        excerpt: excerpt.slice(0, 500),
        content: contentHtml,
        imageUrl: localFeaturedImage,
        published: false,
        authorId: userId,
      },
      include: {
        author: { select: { firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({
      success: true,
      article,
      stats: {
        imagesDownloaded: Object.keys(downloadedImages).length,
        contentLength: contentHtml.length,
        hasFeaturedImage: !!localFeaturedImage,
      },
    });
  } catch (error: any) {
    console.error("Article import error:", error);
    return NextResponse.json(
      { error: "Failed to import article: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
