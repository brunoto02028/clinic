# T-3: Handover — mostrar links do estúdio + dono

**Status:** concluído (QA + review)
**Depende de:** T-1

## Objetivo
Depois de criar o estúdio, o SUPERADMIN vê os links para repassar ao trainer/alunos.

## Passos
1. Na lista/detalhe de `/admin/clinics`, para tenant `PERSONAL_TRAINER`, mostrar `/studio/[slug]` (login) e `/join/[slug]` (convite) copiáveis + o e-mail do dono.

## Arquivos afetados
- `app/admin/clinics/page.tsx` (reusar o padrão do `StudioLinksCard` se fizer sentido).

## Critérios de aceite
- [ ] Estúdio na lista mostra os dois links copiáveis; clinic comum não.
