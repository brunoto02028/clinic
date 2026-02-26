# Changelog

All notable changes to the BPR Clinical System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
