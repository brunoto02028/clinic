// Activity 18 phase 2 (T-7/T-9) — SCAFFOLD, GUARDED.
// Generates ORIGINAL exercise illustrations via the same image pipeline the app
// already uses (OpenAI DALL·E 3, image key from SystemConfig). Never uses any
// third-party asset. Style: clean educational medical illustration, brand palette.
//
// SAFETY: does NOTHING costly by default. Without `--go` it only DRY-RUNS
// (prints the prompts + target files). `--go` requires an OpenAI key configured;
// only then does it call the paid API and write files. This is a scaffold left
// ready for when Bruno approves the style + cost — do not run `--go` before then.
//
// Usage:
//   node scripts/generate-exercise-illustrations.cjs           # dry-run (free)
//   node scripts/generate-exercise-illustrations.cjs --go       # generates (paid)
const fs = require("fs");
const path = require("path");

// Brand + style baked into every prompt so the set stays consistent.
const STYLE =
  "clean modern educational medical illustration, flat vector style, simple human figure demonstrating the exercise, neutral studio background, soft sage-green (#4F7361) and warm-neutral palette, clear and instructional, no text, no logos, no watermark, professional physiotherapy teaching aid";

// Starter list — expand per T-8 batches. slug -> exercise topic.
const EXERCISES = [
  { slug: "shoulder-external-rotation", topic: "shoulder external rotation with a resistance band, elbow tucked at the side, front view" },
  { slug: "calf-heel-raise", topic: "standing calf heel raise on a step, side view, slow tempo" },
  { slug: "sit-to-stand", topic: "sit-to-stand from a chair, side view, knees tracking over feet" },
];

function buildPrompt(topic) {
  return `${topic}. ${STYLE}.`;
}

const GO = process.argv.includes("--go");
const OUT_DIR = path.join(__dirname, "..", "public", "images", "kit", "exercises");

async function getOpenAIKey() {
  // key lives in SystemConfig (prod DB); reuse the app's convention.
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  try {
    if (!process.env.DATABASE_URL) {
      for (const line of fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8").split(/\r?\n/)) {
        const m = line.match(/^\s*DATABASE_URL\s*=\s*"?([^"]+?)"?\s*$/);
        if (m) { process.env.DATABASE_URL = m[1]; break; }
      }
    }
    const { PrismaClient } = require("@prisma/client");
    const p = new PrismaClient();
    const row = await p.systemConfig.findUnique({ where: { key: "OPENAI_API_KEY" } }).catch(() => null);
    await p.$disconnect();
    return row?.value || null;
  } catch {
    return null;
  }
}

(async () => {
  console.log(`\n${GO ? "GENERATE (paid)" : "DRY-RUN (free)"} — ${EXERCISES.length} exercise illustration(s)\n`);
  for (const ex of EXERCISES) {
    const prompt = buildPrompt(ex.topic);
    const outFile = path.join(OUT_DIR, `${ex.slug}.png`);
    console.log(`• ${ex.slug}.png`);
    console.log(`  prompt: ${prompt}`);
    if (!GO) continue;

    const key = await getOpenAIKey();
    if (!key) { console.log("  SKIP: no OPENAI_API_KEY configured"); continue; }
    try {
      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: "dall-e-3", prompt, n: 1, size: "1024x1024", quality: "hd", response_format: "b64_json" }),
      });
      const data = await res.json();
      const b64 = data?.data?.[0]?.b64_json;
      if (!b64) { console.log("  ERROR:", JSON.stringify(data).slice(0, 200)); continue; }
      fs.mkdirSync(OUT_DIR, { recursive: true });
      fs.writeFileSync(outFile, Buffer.from(b64, "base64"));
      console.log(`  saved -> public/images/kit/exercises/${ex.slug}.png`);
    } catch (e) {
      console.log("  ERROR:", e.message);
    }
  }
  if (!GO) console.log(`\n(No files written. Re-run with --go once style + cost are approved.)`);
})();
