const puppeteer = require("puppeteer");
const BASE = "https://bpr.rehab";
const TOKEN = "6638a67a6975169b36bea170f44d6e4f";

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  // iPhone 14 Pro viewport
  await page.setViewport({ width: 393, height: 852, isMobile: true, deviceScaleFactor: 2 });

  try {
    // 1. Open scan page directly (no login needed — public token link)
    console.log("1. Opening scan page...");
    await page.goto(`${BASE}/scan/${TOKEN}`, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // ── Screenshot 1: Intro ──
    await page.screenshot({ path: "scan-ux-01-intro.png" });
    console.log("   ✅ Intro");

    // Scroll to see full intro
    await page.evaluate(() => window.scrollBy(0, 300));
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: "scan-ux-01b-intro-scroll.png" });

    // ── Click Guide button ──
    const guideClicked = await page.evaluate(() => {
      const btns = document.querySelectorAll("button");
      for (const b of btns) {
        if (b.textContent?.trim().includes("Guide")) { b.click(); return true; }
      }
      return false;
    });
    if (guideClicked) {
      await new Promise(r => setTimeout(r, 1000));
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: "scan-ux-02-guide.png" });
      console.log("   ✅ Guide");

      // Scroll guide
      await page.evaluate(() => window.scrollBy(0, 400));
      await new Promise(r => setTimeout(r, 300));
      await page.screenshot({ path: "scan-ux-02b-guide-scroll.png" });

      // Close guide
      await page.evaluate(() => {
        const btns = document.querySelectorAll("button");
        for (const b of btns) {
          const t = b.textContent?.trim() || "";
          if (t.includes("Close") || t.includes("Ready") || t.includes("Fechar") || t.includes("Pronto")) { b.click(); return; }
        }
      });
      await new Promise(r => setTimeout(r, 500));
    }

    // ── Click Continue ──
    await page.evaluate(() => window.scrollTo(0, 9999));
    await new Promise(r => setTimeout(r, 300));
    await page.evaluate(() => {
      const btns = document.querySelectorAll("button");
      for (const b of btns) {
        if (b.textContent?.trim().includes("Continue")) { b.click(); return; }
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    // ── Screenshot 3: Mode selection ──
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: "scan-ux-03-mode.png" });
    console.log("   ✅ Mode Selection");

    await page.evaluate(() => window.scrollBy(0, 400));
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: "scan-ux-03b-mode-scroll.png" });

    // ── Click Continue (mode) ──
    await page.evaluate(() => window.scrollTo(0, 9999));
    await new Promise(r => setTimeout(r, 300));
    const contClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const cont = btns.filter(b => b.textContent?.trim().includes("Continue"));
      if (cont.length > 0) { cont[cont.length - 1].click(); return true; }
      return false;
    });
    console.log("   Continue clicked:", contClicked);
    await new Promise(r => setTimeout(r, 1000));

    // ── Screenshot 4: Calibration ──
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: "scan-ux-04-calibration.png" });
    console.log("   ✅ Calibration");

    await page.evaluate(() => window.scrollBy(0, 400));
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: "scan-ux-04b-calibration-angles.png" });

    await page.evaluate(() => window.scrollBy(0, 400));
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: "scan-ux-04c-calibration-list.png" });

    // ── Click Begin Capture ──
    await page.evaluate(() => window.scrollTo(0, 9999));
    await new Promise(r => setTimeout(r, 300));
    await page.evaluate(() => {
      const btns = document.querySelectorAll("button");
      for (const b of btns) {
        if (b.textContent?.trim().includes("Begin Capture")) { b.click(); return; }
      }
    });
    await new Promise(r => setTimeout(r, 1500));

    // ── Screenshot 5: Capture step 1 ──
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: "scan-ux-05-capture-step1.png" });
    console.log("   ✅ Capture Step 1");

    await page.evaluate(() => window.scrollBy(0, 300));
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: "scan-ux-05b-capture-camera.png" });

    // ── Screenshot 6: Complete page (simulate by navigating) ──
    // We can't actually complete a scan, so let's just show what we have
    console.log("\n✅ All UX screenshots saved!");
    console.log("\nFlow: Intro → Guide → Mode Select → Calibration → Capture Steps → Review → Upload → Complete");

  } catch (err) {
    console.error("Error:", err.message);
    await page.screenshot({ path: "scan-ux-error.png" });
  } finally {
    await browser.close();
  }
})();
