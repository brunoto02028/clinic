# Beyond Pain — Book Launch Module (Spec for Devin)

**Audience:** Devin (implementation) · **Owner:** BPR (bpr.rehab), Ipswich
**Prepared:** 31 July 2026
**Language:** The book and its public identity are **British English first**. A Portuguese version of the site/book comes later (see §6). Use British English spelling throughout (e.g. "programme", "realise", "colour").

## 0. Goal & context
Bruno is writing a book. We want to **build an audience for it now — months before launch** — by turning the existing bpr.rehab study-centre traffic into a book mailing list, nurturing that list while the book is written, and then selling to a warmed-up audience on launch.

This module **reuses the existing lead-magnet system** already specified for the site (the `Lead` / `LeadEvent` Prisma models, Supabase Storage delivery, double opt-in, GDPR consent). It adds a book-specific magnet, a landing page, and CTAs. Do **not** rebuild the capture system — extend it.

**Working book identity (Bruno to finalise):**
- **Title:** *Beyond Pain*
- **Subtitle:** *The science and soul of healing — body, soul and spirit*
- **Positioning:** Pain is rarely only physical. It speaks the language of the body, the soul and the spirit — and real healing must meet all three. Grounded in the science of pain and a faith that takes the whole person seriously.

Build three things: (1) a book landing page, (2) a free-chapter lead magnet, (3) the integration/CTAs + launch switch.

---

## 1. Book landing page  →  `/beyond-pain`

A dedicated page whose single job (pre-launch) is to capture emails onto the book list. Use the copy below (British English).

**Sections & copy:**

**Hero**
- Eyebrow: `A NEW BOOK · COMING SOON`
- H1: `Beyond Pain`
- Subtitle: `The science and soul of healing — body, soul and spirit.`
- Intro line: `Most of us are taught that pain lives in the body. The truth is bigger — and far more hopeful.`
- Primary CTA button: `Read the first chapter free` → scrolls to / opens the email capture (§2).

**What the book is about**
> Pain is rarely only physical. It speaks the language of the body, the mind and the spirit — and lasting healing has to meet all three. Drawing on the science of how pain really works, alongside a faith that takes the whole person seriously, *Beyond Pain* is a guide out of suffering and into wholeness. It is being written now, chapter by chapter — and you can follow the journey from the start.

**About the author**
> Written by Bruno [surname], a sports and clinical therapist in Ipswich and a former professional footballer who came back from three knee surgeries. *"My purpose is simple: to treat every person the way I wish I'd been treated during my own recovery — with real attention, not just protocol."*

**Join the list (the core conversion block)**
- Heading: `Read Chapter One free — and follow the book as it's written`
- Body: `Join the list to read the opening chapter today, get behind-the-scenes insights as each chapter is written, and be first to know when the book launches — with a special early-reader price.`
- Form: email + explicit unticked GDPR consent checkbox → button `Send me Chapter One`.
- Under the form, 3 ticks:
  - `The first chapter — free, today.`
  - `Behind-the-scenes insights while the book is written.`
  - `Early access and a launch-day discount.`

**Footer note:** medical disclaimer line (reuse site standard) + link back to the study-centre articles.

**Acceptance:**
- `/beyond-pain` renders the above with the email-capture block wired to the flow in §2.
- Page has its own SEO meta + `Book`/`WebPage` schema; mobile-first; matches BPR brand (Ink/Moss/Sage/Bone).
- No pricing/checkout yet (pre-launch) — that arrives via the launch switch (§4).

---

## 2. Free-chapter reader — gated HTML (not a PDF)

Instead of a downloadable PDF, the free first chapter is a **gated HTML page** on the site (e.g. `/beyond-pain/chapter-one`). The reader gives their email; after confirming, the chapter unlocks and is read **on the site**. This keeps the lead, keeps the reader on bpr.rehab, lets BPR update the text anytime, and gives control and analytics.

- **Content:** Chapter One (working title *"Pain From the Inside"*), supplied by BPR as HTML/Markdown, rendered in a clean, branded reader (Ink/Moss/Sage/Bone) with a soft CTA at the end (follow the journey / book an assessment).
- **Gate & unlock flow (server-side — important):**
  1. On the chapter page, an unauthenticated visitor sees the title, the intro and the email-capture form — **not** the chapter body.
  2. On submit → create a `Lead` (`source = "book"`, `cluster = "book"`) + **double opt-in** email. Do not unlock yet.
  3. The confirmation email contains a **magic link** (a signed, expiring token tied to that email). Clicking it verifies the address and **unlocks** the chapter: the server sets an authenticated session/cookie and renders the full chapter for that reader.
  4. Returning confirmed readers keep access via their session (or by re-requesting a magic link). Access is tied to a confirmed email, so **BPR always keeps the lead**.
- **Why server-side gating matters:** if the chapter is merely hidden with CSS/JS and revealed on submit, anyone can read it via "view source" or by disabling JavaScript — and you may not capture a real email. Render the chapter body **only after** the server has confirmed the email; the chapter HTML must not be present in the initial page payload for locked visitors.
- **Data:** reuse the existing `Lead` / `LeadEvent` models; log `captured` → `confirmed` → `unlocked`. Segment by `source = "book"`.
- **SEO note:** gated content is not indexed by Google — fine for a lead magnet. Keep the *landing page* (`/beyond-pain`) public and indexable; keep the chapter body behind the gate.

### 2.1 Book nurture sequence (email)
- Email 1 (immediate): deliver Chapter One + one line on what the book is about.
- Email 2 (+3 days): a "behind the scenes" insight (e.g. one of the book's surprising findings) + invite to reply with their own pain story.
- Email 3 (+7 days): the triune idea (body, soul, spirit) in brief; what's coming.
- Then: an occasional "build in public" broadcast as chapters are written (manual sends by BPR).
- Every email: one-click unsubscribe (logs `unsubscribed`).

**Acceptance:**
- Confirmed book subscribers receive the Chapter One PDF and enter the book sequence, tagged `source = "book"`.
- Admin can see book-list size and funnel (captured → confirmed → unlocked → [later] purchased).

### 2.3 Content protection (be realistic)

BPR asked how to stop people copying the chapter/book. Honest answer up front: **you cannot fully prevent copying of anything a browser displays.** Whatever renders on screen can be selected, "view-sourced", screenshotted or saved. No web method is 100%, and heavy-handed attempts hurt real readers. The realistic goal is to **deter casual copying and make any leak traceable** — and, for a *free* chapter, remember that some sharing is good marketing (it brings more sign-ups). Layer these in order of value:

1. **Gate the content (biggest lever).** Never render the chapter to anyone who hasn't confirmed an email (§2). This alone stops most casual copying and captures the lead.
2. **Per-reader watermark (best deterrent for a book).** On the gated page, stamp the reader's own email (and/or a unique code) into the text — a faint repeating background watermark plus a footer line: *"Licensed to name@email — please don't share."* It doesn't block copying, but it makes leaks **traceable**, which is what actually discourages sharing.
3. **Light friction (weak, optional).** Disable right-click and text selection on the reader (`user-select: none`; block copy/context-menu events). A speed bump for casual copy-paste; trivially bypassed by determined users — do not rely on it.
4. **Serve in chunks / paginate.** Render the chapter in a paginated reader that loads section by section rather than dumping the whole text in one payload — makes bulk scraping a little harder.
5. **Copyright + terms.** A visible copyright line and a short terms-of-use ("personal use; no redistribution") give legal footing.

**For the paid full book (later):** rely on the ebook platform's own protection (Amazon KDP applies its DRM); for any direct on-site sale, put the paid content behind a real login **with per-user watermarking** — the same traceability principle, which for books deters sharing better than any copy-blocker. Do **not** invest in heavy custom DRM; it is routinely broken and punishes honest readers.

---

## 3. Integration — turn the study centre into a funnel

- **Article CTAs:** at the foot of the articles that map most closely to the book, add a book-capture block: *"This is part of a bigger story. Read the first chapter of Beyond Pain, free."* Priority articles: persistent pain, chronic low back pain, HRV/recovery, sleep, and the tendinopathy/knee pieces.
- **Site-wide:** a discreet nav/footer link to `/beyond-pain`.
- **Home:** a small "Coming soon: Beyond Pain" strip linking to the page (optional).

**Acceptance:** the book CTA appears on the designated articles, driven by a config flag (easy to add/remove per article), feeding the same book list.

---

## 4. Launch switch (build now, flip later)

Design `/beyond-pain` so it can move through three states via a single config value (`BOOK_STATUS`):
1. `pre_launch` (now): "Join the list / read Chapter One free".
2. `waitlist` (closer to launch): adds "Join the waitlist for launch-day pricing"; capture stays the same, messaging changes.
3. `on_sale`: replaces the capture CTA with **buy options** — link to the chosen sales channel (Amazon KDP and/or a direct sale on bpr.rehab), plus formats (ebook / paperback). Direct sale on-site gives BPR the best margin; Amazon gives reach.

**Acceptance:** flipping `BOOK_STATUS` changes the page's primary CTA and copy without a code change beyond the config value; purchase links configurable.

---

## 5. Cross-cutting
- Reuse the existing **GDPR** consent framework for all forms (do not rebuild).
- **Analytics:** track page views, capture rate, confirmation rate, and (post-launch) purchases; attribute which articles drive the most book sign-ups.
- Accessibility (WCAG AA), performance, mobile-first.
- Add `/beyond-pain` to the sitemap; `Book` + `FAQPage` (if an FAQ is added) schema.

---

## 6. Bilingual (English first, Portuguese later)
- **English is primary.** Build `/beyond-pain` (and the whole book identity) in British English first.
- **Portuguese later:** plan for a mirror page at `/pt/beyond-pain` (or `/alem-da-dor`) for the Portuguese edition, with its own list segment (`source = "book_pt"`) and its own free-chapter PDF. Use `hreflang` tags between the two so Google serves the right language.
- Keep the two lists separate so English and Portuguese launches can be run independently to their own audiences (UK/international vs the Lusophone/Brazilian community).

---

## 7. Build order
1. `/beyond-pain` page + email capture wired to the existing lead system (`source = "book"`), double opt-in, Chapter One delivery.
2. Book nurture sequence + admin segmentation.
3. Article CTAs (config-flagged) + nav/footer link.
4. Launch switch (`BOOK_STATUS`) with configurable buy links.
5. (Later) Portuguese mirror + hreflang.

## 8. Assets BPR will supply
- Final book title/subtitle (working: *Beyond Pain — The science and soul of healing*).
- The **Chapter One PDF** in British English (branded).
- Author name + headshot for the About block.
- Chosen sales channel(s) for launch (Amazon KDP and/or direct on-site).
