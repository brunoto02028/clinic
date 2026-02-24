const puppeteer = require("puppeteer");
const BASE = "https://bpr.rehab";
const SCAN_ID = "cmltj0xie0001l6vba5zi40r4";

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 1200 });

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

    // 2. Go to report preview page
    console.log("2. Opening report preview...");
    await page.goto(`${BASE}/admin/scans/report-preview?id=${SCAN_ID}`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 3000));

    // 3. Screenshot the full report
    console.log("3. Taking screenshots...");
    await page.screenshot({ path: "final-report-01-top.png", fullPage: false });

    // Scroll and capture sections
    for (let i = 1; i <= 6; i++) {
      await page.evaluate((scrollY) => window.scrollBy(0, scrollY), 1000);
      await new Promise((r) => setTimeout(r, 500));
      await page.screenshot({ path: `final-report-0${i + 1}-section.png`, fullPage: false });
    }

    // Full page screenshot
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: "final-report-FULL.png", fullPage: true });

    console.log("\n✅ All report screenshots saved!");
  } catch (err) {
    console.error("Error:", err.message);
    await page.screenshot({ path: "final-report-error.png", fullPage: true });
  } finally {
    await browser.close();
  }
})();
