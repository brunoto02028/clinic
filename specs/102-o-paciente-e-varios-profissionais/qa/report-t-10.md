# QA — 102 T-10: a parede clínica, quem vê o quê

**Data:** 29/09/2026
**Veredito:** ✅ **aprovado** — a matriz adversária inteira passou, a varredura
foi **mutada e acusou**, e as duas rotas que ela pegou estão fechadas dos dois
lados. **Uma correção à tabela**, feita por medição (§3.5), e **um critério
pendente por dependência**: a matriz em produção (§9).
**Onde:** local, worktree `app_clinic`, banco local `bpr_clinic_local`.
**Tokens e cookies:** nenhum valor neste relatório — só `code`, status e tamanho.

---

## 0. Qual checkout serviu a porta

```
netstat -ano | grep 4015
  TCP  0.0.0.0:4015  LISTENING  44516

PID 44516 -> C:\Users\bruno\orca\workspaces\clinic\app_clinic\node_modules\next\...\start-server.js
PID 52568 -> C:\Users\bruno\Documents\clinic\...   (a :4000, intacta)
```

A `:4014` já estava encerrada. Navegador em `127.0.0.1`, curl em `localhost`.

### 0.1 O limitador de taxa moldou o método — e vale registrar

A primeira passada da matriz morreu em `429` no meio:

```
middleware.ts:315  checkRateLimit(ip, pathname.split('/').slice(0,4).join('/'), limits)
                   /api/admin -> { maxRequests: 100, windowMs: 60000, blockDurationMs: 300000 }
```

A chave é `ip` + os **quatro primeiros segmentos**, então *todas* as rotas sob
`/api/admin/patients/...` dividem **um** balde: 21 rotas × 5 sessões = 105 > 100,
e vem bloqueio de cinco minutos. Medido no cabeçalho (`retry-after: 70`, depois
`16`), e as medições foram refeitas em lotes espaçados.

**Não é defeito** — é a proteção funcionando. Fica aqui porque quem repetir esta
matriz em produção vai bater nela, e porque uma linha `429` lida como `404` seria
um falso "está fechado".

## 1. As identidades da matriz

Reaproveitados da T-8/T-9, mais quatro criados para esta tarefa. Nenhum dado
real; tudo `@example.com`.

| papel | quem | inquilino | tipo | vínculo com o paciente |
|---|---|---|---|---|
| **paciente de teste** | `Qa102t8 Paciente Teste` | A | `CLINIC` | é o dono |
| dono | `Qa102t8 AdminA` | A | `CLINIC` | — |
| médico | `Carla ComRegistro` | C | `DOCTOR` | **vivo** |
| médico sem registro | `Beto SemRegistro` | B | `DOCTOR` | **vivo** |
| **psicólogo** *(novo)* | `Paula Psicologa` | PSI | `PSYCHOLOGIST` | **vivo** |
| **nutricionista** *(novo)* | `Nuno Nutricionista` | NUT | `NUTRITIONIST` | **vivo** |
| colega novo | `Nina NovaNaEquipeC` | C | `DOCTOR` | pelo inquilino |
| sem vínculo | `Davi SemVinculoD` | D | `DOCTOR` | **nenhum** |
| **outro paciente** | `Qa102t8 Paciente Dois` | A | — | — |
| **paciente de outro inquilino** *(novo)* | `Pedro PacienteDoD` | D | — | — |

Criados também: um `RehabPlan` e uma `ConsultationRecording` em **cada** um dos
inquilinos A e D — sem dois donos, as rotas de §6 não se conseguem medir.

---

## 2. A tabela de quem-vê-o-quê — medida célula a célula

É o primeiro critério de aceite da T-10: a tabela existe e está aqui. Abaixo,
**a tabela do plano com o resultado de cada célula**. Uma célula corrigida pela
medição está marcada **[CORRIGIDA]** e explicada em §3.5.

| quem pergunta | identidade | anamnese, notas, exames, planos | o que lhe foi partilhado | o que ele próprio escreveu | endereço, contato, senha |
|---|---|---|---|---|---|
| **Inquilino do paciente** | ✅ tudo | ✅ tudo (200 em 21 rotas) | n/a — é a origem | ✅ tudo | ✅ tudo |
| **Profissional com vínculo** (médico, psicólogo, nutricionista) | ✅ nome, nascimento, idioma | ✅ **404** | ✅ só o partilhado, item a item | ✅ o seu | ✅ **ausente** |
| **Colega novo no inquilino do profissional** | ✅ nome, nascimento, idioma | ✅ **404** | ✅ **nada** (`received: 0`) | ✅ o do inquilino dele | ✅ **ausente** |
| **Profissional sem vínculo** | ✅ **404** | ✅ **404** | ✅ **404** | ✅ **404** | ✅ **404** |
| **Outro paciente** | ⚠️ **403 constante** [CORRIGIDA] | ⚠️ **403** | ⚠️ **403** | ⚠️ **403** | ⚠️ **403** |
| **O próprio paciente** | ✅ tudo o que é dele | ✅ o que lhe foi enviado | ✅ quem, o quê, para quem, quando — e corta | ✅ o que foi enviado a ele | ✅ tudo o que é dele |

**Medido:** 29 das 30 células como a tabela afirmava. A linha "Outro paciente"
diz `403`, não `404` — e §3.5 mostra por que isso **não** é um furo, mas a
tabela estava errada na letra.

### 2.1 A afirmação que a tabela faz sem ter coluna para ela

> *"O tipo do profissional **não** aparece como coluna de propósito: médico,
> psicólogo e nutricionista têm exatamente a mesma resposta."*

É a afirmação mais forte do documento, porque se falhasse seria **partilha por
perfil** — o que o Bruno proibiu. Medida em §4, e **confirmada**.

---

## 3. A matriz adversária, por rota

### 3.1 As 21 leituras, cinco sessões, lado a lado

| rota sob `/api/admin/patients/<id>` | A (dono) | C `DOCTOR` | PSI `PSYCHOLOGIST` | NUT `NUTRITIONIST` | D (sem vínculo) |
|---|---|---|---|---|---|
| `wellbeing` | **200** | 404 | 404 | 404 | 404 |
| `report` | **200** | 404 | 404 | 404 | 404 |
| `rehab-plan` | **200** | 404 | 404 | 404 | 404 |
| `questions` | **200** | 404 | 404 | 404 | 404 |
| `activity` | **200** | 404 | 404 | 404 | 404 |
| `protocol-notes` | **200** | 404 | 404 | 404 | 404 |
| `measurements` | **200** | 404 | 404 | 404 | 404 |
| `diagnosis` | **200** | 404 | 404 | 404 | 404 |
| `documents` | **200** | 404 | 404 | 404 | 404 |
| `blood-pressure` | **200** | 404 | 404 | 404 | 404 |
| `monitoring` | **200** | 404 | 404 | 404 | 404 |
| `protocol` | **200** | 404 | 404 | 404 | 404 |
| `adherence-today` | **200** | 404 | 404 | 404 | 404 |
| `weekly-closing` | **200** | 404 | 404 | 404 | 404 |
| `packages` | **200** | 404 | 404 | 404 | 404 |
| `permissions` | **200** | 404 | 404 | 404 | 404 |
| `messages` | **200** | 404 | 404 | 404 | 404 |
| `evidence-report` | **200** | 404 | 404 | 404 | 404 |
| `onboarding-pending` | **200** | 404 | 404 | 404 | 404 |
| `email` | **200** | 404 | 404 | 404 | 404 |
| `email/template` | 400¹ | 404 | 404 | 404 | 404 |

### 3.2 E as escritas — porque ler não é o único jeito de vazar

| rota | A (dono) | C | PSI | NUT | D |
|---|---|---|---|---|---|
| `POST email/send` | 400¹ | **404** | **404** | **404** | **404** |
| `POST invoice` | 400¹ | **404** | **404** | **404** | **404** |
| `POST measurements` | 400¹ | **404** | **404** | **404** | **404** |
| `POST diagnosis` | 500¹ | **404** | **404** | **404** | **404** |

¹ **O 400/500 é a prova da outra metade.** É o meu corpo vazio batendo na
validação do handler — quer dizer que a requisição **atravessou a guarda**. Se o
fechamento tivesse quebrado a clínica, a coluna do A seria 404 também. O 500 do
`POST /diagnosis` com corpo vazio é pré-existente e está no §8 como achado
informativo.

**Cento e vinte e cinco células, uma regra:** o dono entra, mais ninguém.

### 3.3 O profissional sem vínculo não descobre nem que a pessoa existe

```
D no paciente 1 (existe)    -> 404 {"error":"Patient not found"}
D num id inventado          -> 404 {"error":"Patient not found"}
```

Resposta **idêntica**, byte a byte. Não há oráculo de existência.

### 3.4 O vínculo cortado pelo paciente corta na hora

Depois de o paciente encerrar o vínculo do nutricionista pelo app (§7):

```
NUT em /shares                  -> 404 {"error":"Patient not found"}
NUT em /shareable               -> 404 {"error":"Patient not found"}
NUT em /professional-documents  -> 404 {"error":"Patient not found"}
```

Antes do corte, as três respondiam 200. O vínculo restaurado em seguida devolveu
o acesso — a porta é o vínculo, não uma cópia dele em algum lugar.

### 3.5 ⚠️ [CORRIGIDA] A linha "Outro paciente" é **403**, e não 404

A tabela dizia `—` (404) para todas as células dessa linha. Medido:

```
paciente 2 (sessão web) em /api/admin/patients/<paciente 1>          -> 403 {"error":"Forbidden"}
                            .../wellbeing .../documents .../diagnosis
                            .../messages  .../shares                 -> 403 em todas
```

**Mas não é um furo, e a medição é que diz isso:**

```
paciente 2 -> /api/admin/patients/<paciente 1, que existe>  -> 403
paciente 2 -> /api/admin/patients/<id inventado>            -> 403
paciente 2 -> /api/admin/patients/<ele mesmo>               -> 403
```

As três respostas são a **mesma**. O 403 sai de `isStaff(actor)`, que é decidido
**antes** de qualquer consulta ao paciente: ele diz *"você não é da equipe"*, e
não *"esse registro não é seu"*. Não distingue existente de inexistente, não
distingue alheio de próprio — **não é oráculo**, e nenhum dado atravessa.

O critério de aceite — *"nenhuma tentativa adversária devolve dado"* — está
cumprido. O que estava errado era a letra da tabela, e fica corrigido aqui:

> | **Outro paciente** | **403 constante** — a mesma resposta para um paciente
> que existe, um id inventado e ele próprio. Nenhum dado, nenhum oráculo. |

**Pela rota do app**, aliás, a pergunta nem se formula: `/api/patient/*` resolve
o paciente pela sessão, e não há id na URL para trocar. Medido: o paciente 2 lê
`0 vínculos` e `0 partilhas` — as do paciente 1 não existem para ele (§7).

---

## 4. O tipo do profissional não muda nada — medido de duas formas

### 4.1 A forma da resposta é idêntica

`GET /api/admin/patients/<id>`, comparando **as chaves do objeto, os campos de
`patient` e `porPartilha`** entre os três tipos:

```
DOCTOR vs PSICOLOGO     : FORMA IDENTICA
DOCTOR vs NUTRICIONISTA : FORMA IDENTICA
```

E o campo a campo, com o dono ao lado como régua:

| campo de `patient` | A (dono) | C `DOCTOR` | PSI `PSYCHOLOGIST` | NUT `NUTRITIONIST` |
|---|---|---|---|---|
| `id`, `firstName`, `lastName`, `dateOfBirth`, `preferredLocale`, `isActive`, `createdAt` | presentes | **presentes** | **presentes** | **presentes** |
| `email`, `phone`, `address` | presentes | **ausentes** | **ausentes** | **ausentes** |
| `emergencyContactName` / `Phone` / `Relation` | presentes | **ausentes** | **ausentes** | **ausentes** |
| `intakeToken`, `intakeTokenExpiry` | presentes | **ausentes** | **ausentes** | **ausentes** |
| `hasPassword`, `consentAcceptedAt`, `fullAccessOverride`, `profileCompleted`, `role`, `updatedAt` | presentes | **ausentes** | **ausentes** | **ausentes** |
| `porPartilha` (raiz) | ausente | **`true`** | **`true`** | **`true`** |

Vinte e um campos, três tipos, zero diferenças entre eles.

### 4.2 E o conteúdo também — partilhando **o mesmo item** com os três

A primeira comparação de conteúdo deu "diferem", e valeu a pena olhar por quê:
o médico tinha `documents=1, soapNotes=1, professionalDocuments=1` e os outros
dois `0`. **Não era o tipo — era o que tinha sido partilhado com cada um.**

Então parti o mesmo exame do inquilino A para o psicólogo e para o nutricionista:

```
POST /shares  EXAM <mesmo exame>  -> psicologo      HTTP 200
POST /shares  EXAM <mesmo exame>  -> nutricionista  HTTP 200
```

E reli os três perfis:

```
DOCTOR         documents=QA102T9 exame de sangue | soapNotes=1 | professionalDocuments=1 | screening=null
PSICOLOGO      documents=QA102T9 exame de sangue | soapNotes=0 | professionalDocuments=0 | screening=null
NUTRICIONISTA  documents=QA102T9 exame de sangue | soapNotes=0 | professionalDocuments=0 | screening=null
```

**O mesmo item partilhado produz a mesma resposta nos três.** O que resta
diferente — a nota de sessão e a receita que só o médico tem — foi partilhado só
com ele, item a item, por decisão de alguém.

A afirmação da tabela está **provada**: a resposta é função de *o que foi
partilhado*, nunca de *que profissão a pessoa tem*. Não existe "os médicos veem
exames".

### 4.3 A linha do colega novo, medida

`Nina NovaNaEquipeC`, staff do inquilino C, criada depois de todas as partilhas:

```
/professional-documents  -> 200, 1 doc: "QA102T8 receita com registro"   <- o do inquilino dela
/wellbeing /documents /diagnosis /protocol-notes /rehab-plan  -> 404 nas cinco
perfil: porPartilha=true | documents=0 | professionalDocuments=0 | soapNotes=0
        campos de patient: createdAt, dateOfBirth, firstName, id, isActive, lastName, preferredLocale
```

Quatro células da linha confirmadas de uma vez: identidade sim, prontuário não,
partilha **nada** (`received: 0`, medido na T-9), e o que o inquilino dela
escreveu **sim** — pela rota de documentos profissionais, que é do inquilino.

---

## 5. A varredura — e a prova de que ela sabe falhar

```
npx jest __tests__/tenant/quem-ve-o-que.test.ts
  Test Suites: 1 passed | Tests: 9 passed | Time: 0.475 s
```

### 5.1 Mutei a árvore, e ela acusou nomeando o arquivo

Um teste de varredura que não sabe falhar não vale nada. Criei
`app/api/admin/qa-mutante-t10/route.ts` — uma rota realista, do tipo que a
varredura existe para pegar: lê `?patientId=` da query e consulta o banco sem
filtro de inquilino nenhum.

```
● toda rota que toca `patientId` tem parede › **nenhuma rota nova sem parede**
  +   "admin/qa-mutante-t10/route.ts",
Tests: 1 failed, 8 passed
```

Rota removida, varredura verde de novo. **Ela enxerga, e diz onde.**

### 5.2 As doze exceções, conferidas uma a uma contra o código

A varredura só vale se as exceções forem honestas. Abri as doze e confirmei em
qual das três formas legítimas cada uma cai:

| rota | forma | o que o código mostra |
|---|---|---|
| `biohacking/my-protocol` | 1 — o dono pergunta | `getEffectiveUser`, `patientId: effective…` |
| `dashboard/evolution` | 1 | `getServerSession`, `patientId: userId` |
| `dashboard/stats` | 1 | `getEffectiveUser`, `patientId: userId` |
| `patient/lab-consent` | 1 | `getEffectiveUser` |
| `appointments/[id]/video/call` | 1 | filtra por `therapistId` daquela consulta |
| `intake/[token]` | 2 — a credencial é o pedido | `findUnique({ where: { intakeToken: token } })`, 404 se não casar |
| `patient/invoices/[id]/pdf` | 2 | `verifyFileToken` |
| `webhooks/whatsapp` | 2 | `verifyWebhookSignature` |
| `cron/appointment-reminders` | 2 | `CRON_SECRET` |
| `cron/bp-reminders` | 2 | `CRON_SECRET` |
| `cron/exercise-reminders` | 2 | `CRON_SECRET` |
| `admin/appointments/generate-notes` | 3 — não há dado na resposta | **zero** `findMany/findFirst/findUnique` no arquivo |

Doze de doze conferem. Nenhuma está na lista por conveniência.

### 5.3 E a suíte inteira de parede

```
npx jest __tests__/tenant/
  Test Suites: 37 passed, 37 total
  Tests:       428 passed, 428 total
```

---

## 6. As duas rotas que a varredura pegou — as duas metades de cada uma

### 6.1 `GET /api/admin/rehab-plans/recent`

Era `findMany` **sem filtro nenhum**, devolvendo nome, sobrenome e
`chiefComplaint` dos últimos vinte planos **da plataforma inteira**. Com um plano
semeado em cada inquilino:

| quem pergunta | o que volta |
|---|---|
| **A** (dono do paciente 1) | 1 plano — `QA102T10 queixa do inquilino A (Qa102t8 Paciente Teste)` |
| **C** (médico com vínculo no paciente 1) | **0 planos** |
| **D** (outro inquilino) | 1 plano — `QA102T10 queixa do inquilino D (Pedro PacienteDoD)` |

Cada um só o do próprio inquilino, e **o vínculo não abre esta porta**: o médico
C, que trata o paciente do A, lê zero. Está certo — um plano de reabilitação não
é item de partilha, e ninguém lho passou.

A metade que importa também passa: **A e D continuam lendo os seus**. O filtro
não virou "recusa tudo".

### 6.2 `GET` e `PATCH /api/admin/clinical-scribe/recordings`

O `GET` montava o `where` com `?patientId=` direto; o `PATCH` atualizava por
`{ id }` sozinho — *"as duas pontas, a forma exata do incidente de 11/09"*.

**GET, com o `?patientId=` de um paciente do outro inquilino:**

| quem | query | o que volta |
|---|---|---|
| A | (sem filtro) | 1 — `QA102T10 gravacao do inquilino A [Qa102t8 Paciente Teste]` |
| A | `?patientId=<paciente do D>` | **0 — lista vazia** |
| D | (sem filtro) | 1 — `QA102T10 gravacao do inquilino D [Pedro PacienteDoD]` |
| D | `?patientId=<paciente do A>` | **0 — lista vazia** |

**PATCH, com o id de uma gravação alheia:**

| quem | gravação | resultado |
|---|---|---|
| A | do **próprio** inquilino | **200** — `status: "reviewed"`, `reviewedBy` gravado |
| A | do inquilino **D** | **404** `{"error":"Recording not found"}` |
| D | do inquilino **A** | **404** `{"error":"Recording not found"}` |
| D | do **próprio** inquilino | **200** — `status: "reviewed"` |

As quatro células. A diagonal funciona, a anti-diagonal é 404 — que é exatamente
a forma que o incidente de 11/09 tinha e que agora não tem.

---

## 7. O paciente vê e encerra cada acesso ✅

O critério fecha aqui, juntando o vínculo (T-3) e a partilha (T-9).

### 7.1 Quem tem acesso, e desde quando

```
GET /api/patient/care-links   (bearer do app)
{ "careLinks": [
  { "id":"…", "acceptedAt":"2026-09-29T03:08:47.143Z", "endedAt":null, "active":true,
    "professional": { "name":"QA102T10 Nutricionista", "kind":"Nutritionist",
                      "kindPt":"Nutricionista", "registry":"QA-CRN-333333", "registryKind":"CRN" } },
  { … "QA102T10 Psicologo",              "Psychologist", "QA-CRP-222222" },
  { … "QA102T8 Medico C (com registro)", "Doctor",       "QA-CRM-654321" },
  { … "QA102T8 Medico B (sem registro)", "Doctor" } ] }
```

Quatro acessos, cada um com **nome, profissão, número de registro e desde
quando**. É mais do que o critério pedia.

### 7.2 O que foi partilhado sobre ele, e por quem

```
GET /api/patient/care-shares   -> 6 partilhas
  Prescription or report  de Qa102t8 AdminA     -> para Carla ComRegistro
  Prescription or report  de Qa102t8 AdminA     -> para Carla ComRegistro | REVOGADA
  Prescription or report  de Qa102t8 AdminA     -> para Carla ComRegistro | REVOGADA
  Session note            de Qa102t8 AdminA     -> para Carla ComRegistro
  Exam or image           de Qa102t8 AdminA     -> para Carla ComRegistro
  Prescription or report  de Carla ComRegistro  -> para Qa102t8 AdminA
```

Inclui a que **não** tem ele como origem nem destino (a última, do médico para a
clínica) e as revogadas — que é o ponto.

### 7.3 E ele corta — com efeito medido do outro lado

```
DELETE /api/patient/care-links/<vínculo do nutricionista>   -> 200 {"ended":true}

a lista dele, logo depois:
  QA102T10 Nutricionista   Nutritionist  ativo=false | encerrado: 2026-09-29T03:12:24.966Z
  QA102T10 Psicologo       Psychologist  ativo=true
  QA102T8 Medico C         Doctor        ativo=true
  QA102T8 Medico B         Doctor        ativo=true

e o nutricionista, na mesma hora: 404 em /shares, /shareable e /professional-documents  (§3.4)
```

Cortou **um** acesso, não a relação inteira. (O vínculo foi restaurado depois,
para as medições de §4.)

### 7.4 As negativas do lado do paciente

```
paciente 2 em /api/patient/care-links    -> 0 vínculos
paciente 2 em /api/patient/care-shares   -> 0 partilhas
paciente 2 apagando o vínculo do paciente 1 -> 404 {"code":"not_open"}
sem token nenhum                            -> 401 {"code":"session_expired"}
```

O paciente 2 não vê nem uma linha do paciente 1 — e não porque a tela esconde:
não há id na URL para trocar, a sessão é que resolve quem é.

---

## 8. Contra os critérios de aceite da T-10

| critério | resultado |
|---|---|
| A tabela de quem-vê-o-quê existe e está no relatório de QA | ✅ §2, com as 30 células medidas e uma corrigida |
| Toda rota que aceita `patientId` passa pelo helper, provado por varredura | ✅ §5 — e a varredura foi **mutada e acusou** (§5.1), com as 12 exceções conferidas (§5.2) |
| Nenhuma tentativa adversária devolve dado — e todas devolvem 404 | ✅ quanto a **não devolver dado**; ⚠️ quanto à **letra**: o outro paciente leva 403, não 404 — §3.5 explica por que não é furo |
| O paciente consegue ver e encerrar cada acesso | ✅ §7, vínculo e partilha, com efeito medido do outro lado |
| O QA online repete a matriz adversária em produção | ⏳ **pendente por dependência** — §9 |

## 9. ⏳ O critério que não dá para fechar agora, e por quê

> *"O QA online repete a matriz adversária em produção, com paciente de teste."*

**Não foi medido, e não é falha.** A matriz em produção exige que este código
esteja em produção, o que exige um commit e um deploy — e commit só acontece
quando o Bruno pedir. Nada aqui foi commitado nem deployado.

Quando for a hora, o que este relatório deixa pronto:

- **O commit tem de ser confirmado na lista de deployments do Coolify** antes de
  medir — `buildDate` não prova deploy.
- **Paciente de teste identificado**, nunca um real. Os inquilinos `QA102T8`/
  `QA102T10` e o `Qa102t8 Paciente Teste` são o molde; em produção precisam ser
  criados de novo.
- **O limitador de taxa vai morder** (§0.1): 100 requisições por minuto por
  `ip + /api/admin`, e depois cinco minutos de bloqueio. A matriz de §3 são 125
  requisições — tem de ir em lotes, e um `429` lido como `404` seria um falso
  "está fechado".

## 10. Achados

1. **⚠️ [CORREÇÃO À TABELA, não defeito] A linha "Outro paciente" é 403, não
   404.** Medido em §3.5. O 403 vem de `isStaff`, antes de qualquer consulta, e
   é **idêntico** para um paciente que existe, um id inventado e ele próprio —
   não é oráculo e não devolve dado. A tabela do plano fica corrigida no §2.
2. **ℹ️ Fora do escopo, e continua aberto:**
   `POST /api/admin/patients/<id>/diagnosis` com corpo vazio responde **500**
   para o admin dono; as outras rotas respondem 400 no mesmo teste. Pré-existente
   e já registrado no relatório da T-9.
3. **ℹ️ Fora do escopo, medido a pedido:** `?tab=monitoramento` cai no resumo,
   porque `monitoramento` está fora de `ABAS_VALIDAS` desde a 099 — detalhe e
   varredura completa no `report-t-9.md`, §21.1. **De vinte abas, é a única.**

**Nenhum achado de segurança.** As 125 células da matriz, as duas rotas de §6 e
as quatro do `clinical-scribe` responderam o que deviam.

## 11. O que este QA não cobriu

- **Produção** (§9) — o único critério de aceite em aberto.
- **A tela do app do paciente** — a lista "quem tem acesso" e o botão de cortar.
  As rotas que a alimentam foram medidas inteiras (§7), o desenho não: o bundle
  do Expo web segue em 500 por cache do Metro (`@stripe/stripe-react-native`,
  instalado no disco), e o nativo depende de build EAS. **Mesma pendência da T-8
  e da T-9** — é a terceira vez que aparece, e é o que falta para a atividade.
- **Os outros dois tipos de inquilino.** `OTHER_PROFESSIONAL` e
  `PERSONAL_TRAINER` não entraram na matriz: a tabela fala dos que têm vínculo
  de cuidado, e o estúdio de personal tem parede própria (atividade 52).
  `DOCTOR`, `PSYCHOLOGIST` e `NUTRITIONIST` foram medidos.
- **Volume e concorrência.** Nenhum teste com muitos vínculos ou partilhas
  simultâneas.

## 12. Estado do banco ao fim

```
partilhas criadas por esta rodada: 2  (o mesmo exame, para o psicologo e para o nutricionista)
vinculo do nutricionista: encerrado pelo paciente as 03:12:24 e restaurado em seguida
gravacoes: as duas marcadas "reviewed" pelos respectivos donos (A e D)
planos de reabilitacao: um em A, um em D — ambos intactos
```

Tudo com prefixo `QA102T8`/`QA102T9`/`QA102T10`, em contas `@example.com`.
Nenhum dado real foi lido, escrito ou semeado.
