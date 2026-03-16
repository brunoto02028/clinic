---
description: How to deploy bpr.rehab (clinic) to GitHub and VPS
---

# Deploy bpr.rehab — GitHub + VPS

**REGRA OBRIGATÓRIA:** Toda alteração DEVE ser deployada em AMBOS os destinos. Nunca apenas um.

## Dados de Acesso

| Item | Valor |
|------|-------|
| **Projeto local** | `c:\Bruno Projetos\Clinic\New Clinc\bruno_clinical_system\nextjs_space` |
| **GitHub repo** | `https://github.com/brunoto02028/clinic` |
| **Branch** | `main` |
| **VPS SSH alias** | `clinic-vps` (= `root@bpr.rehab`) |
| **VPS path** | `/root/clinic` |
| **VPS process** | PM2, name=`clinic`, port `4010` |
| **Domain** | `bpr.rehab` (Nginx + Let's Encrypt SSL) |
| **VPS has git?** | **NÃO** — arquivos são copiados via SCP |

## Passos do Deploy

**OBRIGATÓRIO: Fazer GitHub push em CADA deploy, sem excepção.**

// turbo
1. Commit e push para GitHub:
```bash
git -C "c:\Bruno Projetos\Clinic\New Clinc\bruno_clinical_system\nextjs_space" add -A
git -C "c:\Bruno Projetos\Clinic\New Clinc\bruno_clinical_system\nextjs_space" commit -m "feat: <descrição das mudanças>"
git -C "c:\Bruno Projetos\Clinic\New Clinc\bruno_clinical_system\nextjs_space" push origin main
```

2. Copiar arquivos alterados para a VPS via SCP:
```bash
# Exemplo para 1 arquivo:
scp "c:\Bruno Projetos\Clinic\New Clinc\bruno_clinical_system\nextjs_space\<caminho>" clinic-vps:/root/clinic/<caminho>

# Exemplo para pasta inteira:
scp -r "c:\Bruno Projetos\Clinic\New Clinc\bruno_clinical_system\nextjs_space\app\api\patient\" clinic-vps:/root/clinic/app/api/patient/
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

## Convenção de Commit Messages
- `feat: <descrição>` — nova funcionalidade
- `fix: <descrição>` — correcção de bug
- `refactor: <descrição>` — refactoring sem nova funcionalidade
- `chore: <descrição>` — mudanças de config, dependências

## Notas Importantes
- O VPS **NÃO** tem repositório git — nunca tente `git pull` lá
- Sempre faça **GitHub push ANTES** do SCP para VPS
- O build no VPS demora ~2 minutos (Next.js full build)
- **NUNCA** use `rm -rf .next` antes de buildar — isso quebra o CSS para os pacientes!
- O script `deploy.sh` faz build in-place (sem deletar .next) e usa `pm2 reload` (graceful)
- Se o build falhar, a versão anterior continua servindo normalmente
- O script verifica automaticamente o symlink de uploads após cada deploy
- Ficheiros `test_*.js`, `fix_*.js`, `check_*.js` estão no `.gitignore` — não vão para o GitHub
