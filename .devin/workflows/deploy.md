---
description: How to deploy bpr.rehab (clinic) to GitHub + Render
---

# Deploy bpr.rehab — GitHub + Render

O deploy é automático: push para GitHub → Render detecta e faz build + deploy.

## Dados de Acesso

| Item | Valor |
|------|-------|
| **Projeto local (Mac)** | `/Users/brunotoaz/Downloads/DESENVOLVIMENTO/Bruno/Widsurf/clinic` |
| **GitHub repo** | `https://github.com/brunoto02028/clinic` |
| **Branch** | `main` |
| **Hosting** | Render — https://dashboard.render.com |
| **Web Service** | `bpr-clinic` (Starter plan, Frankfurt) |
| **Database** | PostgreSQL on Render — `bpr-clinic-db` (Starter plan, Frankfurt) |
| **Domain** | `bpr.rehab` |
| **Infrastructure** | `render.yaml` (Blueprint) at repo root |

## Passos do Deploy

// turbo
1. Commit e push para GitHub (Render deploys automaticamente):
```bash
git add -A
git commit -m "feat: <descrição das mudanças>"
git push origin main
```

2. Verificar deploy no Render dashboard (opcional):
   - https://dashboard.render.com → bpr-clinic → ver logs do deploy

## Primeiro Deploy (setup inicial)

Se estás a fazer o setup pela primeira vez:
1. dashboard.render.com → "New" → "Blueprint"
2. Conecta o GitHub repo `brunoto02028/clinic`
3. Render lê o `render.yaml` e cria tudo automaticamente
4. Preenche as variáveis marcadas com `sync: false` (API keys)
5. Clica "Apply" — Render cria a DB + Web Service e faz o primeiro deploy

## Convenção de Commit Messages
- `feat: <descrição>` — nova funcionalidade
- `fix: <descrição>` — correcção de bug
- `refactor: <descrição>` — refactoring sem nova funcionalidade
- `chore: <descrição>` — mudanças de config, dependências

## Notas Importantes
- Render faz auto-deploy a cada push para `main`
- O build usa o `Dockerfile` — se falhar, a versão anterior continua online
- Schema DB: `start.sh` corre `prisma db push` automaticamente no arranque
- Ficheiros `test_*.js`, `fix_*.js`, `check_*.js` estão no `.gitignore` — não vão para o GitHub
- Pastas `ios/`, `android/`, `www/` (Capacitor) estão no `.gitignore` — não afectam o deploy
- ⚠️ Railway: conta permanentemente banida (Jun 2026) — NÃO usar Railway
