const puppeteer = require("puppeteer");
const BASE = "https://bpr.rehab";

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  // Mobile viewport (iPhone 14 Pro)
  await page.setViewport({ width: 393, height: 852, isMobile: true, deviceScaleFactor: 3 });

  try {
    // 1. Login to get a scan token
    console.log("1. Login...");
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle2", timeout: 30000 });
    await page.waitForSelector("#email", { timeout: 10000 });
    await page.type("#email", "admin@bpr.rehab");
    await page.type("#password", "Bruno@Admin2026!");
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 8000));
    console.log("   OK:", page.url());

    // 2. Find the demo scan token via API
    console.log("2. Getting demo scan token...");
    const scanData = await page.evaluate(async () => {
      const res = await fetch("/api/foot-scans?search=FS-DEMO-00001");
      if (!res.ok) return null;
      const data = await res.json();
      return data.scans?.[0] || null;
    });

    if (!scanData) {
      console.log("   Scan not found via API, checking DB token directly...");
    }

    // Use the scan token or find it
    let scanToken = scanData?.scanToken;
    if (!scanToken) {
      // Try to get it from the scan detail
      const detail = await page.evaluate(async () => {
        const res = await fetch("/api/foot-scans?scanNumber=FS-DEMO-00001");
        if (!res.ok) return null;
        return await res.json();
      });
      console.log("   Detail:", JSON.stringify(detail)?.substring(0, 200));
      scanToken = detail?.scans?.[0]?.scanToken || detail?.scanToken;
    }

    if (!scanToken) {
      console.log("   No token found. Let me check from admin scans page...");
      // Create a new scan session for demo
      const newSession = await page.evaluate(async () => {
        // First find Maria Santos patient ID
        const pRes = await fetch("/api/admin/patients");
        if (!pRes.ok) return { error: "patients fetch failed" };
        const patients = await pRes.json();
        const maria = patients.find?.((p) => p.firstName === "Maria" || p.email?.includes("maria"));
        if (!maria) return { error: "Maria not found", patients: patients.slice?.(0, 3) };

        // Create a scan session
        const sRes = await fetch("/api/foot-scans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patientId: maria.id }),
        });
        if (!sRes.ok) return { error: "create failed: " + sRes.status };
        return await sRes.json();
      });
      console.log("   New session:", JSON.stringify(newSession)?.substring(0, 300));
      scanToken = newSession?.scanToken || newSession?.scan?.scanToken;
    }

    if (!scanToken) {
      console.log("   ❌ Could not get scan token. Taking admin screenshots instead.");
      await page.goto(`${BASE}/admin/scans`, { waitUntil: "networkidle2" });
      await page.screenshot({ path: "scan-ux-error.png" });
      await browser.close();
      return;
    }

    console.log("   Token:", scanToken);

    // 3. Navigate to scan page as patient (mobile)
    const scanUrl = `${BASE}/scan/${scanToken}`;
    console.log("3. Opening scan page:", scanUrl);
    await page.goto(scanUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // ── Screenshot 1: Intro screen ──
    await page.screenshot({ path: "scan-ux-01-intro.png" });
    console.log("   ✅ Intro");

    // ── Click Guide button ──
    const guideClicked = await page.evaluate(() => {
      const btns = document.querySelectorAll("button");
      for (const b of btns) {
        if (b.textContent?.includes("Guide")) { b.click(); return true; }
      }
      return false;
    });
    if (guideClicked) {
      await new Promise(r => setTimeout(r, 1000));
      await page.screenshot({ path: "scan-ux-02-guide.png" });
      console.log("   ✅ Guide");
      // Close guide
      await page.evaluate(() => {
        const btns = document.querySelectorAll("button");
        for (const b of btns) {
          if (b.textContent?.includes("Close") || b.textContent?.includes("Fechar")) { b.click(); return; }
        }
      });
      await new Promise(r => setTimeout(r, 500));
    }

    // ── Click Continue ──
    await page.evaluate(() => {
      const btns = document.querySelectorAll("button");
      for (const b of btns) {
        if (b.textContent?.includes("Continue")) { b.click(); return; }
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    // ── Screenshot 2: Mode selection ──
    await page.screenshot({ path: "scan-ux-03-mode.png" });
    console.log("   ✅ Mode Selection");

    // Scroll down to see all options
    await page.evaluate(() => window.scrollBy(0, 300));
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: "scan-ux-03b-mode-scroll.png" });
    console.log("   ✅ Mode Selection (scrolled)");

    // ── Click Continue for mode ──
    await page.evaluate(() => window.scrollTo(0, 9999));
    await new Promise(r => setTimeout(r, 300));
    await page.evaluate(() => {
      const btns = document.querySelectorAll("button");
      for (const b of btns) {
        if (b.textContent?.includes("Continue") && !b.textContent?.includes("Back")) { b.click(); return; }
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    // ── Screenshot 3: Calibration ──
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: "scan-ux-04-calibration.png" });
    console.log("   ✅ Calibration");

    // Scroll down
    await page.evaluate(() => window.scrollBy(0, 400));
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: "scan-ux-04b-calibration-scroll.png" });
    console.log("   ✅ Calibration (scrolled)");

    // ── Click Begin Capture ──
    await page.evaluate(() => window.scrollTo(0, 9999));
    await new Promise(r => setTimeout(r, 300));
    await page.evaluate(() => {
      const btns = document.querySelectorAll("button");
      for (const b of btns) {
        if (b.textContent?.includes("Begin Capture")) { b.click(); return; }
      }
    });
    await new Promise(r => setTimeout(r, 1500));

    // ── Screenshot 4: Capture step ──
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: "scan-ux-05-capture.png" });
    console.log("   ✅ Capture Step 1");

    // Scroll to see camera area
    await page.evaluate(() => window.scrollBy(0, 300));
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: "scan-ux-05b-capture-scroll.png" });
    console.log("   ✅ Capture Step 1 (camera area)");

    console.log("\n✅ All UX screenshots saved!");
  } catch (err) {
    console.error("Error:", err.message);
    await page.screenshot({ path: "scan-ux-error.png" });
  } finally {
    await browser.close();
  }
})();
