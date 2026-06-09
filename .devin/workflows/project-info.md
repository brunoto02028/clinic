---
description: Project vault with all access credentials and infrastructure info for bpr.rehab
---

# BPR.REHAB — Project Vault

## Identidade do Projeto

| Item | Valor |
|------|-------|
| **Nome** | BPR Clinical System |
| **Domínio** | `bpr.rehab` |
| **Tipo** | Next.js 14 (App Router) + Prisma + PostgreSQL |
| **Linguagem** | TypeScript 5 |
| **Estilização** | Tailwind CSS 3 + shadcn/ui |
| **Idiomas** | EN-GB / PT-BR (bilíngue) |

## Repositórios e Acesso

| Recurso | Acesso |
|---------|--------|
| **GitHub** | `https://github.com/brunoto02028/clinic` |
| **Branch principal** | `main` |
| **Clone local** | `c:\Users\bruno\Desktop\clinic` |
| **Git user** | Bruno (`brunoto02028@gmail.com`) |

## VPS — Servidor de Produção

| Item | Valor |
|------|-------|
| **SSH** | `root@bpr.rehab` |
| **Caminho do projeto** | `/root/clinic` |
| **Process Manager** | PM2 |
| **PM2 app name** | `clinic` (id=5) |
| **Porta da aplicação** | `4010` |
| **Web server** | Nginx (reverse proxy) |
| **SSL** | Let's Encrypt (`/etc/letsencrypt/live/bpr.rehab/`) |
| **Uploads** | `/root/clinic-uploads` → montado em `/app/public/uploads` |
| **Git no VPS?** | **NÃO** — deploy via SCP direto |
| **Alternativa Docker** | Existe `Dockerfile` + `docker-compose.yml` (porta 4002), mas produção atual usa PM2 |

## Outros Apps no mesmo VPS

| PM2 Name | Descrição |
|----------|-----------|
| `clinic` | BPR Clinical System (este projeto) |
| `houseofpeace` | TradingHub — House of Peace strategy |
| `disciplegame` | Disciple Game |
| `docling` | Docling service |
| `homeledger` | HomeLedger v2.1.0 |

## Regras de Deploy

1. **OBRIGATÓRIO:** Toda alteração deve ir para GitHub E VPS — nunca apenas um
2. **Ordem:** Commit + Push GitHub → SCP para VPS → Build → PM2 restart
3. **Workflow:** Use `/deploy` para ver os passos detalhados

## Stack Técnica Completa

- **Framework:** Next.js 14 (App Router)
- **ORM:** Prisma 6 + PostgreSQL 16
- **Auth:** NextAuth.js (Credentials + JWT)
- **Pagamentos:** Stripe (Checkout, Subscriptions, Webhooks)
- **AI:** Google Gemini + OpenAI Vision
- **Email:** Nodemailer (SMTP) + IMAP sync
- **WhatsApp:** Meta Cloud API
- **Pose Detection:** MediaPipe BlazePose
- **3D:** Three.js
