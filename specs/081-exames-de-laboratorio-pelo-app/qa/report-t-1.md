# QA Report — T-1: Modelo — tenant no pedido, registro do kit e resultado estruturado

**Data:** 2026-09-25
**Resultado geral:** ✅ aprovado
**Worktree medido:** `C:\Users\bruno\orca\workspaces\clinic\app_clinic` (branch `brunoto02028/app_clinic`)
**Banco:** `bpr_clinic_local` (compartilhado; nenhum DDL rodado por este QA — só leitura, `migrate diff` e linhas `qa081-*` criadas e apagadas)

## Resumo

Os cenários vêm da seção "T-2 · Modelo" da qa-spec (numeração antiga; a tarefa hoje é T-1). Os itens 4 a 7 foram derivados dos critérios de aceite da tarefa e do pedido da sessão principal.

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 2.1 | `prisma migrate diff` contra `main` → zero `DROP` | schema | ✅ |
| 2.2 | `LabOrder` antigo sem `clinicId` continua legível (com `items` e `registrations`) | banco | ✅ |
| 2.3 | teste lê o enum do `schema.prisma` e bate com o mapa do código (sete estados) | jest | ✅ |
| 4 | o guard do 2.3 reprova quando o mapa diverge (`kit_lost` injetado) | jest | ✅ |
| 5 | `LabTestRegistration` + `LabResultValue` gravam; unique `(registrationId, biomarker)` rejeita duplicata com P2002 | banco | ✅ |
| 6 | `npx prisma validate` | schema | ✅ |
| 7 | banco local em sincronia com o schema para os objetos desta tarefa | banco | ✅ (com pendência pré-existente, ver abaixo) |

## Detalhes

### 2.1 Guard de DROP contra `origin/main` ✅

- **Comando:**
  ```
  git show origin/main:prisma/schema.prisma > "$TEMP/main-schema.prisma"
  npx prisma migrate diff --from-schema-datamodel "$TEMP/main-schema.prisma" --to-schema-datamodel prisma/schema.prisma --script | grep -c DROP
  ```
- **Esperado:** `0`
- **Obtido:** `0`
- **Script completo gerado pelo diff (só aditivo):**
  ```sql
  -- CreateEnum
  CREATE TYPE "LabRegistrationStatus" AS ENUM ('AWAITING_PATIENT', 'PENDING', 'PENDING_AUTHENTICATION', 'SUCCESS', 'PARTIAL_RESULT', 'FAIL', 'PROCESSING_ERROR');

  -- AlterTable
  ALTER TABLE "lab_orders" ADD COLUMN     "clinicId" TEXT,
  ADD COLUMN     "releaseNote" TEXT,
  ADD COLUMN     "releaseNotePt" TEXT,
  ADD COLUMN     "releasedById" TEXT,
  ADD COLUMN     "releasedToPatientAt" TIMESTAMP(3);

  -- AlterTable
  ALTER TABLE "lab_order_items" ADD COLUMN     "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0;

  -- CreateTable
  CREATE TABLE "lab_test_registrations" (
      "id" TEXT NOT NULL,
      "orderId" TEXT NOT NULL,
      "lmlRegistrationId" TEXT,
      "foreignId" TEXT NOT NULL,
      "status" "LabRegistrationStatus" NOT NULL DEFAULT 'AWAITING_PATIENT',
      "resultsReady" BOOLEAN NOT NULL DEFAULT false,
      "assignedPatientAt" TIMESTAMP(3),
      "trfUrl" TEXT,
      "labelUrl" TEXT,
      "resultsPdfPath" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "lab_test_registrations_pkey" PRIMARY KEY ("id")
  );

  -- CreateTable
  CREATE TABLE "lab_result_values" (
      "id" TEXT NOT NULL,
      "registrationId" TEXT NOT NULL,
      "biomarker" TEXT NOT NULL,
      "value" DOUBLE PRECISION,
      "valueText" TEXT,
      "unit" TEXT,
      "minRange" DOUBLE PRECISION,
      "maxRange" DOUBLE PRECISION,
      "status" TEXT,
      "outOfRange" BOOLEAN NOT NULL DEFAULT false,
      "measuredAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "lab_result_values_pkey" PRIMARY KEY ("id")
  );

  -- CreateIndex
  CREATE UNIQUE INDEX "lab_test_registrations_lmlRegistrationId_key" ON "lab_test_registrations"("lmlRegistrationId");
  CREATE UNIQUE INDEX "lab_test_registrations_foreignId_key" ON "lab_test_registrations"("foreignId");
  CREATE INDEX "lab_test_registrations_orderId_idx" ON "lab_test_registrations"("orderId");
  CREATE INDEX "lab_test_registrations_status_idx" ON "lab_test_registrations"("status");
  CREATE INDEX "lab_result_values_registrationId_idx" ON "lab_result_values"("registrationId");
  CREATE UNIQUE INDEX "lab_result_values_registrationId_biomarker_key" ON "lab_result_values"("registrationId", "biomarker");
  CREATE INDEX "lab_orders_clinicId_idx" ON "lab_orders"("clinicId");

  -- AddForeignKey
  ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  ALTER TABLE "lab_test_registrations" ADD CONSTRAINT "lab_test_registrations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "lab_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  ALTER TABLE "lab_result_values" ADD CONSTRAINT "lab_result_values_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "lab_test_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  ```
- **Observação:** o `git diff` textual do `schema.prisma` também mostra realinhamento de espaços em `Clinic`, `ScheduleWindow`, `ScheduleException`, `Appointment` e `PatientPackage` (efeito do `prisma format`). O `migrate diff` acima prova que nada disso muda o banco: a única diferença semântica contra o `main` é o bloco de laboratório.

### 7. Banco local em sincronia com o schema ✅ (pendência pré-existente)

- **Comando:**
  ```
  export $(grep -E "^DATABASE_URL=" .env)
  npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script
  ```
- **Esperado:** única linha não-comentário é o `DROP INDEX` do `WearableConnection` (drift antigo, fora desta tarefa)
- **Obtido:**
  ```sql
  -- DropIndex
  DROP INDEX "WearableConnection_provider_providerUserId_key";
  ```
- **Leitura:** as tabelas, enum, colunas, índices e FKs da T-1 já estão no banco (aplicados pela sessão principal com `db execute`); o diff não pede nada de laboratório. O `DROP INDEX` em `WearableConnection` é drift **pré-existente** — o banco tem um índice único que o schema não declara. Não é falha da T-1; fica registrado como pendência para quem cuida da atividade de wearables.

### 2.2 + 5. `LabOrder` antigo sem `clinicId`, registro do kit, valores e unique ✅

- **Método:** script Node temporário `qa081-t1.tmp.js` na raiz do projeto (Prisma Client; apagado no fim — confirmado pelo `git status` abaixo). Todas as linhas com prefixo `qa081-`; a clínica usada já existia (`qa-report-t6-other`, clínica de QA de outra atividade, não uma clínica real). Paciente fictício `qa081-t1@example.test`.
- **Passos:** cria `User` PATIENT → `LabProduct` `qa081-XTF` → `LabOrder` **sem** `clinicId` com um item → lê de volta com `include: { items, registrations, clinic }` → cria `LabTestRegistration` `foreignId: "qa081-t1-reg"` → dois `LabResultValue` (Ferritin, Vitamin D) → tenta um segundo `Ferritin` no mesmo registro → relê o pedido com registros e valores → apaga tudo na ordem certa e conta o que sobrou.
- **Output real:**
  ```
  [cleanup] values=0 registrations=0 items=0 orders=0 products=0 users=0
  [setup] clínica existente: slug=qa-report-t6-other
  [setup] User PATIENT criado: qa081-t1@example.test
  [setup] LabProduct criado: lmlProductId=qa081-XTF
  [2.2] LabOrder criado sem clinicId: orderNumber=qa081-t1-order clinicId=null
  [2.2] leitura com include {items, registrations, clinic}: status=BASKET clinicId=null clinic=null items=1 (unitCost=0) registrations=0 releasedToPatientAt=null
  [reg] LabTestRegistration criado: foreignId=qa081-t1-reg status=AWAITING_PATIENT resultsReady=false
  [values] criados: Ferritin=210ug/L outOfRange=true; Vitamin D=72nmol/L outOfRange=false
  [unique] rejeitado como esperado: code=P2002 target=["registrationId","biomarker"]
  [reread] pedido -> registrations=1 values=2 (Ferritin, Vitamin D)
  [cleanup] values=2 registrations=1 items=1 orders=1 products=1 users=1
  [verify] linhas qa081- restantes: users=0 products=0 orders=0 registrations=0
  exit=0
  ```
- **Leitura:**
  - Pedido sem `clinicId` grava e lê sem erro, inclusive com `include` das relações novas (`registrations`, `clinic` → `null`). Cenário 2.2 atendido.
  - `LabOrderItem.unitCost` nasce `0` quando não informado (default do schema) — é o comportamento para linhas antigas; as rotas de compra (T-6) precisam gravar o `costPrice` explicitamente (cenário 3.3 da qa-spec).
  - `LabTestRegistration` nasce `AWAITING_PATIENT` / `resultsReady=false` por default, como a tarefa pede.
  - Unique `(registrationId, biomarker)` rejeita com `P2002` e aponta o alvo certo.
  - Limpeza completa: zero linhas `qa081-` sobraram.

### 2.3 Teste do enum × mapa do código ✅

- **Comando:** `npx jest __tests__/labs`
- **Obtido:**
  ```
  Test Suites: 1 passed, 1 total
  Tests:       10 passed, 10 total
  Snapshots:   0 total
  Time:        0.271 s, estimated 1 s
  Ran all test suites matching __tests__/labs.
  ```
- O teste (`__tests__/labs/registration-status.test.ts`) lê `enum LabRegistrationStatus` como texto do `schema.prisma` e compara com `LML_STATUS` em `lib/lab-registration-status.ts` nos dois sentidos, e ainda confere que o nome da LML é o nosso em minúsculo, um para um. Os sete estados batem.

### 4. O guard pega divergência (prova negativa) ✅

- **Passos:** adicionada temporariamente a linha `kit_lost: "KIT_LOST" as any,` ao mapa `LML_STATUS` (linha 21), rodado o jest, arquivo restaurado a partir de cópia byte a byte, jest rodado de novo.
- **Obtido com o mapa divergente (trecho):**
  ```
  ● LabRegistrationStatus: o mapa e o schema não podem divergir › todo valor do schema tem um nome da LML no mapa
    - Expected  - 0
    + Received  + 1
        "AWAITING_PATIENT",
        "FAIL",
    +   "KIT_LOST",
        "PARTIAL_RESULT",
        ...

  ● registrationStatusFromLml › nome desconhecido vira null, não lança
    expect(received).toBeNull()
    Received: "KIT_LOST"

  Test Suites: 1 failed, 1 total
  Tests:       3 failed, 7 passed, 10 total
  ```
- **Restauração:**
  ```
  sha antes=9cd7cc3ca95a18577fbb00d171a0073d9a674328 depois=9cd7cc3ca95a18577fbb00d171a0073d9a674328 igual=sim
  grep -c kit_lost lib/lab-registration-status.ts → 0
  ```
- **Jest após restaurar:** `Tests: 10 passed, 10 total`.
- **Leitura:** um valor que o schema não tem derruba três testes (os dois de comparação com o schema e o de "nome desconhecido vira null"). É exatamente a rede que faltou na F1 da 080.

### 6. `npx prisma validate` ✅

```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
The schema at prisma\schema.prisma is valid 🚀
```

## Estado do worktree no fim

`git diff --stat` e `git status --short` depois de tudo (o único arquivo que este QA deixou é este relatório):

```
 prisma/schema.prisma | 145 +++++++++++++++++++++++++++++++++++++++++----------
 specs/README.md      |   1 +
 2 files changed, 119 insertions(+), 27 deletions(-)

 M prisma/schema.prisma
 M specs/README.md
?? __tests__/labs/
?? lib/lab-registration-status.ts
?? specs/080-primeira-consulta-sessao-e-extra/qa/report-online.md
?? specs/081-exames-de-laboratorio-pelo-app/
```

`lib/lab-registration-status.ts` está idêntico ao que a sessão principal entregou (sha1 conferido antes/depois); `qa081-t1.tmp.js` não existe mais.

## Erros de console

Não se aplica — a T-1 é só schema e biblioteca; não há tela nem endpoint.

## Falhas e recomendações

Nenhuma falha da T-1.

**Pendência pré-existente (fora do escopo):** o banco local tem o índice `WearableConnection_provider_providerUserId_key` que o `schema.prisma` não declara. Quem for aplicar o próximo `db execute` deve ignorar esse `DROP INDEX` (ou decidir na atividade de wearables se o índice volta ao schema). Não bloqueia esta tarefa.

**Observação para T-6 (carrinho):** `unitCost` tem default `0`. Uma linha criada sem informar o custo passa em silêncio com margem = preço cheio. O cenário 3.3 da qa-spec ("`unitCost` gravado igual ao `costPrice` do produto") é a medida que fecha isso; vale garantir que a rota sempre preencha o campo.

## O que não foi medido e por quê

| item | motivo |
|---|---|
| Migração em produção / `prisma migrate deploy` | a atividade aplica com `db execute`; só o diff foi verificado, não a aplicação em prod |
| Linhas de `LabOrder` antigas **reais** sem `clinicId` | o banco local não tem pedidos de laboratório pré-existentes; o cenário 2.2 foi reproduzido criando um pedido `qa081-` sem `clinicId`, que é o mesmo estado de uma linha antiga |
| `onDelete: Cascade` de `Clinic` → `LabOrder` | apagar uma clínica não é operação de QA no banco compartilhado; a FK aparece no diff (`ON DELETE CASCADE`), não foi exercitada |
| `orderMayAdvance` / `registrationIsTerminal` contra webhooks reais | só o teste unitário; o comportamento de rota é a T-8 |
| Qualquer chamada à LML ou Stripe | proibido nesta tarefa; nada saiu para serviço externo |