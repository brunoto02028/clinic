/**
 * E2E test for the bilingual article flow (Puppeteer).
 *
 * Credentials are read from .env.test.local (gitignored) — NEVER hard-code them.
 *   ADMIN_EMAIL=admin@bpr.rehab
 *   ADMIN_PASSWORD=your-password
 *
 * Run:  TEST_URL=http://localhost:3000 node tests/e2e/articles-bilingual.test.js
 *
 * What it checks:
 *  1. AI generates the article in the SELECTED language (English) — the reported bug.
 *  2. Applying the article fills the English slot.
 *  3. The EN/PT "Editing language" toggle preserves each language's content.
 *  4. (optional) Translate EN->PT, save as DRAFT, verify both versions persisted, then DELETE.
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const BASE_URL = process.env.TEST_URL || "http://localhost:3000";

// ---- read .env.test.local ----
function readEnvFile() {
  const file = path.join(process.cwd(), ".env.test.local");
  if (!fs.existsSync(file)) {
    console.error("\n❌ Missing .env.test.local. Create it with:\n   ADMIN_EMAIL=admin@bpr.rehab\n   ADMIN_PASSWORD=...\n");
    process.exit(2);
  }
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

let pass = 0, fail = 0;
const ok = (label, cond) => { if (cond) { pass++; console.log("  ✓", label); } else { fail++; console.log("  ✗", label); } };

// Click the Nth (0-based) <button> whose text contains `text`
async function clickButtonByText(page, text, index = 0) {
  const clicked = await page.evaluate((text, index) => {
    const btns = Array.from(document.querySelectorAll("button")).filter(b => b.textContent.includes(text));
    if (btns[index]) { btns[index].click(); return true; }
    return false;
  }, text, index);
  if (!clicked) throw new Error(`Button containing "${text}" [#${index}] not found`);
}

function detectLanguage(text) {
  const t = (text || "").toLowerCase();
  const pt = ["você", "reabilitação", "saúde", " dor", " não ", "tornozelo", " você ", "recuperação", " com ", " para ", "exercícios"];
  const en = [" the ", " and ", " your ", "recovery", " pain", "health", " ankle", " with ", " for ", "exercises", "rehabilitation"];
  const score = (arr) => arr.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
  const ptScore = score(pt), enScore = score(en);
  return { lang: enScore >= ptScore ? "en" : "pt", enScore, ptScore };
}

(async () => {
  const env = readEnvFile();
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) { console.error("❌ ADMIN_EMAIL / ADMIN_PASSWORD missing in .env.test.local"); process.exit(2); }

  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  let createdSlug = null;

  try {
    console.log(`\n📍 ${BASE_URL}\n[1] Login`);
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle0" });
    await page.waitForSelector('input[name="email"]', { timeout: 15000 });
    await page.type('input[name="email"]', env.ADMIN_EMAIL);
    await page.type('input[name="password"]', env.ADMIN_PASSWORD);
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0", timeout: 30000 }),
      page.click('button[type="submit"]'),
    ]);
    ok("logged in (left /login)", !page.url().endsWith("/login"));

    console.log("[2] Open New Article + select English (UK)");
    await page.goto(`${BASE_URL}/admin/articles/new`, { waitUntil: "networkidle0" });
    await page.waitForSelector('input[placeholder^="Tell the AI"]', { timeout: 15000 });
    await clickButtonByText(page, "English (UK)");

    console.log("[3] Ask AI to write an article (English)");
    await page.type('input[placeholder^="Tell the AI"]', "Write a short article about ankle sprain recovery. Generate the full article now.");
    await page.keyboard.press("Enter");

    console.log("    waiting for AI (up to 120s)...");
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("Apply to Form")),
      { timeout: 120000 }
    );
    ok("AI returned an article", true);

    console.log("[4] Apply to form");
    await clickButtonByText(page, "Apply to Form");
    await page.waitForFunction(() => document.querySelector("#title") && document.querySelector("#title").value.length > 0, { timeout: 15000 });

    const enTitle = await page.$eval("#title", el => el.value);
    const enExcerpt = await page.$eval("#excerpt", el => el.value).catch(() => "");
    const enBody = await page.$eval(".ql-editor", el => el.innerText).catch(() => "");
    const det = detectLanguage(`${enTitle} ${enExcerpt} ${enBody}`);
    console.log(`    title: "${enTitle}"`);
    console.log(`    lang detection -> ${det.lang} (en:${det.enScore} pt:${det.ptScore})`);
    ok("generated article is in ENGLISH (selected language)", det.lang === "en");

    console.log("[5] Editing-language toggle preserves content");
    // Editing toggle is the FIRST pair of flag buttons (publish selector is the second)
    await clickButtonByText(page, "Português", 0);
    await new Promise(r => setTimeout(r, 400));
    const ptSlotTitle = await page.$eval("#title", el => el.value);
    ok("switching to PT shows empty PT slot", ptSlotTitle === "");
    await clickButtonByText(page, "English", 0);
    await new Promise(r => setTimeout(r, 400));
    const restored = await page.$eval("#title", el => el.value);
    ok("switching back to EN restores English content", restored === enTitle);

    console.log("[6] Translate EN->PT, then save as DRAFT");
    await clickButtonByText(page, "→ PT-BR");
    console.log("    waiting for translation (up to 90s)...");
    await page.waitForFunction(
      (orig) => { const el = document.querySelector("#title"); return el && el.value.length > 0 && el.value !== orig; },
      { timeout: 90000 }, enTitle
    );
    const ptTitle = await page.$eval("#title", el => el.value);
    const ptDet = detectLanguage(ptTitle + " " + await page.$eval(".ql-editor", el => el.innerText).catch(() => ""));
    console.log(`    PT title: "${ptTitle}" -> ${ptDet.lang}`);
    ok("translation produced Portuguese", ptDet.lang === "pt");

    // Ensure NOT published (draft). The publish checkbox should be unchecked by default.
    await clickButtonByText(page, "Save Article");
    await page.waitForFunction(() => location.pathname === "/admin/articles", { timeout: 20000 });
    ok("saved and redirected to /admin/articles", true);

    // Derive slug from the EN title (primary = publishLanguage en)
    createdSlug = enTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    console.log(`    created slug (expected): ${createdSlug}`);
  } catch (err) {
    fail++;
    console.error("\n💥 ERROR:", err.message);
  } finally {
    await browser.close();
  }

  // ---- DB verification + cleanup (uses production DATABASE_URL) ----
  if (createdSlug) {
    try {
      const { PrismaClient } = require("@prisma/client");
      const prisma = new PrismaClient();
      const a = await prisma.article.findFirst({ where: { slug: createdSlug }, orderBy: { createdAt: "desc" } });
      if (a) {
        console.log("\n[7] DB verification");
        ok("article persisted", true);
        ok("publishLanguage = en", a.publishLanguage === "en");
        ok("titleEn present", !!a.titleEn);
        ok("titlePt present (translation)", !!a.titlePt);
        ok("draft (not published)", a.published === false);
        console.log("[8] Cleanup — deleting test article");
        await prisma.article.delete({ where: { id: a.id } });
        ok("test article deleted", true);
      } else {
        console.log("\n[7] DB verification: article not found by slug (skipping cleanup)");
        fail++;
      }
      await prisma.$disconnect();
    } catch (e) {
      console.error("DB verification error:", e.message);
    }
  }

  console.log(`\nRESULT: ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
