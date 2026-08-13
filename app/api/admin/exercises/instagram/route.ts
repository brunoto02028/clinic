import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { mkdir, readFile, unlink } from "fs/promises";
import path from "path";
import { processAndStoreExerciseVideo } from "@/lib/exercise-media";
import { tmpdir } from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import * as cheerio from "cheerio";
import { callAI } from "@/lib/ai-provider";

const execFileAsync = promisify(execFile);

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min for large profile downloads

// ─── Body region keywords (PT-BR + EN) ──────────────────────────
const VALID_REGIONS = [
  "SHOULDER", "ELBOW", "WRIST_HAND", "HIP", "KNEE", "ANKLE_FOOT",
  "SPINE_LUMBAR", "SPINE_THORACIC", "SPINE_BACK",
  "NECK_CERVICAL", "CORE_ABDOMEN", "STRETCHING", "MUSCLE_INJURY", "FULL_BODY", "OTHER",
] as const;

const BODY_REGION_KEYWORDS: Record<string, string[]> = {
  SHOULDER: ["shoulder", "ombro", "deltoid", "deltóide", "rotator cuff", "manguito rotador", "supraespinhoso", "infraespinhoso"],
  ELBOW: ["elbow", "cotovelo", "epicondylitis", "epicondilite", "tennis elbow"],
  WRIST_HAND: ["wrist", "punho", "hand", "mão", "carpal", "finger", "dedo", "grip"],
  HIP: ["hip", "quadril", "glute", "glúteo", "gluteo", "piriformis", "piriforme", "adductor", "adutor"],
  KNEE: ["knee", "joelho", "patella", "patela", "menisco", "meniscus", "acl", "lca", "pcl"],
  ANKLE_FOOT: ["ankle", "tornozelo", "foot", "pé", "pe ", "plantar", "achilles", "aquiles", "calf", "panturrilha"],
  SPINE_LUMBAR: ["lombar", "lumbar", "low back", "dor lombar", "lower back", "hérnia lombar", "l1", "l2", "l3", "l4", "l5", "sacral", "sacro", "sij", "ciática", "sciatica"],
  SPINE_THORACIC: ["thoracic", "torácica", "toracica", "dorsal", "mid back", "t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9", "t10", "t11", "t12", "cifose", "kyphosis"],
  SPINE_BACK: ["spine", "coluna", "back", "costas", "disc", "disco", "hernia", "hérnia"],
  NECK_CERVICAL: ["neck", "pescoço", "cervical", "cervicalgia", "trap", "trapézio", "trapezio", "c1", "c2", "c3", "c4", "c5", "c6", "c7"],
  CORE_ABDOMEN: ["core", "abdomen", "abdominal", "abs", "plank", "prancha", "oblique", "oblíquo"],
  STRETCHING: ["stretch", "alongamento", "flexibility", "flexibilidade", "mobilidade", "mobility"],
  MUSCLE_INJURY: ["injury", "lesão", "lesao", "strain", "distensão", "rupture", "ruptura", "recovery", "recuperação"],
  FULL_BODY: ["full body", "corpo inteiro", "total body", "funcional", "functional", "circuit", "circuito"],
};

function detectBodyRegionByKeywords(caption: string): string {
  if (!caption) return "OTHER";
  const lower = caption.toLowerCase();
  let bestRegion = "OTHER";
  let bestScore = 0;
  for (const [region, keywords] of Object.entries(BODY_REGION_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestRegion = region;
    }
  }
  return bestRegion;
}

async function detectBodyRegion(caption: string): Promise<string> {
  if (!caption || caption.length < 5) return "OTHER";

  const keywordResult = detectBodyRegionByKeywords(caption);
  if (keywordResult !== "OTHER") return keywordResult;

  try {
    const prompt = `You are a physiotherapy assistant. Analyze this social media post caption and classify the primary body region/joint it refers to.

Caption: "${caption.substring(0, 600)}"

Reply with ONLY one of these exact values (nothing else):
${VALID_REGIONS.join(", ")}

Guidelines:
- Lower back / lombar / L1-L5 / sciatica → SPINE_LUMBAR
- Mid back / thoracic / T1-T12 / kyphosis → SPINE_THORACIC  
- Neck / cervical / C1-C7 → NECK_CERVICAL
- Generic back/spine → SPINE_BACK
- Plank / core / abs → CORE_ABDOMEN
- If uncertain → OTHER`;

    const result = await callAI(prompt, "");
    const cleaned = result.trim().toUpperCase().replace(/[^A-Z_]/g, "");
    if ((VALID_REGIONS as readonly string[]).includes(cleaned)) return cleaned;
  } catch (e) {
    console.error("AI region detection failed:", e);
  }

  return "OTHER";
}

// ─── POST handler ────────────────────────────────────────────────
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
    let { urls } = body; // Can be individual post URLs or a profile URL

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: "At least one Instagram URL is required" }, { status: 400 });
    }

    const userId = (session.user as any).id;

    let clinicId = (session.user as any)?.clinicId;
    if (!clinicId) {
      const anyClinic = await prisma.clinic.findFirst({ select: { id: true } });
      clinicId = anyClinic?.id || null;
    }
    if (!clinicId) {
      return NextResponse.json({ error: "No clinic context" }, { status: 400 });
    }

    // Instagram has no folder picker, but every exercise must live in one.
    // Get-or-create "Instagram › Importados" so these land somewhere visible
    // instead of reappearing as loose videos.
    const igCategory = await prisma.exerciseFolder.upsert({
      where: { id: `ig-cat-${clinicId}` },
      create: { id: `ig-cat-${clinicId}`, clinicId, name: "Instagram", parentId: null },
      update: {},
    });
    const igFolder = await prisma.exerciseFolder.upsert({
      where: { id: `ig-fld-${clinicId}` },
      create: { id: `ig-fld-${clinicId}`, clinicId, name: "Importados", parentId: igCategory.id },
      update: {},
    });

    const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");

    // Expand profile URLs into individual post URLs
    const expandedUrls: string[] = [];
    const profileErrors: any[] = [];

    for (const rawUrl of urls) {
      const cleanUrl = rawUrl.trim().split("?")[0].replace(/\/$/, "");
      if (!cleanUrl.includes("instagram.com")) {
        profileErrors.push({ url: rawUrl, success: false, error: "Not a valid Instagram URL" });
        continue;
      }

      if (isProfileUrl(cleanUrl)) {
        // Scrape the profile to get all post URLs
        const username = extractUsername(cleanUrl);
        if (!username) {
          profileErrors.push({ url: rawUrl, success: false, error: "Could not extract username" });
          continue;
        }
        try {
          const postUrls = await scrapeProfilePostUrls(username);
          if (postUrls.length === 0) {
            profileErrors.push({ url: rawUrl, success: false, error: `Could not load posts for @${username}. The profile may be private or Instagram is blocking. Try pasting individual reel/post URLs instead (e.g. instagram.com/reel/ABC123).` });
          } else {
            expandedUrls.push(...postUrls);
          }
        } catch (e: any) {
          profileErrors.push({ url: rawUrl, success: false, error: `Failed to scrape @${username}: ${e.message}` });
        }
      } else {
        expandedUrls.push(cleanUrl);
      }
    }

    const results: any[] = [...profileErrors];
    let exerciseCounter = 1;

    for (const postUrl of expandedUrls) {
      try {
        let videoBuffer: ArrayBuffer | null = null;
        let videoCaption: string | undefined;

        // ── Primary: yt-dlp (handles Instagram natively) ──────────
        const ytResult = await ytDlpDownload(postUrl);
        if (ytResult) {
          videoBuffer = ytResult.buffer.buffer;
          videoCaption = ytResult.caption;
        }

        // ── Fallback: URL extraction + fetch ──────────────────────
        if (!videoBuffer) {
          const videoData = await extractInstagramVideo(postUrl);
          if (!videoData) {
            results.push({ url: postUrl, success: false, error: "Could not extract video URL — Instagram may be blocking server-side access to this IP." });
            continue;
          }
          videoCaption = videoData.caption;

          const isCobalt = videoData.videoUrl.includes("cobalt.tools");
          const videoRes = await fetch(videoData.videoUrl, {
            headers: isCobalt ? {} : {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Referer": "https://www.instagram.com/",
            },
          });

          if (!videoRes.ok) {
            results.push({ url: postUrl, success: false, error: `Download failed (HTTP ${videoRes.status})` });
            continue;
          }
          videoBuffer = await videoRes.arrayBuffer();
        }

        if (!videoBuffer || videoBuffer.byteLength < 10000) {
          results.push({ url: postUrl, success: false, error: "Downloaded file too small — likely not a valid video" });
          continue;
        }

        const filename = `ig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`;

        // Same pipeline as the other upload routes: normalise, thumbnail,
        // duration, then store in R2. Nothing stays on the VPS.
        const stored = await processAndStoreExerciseVideo(
          Buffer.from(videoBuffer),
          filename
        );
        const videoUrl = stored.videoUrl;
        const thumbnailUrl = stored.thumbnailUrl;
        const fileSize = videoBuffer.byteLength;

        // Auto-detect body region from caption (AI-powered)
        const bodyRegion = await detectBodyRegion(videoCaption || "");
        const regionLabel = (VALID_REGIONS as readonly string[]).includes(bodyRegion) ? bodyRegion : "OTHER";

        // Create exercise — no text from Instagram, only body region
        const exercise = await prisma.exercise.create({
          data: {
            name: `Exercise ${exerciseCounter}`,
            description: null,
            bodyRegion: regionLabel as any,
            difficulty: "INTERMEDIATE",
            videoUrl,
            videoFileName: stored.videoFileName,
            thumbnailUrl,
            isActive: true,
            clinicId,
            folderId: igFolder.id,
            createdById: userId,
            tags: ["instagram-import"],
          },
        });

        exerciseCounter++;

        results.push({
          url: postUrl,
          success: true,
          exercise: {
            id: exercise.id,
            name: exercise.name,
            bodyRegion: regionLabel,
            videoUrl,
            thumbnailUrl,
            fileSize,
          },
        });
      } catch (error: any) {
        console.error("Instagram download error for", postUrl, ":", error.message);
        results.push({ url: postUrl, success: false, error: error.message || "Unknown error" });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: successCount > 0,
      total: expandedUrls.length,
      downloaded: successCount,
      failed: results.filter((r) => !r.success).length,
      results,
    });
  } catch (error: any) {
    console.error("Instagram import error:", error);
    return NextResponse.json(
      { error: "Failed to import from Instagram: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}

// ─── Profile detection & scraping ────────────────────────────────

function isProfileUrl(url: string): boolean {
  // Profile URL: instagram.com/username (no /p/, /reel/, /reels/, /stories/ etc.)
  const path = new URL(url.startsWith("http") ? url : `https://${url}`).pathname.replace(/\/$/, "");
  const segments = path.split("/").filter(Boolean);
  // A profile URL is just /<username> with no sub-path like /p/ or /reel/
  if (segments.length === 1 && !["p", "reel", "reels", "stories", "explore", "accounts"].includes(segments[0])) {
    return true;
  }
  return false;
}

function extractUsername(url: string): string | null {
  try {
    const path = new URL(url.startsWith("http") ? url : `https://${url}`).pathname.replace(/\/$/, "");
    const segments = path.split("/").filter(Boolean);
    return segments[0] || null;
  } catch {
    return null;
  }
}

async function scrapeProfilePostUrls(username: string): Promise<string[]> {
  const seen = new Set<string>();
  const postUrls: string[] = [];

  function addShortcode(shortcode: string, type: string = "p") {
    if (!seen.has(shortcode) && shortcode.length >= 6) {
      seen.add(shortcode);
      postUrls.push(`https://www.instagram.com/${type}/${shortcode}/`);
    }
  }

  // Method 1: Instagram i-API (internal mobile API)
  try {
    const res = await fetch(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
      headers: {
        "User-Agent": "Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100; en_US; 458229237)",
        "X-IG-App-ID": "936619743392459",
      },
    });
    if (res.ok) {
      const data = await res.json();
      const edges = data.data?.user?.edge_owner_to_timeline_media?.edges || [];
      for (const edge of edges) {
        if (edge.node?.shortcode) addShortcode(edge.node.shortcode);
      }
    }
  } catch (e) {
    console.error("Instagram i-API failed:", e);
  }

  // Method 2: Instagram JSON API endpoint
  if (postUrls.length === 0) {
    try {
      const res = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username.=${username}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "X-IG-App-ID": "936619743392459",
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      if (res.ok) {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("json")) {
          const data = await res.json();
          const edges = data.data?.user?.edge_owner_to_timeline_media?.edges || [];
          for (const edge of edges) {
            if (edge.node?.shortcode) addShortcode(edge.node.shortcode);
          }
        }
      }
    } catch (e) {
      console.error("Instagram web API failed:", e);
    }
  }

  // Method 3: Direct Instagram page with shortcode extraction
  if (postUrls.length === 0) {
    try {
      const res = await fetch(`https://www.instagram.com/${username}/`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html",
          "Cookie": "ig_nrcb=1",
        },
        redirect: "follow",
      });
      if (res.ok) {
        const html = await res.text();
        // Extract shortcodes from any embedded JSON or links
        const patterns = [
          /\/(p|reel|reels)\/([A-Za-z0-9_-]{6,})/g,
          /"shortcode"\s*:\s*"([A-Za-z0-9_-]{6,})"/g,
        ];
        for (const regex of patterns) {
          let m;
          while ((m = regex.exec(html)) !== null) {
            const sc = m[2] || m[1];
            addShortcode(sc);
          }
        }
      }
    } catch (e) {
      console.error("Direct Instagram scrape failed:", e);
    }
  }

  console.log(`[Instagram] Found ${postUrls.length} posts for @${username}`);
  return postUrls;
}

// ─── yt-dlp direct download (most reliable) ────────────────────

async function ytDlpDownload(url: string): Promise<{ buffer: Buffer; caption?: string } | null> {
  const tempPath = path.join(tmpdir(), `ig-${Date.now()}-${Math.random().toString(36).slice(2,6)}.mp4`);
  try {
    await execFileAsync("yt-dlp", [
      "--no-playlist",
      "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
      "--merge-output-format", "mp4",
      "-o", tempPath,
      "--quiet",
      "--no-warnings",
      "--no-check-certificates",
      url,
    ], { timeout: 90000 });
    const buffer = await readFile(tempPath);
    await unlink(tempPath).catch(() => {});
    if (buffer.byteLength < 10000) return null;
    console.log("[yt-dlp] Success — %d bytes for %s", buffer.byteLength, url);
    return { buffer };
  } catch (e: any) {
    console.error("[yt-dlp] Failed:", e?.message?.split("\n")[0]);
    await unlink(tempPath).catch(() => {});
    return null;
  }
}

// ─── Video extraction (individual post) ──────────────────────────

async function extractInstagramVideo(
  url: string
): Promise<{ videoUrl: string; thumbnailUrl?: string; caption?: string } | null> {
  // Method 0: Cobalt API — reliable from cloud environments
  try {
    const cobaltRes = await fetch("https://api.cobalt.tools/", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ url, videoQuality: "max", downloadMode: "auto" }),
    });
    if (cobaltRes.ok) {
      const cobaltData = await cobaltRes.json();
      // Handle tunnel or redirect
      if ((cobaltData.status === "tunnel" || cobaltData.status === "redirect") && cobaltData.url) {
        console.log("[Instagram] Cobalt success for", url);
        return { videoUrl: cobaltData.url, caption: undefined };
      }
      // Handle picker (multiple quality options — take first video)
      if (cobaltData.status === "picker" && cobaltData.picker?.length > 0) {
        const videoItem = cobaltData.picker.find((p: any) => p.type === "video") || cobaltData.picker[0];
        if (videoItem?.url) {
          console.log("[Instagram] Cobalt picker success");
          return { videoUrl: videoItem.url, thumbnailUrl: videoItem.thumb, caption: undefined };
        }
      }
      console.log("[Instagram] Cobalt response:", cobaltData.status, cobaltData.error?.code);
    }
  } catch (e) {
    console.error("[Instagram] Cobalt failed:", e);
  }

  // Method 1: Page scraping with mobile UA
  try {
    const pageRes = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    if (pageRes.ok) {
      const html = await pageRes.text();
      const $ = cheerio.load(html);

      const ogVideo = $('meta[property="og:video"]').attr("content") ||
        $('meta[property="og:video:url"]').attr("content") ||
        $('meta[property="og:video:secure_url"]').attr("content");
      const ogImage = $('meta[property="og:image"]').attr("content");
      const ogTitle = $('meta[property="og:title"]').attr("content") || "";
      const ogDesc = $('meta[property="og:description"]').attr("content") || "";

      const caption = ogDesc || ogTitle;

      if (ogVideo) {
        return { videoUrl: ogVideo, thumbnailUrl: ogImage || undefined, caption };
      }

      // Parse embedded JSON
      let videoUrl: string | null = null;
      let thumbnail: string | null = null;
      let jsonCaption: string | null = null;

      $("script").each((_, script) => {
        const text = $(script).html() || "";
        const videoMatch = text.match(/"video_url"\s*:\s*"([^"]+)"/);
        if (videoMatch) {
          videoUrl = videoMatch[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/");
        }
        const thumbMatch = text.match(/"display_url"\s*:\s*"([^"]+)"/);
        if (thumbMatch && !thumbnail) {
          thumbnail = thumbMatch[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/");
        }
        const capMatch = text.match(/"text"\s*:\s*"([^"]{10,500})"/);
        if (capMatch && !jsonCaption) {
          jsonCaption = capMatch[1];
        }
      });

      if (videoUrl) {
        return { videoUrl, thumbnailUrl: thumbnail || ogImage || undefined, caption: jsonCaption || caption };
      }
    }
  } catch (e) {
    console.error("Method 1 failed:", e);
  }

  // Method 2: JSON endpoint
  try {
    const shortcode = extractShortcode(url);
    if (shortcode) {
      const apiUrl = `https://www.instagram.com/p/${shortcode}/?__a=1&__d=dis`;
      const apiRes = await fetch(apiUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
          "X-IG-App-ID": "936619743392459",
        },
      });

      if (apiRes.ok) {
        const ct = apiRes.headers.get("content-type") || "";
        if (ct.includes("json")) {
          const data = await apiRes.json();
          const item = data.graphql?.shortcode_media || data.items?.[0];
          if (item) {
            const videoUrl = item.video_url || item.video_versions?.[0]?.url;
            if (videoUrl) {
              return {
                videoUrl,
                thumbnailUrl: item.display_url || item.image_versions2?.candidates?.[0]?.url,
                caption: item.edge_media_to_caption?.edges?.[0]?.node?.text || item.caption?.text,
              };
            }
          }
        }
      }
    }
  } catch (e) {
    console.error("Method 2 failed:", e);
  }

  // Method 3: ddinstagram proxy
  try {
    const shortcode = extractShortcode(url);
    if (shortcode) {
      const ddUrl = `https://ddinstagram.com/p/${shortcode}`;
      const ddRes = await fetch(ddUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
        redirect: "follow",
      });
      if (ddRes.ok) {
        const html = await ddRes.text();
        const $ = cheerio.load(html);
        const videoSrc = $("video source").attr("src") || $("video").attr("src");
        const ogVideo = $('meta[property="og:video"]').attr("content");
        const ogDesc = $('meta[property="og:description"]').attr("content") || "";
        const poster = $("video").attr("poster") || $('meta[property="og:image"]').attr("content");
        const finalVideo = videoSrc || ogVideo;
        if (finalVideo) {
          return {
            videoUrl: finalVideo.startsWith("http") ? finalVideo : `https://ddinstagram.com${finalVideo}`,
            thumbnailUrl: poster || undefined,
            caption: ogDesc,
          };
        }
      }
    }
  } catch (e) {
    console.error("[Instagram] Method 3 (ddinstagram) failed:", e);
  }

  // Method 4: Instagram embed page (often bypasses login wall)
  try {
    const shortcode = extractShortcode(url);
    if (shortcode) {
      const embedRes = await fetch(`https://www.instagram.com/p/${shortcode}/embed/captioned/`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "text/html",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
      });
      if (embedRes.ok) {
        const html = await embedRes.text();
        const videoMatch = html.match(/"video_url"\s*:\s*"([^"]+)"/)
          || html.match(/src\s*=\s*"(https:\/\/[^"]+\.mp4[^"]*)"/i);
        const captionMatch = html.match(/"text"\s*:\s*"([^"]{10,400})"/);
        if (videoMatch) {
          const videoUrl = videoMatch[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/");
          return { videoUrl, caption: captionMatch?.[1] };
        }
      }
    }
  } catch (e) {
    console.error("[Instagram] Method 4 (embed) failed:", e);
  }

  console.log("[Instagram] All methods failed for", url);
  return null;
}

function extractShortcode(url: string): string | null {
  const match = url.match(/\/(p|reel|reels)\/([A-Za-z0-9_-]+)/);
  return match ? match[2] : null;
}
