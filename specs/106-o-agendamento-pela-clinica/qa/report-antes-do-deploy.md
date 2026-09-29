# QA antes do deploy — as 17 correções de 29/09/2026

**Commit medido:** `eb707ed23`, branch `brunoto02028/app_clinic`
**Onde:** `next dev` na porta **4040**, subido deste worktree e confirmado pelo
command line do processo. Banco local `bpr_clinic_local`. **Produção não foi
tocada.**

**Resultado:** ✅ **23 de 23** depois da re-verificação — o D19 reprovou na
primeira rodada, foi corrigido e re-medido. Três achados fora da lista, um deles
virou a [T-7](../t-7-salvar-uma-edicao-nao-avisa-sozinho.md).

| bloco | cenários | ✅ | ❌ |
|---|---|---|---|
| A — vazamento entre clínicas | 5 | 5 | 0 |
| B — e-mail e fuso | 3 | 3 | 0 |
| C — agenda | 6 | 6 | 0 |
| D — tela e dinheiro | 6 | 6 | 0 |
| E — education | 3 | 3 | 0 |
| **total** | **23** | **23** | **0** |

O D19 conta como ✅ **depois** da correção. Na primeira rodada era 22/23.
A re-verificação está no fim deste arquivo, com os valores lidos.

## Contas de teste

Todas fictícias, todas em clínica de teste. Nenhum paciente real foi lido ou
escrito. Senhas redefinidas no banco local; **nenhum token ou segredo aqui.**

| papel | conta | clínica |
|---|---|---|
| ADMIN | `qa106.admin@example.com` | QA106 Clinica de Teste |
| SUPERADMIN | `qa.superadmin@example.test` | — (sem clínica selecionada) |
| paciente 1 | `qa106.paciente@example.com` | QA106 |
| paciente 2 | `qapre.paciente2@example.test` | QA106 |
| paciente sem clínica | `qapre.semclinica@example.test` | `clinicId = null` |
| clínica vizinha | `qa106b.admin@example.com` | QA106B Outra Clinica |

## Duas coisas que o ambiente exigiu, e por quê

**1. O servidor rodou com `TZ=UTC`.** Sem isso o cenário B6 é imensurável: a
máquina está em `Europe/London`, e aí o código **velho** e o **novo** dão a
mesma resposta.

```
TZ=UTC, sem timeZone                        -> 09:00   (o que o contêiner fazia)
TZ=UTC, com timeZone Europe/London          -> 10:00   (o que o helper novo faz)
TZ da máquina (Europe/London), sem timeZone -> 10:00   (o defeito é invisível aqui)
```

**2. Um coletor de e-mail local.** Fora de produção a guarda de saída descarta
todo e-mail e registra só 160 caracteres do assunto — e o corpo é o objeto de
B6/B7/B8. O SDK do Resend honra `RESEND_BASE_URL`, então o `next dev` apontou
para um servidor em `127.0.0.1:4041` que grava o payload. **O que o servidor
enviaria foi lido palavra por palavra, e nada saiu da máquina.**

---

## A) Vazamento entre clínicas

### A1 — `GET /api/admin/appointments` sem clínica selecionada ✅

SUPERADMIN recém-logado, **nenhum cookie** (`document.cookie === ""`):

```
GET /api/admin/appointments  ->  400  {"error":"No clinic selected"}
```

**Controle negativo** — mesmo SUPERADMIN, com clínica selecionada:

```
selected-clinic-id=cmummnags0000xz0klhafqptq
-> 200   32 consultas   clinicIds distintos: ["cmummnags0000xz0klhafqptq"]
```

Recusa quando não há inquilino; lista **um** inquilino quando há. O `400` não é
uma rota quebrada.
Evidência: `screenshots/pre-a1-superadmin-sem-clinica-400.png`

### A2 — `GET /api/education` com paciente sem `clinicId` ✅

O banco tem **13** materiais publicados em 3 clínicas.

```
GET /api/education  (clinicId = null)  ->  200   published: array(0)   categories: array(0)
```

**Controle negativo** — o mesmo paciente, com clínica:

```
-> 200   published: 10   categories: 2
```

A lista vazia é a parede, não um banco vazio.

**Nuance:** para chegar nessa consulta foi preciso derrubar dois portões que
respondem **antes** dela — um paciente sem clínica bate primeiro em
`403 consent_required` e depois em `403 module_not_in_plan`. **O vazamento era
mais latente do que o commit descreve**; a correção não é errada, é a terceira
camada.

### A3 — `/api/admin/cancellations`, parede por clínica ✅

```
GET /api/admin/cancellations  (admin da A)
-> 200  total: 1

POST {"requestId":"<pedido da clínica B>","action":"reject"}
-> 404  {"error":"Cancellation request not found"}
```

**Controle negativo** — o mesmo POST no pedido da própria clínica: `200`.

O pedido da clínica B, relido **depois** da tentativa: `status: "PENDING",
adminNote: null, processedById: null`. Nada foi escrito.

### A4 — pagamento de consulta de outra clínica ✅

```
POST   /payment {"channel":"CASH"}  -> 404 {"error":"Appointment not found"}
DELETE /payment                     -> 404 {"error":"Appointment not found"}
```

**Controle negativo** — na própria consulta: `200 {"paid":true,"channel":"TRANSFER","amount":80,"status":"CONFIRMED"}`,
e a linha no banco com `recordedById` e `recordedAt` preenchidos.

A consulta da clínica B, relida depois: ainda `PENDING`, ainda sem `Payment`.

### A5 — `GET /api/admin/travel-estimate` ✅

```
?patientId=<paciente da B>  -> 404  {"error":"Patient not found"}
?patientId=<paciente da A>  -> 200  {"minutes":105,"clinicPostcode":"SW1A 1AA","patientPostcode":"IP1 3QJ"}
```

Os cinco respondem o status exato — **400, 404, 404, 404, 404** — e em nenhum
deles a clínica vizinha foi lida ou alterada.

---

## B) O e-mail e o fuso

Servidor em `TZ=UTC`. Corpos lidos do coletor local.

### B6 — consulta às 10:00, "avisar o paciente" marcado ✅

Criada **pela tela**: 20/10/2026, 10:00, 60 min. Linha gravada:
`dateTime: 2026-10-20T09:00:00.000Z` = **10:00 em Londres**.

```
Appointment Confirmed — Tuesday, 20 October 2026
Date      Tuesday, 20 October 2026
Time      10:00
Location  QA106 Clinica de Teste — 1 Clinic Street, London
Treatment QA106 Consulta Paga
Duration  60 min
Note: QAPRE nota <b>com tag</b> & e-comercial
```

**10:00, não 09:00** — com o servidor em UTC, que é a condição em que o defeito
existia. A nota escapou: a tag chegou como texto.
Evidência: `screenshots/pre-b6-dialogo-1000-avisar-marcado.png`

### B7 — nenhuma variável crua ✅

```
001.json | {{}}: 0 | horas no corpo: ["10:00"] | Appointment Confirmed
002.json | {{}}: 0 | horas no corpo: []        | Action Required: medical screening
003.json | {{}}: 0 | horas no corpo: ["14:00"] | Appointment Confirmed
004.json | {{}}: 0 | horas no corpo: []        | Action Required: medical screening
005.json | {{}}: 0 | horas no corpo: ["07:00"] | Appointment Confirmed
```

Zero `{{` e zero `}}` em cinco corpos, e as três horas batem com o relógio de
Londres de cada consulta. O `{{location}}` não sumiu por ter sido **removido**
pelo filtro — foi **preenchido**. As duas correções estão as duas em pé.

### B8 — domicílio diz o endereço do paciente ✅

```
Location  At your address — 7 Second Avenue, Bromley, BR1 3CD
Time      14:00
```

O dele, e não o da clínica.

---

## C) A agenda

`bufferMinutes = 15`, expediente 08:00–20:00, oferta de 30 em 30.

### C9 e C10 — o intervalo, **nos dois ramos** ✅

Base: 20/10/2026 vazio oferece 23 horários. Depois de marcar **60 min às 10:00**:

| ramo | `configured` | horários | 09:00 | 11:00 |
|---|---|---|---|---|
| legado (`TherapistAvailability`) | `false` | 08:00, 08:30, **11:30**…19:00 (18) | ausente | ausente |
| agenda configurada (`ScheduleWindow`) | `true` | 08:00, 08:30, **11:30**…19:00 (18) | ausente | ausente |

**Controle negativo** — mesma data, ramo legado, `bufferMinutes = 0`:

```
20 horários   tem 09:00: true   tem 11:00: true   tem 10:00: false
```

Os dois horários que a duração sozinha **não** tiraria voltam quando o intervalo
some. É o intervalo que os tira, e ele morde nos dois ramos.
Evidência: `screenshots/pre-c9-legado-buffer15-sem-0900-e-1100.png`

### C11 — domicílio com 120 min de deslocamento ✅

`HOME_VISIT` de 60 min às 14:00, `travelMinutes: 120`:

| ramo | horários que sobram |
|---|---|
| agenda configurada | `08:30, 17:30, 18:00, 18:30, 19:00` (5) |
| legado | `08:30, 17:30, 18:00, 18:30, 19:00` (5) |

Faixa bloqueada: **11:45 → 17:15** — 2h de ida, 15 min, 60 min, 15 min, 2h de
volta. Listas idênticas nos dois ramos.
Evidência: `screenshots/pre-c11-ramo-legado-viagem-120min.png`

### C12 — o portão do servidor ✅

```
POST 07:00 (fora da janela), sem forceTime  -> 409 {"code":"slot_unavailable","slots":[…]}
POST 10:00 (já ocupado),     sem forceTime  -> 409 {"code":"slot_unavailable","slots":[…]}
POST 07:00, "forceTime": true               -> 200 criada em 2026-10-20T06:00:00.000Z
```

Os dois **409** trazem a lista de horários livres junto — quem tomou o "não"
recebe o "então quando".

### C13 — a consulta das 07:00 é **desenhada** ✅

Grade navegada até **19–25 Out 2026**:

```
faixa:      primeira etiqueta 07:00   última 19:00   (16 etiquetas)
bloco:      style="position: absolute; top: 0px; height: 56px; …"
caixa:      x=187  y=423  largura=75  altura=56
cabeçalho:  Tue 20 · "5 free"   (bate com os 5 horários da API)
```

A faixa esticou **para a semana exibida** e o bloco está lá, com 56 px — não é
uma linha das 07:00 vazia.
Evidência: `screenshots/pre-c13-grade-semana-20out-bloco-0700.png`

### C14 — salvar do calendário sem mudar a hora ✅

```
campo datetime-local: "2026-10-20T07:00"     (preenchido, não em branco)
PUT -> 200, dateTime 2026-10-20T06:00:00.000Z = 07:00 em Londres
```

`updatedAt` movido — salvou de verdade e não moveu a consulta. O campo mandou o
instante UTC certo, que é a prova da ida e volta `datetime-local ↔ Londres`, e
não só que nada foi enviado.
Evidência: `screenshots/pre-c14-editar-do-calendario-hora-preenchida.png`

---

## D) A tela e o dinheiro

### D15 — o chip "Pedido de formato" ✅

```
tela viva: true   erro React/ReferenceError: false   erros de console: 0
```

Falhava exatamente no caso para o qual foi feito; agora filtra.
Evidência: `screenshots/pre-d15-chip-pedido-de-formato-sem-quebrar.png`

### D16 — Transferência e Dinheiro numa consulta já CONFIRMED ✅

Consulta `CONFIRMED`, £80,00, **sem nenhuma linha de `Payment`** — os dois
botões aparecem, com os títulos "Received by bank transfer" e "Received in cash".
Evidência: `screenshots/pre-d16-confirmada-sem-pagamento-transferencia-e-dinheiro.png`

### D17 — Desfazer numa consulta COMPLETED ✅

```
consulta:  { status: "COMPLETED" }
pagamento: { status: "FAILED", channel: "CASH", amount: 65, recordedById: <admin> }
```

O pagamento virou falho e **não sumiu**; a consulta continua `COMPLETED` — não
voltou para `PENDING` nem reapareceu na fila.
Evidência: `screenshots/pre-d17-desfazer-em-completed-continua-completed.png`

### D18 — "Isentar a cobrança" ✅

Preço vai a **0**, o bloco de forma de pagamento some, e a frase passa a
"No charge: the appointment is confirmed straight away". A única menção a £80
que sobra é o rótulo do tipo no seletor — preço de tabela, não promessa sobre
esta consulta.
Evidência: `screenshots/pre-d18-isentar-zera-preco-e-sem-promessa.png`

### D19 — o deslocamento do paciente anterior ❌ **REPROVOU**

A correção existe, mas cobre **um** caminho de dois.

**O que funciona.** Depois de uma criação bem-sucedida o formulário é zerado por
inteiro — campo de viagem ausente, caixas desmarcadas, seletores no estado
inicial.

**O que não funciona.** Trocar o paciente **dentro do diálogo aberto** mantém o
número do primeiro.

```
travel-estimate <Qa106 PacienteTeste> -> {"minutes":105,"patientPostcode":"IP1 3QJ"}
travel-estimate <QaPre PacienteDois>  -> {"minutes":null,"reason":"lookup_failed","patientPostcode":"BR1 3CD"}
```

Escolhido o primeiro, formato **At home**, o campo preenche sozinho com 105 e a
frase "Suggested: 105 min from IP1 3QJ". Trocando o paciente sem fechar:

```
paciente selecionado: QaPre PacienteDois
Travel (min, each way): 105        <- o número do paciente anterior
(a linha "Suggested: …" sumiu — não há sugestão para este paciente)
```

**E a consequência chega ao banco:**

```
{ patient: { lastName: "PacienteDois", postcode: "BR1 3CD" },
  mode: "HOME_VISIT",
  travelMinutes: 105          <- calculado para IP1 3QJ, gravado para BR1 3CD }
```

A agenda bloquearia 105 minutos de cada lado por uma viagem que nunca foi
estimada para essa pessoa. É o defeito que a correção nomeia sobrevivendo no
caminho mais provável: quem escolheu o paciente errado e corrige sem fechar o
diálogo.
Evidência: `screenshots/pre-d19-FALHA-viagem-105-do-paciente-anterior.png`

**Achado irmão, do mesmo teste:** o formulário **também não é zerado ao fechar
sem criar**. Escolhido o tipo pago, marcada a isenção, fechado com Esc; ao
reabrir, tudo continua lá — inclusive a viagem. A consulta criada em D19 saiu
com `price: 0` **e** `treatmentType: "QA106 Consulta Paga"` por causa disso: um
tipo de £80 gravado a custo zero, sem ninguém ter decidido isso.

A viagem é o sintoma; a causa é que **só o sucesso limpa**.

### D20 — `updateStatus` que falha ✅

Não há 409 alcançável por staff nessa rota, então a falha foi forçada no
cliente: `window.fetch` instrumentado para responder **409** ao `PUT` — o ramo
que a correção acrescentou. O interceptador foi removido depois.

```
aos 250 ms: "… Error | QAPRE: conflito forçado"
linhas na fila depois: 1   (antes: 1)
```

O toast aparece com a mensagem do servidor, e a linha **não** some da fila.
Evidência: `screenshots/pre-d20-409-forcado-toast-e-linha-na-fila.png`

> Registro honesto: nas duas primeiras tentativas a tela foi lida no momento
> errado e anotou-se "sem toast". O toast estava lá, em 250 ms. A terceira
> medição, com espera ativa, é a que vale.

---

## E) Education

### E21 — publicar pergunta, restringir não ✅

Com um espião em `window.confirm` que registra e responde **não**:

| ação | `confirm` chamado | efeito no banco |
|---|---|---|
| **Restringir** | **0 vezes** | agiu na hora |
| **Publicar** (recusando) | 1 vez, com o texto completo | `updatedAt` **inalterado** |

### E22 — `delivered` com paciente sem aparelho ✅

```
POST notify {"dryRun":true} -> {"count":1,"alreadyNotified":0}
POST notify                 -> {"notified":1,"delivered":0}
```

Com o código anterior (`if (r) enviados++`) este mesmo cenário devolveria **1**.

**Ressalva:** fora de produção a guarda de saída bloqueia push para todos, então
`sent` é 0 mesmo para quem tem aparelho. O teste prova que a contagem deixou de
creditar quem **não** recebeu; **não** prova que credita quem recebe. Isso só se
mede com aparelho de verdade — e foi medido, no QA de produção da 107.

### E23 — a prévia continua obrigatória ✅

Clicar em *Notify* dispara o `dryRun` e abre a prévia; só dentro dela existe o
botão que envia. Em `/admin/education/create`, o botão de enviar só é
renderizado com a prévia conferida.
Evidência: `screenshots/pre-e23-previa-do-aviso-antes-de-enviar.png`

**Sobre o logo BPR:** nenhum dos dois caminhos do education manda e-mail — um
toca o telefone, o outro escreve uma atribuição. Onde há e-mail, o logo está: o
corpo da confirmação de consulta traz duas vezes `<img src="…/uploads/email-logo.png">`,
e o arquivo responde `200 image/png`, 10.109 bytes.

**Dois limites da prévia, registrados:**
1. A prévia é obrigatória **na tela**, não no servidor. `POST /notify` sem
   `dryRun` prévio funciona — foi assim que E22 foi medido. O comentário da rota
   diz isso com todas as letras, então é desenho; mas dado o peso da regra da
   casa, vale escrever que a porta aceita o envio direto.
2. Um segundo clique não toca o telefone de novo: `409 nobody_to_notify`.

---

## Erros de console

**Nenhum erro de JavaScript.** Todos os `[ERROR]` na porta 4040 são respostas
HTTP dos próprios testes negativos — os 404 da clínica vizinha, o 400 do
superadmin sem clínica, os 409 do portão de horário. Nenhum `ReferenceError`,
nenhum *Unhandled Runtime Error*. O log do servidor de dev também está limpo.

Duas coisas no console que **não são desta medição**:
- `https://bpr.clinic/api/admin/education/*` → 403. Outra sessão de QA, em
  produção, dividindo o navegador do MCP.
- **151 erros `500` em `http://localhost:4030/admin/appointments`.** A 4030 é um
  segundo `next dev` **deste mesmo worktree**, de outro agente, dividindo o
  `.next`. Nada foi medido na 4030, mas 151 quinhentos numa tela de agenda
  merecem um olhar de quem a estiver usando.

---

## Achados fora do que foi pedido

### 1. Salvar uma edição manda e-mail e push ao paciente, sempre — sem caixa e sem prévia

O maior. No C14 o diálogo *Edit Appointment* foi aberto, **nada foi mudado**, e
*Save Changes* foi clicado. O paciente de teste recebeu:

```
to      : ["qa106.paciente@example.com"]
subject : Appointment Confirmed — Tuesday, 20 October 2026
texto   : … your appointment has been successfully booked … Time 07:00 …
```

e, no log do servidor, o push junto:

```
[OUTBOUND-SINK] push -> …: Appointment changed
[EMAIL] Sent via Resend to qa106.paciente@example.com
```

`PUT /api/appointments/[id]` chama `pushConsulta` e `notifyPatient`
**incondicionalmente** para qualquer `userRole !== "PATIENT"`. Não há
`sendConfirmation`, não há caixa no diálogo de edição, não há prévia.

Isso contradiz a regra da casa de 17/09/2026 — *nada sai para paciente sem
alguém pedir* — que é exatamente o que as T-1 e T-5 construíram no caminho de
**criação**. O caminho de **edição** ficou de fora.

E a correção nº 14, medida hoje, aumenta a exposição: ela faz o diálogo de
edição funcionar a partir do calendário. Quem antes abria o campo em branco e
desistia agora corrige um preço e manda, sem saber, um "Appointment Confirmed"
novinho. Pior: o e-mail diz *"has been successfully booked"*, não "foi
alterada" — o paciente lê uma marcação nova sobre uma consulta antiga.

### 2. O formulário de criação sobrevive ao fechar

Descrito em D19. Tipo de tratamento, isenção e viagem atravessam um Esc e
reaparecem no próximo agendamento. A viagem é a instância que o commit tentou
fechar; o padrão é maior que ela.

### 3. `dataEHoraDaClinica` usa o fuso **global**, não o da clínica

O helper novo assina `timeZone = CLINIC_TIMEZONE` e as quatro chamadas o invocam
sem argumento — sempre `Europe/London`. Mas `Clinic.timezone` existe, é lido em
outras partes da agenda, e **no banco local já há inquilinos em
`America/Sao_Paulo`**. Hoje não morde a BPR, que é de Londres. Morde no dia em
que um profissional brasileiro do catálogo marcar uma consulta: a tela mostraria
o horário dele e o e-mail, o de Londres. É o mesmo formato do defeito que acabou
de ser corrigido, uma camada acima.

### 4. Miudezas

- Os botões de navegar semana no calendário não têm nome acessível: nem texto,
  nem `aria-label`, nem `title`. Só um ícone.
- A tela de education mistura as duas línguas no mesmo cartão: *"Notify"* ao
  lado de *"Publicar"* e *"Restringir"*, com a interface em inglês.
- O e-mail de confirmação de uma consulta **em domicílio** ainda pede *"Please
  remember to: Wear comfortable clothing / Bring any relevant medical
  documents"*. Para quem vai ser atendido em casa, "traga seus documentos" soa
  estranho — e "compareça" foi justamente o que a correção do `location`
  consertou uma linha acima.

---

## Estado em que o ambiente ficou

- `tsconfig.json` foi alterado pelo Next ao subir e **revertido**.
- **Nenhum `npm run build` foi executado.** Nenhum código de produção alterado
  pelo QA.
- Dados de teste no banco **local**: consultas com prefixo `QAPRE`, materiais
  `QAPRE Material *`, `qapre.paciente2@example.test`,
  `qapre.semclinica@example.test`, uma `ScheduleWindow` inativa na terça da
  QA106, `bufferMinutes = 15` na QA106, e o endereço de `qa106.paciente` em
  Ipswich (`IP1 3QJ`).

---

## Pode subir?

**Agora pode.** As 17 correções entregam — e, depois da re-verificação, 23 de 23
cenários passaram, todos
com controle negativo onde havia risco de um "passou" falso. Os cinco vazamentos
entre clínicas estão fechados com o status exato e a clínica vizinha ficou
intacta depois de cada tentativa. O fuso está certo com o servidor em UTC, que é
a condição do contêiner. O intervalo e a viagem funcionam nos **dois** ramos da
agenda, que era o ponto do commit.

O D19 e o achado nº 1 caíram antes do deploy, nesta ordem. O que fica para a
próxima leva está no fim da T-7: o template de "consulta alterada", que não
existe, e o domicílio farejado por regex nesta rota.


---

# Re-verificação — 29/09/2026, depois das correções

## Uma armadilha antes de qualquer medição

O hot reload **não** pegou. O navegador servia o chunk antigo do cache:

```
chunk: /_next/static/chunks/app/admin/appointments/page.js
cópia do navegador : 3.185.393 bytes   tem limparFormularioDeCriacao: false
cópia do servidor  : 3.188.485 bytes   tem limparFormularioDeCriacao: true
```

A correção quase foi reprovada por engano. Servidor subido numa **porta nova
(4050)** — porta nova é chave de cache nova, e o cookie de sessão atravessa.
Confirmado antes de medir: `bundleTemCodigoNovo: true`, `bytes: 3188485`.

## D19-A — o que tinha reprovado ✅

Valor lido do `input`, não da frase de apoio.

| momento | paciente | valor do input |
|---|---|---|
| paciente 1 + *At home* | IP1 3QJ | **`"105"`** |
| logo após trocar, sem fechar | BR1 3CD | **`""`** |
| +3500 ms depois | BR1 3CD | **`""`** |

Antes era `"105"` nos dois.
Evidência: `screenshots/pre-d19a-recheck-viagem-vazia-apos-troca.png`

## D19-B — o controle negativo que importa ✅

O caminho inverso, que é o que prova que a limpeza não matou a sugestão:

| momento | paciente | valor do input |
|---|---|---|
| partida | BR1 3CD | `""` |
| após trocar para o paciente 1 | IP1 3QJ | **`"105"`** |
| +3500 ms | IP1 3QJ | **`"105"`** |

Sem este, a correção poderia ter trocado um defeito por outro — um campo que
nunca mais se preenche.

## D19-C — digitado à mão ✅

Para haver uma resposta **em voo** de verdade, o `travel-estimate` foi atrasado
em 15 s (instrumentação removida depois; a estimativa real leva ~1 s e não daria
janela).

```
campo antes de digitar         : ""
logo após digitar              : "30"
depois da resposta (105) chegar: "30"     <- sobreviveu
após trocar de paciente        : ""       <- e não atravessou a troca
```

A sugestão é mostrada e **não** imposta.
Evidência: `screenshots/pre-d19c-30-digitado-sobrevive-a-resposta-105.png`

## Irmão — o Esc ✅

Montado antes do Esc: tipo `QA106 Consulta Paga — £80.00`, isenção **marcada**,
viagem **77**, nota preenchida. Reaberto depois:

```
seletores : ["Select patient...", "No treatment type yet — no charge", "Pick the date first"]
números   : duração 60, preço 0
caixas    : [false, false, false]
nota      : ""
viagem    : campo ausente
```

Evidência: `screenshots/pre-d19-irmao-recheck-formulario-zerado-apos-esc.png`

## A prova que fecha — no banco

Refeito o caminho exato do D19-A até criar a consulta:

```
{ patient: { lastName: "PacienteDois", postcode: "BR1 3CD" },
  dateTime: "2026-11-04T15:00:00.000Z",
  mode: "HOME_VISIT",
  travelMinutes: null }        <- antes da correção: 105
```

Mesmos dois pacientes, mesmo caminho, mesma leitura. **Console: 0 erros** em
toda a re-verificação.

## Achado novo da re-verificação

**O banner de cookies bloqueia o "Create Appointment".** Na primeira visita a
uma origem nova, o banner fica `aria-hidden` atrás do diálogo mas o filho dele
continua interceptando o ponteiro — três falhas de clique com *"subtree
intercepts pointer events"*, resolvidas só ao dispensar o banner. **Um usuário
de verdade veria o botão e o clique não pegaria.** Não é de hoje nem destas
correções, mas é real e não está corrigido.
