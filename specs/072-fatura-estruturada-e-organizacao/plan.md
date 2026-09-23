# Atividade 072 — Fatura estruturada + área de organização

## Objetivo

Hoje uma "fatura de paciente" não existe como registro — é um PDF gerado na
hora e anexado (base64) a um `EmailMessage` genérico, misturado com
newsletter, lembrete, boas-vindas etc. Não há número controlado, não há
status de pagamento, não há como listar "as faturas da paciente X dos
últimos 6 meses" sem abrir e-mails um por um. Esta atividade cria um
registro de fatura de verdade e um lugar próprio no admin pra organizar
isso — gerar e enviar continuam funcionando como hoje, só que alimentando
(e sendo organizados por) esse registro.

Pedido original (Bruno, verbatim): *"agora precisamos corrigir onde ficam
armazenados os invoices dos clientes com os dados completos, e ter um local
para nao só gerar e enviar os invoices, mas organizar tudo"*.

## Levantamento (não repetir — já investigado nesta sessão)

- Três pontos de geração (fatura avulsa, fatura por agendamento, cron de
  assinatura mensal) — cada um formata seu próprio `invoiceNumber` na hora
  (string com data+id de outra entidade), nunca persistido, nunca checado
  contra duplicidade. Todos convergem pra `queueInvoiceForApproval`
  (`lib/invoice-pending.ts:9-60`), que cria um `EmailMessage` com
  `folder: PENDING_APPROVAL`.
- `EmailMessage` não tem nenhum campo financeiro estruturado — nem
  `invoiceNumber`, nem valor, nem status de pagamento. O PDF só existe
  dentro de `attachmentsJson` (base64) daquele e-mail específico.
- **Já existe um `model Invoice`/`InvoiceItem` no schema — mas é de um
  módulo totalmente diferente** ("BA ONE — WORK MODULE", ligado a
  `BusinessProfile.userId`, um profissional autônomo faturando os próprios
  clientes pelo app mobile). Não dá pra reaproveitar direto — é escopado
  por usuário autônomo, não por clínica+paciente. O enum `InvoiceStatus`
  desse módulo usa valores com sufixo `_INV` (`DRAFT_INV`, `SENT_INV`...) —
  sinal de que o próprio projeto já evita colisão de nomes entre módulos
  dessa forma; seguimos o mesmo padrão aqui com um enum novo.
- `model ServicePrice` existe mas é um catálogo rígido (1 preço por
  `ServiceType`, só 4 tipos: CONSULTATION/TREATMENT_SESSION/FOOT_SCAN/
  BODY_ASSESSMENT) — não é uma lista livre de itens de fatura, então não dá
  pra virar "o" catálogo de linha de item sem mudar o que ele significa.
- **Correção (23/09/2026):** o número certo de faturas já enviadas em
  produção é **4** (`EmailMessage.templateSlug = "INVOICE"`: 3 em `SENT`,
  1 em `TRASH`) — não 78. Os "78" da versão anterior deste plano eram o
  total de `EmailMessage` da clínica (todos os tipos: boas-vindas,
  lembrete, newsletter, fatura, tudo junto), atribuído errado. Com só 4
  faturas reais, um backfill estruturado deixa de ser um risco que não
  vale a pena — é trivial de fazer com segurança (ver Decisões de design).

## Decisões de design

- **Model novo, não reaproveitar o `Invoice` do BA One.** Nome:
  `PatientInvoice` + `PatientInvoiceItem` — deixa claro de cara que é
  escopado por paciente/clínica, sem confundir com o módulo de autônomos.
  Enum próprio `PatientInvoiceStatus` (DRAFT/SENT/PAID/OVERDUE/VOID/
  PARTIALLY_PAID), sem tocar no `InvoiceStatus` existente.
- **`EmailMessage` continua sendo o mecanismo de envio/aprovação** (fila
  `PENDING_APPROVAL`, endurecida nas atividades 070/071) — não é
  reescrito. Ganha só uma coluna nova, `patientInvoiceId String?` (FK
  nullable), pra ligar cada e-mail à fatura estruturada que ele carrega.
  Um `PatientInvoice` pode ter mais de um `EmailMessage` ao longo do tempo
  (reenvio) — a fatura é a fonte de verdade, o e-mail é a entrega.
  **Confirmado (Bruno, 23/09/2026): o envio continua via Resend, com
  resposta sempre indo pra `admin@bpr.clinic`** — isso já é o
  comportamento hoje (`lib/email.ts`: `FROM_ADDRESS =
  "noreply@bpr.clinic"`, `REPLY_TO = "admin@bpr.clinic"`, e o
  `approveSend` em `app/api/admin/email/route.ts` não sobrescreve
  `replyTo`). Esta atividade não cria nenhum caminho de envio novo — T-2/
  T-3 continuam passando pelo mesmo `sendEmail`/Resend existente.
- **`invoiceNumber` passa a ser um contador realmente sequencial, atômico,
  nunca repete e nunca pula** (exigência explícita do Bruno: *"Sempre
  respeitando a sequencia numerica dos invoices para nunca repetir a
  numeracao e sempre ser sequencial"*). Implementação: `Clinic` ganha
  `nextInvoiceSeq Int @default(1)`; gerar um número é um único `UPDATE
  ... SET nextInvoiceSeq = nextInvoiceSeq + 1` atômico no Postgres (via
  `prisma.clinic.update({ data: { nextInvoiceSeq: { increment: 1 } } })`),
  formatado como `BPR-2026-000123`. **Toda origem de fatura — manual ou
  automática (Stripe), presente ou futura — passa pela mesma função**
  (`lib/patient-invoice-number.ts`), nunca formata um número em outro
  lugar. É isso que garante zero repetição/zero furo mesmo com duas
  faturas nascendo ao mesmo tempo por caminhos diferentes.
- **Pagamento: automático quando a origem já passou pelo Stripe, manual
  nos demais casos** (Bruno: *"Quando for gerado algo pelo stripe, fazer
  automatico quando for manual, manual"*). Concretamente: se a fatura for
  gerada a partir de um `Appointment` com `Payment.status = SUCCEEDED`
  (pago via Stripe checkout), o `PatientInvoice` já nasce `PAID` (com
  `paidAt`/`paidAmount` vindos do `Payment`, `paidMethod: "stripe"`), sem
  precisar de clique manual. Fatura avulsa ou agendamento pago por outro
  método continuam exigindo o botão manual "Marcar como paga" (T-5).
  **Correção (23/09/2026, achado do QA):** uma `PatientSubscription`
  gerenciada via Stripe (`stripeSubscriptionId` preenchido) NÃO passa por
  esse "nasce PAID automaticamente" — o cron de assinatura
  (`app/api/cron/membership-invoices/route.ts`) já excluía essas
  assinaturas antes mesmo desta atividade (`stripeSubscriptionId: null`
  no filtro), porque o Stripe cuida do próprio faturamento/cobrança
  dessas assinaturas — nenhum `PatientInvoice` é criado pra elas por esse
  caminho, nem `PAID` nem `DRAFT`. Confirmado com o Bruno: manter assim,
  não duplicar em `PatientInvoice` o que o Stripe já registra sozinho. Só
  assinatura não-Stripe passa por este fluxo, sempre `DRAFT` (fluxo manual
  de sempre).
- **Itens são texto livre, sem catálogo nenhum** — decisão do Bruno:
  *"melhor no dia a dia a liberdade de editar, criar, apagar, enviar
  etc"*. Nada de `servicePriceId`/vínculo com `ServicePrice` nesta
  atividade — `description`+`unitPrice`+`quantity` soltos, e a fatura
  (enquanto `DRAFT`) precisa ser totalmente editável: adicionar/remover/
  editar item, apagar a fatura inteira, gerar de novo, antes de aprovar e
  enviar. Depois de `SENT`, os itens ficam congelados (é o que já foi
  mandado pro paciente) — só o status muda a partir daí.
- **PDF ganha campo próprio no `PatientInvoice`** (não só no anexo do
  e-mail) — assim uma fatura continua baixável mesmo que o `EmailMessage`
  correspondente seja apagado/purgado depois. `queueInvoiceForApproval`
  passa a receber o PDF já pronto (gerado a partir do `PatientInvoice`) em
  vez de gerá-lo por conta própria.
- **Dado histórico: backfill das 4 faturas reais** (correção acima — não
  são 78). Com só 4 (`prisma/schema.prisma` — `EmailMessage.templateSlug
  = "INVOICE"`), cria-se um `PatientInvoice` estruturado pra cada uma,
  extraindo o que já está disponível de forma confiável (paciente pelo
  `patientId` do e-mail, valor/itens pelo `subject`/PDF já gerado,
  `invoiceNumber` já usado no assunto — preservado, não reemitido pela
  nova sequência pra não colidir/duplicar), e vinculando
  `EmailMessage.patientInvoiceId`. Isso entra como parte de T-2 (script
  de backfill pontual, não um job recorrente) — dado real baixo volume,
  risco controlável, revisão manual das 4 antes de rodar em produção.
- **Área vive dentro de `app/admin/finance/`** (Bruno: *"Pode ser tudo
  junto"*) — não é uma rota nova separada. `app/admin/finance/page.tsx`
  hoje é uma página longa por seções (categorias, transações, Stripe,
  perfil da empresa) sem abas; a lista/gestão de faturas entra como mais
  uma seção nessa mesma página, extraída pro próprio componente
  (`components/admin/finance-invoices-section.tsx`) pra não inchar ainda
  mais o arquivo da página. As rotas de API ficam em `/api/admin/invoices/*`
  independente de onde a UI mora (não precisa nident debaixo de
  `/finance` na URL).

## Suposições resolvidas nesta rodada (Bruno, 23/09/2026)

1. ~~Dado histórico como legado~~ → **backfill das 4 faturas reais** (ver
   Decisões de design acima).
2. ~~Pagamento só manual~~ → **automático quando a origem é Stripe,
   manual nos demais casos** (ver Decisões de design acima).
3. ~~Onde a área vive~~ → **dentro de `app/admin/finance/`**, tudo junto.
4. ~~Catálogo opcional~~ → **texto livre, sem catálogo**, com liberdade
   total de editar/criar/apagar/enviar enquanto `DRAFT`.
5. **Envio continua via Resend, reply sempre pra `admin@bpr.clinic`** —
   já é o comportamento atual, preservado sem mudança.

Nenhuma suposição em aberto — plano pronto pra aprovação final.

## Fora de escopo

- Módulo BA One (`Invoice`/`InvoiceItem`/`BusinessProfile`/app mobile de
  autônomos) — outro produto, não mexe.
- Reescrever a fila de aprovação/envio de e-mail ou o envio via Resend —
  só ganha uma coluna de vínculo (`patientInvoiceId`), o mecanismo em si
  (070/071) não muda, `replyTo`/`admin@bpr.clinic` preservado.
- **Webhook novo do Stripe** — o "automático quando Stripe" usa dado que
  JÁ existe no banco (`Payment.status`, `PatientSubscription` via Stripe)
  no momento em que a fatura é gerada pelos 3 pontos de entrada de
  sempre; não cria um listener/webhook novo que gera fatura sozinho sem
  nenhuma das 3 rotas ser chamada. Se isso for o que o Bruno quer depois,
  é atividade separada.

## Tarefas

| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Model `PatientInvoice`/`PatientInvoiceItem` + numeração sequencial atômica | concluído |
| T-2 | Migrar os 3 pontos de geração + backfill das 4 faturas históricas | concluído |
| T-3 | Sincronizar status da fatura com o ciclo de aprovação/envio do e-mail | concluído |
| T-4 | Seção de faturas dentro de `app/admin/finance/` — lista, filtro, detalhe, PDF | concluído |
| T-5 | Marcar fatura como paga (manual, para origem não-Stripe) | concluído |

## Aprovação

Aprovado pelo Bruno em 23/09/2026 — todas as suposições resolvidas nesta
rodada (ver seção acima). Pronto pra implementação.
