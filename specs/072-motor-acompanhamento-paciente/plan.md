# Atividade 072 — Motor de acompanhamento contínuo (Fase 0)

**Origem:** `BPR_Acompanhamento_Pacientes_Especificacao.md` v1.0 (set/2026), seções 3 e 12 (Fase 0).
**Decidido com o Bruno em 23/09/2026.**

## Objetivo

Unificar as automações que já rodam em produção num **motor único**: regras guardadas em banco,
uma fila de mensagens com **aprovação humana obrigatória**, log idempotente e uma **central de
alertas** para o terapeuta.

Fase 0 não entrega nenhuma tela nova para o paciente. Ela é a fundação dos cinco componentes do
documento (diário de dor, questionários, vídeo/ROM, educação/relatório, pós-alta).

## O que o documento pede × o que já existe

O documento foi escrito como se o sistema não existisse. Não é o caso.

| Peça do documento (§3) | Situação real |
|---|---|
| `scheduler-tick` (pg_cron a cada 5 min) | **Existe**: `lib/background-jobs.ts`, `startBackgroundJobs()`, `setInterval` por job |
| `message-dispatcher` (fila) | **Existe parcial**: `dispatchDueEmailCampaigns` a cada 1 min; 13 rotas em `app/api/cron/*` |
| `daily-planner` | **Existe parcial**: `app/api/cron/daily-adherence` faz o loop por clínica e paciente |
| `monthly-reports` | **Existe parcial**: `ClinicalEvidenceReport` + `generatePendingEvidenceReports` (2 min) |
| `stripe-webhook` | **Existe**: `BillingSubscription`, webhooks Stripe |
| Idempotência (`automation_runs`) | **Existe por job**, não unificada: claim condicional por `attempts` |
| Gate de segurança (red flag) | **Existe**: atividade 065 |
| `AutomationRule` (regras em banco) | **Falta** — hoje cada automação é código separado |
| `ScheduledJob` / `AutomationRun` unificados | **Falta** |
| `MessageLog` por canal, com fallback | **Falta** |
| `Alert` + central de alertas | **Feito na T-2** |

## Decisões

### 1. Sem Supabase

O documento (§0.1) exige Supabase Auth, Storage, Edge Functions e pg_cron. **Não vamos usar.**
Hoje são **278 rotas de API** em NextAuth, mais o fluxo bearer do app móvel, Postgres próprio no
Coolify e storage próprio. Trocar a autenticação jogaria fora todo login existente — paciente,
clínica e personal — e o app junto. O que o documento chama de Supabase nós já temos equivalente:
Postgres com Prisma, `startBackgroundJobs()` no lugar do pg_cron, rotas de cron no lugar das Edge
Functions.

### 2. Sem modelo `Patient` paralelo ao `User`

O documento (§4) cria `Patient` com `userId`. Aqui a identidade é `User` com `role: PATIENT`,
escopada por `clinicId`. Um segundo modelo forkaria a identidade e quebraria `getActor()`,
`getEffectiveUser()` e o gating de módulos. **`Episode` (quando chegar a Fase 1) pendura direto no
`User`.**

### 3. Nada sai para o paciente sem aprovação humana

Decisão do Bruno, reafirmando a regra de 17/09/2026. O motor avalia, calcula e **monta** a
mensagem — ela entra numa fila com status `AWAITING_APPROVAL`. Só vira envio depois do clique.

**Exceção:** `Alert` para o terapeuta é interno, não é mensagem ao paciente, e é automático — é
justamente o que dá visibilidade sem disparar nada para fora.

Isso não é uma versão capada do documento: o §3 continua inteiro, só que a ação `SEND_MESSAGE`
enfileira em vez de despachar. Quando o Bruno quiser ligar o automático, é trocar o estado inicial
da regra — sem reescrever o motor.

### 4. Nenhum modelo existente é renomeado ou removido

Dos modelos do §4, **16 já existem** com outro formato: `PatientTask`, `Subscription`, `AuditLog`,
`ConsentLog`, `DailyCheckIn`, `EducationContent`, `EducationAssignment`, `EducationProgress`,
`PatientOutcomeMeasure`, `PushDeviceToken`, `WhatsAppMessage`, `EmailTemplate`, `TreatmentProtocol`,
`PatientProgress`, `ClinicalEvidenceReport`, `BillingSubscription`.

⚠️ **Risco de perda de dado:** o deploy roda `npx prisma db push --accept-data-loss`
(`start.sh:41`). Uma coluna que sair do schema **cai com o dado dentro**, em produção, sem aviso.

Por isso, **critério de aceite obrigatório em toda tarefa que toca o schema**:

```
git show HEAD:prisma/schema.prisma > /tmp/schema-anterior.prisma
npx prisma migrate diff   --from-schema-datamodel /tmp/schema-anterior.prisma   --to-schema-datamodel prisma/schema.prisma --script
```

⚠️ **Schema contra schema, nunca `--from-url`.** O Postgres local é compartilhado entre os
worktrees: em 23/09 ele tinha `PatientInvoice`, `PatientInvoiceItem` e `Clinic.nextInvoiceSeq`, de
uma branch que não é esta nem a `main`. Comparar contra o banco vivo acusou **22 `DROP`** sem
relação com a mudança. O que importa é o que o **diff desta branch** faz — é isso que o deploy executa.

O script resultante **não pode conter `DROP`** — nem de tabela, nem de coluna. Só `CREATE`.

### 5. Idioma

Inglês é a língua canônica **de autoria e revisão**: todo texto nasce em inglês e o português vem
junto. Isso não é a mesma coisa que a ordem em que o paciente lê.

**Na entrega, a língua do paciente vem primeiro** (decidido em 23/09, depois de o QA da T-4 apontar
o conflito): um paciente pt-BR abre o e-mail e lê português, com o inglês abaixo. Quem lê é ele.
Comportamento herdado da ativ. 68, agora deliberado em vez de acidental.

### 6. "Terapeuta", nunca "fisioterapeuta"

O prompt do §8.2 do documento diz "assistente de um fisioterapeuta". Todo texto voltado ao
paciente usa **Terapeuta / therapist**.

## Tarefas

| Tarefa | Nome | Status |
|---|---|---|
| T-1 | Mapa documento × sistema (sem código) | **concluído** |
| T-2 | `Alert` + central de alertas do terapeuta | **concluído** |
| T-3 | `AutomationRule`: regras em banco, uma automação migrada | **concluído** |
| T-4 | Fila de aprovação unificada (`OutboundMessage`) | **concluído** |
| T-5 | `AutomationRun`: idempotência e log unificados | em QA (reverificação) |
| T-6 | Painel de regras (ligar/desligar, limites, templates EN/PT) | em QA (reverificação) |
| T-7 | Trocar o `SEND_MESSAGE` do `daily-adherence` por enfileirar | em QA |

Ordem obrigatória: T-1 antes de tudo (é o que protege o que já existe). T-2 é independente.
T-4 depende de T-3. T-5 depende de T-3. T-6 depende de T-3 e T-4. **T-7 depende da T-4 ter passado
no QA** — ela troca um caminho que está em produção, e não se troca isso confiando numa fila que
ainda não foi provada.

## Critério de aceite da fase (adaptado do §12)

O documento pede: *"uma regra de teste agenda e entrega um push sem duplicar; logs gravados"*.

Com a decisão 3, vira:

> Uma regra agendada dispara, monta a mensagem, ela **aparece na fila de aprovação** com a prévia
> em inglês e português, o Bruno aprova, e ela é entregue **uma única vez**. Uma segunda avaliação
> da mesma regra, na mesma janela, não cria uma segunda mensagem. Tudo registrado.

## Suposições

Tudo aqui é decisão que eu tomei sem perguntar — confira antes de aprovar:

1. **Fase 0 não toca no paciente.** Nenhuma tela nova no app ou na web para o paciente nesta
   atividade. A central de alertas (T-2) é do terapeuta.
2. **As 13 rotas de cron existentes continuam funcionando sem alteração de comportamento.** T-3
   migra **uma** automação (`daily-adherence`) para ler os limites da tabela de regras. As outras
   12 ficam como estão até uma atividade futura.
3. **`Episode` não entra na Fase 0.** O documento o usa como agregador de tudo, mas ele só faz
   sentido com o diário de dor (Fase 1). As regras da Fase 0 operam sobre `User` + `clinicId`.
4. **Canal na Fase 0 = e-mail e push**, que já existem. WhatsApp fica para depois: exige templates
   aprovados pela Meta (§11) e consentimento por canal.
5. **A fila de aprovação é por clínica**, e quem aprova é quem tem acesso ao painel da clínica —
   não só o Bruno.
6. **Não há migração de dado.** Só tabelas novas. As automações existentes continuam gravando onde
   gravam hoje; a unificação lê das duas fontes durante a transição.
7. **`Alert` nasce sem regra que o crie automaticamente.** T-2 entrega o modelo, a API e a tela; a
   primeira regra que gera alerta vem em T-3. Isso mantém as tarefas pequenas e testáveis sozinhas.
8. O PR desta atividade **não** se mistura com a PR #93 (app do paciente), que é só app e sem
   migração. Branch separada.

## Fora de escopo

Componentes 1 a 5 do documento (diário de dor, questionários validados, vídeo/MediaPipe,
educação/relatório mensal, pós-alta/assinatura). Cada um vira sua própria atividade, depois desta.

DPIA, registro no ICO e licenças dos questionários (§11, §13) são tarefas do Bruno, não de código.
