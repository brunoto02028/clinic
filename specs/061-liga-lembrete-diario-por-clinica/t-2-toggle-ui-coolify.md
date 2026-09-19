# T-2: Toggle na UI + religar task no Coolify

**Status:** concluído
**Depende de:** T-1

## Objetivo
Botão visível na tela de clínicas (`/admin/clinics`) que o Bruno consegue clicar sozinho, sem
precisar me pedir. A task do Coolify volta a rodar (mas fica inofensiva até alguém ligar o
toggle de uma clínica).

## Contexto
`app/admin/clinics/page.tsx` já tem o dialog de "Settings" por clínica (linhas ~423-460), com o
toggle de Instagram Import como modelo exato a seguir — mesmo estado local, mesmo `PATCH`, mesmo
componente `Switch`.

## Passos
1. Interface `Clinic` (linha ~36): acrescentar `dailyRemindersEnabled: boolean`.
2. Estado novo `settingsDailyReminders`, preenchido em `openSettings` a partir de
   `clinic.dailyRemindersEnabled`, igual ao padrão de `settingsInstagramImport`.
3. `saveSettings`: incluir `dailyRemindersEnabled: settingsDailyReminders` no body do `PATCH`.
4. No dialog, novo bloco `Switch` ao lado do de Instagram Import, com um aviso claro (algo como:
   "Manda automaticamente, todo dia, um lembrete pros pacientes que ainda não marcaram os
   exercícios do dia. Desligado por padrão — revise o texto do lembrete antes de ligar.").
5. Conferir se `GET /api/admin/clinics` (a rota que popula a lista) já seleciona todos os campos
   de `Clinic` (provavelmente sim, já que `instagramImportEnabled` já aparece na lista hoje) —
   só ajustar o `select` se precisar.
6. Religar a task agendada `daily-adherence` no Coolify (uuid `kudbnaznqbvkdbaxxdbidsq5`) via API
   do Coolify — ela volta a rodar todo dia, mas não manda nada até uma clínica ligar o toggle
   (T-1 já garante isso).

## Arquivos afetados
- `app/admin/clinics/page.tsx`
- (infra, sem arquivo) task agendada no Coolify

## Critérios de aceite
- [ ] Dialog de Settings de uma clínica mostra o toggle novo, refletindo o estado atual.
- [ ] Ligar o toggle e salvar → `Clinic.dailyRemindersEnabled` vira `true` no banco.
- [ ] Task `daily-adherence` no Coolify está com `enabled: true` depois desta tarefa.
- [ ] `npx tsc --noEmit` e `npx next lint` limpos.
