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
