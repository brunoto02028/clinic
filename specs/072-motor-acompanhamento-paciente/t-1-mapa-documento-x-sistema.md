# T-1: Mapa documento × sistema

**Status:** concluído — QA aprovado em 3 rodadas (`qa/report-t-1.md`, `qa/report-t-1-recheck.md`)
**Depende de:** nenhuma

## Objetivo

Um documento que diz, para **cada item** do `BPR_Acompanhamento_Pacientes_Especificacao.md`, o que
já existe no código, onde, e o que falta. Sem escrever uma linha de código.

É a tarefa que protege o que já está no ar: sem ela, as tarefas seguintes recriam o que existe e o
`prisma db push --accept-data-loss` apaga o dado antigo.

## Contexto

O documento tem 5 componentes e ~40 modelos/regras. Já foi levantado no plano que 16 modelos
existem com outro formato e que o agendador, a idempotência e o padrão de aprovação já rodam. Falta
descer ao nível de cada regra (§5.3, §6.3, §7.3) e de cada tela do painel (§10).

## Passos

1. Para cada um dos 5 componentes, listar: modelos existentes, rotas de API existentes, telas
   existentes (web e app), jobs/crons existentes.
2. Para cada regra nomeada no documento (`PAIN_DAILY_REMINDER`, `QUEST_DUE`, `ROM_DROP`, …), dizer:
   existe / existe parcial / não existe — e onde.
3. Para cada modelo do §4, dizer: já existe (com que nome e que diferenças) / criar novo / não criar.
4. Listar os **conflitos de nome** — modelo do documento que colide com modelo existente — e a
   decisão para cada um.
5. Marcar o que é decisão do Bruno e não de código (licenças de questionário, DPIA, ICO, templates
   da Meta).

## Arquivos afetados

- `specs/072-motor-acompanhamento-paciente/mapa-documento-x-sistema.md` (novo)

## Critérios de aceite

- [x] Todo modelo do §4 aparece no mapa com uma decisão explícita
- [x] Toda regra nomeada nas seções 5.3, 6.3 e 7.3 aparece com situação e local
- [x] Nenhum item fica como "a verificar"
- [x] Os conflitos de nome estão listados com a decisão de cada um
- [x] O mapa aponta, para cada componente, qual atividade futura o implementa
