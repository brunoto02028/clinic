---
description: How to deploy bpr.rehab (clinic) to GitHub + Railway
---

# Deploy bpr.rehab — GitHub + Railway

O deploy é automático: push para GitHub → Railway detecta e faz build + deploy.

## Dados de Acesso

| Item | Valor |
|------|-------|
| **Projeto local (Mac)** | `/Users/brunotoaz/Downloads/DESENVOLVIMENTO/Bruno/Widsurf/clinic` |
| **GitHub repo** | `https://github.com/brunoto02028/clinic` |
| **Branch** | `main` |
| **Hosting** | Railway (auto-deploy on push) |
| **Database** | PostgreSQL on Railway (`interchange.proxy.rlwy.net:49611`) |
| **Domain** | `bpr.rehab` |

## Passos do Deploy

// turbo
1. Commit e push para GitHub (Railway deploys automaticamente):
```bash
git add -A
git commit -m "feat: <descrição das mudanças>"
git push origin main
```

2. Verificar deploy no Railway dashboard (opcional):
   - https://railway.app — verificar que o build passou

## Convenção de Commit Messages
- `feat: <descrição>` — nova funcionalidade
- `fix: <descrição>` — correcção de bug
- `refactor: <descrição>` — refactoring sem nova funcionalidade
- `chore: <descrição>` — mudanças de config, dependências

## Notas Importantes
- Railway faz auto-deploy a cada push para `main`
- O build é Next.js — se falhar, a versão anterior continua online
- Database migrations: usar `npx prisma db push` antes do push (ou Prisma migrate)
- Ficheiros `test_*.js`, `fix_*.js`, `check_*.js` estão no `.gitignore` — não vão para o GitHub
- Pastas `ios/`, `android/`, `www/` (Capacitor) estão no `.gitignore` — não afectam o deploy
