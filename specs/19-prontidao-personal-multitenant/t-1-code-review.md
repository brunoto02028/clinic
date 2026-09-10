# T-1: Code review estático de isolamento e prontidão

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Mapear o modelo de tenant e revisar se as rotas isolam dados por tenant; levantar o que falta para personal trainers.

## Passos
1. Schema: modelo `Clinic`, `User.clinicId`, modelos com/sem `clinicId`, papéis.
2. Middleware e helpers (`clinic-context`, `resolve-clinic-id`, `api-permissions`).
3. Varredura das rotas autenticadas que usam Prisma sem referência a tenant.
4. Revisão manual das rotas por ID de maior risco (prontuário, avaliação, notas, agenda).
5. Onboarding: signup web, OAuth, registro mobile.
6. App mobile: módulos e telas.

## Critérios de aceite
- [x] Achados em `qa/code-review.md`, com arquivo:linha e severidade.
