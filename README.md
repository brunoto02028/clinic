<p align="center">
  <img src="/public/logo.png" alt="BPR Clinical System" width="120" />
</p>

<h1 align="center">BPR Clinical System</h1>

<p align="center">
  <strong>Full-stack clinical management platform for physiotherapy clinics</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#project-structure">Project Structure</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#api-reference">API Reference</a> •
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Stripe-Payments-635BFF?logo=stripe" alt="Stripe" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql" alt="PostgreSQL" />
</p>

---

## Overview

BPR Clinical System is a comprehensive web application designed for physiotherapy and rehabilitation clinics. It provides a dual-portal experience: an **Admin Dashboard** for clinic staff (therapists, admins) and a **Patient Portal** for patients to manage their treatment journey.

> 🇧🇷 **Português:** Sistema clínico completo para clínicas de fisioterapia e reabilitação. Inclui portal administrativo e portal do paciente com suporte bilíngue (EN-GB / PT-BR).

---

## Features

### Patient Portal
- **Treatment Plans** — View assigned exercises, track completion, follow phase-based protocols
- **Blood Pressure Monitor** — PPG camera-based estimation + manual cuff entry with NHS guidelines
- **Body Assessments** — AI-powered posture analysis with MediaPipe pose detection
- **Foot Scans** — 3D foot scanning with guided camera capture and AI biomechanical analysis
- **Gamification** — XP system, levels, daily missions, achievements, recovery ring
- **Educational Content** — Video/article library assigned by therapists
- **Quizzes** — Health knowledge quizzes with XP rewards
- **Community** — Leaderboards, challenges, social features
- **Marketplace** — Product recommendations with BPR credits system
- **Membership Plans** — Stripe-powered subscription management
- **Medical Screening** — Red flag questionnaire with professional review workflow
- **Documents** — Upload and view clinical documents
- **Bilingual UI** — Full EN-GB / PT-BR support via i18n system

### Admin Dashboard
- **Patient Management** — Full CRUD, clinical notes, treatment protocols
- **Appointment System** — Scheduling, status tracking, automated reminders
- **Clinical Analysis** — AI-powered report generation (Gemini/OpenAI)
- **Email System** — SMTP/IMAP integration, templated emails, inbox management
- **Membership Management** — Plan creation, module permissions, Stripe integration
- **Social Media** — Instagram publishing, AI caption generation, campaign management
- **Media Library** — Image bank with upload, categorization, and reuse
- **Financial Dashboard** — Revenue tracking, payment management
- **Role-based Access** — SUPERADMIN, ADMIN, THERAPIST permissions

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5 |
| **Database** | PostgreSQL 16 + Prisma 6 ORM |
| **Authentication** | NextAuth.js (Credentials + JWT) |
| **Styling** | Tailwind CSS 3 + shadcn/ui |
| **Payments** | Stripe (Checkout, Subscriptions, Webhooks) |
| **AI** | Google Gemini + OpenAI Vision |
| **Email** | Nodemailer (SMTP) + IMAP sync |
| **Messaging** | WhatsApp Business API (Meta Cloud) |
| **Pose Detection** | MediaPipe BlazePose |
| **3D Rendering** | Three.js |
| **Deployment** | VPS (PM2 + Nginx + Let's Encrypt) |

---

## Getting Started

### Prerequisites

- **Node.js** 18+ 
- **PostgreSQL** 16+
- **npm** or **yarn**

### Installation

```bash
# Clone the repository
git clone https://github.com/brunoto02028/clinic.git
cd clinic

# Install dependencies
npm install --legacy-peer-deps

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL, API keys, etc.

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed default data (optional)
npx prisma db seed

# Start development server
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random secret for JWT signing |
| `NEXTAUTH_URL` | Application URL (e.g., `http://localhost:3000`) |
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `OPENAI_API_KEY` | OpenAI API key (for Vision) |
| `SMTP_HOST` | Email SMTP host |
| `SMTP_PORT` | Email SMTP port |
| `SMTP_USER` | Email SMTP username |
| `SMTP_PASS` | Email SMTP password |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta WhatsApp phone number ID |
| `WHATSAPP_ACCESS_TOKEN` | Meta WhatsApp access token |

---

## Project Structure

```
├── app/
│   ├── admin/            # Admin pages (patients, appointments, scans, etc.)
│   ├── dashboard/        # Patient portal pages
│   ├── api/              # API routes
│   │   ├── admin/        # Admin-only API endpoints
│   │   ├── patient/      # Patient API endpoints
│   │   └── webhooks/     # Stripe, WhatsApp webhooks
│   ├── login/            # Patient login
│   ├── staff-login/      # Staff login
│   ├── signup/           # Patient registration
│   └── verify/           # Email/SMS verification
├── components/
│   ├── dashboard/        # Dashboard components (layout, widgets)
│   ├── screening/        # Medical screening form
│   ├── body-assessment/  # Body capture + body map
│   ├── scans/            # Foot scan components
│   ├── ui/               # shadcn/ui components
│   └── admin/            # Admin-specific components
├── hooks/                # Custom React hooks
├── lib/                  # Utilities, API clients, helpers
│   ├── auth-options.ts   # NextAuth configuration
│   ├── email.ts          # Email sending (Nodemailer)
│   ├── email-templates.ts # Templated email system
│   ├── gemini.ts         # Google Gemini AI client
│   ├── whatsapp.ts       # WhatsApp Business API
│   ├── module-registry.ts # Module/permission registry
│   ├── i18n.ts           # Internationalization
│   └── scan-utils.ts     # Foot scan utilities
├── prisma/
│   └── schema.prisma     # Database schema (40+ models)
├── public/               # Static assets
└── docs/                 # Documentation
```

---

## Deployment

### Production (VPS)

```bash
# Build for production
npm run build

# Start with PM2
pm2 start npm --name clinic -- start -- -p 4010

# Nginx reverse proxy recommended for SSL
```

### Environment

- **Domain:** Configured via Nginx with Let's Encrypt SSL
- **Process Manager:** PM2 for Node.js process management
- **Database:** PostgreSQL on same VPS or managed service

---

## API Reference

See [`docs/api-reference.md`](docs/api-reference.md) for detailed API documentation.

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/patient/profile` | Get patient profile |
| `GET` | `/api/patient/access` | Check module access |
| `POST` | `/api/medical-screening` | Submit medical screening |
| `GET` | `/api/patient/membership/plans` | List membership plans |
| `POST` | `/api/patient/membership/subscribe` | Subscribe to plan |
| `GET` | `/api/foot-scans` | List foot scans |
| `POST` | `/api/body-assessments/capture/[token]` | Submit body assessment |
| `GET` | `/api/patient/journey` | Get gamification progress |

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for guidelines.

---

## License

This project is licensed under the MIT License. See [`LICENSE`](LICENSE) for details.

---

<p align="center">
  Built with ❤️ by <a href="https://bpr.rehab">BPR Rehab</a>
</p>
