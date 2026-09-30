# QA — 110 T-2 a T-5

**Data:** 30/09/2026
**Onde:** local, worktree `C:\Users\bruno\orca\workspaces\clinic\app_clinic`, banco
local `bpr_clinic_local`. **Produção não foi tocada.**

**Resultado geral:** ⚠️ **aprovado com ressalvas — 22 dos 24 cenários passaram, 2
falharam.** As duas falhas são a mesma forma, em lugares diferentes: *esconder o
botão não é fechar a porta*, e *fechar a porta não é tirar a maçaneta da parede*.

| tarefa | veredito |
|---|---|
| **T-2** o prontuário obedece | ⚠️ **aprovado com ressalva** — o menu obedece nas duas direções; a **tela inicial** não |
| **T-3** o servidor nega | ❌ **uma falha nomeada** — `/api/patient/reports/[id]` entrega com `mod_records` desligado |
| **T-4** cada interruptor diz o que acende | ✅ **aprovado** |
| **T-5** ordem alfabética | ✅ **aprovado** |

---

## Onde isto foi medido

Par de portas próprio, isolado dos três servidores que já estavam de pé na
máquina, e `dist` separado para não disputar o `.next`:

```
:4075  -> next dev -p 4075, NEXT_DIST_DIR=.next-qa110b, NEXTAUTH_URL=http://localhost:4075
:8105  -> expo start --web --port 8105, EXPO_PUBLIC_API_URL=http://localhost:4075
```

**Confirmado pelo command line do processo**, e não por suposição — as duas
árvores de processo apontam para este worktree:

```
node ...\orca\workspaces\clinic\app_clinic\node_modules\.bin\..\next\dist\bin\next dev -p 4075
node ...\orca\workspaces\clinic\app_clinic\mobile\node_modules\.bin\..\expo\bin\cli start --web --port 8105
```

O `EXPO_PUBLIC_API_URL` é obrigatório: o padrão do app é `https://bpr.clinic`
(`mobile/src/api/config.ts:6`). Os Expo que já estavam de pé (`:8081`, `:8082`,
`:8090`) **não foram usados**.

**Chunk velho: descartado por três provas independentes.** (i) porta e `dist`
novos; (ii) o menu do app mudou a cada interruptor — só o código novo faz isso;
(iii) a tela de padrão já trouxe no DOM as linhas *"In the app: …"* que a sessão
principal acrescentou **durante** este QA, minutos antes da captura.

**Contas de teste, nenhuma real, nenhuma criada** — reaproveitadas da 106:

| papel | quem |
|---|---|
| admin | `qa106.admin@example.com` (clínica `qa106-clinica-de-teste`) |
| paciente | `Qa106 PacienteTeste` — `qa106.paciente@example.com` |
| paciente de **outro** inquilino | `qa106b.paciente@example.com` (clínica `qa106b-outra-clinica`) |
| terapeuta (autor da nota) | `qa106.terapeuta@example.com` |

Nenhum e-mail e nenhum push: nenhuma rota exercitada aqui dispara envio.

**Como o estado foi mudado.** Sempre pela rota que o botão do painel chama —
`PATCH /api/admin/patients/<id>/permissions` com `action: updateOverrides`, com a
sessão do admin, **200** em todas as trocas. O caminho painel → banco → app foi
percorrido inteiro, não simulado.

---

## Resumo

| # | cenário | tipo | resultado |
|---|---|---|---|
| 2.1 | `mod_clinical_notes` **desligado** → *My records* sai do menu | UI | ✅ |
| 2.2 | `mod_clinical_notes` **ligado** → volta | UI | ✅ |
| 2.3 | `mod_documents` desligado / ligado | UI | ✅ |
| 2.4 | `mod_messages` desligado / ligado | UI | ✅ |
| 2.5 | **Tudo** desligado → *Terms & consent*, *Who has access*, *Notifications* ficam | UI | ✅ |
| 2.6 | Estado de hoje, nada mexido → menu idêntico | UI | ✅ |
| 2.7 | **O inverso do par**: progresso desligado, nota ligada | UI | ✅ |
| 2.8 | **A tela inicial obedece ao interruptor** *(derivado)* | UI | ❌ |
| 3.1 | Tabela módulo → rota, sem buracos | API | ✅ |
| 3.2 | As **quatro** rotas da nota, módulo desligado — status exato | API | ✅ |
| 3.3 | As mesmas quatro, módulo ligado — o controle | API | ✅ |
| 3.4 | Sessão de outro inquilino → **404**, nunca 403 | API | ✅ |
| 3.5 | Menu escondido + rota digitada à mão | UI | ✅ |
| 3.6 | `/api/patient/reports` desligado / ligado | API | ✅ |
| 3.7 | `/api/patient/reports/[id]` desligado *(derivado)* | API | ❌ |
| 3.8 | O canal do app (**Bearer**) nega igual *(extra)* | API | ✅ |
| 4.1 | Ligar **um** e ver o que acendeu — *BPR Journey*, EN e PT | UI | ✅ |
| 4.2 | O módulo que governa vários itens os lista | UI | ✅ |
| 4.3 | Declaração × menu de verdade, **nos dois sentidos**, EN e PT | UI | ✅ |
| 4.4 | A tela de padrão para novos também diz *(extra)* | UI | ✅ |
| 5.1 | Cada grupo em ordem, em inglês — **as duas telas** | UI | ✅ |
| 5.2 | Em português, ordem **portuguesa** | UI | ✅ |
| 5.3 | Acento não vai para o fim | UI | ✅ |
| 5.4 | Os grupos na ordem de hoje | UI | ✅ |

Extras: as suítes `__tests__/permissoes/*` rodadas no ambiente (**31/31, 3
suítes**) e **quatro provas por mutação refeitas pelo QA**, incluindo a do PDF
que a T-1 não pôde medir.

---

## T-2 — o prontuário obedece

### O par, medido nas duas direções

O menu do app, lido do DOM, em quatro estados. Só o interruptor muda entre eles.

| linha do menu | A: tudo ligado | B: **nota** desligada | C: **progresso** desligado | E: tudo desligado |
|---|---|---|---|---|
| Messages | ✔ | ✔ | ✔ | — |
| **My records** | ✔ | **—** | ✔ | — |
| My documents | ✔ | ✔ | ✔ | — |
| **Outcome measures** | ✔ | ✔ | **—** | — |
| **My reports** | ✔ | ✔ | **—** | — |
| Terms & consent | ✔ | ✔ | ✔ | **✔** |
| Who has access | ✔ | ✔ | ✔ | **✔** |
| Notifications | ✔ | ✔ | ✔ | **✔** |

B e C são **complementares**: em B sai o prontuário e ficam as medidas e os
relatórios; em C sai o contrário. A divisão é real na tela, e nos dois sentidos —
não é um app que esconde tudo nem um que mostra tudo.

**2.1 / 2.2 ✅** — `mod_clinical_notes` desligado tira *My records* e **só** ele:

```
A (tudo ligado):  Messages | My records | My documents | Invoices | People I look after |
                  Plans | Assessment screening | My progress | Outcome measures | My reports |
                  Blood pressure | Devices | How it works | Terms & consent | Who has access | Notifications

B (nota off):     Messages |    ---     | My documents | Invoices | People I look after |
                  Plans | Assessment screening | My progress | Outcome measures | My reports |
                  Blood pressure | Devices | How it works | Terms & consent | Who has access | Notifications
```

Evidências: `screenshots/t2-app-menu-A-tudo-ligado.png`,
`screenshots/t2-app-menu-B-nota-desligada.png`

**2.7 ✅ o inverso** — `mod_records` desligado, nota ligada:

```
C:  Messages | My records | My documents | Invoices | People I look after |
    Plans | Assessment screening | My progress |  ---  |  ---  |
    Blood pressure | Devices | How it works | Terms & consent | Who has access | Notifications
```

Evidência: `screenshots/t2-app-menu-C-progresso-desligado.png`

**2.3 ✅ / 2.4 ✅** — cada interruptor mexe na **sua** linha e em nenhuma outra:
desligar `mod_documents` tira *My documents* e deixa *Messages*; desligar
`mod_messages` tira *Messages* e deixa *My documents*.

Evidências: `screenshots/t2-app-menu-D-documentos-desligado.png`,
`screenshots/t2-app-menu-F-mensagens-desligado.png`

### 2.5 — o cenário que impede a correção de ir longe demais ✅

Com os **24** módulos desligados (só `mod_clinica` ligado, senão não há área
clínica para entrar), o menu fica com exatamente as **seis** linhas sem chave:

```
Invoices | People I look after | Blood pressure | Terms & consent | Who has access | Notifications
```

Os três que a spec nomeia estão lá. E nenhuma linha **com** chave sobrou — o
portão não falhou aberto nesta medição.

Evidência: `screenshots/t2-app-menu-E-tudo-desligado.png`

### 2.6 — ninguém perde acesso ao atualizar ✅

Com o estado **como este QA encontrou o paciente** (`fullAccessOverride: true`,
`moduleOverrides: null`), o menu mostra **todas as 20 linhas** que a tela sabe
mostrar:

```
Messages | My records | My documents | Invoices | People I look after | Treatment plan |
Plans | Pending actions | Assessment screening | My progress | Outcome measures | My reports |
Daily check-in | Blood pressure | Articles | Devices | How it works | Terms & consent |
Who has access | Notifications
```

Isto fecha o cenário sem precisar de suposição: o menu **de antes** não podia
mostrar mais de 20 linhas, e o **de agora**, neste estado, mostra as 20. Logo
nenhuma linha foi perdida.

E o mesmo menu sai por um caminho de código diferente — os **24 interruptores
ligados na mão**, sem `fullAccessOverride` —, byte a byte:

```
5ed5ffb6ecdfb42f0bcbebbf99f639784b7b49019da5e7748791a7ddae2a3281  t2-app-menu-G-estado-de-hoje.png
5ed5ffb6ecdfb42f0bcbebbf99f639784b7b49019da5e7748791a7ddae2a3281  t2-app-menu-H-24-interruptores-ligados.png
```

**O que este QA mediu sobre "perder acesso", e o que não conseguiu medir.**

A troca que custaria acesso de verdade é um paciente com **`mod_records`
concedido e `mod_clinical_notes` não**: antes a API servia a nota (guardada em
`mod_records`), agora responde 403. Medido no banco local:

```
planos totais: 1     |  planos que concedem UM sem o OUTRO: 0
pacientes: 91        |  com override de um sem o outro:     0
assinaturas ativas: 0
```

Zero divergências — mas **o banco local não responde pela produção**: tem um
plano e nenhuma assinatura ativa. A afirmação do implementador ("em produção
nenhum plano concede um sem o outro e nenhum paciente tem override de um sem o
outro") **não foi verificada por este QA** e precisa de ser conferida em produção
antes do release. Fica registrado como pendência, não como falha.

Registro estrutural, do catálogo: dos três módulos que ganharam chave, só
`mod_messages` é `defaultGranted`. `mod_clinical_notes` e `mod_documents` só vêm
por plano, por pacote de tratamento (`TREATMENT_MODULES`, que concede os dois
**juntos**) ou por override. O passo 5 da T-2 — *"conferir que os três já vêm
ligados por padrão hoje"* — é verdade para um, não para três.

### 2.8 ❌ — a tela inicial não obedece ao interruptor

**O menu ganhou chave; a tela inicial não.**
`mobile/app/(app)/(clinica)/(tabs)/index.tsx` tem um cartão *Quick links* com
quatro atalhos escritos à mão e **sem portão de módulo** — embora o arquivo já
carregue `patient-access` na linha 59:

| atalho na Home | para onde vai | módulo que a rota exige |
|---|---|---|
| Pain trend | `/outcome-measures` | `mod_records` |
| Book a new session | `/appointments` | `mod_appointments` |
| **My records** | `/clinical-notes` | `mod_clinical_notes` |
| **Message the clinic** | `/messages` | `mod_messages` |

Com os **24 interruptores desligados**, a Home continua mostrando os quatro. E a
captura da Home com *só as mensagens* desligadas é **o mesmo arquivo, byte a
byte**, da Home com **tudo** desligado:

```
ec8f46ab2f617f31c88ab2d8d9d17cb78b8b8dfe27cd141034a7917cce497e3e  t2-app-home-mensagens-desligado.png
ec8f46ab2f617f31c88ab2d8d9d17cb78b8b8dfe27cd141034a7917cce497e3e  t2-app-home-tudo-desligado-4-atalhos.png
```

A tela inicial **não muda um pixel** entre um módulo desligado e todos
desligados. Tocar no atalho leva à tela do portão:

> *"Not included in your plan — Your clinic can add this to your plan. Ask them
> if you think this is wrong."*

Que é **exatamente** o defeito que a T-2 nomeou — *"o paciente vê o botão, toca,
e cai num erro… a porta está fechada; sobrou a maçaneta na parede"* — resolvido
no menu e vivo na primeira tela que o paciente abre.

O critério de aceite diz *"Desligar Clinical Notes esconde **My records** no
app"*. Lido como está escrito, não se cumpriu: *My records* continua na Home.
Lido como *"no menu"*, cumpriu-se. Registro a diferença e deixo a decisão para a
sessão principal — os arquivos afetados da T-2 listavam só `profile.tsx`, então
isto é a mesma falha um arquivo ao lado, não um erro de execução.

Evidências: `screenshots/t2-app-home-tudo-desligado-4-atalhos.png`,
`screenshots/t2-app-atalho-home-cai-em-erro.png`

---

## T-3 — o servidor nega

### 3.1 / 3.2 / 3.3 ✅ — as **quatro** superfícies da nota, medidas nos dois sentidos

Sessão do paciente de teste, mesma chamada, só o interruptor muda. **Status
exato**, nunca "≠ 200":

| rota | progresso ON + nota **ON** | progresso ON + nota **OFF** | progresso **OFF** + nota ON |
|---|---|---|---|
| `GET /api/patient/clinical-notes` | **200**, 294 B, a nota | **403** `module_not_in_plan` | **200**, a nota |
| `GET /api/soap-notes?patientId=…` | **200**, 709 B | **403** | **200** |
| `GET /api/soap-notes/<id>` | **200**, 697 B | **403** | **200** |
| `GET /api/soap-notes/<id>/pdf` | **200**, `text/html`, 4343 B | **403** | **200**, 4343 B |
| `GET /api/patient/outcome-measures` | **200**, as medidas | **200**, as medidas | **403** |
| `GET /api/patient/reports` | **200**, o relatório | **200**, o relatório | **403** |
| `GET /api/patient/documents` | **200** | **200** | **200** |
| `GET /api/patient/messages` | **200** | **200** | **200** |

Com a nota desligada, as **quatro** superfícies negam — **inclusive o PDF e a
nota individual por id**, que era o buraco deixado por umas horas — e nenhuma
devolve nota nenhuma no corpo:

```
--- GET /api/patient/clinical-notes
    HTTP 403  content-type=application/json  bytes=145
    {"error":"Clinical Notes is not included in your plan",
     "errorPt":"Notas Clínicas não está incluído no seu plano","code":"module_not_in_plan"}
--- GET /api/soap-notes?patientId=cmummnahc0004xz0kkd41tg1c
    HTTP 403  bytes=55   {"error":"Clinical Notes is not included in your plan"}
--- GET /api/soap-notes/cmunru3xu0001xzr493zubt1w
    HTTP 403  bytes=55   {"error":"Clinical Notes is not included in your plan"}
--- GET /api/soap-notes/cmunru3xu0001xzr493zubt1w/pdf
    HTTP 403  bytes=55   {"error":"Clinical Notes is not included in your plan"}
```

E no mesmo instante, com o progresso ligado, as medidas e os relatórios
**continuam funcionando** — que é o ponto da divisão:

```
--- GET /api/patient/outcome-measures
    HTTP 200  {"measures":{"vasScore":3,"faamAdl":40,"faamSport":20,…}}
--- GET /api/patient/reports
    HTTP 200  {"reports":[{"id":"cmunru3xz0003xzr4bgtu02ke","cadence":"WEEKLY",…}]}
```

O inverso fecha o par: com `mod_records` desligado e a nota ligada, as duas
respondem **403 "My Records is not included in your plan"** e as quatro da nota
voltam a **200** com o dado.

### 3.6 ✅ — `/api/patient/reports`, o buraco que a T-3 fechou

```
mod_records LIGADO   : GET /api/patient/reports -> HTTP 200, 417 B, o relatório
mod_records DESLIGADO: GET /api/patient/reports -> HTTP 403
   {"error":"My Records is not included in your plan","code":"module_not_in_plan"}
```

### 3.7 ❌ — `/api/patient/reports/[id]` continua entregando

A lista fechou; **o relatório por id não**. Mesma sessão, mesmo instante, com
`mod_records` **desligado**, e sem token assinado nenhum:

```
##### mod_records DESLIGADO #####
GET /api/patient/reports                            -> HTTP 403 ct=application/json bytes=140
      {"error":"My Records is not included in your plan","code":"module_not_in_plan"}
GET /api/patient/reports/cmunru3xz0003xzr4bgtu02ke  -> HTTP 200 ct=text/html; charset=utf-8 bytes=33
      <h1>QA110 relatorio ficticio</h1>
```

E o próprio log do servidor, uma linha embaixo da outra:

```
GET /api/patient/reports 403 in 77ms
GET /api/patient/reports/cmunru3xz0003xzr4bgtu02ke 200 in 107ms
```

**A causa está em `app/api/patient/reports/[id]/route.ts:34`** — o caminho sem
token assinado chama `patientGate()` **sem módulo**:

```ts
const assinado = verifyFileToken(req.nextUrl.searchParams.get("t"), params.id);
let userId = assinado;
if (!userId) {
  const gate = await patientGate();   // <- sem { module: "mod_records" }
  if (gate.response) return gate.response;
  userId = gate.gate!.userId;
}
```

É a mesma forma que a T-3 acabou de corrigir na lista, e a mesma que o
implementador corrigiu em `soap-notes/[id]`: fechou-se a porta da frente e
esqueceu-se a de serviço. O critério de aceite da T-3 — *"Nenhuma rota de módulo
desligado entrega dado clínico"* — não se cumpre.

Duas notas de escopo, para não exagerar nem diminuir:

- **O link assinado (`?t=…`) não é o problema.** Ele é cunhado pela lista, que
  agora responde 403 — então com o módulo desligado não nasce token novo. Só um
  token já emitido, dentro dos cinco minutos, ainda abriria.
- **O que sai é um relatório de acompanhamento**, escrito *para* o paciente, não a
  nota crua do terapeuta. Menos grave que a nota clínica. Mas é dado que o
  interruptor esconde, e o interruptor não fecha.

**Uma linha**, do mesmo tamanho da que a T-3 já escreveu:
`patientGate({ module: "mod_records" })`.

**Varredura do resto.** Li as 47 chamadas de `patientGate(` sem módulo em
`app/api/patient/**`. As outras são a família "não há módulo para pedir" que o
levantamento já descreveu — conta, senha, consentimento, faturas, pressão
arterial, `onboarding-status`, `care-links`, `care-shares`. `reports/[id]` é a
**única** rota de detalhe de uma lista governada por módulo que não pede o módulo.
`patient/documents` não tem rota de detalhe.

### 3.4 ✅ — outro inquilino recebe **404**, nunca 403

Sessão de `qa106b.paciente@example.com` (clínica `qa106b-outra-clinica`) pedindo
dado da clínica `qa106`:

```
GET /api/soap-notes/<id de A>            -> HTTP 404  {"error":"Clinical note not found"}
GET /api/soap-notes/<id de A>/pdf        -> HTTP 404  {"error":"Clinical note not found"}
GET /api/patient/reports/<id de A>       -> HTTP 404  {"error":"Not found"}
GET /api/soap-notes?patientId=<id de A>  -> HTTP 200  {"soapNotes":[]}
```

O 404 do relatório precisou de um passo a mais para ser honesto: na primeira
medição o paciente B veio **403 `consent_required`**, porque ele não tem
consentimento — o portão recusava antes de chegar ao inquilino. Com um
consentimento posto **e depois removido**, a rota responde o **404** que o cenário
pede. Sem esse passo eu teria escrito "403" e chamado de falha o que era outra
regra funcionando.

### 3.5 ✅ — menu escondido + rota digitada à mão

Com *My records* fora do menu, a rota do app digitada na barra
(`http://localhost:8105/clinical-notes`) mostra o portão e **nenhuma nota**:

> *"Not included in your plan — Your clinic can add this to your plan. Ask them if
> you think this is wrong. — Go back"*

Evidência: `screenshots/t3-app-rota-digitada-nota-desligada.png`

### 3.8 ✅ — o canal do app nega igual

O app não usa cookie, usa `Bearer`. A memória desta casa avisa que *middleware
decide antes da rota* e que pedido do app morre no portão de sessão. Medido com um
token de `POST /api/mobile/login`, no estado "progresso ON + nota OFF":

```
GET /api/patient/clinical-notes   -> HTTP 403  {"error":"Clinical Notes is not included…"}
GET /api/patient/reports          -> HTTP 200
GET /api/patient/outcome-measures -> HTTP 200
GET /api/patient/access           -> HTTP 200
  {"modules":["mod_dashboard","mod_profile","mod_plans","mod_consent","mod_guide",
   "mod_screening","mod_messages","mod_devices","mod_clinica","mod_records","mod_documents"]}
```

`mod_clinical_notes` ausente da lista, `mod_records` presente — é essa lista que o
menu do app lê, e é por ela que *My records* desaparece.

---

## T-4 — cada interruptor diz o que acende

### 4.3 ✅ — a declaração × o menu de verdade, **nos dois sentidos** e nas duas línguas

As 14 linhas do menu que carregam chave, contra as 14 declaradas pelo painel. Lido
do DOM das duas telas, não do código:

| chave | o painel promete (EN) | o app mostra (EN) | o painel promete (PT) | o app mostra (PT) |
|---|---|---|---|---|
| `mod_messages` | Messages | Messages | Mensagens | Mensagens |
| `mod_clinical_notes` | My records | My records | Meu prontuário | Meu prontuário |
| `mod_documents` | My documents | My documents | Meus documentos | Meus documentos |
| `mod_treatment` | Treatment plan | Treatment plan | Plano de tratamento | Plano de tratamento |
| `mod_plans` | Plans | Plans | Planos | Planos |
| `mod_tasks` | Pending actions | Pending actions | Pendências | Pendências |
| `mod_screening` | Assessment screening · My progress | os dois | Avaliação · Meu progresso | os dois |
| `mod_records` | Outcome measures · My reports | os dois | Medidas de evolução · Meus relatórios | os dois |
| `mod_journey` | **Daily check-in** | **Daily check-in** | **Check-in diário** | **Check-in diário** |
| `mod_education` | Articles | Articles | Artigos | Artigos |
| `mod_devices` | Devices | Devices | Dispositivos | Dispositivos |
| `mod_guide` | How it works | How it works | Como funciona | Como funciona |

14 nomes declarados, 14 linhas com chave no menu, **nenhuma sobra dos dois lados**.
As seis linhas sem chave — *Invoices*, *People I look after*, *Blood pressure*,
*Terms & consent*, *Who has access*, *Notifications* — não são prometidas por
módulo nenhum, que é o certo.

E os quatro sem tela **não declaram nada** e levam o selo, nas duas telas e nas
duas línguas:

```
Pre-Consultation Recording | Not in the app yet | (sem linha "In the app:")
Achievements               | Not in the app yet | (sem linha)
Community                  | Not in the app yet | (sem linha)
Marketplace                | Not in the app yet | (sem linha)
```

Evidências: `screenshots/t4-t5-painel-paciente-en.png`,
`screenshots/t4-t5-painel-paciente-pt.png`,
`screenshots/t4-app-menu-pt-nomes-declarados.png`

### 4.1 ✅ — o cenário do Bruno, invertido: ligar **um** e ver o que acendeu

Todos os 24 desligados menos `mod_clinica`, e depois **só** *BPR Journey* ligado. A
única linha que acende além das seis sem chave:

```
inglês:     Invoices | People I look after | >> Daily check-in << | Blood pressure |
            Terms & consent | Who has access | Notifications

português:  Faturas | Quem eu cuido | >> Check-in diário << | Pressão arterial |
            Termos & consentimento | Quem tem acesso | Notificações
```

Que é palavra por palavra o que o painel prometeu: *"In the app: Daily check-in"* /
*"No app: Check-in diário"*. O Bruno ligou três e não viu nada; agora liga um e vê
o que ligou, com o nome certo.

Evidências: `screenshots/t4-app-so-jornada-ligada-en.png`,
`screenshots/t4-app-so-jornada-ligada-pt.png`

### 4.2 ✅ — quem governa vários itens os lista

`mod_records` → *"In the app: Outcome measures · My reports"* / *"No app: Medidas de
evolução · Meus relatórios"*. `mod_screening` → *"Assessment screening · My
progress"* / *"Avaliação · Meu progresso"*. Confirmado contra o menu: os dois itens
aparecem e desaparecem juntos.

### 4.4 ✅ — a tela de padrão para novos também diz

A assimetria que o QA da T-1 apontou foi fechada **durante** este QA. A tela
`/admin/patients/permissions-default` agora traz, por módulo, a linha do que acende
e, nos quatro sem tela, o aviso. Medido já com o código novo:

```
CLINICAL
  Clinical Notes ~ In the app: My records
  My Records     ~ In the app: Outcome measures · My reports
  Pre-Consultation Recording [SELO] [AVISO]
CONTENT & EDUCATION
  BPR Journey    ~ In the app: Daily check-in
  Achievements   [SELO] [AVISO]
```

Em português, o mesmo: *"Notas Clínicas ~ No app: Meu prontuário"*, *"Jornada BPR ~
No app: Check-in diário"*, e *"Ligar isto não muda o que o paciente vê."*

Evidências: `screenshots/t4-t5-padrao-novos-en.png`,
`screenshots/t4-t5-padrao-novos-pt.png`

---

## T-5 — a ordem

### 5.1 / 5.4 ✅ — cada grupo em ordem, os grupos na ordem de hoje

**Tela do paciente, inglês** — 5 grupos de módulo + 5 de permissão, lidos do DOM na
ordem em que a tela os pinta:

```
MAIN (ALWAYS VISIBLE): Assessment Screening | Dashboard | How It Works | My Profile |
                       Plans & Membership | Terms & Consent
CLINICAL:              Appointments | Clinical Notes | Messages | My Documents |
                       My Records | Pending Actions | Pre-Consultation Recording | Treatment Plan
WELLBEING & SELF-CARE: Devices | My Exercises
CONTENT & EDUCATION:   Achievements | BPR Journey | Community | Education | Marketplace | Quizzes
APP AREAS:             Clinic (app area) | Laboratory (app area)
BOOKINGS:              Book In-Person Appointments | Book Online Consultations
CONTENT ACCESS:        Download PDF Reports | View Educational Articles | View Exercise Videos
COMMUNICATION:         Chat with Therapist | Email Notifications | WhatsApp Notifications
CLINICAL:              Request Cancellation
ADVANCED FEATURES:     AI Health Insights | Progress Tracking
```

Ordem dos grupos: `core → clinical → wellness → content → app_areas`, igual a
`MODULE_CATEGORIES`. Principal primeiro, como a T-5 pediu.

A tela de padrão para novos sai na mesma ordem, sem o grupo `core` (ela mostra só o
governável).

### 5.2 ✅ — em português, ordem portuguesa, não a inglesa traduzida

Esta é a que separa as duas línguas, e ela aparece na tela — **dois pares trocam de
lugar** quando se troca o idioma:

| grupo | inglês | português | o que aconteceu |
|---|---|---|---|
| CONTENT & EDUCATION | **Achievements**, Community, … | **Comunidade**, **Conquistas**, … | *Achievements* era o 1º e virou o 2º |
| ADVANCED FEATURES | **AI Health Insights**, Progress Tracking | **Acompanhamento de Progresso**, Insights de Saúde com IA | os dois trocam |

Uma função que ordenasse sempre pelo rótulo inglês daria a ordem da coluna da
esquerda nas duas telas. Dá a da direita.

O grupo clínico em português, completo:

```
CLINICAL: Ações Pendentes | Consultas | Gravação Pré-Consulta | Mensagens |
          Meus Documentos | Meus Registros | Notas Clínicas | Plano de Tratamento
```

`Mensagens` < `Meus Documentos` < `Meus Registros` — a comparação desce até a
terceira letra e acerta.

Evidências: `screenshots/t5-painel-permissoes-detalhadas-en.png`,
`screenshots/t5-painel-permissoes-detalhadas-pt.png`

### 5.3 ✅ — acento não vai para o fim

**"Ações Pendentes" é a primeira linha do grupo clínico**, não a última. Um
`sort()` cru põe `Ações` depois de `z`. Outros no mesmo teste: *Notificações por
Email* / *por WhatsApp* ficam no **N**; *Avaliação* no **A**; *Educação* no **E**;
*Meus Exercícios* no **M**.

---

## Provas por mutação, refeitas pelo QA

A T-1 registrou que não pôde refazer as mutações porque o arquivo estava sendo
editado em paralelo. Refiz quatro. Cada arquivo foi copiado antes, restaurado
depois e **conferido por `sha256`** — todos voltaram byte a byte, e as três suítes
voltaram verdes ao fim de cada uma.

| # | mutação | resultado |
|---|---|---|
| 1 | `app/api/soap-notes/[id]/pdf/route.ts`: `mod_clinical_notes` → `mod_records` (refazer o esquecimento do PDF) | ✅ **1 teste cai e nomeia o arquivo**: `"app/api/soap-notes/[id]/pdf/route.ts"` |
| 2 | `lib/ordenar-modulos.ts`: `localeCompare` → comparação de código (`sort()` cru) | ✅ cai *"maiúscula não vem antes de toda minúscula"*, com `Damasco` antes de `banana` |
| 3 | `lib/ordenar-modulos.ts`: ordenar sempre pelo rótulo **inglês** | ✅ cai *"cada grupo sai em ordem, nas duas línguas"* |
| 4a | `lib/module-registry.ts`: `mod_journey` com o português errado (`"Jornada BPR"`) | ✅ **2 testes caem**, e um diz: `mod_journey: em PT o menu diz "Check-in diário" e o painel diria "Jornada BPR"` |
| 4b | `lib/module-registry.ts`: declarar **metade** do que `mod_screening` acende | ✅ cai o sentido inverso e nomeia o omitido: `mod_screening: o menu mostra "My progress" e o painel não diz` |

**Uma mutação que a suíte não pega, e que eu não considero defeito:** fixar o
locale do comparador em `"en-GB"` **continuando** a comparar os rótulos portugueses
deixa os 10 testes verdes. Comparei o comportamento: com `sensitivity: "base"` e
alfabeto latino, `en-GB` e `pt-BR` colacionam igual, então a mutação não muda o que
sai na tela. O que importa é qual **rótulo** se compara — e isso a mutação 3 cobre.

As suítes no ambiente deste QA:

```
npx jest __tests__/permissoes --ci
Test Suites: 3 passed, 3 total
Tests:       31 passed, 31 total
```

(`a-nota-clinica-tem-interruptor-proprio.test.ts`, `a-ordem-das-listas.test.ts`,
`o-painel-nao-promete.test.ts`)

---

## Erros de console

**Nenhum erro de JavaScript.** 62 entradas de nível `error` em toda a sessão, e
todas as 62 são `Failed to load resource`:

| o quê | quantas | de onde |
|---|---|---|
| `403` em `/api/patient/protocol` e `/api/exercises` | 16 + 16 | paciente sem `mod_treatment`/`mod_exercises` — esperado nos estados desligados |
| `403` em `/api/patient/messages` | 6 | o estado com as mensagens desligadas — esperado, é o cenário |
| `ERR_CONNECTION_REFUSED` em `localhost:4070` | 15 | aba sobrevivente do QA da T-1, cujo servidor já não existe; alheio |
| `404` em `/favicon.ico` | 1 | ruído |

Zero exceções lançadas. O log do `next dev` também fechou sem erro de compilação.

---

## Ressalvas e observações, fora dos critérios

**1. Os títulos de grupo não traduzem na tela do paciente.** Com a tela em
português, os rótulos das linhas vêm traduzidos e os **cabeçalhos de grupo
continuam em inglês**: `MAIN (ALWAYS VISIBLE)`, `CLINICAL`, `WELLBEING &
SELF-CARE`, `CONTENT & EDUCATION`, `APP AREAS`. O `MODULE_CATEGORIES` tem
`labelPt` e `app/admin/patients/[id]/permissions/page.tsx` usa `cat.label` direto.
A tela de padrão, ao lado, usa `isPt ? cat.labelPt : cat.label` e traduz —
`CLÍNICO`, `BEM-ESTAR`, `CONTEÚDO & EDUCAÇÃO`, `ÁREAS DO APP`. **É anterior a esta
atividade** (o diff da T-5 não tocou nessa linha) e não afeta a ordem, que é o que
a T-5 pede. Fica o registro: duas telas gêmeas discordam numa palavra que está a um
`isPt` de distância.

**2. O `t-2-o-prontuario-obedece.md` contradiz o código e a si mesmo.** O passo 1
diz *"`My records` passa a ler **`mod_records`** — corrigido depois do levantamento
da T-3; este passo dizia `mod_clinical_notes`, e estava errado"*. O código entregue
lê `mod_clinical_notes`, e os critérios de aceite do mesmo arquivo dizem *"desligar
**Clinical Notes** esconde My records"*. A decisão final (a divisão) está certa e é
a que a `qa-spec` cobra; é o texto do passo que ficou uma volta atrás. Mesma coisa
em `qa/levantamento-t-3.md`, na tabela *"Os outros que passam no exame"*: a linha
`My records | (nenhum → mod_records)`. Quem ler esses dois arquivos em dois meses
vai concluir o contrário do que foi feito.

**3. O selo *Admin Override* voltou a conviver com o *Not in the app yet***, como a
ressalva da T-1 pediu. Confirmado na leitura do DOM: `Pre-Consultation Recording`
aparece com `Not in the app yet + Blocked`, e as linhas com override manual
aparecem com `Admin Override + Locked/Unlocked` — inclusive `Clinical Notes`, que
no estado medido trazia `Admin Override + Locked`.

**4. O `mod_clinical_notes` deixou de ser um interruptor sem leitor.** Ficava em
aberto no levantamento da T-3 — *"o que fazer com o interruptor Clinical Notes, que
nenhum código lê"*. Agora quatro rotas de API, a página da web e o menu do app o
leem. A pergunta ao Bruno morreu por implementação.

---

## Estado deixado para trás

| o quê | como ficou |
|---|---|
| `qa106.paciente`: `fullAccessOverride`, `moduleOverrides`, `preferredLocale` | **restaurados** (`true`, `null`, `en-GB`) |
| `qa106b.paciente`: `moduleOverrides`, `consentAcceptedAt` | **restaurados** (`null`, `null`) |
| 1 `SOAPNote`, 1 `PatientReport`, 1 `PatientOutcomeMeasure` criados para os controles | **apagados** — o paciente voltou a 0 de cada |
| `tsconfig.json` | **revertido** — o dev server acrescentou `.next-qa110b/types` |
| `lib/module-registry.ts`, `lib/ordenar-modulos.ts`, `app/api/soap-notes/[id]/pdf/route.ts` | **restaurados**, `sha256` conferido; suítes verdes depois |
| servidores `:4075` e `:8105` | **derrubados**; as portas estão livres |
| senhas das contas de teste | trocadas no banco **local** e não restauradas (o hash antigo não é recuperável) |
| paciente criado ou apagado | **nenhum** |
| produção | **não tocada** |

`git status` ao fim deste QA lista exatamente os arquivos da sessão principal, e
nenhum a mais.

---

## Falhas e recomendações

### ❌ 3.7 — `/api/patient/reports/[id]` entrega com `mod_records` desligado

- **O que acontece:** a lista responde 403 e o relatório por id responde **200** com
  o HTML guardado, na mesma sessão, sem token assinado.
- **Onde olhar:** `app/api/patient/reports/[id]/route.ts:34` — `patientGate()` sem
  `module`.
- **Tamanho:** uma linha, igual à que a T-3 já escreveu:
  `patientGate({ module: "mod_records" })`.
- **O que acrescentar ao teste, para não voltar:** a suíte
  `a-nota-clinica-tem-interruptor-proprio.test.ts` varre as superfícies da nota. Uma
  varredura irmã — *toda rota de detalhe cujo índice pede módulo pede o mesmo
  módulo* — pegaria esta e a próxima.

### ❌ 2.8 — a tela inicial do app não obedece ao interruptor

- **O que acontece:** o cartão *Quick links* mostra *Pain trend*, *Book a new
  session*, *My records* e *Message the clinic* com **todos** os módulos desligados;
  a Home é byte a byte a mesma com um módulo desligado e com os 24. Tocar leva à
  tela "Not included in your plan".
- **Onde olhar:** `mobile/app/(app)/(clinica)/(tabs)/index.tsx`, o cartão a partir
  da linha ~293. O arquivo **já tem** `patient-access` carregado na linha 59, então o
  critério não precisa de nova chamada — precisa de ser lido.
- **Por que importa:** é a primeira tela que o paciente abre, e é exatamente o
  defeito que a T-2 foi corrigir. Corrigir só o menu move a maçaneta de parede, não
  a tira.
- **Fora dos arquivos afetados da T-2** — pode ser um passo desta atividade ou uma
  sua, e é decisão da sessão principal.

### Pendência, não falha

- **A contagem de "quem perde acesso" em produção.** O banco local tem um plano e
  nenhuma assinatura ativa; ele não responde pela produção. Antes do release, medir
  lá: pacientes com `mod_records` concedido e `mod_clinical_notes` não — são esses,
  e só esses, que perdem a nota clínica ao atualizar.

---

# As duas falhas, corrigidas — 30/09/2026

## 1. `app/api/patient/reports/[id]` — o detalhe ficou para trás ✅

`patientGate({ module: "mod_records" })`. O caminho do **link assinado** continua
passando por cima, de propósito: ele é emitido pela clínica para um relatório
específico e morre sozinho; o portão de módulo governa quem chega por sessão.

**É a segunda vez no mesmo dia** que eu fechei a lista e esqueci o detalhe —
antes foi o PDF da nota clínica. Corrigir cada um não impede o terceiro, então:

`__tests__/permissoes/a-lista-fecha-e-o-detalhe-tambem.test.ts` **varre** as
rotas atrás de pares lista/detalhe — toda pasta com `route.ts` que tenha um filho
`[id]` com outro — e cobra que, se a lista pede módulo, o detalhe peça **o
mesmo**. Comentários fora antes da busca, porque eles citam chaves.

A lista de exceções nasce **vazia**, e um teste cobra que cada exceção futura
traga um motivo escrito. Exceção sem motivo vivo é buraco com permissão.

**Por mutação, nos dois sentidos:**

```
detalhe sem módulo  -> "reports/[id]: a lista pede mod_records e o detalhe não pede nada"
detalhe com a chave errada -> "…a lista pede mod_records e o detalhe pede mod_clinical_notes"
```

A varredura não achou nenhuma outra violação no repositório.

## 2. A Home — a maçaneta na primeira tela ✅

Os quatro atalhos do cartão *Quick links* apareciam sempre. Com tudo desligado a
Home era **byte a byte** igual à de quem tem tudo, e tocar caía em *"Not included
in your plan"*.

Cada atalho passou a perguntar pelo seu módulo: `mod_records` (evolução da dor),
`mod_appointments`, `mod_clinical_notes` (prontuário) e `mod_messages`.

Duas decisões de forma:

- **Lista filtrada, e não quatro `&&` soltos.** A borda de baixo pertence ao
  último item **visível**; com guardas soltas ela ficaria num item escondido.
- **Se nenhum sobrar, o cartão inteiro sai.** Um cartão vazio com borda é pior
  que cartão nenhum.

E o fail-open fica: `access.data` ausente mostra tudo, como o menu do perfil.
Uma rede ruim não pode esvaziar a tela inicial de quem tem acesso — quem tranca é
o servidor, e cada uma destas rotas pede o seu módulo.

## As três pendências

**(a) A contagem em produção** — feita antes da mudança, e agora registrada em
`t-2-o-prontuario-obedece.md`: 2 planos, nenhum concede um sem o outro; 8
pacientes, nenhum com override divergente; 3 com acesso total. E nos caminhos
padrão, o plano gratuito não concede nenhuma das duas e o pacote concede as duas.
**Ninguém perdeu acesso.**

**(b) Os documentos que contradiziam a entrega** — corrigidos. O
`levantamento-t-3.md` ganhou um aviso no topo dizendo que retrata o **antes**, e
fica como está de propósito: é o raciocínio que motivou a mudança, e reescrevê-lo
apagaria o caminho. A `t-2` passou a registrar que o passo mudou **duas vezes** —
o plano estava certo pelo motivo errado.

**(c) Os cabeçalhos de grupo não traduzem** na tela do paciente (`CLINICAL` em vez
de `CLÍNICO`), enquanto a tela de padrão ao lado traduz. É anterior a esta
atividade e **não foi corrigido** — fica avisado, como manda a casa.

## Depois das correções

`tsc --noEmit` em 0 na web e no mobile. **2863 testes, 194 suítes, verdes.**
`NEXT_DIST_DIR=.build npm run build`: compilou.

**Falta medir na tela:** as duas correções acima não passaram por QA. A Home
precisa do par ligado/desligado como o menu teve, e o relatório por id precisa do
403/200.

---

# Rodada de confirmação das duas correções — 30/09/2026

**Onde:** local, worktree `C:\Users\bruno\orca\workspaces\clinic\app_clinic`, HEAD
`8861d7d37` (as correções são `5442b244b` e `bddaae8b1`), banco local
`bpr_clinic_local`. **Produção não foi tocada.**

**Resultado geral:** ✅ **as duas falhas estão corrigidas — 13 de 13 cenários
passaram.** Nenhuma ressalva sobre o que foi corrigido. Uma **observação fora do
escopo**, medida por acaso na mesma tela, está no fim: o cartão *NEXT SESSION*
mostra a consulta com `mod_appointments` desligado, porque `/api/appointments` — a
rota que a Home chama — não pede módulo. É o mesmo defeito, um cartão acima.

## Onde isto foi medido

Par de portas novo, diferente do da rodada anterior (`:4075`/`:8105`), e `dist`
próprio:

```
:4076  -> next dev -p 4076, NEXT_DIST_DIR=.next-qa110fix, NEXTAUTH_URL=http://localhost:4076
:8106  -> expo start --web --port 8106, EXPO_PUBLIC_API_URL=http://localhost:4076
```

**Confirmado pelo command line dos processos**, não por suposição — as duas
árvores apontam para este worktree:

```
node ...\orca\workspaces\clinic\app_clinic\node_modules\.bin\..\next\dist\bin\next dev -p 4076
node ...\orca\workspaces\clinic\app_clinic\mobile\node_modules\.bin\..\expo\bin\cli start --web --port 8106
```

**Chunk velho: descartado por prova direta, não por indício.** Troquei o
`index.tsx` da Home pela versão **anterior** à correção (`5442b244b^`), com o
banco no mesmo estado, e a tela **voltou a mostrar os quatro atalhos**; devolvi o
arquivo e a tela **voltou a esconder** (C3 e B5 abaixo). O Metro está servindo o
arquivo que está no disco, nos dois sentidos — é o mesmo argumento de uma prova
por mutação, aplicada ao bundle.

**Contas de teste, nenhuma real, nenhuma criada** — as mesmas da rodada anterior:
`qa106.admin@example.com` e `Qa106 PacienteTeste` (`qa106.paciente@example.com`),
clínica `qa106-clinica-de-teste`. Nenhum e-mail e nenhum push: nenhuma rota
exercitada aqui dispara envio.

**Como o estado foi mudado.** Sempre pela rota que o botão do painel chama —
`PATCH /api/admin/patients/<id>/permissions`, `action: updateOverrides`, com a
sessão do admin, **200** em todas as trocas, e a lista efetiva relida em
`GET /api/patient/access` depois de cada uma. O `fullAccessOverride` foi desligado
pela própria rota (`action: toggleFullAccess`), porque ele concede tudo e ignora
os interruptores.

## Resumo

| # | cenário | tipo | resultado |
|---|---|---|---|
| A1 | `mod_records` **ligado** → lista **e** detalhe 200 com dado | API | ✅ |
| A2 | `mod_records` **desligado** → lista **e** detalhe **403**, sem HTML no corpo | API | ✅ |
| A3 | O **link assinado** (`?t=`) ainda abre com o módulo desligado | API | ✅ |
| A3b | O mesmo link com a assinatura adulterada → **401** *(controle)* | API | ✅ |
| A4 | O mesmo 403 pelo canal de **cookie**, não só pelo Bearer | API | ✅ |
| A5 | Religar e os dois voltarem a 200 — **depois** do 403 | API | ✅ |
| B1 | Só `mod_records` off → **só** *Pain trend* sai | UI | ✅ |
| B2 | Só `mod_appointments` off → **só** *Book a new session* sai | UI | ✅ |
| B3 | Só `mod_clinical_notes` off → **só** *My records* sai | UI | ✅ |
| B4 | Só `mod_messages` off → **só** *Message the clinic* sai, e a **borda anda** | UI | ✅ |
| B5 | Os **quatro** off → o cartão inteiro sai, não fica vazio com borda | UI | ✅ |
| B7 | **Fail-open**: permissões fora do ar → os quatro aparecem | UI | ✅ |
| C | **O controle:** tudo ligado, Home **byte a byte** igual à de antes | UI | ✅ |

Extras: `B6` os 24 desligados; `B8` o servidor negando por baixo do fail-open; as
4 suítes `__tests__/permissoes` (**35/35**) rodadas aqui; e **duas provas por
mutação** na varredura nova, refeitas por este QA.

---

## A) `app/api/patient/reports/[id]` — o detalhe obedece

Relatório de teste criado no banco local com um marcador no HTML
(`MARCADOR-HTML-DO-RELATORIO-QA110FIX`), para que "não veio relatório no corpo"
seja uma medição e não uma impressão. Apagado no fim.

### A1 ✅ — com `mod_records` **ligado**, os dois servem

```
--- GET /api/patient/reports
    HTTP 200  content-type=application/json  bytes=417
    {"reports":[{"id":"cmuntgub90001xzf4xbgtrh4b","cadence":"WEEKLY",...,
      "url":"http://localhost:4076/api/patient/reports/cmuntgub9...?t=Y211bnRndWI5..."}]}
--- GET /api/patient/reports/cmuntgub90001xzf4xbgtrh4b   (Bearer, SEM ?t=)
    HTTP 200  content-type=text/html; charset=utf-8  bytes=110
    <html><body><h1>QA FIX 110 — Relatorio de teste</h1><p>MARCADOR-HTML-DO-RELATORIO-QA110FIX</p></body></html>
```

Este passo não é decoração: sem ele, um portão que negasse **sempre** passaria no
A2 e eu chamaria de correção o que seria uma porta emperrada.

### A2 ✅ — com `mod_records` **desligado**, os dois negam, com o status exato

Um interruptor mudou, e só ele — `/api/patient/access` passou de 24 para 23
módulos, com `mod_records` fora e os outros três atalhos dentro:

```
PATCH overrides HTTP 200  (desligados: mod_records)
GET /api/patient/access HTTP 200
  modules: 23 | records=off appointments=ON clinical_notes=ON messages=ON
```

```
--- GET /api/patient/reports            (a lista)
    HTTP 403  content-type=application/json  bytes=140
    {"error":"My Records is not included in your plan",
     "errorPt":"Meus Registros não está incluído no seu plano","code":"module_not_in_plan"}
--- GET /api/patient/reports/<id>       (o detalhe, Bearer, SEM ?t=)
    HTTP 403  content-type=application/json  bytes=140
    {"error":"My Records is not included in your plan",
     "errorPt":"Meus Registros não está incluído no seu plano","code":"module_not_in_plan"}
```

**403 nos dois, não "≠ 200"** — e o corpo do detalhe conferido pelo marcador:
`grep -c MARCADOR-HTML-DO-RELATORIO-QA110FIX = 0`, `grep -c '<html' = 0`. O que era
200 com o relatório inteiro agora é 403 com uma mensagem, nas duas línguas e com
código de máquina.

### A3 ✅ — o link assinado continua passando por cima, de propósito

O `?t=` usado aqui **foi emitido pela própria lista** no A1 (é assim que o app abre
um relatório no navegador do telefone), não forjado por mim. Com `mod_records`
desligado, **sem Bearer e sem cookie**:

```
--- GET http://localhost:4076/api/patient/reports/<id>?t=Y211bnRndWI5...
    HTTP 200  content-type=text/html; charset=utf-8  bytes=110
    marcador presente: 1
```

**Comportamento querido, e confirmado como tal:** o link é emitido pela clínica
para um relatório, uma pessoa e cinco minutos, e o portão de módulo governa quem
chega por sessão.

**A3b, o controle que impede a leitura ingênua** — trocar **um caractere** da
assinatura do mesmo link:

```
    HTTP 401  {"error":"Unauthorized"}
```

Ou seja: o 200 acima veio da assinatura valer, não da porta estar aberta. Sem este
controle, "o link assinado ainda abre" e "a rota não confere nada" dariam a mesma
leitura.

### A4 ✅ — o mesmo 403 pelo canal do navegador

O app usa `Bearer`, a web usa cookie, e o portão fica antes dos dois. Com sessão
NextAuth do paciente e `mod_records` desligado:

```
--- GET /api/patient/reports/<id>   (cookie, sem ?t=)
    HTTP 403  {"error":"My Records is not included in your plan",...}
```

### A5 ✅ — religar, e os dois voltarem

```
PATCH overrides HTTP 200  (desligados: nenhum)  |  modules: 24
    lista            HTTP 200  bytes=417
    detalhe          HTTP 200  text/html  bytes=110   marcador: 1
    detalhe (cookie) HTTP 200  bytes=110
```

O caminho painel → banco → API foi percorrido inteiro nas duas direções.

### A varredura nova, com as duas mutações refeitas por este QA

`__tests__/permissoes/a-lista-fecha-e-o-detalhe-tambem.test.ts`. Arquivo copiado
antes, restaurado depois e **conferido por `sha256`**
(`3a8a505dd9555a9ae9ac61dd1e461b047d9da7b051dd4182f6a86c5e858582e5`, igual antes e
depois), suítes verdes ao fim:

| mutação em `app/api/patient/reports/[id]/route.ts` | resultado |
|---|---|
| `patientGate({ module: "mod_records" })` → `patientGate()` | ✅ **cai**: `"app/api/patient/reports/[id]/route.ts: a lista pede mod_records e o detalhe não pede nada"` |
| `mod_records` → `mod_clinical_notes` | ✅ **cai**: `"...a lista pede mod_records e o detalhe pede mod_clinical_notes"` |

Confirmo também o que o implementador disse sobre os comentários: o
`moduloDaRota()` tira bloco e linha antes de procurar, e os comentários deste
arquivo citam as duas chaves — sem isso a mutação 2 passaria.

**O limite da varredura, dito com precisão:** ela cobra **coerência entre uma
lista e o detalhe dela**. Se a lista não pede módulo, o par passa. É exatamente por
isso que ela não pega a observação do fim deste relatório (`/api/appointments` não
pede módulo, logo `/api/appointments/[id]` não é cobrado). A varredura impede a
terceira repetição do erro que aconteceu duas vezes; ela não afirma que toda rota
do paciente tem portão.

---

## B) A Home — os quatro atalhos, um a um

Cada medição: troca de interruptor pela rota do painel → recarga da Home → leitura
do **DOM** (não da impressão da imagem) com `borderBottomWidth` computado de cada
linha → captura. `mod_clinica` fica ligado em todas, senão não há área clínica para
entrar.

### O par, um a um — quatro medições ✅

| estado | Pain trend | Book a new session | My records | Message the clinic | linhas no cartão |
|---|---|---|---|---|---|
| **B0** os quatro ligados | ✔ `0.667px` | ✔ `0.667px` | ✔ `0.667px` | ✔ **`0px`** | 4 |
| **B1** `mod_records` off | **—** | ✔ `0.667px` | ✔ `0.667px` | ✔ **`0px`** | 3 |
| **B2** `mod_appointments` off | ✔ `0.667px` | **—** | ✔ `0.667px` | ✔ **`0px`** | 3 |
| **B3** `mod_clinical_notes` off | ✔ `0.667px` | ✔ `0.667px` | **—** | ✔ **`0px`** | 3 |
| **B4** `mod_messages` off | ✔ `0.667px` | ✔ `0.667px` | ✔ **`0px`** | **—** | 3 |

Em cada linha sai **um** atalho e ficam **três**. É o que separa "obedece" de
"esconde tudo quando qualquer coisa falta" — e as quatro medições são
complementares: nenhum interruptor mexeu na linha de outro.

**A borda andou, e está medida:** o `0px` é a borda de baixo suprimida no último
item **visível**. Em B0–B3 ele é *Message the clinic*; em **B4**, com o último
escondido, o `0px` migrou para *My records* e os dois de cima ficaram com
`0.667px`. É a razão de a correção ser uma lista filtrada e não quatro `&&` soltos
— com guardas soltas a borda ficaria num item que não está na tela.

Evidências: `screenshots/fix-home-B0-quatro-ligados.png`,
`fix-home-B1-records-desligado.png`, `fix-home-B2-appointments-desligado.png`,
`fix-home-B3-clinical-notes-desligado.png`,
`fix-home-B4-messages-desligado-borda-andou.png`

### B5 ✅ — com os quatro desligados o cartão **sai**, não fica vazio

Os quatro off, os outros 20 ligados (`modules: 20`). Filhos do container de
conteúdo da Home, lidos do DOM:

```
antes (B0):  [ "Health", "NEXT SESSION...", "YOUR PLAN...", "📈Pain trend..." ]   <- 4
B5:          [ "Health", "NEXT SESSION...", "YOUR PLAN..." ]                      <- 3
```

O cartão não está vazio: ele **não existe**. E varri a tela inteira por um
retângulo vazio com borda (`textContent` em branco, `border-top-width > 0`, mais de
8px de altura e mais de 100px de largura): **0 encontrados**.

Evidência: `screenshots/fix-home-B5-quatro-desligados-cartao-sai.png`

**B6, extra** — com os 24 desligados (só `mod_clinica`), a Home fica em três blocos
e o cartão do plano passa a dizer *"Not included in your plan"*:
`screenshots/fix-home-B6-todos-desligados.png`

### B7 ✅ — o fail-open existe, e é o querido

Com os **24 desligados no banco** e a chamada de permissões **abortada no
navegador** (`page.route('**/api/patient/access**', r => r.abort('failed'))`), a
Home mostra os **quatro** atalhos:

```
presentes: ["Pain trend","Book a new session","My records","Message the clinic"]
```

Rede ruim não esvaziou a tela de quem tem acesso. **B8, a outra metade:** com o
fail-open na tela, toquei em *My records* — e o servidor negou:

```
/clinical-notes -> "Clinical Notes is not included in your plan
                    Ask your clinic if you think this is wrong."
```

Quem tranca é o servidor, e ele trancou. Evidências:
`screenshots/fix-home-B7-fail-open-permissoes-caidas.png`,
`fix-home-B8-fail-open-servidor-ainda-nega.png`

---

## C) O controle: com tudo ligado, a Home é a de antes

Três capturas, um argumento fechado. Mesmo servidor, mesma porta, mesmo viewport
(390×844), mesma sessão:

```
ada9f1ff0f2274c8242cf1f5c495b17a7c3e4927ce8a9b03c1b591f6be43063d  fix-home-C1-depois-tudo-ligado.png       (código NOVO, 24 ligados)
ada9f1ff0f2274c8242cf1f5c495b17a7c3e4927ce8a9b03c1b591f6be43063d  fix-home-C2-antes-tudo-ligado.png        (código ANTES, 24 ligados)
ada9f1ff0f2274c8242cf1f5c495b17a7c3e4927ce8a9b03c1b591f6be43063d  fix-home-C3-antes-quatro-desligados-...png (código ANTES, os quatro DESLIGADOS)
4e85df28a46f83011d690959bf972653eb2782442701e73a498c6c2d28aa0ff3  fix-home-B5-quatro-desligados-cartao-sai.png (código NOVO, os quatro DESLIGADOS)
```

Três leituras, nesta ordem:

1. **C1 = C2** — com tudo ligado, a Home nova é **byte a byte** a Home de antes da
   mudança. A troca de quatro `ListItem` escritos à mão por uma lista filtrada não
   moveu um pixel de quem tem acesso.
2. **C2 = C3** — no código **antigo**, a Home com os quatro módulos desligados é
   byte a byte a Home de quem tem tudo. É **a falha 2.8 reproduzida aqui**, não
   citada da rodada anterior.
3. **B5 ≠ C3** — no código **novo**, com o **mesmo estado de banco** de C3, a Home
   é outra. O interruptor passou a existir para a primeira tela.

O arquivo foi devolvido e conferido:
`sha256 = 2957d866971d5540a73b3c9b100cdec1e3f36fb68d77bc7293e79d16001ab5bc`, igual
antes e depois, e `git status` sem modificação nele.

---

## Suítes, no ambiente deste QA

```
npx jest __tests__/permissoes --ci
Test Suites: 4 passed, 4 total
Tests:       35 passed, 35 total
```

(A varredura nova soma 1 suíte e 4 testes aos 31 da rodada anterior.) Os números da
sessão principal — `tsc` 0, 2863 testes / 194 suítes, build compilado — **não foram
refeitos** por este QA; o que conferi foi a suíte de permissões e as duas mutações
acima.

---

## Erros de console

**Nenhum erro de JavaScript.** Filtrando as portas desta rodada (`:4076`, `:8106`),
30 entradas de nível `error`, todas `Failed to load resource`:

| o quê | quantas | de onde |
|---|---|---|
| `403` em `/api/patient/messages` | 16 | estados com as mensagens desligadas — é o cenário |
| `403` em `/api/patient/protocol` e `/api/exercises` | 4 + 4 | estado com tudo desligado — esperado |
| `ERR_FAILED` em `/api/patient/access` | 4 | **a minha própria** simulação de fail-open (B7/B8) |
| `403` em `/api/patient/clinical-notes` | 2 | o toque do B8 — o servidor negando, que é o ponto |

Zero exceções lançadas. Os logs do `next dev` e do Metro fecharam sem nenhuma linha
de erro de compilação. (O arquivo de console do MCP guarda também 58 entradas de
`:4075` e de um `.next-qa095b`, de abas sobreviventes de sessões anteriores cujos
servidores não são estes — alheias a esta rodada.)

---

## Observação fora do escopo: o cartão *NEXT SESSION* não obedece

Medido por acaso enquanto eu conferia o B2, **na mesma tela**, e **não é** uma das
duas falhas desta rodada. Registro porque é a mesma forma:

Com `mod_appointments` **desligado**, o atalho *Book a new session* sai (B2 ✅), e o
cartão **NEXT SESSION** logo acima continua mostrando a consulta — data, hora, tipo
de tratamento e o nome de quem atende — com o botão **Reschedule**. Tocar nele leva
a `/appointment/<id>` e à tela do portão:

> *"Not included in your plan — Your clinic can add this to your plan. Ask them if
> you think this is wrong."*

A porta está fechada e a maçaneta ficou na parede — o mesmo defeito que a T-2
nomeou, um cartão acima do que foi corrigido.

**Por que acontece:** a Home chama `/api/appointments` (via
`mobile/src/api/appointments.ts:52`), e não `/api/patient/appointments`. Medido com
o módulo desligado, no mesmo instante:

```
GET /api/patient/appointments   -> HTTP 403  {"error":"Appointments is not included in your plan",...}
GET /api/appointments           -> HTTP 200  bytes=53299   (as consultas do paciente, inteiras)
```

`app/api/patient/appointments/route.ts:11` tem
`patientGate({ module: "mod_appointments" })`; `app/api/appointments/route.ts`
autentica por `getActor` + `assertPatientAccess` — que resolve inquilino, **não
módulo**. Não é vazamento entre clínicas: o dado é do próprio paciente. É o
interruptor que não fecha esta porta.

**A varredura nova não pega isto**, e não é falha dela: `/api/appointments` não pede
módulo, então o par lista/detalhe é coerente e passa. Fica para a sessão principal
decidir se é um passo desta atividade ou de outra — **não mexi em nada**.

Evidência: `screenshots/fix-obs-next-session-reschedule-com-modulo-desligado.png`

---

## Estado deixado para trás

| o quê | como ficou |
|---|---|
| `qa106.paciente`: `fullAccessOverride`, `moduleOverrides` | **restaurados** (`true`, `null`) — conferido por leitura depois |
| `preferredLocale`, `consentAcceptedAt` do paciente | **não tocados** (`en-GB`, `2026-09-29T20:55:54.560Z`) |
| `qa106b.paciente` | **não tocado** nesta rodada |
| 1 `PatientReport` criado para o A1–A5 | **apagado** — o banco voltou a 0 relatórios |
| `mobile/app/(app)/(clinica)/(tabs)/index.tsx` (troca pela versão de antes) | **restaurado**, `sha256` conferido |
| `app/api/patient/reports/[id]/route.ts` (duas mutações) | **restaurado**, `sha256` conferido; suítes verdes depois |
| `tsconfig.json` | **revertido** — o dev server acrescentou `.next-qa110fix/types` |
| servidores `:4076` e `:8106` | **derrubados**; `netstat` não cita mais as portas |
| senhas de `qa106.admin` e `qa106.paciente` | trocadas no banco **local** e não restauradas (o hash antigo não é recuperável) |
| paciente criado ou apagado | **nenhum** |
| e-mail ou push disparado | **nenhum** |
| produção | **não tocada** |

`git status` ao fim desta rodada lista apenas as 13 capturas novas e este relatório.
