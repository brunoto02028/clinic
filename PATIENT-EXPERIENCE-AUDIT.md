# Patient Experience Audit — BPR Rehab Portal
> Generated: 2026-02-24

---

## 1. LANGUAGE AUDIT (PT-BR / EN-GB)

### FIXED (this session)
| Page/Component | Issue | Status |
|---|---|---|
| `plans/page.tsx` | 15+ hardcoded English strings | **FIXED** — all using i18n now |
| `quiz/page.tsx` | 14+ hardcoded English strings | **FIXED** — all using i18n now |
| `patient-dashboard.tsx` | Inline locale check for "Recovery Ring" | **FIXED** — using `T("ring.title")` |
| `daily-mission.tsx` | "TODAY'S MISSION", "completed", "View All" hardcoded | **FIXED** — using i18n |
| `lib/i18n.ts` | Missing keys for plans, quiz, journey, marketplace, community, education, records, ring, mission, onboarding, journeyBar, membershipOffer | **FIXED** — 50+ new keys added |

### ALREADY CORRECT (using i18n)
| Page/Component | Notes |
|---|---|
| Patient Dashboard Home | Full i18n via `useLocale` + `T()` |
| Blood Pressure page | Extensive i18n (100+ keys) |
| Exercises page | Full i18n |
| Treatment Plan page | Full i18n |
| Screening form | Full i18n |
| Consent page | Full i18n |
| Profile page | Full i18n |
| Appointments page | Uses i18n via component |
| Body Assessments page | Full i18n |
| Documents page | Full i18n |
| Membership page | Full i18n |
| Scans page | Full i18n |
| Module Gate | Full i18n |
| Assessment Gate | Full i18n |
| Dashboard Layout / Sidebar | Full i18n |

### REMAINING (minor — components with some hardcoded strings)
| Component | Hardcoded Strings | Priority |
|---|---|---|
| `bpr-journey-bar.tsx` | Level labels, XP, streak | Low (already uses useLocale for most) |
| `onboarding-wizard.tsx` | Step labels | Low (already uses useLocale for most) |
| `membership-offer-banner.tsx` | CTA text | Low |
| `lib/journey.ts` | Quiz questions + archetype names/descriptions | Medium — these are content, may need backend i18n |
| `components/records/patient-records.tsx` | Some labels | Low |

### PORTUGUESE QUALITY
- All PT-BR translations are **natural and correct** — no machine-translation artifacts
- Medical terminology is properly adapted (e.g., "Pressão Arterial", "Triagem Médica", "Protocolo de Tratamento")
- Formal register ("você") is consistent throughout
- NHS-specific references kept as-is where relevant (e.g., "NHS 111", "999")

### ENGLISH QUALITY  
- UK English spelling used throughout (e.g., "personalised", "programme", "analyse")
- Medical terminology is professional and patient-friendly
- No grammar or spelling errors found

---

## 2. FUNCTIONALITY CHECKLIST

### WORKING
| Feature | Status | Notes |
|---|---|---|
| Patient login | ✅ | Single login page, auto-redirect by role |
| Dashboard home | ✅ | Stats, quick actions, recovery ring, daily missions |
| Sidebar navigation | ✅ | All items visible, locked items show lock icon |
| Consent gate | ✅ | Blocks until terms accepted, skipped during impersonation |
| Module gate | ✅ | Shows locked screen for restricted modules |
| Medical screening | ✅ | Full form with red flags, saves to DB |
| Profile page | ✅ | Edit name, phone, address, language, password |
| Appointments list | ✅ | Upcoming/past tabs |
| Book appointment | ✅ | Booking flow |
| Blood pressure | ✅ | Camera PPG + manual entry, history chart |
| BP weekly reminder | ✅ | Toggle on/off |
| Treatment plan | ✅ | Protocol items, mark complete, video links |
| Payment gate | ✅ | Stripe checkout for treatment packages |
| Exercises | ✅ | Prescribed exercises with video, mark complete |
| Education content | ✅ | Articles/videos from admin |
| Body assessments | ✅ | Self-capture, view results/scores |
| Foot scans | ✅ | View reports |
| Documents | ✅ | Upload/download, take photo |
| Clinical notes | ✅ | View SOAP notes |
| Membership/plans | ✅ | View plans, subscribe (Stripe) |
| Quizzes | ✅ | Take assigned quizzes |
| Bio-Check quiz | ✅ | Recovery archetype quiz + XP |
| Achievements | ✅ | Badges, XP tracking |
| Journey page | ✅ | Progress, missions, marketplace |
| Marketplace | ✅ | Browse products, checkout |
| Community | ✅ | Community features |
| Impersonation | ✅ | Admin sees exact patient view, all 26 APIs updated |
| Impersonation banner | ✅ | Blue bar with "Voltar ao Admin" |
| Impersonation sign-out | ✅ | Redirects to admin, doesn't log out |
| i18n toggle | ✅ | PT-BR / EN-GB switch in sidebar |
| Onboarding wizard | ✅ | Step-by-step new patient guide |
| Cancellation policy | ✅ | Viewable page |
| Email notifications | ✅ | Welcome, appointment, BP alerts, consent |

### POTENTIAL ISSUES TO MONITOR
| Feature | Concern | Priority |
|---|---|---|
| Stripe in impersonation | Write APIs blocked (403) — admin can't pay on behalf of patient | Low — by design |
| Quiz questions language | Questions in `lib/journey.ts` are English-only | Medium — need locale-aware questions |
| Archetype names/descriptions | From `lib/journey.ts`, English-only | Medium |
| Daily mission task labels | Generated server-side, language depends on generation | Medium |

---

## 3. IDEAS FOR AN AMAZING PATIENT EXPERIENCE

### A. ENGAGEMENT & GAMIFICATION
1. **Streak Calendar** — Visual calendar showing consecutive days the patient logged in or completed tasks. Similar to GitHub contribution graph. Motivates daily usage.
2. **Weekly Summary Email** — Auto-send a personalized weekly report: "You completed 5 exercises, your BP average was 120/78, you're 3 sessions away from your goal."
3. **Progress Photos Timeline** — Let patients take periodic selfies/body photos to visually track their physical transformation over weeks/months. Before/after slider.
4. **Celebration Animations** — When a patient completes a milestone (all exercises done, 7-day streak, treatment complete), show confetti animation + congratulatory message.
5. **Leaderboard (opt-in)** — Anonymous leaderboard showing patient rankings by XP. Motivates friendly competition. "Top 10 most active patients this month."

### B. EDUCATION & CONTENT
6. **Daily Health Tip** — Show one rotating health tip on the dashboard each day. Related to their condition. "Did you know? Walking 30 minutes daily reduces knee pain by 40%."
7. **Video Exercise Library with Timer** — When patient watches prescribed exercise video, show a built-in timer/counter. "Do 3 sets of 12 reps — Start Timer."
8. **Condition-Specific Learning Paths** — Curated sequences of educational content based on patient's diagnosis. "Knee Rehabilitation: Week 1 — Understanding Your Injury."
9. **AI Health Chat** — Patient can ask health questions to an AI assistant (using Abacus/RouteLLM). "Is it normal to feel soreness after exercises?" — gives evidence-based answers with disclaimer.
10. **Recipe & Nutrition Tips** — Anti-inflammatory diet tips, recovery nutrition guides. "5 Foods That Speed Up Recovery."

### C. COMMUNICATION & SUPPORT
11. **In-App Messaging** — Direct chat with therapist. Patient can ask quick questions, share photos of swelling/bruising, get reassurance between appointments.
12. **Voice Notes** — Patient records a voice message about how they're feeling today. Transcribed and saved to clinical notes. Easier than typing.
13. **Appointment Prep Checklist** — Before each appointment, show: "Bring: comfortable clothes, list of medications, previous scan results. Arrive 10 min early."
14. **Post-Appointment Summary** — After each session, therapist sends a quick summary: "Today we worked on X. Your homework is Y. Next session we'll focus on Z."

### D. HEALTH MONITORING
15. **Pain Journal** — Daily pain level tracker (1-10 scale + body map). Charts pain trends over time. Therapist sees patterns.
16. **Sleep Quality Tracker** — Simple daily log: "How did you sleep? How many hours?" Correlates with recovery progress.
17. **Mood & Wellbeing Check-in** — Quick daily emoji check-in. Data helps therapist understand mental state alongside physical recovery.
18. **Smart Reminders** — "Time for your exercises!" / "Don't forget to take your BP reading this week" / "Your appointment is tomorrow at 3pm."
19. **Wearable Integration** — Connect Apple Health / Google Fit to auto-import steps, sleep, heart rate data.

### E. PERSONALIZATION
20. **Customizable Dashboard** — Let patients rearrange dashboard cards. Some prefer BP front and center, others want exercises first.
21. **Preferred Name** — Allow patients to set a nickname. "Welcome back, Junior!" instead of formal name.
22. **Dark Mode** — Patient can toggle dark theme for evening/night usage.
23. **Notification Preferences** — Granular control: "Email me about appointments, WhatsApp me exercise reminders, no marketing."
24. **Recovery Milestones Wall** — Visual timeline of all achievements: first appointment, screening complete, 10 exercises done, BP normalized, treatment finished.

### F. TRUST & PROFESSIONALISM
25. **Therapist Profile Card** — Show therapist's photo, qualifications, specialties on patient dashboard. Builds trust.
26. **Treatment Progress Report (PDF)** — Patient can download a professional PDF summary of their entire treatment journey. Useful for insurance, other doctors.
27. **Referral Program** — "Refer a friend and both get 10% off next session." Simple link sharing.
28. **Testimonial Request** — After successful treatment completion, gently ask: "Would you like to share your experience? Your feedback helps others."

### PRIORITY IMPLEMENTATION ORDER
1. **Daily Health Tip** (quick win, high engagement)
2. **Pain Journal** (high clinical value)
3. **Smart Reminders / Push Notifications** (retention booster)
4. **Progress Photos Timeline** (visual motivation)
5. **Celebration Animations** (delight factor)
6. **Weekly Summary Email** (re-engagement)
7. **In-App Messaging** (patient-therapist communication)
8. **AI Health Chat** (differentiator, uses existing Abacus integration)

---

## 4. DEPLOYMENT STATUS

- **Production**: https://bpr.rehab — All changes deployed
- **i18n**: 960+ translation keys covering PT-BR and EN-GB
- **Impersonation**: Fully functional with 26 patient APIs audited
- **Git**: Local commit done, awaiting remote URL for push
