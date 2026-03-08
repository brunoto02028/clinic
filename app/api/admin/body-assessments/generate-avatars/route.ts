import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { generateImage } from "@/lib/ai-provider";
import { writeFile, mkdir, access } from "fs/promises";
import path from "path";

const VALID_KEYS = ["male-front", "male-back", "female-front", "female-back"];

const AVATAR_CONFIGS = [
  {
    key: "male-front",
    prompt: `Full-body anatomical illustration of the male muscular system, ANTERIOR (front) view.
Dark navy/black background. Photorealistic medical illustration style.
Show ALL major muscle groups in rich red/pink tones with visible muscle fiber striations:
- Face muscles, sternocleidomastoid, scalenes
- Pectoralis major and minor, anterior deltoids, biceps brachii, brachialis
- Rectus abdominis with tendinous intersections, external obliques, serratus anterior
- Hip flexors, adductors, quadriceps (rectus femoris, vastus lateralis, vastus medialis, vastus intermedius)
- Tibialis anterior, extensor digitorum longus, peroneus longus
- Forearm flexors, hand muscles
White tendons and ligaments visible. Bones/skeletal landmarks visible at joints (wrists, knees, ankles, fingers).
Standing in neutral anatomical position, arms slightly away from body.
Professional medical atlas quality. No text, no labels, no watermarks.`,
  },
  {
    key: "male-back",
    prompt: `Full-body anatomical illustration of the male muscular system, POSTERIOR (back) view.
Dark navy/black background. Photorealistic medical illustration style.
Show ALL major muscle groups in rich red/pink tones with visible muscle fiber striations:
- Occipitalis, splenius capitis, upper/middle/lower trapezius
- Posterior deltoids, infraspinatus, teres major/minor, rhomboids
- Latissimus dorsi (large V-shape), erector spinae group
- Triceps brachii, forearm extensors
- Gluteus maximus, gluteus medius, piriformis
- Hamstrings (biceps femoris, semitendinosus, semimembranosus)
- Gastrocnemius, soleus, Achilles tendon
- Plantar muscles of feet
White tendons and ligaments visible. Bones visible at joints.
Standing in neutral anatomical position, arms slightly away from body.
Professional medical atlas quality. No text, no labels, no watermarks.`,
  },
  {
    key: "female-front",
    prompt: `Full-body anatomical illustration of the FEMALE muscular system, ANTERIOR (front) view.
Dark navy/black background. Photorealistic medical illustration style.
Female proportions: wider hips, narrower shoulders, breast tissue (mammary glands shown anatomically).
Show ALL major muscle groups in rich red/pink tones with visible muscle fiber striations:
- Face muscles, sternocleidomastoid, scalenes
- Pectoralis major (with mammary gland overlay), anterior deltoids, biceps brachii
- Rectus abdominis with tendinous intersections, external obliques, serratus anterior
- Hip flexors, adductors, quadriceps
- Tibialis anterior, peroneus longus
- Forearm flexors, hand muscles
White tendons and ligaments visible. Bones visible at joints.
Standing in neutral anatomical position. Female body proportions.
Professional medical atlas quality. No text, no labels, no watermarks.`,
  },
  {
    key: "female-back",
    prompt: `Full-body anatomical illustration of the FEMALE muscular system, POSTERIOR (back) view.
Dark navy/black background. Photorealistic medical illustration style.
Female proportions: wider hips, narrower shoulders.
Show ALL major muscle groups in rich red/pink tones with visible muscle fiber striations:
- Occipitalis, splenius capitis, upper/middle/lower trapezius
- Posterior deltoids, infraspinatus, teres major/minor, rhomboids
- Latissimus dorsi, erector spinae group
- Triceps brachii, forearm extensors
- Gluteus maximus (female proportions), gluteus medius, piriformis
- Hamstrings (biceps femoris, semitendinosus, semimembranosus)
- Gastrocnemius, soleus, Achilles tendon
White tendons and ligaments visible. Bones visible at joints.
Standing in neutral anatomical position. Female body proportions.
Professional medical atlas quality. No text, no labels, no watermarks.`,
  },
];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const forceRegenerate = body.forceRegenerate === true;

  const baseUploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
  const avatarsDir = path.join(baseUploadsDir, "avatars");
  await mkdir(avatarsDir, { recursive: true });

  const results: Record<string, string> = {};
  const errors: string[] = [];

  for (const config of AVATAR_CONFIGS) {
    const filePath = path.join(avatarsDir, `${config.key}.png`);
    const publicUrl = `/uploads/avatars/${config.key}.png`;

    // Skip if already exists (unless force regenerate)
    if (!forceRegenerate) {
      try {
        await access(filePath);
        results[config.key] = publicUrl;
        continue;
      } catch {
        // File doesn't exist, generate it
      }
    }

    try {
      console.log(`[generate-avatars] Generating ${config.key}...`);
      const urls = await generateImage(config.prompt, { numImages: 1 });

      if (urls.length > 0) {
        const url = urls[0];
        let imageBuffer: Buffer | null = null;

        if (url.startsWith("data:image")) {
          const match = url.match(/^data:image\/\w+;base64,(.+)$/);
          if (match) imageBuffer = Buffer.from(match[1], "base64");
        } else if (url.startsWith("http")) {
          const imgRes = await fetch(url);
          if (imgRes.ok) imageBuffer = Buffer.from(await imgRes.arrayBuffer());
        }

        if (imageBuffer) {
          await writeFile(filePath, new Uint8Array(imageBuffer));
          results[config.key] = publicUrl;
          console.log(`[generate-avatars] ✓ ${config.key} saved`);
        } else {
          errors.push(`${config.key}: Failed to decode image`);
        }
      } else {
        errors.push(`${config.key}: No image returned`);
      }
    } catch (err: any) {
      errors.push(`${config.key}: ${err.message}`);
      console.error(`[generate-avatars] Error generating ${config.key}:`, err.message);
    }

    // Rate limit delay between generations
    await new Promise((r) => setTimeout(r, 2000));
  }

  return NextResponse.json({
    success: errors.length === 0,
    results,
    errors: errors.length > 0 ? errors : undefined,
    message: `Generated ${Object.keys(results).length}/4 avatars${errors.length > 0 ? `. Errors: ${errors.join("; ")}` : ""}`,
  });
}

// GET - Check which avatars exist (public for patient access too)
export async function GET(req: NextRequest) {
  const baseUploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
  const avatarsDir = path.join(baseUploadsDir, "avatars");

  const results: Record<string, string | null> = {};
  for (const key of VALID_KEYS) {
    const filePath = path.join(avatarsDir, `${key}.png`);
    try {
      await access(filePath);
      results[key] = `/uploads/avatars/${key}.png?t=${Date.now()}`;
    } catch {
      results[key] = null;
    }
  }

  return NextResponse.json(results);
}

// PUT - Upload a custom avatar image
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const key = formData.get("key") as string;
    const file = formData.get("file") as File;

    if (!key || !VALID_KEYS.includes(key)) {
      return NextResponse.json({ error: `Invalid key. Must be one of: ${VALID_KEYS.join(", ")}` }, { status: 400 });
    }
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const baseUploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
    const avatarsDir = path.join(baseUploadsDir, "avatars");
    await mkdir(avatarsDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const filePath = path.join(avatarsDir, `${key}.png`);

    // If uploaded file is not PNG, save with original extension too
    if (ext !== "png") {
      // Save original
      await writeFile(path.join(avatarsDir, `${key}.${ext}`), new Uint8Array(buffer));
    }
    // Always save as .png for consistency
    await writeFile(filePath, new Uint8Array(buffer));

    const publicUrl = `/uploads/avatars/${key}.png?t=${Date.now()}`;
    console.log(`[avatar-upload] ✓ ${key} uploaded (${(buffer.length / 1024).toFixed(0)}KB)`);

    return NextResponse.json({ success: true, key, url: publicUrl });
  } catch (err: any) {
    console.error("[avatar-upload] Error:", err.message);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
