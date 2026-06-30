---
description: Project vault with all access credentials and infrastructure info for bpr.rehab
---

# BPR Clinic — Project Vault

> **⚠️ SENSITIVE — não partilhar publicamente**

---

## 🌐 URLs

| Item | URL |
|---|---|
| **Site público** | https://bpr.rehab |
| **Render URL** | https://clinic-1w3u.onrender.com |
| **Admin** | https://bpr.rehab/admin |
| **Render Dashboard** | https://dashboard.render.com |
| **GitHub** | https://github.com/brunoto02028/clinic |

---

## 🔐 Admin Login

| Campo | Valor |
|---|---|
| **Email** | admin@bpr.rehab |
| **Password** | Bruno@Admin2026! |
| **Role** | SUPERADMIN |
| **Login URL (local)** | http://localhost:3000/staff-login |
| **Login URL (prod)** | https://bpr.rehab/staff-login |

> ⚠️ **DB local**: usa PostgreSQL nativo Windows (porta 5432), NÃO o Docker. O Docker container `bpr-clinic-db-local` está activo mas não é usado pelo app. A senha `Bruno@Admin2026!` foi confirmada/resetada na DB local em Jun 2026.

---

## 🏗️ Infraestrutura (Render)

| Componente | Detalhes |
|---|---|
| **Web Service** | `clinic` — Starter plan — Frankfurt |
| **Service ID** | `srv-d8mh0lnlk1mc738m82ng` |
| **Database** | `bpr-clinic-db` — Free plan — Frankfurt |
| **Database ID** | `dpg-d8mgpurbc2fs73dvc160-a` |
| **DB name** | `bpr_clinic` |
| **DB user** | `bpr_clinic` |
| **DB password** | Ver Render Dashboard → bpr-clinic-db → Credentials |
| **Internal DB URL** | Ver Render Dashboard → bpr-clinic-db → Internal Connection String |
| **Render API Key** | Ver Render Dashboard → Account Settings → API Keys |
| **Render Owner ID** | Ver Render Dashboard → Account Settings |

> ⚠️ DB Free plan expira **13 de Julho 2026** — fazer upgrade para Basic ($6/mês) antes disso

---

## 🌍 DNS (Hostinger)

| Tipo | Name | Valor |
|---|---|---|
| `ALIAS` | `@` | `clinic-1w3u.onrender.com` |
| `CNAME` | `www` | `clinic-1w3u.onrender.com` |

---

## 🔑 API Keys

> Valores completos em `.env` local e no painel do Render

| Serviço | Variável | Onde ver |
|---|---|---|
| **Terra API** | `TERRA_API_KEY` | https://dashboard.tryterra.co → API Keys |
| **Terra Dev ID** | `TERRA_DEV_ID` | https://dashboard.tryterra.co → Dev ID |
| **Anthropic** | `ANTHROPIC_API_KEY` | `.env` / Render env vars |
| **MiniMax** | `MINIMAX_API_KEY` | `.env` / Render env vars |
| **Groq** | `GROQ_API_KEY` | `.env` / Render env vars |
| **Hugging Face** | `HUGGINGFACE_API_KEY` | `.env` / Render env vars |
| **Vapi** | `VAPI_API_KEY` | `.env` / Render env vars |
| **Vapi Public** | `VAPI_PUBLIC_KEY` | `.env` / Render env vars |
| **Vapi Assistant** | `VAPI_ASSISTANT_ID` | `.env` / Render env vars |
| **Vapi Phone** | `VAPI_PHONE_NUMBER_ID` | `.env` / Render env vars |

---

## 🔒 Auth

| Variável | Onde ver |
|---|---|
| `NEXTAUTH_URL` | `https://bpr.rehab` |
| `NEXTAUTH_SECRET` | `.env` / Render env vars |

---

## 📁 Projecto Local

| Item | Valor |
|---|---|
| **Path** | `/Users/brunotoaz/Downloads/DESENVOLVIMENTO/Bruno/Widsurf/clinic` |
| **Branch** | `main` |
| **Deploy** | `git push origin main` → Render auto-deploys |
| **DB schema** | `start.sh` corre `prisma db push` automaticamente no arranque |

---

## ⚠️ Notas Importantes

- Railway: conta **permanentemente banida** (Jun 2026) — NÃO usar
- Old Railway DB: `interchange.proxy.rlwy.net:49611` — **MORTA**, dados perdidos
- Imagens: estavam no filesystem Railway — **perdidas**. Re-upload via `/admin/settings`
- AWS S3 não estava activado no Railway — configurar para não perder imagens no futuro
- DB Free expira 13 Jul 2026 — fazer upgrade antes
