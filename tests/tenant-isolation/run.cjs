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

function request(method, pathname, { cookie, body, form, bearer } = {}) {
  return new Promise((resolve) => {
    const payload = form ? form : body ? JSON.stringify(body) : null;
    const headers = {};
    if (payload) {
      headers["Content-Type"] = form ? "application/x-www-form-urlencoded" : "application/json";
      headers["Content-Length"] = Buffer.byteLength(payload);
    }
    if (cookie) headers.Cookie = cookie;
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
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

async function mobileLogin(email) {
  const res = await request("POST", "/api/mobile/login", { body: { email, password: PASSWORD } });
  if (res.status !== 200) throw new Error(`mobile login failed for ${email} (${res.status})`);
  return JSON.parse(res.body).accessToken;
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
    const exByName = async (name) =>
      (await prisma.exercise.findFirst({ where: { name }, select: { id: true } }))?.id;
    const ids = {
      pacienteA: await byEmail("qa.pacientea@example.test"),
      alunoB: await byEmail("qa.aluno@example.test"),
      fisioA: await byEmail("qa.fisioa@example.test"),
      assessmentA1: await ba("BA-QA-A1"),
      exerciseA: await exByName("QA Clam Shell"),
      exerciseB: await exByName("QA Goblet Squat"),
    };
    await prisma.$disconnect();
    return ids;
  })();
}

// Throwaway accounts the register scenarios create; removed in cleanup.
const THROWAWAY_EMAILS = [
  "qa.reg-none@example.test",
  "qa.reg-slugb@example.test",
  "qa.reg-bad@example.test",
];
async function deleteUsers(emails) {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  } finally {
    await prisma.$disconnect();
  }
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
    const pacienteA = await login("qa.pacientea@example.test"); // PATIENT, tenant A (clinic)
    const alunoB2 = await login("qa.aluno2@example.test"); // PATIENT, tenant B (personal), different student

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

    // ── T-19b: clinical-only routes blocked for a personal-trainer tenant ──
    // trainerB is ADMIN of qa-studio-pt (PERSONAL_TRAINER); adminA is a clinic.
    // G1 — personal admin hitting a clinical page is bounced to /admin.
    r = await request("GET", "/admin/clinical-notes", { cookie: trainerB.cookie });
    check("G1 personal admin → /admin/clinical-notes redirected", (r.status === 307 || r.status === 302) && (r.headers.location || "").endsWith("/admin"), `status ${r.status}, loc ${r.headers.location || "-"}`);

    // G2/G3 — clinical APIs answer 404 for a personal tenant (no oracle).
    r = await request("GET", "/api/admin/clinical-notes", { cookie: trainerB.cookie });
    check("G2 personal admin → /api/admin/clinical-notes 404", r.status === 404, `status ${r.status}`);
    r = await request("GET", "/api/admin/protocols", { cookie: trainerB.cookie });
    check("G3 personal admin → /api/admin/protocols 404", r.status === 404, `status ${r.status}`);

    // G4 (control) — a clinic admin is NOT gated: the same page is not bounced.
    r = await request("GET", "/admin/clinical-notes", { cookie: adminA.cookie });
    check("G4 clinic admin → /admin/clinical-notes not gated", r.status !== 307 || !(r.headers.location || "").endsWith("/admin"), `status ${r.status}, loc ${r.headers.location || "-"}`);

    // G7/G8 — Marketing (clinic/BPR content) is blocked by URL for a personal tenant.
    r = await request("GET", "/admin/marketing", { cookie: trainerB.cookie });
    check("G7 personal admin → /admin/marketing redirected", (r.status === 307 || r.status === 302) && (r.headers.location || "").endsWith("/admin"), `status ${r.status}, loc ${r.headers.location || "-"}`);
    r = await request("GET", "/admin/articles", { cookie: trainerB.cookie });
    check("G8 personal admin → /admin/articles redirected", (r.status === 307 || r.status === 302) && (r.headers.location || "").endsWith("/admin"), `status ${r.status}`);
    // G9 (control) — a clinic admin is NOT gated from marketing.
    r = await request("GET", "/admin/marketing", { cookie: adminA.cookie });
    check("G9 clinic admin → /admin/marketing not gated", r.status !== 307 || !(r.headers.location || "").endsWith("/admin"), `status ${r.status}`);

    // G5 — the per-patient clinical GENERATORS are blocked for a personal tenant,
    // not just the list pages (the gate must wall off the clinical module itself).
    r = await request("GET", `/api/admin/patients/${ids.alunoB}/protocol`, { cookie: trainerB.cookie });
    check("G5 personal admin → patient protocol generator 404", r.status === 404, `status ${r.status}`);

    // G5b — the AI clinical import (creates screening + SOAP) is blocked too.
    r = await request("POST", `/api/admin/patients/${ids.alunoB}/ai-import`, { cookie: trainerB.cookie, body: {} });
    check("G5b personal admin → patient ai-import 404", r.status === 404, `status ${r.status}`);

    // G6 (control) — a clinic admin reaches the same generator (gate is type-scoped).
    r = await request("GET", `/api/admin/patients/${ids.pacienteA}/protocol`, { cookie: adminA.cookie });
    check("G6 clinic admin → patient protocol generator not gated", r.status !== 404, `status ${r.status}`);

    // ── T-20: workout product (personal tenant only), tenant-scoped ──
    // W1 — personal admin creates a workout for their student → 201.
    let w = await request("POST", "/api/admin/workouts", {
      cookie: trainerB.cookie,
      body: { name: "Treino A", studentId: ids.alunoB, exercises: [{ exerciseId: ids.exerciseB, sets: 3, repsMin: 8, repsMax: 12, rpe: 8 }] },
    });
    let workoutId = (() => { try { return JSON.parse(w.body).id; } catch { return null; } })();
    let weId = (() => { try { return JSON.parse(w.body).exercises?.[0]?.id; } catch { return null; } })();
    check("W1 personal admin creates workout", w.status === 201 && !!workoutId, `status ${w.status}`);

    // W2 — clinic admin (CLINIC tenant, TRAINING off by default) is blocked → 404.
    w = await request("POST", "/api/admin/workouts", {
      cookie: adminA.cookie,
      body: { name: "X", studentId: ids.pacienteA, exercises: [] },
    });
    check("W2 clinic admin blocked (module off) 404", w.status === 404, `status ${w.status}`);

    // W3 — cross-tenant read: clinic admin cannot read the personal tenant's workout → 404.
    if (workoutId) {
      w = await request("GET", `/api/admin/workouts/${workoutId}`, { cookie: adminA.cookie });
      check("W3 clinic admin → personal workout 404", w.status === 404, `status ${w.status}`);
    }

    // W4 — range validation: rpe out of 1–10 → 400.
    w = await request("POST", "/api/admin/workouts", {
      cookie: trainerB.cookie,
      body: { name: "Bad RPE", studentId: ids.alunoB, exercises: [{ exerciseId: ids.exerciseB, rpe: 99 }] },
    });
    check("W4 invalid rpe rejected 400", w.status === 400, `status ${w.status}`);

    // W5 — cross-tenant exercise: personal workout referencing clinic A's exercise → 400.
    w = await request("POST", "/api/admin/workouts", {
      cookie: trainerB.cookie,
      body: { name: "Foreign ex", studentId: ids.alunoB, exercises: [{ exerciseId: ids.exerciseA }] },
    });
    check("W5 foreign-tenant exercise rejected 400", w.status === 400, `status ${w.status}`);

    // ── T-22: student sees + logs only their own workouts ──
    // S1 — student B sees their own workout via the student endpoint.
    let sres = await request("GET", "/api/workouts", { cookie: alunoB.cookie });
    check("S1 student B lists own workouts", sres.status === 200 && !!workoutId && sres.body.includes(workoutId), `status ${sres.status}`);

    // S2 — student B logs a valid session for their workout → 201.
    if (workoutId && weId) {
      sres = await request("POST", `/api/workouts/${workoutId}/logs`, {
        cookie: alunoB.cookie,
        body: { sessionRpe: 8, sets: [{ workoutExerciseId: weId, setNumber: 1, reps: 10, loadKg: 40, rpe: 8, completed: true }] },
      });
      check("S2 student B logs a session", sres.status === 201, `status ${sres.status}`);

      // S3 — a student of another tenant cannot log to student B's workout → 404
      // (blocked at the module gate: clinic tenant has TRAINING off).
      sres = await request("POST", `/api/workouts/${workoutId}/logs`, {
        cookie: pacienteA.cookie,
        body: { sets: [{ workoutExerciseId: weId, setNumber: 1, reps: 5 }] },
      });
      check("S3 foreign-tenant student → log 404", sres.status === 404, `status ${sres.status}`);

      // S3b — a DIFFERENT student in the SAME personal tenant (TRAINING on) still
      // cannot log to student B's workout → 404 (ownership guard, studentId check).
      sres = await request("POST", `/api/workouts/${workoutId}/logs`, {
        cookie: alunoB2.cookie,
        body: { sets: [{ workoutExerciseId: weId, setNumber: 1, reps: 5 }] },
      });
      check("S3b other student same tenant → log 404 (ownership)", sres.status === 404, `status ${sres.status}`);

      // S3c — that same student also cannot read B's workout via the list (only own).
      sres = await request("GET", "/api/workouts", { cookie: alunoB2.cookie });
      check("S3c other student list excludes B's workout", sres.status === 200 && !sres.body.includes(workoutId), `status ${sres.status}`);

      // S4 — range validation on a logged set (rpe out of 1–10) → 400.
      sres = await request("POST", `/api/workouts/${workoutId}/logs`, {
        cookie: alunoB.cookie,
        body: { sets: [{ workoutExerciseId: weId, setNumber: 1, rpe: 99 }] },
      });
      check("S4 invalid set rpe rejected 400", sres.status === 400, `status ${sres.status}`);
    }

    // ── T-23: mobile (Bearer) training module + endpoints ──
    if (workoutId && weId) {
      const alunoBTok = await mobileLogin("qa.aluno@example.test"); // personal student
      const pacienteATok = await mobileLogin("qa.pacientea@example.test"); // clinic patient

      // M1 — personal student's mobile module list includes "treino".
      let m = await request("GET", "/api/mobile/modules", { bearer: alunoBTok });
      check("M1 personal student modules include treino", m.status === 200 && m.body.includes('"treino"'), `status ${m.status}`);

      // M2 — clinic patient's module list excludes "treino".
      m = await request("GET", "/api/mobile/modules", { bearer: pacienteATok });
      check("M2 clinic patient modules exclude treino", m.status === 200 && !m.body.includes('"treino"'), `status ${m.status}`);

      // M3 — personal student sees own workouts over Bearer.
      m = await request("GET", "/api/mobile/workouts", { bearer: alunoBTok });
      check("M3 mobile student lists own workouts", m.status === 200 && m.body.includes(workoutId), `status ${m.status}`);

      // M4 — personal student logs a session over Bearer → 201.
      m = await request("POST", `/api/mobile/workouts/${workoutId}/logs`, {
        bearer: alunoBTok,
        body: { sessionRpe: 7, sets: [{ workoutExerciseId: weId, setNumber: 1, reps: 10, loadKg: 40 }] },
      });
      check("M4 mobile student logs a session", m.status === 201, `status ${m.status}`);

      // M5 — clinic patient blocked from the mobile workouts endpoint → 404.
      m = await request("GET", "/api/mobile/workouts", { bearer: pacienteATok });
      check("M5 clinic patient → mobile workouts 404", m.status === 404, `status ${m.status}`);

      // M6 — personal student's mobile module list includes "avaliacoes" (T-5).
      m = await request("GET", "/api/mobile/modules", { bearer: alunoBTok });
      check("M6 personal student modules include avaliacoes", m.status === 200 && m.body.includes('"avaliacoes"'), `status ${m.status}`);

      // M7 — clinic patient's module list excludes "avaliacoes".
      m = await request("GET", "/api/mobile/modules", { bearer: pacienteATok });
      check("M7 clinic patient modules exclude avaliacoes", m.status === 200 && !m.body.includes('"avaliacoes"'), `status ${m.status}`);

      // M8 — a personal student never gets the clinic modules on mobile (act.22 T-9).
      m = await request("GET", "/api/mobile/modules", { bearer: alunoBTok });
      check(
        "M8 personal student modules exclude clinic (lab/clinica/ba)",
        m.status === 200 && !m.body.includes('"lab"') && !m.body.includes('"clinica"') && !m.body.includes('"ba"'),
        `status ${m.status} body ${m.body.slice(0, 120)}`
      );

      // M9 — a clinic patient still sees clinic modules (regression).
      m = await request("GET", "/api/mobile/modules", { bearer: pacienteATok });
      check("M9 clinic patient still has a clinic module", m.status === 200 && m.body.includes('"clinica"'), `status ${m.status}`);
    }

    // ── T-24: trainer reads the student's progress (tenant-scoped) ──
    // Guarded like the logging above (needs weId) so P1's "≥1 session" holds.
    if (workoutId && weId) {
      // P1 — trainer sees progress reflecting the logged sessions (S2/M4 logged some).
      let p = await request("GET", `/api/admin/workouts/progress?studentId=${ids.alunoB}`, { cookie: trainerB.cookie });
      let prog = (() => { try { return JSON.parse(p.body); } catch { return null; } })();
      check("P1 trainer reads student progress", p.status === 200 && (prog?.adherence?.doneLast4Weeks ?? 0) >= 1 && Array.isArray(prog?.recent) && prog.recent.length >= 1, `status ${p.status}, done ${prog?.adherence?.doneLast4Weeks}`);

      // P2 — clinic admin (TRAINING off) can't read training progress → 404.
      p = await request("GET", `/api/admin/workouts/progress?studentId=${ids.alunoB}`, { cookie: adminA.cookie });
      check("P2 clinic admin → progress 404", p.status === 404, `status ${p.status}`);

      // P3 — trainer asking for a student outside the tenant → 404.
      p = await request("GET", `/api/admin/workouts/progress?studentId=${ids.pacienteA}`, { cookie: trainerB.cookie });
      check("P3 trainer → foreign student progress 404", p.status === 404, `status ${p.status}`);
    }

    // ── T-21 (activity 21): personal-trainer assessments ──
    // A1 — trainer records an assessment (MANUAL %BF) → 201 with computed derivations.
    let a = await request("POST", "/api/admin/assessments", {
      cookie: trainerB.cookie,
      body: { studentId: ids.alunoB, weightKg: 80, heightCm: 180, bfMethod: "MANUAL", bodyFatPct: 20, girths: { waist: 80, hip: 100 } },
    });
    let asmt = (() => { try { return JSON.parse(a.body); } catch { return null; } })();
    check("A1 trainer records assessment (computed)", a.status === 201 && asmt?.bmi === 24.7 && asmt?.whr === 0.8 && asmt?.fatMassKg === 16 && asmt?.leanMassKg === 64, `status ${a.status}, bmi ${asmt?.bmi}, whr ${asmt?.whr}, fat ${asmt?.fatMassKg}`);

    // A2 — trainer lists the student's assessments.
    a = await request("GET", `/api/admin/assessments?studentId=${ids.alunoB}`, { cookie: trainerB.cookie });
    check("A2 trainer lists student assessments", a.status === 200 && !!asmt?.id && a.body.includes(asmt.id), `status ${a.status}`);

    // A8 (T-6) — progress now carries estimated 1RM (from the logged set) and the
    // composition curve (from this assessment: weight 80).
    a = await request("GET", `/api/admin/workouts/progress?studentId=${ids.alunoB}`, { cookie: trainerB.cookie });
    let prog6 = (() => { try { return JSON.parse(a.body); } catch { return null; } })();
    check("A8 progress has 1RM + composition", a.status === 200 && Array.isArray(prog6?.oneRepMax) && prog6.oneRepMax.length >= 1 && (prog6?.composition?.weight || []).some((p) => p.v === 80), `1rm ${prog6?.oneRepMax?.length}, wt ${(prog6?.composition?.weight||[]).map((p)=>p.v).join(",")}`);

    // A3 — clinic admin (TRAINING off) blocked → 404.
    a = await request("GET", `/api/admin/assessments?studentId=${ids.pacienteA}`, { cookie: adminA.cookie });
    check("A3 clinic admin → assessments 404", a.status === 404, `status ${a.status}`);

    // A4 — trainer asking for a student outside the tenant → 404.
    a = await request("GET", `/api/admin/assessments?studentId=${ids.pacienteA}`, { cookie: trainerB.cookie });
    check("A4 trainer → foreign student assessments 404", a.status === 404, `status ${a.status}`);

    // A5 — validation: bodyFatPct out of range → 400.
    a = await request("POST", "/api/admin/assessments", { cookie: trainerB.cookie, body: { studentId: ids.alunoB, bfMethod: "MANUAL", bodyFatPct: 200 } });
    check("A5 invalid bodyFatPct rejected 400", a.status === 400, `status ${a.status}`);

    // A9 (T-7) — assessmentType (from the tenant catalog) is stored + returned.
    a = await request("POST", "/api/admin/assessments", { cookie: trainerB.cookie, body: { studentId: ids.alunoB, bfMethod: "MANUAL", bodyFatPct: 18, assessmentType: "Full body composition" } });
    check("A9 assessmentType stored", a.status === 201 && (() => { try { return JSON.parse(a.body).assessmentType === "Full body composition"; } catch { return false; } })(), `status ${a.status}`);

    // A5b/A5c — BIA %BF out of range and a zero skinfold are rejected (400).
    a = await request("POST", "/api/admin/assessments", { cookie: trainerB.cookie, body: { studentId: ids.alunoB, bfMethod: "BIA", bia: { bodyFatPct: 200 } } });
    check("A5b invalid BIA bodyFatPct rejected 400", a.status === 400, `status ${a.status}`);
    a = await request("POST", "/api/admin/assessments", { cookie: trainerB.cookie, body: { studentId: ids.alunoB, bfMethod: "SKINFOLD", skinfolds: { chest: 0, abdomen: 20, thigh: 15 } } });
    check("A5c zero skinfold rejected 400", a.status === 400, `status ${a.status}`);

    // ── T-2: progress-photo consent gate (no R2 write — consent is checked
    // before the file is read, so these exercise the gate without uploading). ──
    if (asmt?.id) {
      let ph = await request("POST", `/api/admin/assessments/${asmt.id}/photos`, { cookie: trainerB.cookie, body: {} });
      check("PH1 photo without consent → 403", ph.status === 403, `status ${ph.status}`);
      ph = await request("POST", "/api/admin/assessments/consent", { cookie: trainerB.cookie, body: { studentId: ids.alunoB } });
      check("PH2 record photo consent → 200", ph.status === 200, `status ${ph.status}`);
      ph = await request("POST", `/api/admin/assessments/${asmt.id}/photos`, { cookie: trainerB.cookie, body: {} });
      check("PH3 with consent, no file → 400 (gate opened)", ph.status === 400, `status ${ph.status}`);
      ph = await request("POST", `/api/admin/assessments/${asmt.id}/photos`, { cookie: adminA.cookie, body: {} });
      check("PH4 clinic admin → photo 404", ph.status === 404, `status ${ph.status}`);
      // PH5 — revoke (granted:false) re-closes the gate → upload 403 again.
      ph = await request("POST", "/api/admin/assessments/consent", { cookie: trainerB.cookie, body: { studentId: ids.alunoB, granted: false } });
      const okRevoke = ph.status === 200;
      ph = await request("POST", `/api/admin/assessments/${asmt.id}/photos`, { cookie: trainerB.cookie, body: {} });
      check("PH5 revoke consent re-closes gate 403", okRevoke && ph.status === 403, `revoke ${okRevoke}, upload ${ph.status}`);
    }

    // A6 — student sees their own assessments (web); clinic patient blocked (404).
    a = await request("GET", "/api/assessments", { cookie: alunoB.cookie });
    check("A6 student lists own assessments", a.status === 200 && !!asmt?.id && a.body.includes(asmt.id), `status ${a.status}`);
    a = await request("GET", "/api/assessments", { cookie: pacienteA.cookie });
    check("A6b clinic patient → assessments 404", a.status === 404, `status ${a.status}`);

    // A7 — mobile (Bearer): student sees own; clinic patient 404.
    {
      const alunoBTok2 = await mobileLogin("qa.aluno@example.test");
      const pacienteATok2 = await mobileLogin("qa.pacientea@example.test");
      a = await request("GET", "/api/mobile/assessments", { bearer: alunoBTok2 });
      check("A7 mobile student lists own assessments", a.status === 200 && a.body.includes(asmt?.id || "__none__"), `status ${a.status}`);
      a = await request("GET", "/api/mobile/assessments", { bearer: pacienteATok2 });
      check("A7b mobile clinic patient → 404", a.status === 404, `status ${a.status}`);
    }

    // ISO-10 — mobile register never creates a tenant-less account.
    // No slug → the default tenant (never clinicId: null).
    await deleteUsers(THROWAWAY_EMAILS);
    r = await request("POST", "/api/mobile/register", {
      body: { firstName: "Reg", lastName: "None", email: "qa.reg-none@example.test", password: PASSWORD },
    });
    let regUser = (() => { try { return JSON.parse(r.body).user; } catch { return null; } })();
    // The ISO-10 invariant is "never a tenant-less account": either a tenant is
    // resolved (201 + clinicId, when DEFAULT_CLINIC_SLUG is set) or it fails
    // closed (non-201, no account). Never 201 with clinicId null. This holds
    // regardless of whether the server env pins a default tenant.
    const okDefault = r.status === 201 && !!regUser?.clinicId;
    const okFailClosed = r.status !== 201 && !regUser;
    check("ISO-10a register w/o slug → tenant or fail-closed (never null)", okDefault || okFailClosed, `status ${r.status}, clinicId ${regUser?.clinicId ?? "null"}`);

    // Explicit slug → exactly that tenant.
    r = await request("POST", "/api/mobile/register", {
      body: { firstName: "Reg", lastName: "SlugB", email: "qa.reg-slugb@example.test", password: PASSWORD, tenantSlug: "qa-studio-pt" },
    });
    regUser = (() => { try { return JSON.parse(r.body).user; } catch { return null; } })();
    check("ISO-10b register w/ slug → that tenant", r.status === 201 && regUser?.clinicSlug === "qa-studio-pt", `status ${r.status}, slug ${regUser?.clinicSlug ?? "null"}`);

    // Unknown slug → 404, no account created.
    r = await request("POST", "/api/mobile/register", {
      body: { firstName: "Reg", lastName: "Bad", email: "qa.reg-bad@example.test", password: PASSWORD, tenantSlug: "does-not-exist-xyz" },
    });
    check("ISO-10c register w/ unknown slug → 404", r.status === 404, `status ${r.status}`);
  } finally {
    console.log("\nCleaning up…");
    await deleteUsers(THROWAWAY_EMAILS);
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
