# QA — Atividade 103

Regras da casa que valem em todos os cenários: **paciente de teste, nunca real**;
confirmar qual checkout serve a porta antes de medir; afirmar o **status exato**
(404, 403, 409), nunca "≠ 200"; nenhum token no relatório.

## T-1 — Quem entrou na sala

| # | tipo | cenário | esperado |
|---|---|---|---|
| 1.1 | API | terapeuta entra na sala | uma linha, `role=THERAPIST`, `joinedAt` agora |
| 1.2 | API | paciente entra em seguida | segunda linha, `role=PATIENT` |
| 1.3 | API | terapeuta reentra 40s depois | **continua uma** linha dele |
| 1.4 | API | terapeuta reentra 3 min depois | segunda linha — voltar depois é legítimo |
| 1.5 | API | entrar fora da janela (409) | **nenhuma** linha: entrada recusada não é entrada |
| 1.6 | API | entrar em consulta cancelada | nenhuma linha |
| 1.7 | API | `resumoDaChamada` nos quatro casos | `ninguem`, `so_paciente`, `so_profissional`, `os_dois` |
| 1.8 | API | a linha carrega o inquilino da consulta | e não o de quem perguntou |

## T-2 — A fila do que venceu

| # | tipo | cenário | esperado |
|---|---|---|---|
| 2.1 | API | consulta de ontem, `CONFIRMED` | está na fila |
| 2.2 | API | consulta daqui a uma hora | **não** está |
| 2.3 | API | consulta que acabou há 10 min (dentro dos 30 de folga) | **não** está — ainda pode estar acontecendo |
| 2.4 | API | consulta já `COMPLETED`/`CANCELLED`/`NO_SHOW` | não está |
| 2.5 | API | fila de outro inquilino | **404/vazia**, nunca a consulta alheia |
| 2.6 | UI | vídeo em que ninguém entrou | diz "ninguém entrou" |
| 2.7 | UI | vídeo em que **só o paciente** entrou | diz que a falta foi da clínica, e **não** oferece marcar falta dele |
| 2.8 | UI | presencial e domicílio | nenhuma prova inventada |
| 2.9 | UI | resolver uma linha | sai da fila sem recarregar; contador cai |
| 2.10 | API | nada muda sozinho | esperar não altera status nenhum |

## T-3 — O app não mente

| # | tipo | cenário | esperado |
|---|---|---|---|
| 3.1 | UI | consulta de 3 dias atrás, `CONFIRMED` | "Aguardando a clínica", tom neutro |
| 3.2 | UI | a mesma, na tela de detalhe | **o mesmo rótulo** — não dois |
| 3.3 | UI | `COMPLETED` / `CANCELLED` / `NO_SHOW` | inalterados |
| 3.4 | UI | home com só uma consulta, vencida | não anuncia "próxima sessão" |
| 3.5 | UI | consulta vencida por vídeo | sem botão de entrar |
| 3.6 | código | um helper só | as telas não têm cópia da regra |

## T-4 — O paciente desmarca

| # | tipo | cenário | esperado |
|---|---|---|---|
| 4.1 | UI | consulta futura em aberto | botão aparece |
| 4.2 | UI | consulta vencida, ou já cancelada | **sem** botão |
| 4.3 | UI | enviar sem motivo | não envia |
| 4.4 | UI | enviar com motivo | "pedido enviado, a clínica responde" — a palavra "cancelado" **não** aparece |
| 4.5 | UI | a antecedência antes de enviar | "faltam N horas" bate com o horário |
| 4.6 | API | pedir duas vezes | a tela mostra o pedido existente, sem erro cru |
| 4.7 | API | pedir sobre consulta de outro | 404 |

## Fora das tarefas, mas medir junto

- **Chamar é entrar** (29/09/2026): "Call patient" abre a sala do lado da clínica
  no mesmo clique; chamada recusada **não** abre sala.
- **QA online** depois do deploy, com o commit confirmado no Coolify.
