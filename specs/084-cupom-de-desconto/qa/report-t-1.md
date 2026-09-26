# QA Report — T-1: Modelo do cupom, validação e resolução num só lugar

**Data:** 26/09/2026
**Worktree:** `C:\Users\bruno\orca\workspaces\clinic\app_clinic`
**HEAD:** `db1290d3` · **main:** `4078c0f4` (o cupom está no working tree, ainda não commitado)
**Resultado geral:** ⚠️ **aprovado com ressalvas** — 14 de 14 cenários da seção "T-1 — Modelo e
resolução" aprovados, nenhum reprovado, e 3 achados que não derrubam cenário nenhum mas valem
decisão antes da T-4.

Tarefa de biblioteca: **não há tela nesta T-1**, então nada de Playwright. A evidência é output real
de comando.

## Como foi testado

Duas execuções independentes, as duas coladas abaixo:

1. **A suíte do projeto** — `__tests__/coupon/resolve.test.ts` e `__tests__/coupon/apply.test.ts`,
   39 testes.
2. **Um harness do QA** — escrito por mim, porque em dois cenários a suíte do projeto não testa a
   pergunta que o qa-spec faz:
   - **1.7** o qa-spec pede um cupom de `CONSULTATION` usado **numa adesão a plano**; o teste do
     projeto faz o inverso (cupom de `MEMBERSHIP` numa consulta);
   - **1.13** o teste do projeto verifica que o `clinicId` **foi passado** para a consulta, não que
     o retorno seja `not_found`.

   O harness troca o `prisma` por uma **tabela em memória com filtro de verdade** (`clinicId` +
   `code`, e contagem por `couponId`/`patientId`/`confirmedAt`), para que o isolamento por clínica
   seja *observado* e não presumido. O arquivo está guardado em
   `specs/084-cupom-de-desconto/qa/harness-t-1.test.ts.txt` (extensão `.txt` para o jest não
   coletá-lo) e roda com:

   ```
   npx jest --roots . <pasta-do-harness> --testMatch "**/qa-t1-cenarios.test.ts" --verbose
   ```

**Banco:** nenhuma escrita. Nenhum `db push`, `migrate dev`, `migrate reset` ou DDL manual. As únicas
consultas ao Postgres local foram `SELECT` em `information_schema`/`pg_enum` e dois `count()`.
Produção não foi tocada.

## Resumo

| # | tipo | o que foi feito | resultado obtido | veredito |
|---|---|---|---|---|
| 1.1 | API | `applyCoupon` com cupom ativo de 20% sobre £100 | `{original:100, discount:20, final:80}` | ✅ |
| 1.2 | API | `resolveCoupon` com `"  verao20 "` (minúsculas e espaços) | achou `VERAO20`, `ok:true` | ✅ |
| 1.3 | API | código `NAOEXISTE` numa clínica que tem outro cupom | `not_found` + frase EN e PT distintas | ✅ |
| 1.4 | API | cupom com `isActive:false` | `inactive` | ✅ |
| 1.5 | API | `endsAt` = 25/09, agora = 26/09 | `expired` | ✅ |
| 1.6 | API | `startsAt` = 27/09, agora = 26/09 | `not_started` | ✅ |
| 1.7 | API | cupom `appliesTo:[CONSULTATION]` pedido com `scope:MEMBERSHIP` | `wrong_scope` | ✅ |
| 1.8 | API | cupom mirado em `paciente-teste-A`, pedido por `paciente-teste-B` | `not_for_you` | ✅ |
| 1.9 | API | `maxRedemptions:2` com 2 resgates confirmados de outros pacientes | `limit_reached` | ✅ |
| 1.10 | API | `maxPerPatient:1` e o próprio paciente já com 1 resgate confirmado | `already_used` | ✅ |
| 1.11 | API | cupom de 100% sobre £100 | `{discount:100, final:0, ok:true}` | ✅ |
| 1.12 | API | alcance de exame pelos dois lados: enum e `validateCouponInput` | `LAB_TEST` não existe no enum (schema, Prisma Client, Postgres e tipo TS) e a validação recusa | ✅ |
| 1.13 | API | cupom gravado em `clinic-X`, pedido com `clinicId:"clinic-Y"` | `not_found`, **byte a byte igual** à recusa de um código inexistente | ✅ |
| 1.14 | shell | `prisma migrate diff` contra o `main` | **0 DROPs** | ✅ |

Extras que não estão no qa-spec e que rodei porque o comportamento dependia deles:

| extra | o que foi feito | resultado | veredito |
|---|---|---|---|
| 1.9b | `maxRedemptions:2` com 2 resgates **não** confirmados | `ok:true` — checkout abandonado não gasta a campanha | ✅ |
| 1.10b | mesmo cupom `maxPerPatient:1` pedido por outro paciente | `ok:true` — o limite é por pessoa, não global | ✅ |
| 1.12b | `LAB`, `LAB_ORDER`, `LAB_PANEL`, `EXAM`, `EXAME`, `BLOOD_TEST` em `appliesTo` | todos recusados | ✅ |
| tsc | tipagem de `lib/coupon.ts` + as duas suítes contra o Prisma Client gerado | zero erros | ✅ |
| db | `Coupon`, `CouponRedemption` e o enum existem no Postgres local (leitura) | existem, 0 linhas | ✅ |

## Detalhes

### A suíte do projeto — 39 de 39 ✅

```
$ npx jest __tests__/coupon --verbose

PASS __tests__/coupon/apply.test.ts
  ok    a conta > 20% sobre £100
  ok    a conta > valor fixo de £15 sobre £100
  ok    a conta > 100% zera, e é válido — cortesia com código
  ok    a conta > o desconto nunca passa do valor: £30 fixos sobre £20 zeram, não devolvem £10
  ok    a conta > arredonda a centavos uma única vez: 15% sobre £33,33
  ok    a conta > o cupom recusado não vira desconto zero — vira recusa
  ok    a conta > valor negativo ou não-número não passa
  ok    a conta > valor zero é uma conta válida, não um erro
  ok    o exame de laboratório não é alcançável > `LAB_TEST` não é um escopo que o cupom conheça
  ok    o exame de laboratório não é alcançável > nem misturado com um escopo válido
  ok    validateCouponInput > aceita um cupom bem formado
  ok    validateCouponInput > código curto demais para ser digitado
  ok    validateCouponInput > código com espaço ou acento — o paciente digita à mão
  ok    validateCouponInput > percentual e valor fixo juntos
  ok    validateCouponInput > nenhum dos dois
  ok    validateCouponInput > percentual acima de 100 não é desconto
  ok    validateCouponInput > 100% passa
  ok    validateCouponInput > sem alcance nenhum não vale para nada
  ok    validateCouponInput > fim antes do início
  ok    validateCouponInput > limite por paciente menor que um
  ok    validateCouponInput > toda mensagem de erro vem nas duas línguas
PASS __tests__/coupon/resolve.test.ts
  ok    normalizeCode > maiúsculas e sem espaço nas pontas
  ok    normalizeCode > qualquer coisa que não seja texto vira vazio, e vazio é recusa
  ok    o cupom vale > cupom ativo, na janela, no escopo certo
  ok    o cupom vale > caixa não importa — o paciente digita como quiser
  ok    o cupom vale > o tenant entra na consulta, então cupom de outra clínica nunca é achado
  ok    cada recusa tem o seu motivo > not_found
  ok    cada recusa tem o seu motivo > inactive
  ok    cada recusa tem o seu motivo > not_started
  ok    cada recusa tem o seu motivo > expired
  ok    cada recusa tem o seu motivo > wrong_scope
  ok    cada recusa tem o seu motivo > not_for_you
  ok    cada recusa tem o seu motivo > código vazio é `not_found`, e não vai ao banco
  ok    cada recusa tem o seu motivo > nenhuma frase se repete — senão duas recusas viram a mesma tela
  ok    cada recusa tem o seu motivo > toda recusa vem em inglês e em português
  ok    os limites > `maxPerPatient` esgotado é `already_used`
  ok    os limites > `maxRedemptions` esgotado é `limit_reached`
  ok    os limites > sem `maxRedemptions`, o total nem é contado
  ok    os limites > só resgate confirmado conta — checkout abandonado não gasta a campanha

Suites: 2 passed / 2 total
Tests:  39 passed, 0 failed / 39 total
```

### O harness do QA — 20 de 20 ✅

```
Test Suites: 1 passed, 1 total
Tests:       20 passed, 20 total
```

Os valores reais que cada cenário devolveu (`console.log` do harness):

#### 1.1 — 20% sobre £100 ✅

```
[1.1] {
  "ok": true,
  "couponId": "cup-1",
  "code": "VERAO20",
  "name": "Campanha de verão",
  "currency": "GBP",
  "original": 100,
  "discount": 20,
  "final": 80
}
```

#### 1.2 — código em minúsculas ✅

Pedido com `"  verao20 "`, cupom gravado como `VERAO20`:

```
[1.2] {
  "ok": true,
  "couponId": "cup-1",
  "code": "VERAO20",
  "name": "Campanha de verão",
  "discountPercent": 20,
  "discountAmount": null,
  "currency": "GBP"
}
```

#### 1.3 a 1.10 — cada recusa com o seu motivo e as suas duas frases ✅

```
[1.3]  { "ok": false, "reason": "not_found",     "message": "We do not recognise that code.",             "messagePt": "Não reconhecemos esse código." }
[1.4]  { "ok": false, "reason": "inactive",      "message": "That code is no longer being accepted.",     "messagePt": "Esse código não está mais sendo aceito." }
[1.5]  { "ok": false, "reason": "expired",       "message": "That code has expired.",                     "messagePt": "Esse código expirou." }
[1.6]  { "ok": false, "reason": "not_started",   "message": "That code is not valid yet.",                "messagePt": "Esse código ainda não é válido." }
[1.7]  { "ok": false, "reason": "wrong_scope",   "message": "That code does not apply to this purchase.", "messagePt": "Esse código não vale para esta compra." }
[1.8]  { "ok": false, "reason": "not_for_you",   "message": "That code was issued for another patient.",  "messagePt": "Esse código foi emitido para outro paciente." }
[1.9]  { "ok": false, "reason": "limit_reached", "message": "That code has reached its limit.",           "messagePt": "Esse código atingiu o limite de usos." }
[1.10] { "ok": false, "reason": "already_used",  "message": "You have already used that code.",           "messagePt": "Você já usou esse código." }
```

Oito motivos, oito frases, nenhuma repetida, todas em EN e PT. **1.7 foi rodado na direção que o
qa-spec pede**: cupom de `CONSULTATION` pedido com `scope: "MEMBERSHIP"`.

E os dois limites conferidos pelo lado de dentro:

```
[1.9-abandonado]        { "ok": true, ... }   // 2 resgates com confirmedAt:null NÃO consumiram maxRedemptions:2
[1.10-outro-paciente]   { "ok": true, ... }   // maxPerPatient é por pessoa: o resgate do A não bloqueia o B
```

#### 1.11 — cupom de 100% ✅

```
[1.11] {
  "ok": true,
  "couponId": "cup-1",
  "code": "VERAO20",
  "name": "Campanha de verão",
  "currency": "GBP",
  "original": 100,
  "discount": 100,
  "final": 0
}
```

`final: 0` e `ok: true` — cortesia com código, como manda a suposição 8 do plano.

#### 1.12 — o cupom não alcança exame de laboratório ✅ (provado pelos dois lados)

**Lado do modelo.** O enum no schema:

```
$ sed -n '/^enum CouponScope {/,/^}/p' prisma/schema.prisma
enum CouponScope {
  CONSULTATION
  TREATMENT_SESSION
  /// Pacote de sessões (`/api/patient/packages/checkout`).
  PACKAGE
  /// Plano de tratamento (`/api/patient/treatment-plans/checkout`) — compra
  /// distinta do pacote, e as duas são "plano de pacote de tratamento".
  TREATMENT_PLAN
  /// Adesão a uma assinatura da clínica. Vale na adesão, não numa mensalidade
  /// que já corre: mexer nisso é mexer na `Subscription` do Stripe.
  MEMBERSHIP
}

$ grep -n "LAB_TEST" prisma/schema.prisma
5027:  LAB_TESTS_CONSENT_ACCEPTED       # outro enum (ConsentAction), nada a ver com cupom
```

O mesmo enum no **Prisma Client gerado**:

```
$ node -e '...require("@prisma/client")...'
CouponScope no Prisma Client gerado: ["CONSULTATION","TREATMENT_SESSION","PACKAGE","TREATMENT_PLAN","MEMBERSHIP"]
valores contendo LAB ou EXAM: []
CouponScope.LAB_TEST = undefined
```

E no **Postgres local**, que é o que o banco aceita de fato:

```
valores do enum CouponScope no Postgres local: ["CONSULTATION","TREATMENT_SESSION","PACKAGE","TREATMENT_PLAN","MEMBERSHIP"]
```

**Lado do tipo de `lib/coupon.ts`.** Uma atribuição de `"LAB_TEST"` ao tipo `CouponScope` não
compila:

```
$ npx tsc -p <tsconfig do QA>     # arquivo: export const alcanceDeExame: CouponScope = "LAB_TEST";
qa-t1-tipo.ts(5,14): error TS2322: Type '"LAB_TEST"' is not assignable to type 'CouponScope'.
```

(a linha seguinte, `const alcanceValido: CouponScope = "CONSULTATION"`, compilou sem erro — o
compilador não está reclamando de tudo, está reclamando do exame.)

**Lado da validação.** `validateCouponInput` recusa, sozinho e misturado:

```
[1.12-so-lab]    { "en": "That is not something a code can apply to.", "pt": "Isso não é algo a que um código possa se aplicar." }
[1.12-misturado] { "en": "That is not something a code can apply to.", "pt": "Isso não é algo a que um código possa se aplicar." }
[1.12-variantes] LAB, LAB_ORDER, LAB_PANEL, EXAM, EXAME, BLOOD_TEST: todos recusados
```

#### 1.13 — cupom da clínica X pedido pela clínica Y ✅

```
[1.13] {
  "ok": false,
  "reason": "not_found",
  "message": "We do not recognise that code.",
  "messagePt": "Não reconhecemos esse código."
}

[1.13-indistinguivel] {
  "outraClinica": { "ok": false, "reason": "not_found", "message": "We do not recognise that code.", "messagePt": "Não reconhecemos esse código." },
  "inexistente":  { "ok": false, "reason": "not_found", "message": "We do not recognise that code.", "messagePt": "Não reconhecemos esse código." }
}
```

As duas respostas são **iguais objeto a objeto** (`expect(outraClinica).toEqual(inexistente)`
passou), então a tela não serve de verificador de cupom alheio. O tenant entra na cláusula `where`
da consulta, não num filtro depois.

#### 1.14 — `prisma migrate diff` contra o `main`: **0 DROPs** ✅

Comando, exatamente como pedido:

```
$ git show main:prisma/schema.prisma > <tmp>/main-schema.prisma
$ npx prisma migrate diff \
    --from-schema-datamodel <tmp>/main-schema.prisma \
    --to-schema-datamodel prisma/schema.prisma \
    --script
exit=0   (stderr vazio)
```

Contagem de DROPs no SQL gerado:

```
$ grep -c -i "DROP" <tmp>/084-t1-diff.sql
0

DROP TABLE:      0
DROP COLUMN:     0
DROP TYPE:       0
DROP INDEX:      0
DROP CONSTRAINT: 0
DROP DEFAULT:    0
DROP NOT NULL:   0
```

**Zero DROPs.** O `main` está 5 commits atrás, então esse diff carrega também a DDL das 081, 082 e
083 (`lab_test_registrations`, `lab_result_values`, `PatientServicePrice`, colunas novas em
`Clinic`/`User`/`lab_orders`, valores novos em `TenantType` e `ConsentAction`) — tudo aditivo
também. A parte do cupom:

```sql
-- CreateEnum
CREATE TYPE "CouponScope" AS ENUM ('CONSULTATION', 'TREATMENT_SESSION', 'PACKAGE', 'TREATMENT_PLAN', 'MEMBERSHIP');

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountPercent" DOUBLE PRECISION,
    "discountAmount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "appliesTo" "CouponScope"[],
    "patientId" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "maxRedemptions" INTEGER,
    "maxPerPatient" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "scope" "CouponScope" NOT NULL,
    "originalAmount" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL,
    "finalAmount" DOUBLE PRECISION NOT NULL,
    "stripeSessionId" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Coupon_clinicId_idx" ON "Coupon"("clinicId");
CREATE INDEX "Coupon_patientId_idx" ON "Coupon"("patientId");
CREATE UNIQUE INDEX "Coupon_clinicId_code_key" ON "Coupon"("clinicId", "code");
CREATE INDEX "CouponRedemption_couponId_patientId_idx" ON "CouponRedemption"("couponId", "patientId");
CREATE INDEX "CouponRedemption_patientId_idx" ON "CouponRedemption"("patientId");
CREATE INDEX "CouponRedemption_stripeSessionId_idx" ON "CouponRedemption"("stripeSessionId");

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

Para isolar só o que a T-1 acrescenta, rodei o mesmo diff do `HEAD` (`db1290d3`) para o working
tree — o resultado é **exatamente** o bloco acima, nada mais, e **0 DROPs** nele também:

```
$ git show HEAD:prisma/schema.prisma > <tmp>/head-schema.prisma
$ npx prisma migrate diff --from-schema-datamodel <tmp>/head-schema.prisma \
    --to-schema-datamodel prisma/schema.prisma --script | grep -c -i DROP
0
```

### Verificações de apoio

**A tipagem fecha com o Prisma Client gerado** — inclusive o nome do unique composto
(`clinicId_code`) e o filtro `confirmedAt: { not: null }`:

```
$ npx tsc -p <tsconfig do QA>   # files: lib/coupon.ts + as duas suítes, com types node+jest
(nenhuma saída — zero erros)
```

**O modelo existe no Postgres local** (só leitura, nenhuma escrita):

```
DATABASE_URL host: postgresql://***@localhost:5432/bpr_clinic_local
tabelas encontradas: [{"table_name":"Coupon"},{"table_name":"CouponRedemption"}]
valores do enum CouponScope no Postgres local: ["CONSULTATION","TREATMENT_SESSION","PACKAGE","TREATMENT_PLAN","MEMBERSHIP"]
colunas de Coupon: id:text, clinicId:text, code:text, description:text, discountPercent:double
precision, discountAmount:double precision, currency:text, appliesTo:ARRAY, patientId:text,
startsAt:timestamp without time zone, endsAt:timestamp without time zone, maxRedemptions:integer,
maxPerPatient:integer, isActive:boolean, createdById:text, createdAt:timestamp without time zone,
updatedAt:timestamp without time zone
linhas em Coupon: 0 | linhas em CouponRedemption: 0
```

O passo 2 da T-1 (aplicar no local sem `db push`) está feito: as duas tabelas e o enum estão lá, com
todas as colunas do modelo.

## Erros de console

Nenhum — não há tela nesta tarefa. A suíte do projeto e o harness rodaram sem warning nem exceção
não tratada; o único erro de compilação registrado é o TS2322 **provocado de propósito** pelo
cenário 1.12.

## Achados e recomendações

Nenhum dos três derruba um cenário do qa-spec. São ressalvas — a decisão é sua.

### F1 — `applyCoupon` recusa um valor inválido dizendo `wrong_scope` ⚠️

`lib/coupon.ts`, primeira linha de `applyCoupon`:

```ts
if (!Number.isFinite(amount) || amount < 0) return recusar("wrong_scope");
```

O que o chamador recebe:

```
[obs-valor-invalido] {
  "negativo":  { "ok": false, "reason": "wrong_scope", "message": "That code does not apply to this purchase.", ... },
  "naoNumero": { "ok": false, "reason": "wrong_scope", "message": "That code does not apply to this purchase.", ... }
}
```

O cupom estava perfeito; quem estava errado era o **valor**. O paciente lê "esse código não vale
para esta compra", tira o cupom bom da frente e paga cheio — e ninguém investiga, porque a recusa
parece normal. É o mesmo formato da F2 da 082, que a própria T-1 cita como a razão de cada motivo
ter a sua frase. O teste do projeto (`valor negativo ou não-número não passa`) só verifica
`ok === false`, então não pega isto.

**Onde olhar:** `lib/coupon.ts`, `applyCoupon`. Um motivo próprio (`invalid_amount`) ou um `throw` —
valor negativo não é entrada de paciente, é bug de chamador, e talvez deva estourar em vez de virar
recusa silenciosa.

### F2 — o enum tem 5 valores; o plano, a T-1 e o qa-spec dizem 4 ⚠️

`CouponScope` implementado: `CONSULTATION`, `TREATMENT_SESSION`, `PACKAGE`, **`TREATMENT_PLAN`**,
`MEMBERSHIP`.

- Plano, suposição 2: "`all` ou uma lista de tipos (`CONSULTATION`, `TREATMENT_SESSION`, `PACKAGE`,
  `MEMBERSHIP`)".
- T-1, passo 1: "`enum CouponScope { CONSULTATION TREATMENT_SESSION PACKAGE MEMBERSHIP }`".
- **qa-spec 2.8: "quatro opções, exame ausente"** — como está escrito, esse cenário da T-2 vai
  reprovar contra uma tela correta.

O valor a mais parece deliberado e bem justificado no schema (pacote e plano de tratamento são dois
checkouts distintos, `/api/patient/packages/checkout` e
`/api/patient/treatment-plans/checkout`) e o Bruno falou de "plano de pacote de tratamento". Não é
risco de exame: `LAB` continua fora. Mas o **documento e o código divergem**, e é o documento que o
QA da T-2 vai usar.

**Recomendação:** atualizar a suposição 2 do plano, o passo 1 da T-1 e o cenário 2.8 do qa-spec para
cinco opções — ou remover `TREATMENT_PLAN`. Não deixar para descobrir na T-2.

### F3 — nada compara a moeda do cupom com a moeda do preço (risco para a T-4) ⚠️

`Coupon.currency` existe (`@default("GBP")`) e `Clinic.currency` também, mas `applyCoupon` nunca
compara as duas: subtrai o `discountAmount` do `amount` seja qual for a moeda de cada um.

```
[obs-moeda] { "ok": true, "currency": "GBP", "original": 100, "discount": 15, "final": 85 }
```

Um cupom de 15 GBP sobre um preço de 100 numa clínica de outra moeda desconta 15 daquela moeda. Hoje
é inofensivo (tudo é GBP), e a T-1 só é a biblioteca — mas é exatamente o tipo de coisa que passa
batida até existir a segunda moeda. Cupom **percentual** não tem esse problema.

**Onde olhar:** `applyCoupon` em `lib/coupon.ts`, quando a T-4 souber a moeda da compra. Um motivo de
recusa para moeda trocada, ou a regra de que o valor fixo só vale na moeda da clínica.

## O que não foi verificado nesta tarefa

- **Seção T-2 do qa-spec (2.1 a 2.11)** — é a tela e a rota do painel. Não rodei nada dela. Aviso de
  escopo: `app/admin/coupons/` e `app/api/admin/coupons/` **já existem** no working tree (apareceram
  durante este QA) e **não** foram testados aqui; a T-1 é só `prisma/schema.prisma`, `lib/coupon.ts`
  e as duas suítes.
- **Seção T-3 (3.1 a 3.8)** — depende do campo de código no app. Não existe ainda.
- **Seção T-4 (4.1 a 4.9)** — depende do checkout. Em particular, `CouponRedemption` nunca foi
  **escrito** neste QA: `resolveCoupon` só **conta** resgates, e quem grava é a T-4. Então a
  idempotência (4.3), o estorno quando o Stripe falha (4.4) e a corrida entre prévia e pagamento
  (4.6) seguem em aberto — a T-1 deixa o terreno pronto (`confirmedAt` e `stripeSessionId` no
  modelo, e o limite contando só o confirmado), mas nada disso foi exercido.
- **A lógica de resolução contra o Postgres de verdade** — o harness usa uma tabela em memória
  porque criar um cupom de teste seria escrever num banco compartilhado entre worktrees. O que foi
  verificado no banco real é a **estrutura** (tabelas, colunas, enum). O primeiro exercício de
  `resolveCoupon` contra o Postgres acontece na T-2/T-4.
- **QA online (produção)** — nada foi deployado; o cupom está no working tree, não commitado.
