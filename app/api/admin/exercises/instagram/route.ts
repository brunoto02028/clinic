import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import * as cheerio from "cheerio";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min for large profile downloads

// ─── Body region keywords (PT-BR + EN) ──────────────────────────
const BODY_REGION_KEYWORDS: Record<string, string[]> = {
  SHOULDER: ["shoulder", "ombro", "deltoid", "deltóide", "rotator cuff", "manguito rotador", "supraespinhoso", "infraespinhoso"],
  ELBOW: ["elbow", "cotovelo", "epicondylitis", "epicondilite", "tennis elbow"],
  WRIST_HAND: ["wrist", "punho", "hand", "mão", "carpal", "finger", "dedo", "grip"],
  HIP: ["hip", "quadril", "glute", "glúteo", "gluteo", "piriformis", "piriforme", "adductor", "adutor"],
  KNEE: ["knee", "joelho", "patella", "patela", "menisco", "meniscus", "acl", "lca", "pcl"],
  ANKLE_FOOT: ["ankle", "tornozelo", "foot", "pé", "pe ", "plantar", "achilles", "aquiles", "calf", "panturrilha"],
  SPINE_BACK: ["spine", "coluna", "back", "costas", "lombar", "lumbar", "thoracic", "torácica", "disc", "disco", "hernia", "hérnia"],
  NECK_CERVICAL: ["neck", "pescoço", "cervical", "cervicalgia", "trap", "trapézio", "trapezio"],
  CORE_ABDOMEN: ["core", "abdomen", "abdominal", "abs", "plank", "prancha", "oblique", "oblíquo"],
  STRETCHING: ["stretch", "alongamento", "flexibility", "flexibilidade", "mobilidade", "mobility"],
  MUSCLE_INJURY: ["injury", "lesão", "lesao", "strain", "distensão", "rupture", "ruptura", "recovery", "recuperação"],
  FULL_BODY: ["full body", "corpo inteiro", "total body", "funcional", "functional", "circuit", "circuito"],
};

function detectBodyRegion(caption: string): string {
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

    const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
    const exercisesDir = path.join(uploadsDir, "exercises");
    await mkdir(exercisesDir, { recursive: true });

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
        const videoData = await extractInstagramVideo(postUrl);

        if (!videoData) {
          // Not a video post — skip silently (photos are common)
          continue;
        }

        // Download the video
        const videoRes = await fetch(videoData.videoUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://www.instagram.com/",
          },
        });

        if (!videoRes.ok) {
          results.push({ url: postUrl, success: false, error: "Failed to download video" });
          continue;
        }

        const videoBuffer = await videoRes.arrayBuffer();
        // Skip very small files (likely errors)
        if (videoBuffer.byteLength < 10000) {
          results.push({ url: postUrl, success: false, error: "Downloaded file too small — likely not a video" });
          continue;
        }

        const filename = `ig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`;
        const filePath = path.join(exercisesDir, filename);
        await writeFile(filePath, new Uint8Array(videoBuffer));

        const videoUrl = `/uploads/exercises/${filename}`;
        const fileSize = videoBuffer.byteLength;

        // Download thumbnail
        let thumbnailUrl: string | null = null;
        if (videoData.thumbnailUrl) {
          try {
            const thumbRes = await fetch(videoData.thumbnailUrl, {
              headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.instagram.com/" },
            });
            if (thumbRes.ok) {
              const thumbBuffer = await thumbRes.arrayBuffer();
              const thumbFilename = `ig-thumb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`;
              const thumbPath = path.join(exercisesDir, thumbFilename);
              await writeFile(thumbPath, new Uint8Array(thumbBuffer));
              thumbnailUrl = `/uploads/exercises/${thumbFilename}`;
            }
          } catch {}
        }

        // Auto-detect body region from caption
        const bodyRegion = detectBodyRegion(videoData.caption || "");
        const regionLabel = BODY_REGION_KEYWORDS[bodyRegion] ? bodyRegion : "OTHER";

        // Create exercise — no text from Instagram, only body region
        const exercise = await prisma.exercise.create({
          data: {
            name: `Exercise ${exerciseCounter}`,
            description: null,
            bodyRegion: regionLabel as any,
            difficulty: "INTERMEDIATE",
            videoUrl,
            videoFileName: filename,
            thumbnailUrl,
            isActive: true,
            clinicId,
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

// ─── Video extraction (individual post) ──────────────────────────

async function extractInstagramVideo(
  url: string
): Promise<{ videoUrl: string; thumbnailUrl?: string; caption?: string } | null> {
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
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        },
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
    console.error("Method 3 failed:", e);
  }

  return null;
}

function extractShortcode(url: string): string | null {
  const match = url.match(/\/(p|reel|reels)\/([A-Za-z0-9_-]+)/);
  return match ? match[2] : null;
}
