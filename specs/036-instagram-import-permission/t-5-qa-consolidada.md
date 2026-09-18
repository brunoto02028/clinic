# T-5: QA consolidada

**Status:** concluído (coberto integralmente pelo `qa/report-t-2-t-4.md`, cenários 4–11 — os 5 passos deste arquivo mapeiam 1:1 pra eles)
**Depende de:** T-1, T-2, T-3, T-4

## Objetivo
Confirmar o fluxo completo ponta a ponta: personal trainer sem acesso, Bruno libera pelo toggle, personal trainer passa a ter acesso; clínica principal mantém acesso do jeito que já tinha.

## Passos
1. Personal trainer QA (`qa.trainer@example.test`), flag desligado (default pós-migração): confirmar botão "Instagram" ausente em `/admin/exercises`, e uma chamada direta à API (`POST /api/admin/exercises/instagram`) retorna 403.
2. Login como SUPERADMIN, abrir `/admin/clinics`, ligar o toggle pra essa clínica de QA, salvar.
3. Login de novo como `qa.trainer@example.test` (sessão renovada): confirmar botão "Instagram" aparece, e a API aceita a request (não precisa completar um download real — só confirmar que não é mais 403).
4. Clínica QA (`qa.admina@example.test`, `type: CLINIC`): confirmar botão "Instagram" continua aparecendo sem nenhuma ação manual (migração de boot já deixou `true`).
5. Desligar o toggle de novo pra QA Studio PT, confirmar que o botão some e a API volta a bloquear.

## Arquivos afetados
- Nenhum (só QA)

## Critérios de aceite
- [ ] Todos os 5 passos acima confirmados com evidência (screenshot/output).
- [ ] Nenhuma regressão no fluxo normal da clínica principal.
