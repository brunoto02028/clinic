# QA — T-1: Mapa documento × sistema

**Data:** 23/09/2026 · **Branch:** `brunoto02028/motor_acompanhamento` · **Commit avaliado:** `1b8ecc54`
**Tipo:** QA de documento — verificação por leitura de código, sem servidor e sem browser
**Resultado: REPROVADO** (corrigido depois; ver `report-t-1-recheck.md`)

> **Baseline.** O working tree já tinha trabalho da T-2 (`model Alert` no schema, `app/api/alerts/`,
> `lib/alerts.ts`). Todas as verificações de schema foram refeitas contra
> `git show HEAD:prisma/schema.prisma`, o estado em que a T-1 foi escrita. A afirmação "`Alert` não
> existe de nenhuma forma" **era verdadeira** ali.

## 1. Os três cenários da qa-spec

| # | Cenário | Resultado |
|---|---|---|
| 1.1 | Cada modelo do §4 aparece com decisão explícita | aprovado |
| 1.2 | Cada regra de §5.3, §6.3, §7.3 (+ `CONTENT_WEEKLY`) aparece | aprovado com ressalva |
| 1.3 | Conflitos de nome listados com decisão | aprovado com imprecisão |
| — | **Veracidade das afirmações** | **reprovado** |

**1.1** — os 18 `model` do §4 aparecem, cada um com decisão. Nenhum de fora, nenhum "a verificar".
Ressalva sem peso: os 6 `enum` do §4 não são tratados; nenhum colide com enum existente, mas
`BodyRegion` é o "mapa corporal" que o mapa marca como faltando.

**1.2** — as 19 regras nomeadas aparecem. Ressalva: 4 linhas agrupam códigos distintos, e o
agrupamento esconde que `QUEST_DUE` tem implementação parcial e `QUEST_EXPIRED` não tem nada (F6).

**1.3** — `grep "^model <Nome> "` nos 18 modelos contra o schema de `HEAD`: existem exatamente 3
(`PatientTask` 6114, `Subscription` 570, `AuditLog` 2826), e as 3 estão na seção 4. Nenhuma colisão
omitida. Imprecisão: a quarta linha da tabela (`Consent`) **não é colisão** — `model Consent` é nome
livre; o que existe é `ConsentLog`. A decisão está certa, o enquadramento não.

## 2. Afirmações verificadas — as que falharam

O detalhamento completo por componente foi conferido linha a linha. Abaixo só o que não passou.

### F1 — FALSO: "não há streak" *(a falha que reprova)*

O mapa diz, duas vezes: *"Streak — Falta"* e *"`STREAK_MILESTONE` | Falta | não há streak"*.

O que existe:

- `PatientProgress.streakDays` e `longestStreak` (schema 4909-4910, com `@@index([streakDays])`).
- `app/api/patient/daily-checkin/route.ts:113-141` — **é o próprio POST do check-in** que mantém o
  streak: compara `lastActive` com ontem, `increment: 1` ou reinicia em 1, promove `longestStreak`,
  devolve `{ streak: { current, longest, isNewRecord } }`.
- `app/api/notifications/trigger/route.ts:44-53` — **já existe um marco**: `streakDays === 3` cria
  notificação bilíngue com dedupe. Linhas 56-65: `diffDays === 2 && streakDays > 0` dispara um
  "sentimos sua falta" — o padrão de `PAIN_MISSED_2D`. A rota não está agendada, mas o código está
  escrito e em produção.

**Consequência:** é uma decisão "não criar" disfarçada de "falta". Do jeito que estava, a 073
criaria um segundo contador de streak ao lado do que já roda, e os dois divergiriam.

### F2 — FALSO: campos atribuídos ao modelo errado

O mapa credita `completedCount` e `lastCompletedAt` a `ExerciseCompletionLog`, duas vezes. Estão em
`ProtocolItem` (3024-3025) e `ExercisePrescription` (3973-3974). `ExerciseCompletionLog` tem
`completedDate DateTime @db.Date`.

Importa porque a frase justifica o "não criar `AdherenceLog`": quem for implementar
`ADHERENCE_LOW_7D` procuraria série temporal num contador acumulado que não tem histórico.

### F3 — Omissão: a API e a tela de aderência que já existem

O mapa não cita `app/api/patient/adherence/route.ts` — série **já agregada por semana ISO**,
derivada de `DailyCheckIn.exercisesDone`, com `percent` e filtro `?range=30d|90d` — nem
`app/dashboard/follow-up/page.tsx`, com gráficos de dor (VAS), FAAM ADL, FAAM Sport, função geral e
barra de aderência semanal.

É exatamente o primitivo de `ADHERENCE_LOW_7D`. O mapa aponta essa regra para o
`cron/daily-adherence`, que calcula outra coisa: `{completed, missing}` **de hoje**, por clínica,
sem percentual nem janela.

### F4 — Impreciso: "palavras de alerta … existe na triagem"

Não existe lista de palavras de alerta em texto livre no repositório. O que existe é
`assessRedFlags` (`lib/clinical-analysis.ts:170`) sobre **campos booleanos** de `MedicalScreening`,
mais o gate de `lib/evidence-report.ts:347`. A lista PT/EN é trabalho novo, com revisão do
terapeuta — não é reuso.

### F5 — Impreciso: webhooks do Stripe apontam para o produto errado

O Componente 5 cita `ProcessedStripeEvent` e `BillingSubscription` — ambos do fluxo **Stripe Connect
do personal**, que por regra permanente não se mistura com a clínica. O webhook do paciente é
`app/api/webhooks/stripe/route.ts` (`patientSubscription.upsert` na linha 53). Conclusão verdadeira,
ponteiro errado.

### F6 — Omissão: `QUEST_DUE`/`QUEST_REMINDER` marcados como "Falta"

A atividade **063 T-2 (concluída)** entregou `app/api/patient/outcome-measures/due/route.ts` (janela
de 7 dias sobre o `PatientOutcomeMeasure` mais recente) e
`components/dashboard/weekly-checkin-card.tsx` (convite passivo, sem envio automático) — já no
formato que a decisão 3 do plano exige.

### F7 a F10 — imprecisões sem mudança de decisão

- **F7:** "PDF | Falta | —" sugere que não há nada a reusar. Existem três geradores:
  `app/api/body-assessments/[id]/report-pdf/route.ts`, `lib/invoice-pdf.ts`,
  `lib/foot-scans/pdf-generator.ts`.
- **F8:** comando do `start.sh:41` abreviado. Real: `npx prisma@6.7.0 db push --skip-generate
  --accept-data-loss` — o pin de versão é parte da defesa.
- **F9:** declarar um segundo `model PatientTask` é erro de validação do Prisma, não `DROP`
  silencioso. O `DROP` acontece ao **editar o modelo existente** tirando colunas.
- **F10:** `PatientTask.status` tem 4 valores (`pending, in_progress, completed, cancelled`); o mapa
  cita 2.
- **F11:** "task do Coolify desativada em 17/09" é estado de infraestrutura externa, não
  verificável no repositório.

## 3. O que passou nas verificações de maior risco

Nenhuma das afirmações marcadas como mais arriscadas saiu falsa:

| Afirmação | Verificação |
|---|---|
| `ClinicalEvidenceReport` tem fila de aprovação humana | `DiagnosisStatus` com `DRAFT`/`UNDER_REVIEW`/`APPROVED`; `PATCH .../evidence-report` grava `approvedAt` + `reviewedById`, restrito a staff |
| `PatientSubscription` é a assinatura do paciente com Stripe | `stripeSubscriptionId @unique`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `planId → MembershipPlan` |
| As 13 rotas de cron existem | `ls app/api/cron/` devolve exatamente 13, com os 13 nomes |
| `start.sh:41` roda `db push --accept-data-loss` | Linha certa, comando confirmado |
| `BodyAssessment` guarda vídeo, landmarks e ângulos | `movementVideos`, os 4 `*Landmarks`, `jointAngles`, `movementPatterns`, `clinicalReliabilityScores` |
| `EducationAssignment` + `EducationProgress` cobrem `ContentUnlock` | Cobrem, menos `viewedAt` — o §8.1 pede lembrete "se não visto em 5 dias" |
| `ExerciseCompletionLog` dá a série de `AdherenceLog` | **Dá** — pelo `completedDate`, não pelo `completedCount` que o mapa citava (F2) |
| 7 jobs em `startBackgroundJobs()` | Exatamente 7 |
| Claim por `attempts` no evidence report | `updateMany({ where: { id, status, attempts }, ... }); if (claim.count !== 1) continue` |
| Dedupe de 48h no `onboarding-reminder` | Linhas 11, 21, 37-41 |

## 4. Veredito

**Reprovado.** O critério é o que o próprio mapa declara na linha 6: *"Nada deste mapa é opinião:
cada linha aponta um arquivo ou um modelo"*. Os três cenários formais passam; a reprovação é por
veracidade, e **F1 quebra o critério num ponto que custa caro** — um "Falta" que é, na verdade, um
"existe e roda todo dia".

**Resumo:** 2 afirmações falsas (F1, F2), 2 omissões consequentes (F3, F6), 4 imprecisões
(F4, F5, F7, F8), 2 menores (F9, F10), 1 não verificável (F11).
