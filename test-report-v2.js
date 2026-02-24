const puppeteer = require("puppeteer");
const BASE = "https://bpr.rehab";

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1400,900"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  try {
    // 1. Login
    console.log("1. Logging in...");
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle2", timeout: 30000 });
    await page.waitForSelector("#email", { timeout: 10000 });
    await page.type("#email", "admin@bpr.rehab");
    await page.type("#password", "Bruno@Admin2026!");
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 8000));
    console.log("   OK:", page.url());

    // 2. Go to scans
    console.log("2. Going to /admin/scans...");
    await page.goto(`${BASE}/admin/scans`, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 3000));

    // 3. Click the eye icon on FS-DEMO-00001 row
    console.log("3. Clicking FS-DEMO-00001 eye icon...");
    const clicked = await page.evaluate(() => {
      // Find the row containing FS-DEMO-00001 text
      const allElements = document.querySelectorAll("*");
      for (const el of allElements) {
        if (el.children.length === 0 && el.textContent === "FS-DEMO-00001") {
          // Walk up to the row container
          let row = el.closest("[class*='rounded'], [class*='border'], [class*='card']") || el.parentElement?.parentElement?.parentElement;
          if (row) {
            // Find the eye/view button within
            const btns = row.querySelectorAll("button, svg");
            for (const b of btns) {
              if (b.tagName === "BUTTON" || b.closest("button")) {
                const btn = b.tagName === "BUTTON" ? b : b.closest("button");
                btn.click();
                return "clicked eye in row";
              }
            }
          }
          return "row found but no button";
        }
      }
      return "scan not found";
    });
    console.log("  ", clicked);

    // 4. Wait for dialog to appear
    console.log("4. Waiting for dialog...");
    try {
      await page.waitForFunction(
        () => document.querySelector('[role="dialog"]') !== null,
        { timeout: 5000 }
      );
      console.log("   Dialog appeared!");
    } catch {
      console.log("   No role=dialog found. Checking DOM...");
      const domInfo = await page.evaluate(() => {
        const all = document.querySelectorAll("[class*='Dialog'], [class*='dialog'], [class*='modal'], [class*='Modal'], [data-state='open']");
        return Array.from(all).map((e) => `${e.tagName}.${e.className.substring(0, 80)}`).slice(0, 10);
      });
      console.log("   DOM hints:", domInfo);
    }

    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: "report-01-after-click.png", fullPage: true });
    console.log("   Screenshot: after click");

    // 5. Try to find tabs in any container
    const tabInfo = await page.evaluate(() => {
      const tabs = document.querySelectorAll('[role="tab"], [data-state="active"], [data-state="inactive"]');
      return Array.from(tabs).map((t) => ({
        text: t.textContent?.trim(),
        role: t.getAttribute("role"),
        state: t.getAttribute("data-state"),
        value: t.getAttribute("data-value"),
        tag: t.tagName,
      }));
    });
    console.log("5. Tabs found:", JSON.stringify(tabInfo, null, 2));

    // 6. Click each tab found
    const tabValues = ["images3d", "analysis", "recommendations", "actions"];
    for (let i = 0; i < tabValues.length; i++) {
      const tv = tabValues[i];
      console.log(`6.${i + 1} Clicking tab: ${tv}...`);
      const result = await page.evaluate((val) => {
        const tabs = document.querySelectorAll('[role="tab"]');
        for (const t of tabs) {
          const dv = t.getAttribute("data-value") || "";
          if (dv === val) {
            t.click();
            return "clicked data-value=" + val;
          }
        }
        // Fallback: match by text
        for (const t of tabs) {
          const txt = t.textContent?.trim().toLowerCase() || "";
          if (txt.includes(val.replace("3d", " 3d").replace("images", "images"))) {
            t.click();
            return "clicked text match: " + txt;
          }
        }
        return "not found";
      }, tv);
      console.log("  ", result);
      await new Promise((r) => setTimeout(r, 1500));

      // Scroll dialog content
      await page.evaluate(() => {
        const scrollable = document.querySelector('[role="dialog"]') || 
          document.querySelector('[class*="DialogContent"]') ||
          document.querySelector('[class*="overflow-y-auto"]');
        if (scrollable) scrollable.scrollTop = 0;
      });
      await page.screenshot({ path: `report-0${i + 2}-tab-${tv}.png`, fullPage: true });

      // Also scroll down
      await page.evaluate(() => {
        const scrollable = document.querySelector('[role="dialog"]') ||
          document.querySelector('[class*="overflow-y-auto"]');
        if (scrollable) scrollable.scrollTop = 400;
      });
      await new Promise((r) => setTimeout(r, 500));
      await page.screenshot({ path: `report-0${i + 2}b-tab-${tv}-scroll.png`, fullPage: true });
    }

    // 7. Try clicking Generate Report in actions tab
    console.log("7. Looking for report button...");
    const reportBtn = await page.evaluate(() => {
      const btns = document.querySelectorAll("button");
      const texts = [];
      for (const b of btns) {
        const t = b.textContent?.trim() || "";
        texts.push(t.substring(0, 40));
        if (t.toLowerCase().includes("report") || t.toLowerCase().includes("generate")) {
          b.click();
          return "clicked: " + t;
        }
      }
      return "not found. Buttons: " + texts.join(" | ");
    });
    console.log("  ", reportBtn);
    await new Promise((r) => setTimeout(r, 3000));
    await page.screenshot({ path: "report-07-final.png", fullPage: true });

    console.log("\nDone!");
  } catch (err) {
    console.error("Error:", err.message);
    await page.screenshot({ path: "report-error.png", fullPage: true });
  } finally {
    await browser.close();
  }
})();
