---
description: How to deploy bpr.rehab (clinic) to GitHub and VPS
---

# Deploy bpr.rehab — GitHub + VPS

**REGRA OBRIGATÓRIA:** Toda alteração DEVE ser deployada em AMBOS os destinos. Nunca apenas um.

## Dados de Acesso

| Item | Valor |
|------|-------|
| **Projeto local** | `c:\Users\bruno\Desktop\clinic` |
| **GitHub repo** | `https://github.com/brunoto02028/clinic` |
| **Branch** | `main` |
| **VPS SSH** | `root@bpr.rehab` |
| **VPS path** | `/root/clinic` |
| **VPS process** | PM2, name=`clinic`, port `4010` |
| **Domain** | `bpr.rehab` (Nginx + Let's Encrypt SSL) |
| **VPS has git?** | **NÃO** — arquivos são copiados via SCP |

## Passos do Deploy

1. Commit e push para GitHub:
```bash
# No diretório c:\Users\bruno\Desktop\clinic
git add -A
git commit -m "feat: <descrição>"
git push origin main
```

2. Copiar arquivos alterados para a VPS via SCP:
```bash
# Exemplo para 1 arquivo:
scp <caminho/relativo/arquivo> root@bpr.rehab:/root/clinic/<caminho/relativo/arquivo>

# Exemplo para múltiplos arquivos ou pasta inteira:
scp -r app/api/patient/ root@bpr.rehab:/root/clinic/app/api/patient/
```

// turbo
3. Deploy zero-downtime na VPS (usa o script deploy.sh):
```bash
ssh clinic-vps "cd /root/clinic && bash deploy.sh"
```

4. Verificar que o app está online:
```bash
ssh clinic-vps "pm2 status clinic"
```

## Notas Importantes
- O VPS **NÃO** tem repositório git — nunca tente `git pull` lá
- Sempre faça **GitHub push ANTES** do SCP para VPS
- O build no VPS demora ~2 minutos (Next.js full build)
- **NUNCA** use `rm -rf .next` antes de buildar — isso quebra o CSS para os pacientes!
- O script `deploy.sh` faz build in-place (sem deletar .next) e usa `pm2 reload` (graceful)
- Se o build falhar, a versão anterior continua servindo normalmente
- O script verifica automaticamente o symlink de uploads após cada deploy
