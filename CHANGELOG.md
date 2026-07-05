# Changelog

All notable changes to the BPR Clinical System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [2.7.0] - 2026-07-05

### Fixed
- **Admin patient page — Upload bug (root cause)**: the Upload/Write Clinical History forms were rendered inside the "Resumo" tab only. Clicking "+ Upload" from the "Documentos" tab toggled state but showed nothing. Forms now render above the tabs (visible from any tab); all document buttons switch to the Documentos tab.
- **`/get-the-app` redirected to login** — added to `publicRoutes` in `middleware.ts`.
- **MLS Laser service page showed raw i18n keys** (`svc.mlsLaser`, `svc.mlsLaserDesc`) — 4 missing keys added to `lib/i18n.ts` (also `svc.kinesiotherapy` pair).
- **mls-laser related-link loop** — `laser-shockwave` redirects back to `mls-laser`; replaced in related services.

### Added
- **Chat attachments (clinic ↔ patient)** — paperclip in both composers (`app/dashboard/questions/page.tsx` patient side, `components/admin/patient-messages-tab.tsx` admin side). Images render inline; other files as download cards.
  - New fields on `ClinicMessage`: `attachmentUrl`, `attachmentName`, `attachmentType`
  - Both message APIs accept `multipart/form-data` (with JSON fallback for text-only)
  - `lib/chat-attachment.ts` — shared helper: saves file + auto-registers it as `PatientDocument` with new `source=CHAT_UPLOAD`, so chat files appear in the patient's Documents section (single source of truth)
- **Patient language toggle (EN | PT)** — patient sidebar footer; persists to `User.preferredLocale` via `PATCH /api/patient/profile`. `notifyPatient` already sends comms in patient's locale.
- **Unified documents flow (admin)** — "Documents" header button opens the Documentos tab (no separate page navigation); Resumo quick actions jump to the tab.

### Changed
- **Upload file types broadened everywhere** (admin docs, patient docs, chat): any `image/*` + PDF, Word, TXT, CSV — 25MB max.
- **Contextual back navigation** — admin patient detail and permissions pages use real history back (fallback to sensible route) instead of hardcoded `router.push`.
- **Public service pages audit** — removed all "coach/coaching" wording (→ practitioner/programme/guidance/consultations), "20+ years" → "15+ Years of Clinical Experience" on `/biohacking` (4 spots), fixed self-referencing links. All 17 public footer links verified 200 in production.
- **Header/footer unification** — all public pages share the homepage `SiteHeader`/`SiteFooter` (from previous session, deployed today).

---

## [2.6.0] - 2026-07-03

### Added
- **Public Schedule API** — `/api/public/schedule` (no auth required)
  - Reads live data directly from `TherapistAvailability` DB table
  - Always returns all 7 days — missing days default to `closed: true`
  - Cache-Control header: `s-maxage=300` (5 min CDN cache)
  - Middleware updated: `/api/public` added to public routes list
  - Any change saved in **Admin → Schedule → Availability** reflects on the public site within 5 minutes

### Changed
- **Homepage redesign** (`components/landing-page.tsx`)
  - Terminology: all "physiotherapy / fisioterapia" references replaced with "physical rehabilitation / reabilitação física" throughout text, alt tags, and meta copy
  - Removed old sections: Portal, Services grid, MLS feature block, Insoles, Bio, Thermo, How It Works
  - Added **The Method** section — 4-phase patient journey (Assessment → Plan → Treatment → Performance)
  - Added **Differentiators** section — narrative-driven "We don't sell sessions. We deliver results."
  - Hero CTA updated to "Start Your Programme / Começar o Programa"
  - Navigation anchors updated: `#method`, `#equipment`, `#about`, `#contact`
  - `validImg()` guard added — filters out ephemeral `/uploads/` paths from Render's filesystem
  - All settings-based images switched from Next.js `<Image>` to plain `<img>` to avoid optimization-layer failures with internal API URLs
  - MLS fallback paths removed (no longer reference `/uploads/`)

- **Contact Section** (live opening hours)
  - Fetches from `/api/public/schedule` on mount — replaces static `businessHoursJson` parsing
  - 7-day table: today highlighted with animated dot + "Today" label, closed days in red
  - Fallback: Mon–Sat 09:00–18:00, Sunday closed (shown when no DB records exist)
  - Hint text: "Set hours in Admin → Schedule → Availability"

- **Footer** (4-column rich layout)
  - Col 1: Brand logo, tagline, social links
  - Col 2: Navigation links (The Method, Technology, About Bruno, Articles, Contact)
  - Col 3: Contact details from settings (address, phone, email)
  - Col 4: Opening hours — same live data as contact section, today highlighted in bold
  - Bottom bar: copyright + Patient Portal / Staff Portal links

- **Fixed navigation header**
  - `landing-page.tsx`: changed from `sticky top-0` → `fixed top-0 left-0 right-0` + spacer `div.h-16.md:h-20` after header
  - `components/site-header.tsx`: same `fixed` treatment + spacer wrapped in React fragment

- **SiteHeader** (`components/site-header.tsx`) — used on `/login`, `/signup`, and all public sub-pages
  - Old links removed: Services dropdown, Insoles (`/#insoles`), Biohacking (`/biohacking`), Help (`/help`)
  - New links: The Method (`/#method`), Technology (`/#equipment`), Articles (`/articles`), About (`/#about`), Contact (`/#contact`)
  - Bilingual labels inline (EN/PT) — no longer depends on `T()` translation function
  - Removed unused imports: `ChevronDown`, `Shield`, `ServiceLink` interface, `serviceLinks` state, `/api/service-pages` fetch

### Technical
- Commits: `403b816`, `ba92801`, `442bf64`
- Files changed: `components/landing-page.tsx`, `components/site-header.tsx`, `middleware.ts`, `app/api/public/schedule/route.ts` (new)

---

## [2.5.0] - 2026-02-26

### Fixed
- **Dark Theme Audit** — Comprehensive fix of 100+ light-theme elements across all patient dashboard pages
  - Replaced hardcoded white/gray/slate backgrounds with dark-compatible alternatives
  - Fixed illegible text colors (slate-800, amber-800, etc.) with proper dark-theme variants
  - Fixed white gradients in onboarding wizard, membership banner, journey hero
  - Fixed medical screening form (bg-slate-50, bg-amber-50, text-slate-800)
  - Fixed therapist dashboard (25 light-theme matches)
  - Fixed blood pressure page (NHS card, readings list, practice mode, device warnings)
  - Fixed treatment, marketplace, membership, consent, education, cancellation-policy pages

### Added
- README.md with bilingual documentation, badges, and setup instructions
- LICENSE (MIT)
- CHANGELOG.md
- CONTRIBUTING.md
- docs/architecture.md
- docs/api-reference.md
- .eslintrc.json and .prettierrc configuration files

---

## [2.4.0] - 2026-02-25

### Added
- **Blood Pressure Monitor** — PPG camera-based blood pressure estimation
  - Real-time PPG signal processing via rear camera + flash LED
  - Practice mode for first-time users
  - Rhythm analysis (AFib detection, tachycardia, bradycardia)
  - NHS/GP recommendation cards
  - BP categories legend with color-coded ranges
  - Reading history with expandable waveform charts
  - Multi-measurement averaging with confidence scoring

### Fixed
- VPS port migration from 4002 to 4010 (conflict with codeexit Docker container)

---

## [2.3.0] - 2026-02-24

### Added
- **Membership & Subscription System**
  - Stripe-powered subscription plans with module permissions
  - Patient membership page with plan comparison
  - Cancellation policy page
  - Module gate (lock screen for unauthorized features)
  - Membership offer banner on patient dashboard
- **WhatsApp Business Integration**
  - Send text, template, and AI-generated messages
  - Webhook for incoming messages and status updates
- **Impersonation System** — Admin can view patient portal as any patient (read-only)

---

## [2.2.0] - 2026-02-23

### Added
- **Gamification System**
  - XP, levels, daily missions, achievements
  - Recovery ring progress visualization
  - Community leaderboards and challenges
  - BPR Journey bar with avatar stages
- **Marketplace** — Product catalog with BPR credits, level discounts, cart, Stripe checkout
- **Quizzes** — Health knowledge quizzes with XP rewards and difficulty levels

---

## [2.1.0] - 2026-02-22

### Added
- **Body Assessment Module**
  - MediaPipe BlazePose real-time pose detection
  - Multi-angle guided capture (front/back/left/right)
  - AI-powered posture and symmetry analysis
  - SVG body map with motor points
- **Foot Scan System**
  - 14-angle guided camera capture
  - Gemini Vision AI biomechanical analysis
  - 3D procedural foot model viewer
  - Printable clinical report
  - Scan comparison (before/after)

---

## [2.0.0] - 2026-02-20

### Added
- **Patient Portal** — Full patient-facing dashboard
  - Treatment plans with phase-based protocols
  - Exercise tracking with completion toggles
  - Educational content (video/article) library
  - Medical screening with red flag detection
  - Document upload and viewing
  - Profile management with language preference
  - Consent and terms acceptance
- **Bilingual Email System** — 15 templates in EN-GB and PT-BR
- **Staff Login** — Separate authentication portal for clinic staff
- **Email Verification** — 6-digit code via Email/SMS/WhatsApp
- **Permission System** — Role-based API and sidebar access control

---

## [1.0.0] - 2026-02-15

### Added
- Initial release
- Admin dashboard with patient management
- Appointment scheduling system
- Clinical notes and treatment protocols
- Email system (SMTP + IMAP)
- Social media management (Instagram)
- Media library
- Site settings and customization
- Stripe payment integration
