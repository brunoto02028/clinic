# Ativ. 43 — Unificar a tela de exercícios do paciente

**Status:** concluído

## Objetivo
Hoje o paciente tem DUAS telas de exercícios que não conversam entre si:

1. **"Treatment Plan"** (`/dashboard/treatment`, Ativ. 42) — agrupa `ProtocolItem` por semana,
   tira de 7 dias na semana atual, histórico datado (`ExerciseCompletionLog`).
2. **"My Exercises"** (`/dashboard/exercises`) — lista `ExercisePrescription` (sem nenhum vínculo
   com `TreatmentProtocol`), agrupada por parte do corpo, contador de vida toda
   (`completedCount`/`lastCompletedAt`), sem data por dia, botão "Complete" discreto.

Levantamento em produção (2026-09-15, 5 pacientes reais): só a Ana Livia tem `TreatmentProtocol`.
Daniel (19 prescrições), Eduardo (8) e Gabby (22) têm SOMENTE `ExercisePrescription` solta — "My
Exercises" é hoje a única tela onde eles veem os exercícios deles.

Esta atividade junta as duas telas numa só, com uma experiência diária clara ("o que eu preciso
fazer hoje, quantas vezes, com vídeo de como fazer"), e só depois disso aposenta "My Exercises"
pra todo mundo — sem quebrar o acesso de quem não tem protocolo.

## Decisões de design

1. **Uma fonte de verdade de histórico diário.** `ExerciseCompletionLog` passa a aceitar dois
   tipos de item: `protocolItemId` (já existe) OU `exercisePrescriptionId` (novo), nunca os dois.
   O botão "Complete" vira o mesmo toggle por data que já existe pra itens de protocolo — marca
   hoje, marca de novo desmarca — em vez do incremento de contador atual.

2. **Prescrições soltas não têm semana.** Como `ExercisePrescription` não tem `startWeek`/
   `endWeek` nem uma data de início de "protocolo", toda prescrição solta ativa é tratada como
   "sempre semana atual" — aparece todo dia no card "Hoje" e numa seção nova "Exercícios Gerais"
   com a mesma tira de 7 dias dos itens de protocolo. Sem parsing do texto livre de `frequency`
   (ex: "3x per week") pra decidir se aparece ou não num dia específico — o texto de frequência
   continua exibido como informação (igual já é hoje), mas não trava o que é mostrado.

3. **Card "Hoje" no topo da tela.** Junta, num só lugar: itens de protocolo cuja faixa de semana
   inclui a semana atual + todas as prescrições soltas ativas. Cada linha: nome do exercício,
   séries/reps, link/miniatura pro vídeo (já existe `Exercise.videoUrl`), botão de marcar feito
   bem maior/mais tátil que o círculo pequeno atual.

4. **Rótulo de progresso muda de "vida toda" pra "esta semana".** "Done Nx" e "Completed 1x" saem;
   entra algo como "3/7 dias esta semana" (contagem de dias distintos com log nos últimos 7 dias).

5. **"My Exercises" é aposentada só depois que T-3 cobrir os dois casos** (paciente com protocolo
   E paciente só com prescrições soltas) — rota vira redirect pra `/dashboard/treatment`, item some
   do menu lateral.

## Tarefas

| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Schema — log diário aceita prescrições soltas | concluído |
| T-2 | API — toggle diário unificado + GET com logs | concluído |
| T-3 | UI — card "Hoje" + seção de exercícios soltos na Treatment Plan | concluído |
| T-4 | Aposentar "My Exercises" (redirect + remover do menu) | concluído |
| T-5 | Admin — ver histórico diário das prescrições soltas | concluído |

## Suposições (validar com o usuário)

- Prescrição solta sem fim definido aparece **todo dia**, sem tentar interpretar o texto livre de
  `frequency` pra decidir os dias — a paciente decide, o card só facilita marcar.
- "Esta semana" pro rótulo de progresso = últimos 7 dias corridos (hoje incluso), não semana de
  calendário (Seg-Dom) — mais simples e já é o que a tira de 7 dias da Ativ. 42 usa como janela.
- Manter a rota `/dashboard/exercises` como redirect (não deletar o arquivo/erro 404) — evita
  quebrar links salvos/enviados por WhatsApp antes desta mudança.
- Não mexo na tela de administração onde o terapeuta PRESCREVE exercícios (criar/editar
  `ExercisePrescription`) — só na tela que o PACIENTE vê e no histórico que o admin lê.
