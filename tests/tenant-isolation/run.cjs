// Tenant isolation suite — activity 20, T-7.
//
// Locks in every cross-tenant guarantee built in T-3..T-6: a leak that
// reopens later fails this before it can ship. Runs against a LOCAL dev
// server; seeds the two-tenant fixtures, logs in as each actor over HTTP
// (real middleware + session), asserts the canonical isolation scenarios,
// cleans up, and exits non-zero on any failure.
//
//   npm run test:tenants                    # expects a dev server on :4192
//   TENANT_TEST_URL=http://localhost:4137 npm run test:tenants
//
// The server must run with the local DB. Start one with, e.g.:
//   DEFAULT_CLINIC_SLUG=bruno-physical-rehabilitation npx next dev -p 4192
const http = require("http");
const path = require("path");
const { execFileSync } = require("child_process");

const BASE = process.env.TENANT_TEST_URL || "http://localhost:4192";
const PASSWORD = "QaTenant#2026";
const ROOT = path.join(__dirname, "..", "..");
const url = new URL(BASE);

function request(method, pathname, { cookie, body, form } = {}) {
  return new Promise((resolve) => {
    const payload = form ? form : body ? JSON.stringify(body) : null;
    const headers = {};
    if (payload) {
      headers["Content-Type"] = form ? "application/x-www-form-urlencoded" : "application/json";
      headers["Content-Length"] = Buffer.byteLength(payload);
    }
    if (cookie) headers.Cookie = cookie;
    const req = http.request(
      { host: url.hostname, port: url.port, path: pathname, method, headers },
      (res) => {
        let b = "";
        res.on("data", (c) => (b += c));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: b }));
      }
    );
    req.on("error", (e) => resolve({ status: 0, body: e.message }));
    if (payload) req.write(payload);
    req.end();
  });
}

const cookiesFrom = (h) => (h["set-cookie"] || []).map((c) => c.split(";")[0]).join("; ");

async function login(email) {
  const csrf = await request("GET", "/api/auth/csrf");
  if (csrf.status !== 200) throw new Error(`server not reachable at ${BASE} (csrf ${csrf.status})`);
  const token = JSON.parse(csrf.body).csrfToken;
  let cookie = cookiesFrom(csrf.headers);
  const form = `csrfToken=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&password=${encodeURIComponent(PASSWORD)}&json=true`;
  const res = await request("POST", "/api/auth/callback/credentials", { cookie, form });
  cookie = [cookie, cookiesFrom(res.headers)].filter(Boolean).join("; ");
  const session = await request("GET", "/api/auth/session", { cookie });
  const who = JSON.parse(session.body || "{}");
  if (!who?.user?.email) throw new Error(`login failed for ${email}`);
  return { cookie, role: who.user.role };
}

function loadFixtureIds() {
  const fs = require("fs");
  for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*"?([^"]+?)"?\s*$/);
    if (m && !process.env.DATABASE_URL) process.env.DATABASE_URL = m[1];
  }
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL || "")) {
    throw new Error("DATABASE_URL is not local — refusing to run");
  }
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  return (async () => {
    const byEmail = async (email) =>
      (await prisma.user.findUnique({ where: { email }, select: { id: true } }))?.id;
    const ba = async (n) =>
      (await prisma.bodyAssessment.findUnique({ where: { assessmentNumber: n }, select: { id: true } }))?.id;
    const ids = {
      pacienteA: await byEmail("qa.pacientea@example.test"),
      alunoB: await byEmail("qa.aluno@example.test"),
      fisioA: await byEmail("qa.fisioa@example.test"),
      assessmentA1: await ba("BA-QA-A1"),
    };
    await prisma.$disconnect();
    return ids;
  })();
}

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

async function main() {
  console.log(`\nTenant isolation suite → ${BASE}\n`);

  console.log("Seeding fixtures…");
  execFileSync("node", [path.join(ROOT, "scripts", "qa", "tenant-fixtures.cjs")], { stdio: "ignore" });
  const ids = await loadFixtureIds();
  for (const [k, v] of Object.entries(ids)) if (!v) throw new Error(`fixture id missing: ${k}`);

  try {
    const trainerB = await login("qa.trainer@example.test"); // ADMIN, tenant B
    const alunoB = await login("qa.aluno@example.test"); // PATIENT, tenant B
    const adminA = await login("qa.admina@example.test"); // ADMIN, tenant A

    console.log("\nIsolation scenarios:");

    // ISO-1 — staff of B cannot read a patient of A
    let r = await request("GET", `/api/admin/patients/${ids.pacienteA}`, { cookie: trainerB.cookie });
    check("ISO-1 admin B → patient A record", r.status === 404, `status ${r.status}`);

    // ISO-2 — staff of B lists only tenant B patients
    r = await request("GET", "/api/admin/patients", { cookie: trainerB.cookie });
    check("ISO-2 admin B patient list excludes A", r.status === 200 && !r.body.includes("qa.pacientea"), `status ${r.status}`);

    // ISO-3 — student of B sees only tenant B therapists
    r = await request("GET", "/api/therapists", { cookie: alunoB.cookie });
    check("ISO-3 student B therapists exclude fisioA", r.status === 200 && !r.body.includes(ids.fisioA), `status ${r.status}`);

    // ISO-4 — student of B cannot see availability of a therapist of A
    r = await request("GET", `/api/availability?date=2026-09-14&therapistId=${ids.fisioA}`, { cookie: alunoB.cookie });
    check("ISO-4 student B availability of therapist A", r.status === 404, `status ${r.status}`);

    // ISO-5 — student of B cannot book with a therapist of A
    r = await request("POST", "/api/appointments", {
      cookie: alunoB.cookie,
      body: { dateTime: "2026-09-14T10:00:00.000Z", treatmentType: "T7 ISO-5", therapistId: ids.fisioA },
    });
    check("ISO-5 student B books therapist A", r.status === 404, `status ${r.status}`);

    // ISO-7 — a patient cannot read another patient's body assessment via the admin route
    r = await request("GET", `/api/admin/body-assessments/${ids.assessmentA1}`, { cookie: alunoB.cookie });
    check("ISO-7 patient B → assessment A (admin route)", r.status === 403 || r.status === 404, `status ${r.status}`);

    // ISO-8b — staff of B cannot read a patient of A via /api/patients/[id]
    r = await request("GET", `/api/patients/${ids.pacienteA}`, { cookie: trainerB.cookie });
    check("ISO-8b admin B → patient A (patients route)", r.status === 404, `status ${r.status}`);

    // ISO-9 — staff of B cannot delete a patient of A
    r = await request("DELETE", `/api/patients/${ids.pacienteA}`, { cookie: trainerB.cookie });
    const stillThere = await request("GET", `/api/admin/patients/${ids.pacienteA}`, { cookie: adminA.cookie });
    check("ISO-9 admin B deletes patient A", r.status === 404 && stillThere.status === 200, `delete ${r.status}, still-there ${stillThere.status}`);

    // ISO-11 — staff of B lists only tenant B exercises
    r = await request("GET", "/api/admin/exercises", { cookie: trainerB.cookie });
    check("ISO-11 admin B exercises exclude A", r.status === 200 && r.body.includes("QA Goblet Squat") && !r.body.includes("QA Clam Shell"), `status ${r.status}`);

    // X1 — viewAll is scoped to the tenant
    r = await request("GET", "/api/appointments?viewAll=true", { cookie: trainerB.cookie });
    check("X1 admin B viewAll excludes A", r.status === 200 && !r.body.includes(ids.pacienteA), `status ${r.status}`);

    // IMP — a forged impersonation cookie for a patient of B does not take effect for admin A
    const baseline = await request("GET", "/api/exercises", { cookie: adminA.cookie });
    const forged = await request("GET", "/api/exercises", {
      cookie: `${adminA.cookie}; impersonate-patient-id=${ids.alunoB}; impersonate-admin-id=${ids.pacienteA}`,
    });
    check("IMP admin A forged impersonation of student B", forged.status === baseline.status && forged.body === baseline.body, `baseline ${baseline.status}, forged ${forged.status}`);
  } finally {
    console.log("\nCleaning up…");
    execFileSync("node", [path.join(ROOT, "scripts", "qa", "tenant-cleanup.cjs")], { stdio: "ignore" });
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed.`);
  if (failed.length) {
    console.log("LEAKS:", failed.map((f) => f.name).join(", "));
    process.exit(1);
  }
  console.log("No cross-tenant leaks.\n");
}

main().catch((err) => {
  console.error("\nSuite error:", err.message);
  process.exit(2);
});
