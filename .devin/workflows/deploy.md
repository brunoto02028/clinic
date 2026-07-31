---
description: How to deploy bpr.rehab (clinic) to GitHub + Coolify
---

# Deploy bpr.rehab — GitHub + Coolify

O deploy é automático: push para GitHub → Coolify detecta (webhook) e faz build + deploy.

## Dados de Acesso

| Item | Valor |
|------|-------|
| **Projeto local (Mac)** | `/Users/brunotoaz/Downloads/DESENVOLVIMENTO/Bruno/Widsurf/clinic` |
| **GitHub repo** | `https://github.com/brunoto02028/clinic` |
| **Branch** | `main` |
| **Hosting** | Coolify (self-hosted) — `BAIntelligence` → `production` → app `clinic` |
| **Build Pack** | Dockerfile (usa o `Dockerfile` do repo) |
| **Domain** | `bpr.rehab` (+ `www.bpr.rehab`, `clinic.c.baintelligence.co.uk`) |
| **Database** | PostgreSQL gerido pelo Coolify (ver painel Coolify → Databases / env vars da app) |

## Passos do Deploy

> ⚠️ NÃO fazer push direto para `main`. Cada trabalho vai para uma branch
> separada; só abrir PR para `main` quando o utilizador pedir explicitamente.

1. Commit e push para uma branch separada (nunca `main` diretamente):
```bash
git checkout -b <nome-da-branch>   # ex: feat/condition-pages
git add -A
git commit -m "feat: <descrição das mudanças>"
git push origin <nome-da-branch>
```

2. Só abrir o PR para `main` quando o utilizador pedir:
```bash
gh pr create --base main --head <nome-da-branch> --title "..." --body "..."
```
   - Coolify faz deploy automaticamente a cada push/merge em `main` (webhook do GitHub) — branches separadas não disparam deploy.

3. Verificar deploy no Coolify (depois do merge, opcional):
   - Painel Coolify → Projects → `BAIntelligence` → `production` → `clinic` → aba **Deployments**/**Logs**

## Primeiro Deploy (setup inicial)

Se for necessário recriar o app no Coolify:
1. Coolify → Projects → criar/selecionar projeto e environment
2. "New Resource" → conectar o GitHub repo `brunoto02028/clinic`, branch `main`
3. Build Pack: **Dockerfile** (usa o `Dockerfile` do repo)
4. Configurar as Environment Variables da app (ver `.env` local como referência — nunca commitar valores reais)
5. Configurar os domínios (`bpr.rehab`, `www.bpr.rehab`) em **Domains**
6. Deploy

## Convenção de Commit Messages
- `feat: <descrição>` — nova funcionalidade
- `fix: <descrição>` — correcção de bug
- `refactor: <descrição>` — refactoring sem nova funcionalidade
- `chore: <descrição>` — mudanças de config, dependências

## Notas Importantes
- Coolify faz auto-deploy a cada push para `main` (via webhook do GitHub)
- O build usa o `Dockerfile` — se falhar, a versão anterior continua online
- Schema DB: `start.sh` corre `prisma db push` automaticamente no arranque
- Ficheiros `test_*.js`, `fix_*.js`, `check_*.js` estão no `.gitignore` — não vão para o GitHub
- Pastas `ios/`, `android/`, `www/` (Capacitor) estão no `.gitignore` — não afectam o deploy
- ⚠️ Railway: conta permanentemente banida (Jun 2026) — NÃO usar Railway
