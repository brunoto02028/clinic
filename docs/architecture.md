# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────┐
│                   Client (Browser)               │
│  ┌─────────────┐  ┌──────────────┐              │
│  │ Patient Portal│  │ Admin Dashboard│             │
│  │  /dashboard/* │  │  /admin/*     │             │
│  └──────┬───────┘  └──────┬───────┘              │
└─────────┼──────────────────┼────────────────────┘
          │                  │
          ▼                  ▼
┌─────────────────────────────────────────────────┐
│              Next.js App Router (SSR + API)       │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ API Routes│  │ Middleware│  │ Auth (NextAuth)│  │
│  │ /api/*    │  │ (JWT)    │  │ (Credentials) │  │
│  └─────┬────┘  └──────────┘  └──────────────┘   │
│        │                                          │
│  ┌─────┴──────────────────────────────────────┐  │
│  │              Service Layer                   │  │
│  │  ┌────────┐ ┌────────┐ ┌────────────────┐  │  │
│  │  │ Prisma │ │ Stripe │ │ AI (Gemini/OAI)│  │  │
│  │  │  ORM   │ │  API   │ │   Vision API   │  │  │
│  │  └───┬────┘ └────────┘ └────────────────┘  │  │
│  │      │      ┌────────┐ ┌────────────────┐  │  │
│  │      │      │  SMTP  │ │   WhatsApp     │  │  │
│  │      │      │ (Email)│ │  Business API  │  │  │
│  │      │      └────────┘ └────────────────┘  │  │
│  └──────┼─────────────────────────────────────┘  │
└─────────┼────────────────────────────────────────┘
          │
          ▼
┌─────────────────┐
│   PostgreSQL 16  │
│   (40+ models)   │
└─────────────────┘
```

## Key Design Decisions

### 1. App Router (Next.js 14)
All pages use the App Router with file-based routing. Server Components are used where possible, with `"use client"` directives for interactive components.

### 2. Dual-Portal Architecture
- **Patient Portal** (`/dashboard/*`) — Protected by NextAuth session + patient role
- **Admin Dashboard** (`/admin/*`) — Protected by NextAuth session + admin/therapist role
- **Middleware** (`middleware.ts`) — Handles route protection, impersonation, and redirects

### 3. Module Permission System
- `lib/module-registry.ts` defines 17 modules and 12 permissions
- Membership plans grant access to specific modules
- `ModuleGate` component enforces access at the page level
- `use-patient-access` hook checks permissions client-side

### 4. Internationalization
- `lib/i18n.ts` contains all translation strings (EN-GB / PT-BR)
- `useLocale()` hook reads from `localStorage` with broadcast channel sync
- Patient `preferredLocale` stored in DB, used for email templates

### 5. Dark Theme
- Global dark theme via Tailwind CSS
- All colors use semantic tokens: `text-foreground`, `bg-card`, `text-muted-foreground`
- Accent colors use opacity variants: `bg-amber-500/10`, `text-amber-400`, `border-amber-500/20`

### 6. Authentication
- NextAuth.js with Credentials provider
- JWT strategy with permissions embedded in token
- Impersonation system via httpOnly cookies
- `getEffectiveUser()` helper accounts for impersonation in all patient APIs

### 7. Payment Integration
- Stripe Checkout for one-time payments (treatment packages, marketplace)
- Stripe Subscriptions for membership plans
- Webhook handler at `/api/webhooks/stripe` for async event processing

## Database Schema (Key Models)

| Model | Purpose |
|-------|---------|
| `User` | Users (patients, therapists, admins) |
| `Clinic` | Multi-clinic support |
| `Appointment` | Scheduling and tracking |
| `TreatmentProtocol` | Treatment plans with phases |
| `TreatmentItem` | Individual exercises/tasks |
| `FootScan` | 3D foot scanning data |
| `BodyAssessment` | Posture analysis data |
| `BloodPressureReading` | BP measurements with PPG signal |
| `MedicalScreening` | Red flag questionnaire |
| `MembershipPlan` | Subscription plans |
| `PatientSubscription` | Active subscriptions |
| `MarketplaceProduct` | Products and services |
| `EducationalContent` | Videos, articles, guides |
| `Quiz` / `QuizAttempt` | Health knowledge quizzes |
| `DailyMission` | Gamification tasks |
| `Achievement` | Unlockable achievements |
| `EmailTemplate` | Templated email system |
| `SocialPost` | Social media management |

## Folder Conventions

- **Pages** → `app/[route]/page.tsx` (one page per route)
- **API Routes** → `app/api/[domain]/route.ts` (RESTful)
- **Components** → `components/[domain]/[component].tsx`
- **Hooks** → `hooks/use-[name].ts`
- **Utilities** → `lib/[name].ts`
- **UI Primitives** → `components/ui/[component].tsx` (shadcn/ui)
