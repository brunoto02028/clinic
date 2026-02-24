const puppeteer = require("puppeteer");

const BASE = "https://bpr.rehab";

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  // Collect console errors
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  try {
    // 1. Login
    console.log("1. Logging in...");
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle2", timeout: 30000 });
    await page.waitForSelector('#email', { timeout: 10000 });
    await page.type('#email', "admin@bpr.rehab");
    await page.type('#password', "Bruno@Admin2026!");
    await page.click('button[type="submit"]');
    // Wait for redirect (uses window.location.href, not SPA navigation)
    await new Promise((r) => setTimeout(r, 8000));
    console.log("   ✅ Logged in, URL:", page.url());

    // 2. Navigate to Foot Scans
    console.log("2. Navigating to Admin Scans...");
    await page.goto(`${BASE}/admin/scans`, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 3000));
    await page.screenshot({ path: "screenshot-01-scans-list.png", fullPage: true });
    console.log("   ✅ Screenshot: scans list");

    // 3. Click the demo scan eye button
    console.log("3. Opening FS-DEMO-00001...");
    await page.evaluate(() => {
      const items = document.querySelectorAll('[class*="card"], [class*="Card"], tr, div');
      for (const el of items) {
        if (el.textContent && el.textContent.includes('FS-DEMO-00001')) {
          const btn = el.querySelector('button, [role="button"]');
          if (btn) { btn.click(); return; }
          el.click(); return;
        }
      }
    });
    await new Promise((r) => setTimeout(r, 2500));
    await page.screenshot({ path: "screenshot-02-overview.png", fullPage: true });
    console.log("   ✅ Tab: Overview");

    // Helper to click a tab by its value attribute inside the dialog
    async function clickTab(tabValue) {
      const clicked = await page.evaluate((val) => {
        // Find TabsTrigger inside the dialog content
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return 'no dialog';
        const triggers = dialog.querySelectorAll('button[role="tab"], [data-state]');
        for (const t of triggers) {
          const dv = t.getAttribute('data-value') || t.getAttribute('value') || '';
          const txt = t.textContent?.trim().toLowerCase() || '';
          if (dv === val || txt.includes(val.toLowerCase())) {
            t.click(); return 'clicked: ' + txt;
          }
        }
        // Fallback: find by text in any button inside dialog
        const btns = dialog.querySelectorAll('button');
        for (const b of btns) {
          if (b.textContent?.trim().toLowerCase().includes(val.toLowerCase())) {
            b.click(); return 'fallback clicked: ' + b.textContent.trim();
          }
        }
        return 'not found: ' + val;
      }, tabValue);
      console.log('     Tab click result:', clicked);
      await new Promise((r) => setTimeout(r, 2000));
    }

    // 4. Images & 3D tab
    console.log("4. Tab: Images & 3D...");
    await clickTab('images3d');
    await page.screenshot({ path: "screenshot-03-images-3d.png", fullPage: true });
    console.log("   ✅ Tab: Images & 3D");

    // Scroll dialog to see 3D viewer
    await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (dialog) dialog.scrollTop = 400;
    });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: "screenshot-03b-images-scroll.png", fullPage: true });

    // 5. Analysis tab
    console.log("5. Tab: Analysis...");
    await clickTab('analysis');
    await page.screenshot({ path: "screenshot-04-analysis.png", fullPage: true });
    console.log("   ✅ Tab: Analysis");

    // Scroll dialog
    await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (dialog) dialog.scrollTop = 500;
    });
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: "screenshot-04b-analysis-scroll.png", fullPage: true });

    // 6. Recommendations tab
    console.log("6. Tab: Recommendations...");
    await clickTab('recommendations');
    await page.screenshot({ path: "screenshot-05-recommendations.png", fullPage: true });
    console.log("   ✅ Tab: Recommendations");

    // Scroll recommendations
    await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (dialog) dialog.scrollTop = 500;
    });
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: "screenshot-05b-recommendations-scroll.png", fullPage: true });

    // 7. Actions tab
    console.log("7. Tab: Actions...");
    await clickTab('actions');
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: "screenshot-06-actions.png", fullPage: true });
    console.log("   ✅ Tab: Actions");

    // 8. Click Generate Report button inside dialog
    console.log("8. Looking for Report button inside dialog...");
    const reportResult = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return 'no dialog';
      const buttons = dialog.querySelectorAll('button');
      for (const btn of buttons) {
        const text = btn.textContent?.toLowerCase() || '';
        if (text.includes('report') || text.includes('relat')) {
          btn.click(); return text.trim();
        }
      }
      return 'not found in dialog';
    });
    console.log("   Report:", reportResult);
    await new Promise((r) => setTimeout(r, 3000));
    await page.screenshot({ path: "screenshot-07-report.png", fullPage: true });
    console.log("   ✅ Report view");

    // 9. Scroll report
    await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (dialog) dialog.scrollTop = 600;
      else window.scrollBy(0, 700);
    });
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: "screenshot-08-report-scroll.png", fullPage: true });
    console.log("   ✅ Report scrolled");

    console.log("\n📸 All screenshots saved!");
    if (errors.length > 0) {
      console.log("\n⚠️ Console errors:");
      errors.forEach((e) => console.log("  -", e.substring(0, 120)));
    }
  } catch (err) {
    console.error("Error:", err.message);
    await page.screenshot({ path: "screenshot-error.png", fullPage: true });
  } finally {
    await browser.close();
  }
})();
