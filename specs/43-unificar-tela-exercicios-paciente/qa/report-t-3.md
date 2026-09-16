# QA Report — T-3: UI — card "Hoje" + seção de exercícios soltos

**Data:** 2026-09-16 (3ª rodada — code review achou mais 1 caminho do mesmo bug; corrigido e
reverificado)
**Resultado geral:** ✅ aprovado
**Ambiente:** Produção (https://bpr.clinic), build final 2026-09-16T07:15:50.435Z

> **1ª rodada — bug crítico encontrado e corrigido.** Atribuir um protocolo (via
> `POST /api/admin/protocols/[id]/assign`) também cria automaticamente uma `ExercisePrescription`
> solta pra cada exercício do template (mantém o vídeo/notas da biblioteca acessíveis
> independente do protocolo). Como o card "Hoje" e a seção "Exercícios Gerais" tratavam TODA
> prescrição solta ativa como sempre-hoje (decisão 2 do plano, pensada pra pacientes sem
> protocolo), isso vazou exercícios de semanas FUTURAS do protocolo pro card "Hoje" via a
> prescrição solta duplicada — quebrando a liberação progressiva (o card mostrou 34 itens em vez
> dos 6 reais da semana 1). Corrigido filtrando da lista "solta" qualquer prescrição cujo
> `exercise.id` já apareça em algum item de protocolo do paciente (commit `b4f3f06`). Também achei
> nessa rodada que um paciente com `mod_exercises` mas sem `mod_treatment` (comum — são módulos
> independentes) via um banner de erro ao abrir a tela, porque `fetchProtocols()` tratava o 403
> esperado como erro real — corrigido pra degradar graciosamente (commit `3193b16`). Ambos os
> fixes foram deployados e reverificados abaixo, com evidência nova.

## Resumo
| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | Paciente COM protocolo: card "Hoje" mostra só os itens da semana atual (não duplica com prescrições soltas auto-criadas pelo assign) | ✅ (corrigido na 2ª rodada) |
| 2 | Paciente SÓ com prescrições soltas (sem protocolo): card "Hoje" + seção "Exercícios Gerais" funcionam, sem seção vazia/quebrada | ✅ |
| 3 | Marcar feito no card "Hoje" (protocolo e solto) — sem erro no console, grava no lugar certo | ✅ |
| 4 | Sincronização: marcar no card "Hoje" reflete na tira de dias da seção de semana (mesmo dado) | ✅ |
| 5 | Rótulo "X/7 this week" no lugar de "Done Nx"/"Completed 1x" | ✅ |
| 6 | Paciente com `mod_exercises` sem `mod_treatment`: tela carrega sem banner de erro | ✅ (corrigido na 2ª rodada) |
| 7 | Tira de 7 dias rolante (últimos 7 dias corridos) nas prescrições soltas — todos os dias clicáveis (nenhum é futuro) | ✅ |

## Evidência
Três pacientes de teste descartáveis (todos deletados ao final via `DELETE /api/admin/users/[id]`):

- **`QA43 ProtoA`** — protocolo ACL completo atribuído (58 itens, `startDate` = hoje). Antes do
  fix: card "Hoje" mostrava "0/34". Depois do fix: "0/6" (Post-Op Baseline Assessment + 5
  exercícios de casa da semana 1), sem seção "Exercícios Gerais" (todas as 28 prescrições soltas
  auto-criadas foram corretamente filtradas por já pertencerem a itens de protocolo). Cliquei
  "Mark as done today" em "Quad Sets (Isometric)" no card "Hoje" → virou "1/6", texto riscado,
  botão verde preenchido — e a tira de dias da seção "Weeks 1-2" (mesma tela, mais abaixo) mostrou
  o mesmo dia marcado em verde, confirmando fonte de dados compartilhada. Rótulo mudou de "Done
  Nx" pra "1/7 this week".
- **`QA43 SoltaB`** — 10 prescrições soltas (pasta "Knee"), nenhum protocolo. Card "Hoje" mostrou
  "0/10" com nome do exercício, badge de frequência ("3x per week"), botão "Watch Video" e botão
  grande de marcar feito — sem estado vazio/quebrado. Seção "General Exercises" renderizou os
  mesmos 10 itens com a tira de 7 dias rolante (T F S S M T W, todos habilitados — nenhum é dia
  futuro). Marquei "knee 008" numa segunda-feira passada (14/09) pela tira — `GET /api/exercises`
  confirmou a data exata gravada.
- **`QA43 ModOnlyC`** — sem protocolo, sem pacote pago, só `mod_exercises` liberado via override
  (`moduleOverrides: {mod_exercises: true}`, `mod_treatment` continua fora do plano). Antes do
  fix: abrir `/dashboard/treatment` mostrava um banner de erro vermelho. Depois do fix: a tela
  carregou normalmente, mostrando só o card "Hoje" com as prescrições soltas dela ("Advanced
  Core"), sem nenhuma seção de protocolo e sem erro — confirmado via screenshot com o menu lateral
  mostrando "Appointments"/"Learn" com cadeado (módulos realmente não concedidos) mas "Exercises"
  acessível.

Responsivo em 390px já confirmado na Ativ. 42 pro mesmo padrão de tira de dias (T-3 dessa
atividade reaproveita o `DayStrip` sem alterar o CSS); revisão visual nesta rodada focou nos
cenários novos (card "Hoje", filtro de duplicação, degradação de módulo).

## 3ª rodada — code review achou o mesmo bug por outro caminho

O code review (adversarial, sobre o diff completo) achou que o fix da 2ª rodada só cobria a
liberação IMPLÍCITA por semana calculada — não a liberação EXPLÍCITA via `releasedThroughWeek`
(botões "+1 week"/"+2 weeks" na ficha do paciente, mecanismo real e usado). Como o filtro de
duplicação era construído a partir de `proto.items` (já filtrado no servidor por
`hiddenFromPatient`/`releasedThroughWeek`/pagamento), qualquer item escondido por QUALQUER um
desses três motivos desaparecia do set de exclusão — e a prescrição solta duplicada dele vazava de
volta pro card "Hoje". Também achou que o badge "X/7 this week" usava a janela rolante (certa só
pra prescrições soltas) em vez da janela ancorada na semana do protocolo, podendo mostrar um
número que não batia com a tira de dias visível logo abaixo, inclusive em seções de semana
passada.

**Fix:** a API (`GET /api/patient/protocol`) passou a retornar `allExerciseIds` — todo exercício
de todo item do protocolo, SEM nenhum dos três filtros — só pra uso de deduplicação no cliente
(não expõe conteúdo escondido, só o vínculo de exercício). O badge "X/7" de item de protocolo
passou a usar a mesma janela do `DayStrip` daquele item (`weekDates(protocolStartDate,
currentWeek)`) e só aparece quando `isCurrentWeek`.

**Reverificação (paciente de teste nova, deletada ao final):** protocolo ACL atribuído,
`releasedThroughWeek: 1` setado explicitamente (mesmo mecanismo que o code review apontou).
`GET /api/patient/protocol` confirmou `items.length: 8` (só semana 1, filtrado certo) e
`allExerciseIds.length: 41` (todos, sem filtro). Card "Hoje" mostrou "0/6" (não mais 41+), sem
seção "Exercícios Gerais" — as 41 prescrições soltas auto-criadas ficaram corretamente escondidas
mesmo com a liberação explícita em semana 1. Marquei "Quad Sets" como feito hoje → badge mostrou
"1/7 this week", batendo com o único dia marcado na tira visível.
