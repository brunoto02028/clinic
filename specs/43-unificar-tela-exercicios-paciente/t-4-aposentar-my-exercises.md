# T-4: Aposentar "My Exercises"

**Status:** pendente
**Depende de:** T-3 (só faz sentido depois que a tela unificada cobre os dois casos)

## Objetivo
"My Exercises" some da navegação — tudo vive em "Treatment Plan" — sem quebrar links antigos
(WhatsApp, e-mails de lembrete já enviados) que apontam pra `/dashboard/exercises`.

## Contexto
Ver plan.md, decisão 5. `href: "/dashboard/exercises"` está definido em
`lib/patient-sections.ts:109` (label "Exercises"/"Exercícios", ícone Dumbbell). A rota também é
referenciada em e-mails/lembretes (`app/api/cron/exercise-reminders/route.ts`,
`app/api/patient/notifications/route.ts`) e no preview de admin (`app/patient-preview/[...slug]/
page.tsx`).

## Passos
1. Em `lib/patient-sections.ts`, remover a entrada de navegação "Exercises" (ou apontar seu
   `href` pra `/dashboard/treatment`, se o registro de módulo exigir uma entrada única — decidir
   pelo que já existe pro item "Treatment Plan" na mesma lista, pra não duplicar).
2. `app/dashboard/exercises/page.tsx` vira um redirect simples pra `/dashboard/treatment`
   (`redirect()` do Next, ou client-side `router.replace`) — não apagar a rota.
3. Atualizar os links gerados em `app/api/cron/exercise-reminders/route.ts` e
   `app/api/patient/notifications/route.ts` pra apontar direto pra `/dashboard/treatment` (evita
   o salto extra do redirect nos e-mails novos; os antigos já enviados continuam funcionando por
   causa do passo 2).
4. Checar `app/patient-preview/[...slug]/page.tsx` (preview do admin) — mesma troca de destino.

## Arquivos afetados
- `lib/patient-sections.ts`
- `app/dashboard/exercises/page.tsx`
- `app/api/cron/exercise-reminders/route.ts`
- `app/api/patient/notifications/route.ts`
- `app/patient-preview/[...slug]/page.tsx`

## Critérios de aceite
- [ ] Menu lateral do paciente não mostra mais "Exercises"/"Exercícios" como item separado
- [ ] Acessar `/dashboard/exercises` direto (link antigo) ainda funciona — redireciona pra
      `/dashboard/treatment`, sem 404
- [ ] Lembrete de exercício (e-mail/notificação) gerado após essa mudança já aponta pro link novo
- [ ] `npx tsc --noEmit` limpo
