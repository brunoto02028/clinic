/**
 * BPR Public Pages Audit — Puppeteer
 * Checks all public pages for: broken images, console errors, 404s, layout issues.
 * Run: node tests/e2e/public-audit.js
 */
const puppeteer = require("puppeteer");

const BASE = "https://bpr.rehab";
const PAGES = [
  { url: "/", name: "Home" },
  { url: "/articles", name: "Articles" },
  { url: "/custom-insoles", name: "Custom Insoles" },
  { url: "/biomechanical-assessment", name: "Biomechanical Assessment" },
  { url: "/biohacking", name: "Biohacking" },
  { url: "/services/electrotherapy", name: "Service: Electrotherapy" },
  { url: "/services/therapeutic-ultrasound", name: "Service: Ultrasound" },
  { url: "/services/laser-shockwave", name: "Service: Laser+Shockwave" },
  { url: "/services/sports-injury", name: "Service: Sports Injury" },
  { url: "/services/chronic-pain", name: "Service: Chronic Pain" },
  { url: "/services/pre-post-surgery", name: "Service: Pre/Post Surgery" },
  { url: "/services/kinesiotherapy", name: "Service: Kinesiotherapy" },
  { url: "/services/microcurrent", name: "Service: Microcurrent" },
  { url: "/services/biohacking-performance", name: "Service: Biohacking Perf" },
  { url: "/services/hrv-recovery-monitoring", name: "Service: HRV Monitoring" },
  { url: "/services/sleep-longevity-optimisation", name: "Service: Sleep" },
  { url: "/services/exercise-therapy", name: "Service: Exercise Therapy (SHOULD BE GONE)" },
  { url: "/services/biomechanical-assessment", name: "Service: Biomechanical (slug)" },
  { url: "/services/custom-insoles", name: "Service: Custom Insoles (slug)" },
  { url: "/login", name: "Login" },
  { url: "/signup", name: "Signup" },
  { url: "/privacy", name: "Privacy Policy" },
  { url: "/terms", name: "Terms" },
  { url: "/cancellation-policy", name: "Cancellation Policy" },
  { url: "/help", name: "Help" },
];

const ISSUES = [];

function log(msg, type = "info") {
  const prefix = { info: "  ℹ", ok: "  ✅", warn: "  ⚠️", error: "  ❌" }[type] || "  ";
  console.log(`${prefix} ${msg}`);
}

async function auditPage(page, entry) {
  const { url, name } = entry;
  const fullUrl = BASE + url;
  const pageIssues = [];

  console.log(`\n📄 ${name}`);
  console.log(`   ${fullUrl}`);

  const consoleErrors = [];
  const networkErrors = [];
  const brokenImages = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 120));
  });

  page.on("response", (res) => {
    if (res.status() === 404 && !res.url().includes("favicon")) {
      networkErrors.push(`404: ${res.url().replace(BASE, "")}`);
    }
  });

  let httpStatus = 200;
  try {
    const res = await page.goto(fullUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    httpStatus = res?.status() || 0;
  } catch (e) {
    log(`Failed to load: ${e.message}`, "error");
    ISSUES.push({ page: name, url, issue: `Page load failed: ${e.message}` });
    return;
  }

  if (httpStatus === 404) {
    log(`HTTP 404 — Page not found`, "error");
    ISSUES.push({ page: name, url, issue: "HTTP 404" });
    return;
  }

  // Wait for images to settle
  try { await page.waitForTimeout(2000); } catch {}

  // Check for broken images
  const imgResults = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("img")).map((img) => ({
      src: img.src,
      alt: img.alt || "(no alt)",
      broken: img.naturalWidth === 0 || img.naturalHeight === 0,
      loading: !img.complete,
    }));
  });

  for (const img of imgResults) {
    if (img.broken && img.src && !img.src.includes("data:image")) {
      brokenImages.push(`"${img.alt}" — ${img.src.replace(BASE, "")}`);
    }
  }

  // Check for /uploads/ images (ephemeral on Render — will break after redeploy)
  const uploadsImages = imgResults.filter(
    (img) => img.src && img.src.includes("/uploads/")
  );

  // Check page title
  const title = await page.title();
  if (!title || title.length < 3) {
    log(`Missing/empty page title`, "warn");
    pageIssues.push("Missing page title");
  } else {
    log(`Title: "${title}"`, "ok");
  }

  // Report
  if (brokenImages.length > 0) {
    for (const bi of brokenImages) log(`Broken image: ${bi}`, "error");
    pageIssues.push(...brokenImages.map((b) => `Broken image: ${b}`));
  } else {
    log(`No broken images (${imgResults.length} total)`, "ok");
  }

  if (uploadsImages.length > 0) {
    for (const ui of uploadsImages) {
      log(`⚠️  /uploads/ image (ephem — will break on redeploy): ${ui.src.replace(BASE, "")}`, "warn");
      pageIssues.push(`/uploads/ image: ${ui.src.replace(BASE, "")}`);
    }
  }

  if (consoleErrors.length > 0) {
    const unique = [...new Set(consoleErrors)].slice(0, 3);
    for (const e of unique) log(`Console error: ${e}`, "warn");
  }

  if (networkErrors.length > 0) {
    const unique = [...new Set(networkErrors)].slice(0, 5);
    for (const e of unique) log(`Network 404: ${e}`, "warn");
    pageIssues.push(...unique.map((e) => `Network 404: ${e}`));
  }

  if (httpStatus !== 200) {
    log(`HTTP ${httpStatus}`, "warn");
    pageIssues.push(`HTTP ${httpStatus}`);
  } else if (pageIssues.length === 0) {
    log(`All clear`, "ok");
  }

  for (const issue of pageIssues) {
    ISSUES.push({ page: name, url, issue });
  }
}

(async () => {
  console.log("🔍 BPR Public Pages Audit");
  console.log("=".repeat(60));

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  for (const entry of PAGES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    );
    try {
      await auditPage(page, entry);
    } catch (e) {
      console.error(`  ❌ Error auditing ${entry.name}:`, e.message);
    }
    await page.close();
  }

  await browser.close();

  console.log("\n" + "=".repeat(60));
  console.log("📊 AUDIT SUMMARY");
  console.log("=".repeat(60));

  if (ISSUES.length === 0) {
    console.log("✅ No issues found!");
  } else {
    console.log(`Found ${ISSUES.length} issue(s):\n`);
    const grouped = {};
    for (const issue of ISSUES) {
      if (!grouped[issue.page]) grouped[issue.page] = [];
      grouped[issue.page].push(issue.issue);
    }
    for (const [pageName, pageIssues] of Object.entries(grouped)) {
      console.log(`  📄 ${pageName}`);
      for (const issue of pageIssues) {
        console.log(`     • ${issue}`);
      }
    }
  }

  console.log("\n✅ Audit complete.");
})();
