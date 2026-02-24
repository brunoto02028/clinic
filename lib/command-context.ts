import { prisma } from "@/lib/db";

// ─── Static Business Knowledge ───
const BUSINESS_KNOWLEDGE = `
## ABOUT BRUNO PHYSICAL REHABILITATION (BPR)
- **URL**: https://bpr.rehab
- **Location**: London, United Kingdom
- **Currency**: GBP (£)
- **Languages**: English (en-GB) primary, Portuguese (pt-BR) secondary
- **Founded by**: Bruno — physiotherapist and developer
- **Type**: Digital-first physiotherapy clinic with SaaS platform

## BUSINESS MODEL
BPR operates as a **hybrid physio clinic + health-tech platform**:
1. **Clinical Services** — In-person and remote physiotherapy sessions (electrotherapy, manual therapy, exercise therapy, sports rehab, chronic pain management, pre/post surgery rehab, biomechanical assessments)
2. **Membership Plans** — Monthly/yearly subscriptions with tiered module access (Free → Premium → Pro). Paid via Stripe.
3. **Treatment Packages** — Per-patient financial packages tied to treatment protocols. Pricing: per-session, weekly, or full-package. Stripe checkout.
4. **Content Marketplace** — Blog articles (SEO), education content library with video exercises, patient education materials
5. **AI-Powered Diagnostics** — AI generates clinical assessments, treatment protocols, and exercise prescriptions from patient data
6. **Gamification** — Patient journey system with quizzes, achievements, badges, daily missions, progress tracking

## PLATFORM ARCHITECTURE (Full-Stack Next.js 14)
- **Tech Stack**: Next.js 14, React, TypeScript, PostgreSQL, Prisma ORM, TailwindCSS, shadcn/ui
- **AI**: Abacus AI (RouteLLM — routes to Claude 4.5/GPT-5.2/Gemini 3 Flash) + Gemini fallback
- **Payments**: Stripe (live — subscriptions, one-time, treatment packages)
- **Communication**: WhatsApp Business API (Meta), Email SMTP (Hostinger), Instagram Graph API
- **Hosting**: VPS (Ubuntu 24.04, 8GB RAM), PM2 process manager, Nginx reverse proxy, SSL

## ADMIN PANEL PAGES (/admin/*)
- **Command Center** — AI chat with 14+ executable actions (this page)
- **Dashboard** — Global metrics overview (SUPERADMIN only)
- **Patients** — Full patient list with search, AI assessment, documents links
- **Patient Detail** — Profile, screening, appointments, diagnosis, protocol, documents, packages
- **AI Assessment** — AI-generated clinical diagnosis from screening + foot scan + body assessment + SOAP notes + documents
- **Appointments** — Calendar view, scheduling, status management (PENDING, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW)
- **Treatments** — Treatment type catalog (electrotherapy, manual, exercise, assessment, consultation). Categories with equipment, contraindications, indications
- **Exercises** — Exercise library with videos, body regions, difficulty levels, prescription system
- **Memberships** — Create/edit membership plans with module permissions, pricing tiers
- **Body Assessments** — Biomechanical analysis: multi-angle photos, MediaPipe pose detection, AI posture/symmetry/mobility scoring, plumb line overlay, image annotation, angle measurement
- **Foot Scans** — 3D foot scanning with AI analysis (plantar pressure, arch type, gait analysis)
- **Articles / Blog** — Create, edit, translate (AI), generate (AI), publish blog articles
- **Service Pages** — Manage service detail pages (11 services: electrotherapy, exercise therapy, foot scan, biomechanical assessment, ultrasound, laser/shockwave, sports injury, chronic pain, pre/post surgery, kinesiotherapy, microcurrent)
- **Social Media** — Instagram integration: create posts, campaigns, templates, AI caption generation, scheduling
- **Email** — Mini Outlook: inbox (IMAP sync), compose, reply, folders (inbox/sent/draft/spam/trash)
- **Email Templates** — 7+ templates with HTML editor, variable substitution, preview, test send
- **Media Library** — Image bank: upload, categorize, search, use across system
- **AI Settings** — Configure AI providers, API keys, models
- **Site Settings** — Clinic name, logo, colors, SEO, contact info, social links
- **System Logs** — Audit logs, system logs, error tracking
- **WhatsApp** — Send/receive WhatsApp messages, AI-generated messages

## PATIENT PORTAL PAGES (/dashboard/*)
- **Home** — Welcome dashboard with membership offer banner
- **Treatment Plan** — View protocol items by phase (short/medium/long term), mark exercises complete, progress bar
- **Exercises** — Prescribed exercises with video guides, sets/reps tracking
- **Body Assessments** — View assessment results, posture scores, AI recommendations
- **Foot Scans** — View scan results, arch analysis, gait data
- **Documents** — Upload/view medical documents (referrals, reports, prescriptions, imaging)
- **Screening** — Medical screening questionnaire (required for onboarding)
- **Membership** — View/subscribe/cancel membership plans
- **Education** — Educational content library (articles, videos, exercises)
- **Quizzes** — Health quizzes with gamification rewards
- **Scans** — QR-based body scan capture flow

## PATIENT FLOW
1. **Signup** → /signup (bilingual form)
2. **Verify** → /verify (6-digit code via email/SMS/WhatsApp)
3. **Login** → /login (auto-redirect by role)
4. **Screening** → /dashboard/screening (mandatory medical questionnaire)
5. **Consent** → Sign consent form
6. **Assessment** → Body assessment / Foot scan (optional but recommended)
7. **AI Diagnosis** → Therapist triggers AI assessment from all patient data
8. **Treatment Protocol** → AI generates personalized treatment plan
9. **Financial Package** → Treatment package with Stripe payment
10. **Treatment** → Patient follows protocol, completes exercises, tracks progress
11. **Re-assessment** → Follow-up assessments to measure improvement

## KEY INTEGRATIONS
- **Stripe** — Live payments (treatment packages, memberships, appointments)
- **WhatsApp Business API** — Patient communication, AI-generated messages, appointment reminders
- **Instagram Graph API** — Post publishing, carousel, insights, AI captions
- **Email SMTP** — Hostinger SMTP for transactional emails, IMAP for inbox sync
- **Abacus AI** — Text generation, image generation (FLUX-2 PRO, DALL-E, Ideogram), vision/multimodal
- **Google Gemini** — Fallback AI for text generation, voice transcription, vision analysis
- **MediaPipe** — Client-side pose detection for body assessments (33 landmarks)

## DATABASE MODELS (${new Date().toLocaleDateString("en-GB")})
Clinic, User, Subscription, MedicalScreening, TherapistAvailability, Appointment, SOAPNote, Payment, Article, SiteSettings, ServicePage, ImageLibrary, FootScan, Order, DiagnosticFile, TreatmentPlan, TreatmentPlanItem, MembershipPlan, PatientSubscription, CancellationRequest, ClinicModuleAccess, TreatmentType, Exercise, ExercisePrescription, AIDiagnosis, TreatmentProtocol, ProtocolItem, TreatmentPackage, PatientDocument, BodyAssessment, EducationCategory, EducationContent, EducationAssignment, EducationProgress, SocialAccount, SocialPost, SocialCampaign, SocialTemplate, SystemConfig, SystemLog, AuditLog, VoiceTranscription, WhatsAppMessage, VerificationCode, PasswordResetToken, Quiz, Achievement, PatientBadge, DailyMission, PatientProgress

## APPOINTMENT STATUS VALUES
PENDING, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW

## PAYMENT STATUS VALUES
PENDING, SUCCEEDED, FAILED, REFUNDED
`;

/**
 * Build comprehensive system context for the Command Center AI.
 */
export async function buildSystemContext(clinicId?: string | null): Promise<string> {
  const cf = clinicId ? { clinicId } : {};

  const sections = await Promise.all([
    getPatientStats(cf),
    getAppointmentStats(cf),
    getArticleStats(),
    getTreatmentStats(cf),
    getFinancialStats(cf),
    getGamificationStats(cf),
    getContentStats(cf),
    getMarketingStats(cf),
    getEducationStats(cf),
    getSystemInfo(),
  ]);

  return `${BUSINESS_KNOWLEDGE}

## LIVE DATA (Real-time from database)
${sections.join("\n\n")}
`.trim();
}

async function getPatientStats(cf: any): Promise<string> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const d30 = new Date(Date.now() - 30 * 86400000);
    const d60 = new Date(Date.now() - 60 * 86400000);

    const [total, active30d, newThisMonth, newPrevMonth, inactive, withScreening, roles, recentPatients] = await Promise.all([
      prisma.user.count({ where: { ...cf, role: "PATIENT" } }),
      prisma.user.count({ where: { ...cf, role: "PATIENT", updatedAt: { gte: d30 } } }),
      prisma.user.count({ where: { ...cf, role: "PATIENT", createdAt: { gte: startOfMonth } } }),
      prisma.user.count({ where: { ...cf, role: "PATIENT", createdAt: { gte: prevMonth, lt: startOfMonth } } }),
      prisma.user.count({ where: { ...cf, role: "PATIENT", updatedAt: { lt: d60 } } }),
      prisma.medicalScreening.count({ where: cf.clinicId ? { clinicId: cf.clinicId } : {} }),
      prisma.user.groupBy({ by: ["role"], _count: { id: true } }),
      prisma.user.findMany({
        where: { ...cf, role: "PATIENT" },
        take: 10,
        orderBy: { createdAt: "desc" },
        select: { firstName: true, lastName: true, email: true, createdAt: true },
      }),
    ]);

    const therapists = roles.find((r) => r.role === "THERAPIST")?._count?.id || 0;
    const admins = roles.find((r) => r.role === "ADMIN")?._count?.id || 0;
    const supers = roles.find((r) => r.role === "SUPERADMIN")?._count?.id || 0;
    const growth = newPrevMonth > 0 ? (((newThisMonth - newPrevMonth) / newPrevMonth) * 100).toFixed(1) : "N/A";
    const recentStr = recentPatients.map((p: any) =>
      `  - ${p.firstName || ""} ${p.lastName || ""} (${p.email}, joined ${new Date(p.createdAt).toLocaleDateString("en-GB")})`
    ).join("\n");

    return `### PATIENTS & USERS
- Total patients: ${total} | Active (30d): ${active30d} | Inactive (60d+): ${inactive}
- New this month: ${newThisMonth} | Previous month: ${newPrevMonth} | Growth: ${growth}%
- With medical screening completed: ${withScreening}
- Staff: ${therapists} therapists, ${admins} admins, ${supers} superadmins
- Recent patients:
${recentStr}`;
  } catch { return "### PATIENTS & USERS\n- Data unavailable"; }
}

async function getAppointmentStats(cf: any): Promise<string> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    const [total, thisMonth, thisWeek, upcoming, byStatus] = await Promise.all([
      (prisma as any).appointment.count({ where: cf }),
      (prisma as any).appointment.count({ where: { ...cf, dateTime: { gte: startOfMonth } } }),
      (prisma as any).appointment.count({ where: { ...cf, dateTime: { gte: startOfWeek } } }),
      (prisma as any).appointment.count({ where: { ...cf, dateTime: { gte: now }, status: "CONFIRMED" } }),
      (prisma as any).appointment.groupBy({ by: ["status"], _count: { id: true }, where: cf }),
    ]);

    const statusStr = byStatus.map((s: any) => `${s.status}: ${s._count.id}`).join(", ");

    return `### APPOINTMENTS
- Total: ${total} | This month: ${thisMonth} | This week: ${thisWeek}
- Upcoming confirmed: ${upcoming}
- By status: ${statusStr || "N/A"}`;
  } catch { return "### APPOINTMENTS\n- Data unavailable"; }
}

async function getArticleStats(): Promise<string> {
  try {
    const [total, published, draft, recent] = await Promise.all([
      prisma.article.count(),
      prisma.article.count({ where: { published: true } }),
      prisma.article.count({ where: { published: false } }),
      (prisma as any).article.findMany({
        orderBy: { createdAt: "desc" }, take: 5,
        select: { title: true, published: true, createdAt: true },
      }),
    ]);

    const recentStr = recent.map((a: any) =>
      `  - "${a.title}" (${a.published ? "published" : "draft"})`
    ).join("\n");

    return `### ARTICLES / BLOG
- Total: ${total} | Published: ${published} | Drafts: ${draft}
- Recent:
${recentStr}`;
  } catch { return "### ARTICLES\n- Data unavailable"; }
}

async function getTreatmentStats(cf: any): Promise<string> {
  try {
    const wh = cf.clinicId ? { clinicId: cf.clinicId } : {};
    const [types, exercises, protocols, diagnoses, footScans, bodyAssessments, packages, documents] = await Promise.all([
      prisma.treatmentType.count({ where: wh }),
      (prisma as any).exercise.count({ where: wh }),
      (prisma as any).treatmentProtocol.count({ where: wh }),
      (prisma as any).aIDiagnosis.count({ where: wh }),
      prisma.footScan.count({ where: wh }),
      (prisma as any).bodyAssessment.count({ where: wh }),
      (prisma as any).treatmentPackage.count({ where: wh }),
      (prisma as any).patientDocument.count({ where: wh }),
    ]);

    return `### TREATMENTS & CLINICAL
- Treatment types in catalog: ${types}
- Exercises in library: ${exercises}
- AI diagnoses generated: ${diagnoses}
- Treatment protocols: ${protocols}
- Treatment packages (financial): ${packages}
- Foot scans: ${footScans} | Body assessments: ${bodyAssessments}
- Patient documents uploaded: ${documents}`;
  } catch { return "### TREATMENTS\n- Data unavailable"; }
}

async function getFinancialStats(cf: any): Promise<string> {
  try {
    const d30 = new Date(Date.now() - 30 * 86400000);
    const d60 = new Date(Date.now() - 60 * 86400000);
    const wh = cf.clinicId ? { clinicId: cf.clinicId } : {};

    const [totalPayments, revenue30d, revenue60d, plans, memberships, activeSubs, paidPackages] = await Promise.all([
      (prisma as any).payment.aggregate({ where: { ...cf, status: "SUCCEEDED" }, _sum: { amount: true }, _count: { id: true } }),
      (prisma as any).payment.aggregate({ where: { ...cf, status: "SUCCEEDED", createdAt: { gte: d30 } }, _sum: { amount: true } }),
      (prisma as any).payment.aggregate({ where: { ...cf, status: "SUCCEEDED", createdAt: { gte: d60, lt: d30 } }, _sum: { amount: true } }),
      (prisma as any).treatmentPlan.count({ where: wh }),
      (prisma as any).membershipPlan.count({ where: wh }),
      (prisma as any).patientSubscription.count({ where: { ...wh, status: "ACTIVE" } }),
      (prisma as any).treatmentPackage.count({ where: { ...wh, isPaid: true } }),
    ]);

    const rev30 = totalPayments._sum?.amount || 0;
    const mr30 = revenue30d._sum?.amount || 0;
    const mr60 = revenue60d._sum?.amount || 0;
    const growth = mr60 > 0 ? (((mr30 - mr60) / mr60) * 100).toFixed(1) : "N/A";

    return `### FINANCIAL
- Total revenue (all time): £${rev30.toFixed(2)} from ${totalPayments._count?.id || 0} payments
- Revenue last 30 days: £${mr30.toFixed(2)} | Previous 30 days: £${mr60.toFixed(2)} | Growth: ${growth}%
- Treatment plans: ${plans} | Membership plans: ${memberships}
- Active subscriptions: ${activeSubs} | Paid packages: ${paidPackages}`;
  } catch { return "### FINANCIAL\n- Data unavailable"; }
}

async function getGamificationStats(cf: any): Promise<string> {
  try {
    const [progress, badges, missions, quizzes, achievements] = await Promise.all([
      (prisma as any).patientProgress.count({ where: cf.clinicId ? { clinicId: cf.clinicId } : {} }),
      (prisma as any).patientBadge.count(),
      (prisma as any).dailyMission.count(),
      (prisma as any).quiz.count(),
      (prisma as any).achievement.count(),
    ]);

    return `### GAMIFICATION (BPR Journey)
- Players with progress: ${progress}
- Badges awarded: ${badges}
- Daily missions: ${missions}
- Quizzes: ${quizzes}
- Achievements: ${achievements}`;
  } catch { return "### GAMIFICATION\n- Data unavailable"; }
}

async function getContentStats(cf: any): Promise<string> {
  try {
    const [servicePages, images, emailTemplates, emails, whatsappMsgs] = await Promise.all([
      (prisma as any).servicePage.count(),
      prisma.imageLibrary.count(),
      (prisma as any).emailTemplate.count(),
      (prisma as any).emailMessage.count(),
      (prisma as any).whatsAppMessage.count(),
    ]);

    return `### CONTENT & COMMUNICATION
- Service pages: ${servicePages}
- Images in media library: ${images}
- Email templates: ${emailTemplates} | Emails sent/received: ${emails}
- WhatsApp messages: ${whatsappMsgs}`;
  } catch { return "### CONTENT\n- Data unavailable"; }
}

async function getMarketingStats(cf: any): Promise<string> {
  try {
    const wh = cf.clinicId ? { clinicId: cf.clinicId } : {};
    const [posts, campaigns, templates, accounts] = await Promise.all([
      (prisma as any).socialPost.count({ where: wh }),
      (prisma as any).socialCampaign.count({ where: wh }),
      (prisma as any).socialTemplate.count({ where: wh }),
      (prisma as any).socialAccount.count({ where: wh }),
    ]);

    return `### MARKETING & SOCIAL MEDIA
- Social accounts connected: ${accounts}
- Social posts: ${posts} | Campaigns: ${campaigns} | Templates: ${templates}`;
  } catch { return "### MARKETING\n- Data unavailable"; }
}

async function getEducationStats(cf: any): Promise<string> {
  try {
    const wh = cf.clinicId ? { clinicId: cf.clinicId } : {};
    const [categories, content, assignments, progress] = await Promise.all([
      (prisma as any).educationCategory.count({ where: wh }),
      (prisma as any).educationContent.count({ where: wh }),
      (prisma as any).educationAssignment.count({ where: wh }),
      (prisma as any).educationProgress.count(),
    ]);

    return `### EDUCATION MODULE
- Categories: ${categories} | Content items: ${content}
- Assignments: ${assignments} | Progress records: ${progress}`;
  } catch { return "### EDUCATION\n- Data unavailable"; }
}

async function getSystemInfo(): Promise<string> {
  try {
    const configs = await prisma.systemConfig.findMany({
      where: { key: { in: ["AI_DEFAULT_PROVIDER", "GEMINI_MODEL", "ABACUS_API_KEY", "GEMINI_API_KEY"] } },
      select: { key: true, value: true },
    });
    const m: Record<string, string> = {};
    for (const c of configs) m[c.key] = c.key.includes("KEY") ? (c.value ? "✓ configured" : "✗ missing") : (c.value || "not set");

    return `### SYSTEM CONFIG
- AI Provider: ${m["AI_DEFAULT_PROVIDER"] || "auto (Abacus RouteLLM)"}
- Abacus API Key: ${m["ABACUS_API_KEY"] || "not set"}
- Gemini API Key: ${m["GEMINI_API_KEY"] || "not set"}
- Gemini Model: ${m["GEMINI_MODEL"] || "gemini-2.0-flash"}`;
  } catch { return "### SYSTEM CONFIG\n- Data unavailable"; }
}

/**
 * Fetch detailed data for a specific entity (on-demand).
 */
export async function fetchEntityData(entityType: string, _query?: string): Promise<string> {
  try {
    switch (entityType) {
      case "patients_list": {
        const patients = await prisma.user.findMany({
          where: { role: "PATIENT" }, take: 50, orderBy: { createdAt: "desc" },
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, createdAt: true },
        });
        return JSON.stringify(patients, null, 2);
      }
      case "appointments_upcoming": {
        const appts = await (prisma as any).appointment.findMany({
          where: { dateTime: { gte: new Date() }, status: "CONFIRMED" },
          take: 20, orderBy: { dateTime: "asc" },
          include: { patient: { select: { firstName: true, lastName: true } }, therapist: { select: { firstName: true, lastName: true } } },
        });
        return JSON.stringify(appts, null, 2);
      }
      case "articles_all": {
        const articles = await prisma.article.findMany({
          take: 50, orderBy: { createdAt: "desc" },
          select: { id: true, title: true, slug: true, published: true, createdAt: true, excerpt: true },
        });
        return JSON.stringify(articles, null, 2);
      }
      case "service_pages": {
        const pages = await (prisma as any).servicePage.findMany({ orderBy: { sortOrder: "asc" } });
        return JSON.stringify(pages, null, 2);
      }
      case "site_settings": {
        const settings = await prisma.siteSettings.findFirst();
        if (!settings) return "No site settings found";
        const { id, clinicId, ...rest } = settings as any;
        return JSON.stringify(rest, null, 2);
      }
      case "membership_plans": {
        const plans = await (prisma as any).membershipPlan.findMany({ orderBy: { price: "asc" } });
        return JSON.stringify(plans, null, 2);
      }
      case "treatment_types": {
        const types = await prisma.treatmentType.findMany({ orderBy: { name: "asc" } });
        return JSON.stringify(types, null, 2);
      }
      default:
        return `Unknown entity type: ${entityType}`;
    }
  } catch (err: any) {
    return `Error fetching ${entityType}: ${err.message}`;
  }
}
