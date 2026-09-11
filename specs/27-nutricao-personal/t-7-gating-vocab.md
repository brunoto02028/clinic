# T-7: Gating + vocab + guardas de rota

**Status:** pendente
**Depende de:** T-4, T-5, T-6

## Objetivo
Garantir que a nutrição é 100% personal-only e que a clínica/paciente clínico nunca a vê nem acessa; vocab limpo; regressão clínica e de workouts intacta.

## Contexto
A feature é personal. Superfícies: aba admin (já `{isPersonal &&}`), portal (personalOnly), rotas de API (gate de training), mobile (tenant personal).

## Passos
1. Revisar cada superfície com `isPersonal` / gate: aba admin, página `/dashboard/nutrition`, endpoints.
2. Guarda de rota: paciente clínico ou tenant CLINIC em `/dashboard/nutrition` → redirect `/dashboard`; `/admin/.../nutrition` só via aba (sem rota top-level).
3. `lib/personal-blocked-routes.ts` — avaliar se precisa entrada inversa (clínica bloqueada de rotas personal); se o guard de página já cobre, documentar.
4. Passar labels por `relabel()`; conferir que não há vocab clínico vazando.
5. Regressão: rodar smoke da clínica (workouts/assessments/nutrition ausentes na clínica) e do personal (tudo presente).

## Arquivos afetados
- `app/dashboard/nutrition/page.tsx`, `components/nutrition/meal-plan-panel.tsx`, `lib/personal-blocked-routes.ts` (se necessário)

## Critérios de aceite
- [ ] Tenant CLINIC: nenhuma menção/rotas de nutrição acessíveis (admin, portal, mobile).
- [ ] Tenant PERSONAL: nutrição presente e funcional em todas as superfícies.
- [ ] Paciente clínico redirecionado de `/dashboard/nutrition`.
- [ ] Sem regressão em workouts/assessments/clínico.
