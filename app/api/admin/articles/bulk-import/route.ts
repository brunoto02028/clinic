import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import * as cheerio from "cheerio";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min timeout for bulk ops

/**
 * POST /api/admin/articles/bulk-import
 *
 * Step 1 — discover: { siteUrl, mode: "discover" }
 *   Returns list of article URLs found on the site.
 *
 * Step 2 — import: { urls: string[], mode: "import" }
 *   Imports each URL as a draft article.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userRole = (session.user as any).role;
    if (!["ADMIN", "SUPERADMIN", "THERAPIST"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { mode, siteUrl, urls } = body;

    // ─── MODE: discover ───────────────────────────────────────────────────────
    if (mode === "discover") {
      if (!siteUrl) return NextResponse.json({ error: "siteUrl required" }, { status: 400 });

      const base = new URL(siteUrl.trim().replace(/\/$/, ""));
      const origin = base.origin;
      const discovered = new Set<string>();

      const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

      // Try sitemap sources
      const sitemapUrls = [
        `${origin}/sitemap.xml`,
        `${origin}/sitemap_index.xml`,
        `${origin}/post-sitemap.xml`,
        `${origin}/page-sitemap.xml`,
        `${origin}/wp-sitemap.xml`,
      ];

      for (const sitemapUrl of sitemapUrls) {
        try {
          const res = await fetch(sitemapUrl, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
          if (!res.ok) continue;
          const text = await res.text();
          const $ = cheerio.load(text, { xmlMode: true });

          // Handle sitemap index (nested sitemaps)
          const sitemapLocs: string[] = [];
          $("sitemap > loc").each((_, el) => sitemapLocs.push($(el).text().trim()));

          for (const subUrl of sitemapLocs) {
            try {
              const subRes = await fetch(subUrl, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
              if (!subRes.ok) continue;
              const subText = await subRes.text();
              const $sub = cheerio.load(subText, { xmlMode: true });
              $sub("url > loc").each((_, el) => {
                const loc = $sub(el).text().trim();
                if (isArticleUrl(loc, origin)) discovered.add(loc);
              });
            } catch { /* skip broken sub-sitemaps */ }
          }

          // Direct URL entries
          $("url > loc").each((_, el) => {
            const loc = $(el).text().trim();
            if (isArticleUrl(loc, origin)) discovered.add(loc);
          });

          if (discovered.size > 0) break; // found via sitemap, stop
        } catch { /* try next */ }
      }

      // Fallback: scrape blog listing page
      if (discovered.size === 0) {
        const blogPaths = ["/blog", "/news", "/articles", "/resources", ""];
        for (const blogPath of blogPaths) {
          try {
            const listUrl = `${origin}${blogPath}`;
            const res = await fetch(listUrl, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10000) });
            if (!res.ok) continue;
            const html = await res.text();
            const $ = cheerio.load(html);
            $("a[href]").each((_, el) => {
              const href = $(el).attr("href") || "";
              let absolute: string;
              try { absolute = new URL(href, origin).href; } catch { return; }
              if (isArticleUrl(absolute, origin)) discovered.add(absolute);
            });
            if (discovered.size > 0) break;
          } catch { /* try next path */ }
        }
      }

      return NextResponse.json({
        urls: Array.from(discovered).slice(0, 200), // cap at 200
        count: discovered.size,
      });
    }

    // ─── MODE: import ─────────────────────────────────────────────────────────
    if (mode === "import") {
      if (!Array.isArray(urls) || urls.length === 0) {
        return NextResponse.json({ error: "urls array required" }, { status: 400 });
      }

      const userId = (session.user as any).id;
      const results: { url: string; status: "ok" | "skip" | "error"; title?: string; error?: string }[] = [];

      const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
      const articlesDir = path.join(uploadsDir, "articles");
      await mkdir(articlesDir, { recursive: true });

      const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

      for (const url of urls) {
        try {
          // ── Fetch page ──
          const res = await fetch(url, {
            headers: { "User-Agent": UA, "Accept": "text/html,*/*;q=0.9" },
            signal: AbortSignal.timeout(15000),
          });
          if (!res.ok) { results.push({ url, status: "error", error: `HTTP ${res.status}` }); continue; }

          const html = await res.text();
          const $ = cheerio.load(html);

          // ── Extract fields ──
          const title =
            $('meta[property="og:title"]').attr("content") ||
            $("h1").first().text().trim() ||
            $("title").text().trim() ||
            "Imported Article";

          const excerpt =
            $('meta[property="og:description"]').attr("content") ||
            $('meta[name="description"]').attr("content") ||
            $("article p").first().text().trim().slice(0, 300) ||
            "";

          let featuredImage =
            $('meta[property="og:image"]').attr("content") ||
            $("article img").first().attr("src") ||
            $(".post-thumbnail img, .featured-image img, .wp-post-image").first().attr("src") ||
            null;

          // ── Extract content ──
          const selectors = [
            "article .entry-content", "article .post-content", ".article-content",
            ".post-body", "article", ".entry-content", ".post-content",
            '[itemprop="articleBody"]', ".blog-post-content", "main .content",
          ];
          let contentHtml = "";
          for (const sel of selectors) {
            const el = $(sel).first();
            if (el.length && el.text().trim().length > 100) { contentHtml = el.html() || ""; break; }
          }
          if (!contentHtml) {
            const paras: string[] = [];
            $("p").each((_, el) => { if ($(el).text().trim().length > 30) paras.push($.html(el) || ""); });
            contentHtml = paras.join("\n");
          }

          // ── Clean content ──
          const $c = cheerio.load(contentHtml, null, false);
          $c("script,style,nav,.advertisement,.ad,.sidebar,.comments,.social-share,.related-posts,footer,header").remove();
          const bodyEl = $c("body");
          contentHtml = bodyEl.length ? bodyEl.html() || "" : $c.html() || "";

          // ── Download images ──
          const baseUrl = new URL(url);
          const $p = cheerio.load(contentHtml, null, false);
          const imgMap: Record<string, string> = {};
          const imgPromises: Promise<void>[] = [];

          $p("img").each((_, img) => {
            const src = $p(img).attr("src");
            if (!src) return;
            let abs: string;
            try { abs = new URL(src, baseUrl.origin).href; } catch { return; }
            imgPromises.push((async () => {
              try {
                const ir = await fetch(abs, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(10000) });
                if (!ir.ok) return;
                const ct = ir.headers.get("content-type") || "";
                if (!ct.startsWith("image/")) return;
                const ext = ct.includes("png") ? ".png" : ct.includes("webp") ? ".webp" : ct.includes("gif") ? ".gif" : ".jpg";
                const fn = `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}${ext}`;
                await writeFile(path.join(articlesDir, fn), new Uint8Array(await ir.arrayBuffer()));
                imgMap[src] = `/uploads/articles/${fn}`;
              } catch { /* skip */ }
            })());
          });

          await Promise.race([Promise.all(imgPromises), new Promise(r => setTimeout(r, 20000))]);
          for (const [orig, local] of Object.entries(imgMap)) {
            contentHtml = contentHtml.replace(new RegExp(escapeRegex(orig), "g"), local);
          }

          // ── Download featured image ──
          let localFeatured: string | null = null;
          if (featuredImage) {
            try {
              const abs = new URL(featuredImage, baseUrl.origin).href;
              const ir = await fetch(abs, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(10000) });
              if (ir.ok) {
                const ct = ir.headers.get("content-type") || "";
                if (ct.startsWith("image/")) {
                  const ext = ct.includes("png") ? ".png" : ct.includes("webp") ? ".webp" : ".jpg";
                  const fn = `bulk-feat-${Date.now()}${ext}`;
                  await writeFile(path.join(articlesDir, fn), new Uint8Array(await ir.arrayBuffer()));
                  localFeatured = `/uploads/articles/${fn}`;
                }
              }
            } catch { /* skip */ }
          }

          // ── Generate slug ──
          const baseSlug = title.toLowerCase().normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "").slice(0, 100);
          let slug = baseSlug;
          let counter = 1;
          while (await prisma.article.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${counter++}`;
          }

          // ── Save ──
          await prisma.article.create({
            data: { title, slug, excerpt: excerpt.slice(0, 500), content: contentHtml, imageUrl: localFeatured, published: false, authorId: userId },
          });

          results.push({ url, status: "ok", title });
        } catch (e: any) {
          results.push({ url, status: "error", error: e.message || "Unknown error" });
        }
      }

      const ok = results.filter(r => r.status === "ok").length;
      const errors = results.filter(r => r.status === "error").length;

      return NextResponse.json({ success: true, results, summary: { imported: ok, errors, total: urls.length } });
    }

    return NextResponse.json({ error: "Invalid mode. Use 'discover' or 'import'" }, { status: 400 });
  } catch (err: any) {
    console.error("[bulk-import]", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

function isArticleUrl(url: string, origin: string): boolean {
  try {
    const u = new URL(url);
    if (u.origin !== origin) return false;
    const path = u.pathname;
    // Skip home, static assets, admin, feed, category, tag, author pages
    if (path === "/" || path === "") return false;
    if (/\.(jpg|jpeg|png|gif|svg|webp|pdf|xml|json|css|js|ico|woff|woff2)$/i.test(path)) return false;
    if (/\/(wp-content|wp-includes|wp-admin|feed|category|tag|author|page|cart|shop|checkout|account|#)/i.test(path)) return false;
    // Must have some path depth (not just /?page=x)
    if (path.length < 5) return false;
    return true;
  } catch { return false; }
}

function escapeRegex(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
