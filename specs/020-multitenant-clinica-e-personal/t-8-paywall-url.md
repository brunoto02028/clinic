# T-8: Paywall contornável pela URL

**Status:** pendente
**Trilha:** CLÍNICA
**Depende de:** nenhuma

## Objetivo
`/dashboard/appointments/book` abre pela URL direta para um paciente sem plano, enquanto o menu mostra cadeado (AL-3 da atividade 19). O bloqueio precisa valer no servidor, não só no menu.

## Passos
1. Localizar como o módulo é bloqueado (`lib/patient-access.ts`, `lib/module-registry.ts`, componente de gate).
2. Aplicar a mesma regra de acesso nas sub-rotas do módulo, no servidor (página ou layout) e nas APIs de escrita do agendamento.

## Critérios de aceite
- [ ] Paciente sem plano → bloqueado também pela URL direta.
- [ ] Paciente com plano ou `fullAccessOverride` → acesso normal.
