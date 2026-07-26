---
description: Pre-work sync check — confirm local code, GitHub and the database all match before starting any new change (critical for multi-PC workflow)
---

# Sync Check — run BEFORE starting any new task

Purpose: the user works from more than one machine. Before making any change,
verify that local code, GitHub, the database, and the live Render deploy are
all aligned — so no work is based on stale/wrong state.

## 1. Git — local vs GitHub

// turbo
1. Run `git status --short` in the repo root.
   - If there are uncommitted changes: STOP and ask the user what to do
     (commit, stash, or discard) before continuing. Never discard silently.

// turbo
2. Run `git fetch origin main` then compare:
   ```bash
   git rev-parse HEAD
   git rev-parse origin/main
   ```
   - **Local == origin/main** → in sync, proceed.
   - **Local BEHIND origin/main** → another machine pushed changes this
     machine hasn't pulled. Run `git pull origin main` before doing anything
     else (do this automatically, it's a safe fast-forward in the normal
     case).
   - **Local AHEAD** → there are unpushed local commits. Tell the user and
     ask if they want to push now.
   - **DIVERGED** → STOP, surface this clearly to the user, do not attempt
     to auto-merge.

## 2. Database — `.env` must point to the single source of truth

// turbo
3. Check the active `DATABASE_URL`:
   ```bash
   grep -n "^DATABASE_URL" .env
   ```
   - Expected host: `dpg-d8mgpurbc2fs73dvc160-a.frankfurt-postgres.render.com`
     (Render production Postgres — `bpr_clinic` DB). This is intentional:
     local dev reads/writes the SAME database as production so previews
     never show stale or deleted content.
   - If it points anywhere else (old Railway `interchange.proxy.rlwy.net`,
     or a local Postgres like `bpr_clinic_local`), warn the user — this
     means local preview will NOT match what's live.
   - **NEVER run `prisma db push`, `prisma migrate`, seed scripts, or any
     data-mutating script while `DATABASE_URL` points at production.**

## 3. Local dev server — must be freshly started after any `.env` change

4. If `DATABASE_URL` (or any env var) was just changed, a Next.js hot-reload
   of `.env` is NOT enough — `lib/db.ts` caches a Prisma singleton on
   `globalThis` bound at process start.
   // turbo
   ```bash
   lsof -ti:3000 | xargs kill -9 2>/dev/null; echo done
   ```
   Then start `npm run dev` again as a fresh process.

## 4. Render deploy — confirm the live site matches GitHub main

5. After any `git push origin main`, Render auto-deploys via webhook
   (usually 2–4 min). To confirm the live site is actually running the
   pushed commit (not still building or failed):
   - Note the `timestamp` from `https://bpr.rehab/api/version` BEFORE the
     push.
   - Wait ~3 minutes after pushing, then fetch `/api/version` again — the
     `timestamp` should have changed.
   - If it hasn't changed after 5+ minutes, check the Render dashboard
     (or use `check_deploy_status` if a `windsurf_deployment_id` exists)
     for build failures.

## Summary — when to run this

Run steps 1–2 automatically at the start of any session where the user
asks for code changes, especially if:
- meaningful time has passed since the last session,
- the user mentions working from a different machine,
- before any `git push` to `main`.

Run step 3 any time `.env` is edited.
Run step 4 after every push, to confirm the deploy actually landed.
