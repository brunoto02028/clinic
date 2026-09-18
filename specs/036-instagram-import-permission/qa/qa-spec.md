# QA Spec — Atividade 36: Gate de permissão pro Import from Instagram

## T-1: Schema + migração
1. **Script — clínica CLINIC fica true**
   - Passos: rodar `db push` + `scripts/backfill-instagram-import-flag.js`; consultar `Clinic` de tipo `CLINIC`.
   - Esperado: `instagramImportEnabled = true`.
2. **Script — clínica PERSONAL_TRAINER fica false**
   - Passos: mesma migração; consultar `Clinic` de tipo `PERSONAL_TRAINER`.
   - Esperado: `instagramImportEnabled = false`.
3. **Script — idempotência**
   - Passos: rodar o script duas vezes seguidas.
   - Esperado: segunda rodada não altera nada (sem erro, sem mudança de valor).

## T-2: Gate no backend + sessão
4. **API — 403 sem o flag**
   - Passos: `POST /api/admin/exercises/instagram` autenticado como ADMIN de uma clínica com `instagramImportEnabled=false`.
   - Esperado: HTTP 403, mensagem clara.
5. **API — sucesso com o flag**
   - Passos: mesma request numa clínica com `instagramImportEnabled=true`.
   - Esperado: não retorna 403 (segue o fluxo normal do endpoint).
6. **Sessão — flag exposto**
   - Passos: login, inspecionar `session.user` (via `useSession()` no client ou o JWT).
   - Esperado: `instagramImportEnabled` presente e correto.

## T-3: Botão escondido
7. **UI — botão ausente sem o flag**
   - Passos: login como `qa.trainer@example.test` (flag desligado), abrir `/admin/exercises`.
   - Esperado: botão "Instagram" não aparece.
8. **UI — botão presente com o flag**
   - Passos: mesmo tenant, depois de ligar o flag (T-4) e renovar a sessão.
   - Esperado: botão "Instagram" aparece e abre o diálogo normalmente.
9. **UI — clínica principal inalterada**
   - Passos: login como `qa.admina@example.test` (`type: CLINIC`).
   - Esperado: botão "Instagram" aparece sem nenhuma ação manual.

## T-4: Toggle em /admin/clinics
10. **UI — SUPERADMIN liga o toggle**
    - Passos: `/admin/clinics`, abrir configurações da clínica de QA personal trainer, ligar "Instagram Import", salvar.
    - Esperado: toast de sucesso, valor persiste (reabrir o diálogo mostra ligado).
11. **UI — SUPERADMIN desliga o toggle**
    - Passos: mesmo fluxo, desligando.
    - Esperado: valor persiste como desligado.
12. **Auth — não-SUPERADMIN sem acesso**
    - Passos: tentar acessar `/admin/clinics` ou a API PATCH como ADMIN comum.
    - Esperado: bloqueado (comportamento já existente, só confirmar que não regrediu).

## T-5: Fluxo ponta a ponta
13. Repetir o fluxo completo descrito no `t-5-qa-consolidada.md`, capturando evidência de cada etapa.
