const puppeteer = require("puppeteer");
const BASE = "https://bpr.rehab";

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 950 });

  try {
    // 1. Login
    console.log("1. Login...");
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle2", timeout: 30000 });
    await page.waitForSelector("#email", { timeout: 10000 });
    await page.type("#email", "admin@bpr.rehab");
    await page.type("#password", "Bruno@Admin2026!");
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 8000));
    console.log("   OK:", page.url());

    // 2. Scans page
    console.log("2. /admin/scans...");
    await page.goto(`${BASE}/admin/scans`, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 3000));

    // 3. Click FS-DEMO eye button
    console.log("3. Open FS-DEMO-00001...");
    await page.evaluate(() => {
      const all = document.querySelectorAll("*");
      for (const el of all) {
        if (el.children.length === 0 && el.textContent === "FS-DEMO-00001") {
          let row = el.closest("[class*='rounded']") || el.parentElement?.parentElement?.parentElement;
          if (row) {
            const btn = row.querySelector("button");
            if (btn) { btn.click(); return; }
          }
        }
      }
    });

    // Wait for dialog
    await page.waitForFunction(() => document.querySelector('[role="dialog"]'), { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 1500));

    // Helper: click tab by text inside dialog
    async function clickDialogTab(text) {
      await page.evaluate((t) => {
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return;
        const tabs = dialog.querySelectorAll('[role="tab"]');
        for (const tab of tabs) {
          if (tab.textContent?.trim() === t) { tab.click(); return; }
        }
      }, text);
      await new Promise((r) => setTimeout(r, 1500));
    }

    // Helper: scroll dialog
    async function scrollDialog(top) {
      await page.evaluate((t) => {
        const el = document.querySelector('[role="dialog"]')?.closest('[class*="overflow"]') ||
          document.querySelector('[class*="DialogContent"]') ||
          document.querySelector('[role="dialog"]');
        if (el) el.scrollTop = t;
      }, top);
      await new Promise((r) => setTimeout(r, 400));
    }

    // ── Screenshot: Overview tab ──
    await page.screenshot({ path: "report-01-overview.png", fullPage: true });
    console.log("   ✅ Overview");

    // ── Images & 3D tab ──
    console.log("4. Images & 3D...");
    await clickDialogTab("Images & 3D");
    await page.screenshot({ path: "report-02-images.png", fullPage: true });
    await scrollDialog(400);
    await page.screenshot({ path: "report-02b-images-scroll.png", fullPage: true });
    console.log("   ✅ Images & 3D");

    // ── Analysis tab ──
    console.log("5. Analysis...");
    await clickDialogTab("Analysis");
    await scrollDialog(0);
    await page.screenshot({ path: "report-03-analysis.png", fullPage: true });
    await scrollDialog(500);
    await page.screenshot({ path: "report-03b-analysis-scroll.png", fullPage: true });
    console.log("   ✅ Analysis");

    // ── Recommendations tab ──
    console.log("6. Recommendations...");
    await clickDialogTab("Recommendations");
    await scrollDialog(0);
    await page.screenshot({ path: "report-04-recommendations.png", fullPage: true });
    await scrollDialog(500);
    await page.screenshot({ path: "report-04b-recommendations-scroll.png", fullPage: true });
    console.log("   ✅ Recommendations");

    // ── Actions tab ──
    console.log("7. Actions...");
    await clickDialogTab("Actions");
    await scrollDialog(0);
    await page.screenshot({ path: "report-05-actions.png", fullPage: true });
    console.log("   ✅ Actions");

    // ── Click "Gerar Report PDF" ──
    console.log("8. Generate Report...");
    const reportClicked = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return "no dialog";
      const btns = dialog.querySelectorAll("button");
      for (const b of btns) {
        if (b.textContent?.includes("Gerar Report") || b.textContent?.includes("Generate Report")) {
          b.click(); return "clicked: " + b.textContent.trim();
        }
      }
      // List all buttons for debug
      return "not found. Btns: " + Array.from(btns).map(b => b.textContent?.trim().substring(0, 30)).join(" | ");
    });
    console.log("  ", reportClicked);
    await new Promise((r) => setTimeout(r, 4000));
    await page.screenshot({ path: "report-06-generated.png", fullPage: true });
    await scrollDialog(500);
    await page.screenshot({ path: "report-06b-generated-scroll.png", fullPage: true });
    await scrollDialog(1000);
    await page.screenshot({ path: "report-06c-generated-scroll2.png", fullPage: true });
    await scrollDialog(1500);
    await page.screenshot({ path: "report-06d-generated-scroll3.png", fullPage: true });

    console.log("\n✅ All screenshots saved!");
  } catch (err) {
    console.error("Error:", err.message);
    await page.screenshot({ path: "report-error.png", fullPage: true });
  } finally {
    await browser.close();
  }
})();
