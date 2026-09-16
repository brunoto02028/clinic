# T-1: Templates por clínica

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Cada template pertence a uma clínica, e só profissionais dessa clínica o veem, editam ou apagam.

## Contexto
Ver plan.md, decisões 1 e 2.

## Passos
1. `scripts/backfill-protocol-template-clinicid.js` (idempotente): para cada template com
   `clinicId` vazio, preencher com a clínica de quem criou (`createdBy.clinicId`); se o criador não
   tiver clínica, usar a clínica padrão (`bruno-physical-rehab`, mesma resolução do seed do ACL).
   Registrar quantos atualizou. Adicionar a `start.sh` **antes** do seed do ACL e o `COPY` no
   `Dockerfile` (o próprio build falha se faltar).
2. Helper em `lib/protocol-template-access.ts`: `templateInTenant(templateId, clinicId)` (template
   ou null).
3. `app/api/admin/protocols/route.ts`: `GET` lista só `where: { clinicId: actor.clinicId }`;
   `POST` grava `clinicId: actor.clinicId`. Sem clínica resolvida → 403.
4. `app/api/admin/protocols/[id]/route.ts`: `GET`/`PATCH`/`DELETE` → 404 se o template não for da
   clínica. `PATCH` com `items`: `exerciseId` de cada item só se for da clínica (senão `null`).
   `POST` de templates também valida `exerciseId` do mesmo jeito.
5. `app/api/admin/protocols/seed/route.ts`: grava `clinicId` da clínica de quem chama (via
   `getActor`, não só `session.user.clinicId`).
6. `scripts/seed-acl-protocol.js`: grava `clinicId: clinic.id` no template criado.
7. `app/api/admin/patients/[id]/atlas-chat/route.ts`: templates filtrados pela clínica do paciente.
8. Testes unitários do helper e da resolução de clínica nas rotas (mock do Prisma, padrão de
   `__tests__/tenant/`).

## Arquivos afetados
- `scripts/backfill-protocol-template-clinicid.js` (novo), `start.sh`, `Dockerfile`
- `lib/protocol-template-access.ts` (novo)
- `app/api/admin/protocols/route.ts`, `app/api/admin/protocols/[id]/route.ts`,
  `app/api/admin/protocols/seed/route.ts`
- `scripts/seed-acl-protocol.js`
- `app/api/admin/patients/[id]/atlas-chat/route.ts`
- `__tests__/protocol/protocol-template-access.test.ts` (novo)

## Critérios de aceite
- [x] Depois do deploy, os 4 templates da BPR têm `clinicId` da BPR e continuam listados pra BPR
- [x] SUPERADMIN com "Active Clinic" = outra clínica não vê os templates da BPR
- [x] `GET/PATCH/DELETE` de template de outra clínica → 404, nada muda
- [x] Template criado pela tela nasce com a clínica
- [x] Rodar o backfill duas vezes não altera nada na segunda
- [x] Testes passando; `tsc` limpo nos arquivos tocados
