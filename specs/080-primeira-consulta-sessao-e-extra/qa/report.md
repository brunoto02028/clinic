# QA — atividade 080

**Data:** 25/09/2026 · **Alvo:** `http://localhost:4083` (este worktree, confirmado pelo
`version.json` idêntico ao do disco) · `NEXT_DIST_DIR=.next-qa080` porque a :4000 estava com outro
checkout.

**Veredito original: reprovado.** Três defeitos derrubavam a rota (HTTP 500), três faziam a agenda
errar em silêncio, dois eram achados de leitura no caminho do dinheiro que o 500 impediu de medir.

| T-N | veredito | depois das correções |
|---|---|---|
| T-1 | reprovado | corrigida (F1, F6) |
| T-2 | reprovado | corrigida (F1, F8, F9) |
| T-3 | não medida | tela do app — exige iPhone |
| T-4 | reprovado | corrigida (F1) |
| T-5 | reprovado | corrigida (F2, F3, F4, F5) |

**Nada saiu para a Stripe.** Checkout medido sem chave; webhook com `constructEvent`, que é HMAC
local. Fixtures `qa080-*` removidas: 11 usuários, 2 clínicas, 16 consultas, 4 janelas, 5 exceções,
3 pacotes, 3 registros de auditoria. Zero DDL.

## As falhas, e o que foi feito

### F1 — o enum que não existe neste modelo · CORRIGIDA

Derrubava T-1, T-2 e a cortesia da T-4 de uma vez, e é **regressão desta atividade**: o paciente
não conseguia mais marcar consulta nenhuma.

```
GET /api/patient/booking-options  → 500
POST /api/appointments            → 500 {"error":"Failed to create appointment"}
log: Invalid value for argument `in`. Expected PatientPackageStatus.
     at async activePackageFor (lib/package-sessions.ts:36)
```

`PatientPackageStatus` é `ACTIVE | EXPIRED | CANCELLED | PENDING_PAYMENT`. Eu consultava
`status: { in: ["PAID", "ACTIVE"] }`, copiado de `TreatmentPackage` — outro modelo, cujo status é
String livre. **O Prisma valida enum na consulta**, então lançava com qualquer dado.

Os quatro arquivos de teste da 080 passavam (32/32) porque mockam `@/lib/db`: um mock aceita
qualquer objeto. O guard agora lê o **schema** e compara com o que o código pede
(`__tests__/tenant/package-sessions.test.ts`).

### F2 — nenhuma exceção podia ser criada · CORRIGIDA

`upsert` na chave composta `clinicId_therapistId_date` com `therapistId: null` — o Prisma recusa
nulo em chave única, e nulo é o caso principal: o feriado, que vale para a clínica toda. O painel
"Days that break the week" nunca salvou nada. Trocado por `findFirst` + `update`/`create`.

### F3 — a exceção caía um dia antes, só no horário de verão · CORRIGIDA

`date.toISOString().slice(0,10)` numa meia-noite de Londres em BST é 23:00 UTC do dia anterior. A
janela saía certa (`getDay()` lê hora local); só a data ficava deslocada — e o defeito sumiria
sozinho em 25/10, que é o pior tipo.

### F4 — janela configurada perdia para o "not working" antigo · CORRIGIDA

O `return not_working` do modelo antigo vinha **antes** da checagem da agenda nova. Configurar um
dia que não existia na agenda velha salvava, aparecia na tela, e o paciente não via horário —
o inverso de "fallback, não substituição". A checagem passou para antes.

### F5 — a folga do terapeuta perdia para a da clínica · CORRIGIDA

O comentário dizia "a exceção do terapeuta vence" e implementava com
`orderBy: { therapistId: "desc" }`. **No Postgres, DESC é NULLS FIRST** — a linha da clínica
(nula) ganhava, e um terapeuta de folga aparecia disponível. Agora as duas linhas são lidas e a
escolha é feita em código.

### F6 — apagar consulta deixava o contador mentindo · CORRIGIDA

```
PATCH CANCELLED → sessionsUsed=2, real=2   ok
PATCH NO_SHOW   → sessionsUsed=2, real=2   ok
DELETE          → sessionsUsed=2, real=1   ERRADO
```

O comentário que justifica recontar em vez de somar cita exatamente este caso — "neste sistema
linhas somem por fora (a clínica apaga uma consulta)" — e faltava chamar justamente ali.

### F7 — o webhook confirmava consulta de qualquer clínica · CORRIGIDA

`updateMany({ where: { id, status: "PENDING" } })` sem clínica nem paciente. O `patientId` do
metadata entrou no `where`.

### F8 — o paciente confirmava a própria consulta sem pagar · CORRIGIDA

`resolvedPaymentMethod` vinha do corpo. Um paciente mandando `{"paymentMethod":"IN_PERSON"}` numa
primeira consulta nascia `CONFIRMED`, sem cobrança. Agora `requiresPayment` manda, e nada do corpo
muda isso.

### F9 — `treatmentType` não era ignorado · CORRIGIDA

O `price` era ignorado corretamente; o rótulo, não. Agora o servidor decide os dois.

### Achado extra, não listado pelo QA · CORRIGIDO

Janela e capacidade viviam só na tela: um POST direto marcava a quinta pessoa num horário de
quatro, ou um domingo às 03:00. O horário escolhido passa a ser conferido contra o que o servidor
ofereceu. A clínica continua podendo marcar fora — ela é quem abre exceção, e sabe que está
abrindo.

### Observação · CORRIGIDA

O editor de agenda não escolhia o terapeuta: um admin que não atende via os sete dias como "Not
working" e configurava a própria agenda, que ninguém marca. Ganhou o seletor "Agenda de:".

## O que passou de primeira

- **Triagem:** 409 com `code`, EN e PT.
- **Checkout:** 502 sem chave sem quebrar; 404 na consulta de outro paciente; 409 em consulta já
  confirmada.
- **Webhook:** confirma, **idempotente** (repetido não faz nada), 400 em assinatura inválida.
- **T-4:** clínica marca → `CLINIC_BOOKED`, `checkoutUrl: null`, zero `Payment`. Isenção →
  `price: 0` + `AuditLog` com autor e motivo. Admin da B marcando paciente da A → 404.
- **T-5:** sobreposição → 409 citando a janela que conflita, EN+PT; `capacity: 9` → 400;
  `slotMinutes: 25` → 400; capacidade 1 some na 1ª marcação; capacidade 4 mostra `spacesLeft: 3` e
  só some em 4/4; passo 30 → `["14:00","14:30","15:00","15:30"]`; fallback intacto.
- **Tenant, tudo recusado:** terapeuta da B criar/apagar janela da A → 404; ler `?therapistId=` da
  A → vazio; paciente da B pedindo horário do terapeuta A → 404; paciente criando janela ou
  exceção → 403; terapeuta da B lendo/alterando/apagando consulta da A → 404; paciente da A
  marcando com terapeuta da B → 404; paciente mudando o próprio preço → 403.

## Pendências registradas, não corrigidas

- `app/api/admin/appointments/route.ts` grava `userEmail: ""` fixo na auditoria.
- Cortesia em paciente sem pacote nenhum grava `CLINIC_BOOKED` com auditoria de cortesia —
  cortesia sem cortesia. Registra a intenção, mas não consome nada.
- Exceção de dia encurtado sem `startTime` aparece como `"—–12:00"` na lista.

## O que não foi medido, e por quê

| item | motivo |
|---|---|
| T-3 inteira | tela do app, exige iPhone |
| `price: 0.30` ignorado de ponta a ponta | o 500 vinha antes de gravar; a defesa existe e agora tem teste |
| preço do `ServicePrice` nas três portas | idem |
| pacote vencido / 4ª sessão / pacote de outra clínica | o único leitor lançava antes de filtrar |
| checkout criando sessão real na Stripe | proibido; medidas só as recusas |
| comportamento em GMT (após 25/10) | não medido; mascararia a F3, que já foi corrigida |

**As correções acima têm teste**, mas o **re-QA ainda não rodou**: o que está escrito aqui como
"corrigida" foi verificado por teste unitário e build, não por medição de ponta a ponta contra o
servidor. Isso fica para a próxima rodada.
