# QA (reverificação) — T-1: Mapa documento × sistema

**Data:** 23/09/2026 · **Branch:** `brunoto02028/motor_acompanhamento` · **Commit:** `ab312b3c`
**Resultado: APROVADO**

Três rodadas. A primeira reprovou; esta fecha.

## Rodada 2 — as 7 correções do `report-t-1.md`

Todas aplicadas e verificadas (F1 a F10). Os números de linha novos conferem: `3024`, `3973`,
`170`, `113-141`, `311-380`, `53`, `41`. O mecanismo reescrito da colisão de nome está tecnicamente
correto — o Prisma recusa modelo duplicado; o perigo é editar o existente. As duas ressalvas
(enums do §4 e `Consent` não ser colisão) foram resolvidas.

**Mas a rodada 2 achou duas omissões novas, da mesma classe do F3**, justamente no Componente 1:

### R1 — o gráfico de 7 dias do diário existe, e não é o que o mapa citava

O `follow-up` que o mapa apontava é a tela **do paciente**, e a linha de dor dela vem de
`PatientOutcomeMeasure.vasScore` — não do `DailyCheckIn`. O gráfico que o §5.2 pede está em
`app/api/biohacking/patients/route.ts:68-75` (comentário literal *"Build 7-day trend arrays"*),
renderizado em `app/admin/biohacking/page.tsx:140-150`.

### R2 — o painel do terapeuta do §5.2 já calcula três condições

Em `app/api/biohacking/patients/route.ts:78-90`, como strings em memória:

| Regra | O que já está escrito |
|---|---|
| `PAIN_SPIKE` | `painTrend > 2` sobre os últimos 3 dias → `"Pain increasing"` (82-83) |
| `PAIN_MISSED_5D` | `"No check-ins in 7 days"` e `"No recent check-in"` (89-90) |
| `PAIN_NO_IMPROVEMENT_14D` | a **série** já é montada; falta a janela de 14 dias e a média |

"Falta o `Alert`" continua certo — nada disso vira linha em banco. O que muda é o motivo: a
condição já foi pensada e escrita. A Fase 0 **move para regra + alerta**, não inventa.

### R3 a R7 — precisão

- O marco de streak depende do cron externo `streak_check`; não dá para saber pelo repo se está agendado.
- O streak só incrementa dentro de `if (exercisesDone)` — é streak de **aderência**, não de diário.
- O mapa corporal tem vocabulário a reusar (`ExerciseBodyRegion`, 15 valores) e um componente a avaliar.
- `Alert` deixou de ser "não existe": foi criado na T-2.

## Rodada 3 — veredito

R1 a R7 aplicadas e conferidas linha a linha. O veredito do Componente 1 agora está certo **nas duas
direções**, que era o problema da rodada anterior:

- **não sub-declara** — as três peças que existiam e não apareciam estão na tabela, com arquivo e linha;
- **não super-declara** — a linha do gráfico do paciente avisa que a dor vem de outra fonte, então
  ninguém confunde os dois gráficos;
- **a instrução operacional é a certa** — mover para regra + alerta o que hoje é string recalculada
  a cada request. É exatamente o que o `Alert.dedupeKey` da T-2 torna possível.

Quatro ajustes de precisão (A1 a A4) foram apontados e aplicados: linhas `89-90` em vez de `88-89`,
guard do streak na `113` com incrementos em `119/121`, componente `body-map.tsx` citado com a
ressalva de que é orientado a *motor points*, e a nota dos enums alinhada com a linha do mapa
corporal.

## Balanço das três rodadas

| | Quantidade |
|---|---|
| Afirmações falsas | 2 (F1 streak, F2 campos no modelo errado) |
| Omissões consequentes | 3 (F3 aderência semanal, F6 `QUEST_DUE`, R1/R2 painel do terapeuta) |
| Achados que mudaram o motivo de uma decisão | 1 (R2 — três regras) |
| Imprecisões | 12 |
| Decisões do mapa que mudaram | **0** |

Nenhuma decisão de "criar / não criar" caiu. O que as três rodadas corrigiram foi o **motivo** — que
é o que as atividades 073 a 077 vão ler.

**T-1 aprovada.**
