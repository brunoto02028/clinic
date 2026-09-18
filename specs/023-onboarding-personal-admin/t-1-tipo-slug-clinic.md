# T-1: Tipo + slug na criação de clinic

**Status:** concluído (QA + review)
**Depende de:** nenhuma

## Objetivo
Poder criar um tenant `PERSONAL_TRAINER` (ou `CLINIC`) pela UI, com slug.

## Passos
1. Form "Add New Clinic" em `app/admin/clinics/page.tsx`: seletor **Type** (Clinic | Personal Studio) + campo **slug** (sugerido em kebab-case do nome).
2. `POST /api/admin/clinics`: aceitar e setar `type` (validar contra o enum; default CLINIC) e `slug`.
3. Tratar colisão de slug (`@unique`) com erro legível.

## Arquivos afetados
- `app/admin/clinics/page.tsx`, `app/api/admin/clinics/route.ts`

## Critérios de aceite
- [ ] Criar "Personal Studio" → `type=PERSONAL_TRAINER`; criar "Clinic" → `type=CLINIC`.
- [ ] Slug salvo; duplicado → erro tratado.
