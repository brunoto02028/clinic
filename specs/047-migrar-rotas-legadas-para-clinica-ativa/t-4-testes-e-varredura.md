# T-4: Testes e varredura

**Status:** concluído
**Depende de:** T-2, T-3

## Passos
1. Teste do helper (`__tests__/tenant/session-clinic.test.ts`): papéis, cookie, conta sem clínica,
   `cookies()` indisponível.
2. Teste de rota para os dois casos que hoje ficam sem filtro (`social/posts` GET e
   `social/accounts/[id]`).
3. `grep -r "resolve-clinic-id"` sem resultados; `npx jest`, `tsc` e lint limpos.

## Critérios de aceite
- [x] Testes novos passando e suíte completa verde
- [x] Nenhuma referência ao helper legado
