# Mapa: `BPR_Acompanhamento_Pacientes_Especificacao.md` × sistema real

**T-1 da atividade 072** · 23/09/2026 · verificado por leitura do schema, das rotas e das telas.

O documento foi escrito como se o sistema não existisse. Este mapa diz, item por item, o que já
está construído, onde, e o que falta de verdade. **Nada deste mapa é opinião: cada linha aponta um
arquivo ou um modelo.**

---

## 1. Os cinco componentes

### Componente 1 — Diário de dor + aderência (§5)

| Peça | Situação | Onde |
|---|---|---|
| Registro diário | **Existe** | `DailyCheckIn`: `painLevel`, `moodLevel`, `exercisesDone`, `notes`, `checkinDate` |
| Tela do paciente | **Existe** | app `(clinica)/daily-checkin`, web `/dashboard/biohacking` |
| Aderência por exercício | **Existe** | `ExerciseCompletionLog` (por `ProtocolItem` e por `ExercisePrescription`), com `completedCount` e `lastCompletedAt` |
| Lembrete diário | **Existe, desligado** | `app/api/cron/daily-adherence`, gate por clínica (ativ. 061); task do Coolify desativada em 17/09 |
| Escala 0–10 | **Existe** | `painLevel` |
| Mapa corporal (regiões) | **Falta** | — |
| Palavras de alerta na nota | **Falta no diário** | existe na triagem: `MedicalScreening` + gate da ativ. 065 |
| Streak e gráfico de 7 dias | **Falta** | `PatientProgress` guarda progresso, mas não streak de check-in |

**Veredito:** o diário existe e é usado. Falta mapa corporal, detecção de red flag no texto livre e
streak. **Não criar `PainEntry`** — estender `DailyCheckIn`.

### Componente 2 — Questionários validados (§6)

| Peça | Situação | Onde |
|---|---|---|
| Guardar escore | **Existe, só FAAM** | `PatientOutcomeMeasure`: `vasScore`, `faamAdl`, `faamSport`, `faamAdlPercent`, `faamSportPercent`, `overallFunction` |
| Tela | **Existe** | web `/dashboard/outcome-measures`, app `outcome-measures` |
| Catálogo de instrumentos | **Falta** | ODI, NDI, QuickDASH, LEFS, KOOS, HOOS |
| Timepoints (BASELINE/WEEK_4/…) | **Falta** | `recordedAt` é uma data solta |
| MCID | **Falta** | — |
| Cálculo testado | **Falta** | não há `scoreInstrument()` |

⚠️ O modelo atual tem **os campos do FAAM no próprio schema**. Acrescentar seis instrumentos assim
significaria dezenas de colunas. `QuestionnaireResponse` (`instrument`, `answers Json`, `score`) é
o modelo certo, **ao lado** do existente, sem remover nada.

### Componente 3 — Vídeo + MediaPipe (§7)

| Peça | Situação | Onde |
|---|---|---|
| Captura e landmarks | **Existe, robusto** | `BodyAssessment`: `frontLandmarks`/`backLandmarks`/`leftLandmarks`/`rightLandmarks`, `movementVideos`, `jointAngles`, `movementPatterns`, `clinicalReliabilityScores` |
| Tela no app | **Existe** | `(avaliacoes)/[id]`, `mobile/src/api/assessments.ts` |
| Ângulos articulares | **Existe** | `jointAngles`, `segmentScores` |
| Catálogo de testes de ROM | **Falta** | `SHOULDER_ABD_R` etc. não existem como catálogo |
| Comparativo primeira × atual | **Falta** | os dados estão lá, a tela não |
| Confiança mínima 0,6 | **Existe parcial** | `clinicalReliabilityScores` |

**Veredito:** é o componente **mais** adiantado, não o menos. O documento manda "reaproveitar o
código MediaPipe que já existe" — e existe mesmo. `VideoCheckin` pode ser uma view sobre
`BodyAssessment` em vez de tabela nova; decidir na atividade do componente 3.

### Componente 4 — Educação + relatório mensal (§8)

| Peça | Situação | Onde |
|---|---|---|
| Catálogo | **Existe** | `EducationContent` (+ `EducationCategory`) |
| Atribuição ao paciente | **Existe** | `EducationAssignment` (`dueDate`, `frequency`, `isRequired`) |
| Progresso e visualização | **Existe** | `EducationProgress` (`status`, `completedAt`, `timeSpent`) |
| Liberação semanal automática | **Falta** | não há `weekOffset` nem regra `CONTENT_WEEKLY` |
| Relatório gerado por IA | **Existe** | `ClinicalEvidenceReport`: `narrativeEn`/`narrativePt`, `aiModel`, `attempts` |
| Fila de aprovação humana | **Existe** | `status: DRAFT` → `reviewedById` → `approvedAt` |
| Ciclo mensal | **Falta** | o relatório dispara pela triagem, não por período |
| PDF | **Falta** | — |

**Veredito:** o §8.2 do documento descreve um fluxo que **já está implementado** para outro
gatilho. `MonthlyReport` não precisa ser modelo novo — é o mesmo pipeline com janela de 30 dias.

### Componente 5 — Pós-alta + assinatura (§9)

| Peça | Situação | Onde |
|---|---|---|
| Planos | **Existe** | `MembershipPlan` (`price`, `interval`, `stripePriceId`, `modulePermissions`) |
| Assinatura do paciente | **Existe** | `PatientSubscription` (`stripeSubscriptionId`, `currentPeriodEnd`, `cancelAtPeriodEnd`) |
| Webhooks Stripe | **Existe** | `ProcessedStripeEvent`, `BillingSubscription` |
| Faturas recorrentes | **Existe** | `app/api/cron/membership-invoices` |
| Cancelamento com política | **Existe** | `CancellationRequest` (`hoursBeforeAppt`, `isWithin48h`, `refundAmount`) |
| Sequência de alta (dias 0/1/7/14/30) | **Falta** | — |
| Fase do episódio → MAINTENANCE | **Falta** | não há `Episode` |

**Veredito:** a cobrança está pronta. Falta a **sequência temporal** — que é exatamente o que o
motor da Fase 0 entrega.

---

## 2. As regras nomeadas

| Regra | Situação | Onde / o que falta |
|---|---|---|
| `PAIN_DAILY_REMINDER` | **Existe** | `cron/daily-adherence` + gate por clínica (061) |
| `PAIN_MISSED_2D` | **Existe o padrão** | `cron/onboarding-reminder` já faz janela de 48h com dedupe |
| `PAIN_MISSED_5D` | Falta | precisa de `Alert` (T-2) |
| `PAIN_NO_IMPROVEMENT_14D` | Falta | precisa de série histórica de `DailyCheckIn` |
| `PAIN_SPIKE` | Falta | precisa de `Alert` |
| `PAIN_RED_FLAG` | **Existe parcial** | gate de red flag da ativ. 065 roda na triagem, não no diário |
| `ADHERENCE_LOW_7D` | **Existe parcial** | `daily-adherence` calcula aderência; não cria alerta |
| `STREAK_MILESTONE` | Falta | não há streak |
| `QUEST_DUE` / `QUEST_REMINDER` / `QUEST_EXPIRED` | Falta | `PatientTask` existe e serve de tarefa |
| `QUEST_WORSENED` / `QUEST_IMPROVED` | Falta | precisa de MCID |
| `VIDEO_DUE` / `VIDEO_REMINDER` | Falta | — |
| `ROM_DROP` / `ROM_MILESTONE` | Falta | os ângulos existem (`jointAngles`) |
| `ROM_LOW_CONFIDENCE` | **Existe parcial** | `clinicalReliabilityScores` |
| `CONTENT_WEEKLY` | Falta | falta `weekOffset` |
| Sequência de alta | Falta | — |

**Padrão que se repete:** o dado quase sempre existe; o que falta é **a regra que olha para ele** e
**o alerta que avisa**. É a tese da Fase 0.

---

## 3. Decisão por modelo do §4

| Modelo do documento | Decisão | Motivo |
|---|---|---|
| `Patient` | **Não criar** | identidade é `User` + `role: PATIENT` + `clinicId`; um segundo modelo quebra `getActor()` e o gating |
| `Consent` | **Não criar** | `ConsentLog` existe. Estender com `channel` quando o WhatsApp entrar |
| `Episode` | Criar — **fora da Fase 0** | agregador; só faz sentido com o diário (Fase 1) |
| `PainEntry` | **Não criar** | estender `DailyCheckIn` |
| `AdherenceLog` | **Não criar** | `ExerciseCompletionLog` + `completedCount` já dão a série |
| `QuestionnaireResponse` | Criar — fora da Fase 0 | ao lado de `PatientOutcomeMeasure`, sem remover |
| `VideoCheckin` | Decidir na ativ. do componente 3 | `BodyAssessment` já guarda vídeo, landmarks e ângulos |
| `PatientTask` | **Não criar** | ⚠️ **colisão de nome** — ver seção 4 |
| `ContentItem` | **Não criar** | `EducationContent` existe; falta só `weekOffset` |
| `ContentUnlock` | **Não criar** | `EducationAssignment` + `EducationProgress` cobrem |
| `AutomationRule` | **Criar (T-3)** | não existe |
| `ScheduledJob` | **Criar (T-4/T-5)** | hoje cada job tem o próprio claim |
| `AutomationRun` | **Criar (T-5)** | não existe unificado |
| `MessageLog` | **Criar como `OutboundMessage` (T-4)** | nome próprio, com fila de aprovação |
| `Alert` | **Criar (T-2)** | não existe de nenhuma forma |
| `MonthlyReport` | **Não criar** | reusar `ClinicalEvidenceReport` com janela mensal |
| `Subscription` | **Não criar** | ⚠️ **colisão de nome** — ver seção 4 |
| `AuditLog` | **Não criar** | ⚠️ **colisão de nome** — ver seção 4 |

---

## 4. Colisões de nome — o risco de perder dado

O deploy roda `npx prisma db push --accept-data-loss` (`start.sh:41`). Declarar um modelo com nome
igual a um existente, porém com campos diferentes, faz o `db push` **derrubar as colunas que
sumiram, com o dado dentro**, em produção, sem perguntar.

| Nome | O que existe hoje | O que o documento define | Decisão |
|---|---|---|---|
| `PatientTask` | `clinicId`, `createdById`, `type`, `title`, `titlePt`, `description`, `descriptionPt`, `priority`, `status` (`pending`/`completed`), `dueDate`, `actionUrl`, `metadata`, `emailSent`, `viewedAt` | `episodeId`, `type`, `refCode`, `dueAt`, `status` (`PENDING`/`DONE`/`EXPIRED`) | **Manter o existente.** Se o episódio chegar, acrescentar `episodeId` opcional |
| `Subscription` | modelo de SaaS, por clínica | assinatura de manutenção do paciente | **Usar `PatientSubscription`**, que já existe e é exatamente isso |
| `AuditLog` | já existe e é usado | `actorId`, `action`, `entity`, `entityId`, `meta` | **Manter o existente** |
| `Consent` | `ConsentLog` (`action`, `termsVersion`, `ipAddress`) | por canal, com `granted`/`revokedAt` | **Estender `ConsentLog`** |

**Regra permanente desta atividade:** antes de todo commit que toca o schema,

```
npx prisma migrate diff --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma --script
```

e o resultado **não pode conter `DROP`**.

---

## 5. Infraestrutura do motor que já roda

| Peça do §3 | Onde |
|---|---|
| Agendador | `lib/background-jobs.ts`, `startBackgroundJobs()` — 7 jobs com `setInterval` |
| Claim / idempotência | `generatePendingEvidenceReports` (claim por `attempts`), `dispatch-broadcasts` ("atomic claim prevents double sends") |
| Janela de dedupe | `cron/onboarding-reminder` — 48h |
| Gate por clínica | `cron/daily-adherence` + toggle no admin (ativ. 061) |
| Prepara → humano aprova | `ClinicalEvidenceReport` (DRAFT→aprovar) e `PatientOutboundEmail` (escrever→prévia→enviar, ativ. 068) |
| Gate de segurança | ativ. 065 (red flag para o pipeline) |
| 13 rotas de cron | `appointment-reminders`, `article-publish`, `book-nurture`, `bp-reminders`, `daily-adherence`, `daily-report`, `dispatch-broadcasts`, `exercise-reminders`, `lead-nurture`, `membership-invoices`, `onboarding-reminder`, `social-post-publish`, `social-token-refresh` |

---

## 6. Qual atividade implementa cada componente

| Componente | Atividade |
|---|---|
| Motor (§3) | **072 — esta** |
| 1 — Diário de dor + aderência (§5) | 073 |
| 2 — Questionários validados (§6) | 074 |
| 3 — Vídeo + ROM (§7) | 075 |
| 4 — Educação + relatório mensal (§8) | 076 |
| 5 — Pós-alta + assinatura (§9) | 077 |

---

## 7. O que é decisão do Bruno, não de código

| Item | Seção | Por quê |
|---|---|---|
| Licenças dos questionários | §6.1, §13 | ODI, NDI, KOOS e outros exigem autorização para uso digital. O documento é explícito: **o conteúdo não pode ser gerado por IA** |
| DPIA e registro no ICO | §11, §13 | dado de saúde é categoria especial no UK GDPR |
| Templates de WhatsApp aprovados pela Meta | §11, §13 | mensagem iniciada pela clínica só sai por template aprovado |
| Revisão do texto de red flag (`SAFETY_RED_FLAG`) | §5.3 | o próprio documento exige aprovação do terapeuta antes do lançamento |
| Valores dos planos de manutenção | §9.2 | configuráveis no painel, nunca no código |
| Ligar o envio automático | decisão 3 do plano | hoje: motor prepara, humano aprova |
