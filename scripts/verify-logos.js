const http = require("http");
http.get("http://localhost:4002/api/settings", (res) => {
  let d = "";
  res.on("data", (c) => (d += c));
  res.on("end", () => {
    const j = JSON.parse(d);
    const correct = "/uploads/1771399315768-Novo_logo_Bruno2.png";
    console.log("=== LOGO AUDIT ===");
    console.log("Global logoUrl:", j.logoUrl, j.logoUrl === correct ? "OK" : "MISMATCH");
    console.log("Global darkLogoUrl:", j.darkLogoUrl || "(none)");
    const sl = j.screenLogos || {};
    for (const [k, v] of Object.entries(sl)) {
      const match = v.logoUrl === correct;
      console.log(`  ${k}: ${v.logoUrl} ${match ? "OK" : "MISMATCH"}`);
      if (v.darkLogoUrl) console.log(`    dark: ${v.darkLogoUrl}`);
    }
    // Check pages that render logos
    const pages = [
      { name: "Landing Header", key: "landingHeader" },
      { name: "Landing Footer", key: "landingFooter" },
      { name: "Login", key: "login" },
      { name: "Signup", key: "signup" },
      { name: "Admin Login", key: "adminLogin" },
      { name: "Patient Dashboard", key: "dashboard" },
      { name: "Forgot Password", key: "forgotPassword" },
    ];
    console.log("\n=== PAGE LOGO RESOLUTION ===");
    for (const p of pages) {
      const slEntry = sl[p.key];
      const resolved = slEntry?.logoUrl || j.logoUrl || null;
      const ok = resolved === correct;
      console.log(`  ${p.name}: ${resolved} ${ok ? "OK" : "PROBLEM"}`);
    }
    console.log("\n=== ADMIN SIDEBAR (uses global only) ===");
    console.log(`  logoUrl: ${j.logoUrl} ${j.logoUrl === correct ? "OK" : "PROBLEM"}`);
    console.log("\n=== SUMMARY ===");
    const allOk = j.logoUrl === correct && Object.values(sl).every((v) => v.logoUrl === correct);
    console.log(allOk ? "ALL LOGOS CORRECT" : "ISSUES FOUND");
  });
});
